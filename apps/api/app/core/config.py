from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    supabase_service_role_key: str = ""

    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    s3_bucket_name: str = ""

    web_origin: str = "http://localhost:3000"

    # Notification emails (application received/approved/rejected/etc) sent
    # via a Gmail account's SMTP relay — see app/services/email.py. Empty
    # smtp_user means emails are skipped (logged, not sent) rather than
    # crashing whatever triggered them — local dev works fine unconfigured.
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "Codeportistas <atletasarg.mail@gmail.com>"

    # How long a rejected applicant must wait before resubmitting — a cheap
    # brake on rapid-fire resubmission without addressing admin feedback.
    reapplication_cooldown_hours: int = 6

    # How long a campaign stays in "grace" after its event_date passes before
    # auto-flipping to "expired" (plan §2: expiration model).
    campaign_grace_period_days: int = 7

    # Enables POST /dev/otp, which lets ANY caller obtain a valid login for ANY
    # email with no password — a full auth bypass. Local dev only. Never set
    # this to true anywhere reachable from outside your own machine.
    dev_auth_enabled: bool = False


settings = Settings()
