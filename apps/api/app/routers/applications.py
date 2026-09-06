from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from slugify import slugify
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.core.db import get_db
from app.core.security import hash_national_id
from app.models.models import Athlete, EvidenceFile
from app.schemas.schemas import ApplicationCreate, ApplicationCreated
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


def _apply_payload(athlete: Athlete, payload: ApplicationCreate, id_hash: str, is_minor: bool, user_email: str) -> None:
    athlete.full_name = payload.full_name
    athlete.date_of_birth = payload.date_of_birth
    athlete.is_minor = is_minor
    athlete.province = payload.province
    athlete.city = payload.city
    athlete.sport = payload.sport
    athlete.discipline = payload.discipline
    athlete.category = payload.category
    athlete.club = payload.club
    athlete.federation = payload.federation
    athlete.federation_license_number = payload.federation_license_number
    athlete.bio = payload.bio
    athlete.story = payload.story
    # Always the applicant's own login — a minor holds their own account too,
    # the guardian is consent-only, not a separate account (see plan discussion).
    athlete.contact_email = user_email.lower()
    athlete.national_id_hash = id_hash

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

    if existing and existing.status != "rejected":
        raise HTTPException(status_code=409, detail="This account already has an application submitted.")

    if existing:
        # Rejected — allow resubmission, but only after the cooldown, so a
        # rejection can't just be immediately resubmitted unchanged.
        available_at = reapply_available_at(existing)
        if available_at and datetime.now(timezone.utc) < available_at:
            raise HTTPException(
                status_code=429,
                detail=f"You can reapply after {available_at.isoformat()}.",
            )

    id_hash = hash_national_id(payload.national_id)
    dup_stmt = select(Athlete.id).where(Athlete.national_id_hash == id_hash)
    if existing:
        dup_stmt = dup_stmt.where(Athlete.id != existing.id)
    duplicate = (await db.execute(dup_stmt)).scalar_one_or_none()
    if duplicate:
        # Deliberately not "already exists" — avoid confirming/denying identity to the caller.
        raise HTTPException(
            status_code=409,
            detail="We couldn't process this application. If you believe this is an error, contact support.",
        )

    age_years = (date.today() - payload.date_of_birth).days / 365.25
    is_minor = age_years < 18

    if existing:
        athlete = existing
        _apply_payload(athlete, payload, id_hash, is_minor, user.email)
        athlete.status = "pending"
        athlete.rejection_reason = None
        athlete.rejected_at = None
        athlete.slug = await _unique_slug(db, payload.full_name, exclude_id=athlete.id)

        # Resubmitting replaces the evidence links rather than appending —
        # stale links from the rejected attempt shouldn't linger.
        await db.execute(
            delete(EvidenceFile).where(
                EvidenceFile.athlete_id == athlete.id, EvidenceFile.kind == "federation_link"
            )
        )
    else:
        athlete = Athlete(
            slug=await _unique_slug(db, payload.full_name),
            status="pending",
            auth_user_id=user.auth_user_id,
        )
        _apply_payload(athlete, payload, id_hash, is_minor, user.email)
        db.add(athlete)

    await db.flush()

    for link in payload.evidence_links:
        # kind=federation_link rows store an external URL in s3_key rather than an
        # uploaded object — evidence uploads (kind=id_document/photo/...) use it for
        # an actual S3 key instead. Same column, two meanings by kind.
        db.add(EvidenceFile(athlete_id=athlete.id, kind="federation_link", s3_key=link))

    await db.commit()
    await db.refresh(athlete)

    return ApplicationCreated(id=athlete.id, slug=athlete.slug, status=athlete.status)
