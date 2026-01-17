"""Utility functions for CSV handling, weather API, and data processing."""
import csv
import os
import asyncio
from datetime import datetime
from typing import Tuple, Optional

import httpx
import logging

from .config import OPENWEATHER_API_KEY, OPENWEATHER_BASE_URL, FIXED_LAT, FIXED_LON, BASE_DIR


def get_daily_csv_path() -> str:
    """Get the path for today's daily CSV export file."""
    date_str = datetime.now().strftime("%Y-%m-%d")
    return os.path.join(BASE_DIR, "..", f"iot_{date_str}.csv")


def ensure_daily_csv_file():
    """Ensure the daily CSV file exists with headers."""
    csv_path = get_daily_csv_path()
    if not os.path.exists(csv_path):
        with open(csv_path, "w", newline="") as csvfile:
            writer = csv.DictWriter(
                csvfile,
                fieldnames=[
                    "timestamp", "device_id", "temperature", "humidity",
                    "outdoor_temperature", "weather_condition", "alert",
                    "ldr_value", "ldr_alert"
                ]
            )
            writer.writeheader()
        print(f"[CSV] Created new daily CSV file: {csv_path}")


async def append_record_to_csv(record: dict) -> None:
    """Append a sensor record to the daily CSV file."""
    csv_path = get_daily_csv_path()
    ensure_daily_csv_file()
    
    try:
        with open(csv_path, "a", newline="") as csvfile:
            writer = csv.DictWriter(
                csvfile,
                fieldnames=[
                    "timestamp", "device_id", "temperature", "humidity",
                    "outdoor_temperature", "weather_condition", "alert",
                    "ldr_value", "ldr_alert"
                ]
            )
            writer.writerow({
                "timestamp": record.get("timestamp"),
                "device_id": record.get("device_id"),
                "temperature": record.get("temperature"),
                "humidity": record.get("humidity"),
                "outdoor_temperature": record.get("outdoor_temperature"),
                "weather_condition": record.get("weather_condition"),
                "alert": record.get("alert"),
                "ldr_value": record.get("ldr_value"),
                "ldr_alert": record.get("ldr_alert")
            })
    except Exception as e:
        print(f"[CSV] ERROR appending to CSV: {str(e)}")
        logging.exception("Failed to append record to CSV")


async def fetch_weather() -> Tuple[Optional[float], Optional[str]]:
    """Fetch outdoor weather from OpenWeather API."""
    if not OPENWEATHER_API_KEY:
        return None, None
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                OPENWEATHER_BASE_URL,
                params={
                    "lat": FIXED_LAT,
                    "lon": FIXED_LON,
                    "appid": OPENWEATHER_API_KEY,
                    "units": "metric"
                },
                timeout=5.0
            )
            
            if response.status_code == 200:
                data = response.json()
                outdoor_temp = data.get("main", {}).get("temp")
                condition = data.get("weather", [{}])[0].get("main", "Unknown")
                print(f"[WEATHER] Fetched weather: {outdoor_temp}°C, {condition}")
                return outdoor_temp, condition
            else:
                print(f"[WEATHER] OpenWeather API error: {response.status_code}")
                return None, None
    except asyncio.TimeoutError:
        print("[WEATHER] OpenWeather API timeout")
        return None, None
    except Exception as e:
        print(f"[WEATHER] Error fetching weather: {str(e)}")
        logging.exception("Failed to fetch weather")
        return None, None


def validate_temperature_readings(
    ds18b20_temp: Optional[float],
    dht_temp: Optional[float]
) -> Tuple[float, str, bool, bool, bool]:
    """
    Validate temperature readings from dual sensors.
    Returns (temperature, source, ds18b20_ok, dht_ok, disagreement).
    """
    ds18b20_ok = ds18b20_temp is not None and -40 <= ds18b20_temp <= 125
    dht_ok = dht_temp is not None and -40 <= dht_temp <= 80
    
    sensor_disagreement = False
    temperature = None
    temperature_source = None
    
    if ds18b20_ok and dht_ok:
        disagreement = abs(ds18b20_temp - dht_temp)
        sensor_disagreement = disagreement > 2.0
        
        if sensor_disagreement:
            print(f"[SENSOR_VALIDATION] Sensor disagreement: DS18B20={ds18b20_temp:.1f}°C, DHT={dht_temp:.1f}°C (diff={disagreement:.1f}°C)")
        
        # Use DS18B20 as primary if available
        temperature = ds18b20_temp
        temperature_source = "DS18B20"
    elif ds18b20_ok:
        temperature = ds18b20_temp
        temperature_source = "DS18B20"
    elif dht_ok:
        temperature = dht_temp
        temperature_source = "DHT"
    else:
        raise ValueError("Both temperature sensors are out of range")
    
    return temperature, temperature_source, ds18b20_ok, dht_ok, sensor_disagreement
