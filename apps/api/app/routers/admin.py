from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_admin
from app.core.db import get_db
from app.models.models import AdminAuditLog, AdminUser, Athlete, Campaign, EvidenceFile
from app.schemas.schemas import (
    AdminAthleteListItem,
    ApproveRequest,
    AthleteAdminDetail,
    AuditLogEntryOut,
    CampaignOut,
    CampaignPauseRequest,
    EvidenceFileOut,
    RejectRequest,
    RequestInfoRequest,
    SuspendRequest,
)
from app.services.reapplication import reapply_available_at
from app.services.s3 import public_url

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])

RE_VERIFICATION_INTERVAL_DAYS = 365


@router.get("/whoami")
async def admin_whoami(admin: AdminUser = Depends(get_current_admin)):
    # Cheap probe the frontend uses to decide whether to show admin nav at
    # all — the router-level dependency already 403s a non-admin caller.
    return {"email": admin.email}


async def _load_athlete_or_404(db: AsyncSession, athlete_id) -> Athlete:
    stmt = (
        select(Athlete)
        .where(Athlete.id == athlete_id)
        .options(selectinload(Athlete.campaigns).selectinload(Campaign.breakdown_items))
    )
    athlete = (await db.execute(stmt)).scalar_one_or_none()
    if athlete is None:
        raise HTTPException(status_code=404, detail="Athlete not found")
    return athlete


def _detail(athlete: Athlete, evidence: list[EvidenceFile]) -> AthleteAdminDetail:
    return AthleteAdminDetail(
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
        contact_email=athlete.contact_email,
        guardian_email=athlete.guardian_email,
        guardian_consent_at=athlete.guardian_consent_at,
        rejection_reason=athlete.rejection_reason,
        rejected_at=athlete.rejected_at,
        reapply_available_at=reapply_available_at(athlete),
        admin_notes=athlete.admin_notes,
        created_at=athlete.created_at,
        campaigns=[CampaignOut.model_validate(c) for c in athlete.campaigns],
        evidence=[EvidenceFileOut.model_validate(e) for e in evidence],
    )


async def _log(db: AsyncSession, admin: AdminUser, athlete_id, action: str, detail: dict | None = None):
    db.add(AdminAuditLog(admin_id=admin.id, athlete_id=athlete_id, action=action, detail=detail))


async def _commit_and_reload_detail(db: AsyncSession, athlete: Athlete) -> AthleteAdminDetail:
    await db.commit()
    await db.refresh(athlete)
    evidence = (
        await db.execute(select(EvidenceFile).where(EvidenceFile.athlete_id == athlete.id))
    ).scalars().all()
    return _detail(athlete, evidence)


def _append_note(athlete: Athlete, note: str) -> None:
    athlete.admin_notes = f"{athlete.admin_notes}\n{note}" if athlete.admin_notes else note


@router.get("/applications", response_model=list[AdminAthleteListItem])
async def list_applications(db: AsyncSession = Depends(get_db)):
    stmt = select(Athlete).where(Athlete.status == "pending").order_by(Athlete.created_at.asc())
    return (await db.execute(stmt)).scalars().all()


@router.get("/athletes", response_model=list[AdminAthleteListItem])
async def list_all_athletes(status: str | None = None, db: AsyncSession = Depends(get_db)):
    stmt = select(Athlete).order_by(Athlete.created_at.desc())
    if status:
        stmt = stmt.where(Athlete.status == status)
    return (await db.execute(stmt)).scalars().all()


@router.get("/athletes/{athlete_id}", response_model=AthleteAdminDetail)
async def get_athlete_detail(athlete_id, db: AsyncSession = Depends(get_db)):
    athlete = await _load_athlete_or_404(db, athlete_id)
    evidence = (
        await db.execute(select(EvidenceFile).where(EvidenceFile.athlete_id == athlete.id))
    ).scalars().all()
    return _detail(athlete, evidence)


