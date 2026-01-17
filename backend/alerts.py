"""Alert tracking and triggering logic."""
import asyncio
import logging
import threading
from datetime import datetime
from collections import defaultdict
from typing import Optional, Tuple

from sqlalchemy.orm import Session

from .config import (
    ALERT_THRESHOLD, MIN_ALERT_THRESHOLD, ALERT_EMAIL_DELAY_SECONDS
)
from .database import Settings
from .notifications import send_email_with_logging, send_sms_message, send_whatsapp_message

# Alert tracking state: monitors when alerts start and sends email only once after 10 seconds
alert_tracking_state = {
    "alert_start_time": defaultdict(lambda: None),
    "email_sent": defaultdict(lambda: False),
    "lock": threading.Lock()
}


def get_settings(db: Session) -> Optional[Settings]:
    """Get application settings from database."""
    return db.query(Settings).filter(Settings.id == 1).first()


def determine_alert_cause(temperature: float, min_threshold: float, max_threshold: float) -> Optional[str]:
    """Determine the cause of a temperature alert."""
    if temperature >= max_threshold:
        return "HIGH_TEMP"
    elif temperature <= min_threshold:
        return "LOW_TEMP"
    return None


def check_and_trigger_alert(
    temperature: float,
    device_id: str,
    location: str,
    min_threshold: float,
    max_threshold: float,
    db: Session,
    record_id: int
) -> Tuple[bool, Optional[str]]:
    """
    Check if alert conditions are met and trigger alert dispatch if needed.
    Returns tuple of (is_alert_active, alert_cause).
    """
    alert_cause = determine_alert_cause(temperature, min_threshold, max_threshold)
    
    if alert_cause:  # Alert is active
        alert_key = f"{device_id}_{alert_cause}"
        should_send_email = False
        
        with alert_tracking_state["lock"]:
            now = datetime.utcnow()
            alert_start = alert_tracking_state["alert_start_time"][alert_key]
            email_sent = alert_tracking_state["email_sent"][alert_key]
            
            if alert_start is None:
                alert_tracking_state["alert_start_time"][alert_key] = now
                alert_tracking_state["email_sent"][alert_key] = False
                print(f"[ALERT_TRACK] NEW ALERT DETECTED: {alert_key}")
                print(f"[ALERT_TRACK] Alert start time recorded: {now.isoformat()}")
                print(f"[ALERT_TRACK] Will send email in {ALERT_EMAIL_DELAY_SECONDS} seconds")
                logging.info(f"Alert {alert_key} started. Will send email in {ALERT_EMAIL_DELAY_SECONDS}s.")
            else:
                elapsed = (now - alert_start).total_seconds()
                if elapsed >= ALERT_EMAIL_DELAY_SECONDS and not email_sent:
                    should_send_email = True
                    alert_tracking_state["email_sent"][alert_key] = True
                    print(f"[ALERT_TRACK] ALERT THRESHOLD MET: {alert_key} running for {elapsed:.1f}s")
                    print(f"[ALERT_TRACK] Triggering email send NOW")
                    logging.info(f"Alert {alert_key} has been running for {elapsed:.1f}s. Sending email.")
                elif email_sent:
                    print(f"[ALERT_TRACK] Alert {alert_key} ongoing - Email already sent, skipping duplicate")
                    logging.info(f"Alert {alert_key} is ongoing but email already sent.")
                else:
                    time_remaining = ALERT_EMAIL_DELAY_SECONDS - elapsed
                    print(f"[ALERT_TRACK] Alert {alert_key} running {elapsed:.1f}s - {time_remaining:.1f}s until email")
                    logging.info(f"Alert {alert_key} running for {elapsed:.1f}s. Email will be sent in {time_remaining:.1f}s.")
        
        # Send alert notifications if needed
        if should_send_email:
            dispatch_alert(temperature, device_id, location, alert_cause, db, record_id)
        
        return True, alert_cause
    
    else:  # Alert cleared
        alert_key_high = f"{device_id}_HIGH_TEMP"
        alert_key_low = f"{device_id}_LOW_TEMP"
        
        with alert_tracking_state["lock"]:
            if alert_tracking_state["alert_start_time"][alert_key_high] is not None:
                alert_tracking_state["alert_start_time"][alert_key_high] = None
                alert_tracking_state["email_sent"][alert_key_high] = False
                print(f"[ALERT_TRACK] ALERT CLEARED: {alert_key_high}")
                logging.info(f"Alert {alert_key_high} cleared.")
            
            if alert_tracking_state["alert_start_time"][alert_key_low] is not None:
                alert_tracking_state["alert_start_time"][alert_key_low] = None
                alert_tracking_state["email_sent"][alert_key_low] = False
                print(f"[ALERT_TRACK] ALERT CLEARED: {alert_key_low}")
                logging.info(f"Alert {alert_key_low} cleared.")
        
        return False, None


