from datetime import datetime, timedelta

from app.core.config import settings
from app.models.models import Athlete


def reapply_available_at(athlete: Athlete) -> datetime | None:
    """When a rejected athlete becomes eligible to resubmit — None if not
    rejected, or rejected before this feature existed (no rejected_at on file,
    treated as immediately eligible rather than permanently blocked)."""
    if athlete.status != "rejected" or athlete.rejected_at is None:
        return None
    return athlete.rejected_at + timedelta(hours=settings.reapplication_cooldown_hours)
