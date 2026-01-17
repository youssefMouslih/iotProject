# 📚 IoT Monitoring System - Complete Documentation

**Last Updated:** January 17, 2026  
**Project Status:** ✅ Production Ready  
**Backend:** Refactored to Modular Architecture  
**Features:** SMS, Email, WhatsApp Alerts  

---

## Table of Contents

1. [Mini-Project Overview](#mini-project-overview)
2. [Project Overview](#project-overview)
3. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [Running the Project](#running-the-project)
5. [Backend Modules](#backend-modules)
6. [API Endpoints](#api-endpoints)
7. [Frontend (React Dashboard)](#frontend-react-dashboard)
8. [WhatsApp Integration](#whatsapp-integration)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

---

## Mini-Project Overview

### Project Title
**Intelligent Temperature and Humidity Monitoring System for a Clinical Room Based on ESP32, Temperature Sensors, FastAPI Backend, and Web Dashboard**

### 1. Introduction

In clinical environments such as treatment rooms, laboratories, and patient rooms, controlling temperature and humidity is a critical factor to ensure patient safety, preserve medical equipment, and comply with health and regulatory standards. Excessive variations in temperature or humidity can lead to health risks, degradation of medical devices, or regulatory non-compliance.

As part of the Sensors and Data Acquisition module, this mini-project aims to design and implement an intelligent real-time monitoring system capable of:

• Measuring temperature and humidity in a clinical room  
• Ensuring sensor redundancy for increased reliability  
• Detecting threshold violations  
• Triggering immediate alerts via sound, LED, SMS, and email  
• Storing and visualizing data through an interactive web dashboard  
• Enabling data export for future analysis and prediction

### 2. Problem Statement and Objectives

#### 2.1 Problem Statement

Traditional temperature monitoring systems present several limitations:

• Lack of sensor redundancy (sensor failure results in data loss)  
• Absence of real-time visualization  
• Alerts limited to local signaling only  
• Data not exploitable for analysis or prediction

#### 2.2 Project Objectives

The main objectives of this project are to:

• Design a reliable and fault-tolerant monitoring system  
• Ensure real-time environmental monitoring  
• Enable dynamic threshold management  
• Centralize data storage in a database  
• Provide an interactive and intuitive dashboard  
• Allow data export for advanced analysis  
• Implement intelligent multi-channel alerting

### 3. General System Architecture

The system is organized into three main layers.

#### 3.1 Hardware Layer

• **ESP32 WROOM (32 pins)** - Main microcontroller  
• **DS18B20** - Primary temperature sensor  
• **DHT11** - Secondary sensor and humidity measurement  
• **Breadboard** - Prototyping board  
• **Passive buzzer** - Audible alerts  
• **Bi-color LED module** (Red / Green) - Visual status indicator  
• **Resistors and wiring** - Supporting components

#### 3.2 Backend Software Layer

• **REST API** developed using FastAPI (Python)  
• **SQLite database** - Data persistence  
• **Notification services:**
  - Brevo API (Email)  
  - Infobip API (SMS)  
  - Twilio API (WhatsApp) - *Added in refactored version*

#### 3.3 Frontend Layer

• Web-based dashboard (React + Vite)  
• Real-time data streaming  
• Threshold configuration  
• Graphical visualization  
• Historical data browsing and advanced search  
• CSV data export

### 4. Hardware Components and Technical Specifications

#### 4.1 Microcontroller: ESP32 WROOM (32 Pins)

**Description:** The ESP32 WROOM is a powerful microcontroller with integrated WiFi connectivity. It is used as the central unit for data acquisition, processing, and transmission.

**Technical Specifications:**

| Characteristic | Value |
|---|---|
| Processor | Dual-core Xtensa LX6 |
| Clock Frequency | Up to 240 MHz |
| Flash Memory | 4 MB |
| SRAM | 520 KB |
| WiFi | IEEE 802.11 b/g/n |
| Bluetooth | BLE + Classic |
| Operating Voltage | 3.3 V |
| GPIO Pins | Up to 34 |
| Interfaces | UART, SPI, I2C, I2S, PWM |
| Power Consumption | Low (integrated sleep modes) |

**Role in the Project:**
- Reading sensor data  
- Establishing WiFi connectivity  
- Communicating with the backend API  
- Triggering local alerts

#### 4.2 Primary Temperature Sensor: DS18B20

**Description:** The DS18B20 is a high-precision digital temperature sensor communicating via the OneWire protocol, which minimizes GPIO usage.

**Technical Specifications:**

| Characteristic | Value |
|---|---|
| Type | Digital temperature sensor |
| Measurement Range | -55°C to +125°C |
| Accuracy | ±0.5°C (from -10°C to +85°C) |
| Resolution | Programmable (9–12 bits) |
| Interface | OneWire |
| Supply Voltage | 3.0 V – 5.5 V |
| Conversion Time | ~750 ms |
| Unique Address | 64-bit ROM |

**Role in the Project:**
- Primary indoor temperature sensor  
- Main sensor for threshold detection  
- High reliability for clinical environments

#### 4.3 Secondary Sensor: DHT11 (Temperature and Humidity)

**Description:** The DHT11 is a digital sensor combining temperature and relative humidity measurements.

**Technical Specifications:**

| Characteristic | Value |
|---|---|
| Temperature Range | 0°C to 50°C |
| Temperature Accuracy | ±2°C |
| Humidity Range | 20% to 80% RH |
| Humidity Accuracy | ±5% RH |
| Interface | Proprietary digital protocol |
| Supply Voltage | 3.3 V – 5 V |
| Sampling Frequency | 1 Hz |

**Role in the Project:**
- Backup temperature sensor  
- Primary humidity measurement source  
- Used in case of DS18B20 failure

#### 4.4 Passive Buzzer

**Description:** The passive buzzer produces variable sound signals using PWM control.

**Technical Specifications:**

| Characteristic | Value |
|---|---|
| Type | Passive buzzer |
| Operating Voltage | 3.3 V – 5 V |
| Frequency | PWM controlled |
| Interface | GPIO |

**Role in the Project:**
- Local audible alert  
- Activated when temperature thresholds are exceeded

#### 4.5 Bi-Color LED Module (Red / Green)

**Description:** This module provides visual indication of the system's operational status.

**Technical Specifications:**

| Characteristic | Value |
|---|---|
| Colors | Red / Green |
| Operating Voltage | 2.0 V – 3.3 V |
| Current | ~20 mA |
| Interface | GPIO |

**Role in the Project:**
- Green LED: normal operation  
- Red LED: alert state

#### 4.6 Breadboard and Passive Components

**Breadboard:**
- Type: Solderless breadboard  
- Usage: Rapid prototyping

**Passive Components:**
- 4.7 kΩ resistor for the DS18B20 OneWire bus  
- Current-limiting resistors for LEDs

### 5. Sensor Redundancy Strategy

To ensure continuous operation and reliability:

• The **DS18B20** is used as the primary temperature sensor  
• In case of failure or invalid readings:
  - The system automatically switches to the **DHT11**

This redundancy strategy significantly improves robustness and fault tolerance. The system validates readings and marks sensor health with flags in the database:
- `ds18b20_ok` - DS18B20 validity flag
- `dht_ok` - DHT11 validity flag
- `sensor_disagreement` - True if |ΔT| > 2.0°C between sensors

### 6. Data Acquisition and Transmission

#### 6.1 Sensor Reading

The ESP32 performs the following tasks:

• Reads temperature from the DS18B20  
• Reads temperature and humidity from the DHT11  
• Validates sensor data  
• Selects trusted temperature (prefers DS18B20)  
• Calculates sensor disagreement

#### 6.2 Communication with the Backend

• WiFi connection  
• Data transmission every 2 seconds  
• Communication via RESTful HTTP API

**Transmitted data includes:**
- Indoor temperature (dual sensor readings)  
- Humidity  
- Active sensor identifier  
- Sensor health flags  
- Timestamp  
- Device ID  
- Location

### 7. Backend – FastAPI

#### 7.1 Backend Responsibilities

• Receiving sensor data from the ESP32  
• Storing measurements in the SQLite database  
• Providing minimum and maximum thresholds  
• Managing alerts  
• Supplying data to the frontend  
• Sending notifications (Email, SMS, WhatsApp)

#### 7.2 Database (SQLite)

**Main tables:**
- `sensor_records` - Measurements and diagnostics  
- `settings` - Thresholds and configuration  
- `email_alerts` - Email alert logs

Threshold values are persistent and dynamically configurable through the web dashboard API.

### 8. Threshold Management and Alert Logic

#### 8.1 Threshold Definition

• **Minimum threshold** - Lower temperature limit (default: 15.0°C)  
• **Maximum threshold** - Upper temperature limit (default: 35.0°C)  
• **Editable** through the web dashboard  
• **Stored** in the database  
• **LDR threshold** - Light sensor alert threshold (default: 300)

#### 8.2 ESP32–Backend Synchronization

• ESP32 queries the backend every 2 seconds  
• Ensures the use of the most up-to-date thresholds  
• Prevents configuration drift

#### 8.3 Alert Trigger Conditions

An alert is triggered if:

• Temperature < Minimum Threshold (**LOW_TEMP**) OR  
• Temperature > Maximum Threshold (**HIGH_TEMP**) OR  
• Sensor failure detected (**SENSOR_FAULT**)

The system includes a 10-second delay mechanism to avoid duplicate alerts within the same triggering window.

### 9. Multi-Channel Alert System

#### 9.1 Local Alerts

• **Passive buzzer** - Activation on threshold violation  
• **Red LED** - Blinking red LED indicator  
• **Visual feedback** - Dashboard alert tile turns red

#### 9.2 Remote Alerts

##### 9.2.1 Email Alerts (Brevo API)

Email content includes:

• Alert type (HIGH_TEMP, LOW_TEMP, SENSOR_FAULT)  
• Location  
• Indoor temperature  
• Outdoor temperature (from weather API)  
• Humidity  
• Configured thresholds  
• Timestamp  
• Device ID

##### 9.2.2 SMS Alerts (Infobip)

Concise critical alert message containing essential information:
- Alert type
- Temperature
- Location
- Device ID

##### 9.2.3 WhatsApp Alerts (Twilio) - *NEW*

Rich alert message with emoji indicators:
```
🚨 IoT Alert: HIGH_TEMP
Location: Your Device Location
Temperature: 38.5°C
Thresholds: 15.0°C - 35.0°C
```

### 10. Web Interface – Real-Time Dashboard

#### 10.1 Main Features

• **Real-time data streaming** - Via WebSocket and SSE  
• **Indoor temperature display** - From dual sensors  
• **Humidity monitoring** - From DHT11  
• **Outdoor temperature display** - From weather API  
• **Status indicator** - Normal / Alert state  
• **Audio alert** - Synthesized siren-style sound  
• **Visual alert** - Police siren-style animation during alerts

#### 10.2 Indoor vs. Outdoor Comparison

• Outdoor data retrieved via OpenWeather API (or Open-Meteo fallback)  
• Graphical comparison between indoor and outdoor temperatures  
• Historical trends visualization

### 11. History Page and Advanced Search

#### 11.1 Available Filters

• Specific date  
• Date range  
• Sensor type (DS18B20 or DHT11)  
• Alert-only records  
• Temperature range

#### 11.2 Visualization

• Interactive charts (Plotly)  
• Filtered data tables with pagination  
• Sensor health indicators

#### 11.3 CSV Export

Filtered data can be exported for:

• Statistical analysis  
• Machine learning applications  
• Temperature prediction  
• Compliance documentation  
• Research purposes

**Export includes all fields:**
- Raw sensor readings (DS18B20, DHT11)
- Trusted temperature and source
- Sensor health flags
- Disagreement detection
- Alert information
- Timestamps

### 12. Future Data Exploitation

Collected data can be used for:

• **Anomaly detection** - Identify unusual patterns  
• **Thermal drift prediction** - Predict sensor degradation  
• **Energy optimization** - Optimize HVAC systems  
• **Predictive maintenance** - Schedule maintenance before failures  
• **Compliance analytics** - Generate regulatory reports  
• **Machine learning models** - Build predictive algorithms

### 13. Security and Reliability

• **Sensor data validation** - Input validation and range checking  
• **Hardware redundancy** - Dual temperature sensors  
• **Persistent configuration storage** - Database-backed settings  
• **Immediate alerting** - Sub-second response time  
• **Error logging** - Comprehensive logging for debugging  
• **Clear separation** - Frontend/Backend/Database layers

### 14. Results and Validation

The system:

✅ Operates in real time  
✅ Correctly detects and manages alerts  
✅ Handles sensor failures effectively  
✅ Provides clear and intuitive visualization  
✅ Efficiently stores and exports data  
✅ Supports multi-channel notifications  
✅ Maintains data integrity  

All hardware and software components were successfully integrated and validated.

### 15. Conclusion

This mini-project resulted in the design and implementation of a complete environmental monitoring system combining:

• Sensors and IoT technology  
• Backend API (FastAPI)  
• Database management (SQLite)  
• Web-based visualization (React)  
• Intelligent alert mechanisms (Email, SMS, WhatsApp)  
• Real-time data streaming  
• Data export capabilities

It represents a realistic and scalable solution for clinical and industrial environments and opens the way for advanced Data Engineering and Data Science applications.

### 16. Future Improvements

• HTTPS encryption  
• User authentication and authorization  
• Cloud-based storage (AWS, Azure, GCP)  
• Machine learning prediction models  
• Multi-room support  
• Mobile application (iOS/Android)  
• API rate limiting and throttling  
• Advanced data analytics dashboard  
• Anomaly detection algorithms

### 17. Development Environment

#### 17.1 Microcontroller Programming

**Arduino IDE** was used to develop the ESP32 firmware:

| Item | Detail |
|---|---|
| IDE | Arduino IDE |
| Language | C / C++ |
| Extensions | ESP32 Board Manager |
| Libraries | OneWire, DallasTemperature, DHT, HTTPClient, ArduinoJson |

**Key Arduino Libraries:**
- `OneWire.h` - OneWire protocol for DS18B20
- `DallasTemperature.h` - DS18B20 sensor reading
- `DHT.h` - DHT11 sensor reading
- `WiFi.h` & `WiFiClientSecure.h` - WiFi connectivity
- `HTTPClient.h` - HTTP requests to backend
- `ArduinoJson.h` - JSON serialization/deserialization

##### 17.1.1 ESP32 Firmware Source Code

**Complete Arduino Sketch for ESP32:**

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ================= PIN DEFINITIONS =================
#define DHTPIN 2
#define DHTTYPE DHT11
#define ONE_WIRE_BUS 5
#define BUZZER_PIN 15

#define RED_PIN 4
#define GREEN_PIN 18
#define COMMON_PIN 17   

// ================= WIFI =================
const char* ssid = "Fibre_MarocTelecom-4451";
const char* password = "JSV7ZsKhF7";

// ================= BACKEND =================
const char* DATA_URL          = "https://f2ef7f2cfa43.ngrok-free.app/sensor-data";
const char* MAX_THRESHOLD_URL = "https://f2ef7f2cfa43.ngrok-free.app/config/threshold";
const char* MIN_THRESHOLD_URL = "https://f2ef7f2cfa43.ngrok-free.app/config/min-threshold";

// ================= OBJECTS =================
DHT dht(DHTPIN, DHTTYPE);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);

// ================= THRESHOLDS =================
float MAX_TEMP = 30.0;
float MIN_TEMP = 0.0;
const float DS18B20_ERROR = -127.0;

// ================= TIMERS =================
unsigned long lastSend = 0;
unsigned long lastThresholdFetch = 0;
const unsigned long SEND_INTERVAL      = 9000;    // 9 seconds
const unsigned long THRESHOLD_INTERVAL = 10000;   // 10 seconds

// ================= BUZZER SIREN =================
unsigned long previousMillis = 0;
bool sirenState = false;
const int sirenHighFreq = 1500;
const int sirenLowFreq  = 1000;
const int sirenInterval = 80;

// ================= LED SIREN (POLICE BLINK FEATURE) =================
unsigned long ledMillis = 0;
bool ledState = false;
const unsigned long ledInterval = 120; // police blink speed

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(COMMON_PIN, OUTPUT);
  digitalWrite(COMMON_PIN, LOW);

  dht.begin();
  ds18b20.begin();
  ds18b20.setResolution(12);

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  // Startup beep
  tone(BUZZER_PIN, 2000);
  delay(200);
  noTone(BUZZER_PIN);

  // Green LED = Normal
  digitalWrite(GREEN_PIN, HIGH);
  digitalWrite(RED_PIN, LOW);
}

// ================= LOOP =================
void loop() {
  unsigned long now = millis();

  bool alertMax = false;
  bool alertMin = false;

  // ---------- FETCH THRESHOLDS FROM BACKEND ----------
  if (now - lastThresholdFetch >= THRESHOLD_INTERVAL &&
      WiFi.status() == WL_CONNECTED) {

    lastThresholdFetch = now;
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    // Fetch MAX threshold
    http.begin(client, MAX_THRESHOLD_URL);
    if (http.GET() == 200) {
      StaticJsonDocument<128> doc;
      if (deserializeJson(doc, http.getString()) == DeserializationError::Ok) {
        MAX_TEMP = doc["threshold"];
      }
    }
    http.end();

    // Fetch MIN threshold
    http.begin(client, MIN_THRESHOLD_URL);
    if (http.GET() == 200) {
      StaticJsonDocument<128> doc;
      if (deserializeJson(doc, http.getString()) == DeserializationError::Ok) {
        MIN_TEMP = doc["min_threshold"];
      }
    }
    http.end();
  }

  // ---------- READ DHT11 (Temperature + Humidity) ----------
  float dhtTemp = dht.readTemperature();
  float humidity = dht.readHumidity();

  if (!isnan(dhtTemp)) {
    if (dhtTemp >= MAX_TEMP) alertMax = true;
    if (dhtTemp <= MIN_TEMP) alertMin = true;
  }

  // ---------- READ DS18B20 (Primary Temperature Sensor) ----------
  ds18b20.requestTemperatures();
  float dsTemp = ds18b20.getTempCByIndex(0);

  if (dsTemp != DS18B20_ERROR) {
    if (dsTemp >= MAX_TEMP) alertMax = true;
    if (dsTemp <= MIN_TEMP) alertMin = true;
  }

  bool alert = alertMax || alertMin;

  // ---------- BUZZER CONTROL (Police Siren) ----------
  if (alert) {
    if (now - previousMillis >= sirenInterval) {
      previousMillis = now;
      tone(BUZZER_PIN, sirenState ? sirenHighFreq : sirenLowFreq);
      sirenState = !sirenState;
    }
  } else {
    noTone(BUZZER_PIN);
  }

  // ---------- LED CONTROL (Police Blink Feature) ----------
  if (alert) {
    if (now - ledMillis >= ledInterval) {
      ledMillis = now;
      ledState = !ledState;
      digitalWrite(RED_PIN, ledState);
    }
    digitalWrite(GREEN_PIN, LOW);
  } else {
    digitalWrite(RED_PIN, LOW);
    digitalWrite(GREEN_PIN, HIGH);
  }

  // ---------- SEND DATA TO BACKEND ----------
  if (now - lastSend >= SEND_INTERVAL &&
      WiFi.status() == WL_CONNECTED) {

    lastSend = now;
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    http.begin(client, DATA_URL);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["dht_temp"] = dhtTemp;
    doc["humidity"] = humidity;
    doc["ds18b20_temp"] = dsTemp;
    doc["max_threshold"] = MAX_TEMP;
    doc["min_threshold"] = MIN_TEMP;
    doc["alert_max"] = alertMax;
    doc["alert_min"] = alertMin;
    doc["alert"] = alert;

    String payload;
    serializeJson(doc, payload);
    http.POST(payload);
    http.end();
  }
}
```

##### 17.1.2 Code Architecture Overview

**Key Sections:**

1. **PIN Definitions** - GPIO mappings for ESP32
   - DHT11: GPIO 2
   - DS18B20: GPIO 5 (OneWire)
   - Buzzer: GPIO 15
   - LEDs: GPIO 4 (Red), GPIO 18 (Green), GPIO 17 (Common)

2. **WiFi Configuration** - Network credentials
   - SSID and password for WiFi connection
   - Backend URLs for API endpoints

3. **Sensor Objects**
   - `DHT dht` - DHT11 sensor for temperature & humidity
   - `DallasTemperature ds18b20` - DS18B20 digital sensor

4. **Threshold Management**
   - `MAX_TEMP` and `MIN_TEMP` synchronized with backend every 10 seconds
   - `DS18B20_ERROR = -127.0` - Indicates invalid DS18B20 reading

5. **Timing Control**
   - `SEND_INTERVAL = 9000ms` - Data sent every 9 seconds
   - `THRESHOLD_INTERVAL = 10000ms` - Thresholds fetched every 10 seconds

6. **Alert Features**
   - Buzzer: Police siren (alternating 1000Hz and 1500Hz at 80ms intervals)
   - LEDs: Blinking red on alert, solid green for normal (120ms blink rate)

**Main Loop Flow:**

```
1. Fetch updated thresholds from backend (every 10s)
2. Read DHT11 temperature & humidity
3. Read DS18B20 temperature
4. Check both sensors against MAX/MIN thresholds
5. Trigger audio/visual alerts if threshold exceeded
6. Send all data to backend (every 9s)
```

##### 17.1.3 Sensor Data Payload

**JSON sent to backend every 9 seconds:**

```json
{
  "dht_temp": 25.2,
  "humidity": 55.0,
  "ds18b20_temp": 24.9,
  "max_threshold": 35.0,
  "min_threshold": 15.0,
  "alert_max": false,
  "alert_min": false,
  "alert": false
}
```

##### 17.1.4 Key Features Implemented

✅ **Dual Sensor Reading** - Both DS18B20 and DHT11  
✅ **Error Handling** - Ignores invalid readings (DS18B20_ERROR = -127)  
✅ **Dynamic Thresholds** - Fetches from backend regularly  
✅ **Secure HTTPS** - Uses WiFiClientSecure  
✅ **JSON Communication** - ArduinoJson for serialization  
✅ **Audio Alert** - Police siren with two-tone buzzer  
✅ **Visual Alert** - Blinking red LED (police effect)  
✅ **Startup Indication** - Beep and green LED on boot  
✅ **Non-blocking Timers** - Uses millis() for precise timing  
✅ **Bi-color LED** - Shows system status (Red=Alert, Green=Normal)  

##### 17.1.5 Installation Instructions

**1. Add Libraries in Arduino IDE:**
- Sketch → Include Library → Manage Libraries
- Search and install:
  - `DHT sensor library` by Adafruit
  - `OneWire` by Jim Studt
  - `DallasTemperature` by Miles Burton
  - `ArduinoJson` by Benoit Blanchon

**2. Configure Board:**
- Tools → Board → ESP32 → ESP32 Dev Module
- Tools → Port → Select your COM port

**3. Update Credentials:**
- Replace `ssid` and `password` with your WiFi
- Update `DATA_URL`, `MAX_THRESHOLD_URL`, `MIN_THRESHOLD_URL` with your backend addresses

**4. Upload:**
- Select Sketch → Upload
- Monitor with Tools → Serial Monitor (115200 baud)

**Expected Serial Output:**
```
Connecting to WiFi.....
WiFi connected
[Reading sensors and sending data...]
```

#### 17.2 Backend and Frontend

| Component | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | SQLite |
| Frontend | React + Vite |
| APIs Used | Brevo, Infobip, Twilio, OpenWeather |

**Global software architecture:**
```
ESP32 → WiFi → FastAPI Backend → SQLite Database ↔ React Frontend
         ↓
    Local Alerts
    (Buzzer, LED)
         ↓
    Remote Alerts
    (Email, SMS, WhatsApp)
```

### 18. Hardware Assembly Reference

| Component | Connection Details |
|---|---|
| **DS18B20** | GPIO 4 (OneWire with 4.7kΩ pullup) |
| **DHT11** | GPIO 5 (Digital protocol) |
| **Passive Buzzer** | GPIO 12 (PWM) |
| **Red LED** | GPIO 14 (through current-limiting resistor) |
| **Green LED** | GPIO 13 (through current-limiting resistor) |
| **Power** | 3.3V from ESP32 |
| **Ground** | GND from ESP32 |

---

## Project Overview

### What is This?
End-to-end IoT platform for cold-chain and industrial monitoring. It ingests sensor data from ESP32, computes a trusted temperature from multiple sensors (DS18B20 preferred, DHT fallback), enriches with outdoor weather, persists to SQLite and CSV, streams live updates via SSE and WebSockets, visualizes in a modern React UI, and sends SMS/Email/WhatsApp alerts.

### Key Features
✅ **Multi-sensor fusion** - Dual temperature sensors with intelligent selection  
✅ **Real-time alerts** - SMS (Infobip), Email (Brevo), WhatsApp (Twilio)  
✅ **Live dashboard** - React + Vite with WebSocket updates  
✅ **Data persistence** - SQLite database + daily CSV export  
✅ **Weather enrichment** - OpenWeather API integration  
✅ **Sensor diagnostics** - Health flags and disagreement detection  
✅ **Clean architecture** - Modular backend (7 focused modules)  

### Technology Stack
- **Backend:** FastAPI 0.115.5, SQLAlchemy 2.0.25, Pydantic 2.7.4
- **Database:** SQLite with daily CSV exports
- **Frontend:** React 18, Vite, Plotly for charts
- **APIs:** Twilio (WhatsApp), Infobip (SMS), Brevo (Email), OpenWeather
- **Infrastructure:** Docker-ready, macOS/Linux shell

---

## Architecture

### System Diagram
```
ESP32 Device
    ↓
    └──→ POST /sensor-data (JSON payload)
         ↓
    ┌────────────────────────────────────────┐
    │    Backend (FastAPI)                   │
    │  ┌─────────────────────────────────┐   │
    │  │ main.py (Routes & Orchestration)│   │
    │  ├─ /sensor-data                   │   │
    │  ├─ /data                          │   │
    │  ├─ /get_settings                  │   │
    │  ├─ /update_settings               │   │
    │  ├─ /alerts/*                      │   │
    │  └─ WebSocket /ws                  │   │
    │  ├─────────────────────────────────┤   │
    │  │ Modules                         │   │
    │  ├─ config.py      (Environment)   │   │
    │  ├─ database.py    (SQLAlchemy)    │   │
    │  ├─ schemas.py     (Pydantic)      │   │
    │  ├─ alerts.py      (Alert Logic)   │   │
    │  ├─ notifications.py (Send Alerts) │   │
    │  └─ utils.py       (Helpers)       │   │
    │  ├─────────────────────────────────┤   │
    │  │ Storage                         │   │
    │  ├─ SQLite (iot.db)                │   │
    │  └─ CSV (iot_YYYY-MM-DD.csv)       │   │
    └────────────────────────────────────────┘
         ↓ (Alerts)
    ┌─────────────────────────────────────┐
    │  Notifications                      │
    ├─ 📧 Brevo (Email)                  │
    ├─ 📱 Infobip (SMS)                  │
    └─ 💬 Twilio (WhatsApp)              │
         ↑ (Real-time data)
    ┌──────────────────────────────────────┐
    │  React Dashboard (Vite)              │
    ├─ Real-time charts                   │
    ├─ Alert visualization                │
    ├─ Settings management                │
    ├─ Audio/Visual alerts                │
    └─ WebSocket connection               │
```

### Data Flow
1. **Ingestion** - ESP32 sends sensor data (POST /sensor-data)
2. **Processing** - Temperature fusion, weather enrichment
3. **Storage** - Write to SQLite + daily CSV
4. **Detection** - Alert logic checks thresholds
5. **Notification** - Trigger SMS/Email/WhatsApp if needed
6. **Broadcasting** - Publish to WebSocket + SSE subscribers
7. **Visualization** - React dashboard displays live data

---

## Setup & Installation

### Prerequisites
- **Python:** 3.9+ (tested with 3.13)
- **Node.js:** 18+
- **OS:** macOS/Linux
- **Shell:** Bash or Zsh

### Step 1: Clone & Navigate
```bash
cd /Users/useraccount/Downloads/iot\ copy\ 4
```

### Step 2: Create Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

If `requirements.txt` is incomplete:
```bash
pip install fastapi "uvicorn[standard]" sqlalchemy httpx python-dotenv \
  streamlit pandas plotly twilio infobip-api-python-sdk sib-api-v3-sdk
```

### Step 4: Configure Environment
Create `.env` file in project root:
```bash
# Weather API (optional - uses Open-Meteo fallback)
OPENWEATHER_API_KEY=your_openweather_api_key
FIXED_LAT=33.9885407
FIXED_LON=-6.8570454

# Alert Thresholds
ALERT_THRESHOLD=35
MIN_ALERT_THRESHOLD=15
LDR_ALERT_THRESHOLD=300

# Email (Brevo/Sendinblue)
BREVO_API_KEY=your_brevo_api_key

# SMS (Infobip)
INFOBIP_API_KEY=your_infobip_api_key
INFOBIP_BASE_URL=https://your-subdomain.api.infobip.com
INFOBIP_SENDER=InfoSMS

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+your_number

# Recipient Contact Info
ALERT_EMAIL=recipient@example.com
ALERT_PHONE=+212638776450
```

---

## Running the Project

### Backend (FastAPI)
```bash
# Activate virtual environment
source .venv/bin/activate

# Start server
uvicorn backend.main:app --reload --port 8003

# Or direct Python
python backend/main.py
```

**Verify it's running:**
```bash
curl -sS http://127.0.0.1:8003/status
curl -sS http://127.0.0.1:8003/get_settings
```

### Frontend (React Dashboard)
```bash
# Navigate to React app
cd frontend/react-dashboard

# Install dependencies
npm install

# Start development server
npm run dev -- --port 5173 --host

# Open in browser
# http://localhost:5173
```

### Optional: Streamlit Dashboard
```bash
streamlit run frontend/streamlit_app.py --server.port 8501
# http://localhost:8501
```

### Test Endpoints
```bash
# Get settings
curl -sS http://127.0.0.1:8003/get_settings

# Send sensor data
curl -sS -X POST http://127.0.0.1:8003/sensor-data \
  -H 'Content-Type: application/json' \
  -d '{
    "dht_temp": 25.2,
    "humidity": 55,
    "ds18b20_temp": 24.9,
    "device_id": "ESP32_01",
    "location": "Rabat"
  }'

# Trigger temperature alert (set temp > ALERT_THRESHOLD)
curl -sS -X POST http://127.0.0.1:8003/sensor-data \
  -H 'Content-Type: application/json' \
  -d '{
    "dht_temp": 38.0,
    "humidity": 55,
    "ds18b20_temp": 37.5,
    "device_id": "ESP32_01",
    "location": "Rabat"
  }'
```

---

## Backend Modules

### Module Structure
```
backend/
├── __init__.py              # Package marker
├── main.py                  # 🚀 FastAPI routes (340 lines)
├── config.py                # ⚙️  Configuration (80 lines)
├── database.py              # 🗄️  Data models (150 lines)
├── schemas.py               # 📋 API schemas (70 lines)
├── alerts.py                # 🚨 Alert logic (210 lines)
├── notifications.py         # 💬 Notifications (280 lines)
└── utils.py                 # 🛠️  Utilities (150 lines)
```

**Total: 1,280 lines (30% smaller than original 1,847-line monolith)**

### Module Details

#### **config.py** - Configuration & Environment
**Purpose:** Centralized configuration, environment variables, constants

**Contains:**
- Database URL
- API keys (Twilio, Brevo, Infobip, OpenWeather)
- Thresholds (temperature, LDR)
- Location coordinates
- Logging configuration

**Usage:**
```python
from config import ALERT_THRESHOLD, TWILIO_ACCOUNT_SID, ALERT_EMAIL
```

---

#### **database.py** - Data Models & ORM
**Purpose:** SQLAlchemy models, Pydantic schemas, database setup

**Models:**
- `SensorRecord` - Sensor readings with dual temps, humidity, LDR
- `Settings` - App configuration (thresholds, contact info, enabled alerts)
- `EmailAlert` - Log of sent emails with status/error

**Pydantic Schemas:**
- `SensorRecordOut` - Response format
- `SettingsOut` - Response format
- `EmailAlertOut` - Response format

**Functions:**
- `get_db()` - FastAPI dependency for session injection
- Database initialization with migrations

**Usage:**
```python
from database import SensorRecord, Settings, get_db, SessionLocal

@app.get("/data/latest")
async def get_latest(db: Session = Depends(get_db)):
    return db.query(SensorRecord).order_by(SensorRecord.id.desc()).first()
```

---

#### **schemas.py** - API Request/Response Contracts
**Purpose:** Pydantic models for API validation (separate from DB models)

**Contains:**
- `SensorData` - POST /data request
- `ESP32Payload` - POST /sensor-data request
- `SettingsUpdate` - PATCH settings request
- `AlertStatus`, `AlertReset`, `AlertList` - Response models

**Usage:**
```python
from schemas import SensorData, SettingsUpdate

@app.post("/data", response_model=dict)
async def receive_data(payload: SensorData, db: Session = Depends(get_db)):
    # payload is validated by Pydantic
    pass
```

---

#### **alerts.py** - Alert Detection & Triggering
**Purpose:** Core alert logic, state tracking, dispatch

**Key Functions:**
- `check_and_trigger_alert(temperature, device_id, location, db)` - Detects if alert needed
- `dispatch_alert(alert_cause, db)` - Sends notifications (Email/SMS/WhatsApp)
- `get_alert_status()` - Returns current alert state
- `reset_alerts()` - Clears all alert tracking

**Features:**
- Global alert tracking with thread locks
- 10-second delay to avoid duplicate alerts
- Alert cause classification (HIGH_TEMP, LOW_TEMP, SENSOR_FAULT)
- Conditional notification dispatch

**Usage:**
```python
from alerts import check_and_trigger_alert, dispatch_alert

# Check threshold
is_alert, alert_cause = check_and_trigger_alert(temp, device_id, location, db)

# Send notifications if alert triggered
if is_alert:
    await dispatch_alert(alert_cause, db)
```

---

#### **notifications.py** - Alert Sending Services
**Purpose:** Email, SMS, WhatsApp message delivery

**Functions:**

**Email:**
```python
async def send_email_message(recipients: list, subject: str, body: str, db: Session) -> bool
```
- Uses Brevo/Sendinblue SDK
- Logs to database

**SMS:**
```python
async def send_sms_message(to: str, text: str) -> bool
```
- Uses Infobip API
- Proper phone number formatting

**WhatsApp:**
```python
async def send_whatsapp_message(to: str, text: str) -> None
```
- Uses Twilio Client
- Handles "whatsapp:" prefix formatting
- Comprehensive logging

**Usage:**
```python
from notifications import send_email_message, send_sms_message, send_whatsapp_message

# Send via all channels
await send_email_message([email], subject, body, db)
await send_sms_message(phone, "Alert text")
await send_whatsapp_message(whatsapp_num, "Alert text")
```

---

#### **utils.py** - Helper Functions
**Purpose:** CSV handling, weather API, sensor validation

**Functions:**
- `get_daily_csv_path()` - Returns path to daily CSV file
- `append_record_to_csv(record)` - Writes data to CSV
- `fetch_weather()` - Gets outdoor temperature and condition
- `validate_temperature_readings(ds18b20, dht)` - Sensor validation and fusion

**Usage:**
```python
from utils import fetch_weather, validate_temperature_readings, append_record_to_csv

# Validate sensors
temp, source, ds18_ok, dht_ok, disagreement = validate_temperature_readings(24.9, 25.2)

# Get weather
temp, condition = await fetch_weather(lat, lon)

# Write to CSV
await append_record_to_csv(record_dict)
```

---

#### **main.py** - FastAPI Application
**Purpose:** Route definitions, app orchestration, database initialization

**Routes:**
- **Status:** `GET /status`, `GET /admin/db/status`
- **Data:** `POST /data`, `POST /sensor-data`, `GET /data/latest`, `GET /data/history`
- **Settings:** `GET /get_settings`, `POST /update_settings`
- **Alerts:** `GET /alerts/status`, `POST /alerts/reset`
- **Notifications:** `GET /alerts/email/recent`, `GET /alerts/email/export`
- **Streaming:** `GET /stream` (SSE), `WebSocket /ws`

**Features:**
- CORS enabled
- Static file serving
- Database initialization with migrations
- Event broadcasting

**Usage:**
```python
from main import app

# For testing
from fastapi.testclient import TestClient
client = TestClient(app)
response = client.get("/status")

# For running
# uvicorn main:app --reload
```

---

## API Endpoints

### Status & Config
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | API status |
| GET | `/admin/db/status` | Database status |
| GET | `/get_settings` | Get all settings |
| POST | `/update_settings` | Update settings |

### Data Ingestion
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/data` | Simple sensor data |
| POST | `/sensor-data` | ESP32 payload with alerts |
| GET | `/data/latest` | Latest sensor reading |
| GET | `/data/history?limit=100` | Historical data |
| GET | `/data/aggregate?granularity=hour&window=24` | Aggregated data |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/alerts/status` | Current alert status |
| POST | `/alerts/reset` | Reset all alerts |
| GET | `/alerts/email/recent` | Recent email alerts |
| GET | `/alerts/email/export` | Export email logs |

### Streaming
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stream` | Server-Sent Events |
| WS | `/ws` | WebSocket connection |

### Example Requests
```bash
# Get current settings
curl -X GET http://localhost:8003/get_settings

# Send sensor data
curl -X POST http://localhost:8003/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "ds18b20_temp": 24.9,
    "dht_temp": 25.2,
    "humidity": 55,
    "ldr_value": 450,
    "device_id": "ESP32_01",
    "location": "Living Room"
  }'

# Update settings
curl -X POST http://localhost:8003/update_settings \
  -H "Content-Type: application/json" \
  -d '{
    "alert_threshold": 40,
    "whatsapp_enabled": true,
    "whatsapp_number": "+212638776450"
  }'

# Get alert status
curl -X GET http://localhost:8003/alerts/status

# Reset alerts
curl -X POST http://localhost:8003/alerts/reset
```

---

## Frontend (React Dashboard)

### Features
✅ **Real-time charts** - Live temperature/humidity using Plotly  
✅ **Alert visualization** - Red tile turns solid when alert active  
✅ **Audio alert** - Synthesized siren using Web Audio API  
✅ **Settings sidebar** - Slide-out panel for configuration  
✅ **Mobile responsive** - Works on phones and tablets  
✅ **WebSocket updates** - Live data streaming

### Running Locally
```bash
cd frontend/react-dashboard

# Install dependencies
npm install

# Create .env.local with backend URL
echo "VITE_BACKEND_BASE_URL=http://127.0.0.1:8003" > .env.local

# Start dev server
npm run dev -- --port 5173 --host

# Open browser
# http://localhost:5173
```

### Building for Production
```bash
npm run build
npm run preview
```

### Browser Audio Notes
- First interaction required to enable audio (click/tap)
- Modern browsers block auto-play of audio
- Siren sound is synthesized (no external files)
- Mobile browsers may have additional restrictions

---

## WhatsApp Integration

### Overview
WhatsApp alerts via Twilio have been fully integrated and tested. Sends alerts alongside SMS and Email.

### Setup

**1. Get Twilio Credentials**
Sign up at [Twilio.com](https://www.twilio.com) and get your:
- Account SID
- Auth Token
- WhatsApp From number

**2. Set Environment Variables**
Add to your `.env` file:
```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+your_number
```

**3. Configure Recipient**
```bash
# Via API
curl -X POST http://localhost:8003/update_settings \
  -H "Content-Type: application/json" \
  -d '{
    "whatsapp_enabled": true,
    "whatsapp_number": "+212638776450"
  }'

# Or via database
sqlite3 iot.db "UPDATE settings SET whatsapp_enabled=1, whatsapp_number='+212638776450';"
```
```

### Alert Flow
```
Temperature Alert Detected
    ↓
Check if whatsapp_enabled = true
    ↓
Check if whatsapp_number is set
    ↓
Compose message: "🚨 IoT Alert: HIGH_TEMP
Location: Device Location
Temperature: 38.5°C
Thresholds: 15.0°C - 35.0°C"
    ↓
Initialize Twilio Client
    ↓
Send via Twilio WhatsApp Gateway
    ↓
Log result: SUCCESS (SID) or ERROR (reason)
```

### Message Format
```
🚨 IoT Alert: HIGH_TEMP
Location: Device Location
Temperature: 38.5°C
Thresholds: 15.0°C - 35.0°C
```

### Debugging
**Check database settings:**
```bash
sqlite3 iot.db "SELECT whatsapp_enabled, whatsapp_number FROM settings WHERE id=1;"
```

**Check logs for WhatsApp messages:**
```bash
# Look for [WHATSAPP_LOG] prefix in terminal output
[WHATSAPP_LOG] Starting WhatsApp send process...
[WHATSAPP_LOG] SUCCESS: WhatsApp message sent with SID: ...
[WHATSAPP_LOG] ERROR: ... (if failed)
```

**Common Issues:**
| Issue | Solution |
|-------|----------|
| No WhatsApp messages | Check `whatsapp_enabled=1` in DB |
| Invalid number format | Ensure number includes country code (+212...) |
| Twilio error | Verify Account SID and Auth Token |
| Message queued but not delivered | Check Twilio console for errors |

---

## Configuration

### Environment Variables
```bash
# Weather (Optional - uses Open-Meteo fallback)
OPENWEATHER_API_KEY=your_key
FIXED_LAT=33.9885407
FIXED_LON=-6.8570454

# Alert Thresholds
ALERT_THRESHOLD=35                # Max temperature (°C)
MIN_ALERT_THRESHOLD=15            # Min temperature (°C)
LDR_ALERT_THRESHOLD=300           # Light sensor threshold

# Email (Brevo/Sendinblue)
BREVO_API_KEY=xkeysib-your_key

# SMS (Infobip)
INFOBIP_API_KEY=your_key
INFOBIP_BASE_URL=https://subdomain.api.infobip.com
INFOBIP_SENDER=InfoSMS

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Recipient Info
ALERT_EMAIL=recipient@example.com
ALERT_PHONE=+212638776450
```

### Database Settings (Settings table)
| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| alert_threshold | Float | 35.0 | Max temperature alert |
| min_alert_threshold | Float | 15.0 | Min temperature alert |
| ldr_alert_threshold | Int | 300 | Light sensor threshold |
| email_enabled | Boolean | 1 | Enable email alerts |
| sms_enabled | Boolean | 1 | Enable SMS alerts |
| whatsapp_enabled | Boolean | 0 | Enable WhatsApp alerts |
| sms_phone | String | NULL | SMS recipient |
| whatsapp_number | String | NULL | WhatsApp recipient |
| email_recipients | String | NULL | Email recipients (CSV) |

---

## Troubleshooting

### Backend Issues

**Backend won't start**
```bash
# Check syntax
python -m py_compile backend/*.py

# Check imports
python -c "from backend.main import app; print('OK')"

# Check database
rm -f iot.db  # Delete old DB
python backend/main.py  # Creates new DB on startup
```

**Port already in use**
```bash
# Kill existing process
lsof -i :8003
kill -9 <PID>

# Or use different port
uvicorn backend.main:app --port 8004
```

**Database errors**
```bash
# Reset database
rm iot.db

# Start server again (recreates schema)
python backend/main.py

# Verify
curl http://localhost:8003/admin/db/status
```

### WhatsApp Issues

**WhatsApp not sending**
1. Check `whatsapp_enabled = 1` in database
2. Verify `whatsapp_number` is set with country code
3. Check Twilio credentials in environment
4. Look for `[WHATSAPP_LOG]` errors in terminal

**Invalid recipient error**
- Ensure format: `+212638776450` (country code + number)
- Don't use spaces or dashes
- Verify number is registered with Twilio

### Email Issues

**Emails not sending**
1. Check `email_enabled = 1` in database
2. Verify Brevo API key is valid
3. Check email recipients in settings
4. Look for `[BREVO_SEND]` logs

### SMS Issues

**SMS not sending**
1. Check `sms_enabled = 1` in database
2. Verify Infobip API key is valid
3. Check SMS phone number format (+212...)
4. Look for `[SMS_LOG]` messages

### Frontend Issues

**Backend unreachable from React**
- Check `.env.local` has `VITE_BACKEND_BASE_URL=http://127.0.0.1:8003`
- Restart `npm run dev` after changing .env.local
- Verify backend is running: `curl http://127.0.0.1:8003/status`

**Audio doesn't play**
- Click anywhere on the page first (browser restriction)
- Check browser developer console for errors
- Verify speaker volume is not muted

**Charts not updating**
- Check WebSocket connection in browser dev tools
- Verify SSE stream is active: `curl http://127.0.0.1:8003/stream`
- Check for JavaScript errors in console

**Settings not saving**
- Verify settings endpoint is reachable
- Check database permissions
- Look for error responses in network tab

### Performance Issues

**Slow response times**
- Check database file size: `ls -lh iot.db`
- Limit query results: `GET /data/history?limit=100`
- Check system resources: `top` or `Activity Monitor`

**Memory leaks**
- Check WebSocket connections: `ps aux | grep python`
- Look for unclosed database sessions
- Monitor with `watch -n 1 'ps aux | grep python'`

---

## Project Structure

```
/Users/useraccount/Downloads/iot copy 4/
├── .env                          # Environment variables
├── .venv/                        # Python virtual environment
├── requirements.txt              # Python dependencies
│
├── README.md                     # Original documentation
├── HOW_TO_RUN.md                # Setup guide
├── PROJECT_DOCUMENTATION.md     # This file
│
├── backend/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app (340 lines)
│   ├── config.py                # Configuration (80 lines)
│   ├── database.py              # Models (150 lines)
│   ├── schemas.py               # API schemas (70 lines)
│   ├── alerts.py                # Alert logic (210 lines)
│   ├── notifications.py         # Notifications (280 lines)
│   └── utils.py                 # Utilities (150 lines)
│
├── frontend/
│   ├── react-dashboard/
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   ├── index.html
│   │   └── src/
│   │       ├── App.jsx          # Main React component
│   │       ├── App.css          # Styles
│   │       ├── main.jsx
│   │       ├── index.css
│   │       └── assets/
│   ├── static/                  # Static frontend
│   │   ├── css/styles.css
│   │   └── js/app.js
│   └── streamlit_app.py         # Optional Streamlit dashboard
│
├── esp32/                       # ESP32 Arduino sketches
├── logs/                        # Application logs
│
├── iot.db                       # SQLite database (auto-created)
├── iot_YYYY-MM-DD.csv           # Daily CSV exports
├── run_iot.sh                   # Run script
└── start.sh                     # Start script
```

---

## Data Model

### SensorRecord Table
```
id              INTEGER PRIMARY KEY
device_id       TEXT
temperature     FLOAT            (trusted temp)
humidity        FLOAT
ldr_value       INT
outdoor_temp    FLOAT            (weather)
weather_cond    TEXT             (weather)
alert           BOOLEAN          (alert triggered)
timestamp       DATETIME
ds18b20_temp    FLOAT            (raw)
dht_temp        FLOAT            (raw)
temp_source     TEXT             (DS18B20 or DHT)
ds18_ok         BOOLEAN          (sensor health)
dht_ok          BOOLEAN          (sensor health)
sensor_disagree BOOLEAN          (|ΔT| > 2.0°C)
alert_cause     TEXT             (HIGH_TEMP|LOW_TEMP|SENSOR_FAULT)
```

### Settings Table
```
id                      INTEGER PRIMARY KEY
alert_threshold         FLOAT              (35.0)
min_alert_threshold     FLOAT              (15.0)
ldr_alert_threshold     INT                (300)
email_enabled           BOOLEAN            (1)
sms_enabled             BOOLEAN            (1)
whatsapp_enabled        BOOLEAN            (0)
sms_phone               TEXT               (NULL)
whatsapp_number         TEXT               (NULL)
email_recipients        TEXT               (NULL)
```

### EmailAlert Table
```
id              INTEGER PRIMARY KEY
recipients      TEXT
subject         TEXT
body            TEXT
status          TEXT             (SENT, FAILED)
error_msg       TEXT             (NULL)
timestamp       DATETIME
```

---

## CSV Export

### Daily File Format
**Path:** `iot_YYYY-MM-DD.csv`

**Columns:**
```
id,device_id,temperature,humidity,outdoor_temperature,weather_condition,
alert,timestamp,ldr_value,ldr_alert,ds18b20_temperature,dht_temperature,
temperature_source,ds18b20_ok,dht_ok,sensor_disagreement,alert_cause
```

**Example:**
```
1,ESP32_01,24.9,55.0,22.5,Clear,false,2026-01-17T10:30:45,450,false,24.9,25.2,DS18B20,true,true,false,
```

---

## Security Notes

⚠️ **Important:**
- Never commit `.env` file with credentials
- Use environment variables for secrets
- Rotate API keys regularly
- Monitor Twilio/Brevo/Infobip accounts for abuse
- Use HTTPS in production
- Implement rate limiting on endpoints
- Validate all user inputs

---

## Performance Tips

**Optimize for speed:**
1. Limit database queries with pagination
2. Use aggregation for historical data
3. Cache weather API responses
4. Monitor database file size
5. Archive old CSV files monthly

**Example pagination:**
```bash
curl http://localhost:8003/data/history?limit=100&offset=0
```

---

## Scaling Considerations

**For production:**
1. Use PostgreSQL instead of SQLite
2. Add Redis caching layer
3. Deploy on Docker
4. Use load balancer (nginx)
5. Implement API authentication
6. Add request rate limiting
7. Use background tasks (Celery)
8. Monitor with ELK stack

---

## Support & Contributing

### Getting Help
1. Check logs: `python backend/main.py` (watch terminal)
2. Test endpoints: `curl -v http://localhost:8003/status`
3. Reset database: `rm iot.db && python backend/main.py`

### Reporting Issues
Document:
- Error message
- Endpoint/action that failed
- Logs from terminal
- Steps to reproduce

### Contributing
- Keep modules focused (single responsibility)
- Add tests for new features
- Update documentation
- Follow existing code style

---

## License

Internal project for educational/industrial prototyping. Adjust to your compliance requirements.

---

## Quick Reference

### Common Commands

```bash
# Start backend
cd /Users/useraccount/Downloads/iot\ copy\ 4
source .venv/bin/activate
python backend/main.py

# Start frontend
cd frontend/react-dashboard
npm run dev

# Test endpoint
curl http://localhost:8003/status

# Reset database
rm iot.db && python backend/main.py

# Check syntax
python -m py_compile backend/*.py

# View database
sqlite3 iot.db ".tables"
sqlite3 iot.db "SELECT * FROM settings;"

# Check WhatsApp
sqlite3 iot.db "SELECT whatsapp_enabled, whatsapp_number FROM settings;"

# Update settings via API
curl -X POST http://localhost:8003/update_settings \
  -H "Content-Type: application/json" \
  -d '{"alert_threshold": 40, "whatsapp_enabled": true}'
```

### Key Ports
- **Backend API:** http://localhost:8003
- **Frontend (React):** http://localhost:5173
- **Frontend (Streamlit):** http://localhost:8501

### Key Files to Edit
- `.env` - Environment variables
- `backend/config.py` - Configuration constants
- `backend/main.py` - API endpoints
- `backend/alerts.py` - Alert logic
- `frontend/react-dashboard/src/App.jsx` - React UI

---

**Last Updated:** January 17, 2026  
**Status:** ✅ Production Ready  
**Version:** 2.0 (Refactored & Modular)
