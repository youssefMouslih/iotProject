"""Notification services for email, SMS, and WhatsApp alerts."""
import asyncio
import logging
from typing import List, Optional
from sqlalchemy.orm import Session

from .config import (
    BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME,
    INFOBIP_API_KEY_SANITIZED, INFOBIP_BASE_URL, INFOBIP_SENDER,
    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
)
from .database import EmailAlert

# Infobip SDK imports
from infobip_api_client.api_client import ApiClient, Configuration
from infobip_api_client.api.sms_api import SmsApi
from infobip_api_client.models.sms_request import SmsRequest
from infobip_api_client.models.sms_message import SmsMessage
from infobip_api_client.models.sms_destination import SmsDestination
from infobip_api_client.models.sms_text_content import SmsTextContent
from infobip_api_client.models.sms_message_content import SmsMessageContent
from infobip_api_client.exceptions import ApiException

# Brevo (Sendinblue) SDK imports
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException as BrevoApiException

# Twilio SDK imports
from twilio.rest import Client as TwilioClient


async def send_sms_message(to: str, text: str) -> None:
    """Send SMS message via Infobip API."""
    print(f"[SMS_LOG] Starting SMS send process...")
    print(f"[SMS_LOG] Recipient: {to}")
    print(f"[SMS_LOG] Message: {text[:100]}...")
    try:
        if not INFOBIP_API_KEY_SANITIZED or not INFOBIP_BASE_URL:
            print(f"[SMS_LOG] ERROR: INFOBIP_API_KEY or INFOBIP_BASE_URL not set")
            logging.warning("INFOBIP_API_KEY or INFOBIP_BASE_URL not set; SMS will not be sent")
            return
        
        print(f"[SMS_LOG] Configuring Infobip API client...")
        client_config = Configuration(
            host=INFOBIP_BASE_URL,
            api_key={"APIKeyHeader": INFOBIP_API_KEY_SANITIZED},
            api_key_prefix={"APIKeyHeader": "App"},
        )
        client_config.verify_ssl = False
        api_client = ApiClient(client_config)
        api_instance = SmsApi(api_client)
        print(f"[SMS_LOG] Infobip API client configured successfully")
        
        sms_request = SmsRequest(
            messages=[
                SmsMessage(
                    destinations=[SmsDestination(to=to)],
                    sender=INFOBIP_SENDER,
                    content=SmsMessageContent(actual_instance=SmsTextContent(text=text)),
                )
            ]
        )
        
        try:
            print(f"[SMS_LOG] Sending SMS via Infobip API...")
            api_response = await asyncio.get_event_loop().run_in_executor(
                None, lambda: api_instance.send_sms_messages(sms_request=sms_request)
            )
            print(f"[SMS_LOG] SMS API response received")
            
            try:
                resp_dict = api_response.to_dict() if hasattr(api_response, "to_dict") else None
            except Exception:
                resp_dict = None
            
            if resp_dict:
                messages = resp_dict.get("messages") or []
                if messages:
                    for m in messages:
                        status = m.get("status") or {}
                        logging.info(
                            "SMS dispatch result to=%s status_name=%s group=%s description=%s messageId=%s",
                            to,
                            status.get("name"),
                            status.get("groupName"),
                            status.get("description"),
                            m.get("messageId"),
                        )
                else:
                    logging.info("SMS dispatch response contained no messages: %s", resp_dict)
            else:
                logging.info("SMS dispatch raw response: %s", str(api_response))
        except ApiException as ex:
            print(f"[SMS_LOG] ERROR: Infobip API Exception - Status: {getattr(ex, 'status', None)}")
            logging.warning(
                "SMS send failed: status=%s body=%s",
                getattr(ex, "status", None),
                getattr(ex, "body", "")[:200],
            )
    except Exception as e:
        print(f"[SMS_LOG] ERROR: SMS send exception - {str(e)[:200]}")
        logging.exception("SMS send exception")


async def send_whatsapp_message(to: str, text: str) -> None:
    """Send WhatsApp message via Twilio API."""
    print(f"[WHATSAPP_LOG] Starting WhatsApp send process...")
    print(f"[WHATSAPP_LOG] Recipient: {to}")
    print(f"[WHATSAPP_LOG] Message: {text[:100]}...")
    try:
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            print(f"[WHATSAPP_LOG] ERROR: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set")
            logging.warning("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set; WhatsApp will not be sent")
            return
        
        print(f"[WHATSAPP_LOG] Initializing Twilio client...")
        client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # Format the recipient number for WhatsApp (add whatsapp: prefix if not present)
        if to.startswith("whatsapp:"):
            recipient = to
        else:
            recipient = f"whatsapp:{to}"
        
        print(f"[WHATSAPP_LOG] Sending WhatsApp message via Twilio...")
        print(f"[WHATSAPP_LOG] From: {TWILIO_WHATSAPP_FROM}, To: {recipient}")
        message = client.messages.create(
            from_=TWILIO_WHATSAPP_FROM,
            body=text,
            to=recipient
        )
        
        print(f"[WHATSAPP_LOG] SUCCESS: WhatsApp message sent with SID: {message.sid}")
        logging.info(f"WhatsApp dispatch result to={to} message_sid={message.sid} status={message.status}")
        
    except Exception as e:
        error_msg = str(e)[:200]
        print(f"[WHATSAPP_LOG] ERROR: WhatsApp send exception - {error_msg}")
        logging.exception("WhatsApp send exception")


