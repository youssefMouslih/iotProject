"""
FastAPI application for IoT sensor data collection and alert management.

This is the main entry point for the application. It orchestrates:
- FastAPI server setup and routes
- Database initialization
- Event broadcasting via WebSockets and Server-Sent Events
- REST API endpoints for data, settings, and alerts
"""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse, RedirectResponse
from sqlalchemy import func, text, inspect
from sqlalchemy.orm import Session

# Import all modules
from .config import (
    BASE_DIR, FRONTEND_DIR, STATIC_DIR, INDEX_HTML,
    ALERT_THRESHOLD, MIN_ALERT_THRESHOLD, LDR_ALERT_THRESHOLD,
    LOG_LEVEL, DATABASE_URL
)
from .database import (
    engine, Base, SessionLocal, SensorRecord, Settings, EmailAlert,
    SensorRecordOut, SettingsOut, EmailAlertOut, get_db
)
from .schemas import (
    SensorData, ESP32Payload, ESP32SimplePayload, SettingsUpdate, ThresholdUpdate, EmailTestIn,
    AlertStatus, AlertReset, AlertList
)
from .alerts import (
    check_and_trigger_alert, get_alert_status, reset_alerts,
    ALERT_EMAIL_DELAY_SECONDS, alert_tracking_state
)
from .notifications import send_email_with_logging
from .utils import (
    get_daily_csv_path, ensure_daily_csv_file, append_record_to_csv,
    fetch_weather, validate_temperature_readings
)

# Configure logging
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))
logger = logging.getLogger(__name__)

