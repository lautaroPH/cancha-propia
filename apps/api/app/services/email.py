"""Sends app notification emails via a Gmail account's SMTP relay (an app
password, not the account's real login password — see
https://myaccount.google.com/apppasswords). No third-party email service or
custom domain needed: Gmail delivers to any recipient directly.

Supabase's own built-in email sender is capped at 2 messages/hour for the
whole project — fine for nothing beyond local dev's OTP bypass. The same
Gmail account is used as Supabase Auth's custom SMTP provider for magic-link
emails (configured separately — supabase/config.toml for local, the
dashboard for production), independent of this module.
"""

import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def send_email(to: str, subject: str, html: str) -> None:
    if not settings.smtp_user or not settings.smtp_password:
        # Not configured — skip rather than block whatever triggered this
        # (an application/approval/etc that already succeeded). Expected in
        # local dev until the Gmail relay is set up.
        print(f"[email skipped, no SMTP credentials] to={to} subject={subject!r}")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.email_from
    message["To"] = to
    message.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
            server.starttls(context=ssl.create_default_context())
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_user, [to], message.as_string())
    except Exception as exc:  # noqa: BLE001 — best-effort, never break the caller
        # A notification failing must never break the request that triggered
        # it — the underlying action (approve/reject/apply) already committed.
        print(f"[email failed] to={to} subject={subject!r} error={exc}")
