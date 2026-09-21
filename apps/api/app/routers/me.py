from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_athlete
from app.core.db import get_db
from app.models.models import Athlete, Campaign, CampaignBreakdownItem, EvidenceFile
from app.schemas.schemas import (
    AthleteSelfUpdate,
    AthleteSelfView,
    CampaignCreate,
    CampaignOut,
    CampaignRaisedUpdate,
    CampaignRenewRequest,
    EvidenceFileOut,
)
from app.services.campaign_lifecycle import run_expiry_sweep
from app.services.reapplication import reapply_available_at
from app.services.s3 import public_url

router = APIRouter(prefix="/me", tags=["me"])


def _self_view(athlete: Athlete, evidence: list[EvidenceFile]) -> AthleteSelfView:
    return AthleteSelfView(
        id=athlete.id,
        slug=athlete.slug,
        status=athlete.status,
        full_name=athlete.full_name,
        photo_url=public_url(athlete.photo_s3_key),
        province=athlete.province,
        city=athlete.city,
        sport=athlete.sport,
        discipline=athlete.discipline,
        category=athlete.category,
        club=athlete.club,
        federation=athlete.federation,
        federation_license_number=athlete.federation_license_number,
        bio=athlete.bio,
        story=athlete.story,
        achievements=athlete.achievements,
        date_of_birth=athlete.date_of_birth,
        is_minor=athlete.is_minor,
        identity_verified=athlete.identity_verified,
        career_verified=athlete.career_verified,
        competition_verified=athlete.competition_verified,
        next_review_due=athlete.next_review_due,
        instagram_handle=athlete.instagram_handle,
        instagram_public=athlete.instagram_public,
        whatsapp_number=athlete.whatsapp_number,
        whatsapp_public=athlete.whatsapp_public,
        alias=athlete.alias,
        cbu=athlete.cbu,
        alias_public=athlete.alias_public,
        raffle_url=athlete.raffle_url,
        raffle_description=athlete.raffle_description,
        raffle_public=athlete.raffle_public,
        contact_email=athlete.contact_email,
        guardian_email=athlete.guardian_email,
        guardian_consent_at=athlete.guardian_consent_at,
        rejection_reason=athlete.rejection_reason,
        rejected_at=athlete.rejected_at,
        reapply_available_at=reapply_available_at(athlete),
        info_requested_message=athlete.info_requested_message,
        info_requested_at=athlete.info_requested_at,
        suspended_reason=athlete.suspended_reason,
        suspended_at=athlete.suspended_at,
        admin_notes=None,
        created_at=athlete.created_at,
        campaigns=[CampaignOut.model_validate(c) for c in athlete.campaigns],
        evidence=[EvidenceFileOut.model_validate(e) for e in evidence],
    )


async def _reload_with_campaigns(db: AsyncSession, athlete_id) -> Athlete:
    stmt = (
        select(Athlete)
        .where(Athlete.id == athlete_id)
        .options(selectinload(Athlete.campaigns).selectinload(Campaign.breakdown_items))
    )
    return (await db.execute(stmt)).scalar_one()


async def _load_evidence(db: AsyncSession, athlete_id) -> list[EvidenceFile]:
    return (
        await db.execute(select(EvidenceFile).where(EvidenceFile.athlete_id == athlete_id))
    ).scalars().all()


@router.get("", response_model=AthleteSelfView)
async def get_my_profile(
    athlete: Athlete = Depends(get_current_athlete),
    db: AsyncSession = Depends(get_db),
):
    await run_expiry_sweep(db)
    athlete = await _reload_with_campaigns(db, athlete.id)
    evidence = await _load_evidence(db, athlete.id)
    return _self_view(athlete, evidence)