@router.post("/athletes/{athlete_id}/approve", response_model=AthleteAdminDetail)
async def approve_athlete(
    athlete_id,
    payload: ApproveRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    athlete = await _load_athlete_or_404(db, athlete_id)
    now = date.today()

    if payload.identity_verified:
        athlete.identity_verified = True
        athlete.identity_verified_at = now
        athlete.identity_verified_by = admin.id
    if payload.career_verified:
        athlete.career_verified = True
        athlete.career_verified_at = now
        athlete.career_verified_by = admin.id
    if payload.competition_verified:
        athlete.competition_verified = True
        athlete.competition_verified_at = now
        athlete.competition_verified_by = admin.id

    athlete.status = "active"
    athlete.rejection_reason = None
    athlete.next_review_due = now + timedelta(days=RE_VERIFICATION_INTERVAL_DAYS)
    if payload.notes:
        _append_note(athlete, payload.notes)

    await _log(
        db,
        admin,
        athlete.id,
        "approve",
        {
            "identity_verified": payload.identity_verified,
            "career_verified": payload.career_verified,
            "competition_verified": payload.competition_verified,
        },
    )
    return await _commit_and_reload_detail(db, athlete)


@router.post("/athletes/{athlete_id}/reject", response_model=AthleteAdminDetail)
async def reject_athlete(
    athlete_id,
    payload: RejectRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    athlete = await _load_athlete_or_404(db, athlete_id)
    athlete.status = "rejected"
    athlete.rejection_reason = payload.reason
    athlete.rejected_at = datetime.now(timezone.utc)

    await _log(db, admin, athlete.id, "reject", {"reason": payload.reason})
    return await _commit_and_reload_detail(db, athlete)


@router.post("/athletes/{athlete_id}/request-info", response_model=AthleteAdminDetail)
async def request_more_info(
    athlete_id,
    payload: RequestInfoRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    athlete = await _load_athlete_or_404(db, athlete_id)
    _append_note(athlete, f"[Info requested] {payload.message}")

    await _log(db, admin, athlete.id, "request_info", {"message": payload.message})
    return await _commit_and_reload_detail(db, athlete)


@router.post("/athletes/{athlete_id}/suspend", response_model=AthleteAdminDetail)
async def suspend_athlete(
    athlete_id,
    payload: SuspendRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    athlete = await _load_athlete_or_404(db, athlete_id)
    athlete.status = "suspended"
    _append_note(athlete, f"[Suspended] {payload.reason}")

    await _log(db, admin, athlete.id, "suspend", {"reason": payload.reason})
    return await _commit_and_reload_detail(db, athlete)


@router.post("/athletes/{athlete_id}/reactivate", response_model=AthleteAdminDetail)
async def reactivate_athlete(
    athlete_id,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    athlete = await _load_athlete_or_404(db, athlete_id)
    athlete.status = "active"

    await _log(db, admin, athlete.id, "reactivate")
    return await _commit_and_reload_detail(db, athlete)


@router.post("/campaigns/{campaign_id}/approve", response_model=CampaignOut)
async def approve_campaign(
    campaign_id,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    stmt = select(Campaign).where(Campaign.id == campaign_id).options(selectinload(Campaign.breakdown_items))
    campaign = (await db.execute(stmt)).scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = "active"
    await _log(db, admin, campaign.athlete_id, "approve_campaign", {"campaign_id": str(campaign.id)})
    await db.commit()
    await db.refresh(campaign)
    return campaign


async def _load_campaign_or_404(db: AsyncSession, campaign_id) -> Campaign:
    stmt = select(Campaign).where(Campaign.id == campaign_id).options(selectinload(Campaign.breakdown_items))
    campaign = (await db.execute(stmt)).scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@router.post("/campaigns/{campaign_id}/pause", response_model=CampaignOut)
async def pause_campaign(
    campaign_id,
    payload: CampaignPauseRequest,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    campaign = await _load_campaign_or_404(db, campaign_id)
    if campaign.status not in ("active", "grace"):
        raise HTTPException(status_code=409, detail="Only an active or grace campaign can be paused")

    campaign.status = "paused"
    await _log(
        db, admin, campaign.athlete_id, "pause_campaign",
        {"campaign_id": str(campaign.id), "reason": payload.reason},
    )
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.post("/campaigns/{campaign_id}/resume", response_model=CampaignOut)
async def resume_campaign(
    campaign_id,
    db: AsyncSession = Depends(get_db),
    admin: AdminUser = Depends(get_current_admin),
):
    campaign = await _load_campaign_or_404(db, campaign_id)
    if campaign.status != "paused":
        raise HTTPException(status_code=409, detail="Only a paused campaign can be resumed")

    campaign.status = "active"
    await _log(db, admin, campaign.athlete_id, "resume_campaign", {"campaign_id": str(campaign.id)})
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.get("/athletes/{athlete_id}/audit-log", response_model=list[AuditLogEntryOut])
async def get_audit_log(athlete_id, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(AdminAuditLog, AdminUser.email)
        .join(AdminUser, AdminUser.id == AdminAuditLog.admin_id)
        .where(AdminAuditLog.athlete_id == athlete_id)
        .order_by(AdminAuditLog.created_at.desc())
    )
    rows = (await db.execute(stmt)).all()
    return [
        AuditLogEntryOut(action=log.action, detail=log.detail, admin_email=email, created_at=log.created_at)
        for log, email in rows
    ]
