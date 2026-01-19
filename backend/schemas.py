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
    device_id: Optional[str] = Field(default="ESP32_01", examples=["ESP32_01"])
    temperature: Optional[float] = None  # Main temperature (if precomputed)
    humidity: Optional[float] = None
    location: Optional[str] = Field(default="Unknown")
    ldr_value: Optional[int] = None
    ds18b20_temp: Optional[float] = None  # DS18B20 temperature
    dht_temp: Optional[float] = None  # DHT11 temperature
    ds18b20_temperature: Optional[float] = None  # Alternative field name
    dht_temperature: Optional[float] = None  # Alternative field name


class ESP32SimplePayload(BaseModel):
    """Request model for ESP32 with simple field names (from Arduino)."""
    dht_temp: Optional[float] = None
    humidity: Optional[float] = None
    ds18b20_temp: Optional[float] = None
    ldr_value: Optional[int] = None
    max_threshold: Optional[float] = None
    min_threshold: Optional[float] = None
    alert_max: Optional[bool] = None
    alert_min: Optional[bool] = None
    alert: Optional[bool] = None


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


class ThresholdUpdate(BaseModel):
    """Request model for updating temperature thresholds."""
    max_threshold: Optional[float] = None
    min_threshold: Optional[float] = None


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
