from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.models.models import Athlete, Campaign
from app.schemas.schemas import AthleteCard, AthleteProfile
from app.services.s3 import public_url

router = APIRouter(prefix="/athletes", tags=["athletes"])


def _card(athlete: Athlete) -> AthleteCard:
    return AthleteCard(
        slug=athlete.slug,
        full_name=athlete.full_name,
        photo_url=public_url(athlete.photo_s3_key),
        province=athlete.province,
        sport=athlete.sport,
        discipline=athlete.discipline,
        identity_verified=athlete.identity_verified,
        career_verified=athlete.career_verified,
        competition_verified=athlete.competition_verified,
        has_active_campaign=any(c.status == "active" for c in athlete.campaigns),
    )


def _profile(athlete: Athlete) -> AthleteProfile:
    visible_campaigns = [c for c in athlete.campaigns if c.status in ("active", "grace", "closed")]
    return AthleteProfile(
        slug=athlete.slug,
        full_name=athlete.full_name,
        photo_url=public_url(athlete.photo_s3_key),
        province=athlete.province,
        sport=athlete.sport,
        discipline=athlete.discipline,
        category=athlete.category,
        club=athlete.club,
        federation=athlete.federation,
        bio=athlete.bio,
        story=athlete.story,
        achievements=athlete.achievements,
        identity_verified=athlete.identity_verified,
        career_verified=athlete.career_verified,
        competition_verified=athlete.competition_verified,
        instagram_handle=athlete.instagram_handle if athlete.instagram_public else None,
        whatsapp_number=athlete.whatsapp_number if athlete.whatsapp_public else None,
        alias=athlete.alias if athlete.alias_public else None,
        cbu=athlete.cbu if athlete.alias_public else None,
        campaigns=visible_campaigns,
    )


@router.get("", response_model=list[AthleteCard])
async def list_athletes(
    sport: str | None = Query(default=None),
    province: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Athlete)
        .where(Athlete.status == "active")
        .options(selectinload(Athlete.campaigns))
        .order_by(Athlete.created_at.desc())
    )
    if sport:
        stmt = stmt.where(Athlete.sport == sport)
    if province:
        stmt = stmt.where(Athlete.province == province)

    athletes = (await db.execute(stmt)).scalars().all()
    return [_card(a) for a in athletes]


@router.get("/{slug}", response_model=AthleteProfile)
async def get_athlete(slug: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Athlete)
        .where(Athlete.slug == slug, Athlete.status == "active")
        .options(selectinload(Athlete.campaigns).selectinload(Campaign.breakdown_items))
    )
    athlete = (await db.execute(stmt)).scalar_one_or_none()
    if athlete is None:
        raise HTTPException(status_code=404, detail="Athlete not found")
    return _profile(athlete)
