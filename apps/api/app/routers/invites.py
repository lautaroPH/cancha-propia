from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import CurrentUser, get_current_user
from app.core.db import get_db
from app.models.models import Athlete, EvidenceFile
from app.routers.applications import _apply_payload, _unique_slug
from app.routers.athletes import _profile
from app.schemas.schemas import ApplicationCreate, ApplicationCreated, AthleteProfile
from app.services.invites import hash_invite_token
from app.services.notifications import notify_application_received

router = APIRouter(prefix="/invites", tags=["invites"])


async def _load_invite_or_404(db: AsyncSession, token: str) -> Athlete:
    stmt = (
        select(Athlete)
        .where(Athlete.invite_token_hash == hash_invite_token(token), Athlete.status == "invited")
        .options(selectinload(Athlete.campaigns))
    )
    athlete = (await db.execute(stmt)).scalar_one_or_none()
    if athlete is None:
        # Same answer for "never existed", "already claimed" and "link
        # regenerated" — a guessed token learns nothing.
        raise HTTPException(status_code=404, detail="This invite link is no longer valid")
    return athlete


@router.get("/{token}", response_model=AthleteProfile)
async def get_invite(token: str, db: AsyncSession = Depends(get_db)):
    """Private preview of an admin-prepared draft — public to whoever holds the link."""
    return _profile(await _load_invite_or_404(db, token))


@router.post("/{token}/claim", response_model=ApplicationCreated)
async def claim_invite(
    token: str,
    payload: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    athlete = await _load_invite_or_404(db, token)

    already = (
        await db.execute(select(Athlete.id).where(Athlete.auth_user_id == user.auth_user_id))
    ).scalar_one_or_none()
    if already:
        raise HTTPException(status_code=409, detail="This account already has an athlete profile.")

    # From here it's an ordinary application: the athlete confirms their own
    # details and it waits in the review queue like any other.
    is_minor = (date.today() - payload.date_of_birth).days / 365.25 < 18
    _apply_payload(athlete, payload, is_minor, user.email)
    athlete.auth_user_id = user.auth_user_id
    athlete.status = "pending"
    athlete.invite_token_hash = None
    athlete.slug = await _unique_slug(db, payload.full_name, exclude_id=athlete.id)

    for link in payload.evidence_links:
        db.add(EvidenceFile(athlete_id=athlete.id, kind="federation_link", s3_key=link))

    await db.commit()
    await db.refresh(athlete)
    notify_application_received(athlete)
    return ApplicationCreated(id=athlete.id, slug=athlete.slug, status=athlete.status)
