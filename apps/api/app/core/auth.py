import json
import time
import urllib.request
import uuid

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.models.models import AdminUser, Athlete

_bearer = HTTPBearer(auto_error=False)

# Supabase projects sign access tokens either with a shared HS256 secret
# (legacy) or, on newer projects, an asymmetric key (ES256/RS256) rotated
# through a JWKS endpoint. Support both rather than assume one.
_JWKS_TTL_SECONDS = 3600
_jwks_cache: dict | None = None
_jwks_cache_at: float = 0.0


def _fetch_jwks(force: bool = False) -> dict:
    global _jwks_cache, _jwks_cache_at
    now = time.time()
    if force or _jwks_cache is None or now - _jwks_cache_at > _JWKS_TTL_SECONDS:
        req = urllib.request.Request(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json")
        with urllib.request.urlopen(req) as resp:
            _jwks_cache = json.loads(resp.read())
        _jwks_cache_at = now
    return _jwks_cache


def _find_jwk(kid: str) -> dict | None:
    for key in _fetch_jwks().get("keys", []):
        if key.get("kid") == kid:
            return key
    # Key rotated since our last fetch — refresh once and retry before giving up.
    for key in _fetch_jwks(force=True).get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


class CurrentUser:
    def __init__(self, auth_user_id: uuid.UUID, email: str):
        self.auth_user_id = auth_user_id
        self.email = email


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = credentials.credentials

    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg == "HS256":
            signing_key = settings.supabase_jwt_secret
        else:
            kid = header.get("kid")
            signing_key = _find_jwk(kid) if kid else None
            if signing_key is None:
                raise JWTError(f"No matching JWKS key for kid={kid}")

        payload = jwt.decode(token, signing_key, algorithms=[alg], audience="authenticated")
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    sub = payload.get("sub")
    email = payload.get("email")
    if not sub or not email:
        raise HTTPException(status_code=401, detail="Token missing subject/email")

    return CurrentUser(auth_user_id=uuid.UUID(sub), email=email)


async def get_current_admin(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AdminUser:
    admin = (
        await db.execute(select(AdminUser).where(AdminUser.auth_user_id == user.auth_user_id))
    ).scalar_one_or_none()
    if admin is None:
        raise HTTPException(status_code=403, detail="Not an admin")
    return admin


async def get_current_athlete(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Athlete:
    athlete = (
        await db.execute(select(Athlete).where(Athlete.auth_user_id == user.auth_user_id))
    ).scalar_one_or_none()

    if athlete is None:
        # First login for this account: claim any unlinked profile whose contact_email
        # matches — they've already proven control of that inbox via the magic link,
        # which is the same bar the application process itself relies on.
        athlete = (
            await db.execute(
                select(Athlete).where(
                    Athlete.contact_email == user.email, Athlete.auth_user_id.is_(None)
                )
            )
        ).scalar_one_or_none()
        if athlete is not None:
            athlete.auth_user_id = user.auth_user_id
            await db.commit()
            await db.refresh(athlete)

    if athlete is None:
        raise HTTPException(status_code=403, detail="No athlete profile linked to this account")
    return athlete
