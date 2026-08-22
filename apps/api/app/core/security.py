import hashlib
import hmac

from app.core.config import settings


def hash_national_id(national_id: str) -> str:
    """Salted hash for duplicate detection. The plaintext ID is never stored."""
    normalized = national_id.strip().replace(".", "").replace("-", "")
    return hmac.new(
        settings.security_pepper.encode(), normalized.encode(), hashlib.sha256
    ).hexdigest()
