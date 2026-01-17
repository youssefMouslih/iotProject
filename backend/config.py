"""Configuration and environment variables for the IoT backend."""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))
STATIC_DIR = os.path.join(FRONTEND_DIR, "static")
INDEX_HTML = os.path.join(FRONTEND_DIR, "index.html")

# Database configuration
DATABASE_URL = "sqlite:///" + os.path.abspath(os.path.join(BASE_DIR, "..", "iot.db"))

# Alert configuration
ALERT_THRESHOLD = float(os.getenv("ALERT_THRESHOLD", "35"))
MIN_ALERT_THRESHOLD = float(os.getenv("MIN_ALERT_THRESHOLD", "15"))
LDR_ALERT_THRESHOLD = float(os.getenv("LDR_ALERT_THRESHOLD", "300"))
ALERT_EMAIL_DELAY_SECONDS = 10  # Send email 10 seconds after alert starts

# Location coordinates
FIXED_LAT = os.getenv("FIXED_LAT", "33.9885407")
FIXED_LON = os.getenv("FIXED_LON", "-6.8570454")

# Weather API
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

# SMS Configuration (Infobip)
INFOBIP_MESSAGES_URL = os.getenv("INFOBIP_MESSAGES_URL", "")
INFOBIP_API_KEY = os.getenv("INFOBIP_API_KEY", "")
INFOBIP_SENDER = os.getenv("INFOBIP_SENDER", "InfoSMS")
INFOBIP_BASE_URL = os.getenv("INFOBIP_BASE_URL", "").strip()

# Sanitize Infobip API key: remove optional leading "App " prefix
INFOBIP_API_KEY_SANITIZED = INFOBIP_API_KEY.strip()
if INFOBIP_API_KEY_SANITIZED.lower().startswith("app "):
    INFOBIP_API_KEY_SANITIZED = INFOBIP_API_KEY_SANITIZED[4:].strip()

# Email Configuration (Brevo/Sendinblue)
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "").strip()
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", os.getenv("DEFAULT_SENDER_EMAIL", "")).strip()
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", os.getenv("DEFAULT_SENDER_NAME", "IoT Alerts")).strip()

# WhatsApp Configuration (Twilio)
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "")

# Logging configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
