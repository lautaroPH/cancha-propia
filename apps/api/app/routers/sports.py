from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models.models import SportOption

router = APIRouter(prefix="/sports", tags=["sports"])


@router.get("", response_model=list[str])
async def list_active_sports(db: AsyncSession = Depends(get_db)):
    """Admin-managed suggestion list for the apply form's sport field (plan
    §12 phase 5) — the field itself stays free-text, this just avoids
    hardcoding the options in the frontend."""
    names = (
        await db.execute(
            select(SportOption.name).where(SportOption.active.is_(True)).order_by(SportOption.name)
        )
    ).scalars().all()
    return list(names)