# FastAPI app initialization
app = FastAPI(title="IoT Sensor Backend", version="2.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# Provide a friendly alias for Swagger UI
@app.get("/swagger", include_in_schema=False)
async def swagger_redirect():
    """Redirect helper so Swagger UI is available at /swagger and /docs."""
    return RedirectResponse(url="/docs")


# ==================== EventBroker for WebSockets ====================
class EventBroker:
    """Manages WebSocket connections for real-time event broadcasting."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass


event_broker = EventBroker()


# ==================== Database Initialization ====================
@app.on_event("startup")
async def ensure_database_exists():
    """Initialize database with all tables and columns."""
    try:
        Base.metadata.create_all(bind=engine)
        print("[DB] Tables created/verified")
        
        with engine.connect() as conn:
            inspector = inspect(engine)
            
            # Verify and add columns to sensor_records table
            sr_cols = {c['name'] for c in inspector.get_columns('sensor_records')}
            columns_to_add = [
                ('ldr_value', "ALTER TABLE sensor_records ADD COLUMN ldr_value INTEGER"),
                ('ldr_alert', "ALTER TABLE sensor_records ADD COLUMN ldr_alert INTEGER"),
                ('ds18b20_temperature', "ALTER TABLE sensor_records ADD COLUMN ds18b20_temperature FLOAT"),
                ('dht_temperature', "ALTER TABLE sensor_records ADD COLUMN dht_temperature FLOAT"),
                ('temperature_source', "ALTER TABLE sensor_records ADD COLUMN temperature_source TEXT"),
                ('ds18b20_ok', "ALTER TABLE sensor_records ADD COLUMN ds18b20_ok BOOLEAN DEFAULT 1"),
                ('dht_ok', "ALTER TABLE sensor_records ADD COLUMN dht_ok BOOLEAN DEFAULT 1"),
                ('sensor_disagreement', "ALTER TABLE sensor_records ADD COLUMN sensor_disagreement BOOLEAN DEFAULT 0"),
                ('alert_cause', "ALTER TABLE sensor_records ADD COLUMN alert_cause TEXT"),
            ]
            
            for col_name, sql in columns_to_add:
                if col_name not in sr_cols:
                    try:
                        conn.execute(text(sql))
                        logging.info(f"Added column sensor_records.{col_name}")
                    except Exception:
                        pass
            
            # Verify and add columns to settings table
            s_cols = {c['name'] for c in inspector.get_columns('settings')}
            settings_columns = [
                ('brevo_sender_email', "ALTER TABLE settings ADD COLUMN brevo_sender_email TEXT"),
                ('brevo_sender_name', "ALTER TABLE settings ADD COLUMN brevo_sender_name TEXT DEFAULT 'IoT Monitor'"),
                ('whatsapp_enabled', "ALTER TABLE settings ADD COLUMN whatsapp_enabled BOOLEAN DEFAULT 0"),
                ('whatsapp_number', "ALTER TABLE settings ADD COLUMN whatsapp_number TEXT"),
            ]
            
            for col_name, sql in settings_columns:
                if col_name not in s_cols:
                    try:
                        conn.execute(text(sql))
                        logging.info(f"Added column settings.{col_name}")
                    except Exception:
                        pass
        
        # Initialize default settings
        db = SessionLocal()
        try:
            cfg = db.query(Settings).filter(Settings.id == 1).first()
            if cfg is None:
                cfg = Settings(
                    id=1,
                    alert_threshold=ALERT_THRESHOLD,
                    min_alert_threshold=MIN_ALERT_THRESHOLD,
                    phone_number='+212638776450',
                    sms_enabled=True,
                    email_enabled=True,
                    whatsapp_enabled=False
                )
                db.add(cfg)
                db.commit()
                print("[DB] Default settings created")
        finally:
            db.close()
        
        logging.info("Database checked/initialized successfully.")
    except Exception as e:
        logging.exception("Database initialization failed on startup.")


# ==================== REST API Endpoints ====================

@app.get("/", response_class=FileResponse)
async def serve_index():
    """Serve the main HTML file."""
    return INDEX_HTML


@app.post("/data", response_model=SensorRecordOut)
async def post_data(payload: SensorData, db: Session = Depends(get_db)):
    """
    POST endpoint to receive sensor data.
    
    - **device_id**: Device identifier (e.g., ESP32_01)
    - **temperature**: Temperature in Celsius
    - **humidity**: Humidity percentage
    - **outdoor_temperature**: Outdoor temperature from API
    - **weather_condition**: Weather condition description
    - **ldr_value**: Light dependent resistor value
    - **location**: Device location name
    """
    try:
        outdoor_temp, weather_condition = await fetch_weather()
        
        record = SensorRecord(
            device_id=payload.device_id,
            temperature=payload.temperature,
            humidity=payload.humidity,
            outdoor_temperature=outdoor_temp,
            weather_condition=weather_condition,
            alert=0,
            timestamp=datetime.utcnow(),
            ldr_value=payload.ldr_value
        )
        
        db.add(record)
        db.commit()
        db.refresh(record)
        
        # Append to daily CSV
        await append_record_to_csv({
            "timestamp": record.timestamp,
            "device_id": record.device_id,
            "temperature": record.temperature,
            "humidity": record.humidity,
            "outdoor_temperature": outdoor_temp,
            "weather_condition": weather_condition,
            "alert": 0,
            "ldr_value": payload.ldr_value,
            "ldr_alert": None
        })
        
        await event_broker.broadcast({"type": "sensor_update", "data": SensorRecordOut.from_orm(record).dict()})
        
        return record
    except Exception as e:
        logging.exception("Error posting sensor data")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/sensor-data", response_model=SensorRecordOut)
async def post_sensor_data(payload: dict, db: Session = Depends(get_db)):
    """
    POST endpoint for ESP32 sensor data with alert detection.
    
    Accepts both full ESP32Payload and simple sensor data from Arduino.
    Validates temperature readings and triggers alerts if thresholds are exceeded.
    """
    try:
        # Extract temperature values (handle both formats)
        ds18b20_temp = payload.get('ds18b20_temp') or payload.get('ds18b20_temperature')
        dht_temp = payload.get('dht_temp') or payload.get('dht_temperature')
        humidity = payload.get('humidity')
        ldr_value = payload.get('ldr_value')
        
        # Extract device_id and location (with defaults if not provided by ESP32)
        device_id = payload.get('device_id', 'ESP32_01')
        location = payload.get('location', 'Unknown')
        
        cfg = db.query(Settings).filter(Settings.id == 1).first()
        threshold = cfg.alert_threshold if cfg else ALERT_THRESHOLD
        min_threshold = cfg.min_alert_threshold if cfg else MIN_ALERT_THRESHOLD
        
        # Validate temperature readings
        temperature, temp_source, ds18b20_ok, dht_ok, sensor_disagree = validate_temperature_readings(
            ds18b20_temp,
            dht_temp
        )
        
        # Fetch weather
        outdoor_temp, weather_condition = await fetch_weather()
        
        # Create sensor record
        alert_value = 0
        alert_cause = None
        is_alert, alert_cause = check_and_trigger_alert(
            temperature, device_id, location,
            min_threshold, threshold, db, 0  # 0 for now, will be updated after DB insert
        )
        alert_value = 1 if is_alert else 0
        
        record = SensorRecord(
            device_id=device_id,
            temperature=temperature,
            humidity=humidity,
            outdoor_temperature=outdoor_temp,
            weather_condition=weather_condition,
            alert=alert_value,
            timestamp=datetime.utcnow(),
            ldr_value=ldr_value,
            ds18b20_temperature=ds18b20_temp,
            dht_temperature=dht_temp,
            temperature_source=temp_source,
            ds18b20_ok=ds18b20_ok,
            dht_ok=dht_ok,
            sensor_disagreement=sensor_disagree,
            alert_cause=alert_cause
        )
        
        db.add(record)
        db.commit()
        db.refresh(record)
        
        # Re-trigger alert now that we have the record ID
        if is_alert:
            check_and_trigger_alert(
                temperature, device_id, location,
                min_threshold, threshold, db, record.id
            )
        
        # Append to CSV
        await append_record_to_csv({
            "timestamp": record.timestamp,
            "device_id": device_id,
            "temperature": temperature,
            "humidity": humidity,
            "outdoor_temperature": outdoor_temp,
            "weather_condition": weather_condition,
            "alert": alert_value,
            "ldr_value": ldr_value,
            "ldr_alert": None
        })
        
        await event_broker.broadcast({
            "type": "sensor_update",
            "data": SensorRecordOut.from_orm(record).dict()
        })
        
        logging.info(f"Sensor data recorded: device={device_id}, temp={temperature}°C, alert={alert_value}")
        return record
    except ValueError as e:
        logging.warning(f"Invalid sensor readings: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.exception("Error posting sensor data")
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Alert Endpoints ====================

@app.get("/alerts/status", response_model=AlertList)
async def get_alerts():
    """Get current status of all active alerts."""
    status = get_alert_status()
    alerts = [
        AlertStatus(
            alert_type=alert_key,
            is_alert_active=data["is_active"],
            alert_start_time=datetime.utcfromtimestamp(
                (datetime.utcnow() - timedelta(seconds=data["elapsed_seconds"])).timestamp()
            ).isoformat(),
            email_sent=data["email_sent"]
        )
        for alert_key, data in status.items()
    ]
    return AlertList(count=len(alerts), alerts=alerts)


@app.post("/alerts/reset", response_model=AlertReset)
async def reset_alerts_endpoint():
    """Reset all alert tracking states."""
    reset_alerts()
    return AlertReset(success=True, message="All alerts have been reset")


# ==================== Settings Endpoints ====================

@app.get("/get_settings", response_model=SettingsOut)
async def get_settings(db: Session = Depends(get_db)):
    """Get current application settings."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return settings


@app.post("/update_settings", response_model=SettingsOut)
async def update_settings(update: SettingsUpdate, db: Session = Depends(get_db)):
    """Update application settings."""
    try:
        settings = db.query(Settings).filter(Settings.id == 1).first()
        if not settings:
            raise HTTPException(status_code=404, detail="Settings not found")
        
        for field, value in update.dict(exclude_unset=True).items():
            setattr(settings, field, value)
        
        db.commit()
        db.refresh(settings)
        logging.info(f"Settings updated: {update.dict(exclude_unset=True)}")
        return settings
    except Exception as e:
        db.rollback()
        logging.exception("Error updating settings")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/config/thresholds")
async def update_thresholds(
    payload: ThresholdUpdate,
    db: Session = Depends(get_db)
):
    """Update alert thresholds via JSON body."""
    try:
        settings = db.query(Settings).filter(Settings.id == 1).first()
        if not settings:
            raise HTTPException(status_code=404, detail="Settings not found")
        
        if payload.max_threshold is not None:
            settings.alert_threshold = float(payload.max_threshold)
            logging.info(f"Max threshold updated to {payload.max_threshold}")
        
        if payload.min_threshold is not None:
            settings.min_alert_threshold = float(payload.min_threshold)
            logging.info(f"Min threshold updated to {payload.min_threshold}")
        
        db.commit()
        db.refresh(settings)
        
        return {
            "success": True,
            "max_threshold": settings.alert_threshold,
            "min_threshold": settings.min_alert_threshold
        }
    except Exception as e:
        db.rollback()
        logging.exception("Error updating thresholds")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/config/threshold")
async def get_max_threshold(db: Session = Depends(get_db)):
    """Get maximum temperature threshold (for ESP32 compatibility)."""
    try:
        settings = db.query(Settings).filter(Settings.id == 1).first()
        if not settings:
            raise HTTPException(status_code=404, detail="Settings not found")
        
        return {
            "threshold": settings.alert_threshold
        }
    except Exception as e:
        logging.exception("Error fetching max threshold")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/config/min-threshold")
async def get_min_threshold(db: Session = Depends(get_db)):
    """Get minimum temperature threshold (for ESP32 compatibility)."""
    try:
        settings = db.query(Settings).filter(Settings.id == 1).first()
        if not settings:
            raise HTTPException(status_code=404, detail="Settings not found")
        
        return {
            "min_threshold": settings.min_alert_threshold
        }
    except Exception as e:
        logging.exception("Error fetching min threshold")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Data Query Endpoints ====================

@app.get("/status")
async def get_status(db: Session = Depends(get_db)):
    """Get current system status including settings and latest data."""
    try:
        settings = db.query(Settings).filter(Settings.id == 1).first()
        latest_record = db.query(SensorRecord).order_by(SensorRecord.id.desc()).first()
        
        return {
            "status": "ok",
            "threshold": settings.alert_threshold if settings else ALERT_THRESHOLD,
            "min_threshold": settings.min_alert_threshold if settings else MIN_ALERT_THRESHOLD,
            "latest_record": SensorRecordOut.from_orm(latest_record).dict() if latest_record else None
        }
    except Exception as e:
        logging.exception("Error fetching status")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/data/latest")
async def get_latest_data(db: Session = Depends(get_db)):
    """Get the latest sensor record."""
    try:
        latest = db.query(SensorRecord).order_by(SensorRecord.id.desc()).first()
        if not latest:
            raise HTTPException(status_code=404, detail="No data available")
        return SensorRecordOut.from_orm(latest)
    except Exception as e:
        logging.exception("Error fetching latest data")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/data/history")
async def get_data_history(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get historical sensor records."""
    try:
        records = db.query(SensorRecord).order_by(SensorRecord.timestamp.desc()).limit(limit).offset(offset).all()
        return [SensorRecordOut.from_orm(r).dict() for r in records]
    except Exception as e:
        logging.exception("Error fetching history")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sensor-records", response_model=List[SensorRecordOut])
async def get_sensor_records(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get sensor records with pagination."""
    records = db.query(SensorRecord).order_by(SensorRecord.timestamp.desc()).limit(limit).offset(offset).all()
    return records


@app.get("/email-alerts", response_model=List[EmailAlertOut])
async def get_email_alerts(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get email alert logs with pagination."""
    alerts = db.query(EmailAlert).order_by(EmailAlert.timestamp.desc()).limit(limit).offset(offset).all()
    return alerts


# ==================== Testing Endpoints ====================

@app.post("/send_email_alert")
async def send_email_alert(payload: Optional[EmailTestIn] = None, db: Session = Depends(get_db)):
    """Send a test email alert."""
    try:
        settings = db.query(Settings).filter(Settings.id == 1).first()
        if not settings or not settings.email_recipients:
            raise HTTPException(status_code=400, detail="No email recipients configured")
        
        recipients = [r.strip() for r in settings.email_recipients.split(',') if r.strip()]
        subject = payload.subject or "IoT Test Alert" if payload else "IoT Test Alert"
        body = payload.body or "This is a test alert" if payload else "This is a test alert"
        
        await send_email_with_logging(recipients, subject, body)
        return {"success": True, "message": "Test email sent"}
    except Exception as e:
        logging.exception("Error sending test email")
        raise HTTPException(status_code=400, detail=str(e))


# ==================== WebSocket Endpoints ====================

@app.websocket("/ws")
async def websocket_endpoint_root(websocket: WebSocket):
    """WebSocket endpoint for real-time event streaming (root path)."""
    await event_broker.connect(websocket)
    try:
        # Keep connection open and receive broadcasts
        while True:
            try:
                # Use longer timeout to reduce ping/disconnect cycles
                await asyncio.wait_for(websocket.receive_text(), timeout=60)
            except asyncio.TimeoutError:
                # Send a ping to keep connection alive
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break
            except Exception:
                break
    except WebSocketDisconnect:
        event_broker.disconnect(websocket)
    except Exception as e:
        logging.exception("WebSocket error on /ws")
        if websocket in event_broker.active_connections:
            event_broker.disconnect(websocket)


@app.websocket("/ws/events")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time event streaming."""
    await event_broker.connect(websocket)
    try:
        # Keep connection open and receive broadcasts
        while True:
            try:
                # Use longer timeout to reduce ping/disconnect cycles
                await asyncio.wait_for(websocket.receive_text(), timeout=60)
            except asyncio.TimeoutError:
                # Send a ping to keep connection alive
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break
            except Exception:
                break
    except WebSocketDisconnect:
        event_broker.disconnect(websocket)
    except Exception as e:
        logging.exception("WebSocket error on /ws/events")
        if websocket in event_broker.active_connections:
            event_broker.disconnect(websocket)


# ==================== Server-Sent Events ====================

@app.get("/events")
async def stream_events(db: Session = Depends(get_db)):
    """Server-Sent Events endpoint for streaming sensor data."""
    
    async def event_generator():
        last_id = 0
        
        while True:
            latest_record = db.query(SensorRecord).order_by(SensorRecord.id.desc()).first()
            
            if latest_record and latest_record.id > last_id:
                last_id = latest_record.id
                record_dict = SensorRecordOut.from_orm(latest_record).dict()
                
                yield f"data: {record_dict}\n\n"
            
            await asyncio.sleep(1)
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