def dispatch_alert(
    temperature: float,
    device_id: str,
    location: str,
    alert_cause: str,
    db: Session,
    record_id: int
) -> None:
    """Dispatch alert notifications via email, SMS, and WhatsApp."""
    cfg = get_settings(db)
    
    # Email dispatch
    email_is_enabled = cfg.email_enabled if cfg and hasattr(cfg, 'email_enabled') else True
    recipients_csv = (cfg.email_recipients if cfg and cfg.email_recipients else "")
    recipients = [r.strip() for r in recipients_csv.split(',') if r.strip()]
    
    if email_is_enabled and recipients:
        subject = f"IoT Alert: {alert_cause or 'THRESHOLD_EXCEEDED'} at {location}"
        body = (
            f"<p><strong>Alert:</strong> {alert_cause or 'THRESHOLD_EXCEEDED'}</p>"
            f"<p>Device: {device_id}</p>"
            f"<p>Location: {location}</p>"
            f"<p>Temperature: {temperature:.1f}°C</p>"
            f"<p>Thresholds: min {MIN_ALERT_THRESHOLD:.1f}°C, max {ALERT_THRESHOLD:.1f}°C</p>"
            f"<p>Record ID: {record_id}</p>"
            f"<p>Time: {datetime.utcnow().isoformat()}</p>"
        )
        
        print(f"[ALERT_TRACK] Dispatching email task...")
        asyncio.create_task(send_email_with_logging(recipients, subject, body, record_id, alert_cause))
        print(f"[ALERT_TRACK] Email alert task created for {len(recipients)} recipients")
        logging.info(f"Email alert scheduled to {len(recipients)} recipients")
        
        # SMS dispatch
        sms_is_enabled = cfg.sms_enabled if cfg and hasattr(cfg, 'sms_enabled') else False
        phone = cfg.phone_number if cfg and cfg.phone_number else "+212638776450"
        if sms_is_enabled:
            sms_text = f"IoT Alert: {alert_cause} at {location}. Temp: {temperature:.1f}°C (min: {MIN_ALERT_THRESHOLD:.1f}°C, max: {ALERT_THRESHOLD:.1f}°C)"
            print(f"[ALERT_TRACK] Dispatching SMS task to {phone}...")
            asyncio.create_task(send_sms_message(phone, sms_text))
            print(f"[ALERT_TRACK] SMS alert task created for {phone}")
            logging.info(f"SMS alert scheduled to {phone}")
        else:
            print(f"[ALERT_TRACK] SMS sending is disabled")
            logging.info("SMS sending is disabled. Skipping SMS alert.")
        
        # WhatsApp dispatch
        whatsapp_is_enabled = cfg.whatsapp_enabled if cfg and hasattr(cfg, 'whatsapp_enabled') else False
        whatsapp_number = cfg.whatsapp_number if cfg and cfg.whatsapp_number else None
        if whatsapp_is_enabled and whatsapp_number:
            whatsapp_text = f"🚨 IoT Alert: {alert_cause}\nLocation: {location}\nTemperature: {temperature:.1f}°C\nThresholds: {MIN_ALERT_THRESHOLD:.1f}°C - {ALERT_THRESHOLD:.1f}°C"
            print(f"[ALERT_TRACK] Dispatching WhatsApp task to {whatsapp_number}...")
            asyncio.create_task(send_whatsapp_message(whatsapp_number, whatsapp_text))
            print(f"[ALERT_TRACK] WhatsApp alert task created for {whatsapp_number}")
            logging.info(f"WhatsApp alert scheduled to {whatsapp_number}")
        elif whatsapp_is_enabled and not whatsapp_number:
            print(f"[ALERT_TRACK] WhatsApp is enabled but no number configured")
            logging.info("WhatsApp is enabled but no recipient number configured.")
    else:
        if not email_is_enabled:
            print(f"[ALERT_TRACK] Email sending is disabled")
            logging.info("Email sending is disabled. Skipping email alert.")
        elif not recipients:
            print(f"[ALERT_TRACK] No email recipients configured")
            logging.info("No email recipients configured. Skipping email alert.")


def get_alert_status() -> dict:
    """Get current status of all alerts."""
    with alert_tracking_state["lock"]:
        status = {}
        for alert_key, start_time in alert_tracking_state["alert_start_time"].items():
            if start_time is not None:
                elapsed = (datetime.utcnow() - start_time).total_seconds()
                status[alert_key] = {
                    "is_active": True,
                    "elapsed_seconds": elapsed,
                    "email_sent": alert_tracking_state["email_sent"][alert_key]
                }
        return status


def reset_alerts() -> None:
    """Reset all alert tracking states."""
    with alert_tracking_state["lock"]:
        alert_tracking_state["alert_start_time"].clear()
        alert_tracking_state["email_sent"].clear()
    print("[ALERT_TRACK] All alerts have been reset")
    logging.info("All alerts have been reset")
