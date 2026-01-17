"""Pydantic schemas for API requests and responses."""
from pydantic import BaseModel, Field
from typing import Optional, List


class SensorData(BaseModel):
    """Request model for sensor data."""
    device_id: str = Field(..., examples=["ESP32_01"])
    temperature: float
    humidity: Optional[float] = None
    outdoor_temperature: Optional[float] = None
    weather_condition: Optional[str] = None
    ldr_value: Optional[int] = None
    location: str = Field(default="Unknown")


class ESP32Payload(BaseModel):
    """Request model for ESP32 sensor data with alert."""
    device_id: str = Field(..., examples=["ESP32_01"])
    temperature: float
    humidity: Optional[float] = None
    location: str = Field(default="Unknown")
    ldr_value: Optional[int] = None
    ds18b20_temperature: Optional[float] = None
    dht_temperature: Optional[float] = None


class SettingsUpdate(BaseModel):
    """Request model for updating settings."""
    alert_threshold: Optional[float] = None
    min_alert_threshold: Optional[float] = None
    phone_number: Optional[str] = None
    sms_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    email_recipients: Optional[str] = None
    brevo_sender_email: Optional[str] = None
    brevo_sender_name: Optional[str] = None
    whatsapp_enabled: Optional[bool] = None
    whatsapp_number: Optional[str] = None


class EmailTestIn(BaseModel):
    """Request model for email alert test."""
    subject: Optional[str] = None
    body: Optional[str] = None


class AlertStatus(BaseModel):
    """Response model for alert status."""
    alert_type: str
    is_alert_active: bool
    alert_start_time: Optional[str] = None
    email_sent: bool


class AlertReset(BaseModel):
    """Response model for alert reset."""
    success: bool
    message: str


class AlertList(BaseModel):
    """Response model for list of alerts."""
    count: int
    alerts: List[AlertStatus]
