from datetime import datetime, timedelta, timezone

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import Campaign


async def run_expiry_sweep(db: AsyncSession) -> None:
    """Campaign expiration state machine: active -> grace -> expired, driven
    by event_date rather than a scheduled job — there's no queue/worker in
    this app yet (plan §11: introduce one once there's a second real async
    workload). Called defensively at the top of read paths that need fresh
    state instead of running on a timer."""
    now = datetime.now(timezone.utc)
    today = now.date()

    await db.execute(
        update(Campaign)
        .where(Campaign.status == "active", Campaign.event_date.is_not(None), Campaign.event_date < today)
        .values(status="grace", grace_started_at=now)
    )

    grace_cutoff = now - timedelta(days=settings.campaign_grace_period_days)
    await db.execute(
        update(Campaign)
        .where(
            Campaign.status == "grace",
            Campaign.grace_started_at.is_not(None),
            Campaign.grace_started_at < grace_cutoff,
        )
        .values(status="expired")
    )

    await db.commit()
