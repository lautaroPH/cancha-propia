from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_current_athlete
from app.models.models import Athlete
from app.schemas.schemas import EvidenceUploadRequest, EvidenceUploadResponse
from app.services.s3 import build_key, presigned_upload_post

router = APIRouter(prefix="/uploads", tags=["uploads"])

ALLOWED_PHOTO_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

MAX_PHOTO_BYTES = 5 * 1024 * 1024  # 5MB — a profile photo has no reason to be bigger


@router.post("/photo-url", response_model=EvidenceUploadResponse)
async def get_photo_upload_url(
    payload: EvidenceUploadRequest,
    athlete: Athlete = Depends(get_current_athlete),
):
    # Requires an existing athlete (not just a logged-in user) — the profile
    # photo is edited from the self-serve dashboard, post-approval, not at
    # application time (plan §3: "tell your story" is athlete-owned, separate
    # from "prove who you are").
    if payload.content_type not in ALLOWED_PHOTO_CONTENT_TYPES:
        raise HTTPException(status_code=422, detail="File type not allowed")

    key = build_key(f"photos/{athlete.id}", payload.filename)
    presigned = presigned_upload_post(key, payload.content_type, MAX_PHOTO_BYTES)
    return EvidenceUploadResponse(url=presigned["url"], fields=presigned["fields"], s3_key=key)