@router.patch("", response_model=AthleteSelfView)
async def update_my_profile(
    payload: AthleteSelfUpdate,
    athlete: Athlete = Depends(get_current_athlete),
    db: AsyncSession = Depends(get_db),
):
    # Must be a key this athlete's own upload actually produced (see
    # POST /uploads/photo-url) — otherwise nothing stops pointing photo_s3_key
    # at an arbitrary external URL (third-party tracking on every profile
    # view) or another athlete's real photo key.
    if payload.photo_s3_key is not None and not payload.photo_s3_key.startswith(f"photos/{athlete.id}/"):
        raise HTTPException(status_code=422, detail="Invalid photo_s3_key")

    # mode="json" so achievement dates serialize to strings before landing in
    # the JSONB column, instead of raw `date` objects the driver can't encode.
    for field, value in payload.model_dump(exclude_unset=True, mode="json").items():
        setattr(athlete, field, value)

    await db.commit()
    athlete = await _reload_with_campaigns(db, athlete.id)
    evidence = await _load_evidence(db, athlete.id)
    return _self_view(athlete, evidence)


@router.post("/campaigns", response_model=CampaignOut, status_code=201)
async def create_my_campaign(
    payload: CampaignCreate,
    athlete: Athlete = Depends(get_current_athlete),
    db: AsyncSession = Depends(get_db),
):
    # New campaigns start as drafts — going live requires admin approval
    # (POST /admin/campaigns/{id}/approve), since a funding goal is exactly
    # the kind of change the plan's re-review rule covers (see plan §2).
    campaign = Campaign(
        athlete_id=athlete.id,
        status="draft",
        title=payload.title,
        description=payload.description,
        event_date=payload.event_date,
        goal_amount_ars=payload.goal_amount_ars,
    )
    db.add(campaign)
    await db.flush()

    for i, item in enumerate(payload.breakdown):
        db.add(
            CampaignBreakdownItem(
                campaign_id=campaign.id, label=item.label, amount_ars=item.amount_ars, sort_order=i
            )
        )

    await db.commit()
    stmt = select(Campaign).where(Campaign.id == campaign.id).options(selectinload(Campaign.breakdown_items))
    return (await db.execute(stmt)).scalar_one()


async def _load_my_campaign(db: AsyncSession, athlete_id, campaign_id) -> Campaign:
    stmt = (
        select(Campaign)
        .where(Campaign.id == campaign_id, Campaign.athlete_id == athlete_id)
        .options(selectinload(Campaign.breakdown_items))
    )
    campaign = (await db.execute(stmt)).scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.patch("/campaigns/{campaign_id}/raised", response_model=CampaignOut)
async def update_my_campaign_raised(
    campaign_id,
    payload: CampaignRaisedUpdate,
    athlete: Athlete = Depends(get_current_athlete),
    db: AsyncSession = Depends(get_db),
):
    # Self-reported, free to edit — the plan is explicit this is never treated as verified.
    campaign = await _load_my_campaign(db, athlete.id, campaign_id)
    campaign.raised_amount_ars = payload.raised_amount_ars
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.post("/campaigns/{campaign_id}/close", response_model=CampaignOut)
async def close_my_campaign(
    campaign_id,
    athlete: Athlete = Depends(get_current_athlete),
    db: AsyncSession = Depends(get_db),
):
    campaign = await _load_my_campaign(db, athlete.id, campaign_id)
    campaign.status = "closed"
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.post("/campaigns/{campaign_id}/renew", response_model=CampaignOut)
async def renew_my_campaign(
    campaign_id,
    payload: CampaignRenewRequest,
    athlete: Athlete = Depends(get_current_athlete),
    db: AsyncSession = Depends(get_db),
):
    # A campaign that missed its event just needs a new date to keep going —
    # unlike a brand-new campaign, this doesn't re-open admin review (plan §2).
    campaign = await _load_my_campaign(db, athlete.id, campaign_id)
    if campaign.status not in ("grace", "expired"):
        raise HTTPException(status_code=409, detail="Only a campaign in grace or expired can be renewed")

    campaign.event_date = payload.event_date
    campaign.status = "active"
    campaign.grace_started_at = None
    await db.commit()
    await db.refresh(campaign)
    return campaign
