import uuid

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app.core.auth import get_current_user
from app.core.config import settings


def _make_token(sub: str, email: str, **extra_claims) -> str:
    return jwt.encode(
        {"sub": sub, "email": email, "aud": "authenticated", **extra_claims},
        settings.supabase_jwt_secret,
        algorithm="HS256",
    )


def _creds(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


@pytest.mark.asyncio
async def test_valid_token_returns_current_user():
    user_id = str(uuid.uuid4())
    token = _make_token(user_id, "martina@example.com")

    user = await get_current_user(_creds(token))

    assert str(user.auth_user_id) == user_id
    assert user.email == "martina@example.com"


@pytest.mark.asyncio
async def test_token_signed_with_wrong_secret_is_rejected():
    bad_token = jwt.encode(
        {"sub": str(uuid.uuid4()), "email": "x@example.com", "aud": "authenticated"},
        "not-the-real-secret",
        algorithm="HS256",
    )

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(_creds(bad_token))
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_missing_credentials_is_rejected():
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(None)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_token_missing_email_is_rejected():
    token = jwt.encode(
        {"sub": str(uuid.uuid4()), "aud": "authenticated"},
        settings.supabase_jwt_secret,
        algorithm="HS256",
    )

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(_creds(token))
    assert exc_info.value.status_code == 401
