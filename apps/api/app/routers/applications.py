from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from slugify import slugify
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import hash_national_id
from app.models.models import Athlete, EvidenceFile, Guardian
from app.schemas.schemas import ApplicationCreate, ApplicationCreated

router = APIRouter(prefix="/applications", tags=["applications"])


async def _unique_slug(db: AsyncSession, full_name: str) -> str:
    base = slugify(full_name)
    slug = base
    suffix = 1
    while (await db.execute(select(Athlete.id).where(Athlete.slug == slug))).scalar_one_or_none():
        suffix += 1
        slug = f"{base}-{suffix}"
    return slug


@router.post("", response_model=ApplicationCreated, status_code=201)
async def submit_application(payload: ApplicationCreate, db: AsyncSession = Depends(get_db)):
    id_hash = hash_national_id(payload.national_id)
    duplicate = (
        await db.execute(select(Athlete.id).where(Athlete.national_id_hash == id_hash))
    ).scalar_one_or_none()
    if duplicate:
        # Deliberately not "already exists" — avoid confirming/denying identity to the caller.
        raise HTTPException(
            status_code=409,
            detail="We couldn't process this application. If you believe this is an error, contact support.",
        )

    age_years = (date.today() - payload.date_of_birth).days / 365.25
    is_minor = age_years < 18

    guardian_id = None
    if payload.guardian:
        guardian = Guardian(
            full_name=payload.guardian.full_name,
            relationship_=payload.guardian.relationship,
            email=payload.guardian.email,
            phone=payload.guardian.phone,
        )
        db.add(guardian)
        await db.flush()
        guardian_id = guardian.id

    slug = await _unique_slug(db, payload.full_name)

    athlete = Athlete(
        slug=slug,
        status="pending",
        full_name=payload.full_name,
        date_of_birth=payload.date_of_birth,
        is_minor=is_minor,
        province=payload.province,
        sport=payload.sport,
        discipline=payload.discipline,
        category=payload.category,
        club=payload.club,
        federation=payload.federation,
        federation_license_number=payload.federation_license_number,
        bio=payload.bio,
        story=payload.story,
        contact_email=payload.guardian.email if (is_minor and payload.guardian) else payload.contact_email,
        national_id_hash=id_hash,
        guardian_id=guardian_id,
    )
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
