"""Database models for the IoT application."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

from .config import DATABASE_URL

# Database setup
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class SensorRecord(Base):
    """SQLAlchemy model for sensor readings."""
    __tablename__ = "sensor_records"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, index=True)
    temperature = Column(Float)
    humidity = Column(Float)
    outdoor_temperature = Column(Float)
    weather_condition = Column(String)
    alert = Column(Integer)
    timestamp = Column(DateTime, index=True)
    ldr_value = Column(Integer)
    ldr_alert = Column(Integer)
    ds18b20_temperature = Column(Float)
    dht_temperature = Column(Float)
    temperature_source = Column(String)
    ds18b20_ok = Column(Boolean, default=True)
    dht_ok = Column(Boolean, default=True)
    sensor_disagreement = Column(Boolean, default=False)
    alert_cause = Column(String)


class Settings(Base):
    """SQLAlchemy model for application settings."""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    alert_threshold = Column(Float)
    min_alert_threshold = Column(Float)
    phone_number = Column(String)
    sms_enabled = Column(Boolean, default=True, nullable=False)
    email_enabled = Column(Boolean, default=True, nullable=False)
    email_recipients = Column(String)
    brevo_sender_email = Column(String)
    brevo_sender_name = Column(String)
    whatsapp_enabled = Column(Boolean, default=False, nullable=False)
    whatsapp_number = Column(String)


class EmailAlert(Base):
    """SQLAlchemy model for email alert logs."""
    __tablename__ = "email_alerts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, index=True, default=datetime.utcnow)
    recipient = Column(String)
    subject = Column(String)
    body = Column(String)
    status = Column(String)  # SENT | FAILED
    error = Column(String)
    alert_record_id = Column(Integer, index=True, nullable=True)
    alert_cause = Column(String, nullable=True)

    model_config = ConfigDict(from_attributes=True)


# Pydantic models for API requests/responses
class SensorRecordOut(BaseModel):
    """Response model for sensor records."""
    id: int
    device_id: str
    temperature: float
    humidity: Optional[float] = None
    outdoor_temperature: Optional[float] = None
    weather_condition: Optional[str] = None
    alert: int
    timestamp: datetime
    ldr_value: Optional[int] = None
    ldr_alert: Optional[int] = None
    ds18b20_temperature: Optional[float] = None
    dht_temperature: Optional[float] = None
    temperature_source: Optional[str] = None
    ds18b20_ok: Optional[bool] = None
    dht_ok: Optional[bool] = None
    sensor_disagreement: Optional[bool] = None
    alert_cause: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SettingsOut(BaseModel):
    """Response model for settings."""
    id: int
    alert_threshold: float
    min_alert_threshold: float
    phone_number: Optional[str] = None
    sms_enabled: bool
    email_enabled: bool
    email_recipients: Optional[str] = None
    brevo_sender_email: Optional[str] = None
    brevo_sender_name: Optional[str] = None
    whatsapp_enabled: bool
    whatsapp_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EmailAlertOut(BaseModel):
    """Response model for email alerts."""
    id: int
    timestamp: datetime
    recipient: str
    subject: str
    body: str
    status: str
    error: Optional[str] = None
    alert_record_id: Optional[int] = None
    alert_cause: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


def get_db():
    """Dependency injection for database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
