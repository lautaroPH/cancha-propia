from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    supabase_service_role_key: str = ""
    security_pepper: str = "dev-only-change-me"

    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    s3_bucket_name: str = ""

    web_origin: str = "http://localhost:3000"

    # How long a rejected applicant must wait before resubmitting — a cheap
    # brake on rapid-fire resubmission without addressing admin feedback.
    reapplication_cooldown_hours: int = 6

    # Enables POST /dev/otp, which lets ANY caller obtain a valid login for ANY
    # email with no password — a full auth bypass. Local dev only. Never set
    # this to true anywhere reachable from outside your own machine.
    dev_auth_enabled: bool = False


settings = Settings()
