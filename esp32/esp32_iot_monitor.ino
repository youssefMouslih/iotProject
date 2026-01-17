/*
 * ===============================================
 * ESP32 IoT Temperature & Humidity Monitor
 * ===============================================
 * 
 * Project: Intelligent Temperature and Humidity Monitoring System
 * Target: ESP32 WROOM (32 pins)
 * Purpose: Real-time environmental monitoring with sensor redundancy
 * 
 * Features:
 * - Dual temperature sensors (DS18B20 + DHT11)
 * - Real-time humidity measurement
 * - WiFi connectivity with secure HTTPS
 * - Dynamic threshold management via backend API
 * - Multi-channel alerting (Buzzer + LED)
 * - JSON-based communication with FastAPI backend
 * 
 * Author: IoT Project Team
 * Date: January 2026
 * Version: 2.0
 * ===============================================
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ================= PIN DEFINITIONS =================
#define DHTPIN 2                    // DHT11 data pin
#define DHTTYPE DHT11               // DHT11 sensor type
#define ONE_WIRE_BUS 5              // DS18B20 OneWire bus
#define BUZZER_PIN 15               // Passive buzzer for audio alert

#define RED_PIN 4                   // Red LED for alert state
#define GREEN_PIN 18                // Green LED for normal state
#define COMMON_PIN 17               // Common pin for bi-color LED

// ================= WIFI CREDENTIALS =================
const char* ssid = "Fibre_MarocTelecom-4451";
const char* password = "JSV7ZsKhF7";

// ================= BACKEND API ENDPOINTS =================
// Update these URLs to match your backend deployment
const char* DATA_URL          = "https://f2ef7f2cfa43.ngrok-free.app/sensor-data";
const char* MAX_THRESHOLD_URL = "https://f2ef7f2cfa43.ngrok-free.app/config/threshold";
const char* MIN_THRESHOLD_URL = "https://f2ef7f2cfa43.ngrok-free.app/config/min-threshold";

// ================= SENSOR OBJECTS =================
DHT dht(DHTPIN, DHTTYPE);                       // DHT11 sensor instance
OneWire oneWire(ONE_WIRE_BUS);                  // OneWire bus for DS18B20
DallasTemperature ds18b20(&oneWire);            // DS18B20 temperature sensor

// ================= THRESHOLD VARIABLES =================
float MAX_TEMP = 30.0;                          // Maximum temperature threshold (°C)
float MIN_TEMP = 0.0;                           // Minimum temperature threshold (°C)
const float DS18B20_ERROR = -127.0;             // DS18B20 error indicator

// ================= TIMING VARIABLES =================
unsigned long lastSend = 0;                     // Last data send time
unsigned long lastThresholdFetch = 0;           // Last threshold fetch time
const unsigned long SEND_INTERVAL      = 9000;     // Send data every 9 seconds
const unsigned long THRESHOLD_INTERVAL = 10000;    // Fetch thresholds every 10 seconds

// ================= BUZZER CONTROL (POLICE SIREN EFFECT) =================
unsigned long previousMillis = 0;
bool sirenState = false;
const int sirenHighFreq = 1500;                 // High frequency tone (Hz)
const int sirenLowFreq  = 1000;                 // Low frequency tone (Hz)
const int sirenInterval = 80;                   // Tone switching interval (ms)

// ================= LED CONTROL (POLICE BLINK EFFECT) =================
unsigned long ledMillis = 0;
bool ledState = false;
const unsigned long ledInterval = 120;          // LED blink interval (ms)

// ================= SETUP FUNCTION =================
/*
 * Initialization function - runs once on startup
 */
