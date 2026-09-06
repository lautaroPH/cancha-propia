"""Local-dev-only auth bypass: issues a one-time code for any email, with no
password and no email sent, so you can switch between test accounts instantly
instead of waiting on Supabase's email rate limit.

This router is only mounted when DEV_AUTH_ENABLED=true (see main.py) — never
enable that outside local development, since this endpoint lets anyone who
can reach it log in as anyone.
"""

import json
import urllib.error
import urllib.request

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from app.core.config import settings

router = APIRouter(prefix="/dev", tags=["dev"])


class OtpRequest(BaseModel):
    email: EmailStr


class OtpResponse(BaseModel):
    email: str
    token: str


@router.post("/otp", response_model=OtpResponse)
async def issue_dev_otp(payload: OtpRequest):
    body = json.dumps({"type": "magiclink", "email": payload.email}).encode()
    req = urllib.request.Request(
        f"{settings.supabase_url}/auth/v1/admin/generate_link",
        data=body,
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Supabase rejected the request: {exc.read().decode()}")

    otp = data.get("email_otp") or data.get("properties", {}).get("email_otp")
    if not otp:
        raise HTTPException(status_code=502, detail=f"No email_otp in Supabase response: {data}")

    return OtpResponse(email=payload.email, token=otp)
