from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import exists, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.models.models import Athlete, Campaign, Report
from app.schemas.schemas import (
    REPORT_REASONS,
    AthleteCard,
    AthleteFacets,
    AthleteProfile,
    ReportCreate,
    ReportCreated,
)
from app.services.campaign_lifecycle import run_expiry_sweep
from app.services.rate_limit import check_rate_limit
from app.services.s3 import public_url

router = APIRouter(prefix="/athletes", tags=["athletes"])


def _card(athlete: Athlete) -> AthleteCard:
    return AthleteCard(
        slug=athlete.slug,
        full_name=athlete.full_name,
        photo_url=public_url(athlete.photo_s3_key),
        province=athlete.province,
        city=athlete.city,
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
        city=athlete.city,
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
        instagram_posts=athlete.instagram_posts or [],
        whatsapp_number=athlete.whatsapp_number if athlete.whatsapp_public else None,
        alias=athlete.alias if athlete.alias_public else None,
        cbu=athlete.cbu if athlete.alias_public else None,
        raffle_url=athlete.raffle_url if athlete.raffle_public else None,
        raffle_description=athlete.raffle_description if athlete.raffle_public else None,
        campaigns=visible_campaigns,
    )


@router.get("", response_model=list[AthleteCard])
async def list_athletes(
    q: str | None = Query(default=None, description="Full-text search over name/sport/discipline/province/club/federation"),
    sport: str | None = Query(default=None),
    province: str | None = Query(default=None),
    verified: bool | None = Query(default=None, description="If true, only athletes with all three badges verified"),
    has_upcoming_competition: bool | None = Query(
        default=None, description="If true, only athletes with an active/grace campaign whose event is in the future"
    ),
    db: AsyncSession = Depends(get_db),
):
    await run_expiry_sweep(db)

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
    if verified:
        stmt = stmt.where(
            Athlete.identity_verified.is_(True),
            Athlete.career_verified.is_(True),
            Athlete.competition_verified.is_(True),
        )
    if q:
        stmt = stmt.where(text("search_vector @@ websearch_to_tsquery('spanish', :q)")).params(q=q)
    if has_upcoming_competition:
        stmt = stmt.where(
            exists().where(
                Campaign.athlete_id == Athlete.id,
                Campaign.status.in_(["active", "grace"]),
                Campaign.event_date.is_not(None),
                Campaign.event_date >= date.today(),
            )
        )

    athletes = (await db.execute(stmt)).scalars().all()
    return [_card(a) for a in athletes]


@router.get("/facets", response_model=AthleteFacets)
async def get_facets(db: AsyncSession = Depends(get_db)):
    """Distinct sport/province values actually present among active athletes —
    drives the filter dropdowns without listing options that would return nothing."""
    sports = (
        await db.execute(
            select(Athlete.sport).where(Athlete.status == "active").distinct().order_by(Athlete.sport)
        )
    ).scalars().all()
    provinces = (
        await db.execute(
            select(Athlete.province)
            .where(Athlete.status == "active", Athlete.province.is_not(None))
            .distinct()
            .order_by(Athlete.province)
        )
    ).scalars().all()
    return AthleteFacets(sports=list(sports), provinces=list(provinces))


@router.get("/{slug}", response_model=AthleteProfile)
async def get_athlete(slug: str, db: AsyncSession = Depends(get_db)):
    await run_expiry_sweep(db)

    stmt = (
        select(Athlete)
        .where(Athlete.slug == slug, Athlete.status == "active")
        .options(selectinload(Athlete.campaigns).selectinload(Campaign.breakdown_items))
    )
    athlete = (await db.execute(stmt)).scalar_one_or_none()
    if athlete is None:
        raise HTTPException(status_code=404, detail="Athlete not found")
    return _profile(athlete)


@router.post("/{slug}/report", response_model=ReportCreated, status_code=201)
async def report_athlete(slug: str, payload: ReportCreate, request: Request, db: AsyncSession = Depends(get_db)):
    # Unauthenticated by design (anyone should be able to flag a profile) —
    # which is exactly why it needs its own throttle, unlike every other
    # write endpoint here that's already gated behind a login.
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(f"report:{client_ip}", max_attempts=5, window=timedelta(hours=1)):
        raise HTTPException(status_code=429, detail="Too many reports from this address — try again later")

    if payload.reason not in REPORT_REASONS:
        raise HTTPException(status_code=422, detail=f"reason must be one of: {', '.join(REPORT_REASONS)}")

    athlete = (
        await db.execute(select(Athlete.id).where(Athlete.slug == slug, Athlete.status == "active"))
    ).scalar_one_or_none()
    if athlete is None:
        raise HTTPException(status_code=404, detail="Athlete not found")

    report = Report(athlete_id=athlete, reason=payload.reason, detail=payload.detail)
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return ReportCreated(id=report.id, status=report.status)