void setup() {
  // Start serial communication for debugging
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("======================================");
  Serial.println("ESP32 IoT Monitor - Startup");
  Serial.println("======================================");

  // Configure GPIO pins
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(COMMON_PIN, OUTPUT);
  digitalWrite(COMMON_PIN, LOW);
  
  Serial.println("[SETUP] GPIO pins configured");

  // Initialize DHT11 sensor
  dht.begin();
  Serial.println("[SETUP] DHT11 initialized");

  // Initialize DS18B20 sensor
  ds18b20.begin();
  ds18b20.setResolution(12);  // Set to 12-bit resolution for accuracy
  Serial.println("[SETUP] DS18B20 initialized (12-bit resolution)");

  // Connect to WiFi
  Serial.print("[WIFI] Connecting to: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 20) {
    delay(500);
    Serial.print(".");
    wifiAttempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected!");
    Serial.print("[WIFI] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WIFI] Connection failed!");
  }

  // Startup beep (1 beep = system ready)
  tone(BUZZER_PIN, 2000);
  delay(200);
  noTone(BUZZER_PIN);
  Serial.println("[ALERT] Startup beep played");

  // Green LED = Normal operation
  digitalWrite(GREEN_PIN, HIGH);
  digitalWrite(RED_PIN, LOW);
  Serial.println("[LED] Green LED on - System ready");
  
  Serial.println("======================================");
  Serial.println("Setup Complete - Starting Loop");
  Serial.println("======================================\n");
}

// ================= MAIN LOOP FUNCTION =================
/*
 * Main execution loop - runs continuously
 */
