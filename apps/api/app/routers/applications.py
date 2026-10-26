from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from slugify import slugify
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.db import get_db
from app.models.models import Athlete, EvidenceFile
from app.schemas.schemas import ApplicationCreate, ApplicationCreated
from app.services.notifications import notify_application_received
from app.services.reapplication import reapply_available_at

router = APIRouter(prefix="/applications", tags=["applications"])


async def _unique_slug(db: AsyncSession, full_name: str, exclude_id=None) -> str:
    base = slugify(full_name)
    slug = base
    suffix = 1
    while True:
        stmt = select(Athlete.id).where(Athlete.slug == slug)
        if exclude_id is not None:
            stmt = stmt.where(Athlete.id != exclude_id)
        if not (await db.execute(stmt)).scalar_one_or_none():
            return slug
        suffix += 1
        slug = f"{base}-{suffix}"


def _apply_payload(athlete: Athlete, payload: ApplicationCreate, is_minor: bool, user_email: str) -> None:
    athlete.full_name = payload.full_name
    athlete.date_of_birth = payload.date_of_birth
    athlete.is_minor = is_minor
    athlete.province = payload.province
    athlete.city = payload.city
    athlete.sport = payload.sport
    athlete.bio = payload.bio
    if payload.instagram_handle:
        # They're signing up to be found — the handle they give here is shown
        # on the profile by default; the dashboard can hide it later.
        athlete.instagram_handle = payload.instagram_handle
        athlete.instagram_public = True
    # Always the applicant's own login — a minor holds their own account too,
    # the guardian is consent-only, not a separate account (see plan discussion).
    athlete.contact_email = user_email.lower()

    if is_minor:
        athlete.guardian_email = str(payload.guardian_email).lower() if payload.guardian_email else None
        athlete.guardian_consent_at = datetime.now(timezone.utc) if payload.guardian_consent else None
    else:
        athlete.guardian_email = None
        athlete.guardian_consent_at = None


@router.post("", response_model=ApplicationCreated, status_code=201)
async def submit_application(
    payload: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    # auth_user_id is the real identity key (set below at creation), not
    # contact_email — this check is exact, not a guess.
    existing = (
        await db.execute(select(Athlete).where(Athlete.auth_user_id == user.auth_user_id))
    ).scalar_one_or_none()

    if existing and existing.status not in ("pending", "rejected"):
        raise HTTPException(status_code=409, detail="This account already has an application submitted.")

    if existing and existing.status == "rejected":
        # Only a rejection needs the cooldown — a still-pending application
        # (e.g. after an admin asked for more info) can be edited any time.
        available_at = reapply_available_at(existing)
        if available_at and datetime.now(timezone.utc) < available_at:
            raise HTTPException(
                status_code=429,
                detail=f"You can reapply after {available_at.isoformat()}.",
            )

    age_years = (date.today() - payload.date_of_birth).days / 365.25
    is_minor = age_years < 18

    if existing:
        athlete = existing
        _apply_payload(athlete, payload, is_minor, user.email)
        athlete.status = "pending"
        athlete.rejection_reason = None
        athlete.rejected_at = None
        athlete.info_requested_message = None
        athlete.info_requested_at = None
        athlete.slug = await _unique_slug(db, payload.full_name, exclude_id=athlete.id)

        # Resubmitting replaces the evidence links rather than appending —
        # stale links from the rejected attempt shouldn't linger.
        await db.execute(
            delete(EvidenceFile).where(EvidenceFile.athlete_id == athlete.id, EvidenceFile.kind == "federation_link")
        )
    else:
        athlete = Athlete(
            slug=await _unique_slug(db, payload.full_name),
            status="pending",
            auth_user_id=user.auth_user_id,
        )
        _apply_payload(athlete, payload, is_minor, user.email)
        db.add(athlete)

    await db.flush()

    for link in payload.evidence_links:
        # kind=federation_link rows store an external URL in s3_key rather than an
        # uploaded object — evidence uploads (kind=id_document/photo/...) use it for
        # an actual S3 key instead. Same column, two meanings by kind.
        db.add(EvidenceFile(athlete_id=athlete.id, kind="federation_link", s3_key=link))

    await db.commit()
    await db.refresh(athlete)

    notify_application_received(athlete)

    return ApplicationCreated(id=athlete.id, slug=athlete.slug, status=athlete.status)