async def send_email_message(
    recipients: List[str],
    subject: str,
    body: str,
    alert_record_id: Optional[int] = None,
    alert_cause: Optional[str] = None,
    db: Optional[Session] = None,
) -> None:
    """Send email via Brevo (Sendinblue) API."""
    print(f"\n[BREVO_SEND] Entering send_email_message function")
    try:
        print(f"[BREVO_SEND] Checking BREVO_API_KEY status...")
        if not BREVO_API_KEY:
            print(f"[BREVO_SEND] ERROR: BREVO_API_KEY not set")
            logging.warning("BREVO_API_KEY not set; email will not be sent")
            return
        
        print(f"[BREVO_SEND] BREVO_API_KEY is configured")
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key["api-key"] = BREVO_API_KEY
        api_client = sib_api_v3_sdk.ApiClient(configuration)
        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(api_client)
        print(f"[BREVO_SEND] Brevo API client configured successfully")

        sender_email = BREVO_SENDER_EMAIL or ""
        sender_name = BREVO_SENDER_NAME or "IoT Alerts"
        print(f"[BREVO_SEND] Initial sender - Email: {sender_email}, Name: {sender_name}")
        
        try:
            if db is not None:
                print(f"[BREVO_SEND] Querying database for sender config...")
                from .database import Settings
                cfg = db.query(Settings).filter(Settings.id == 1).first()
                if cfg:
                    if getattr(cfg, "brevo_sender_email", None):
                        sender_email = cfg.brevo_sender_email
                        print(f"[BREVO_SEND] Updated sender email from DB: {sender_email}")
                    if getattr(cfg, "brevo_sender_name", None):
                        sender_name = cfg.brevo_sender_name
                        print(f"[BREVO_SEND] Updated sender name from DB: {sender_name}")
                else:
                    print(f"[BREVO_SEND] No settings found in DB")
        except Exception as e:
            print(f"[BREVO_SEND] ERROR loading sender config from DB: {str(e)}")
            logging.exception("Failed to load sender config from DB; using defaults")

        print(f"[BREVO_SEND] Preparing recipient list...")
        to_list = [sib_api_v3_sdk.SendSmtpEmailTo(email=r.strip()) for r in recipients if r and r.strip()]
        print(f"[BREVO_SEND] Recipients prepared: {[t.email for t in to_list]}")
        
        if not to_list:
            print(f"[BREVO_SEND] ERROR: No valid recipients provided")
            logging.warning("No valid recipients provided; skipping email send")
            return
        
        print(f"[BREVO_SEND] Creating SendSmtpEmail object...")
        email = sib_api_v3_sdk.SendSmtpEmail(
            to=to_list,
            sender={"email": sender_email} if sender_email else None,
            subject=subject,
            html_content=body,
        )
        print(f"[BREVO_SEND] Email object created - Subject: {subject}")

        print(f"[BREVO_SEND] Starting async email send via executor...")
        try:
            send_result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: api_instance.send_transac_email(email)
            )
            message_id = getattr(send_result, "message_id", None)
            print(f"[BREVO_SEND] SUCCESS: Email sent with messageId: {message_id}")
            logging.info("Email dispatch result: %s", message_id)
            status = "SENT"
            error_text = None
        except BrevoApiException as ex:
            status = "FAILED"
            error_text = getattr(ex, "body", "")
            error_status = getattr(ex, "status", None)
            print(f"[BREVO_SEND] ERROR: BrevoApiException - Status: {error_status}, Body: {str(error_text)[:200]}")
            logging.warning("Email send failed: status=%s body=%s", error_status, str(error_text)[:200])
        except Exception as e:
            status = "FAILED"
            error_text = "Unhandled exception during send"
            print(f"[BREVO_SEND] ERROR: Unhandled exception - {str(e)}")
            logging.exception("Email send exception")

        print(f"[BREVO_SEND] Recording email send status to database... Status: {status}")
        try:
            if db is not None:
                for r in [t.email for t in to_list]:
                    print(f"[BREVO_SEND] Recording email log for recipient: {r}")
                    ea = EmailAlert(
                        recipient=r,
                        subject=subject,
                        body=body,
                        status=status,
                        error=(str(error_text)[:400] if error_text else None),
                        alert_record_id=alert_record_id,
                        alert_cause=alert_cause,
                    )
                    db.add(ea)
                db.commit()
                print(f"[BREVO_SEND] Email logs persisted to database")
        except Exception as e:
            print(f"[BREVO_SEND] ERROR: Failed to persist EmailAlert logs - {str(e)}")
            logging.exception("Failed to persist EmailAlert logs")
    except Exception as e:
        print(f"[BREVO_SEND] ERROR: Outer exception caught - {str(e)}")
        logging.exception("send_email_message exception")
    
    print(f"[BREVO_SEND] Exiting send_email_message function\n")


async def send_email_with_logging(
    recipients: List[str], subject: str, body: str, alert_record_id: Optional[int] = None,
    alert_cause: Optional[str] = None
) -> None:
    """Wrapper for send_email_message that creates its own DB session."""
    from .database import SessionLocal
    db = SessionLocal()
    try:
        await send_email_message(recipients, subject, body, alert_record_id, alert_cause, db)
    finally:
        db.close()