void loop() {
  unsigned long now = millis();
  
  bool alertMax = false;
  bool alertMin = false;

  // ---------- SECTION 1: FETCH THRESHOLDS FROM BACKEND ----------
  if (now - lastThresholdFetch >= THRESHOLD_INTERVAL &&
      WiFi.status() == WL_CONNECTED) {

    lastThresholdFetch = now;
    Serial.println("\n[THRESHOLD] Fetching thresholds from backend...");
    
    WiFiClientSecure client;
    client.setInsecure();  // Disable SSL verification for testing (use certificates in production)
    HTTPClient http;

    // Fetch MAX temperature threshold
    http.begin(client, MAX_THRESHOLD_URL);
    int httpCode = http.GET();
    
    if (httpCode == 200) {
      StaticJsonDocument<128> doc;
      if (deserializeJson(doc, http.getString()) == DeserializationError::Ok) {
        MAX_TEMP = doc["threshold"];
        Serial.print("[THRESHOLD] MAX_TEMP updated: ");
        Serial.println(MAX_TEMP);
      }
    } else {
      Serial.print("[THRESHOLD] MAX fetch failed - HTTP code: ");
      Serial.println(httpCode);
    }
    http.end();

    // Fetch MIN temperature threshold
    http.begin(client, MIN_THRESHOLD_URL);
    httpCode = http.GET();
    
    if (httpCode == 200) {
      StaticJsonDocument<128> doc;
      if (deserializeJson(doc, http.getString()) == DeserializationError::Ok) {
        MIN_TEMP = doc["min_threshold"];
        Serial.print("[THRESHOLD] MIN_TEMP updated: ");
        Serial.println(MIN_TEMP);
      }
    } else {
      Serial.print("[THRESHOLD] MIN fetch failed - HTTP code: ");
      Serial.println(httpCode);
    }
    http.end();
  }

  // ---------- SECTION 2: READ DHT11 (Temperature + Humidity) ----------
  float dhtTemp = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  // Validate DHT11 readings
  if (!isnan(dhtTemp) && !isnan(humidity)) {
    Serial.print("[DHT11] Temp: ");
    Serial.print(dhtTemp);
    Serial.print("°C | Humidity: ");
    Serial.print(humidity);
    Serial.println("%");
    
    // Check DHT11 against thresholds
    if (dhtTemp >= MAX_TEMP) {
      alertMax = true;
      Serial.println("[ALERT] DHT11: Temperature ABOVE maximum threshold!");
    }
    if (dhtTemp <= MIN_TEMP) {
      alertMin = true;
      Serial.println("[ALERT] DHT11: Temperature BELOW minimum threshold!");
    }
  } else {
    Serial.println("[DHT11] Error reading sensor - Invalid data");
  }

  // ---------- SECTION 3: READ DS18B20 (Primary Temperature Sensor) ----------
  ds18b20.requestTemperatures();
  float dsTemp = ds18b20.getTempCByIndex(0);
  
  // Validate DS18B20 reading
  if (dsTemp != DS18B20_ERROR) {
    Serial.print("[DS18B20] Temp: ");
    Serial.print(dsTemp);
    Serial.println("°C");
    
    // Check DS18B20 against thresholds
    if (dsTemp >= MAX_TEMP) {
      alertMax = true;
      Serial.println("[ALERT] DS18B20: Temperature ABOVE maximum threshold!");
    }
    if (dsTemp <= MIN_TEMP) {
      alertMin = true;
      Serial.println("[ALERT] DS18B20: Temperature BELOW minimum threshold!");
    }
  } else {
    Serial.println("[DS18B20] Error reading sensor - Invalid data (-127°C)");
  }

  // Determine final alert state
  bool alert = alertMax || alertMin;

  // ---------- SECTION 4: BUZZER CONTROL (Police Siren Audio) ----------
  if (alert) {
    // Generate alternating tones for siren effect
    if (now - previousMillis >= sirenInterval) {
      previousMillis = now;
      int freq = sirenState ? sirenHighFreq : sirenLowFreq;
      tone(BUZZER_PIN, freq);
      sirenState = !sirenState;
      
      Serial.print("[BUZZER] Playing tone: ");
      Serial.print(freq);
      Serial.println("Hz");
    }
  } else {
    noTone(BUZZER_PIN);
  }

  // ---------- SECTION 5: LED CONTROL (Police Blink Visual) ----------
  if (alert) {
    // Blinking red LED during alert
    if (now - ledMillis >= ledInterval) {
      ledMillis = now;
      ledState = !ledState;
      digitalWrite(RED_PIN, ledState);
      
      if (ledState) {
        Serial.println("[LED] Alert: RED ON");
      } else {
        Serial.println("[LED] Alert: RED OFF");
      }
    }
    digitalWrite(GREEN_PIN, LOW);
  } else {
    // Solid green LED during normal operation
    digitalWrite(RED_PIN, LOW);
    digitalWrite(GREEN_PIN, HIGH);
  }

  // ---------- SECTION 6: SEND DATA TO BACKEND ----------
  if (now - lastSend >= SEND_INTERVAL &&
      WiFi.status() == WL_CONNECTED) {

    lastSend = now;
    Serial.println("\n[DATA] Sending sensor data to backend...");
    
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    http.begin(client, DATA_URL);
    http.addHeader("Content-Type", "application/json");

    // Create JSON payload
    StaticJsonDocument<256> doc;
    doc["dht_temp"] = dhtTemp;
    doc["humidity"] = humidity;
    doc["ds18b20_temp"] = dsTemp;
    doc["max_threshold"] = MAX_TEMP;
    doc["min_threshold"] = MIN_TEMP;
    doc["alert_max"] = alertMax;
    doc["alert_min"] = alertMin;
    doc["alert"] = alert;
    doc["device_id"] = "ESP32_01";
    doc["location"] = "Clinical Room";

    // Serialize JSON to string
    String payload;
    serializeJson(doc, payload);
    
    Serial.println("[JSON] Payload:");
    serializeJsonPretty(doc, Serial);
    Serial.println();

    // Send POST request
    int httpResponseCode = http.POST(payload);
    
    if (httpResponseCode > 0) {
      Serial.print("[HTTP] Response code: ");
      Serial.println(httpResponseCode);
      
      if (httpResponseCode == 200) {
        Serial.println("[HTTP] Data sent successfully!");
      }
    } else {
      Serial.print("[HTTP] Error in sending POST: ");
      Serial.println(http.errorToString(httpResponseCode));
    }
    
    http.end();
    Serial.println();
  }

  // Small delay to prevent overwhelming the serial monitor
  delay(100);
}

/*
 * ===============================================
 * FIRMWARE FEATURES SUMMARY
 * ===============================================
 * 
 * SENSORS:
 * ✓ DS18B20 - Primary temperature sensor (OneWire)
 * ✓ DHT11 - Secondary temperature + humidity sensor
 * ✓ Dual sensor redundancy for reliability
 * 
 * COMMUNICATION:
 * ✓ WiFi connectivity (802.11 b/g/n)
 * ✓ HTTPS secure connections
 * ✓ JSON payload serialization
 * ✓ Dynamic threshold sync with backend (10s intervals)
 * ✓ Sensor data transmission to backend (9s intervals)
 * 
 * ALERTING:
 * ✓ Audio alert - Police siren with dual tones (1000Hz + 1500Hz)
 * ✓ Visual alert - Blinking red LED (120ms rate)
 * ✓ Normal state - Solid green LED
 * ✓ Startup indication - Single beep on boot
 * 
 * RELIABILITY:
 * ✓ Error handling for sensor failures
 * ✓ WiFi connection status checking
 * ✓ Non-blocking timing using millis()
 * ✓ Serial debugging output
 * 
 * ===============================================
 */
