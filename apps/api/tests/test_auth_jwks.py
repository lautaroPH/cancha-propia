import base64
import uuid

import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

import app.core.auth as auth_module
from app.core.auth import get_current_user


def _b64url_uint(n: int, length: int) -> str:
    return base64.urlsafe_b64encode(n.to_bytes(length, "big")).rstrip(b"=").decode()


def _make_es256_token_and_jwks(sub: str, email: str, kid: str = "test-kid"):
    """Mirrors a real Supabase project on the newer asymmetric-key signing
    setup (see debug_token.py) — this is the exact case that silently failed
    before JWKS support was added."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_numbers = private_key.public_key().public_numbers()

    jwk_dict = {
        "kty": "EC",
        "crv": "P-256",
        "kid": kid,
        "x": _b64url_uint(public_numbers.x, 32),
        "y": _b64url_uint(public_numbers.y, 32),
        "use": "sig",
        "alg": "ES256",
    }

    private_pem = private_key.private_bytes(
        encoding=Encoding.PEM,
        format=PrivateFormat.PKCS8,
        encryption_algorithm=NoEncryption(),
    )

    token = jwt.encode(
        {"sub": sub, "email": email, "aud": "authenticated"},
        private_pem,
        algorithm="ES256",
        headers={"kid": kid},
    )
    return token, {"keys": [jwk_dict]}


@pytest.mark.asyncio
async def test_es256_token_verifies_via_jwks(monkeypatch):
    user_id = str(uuid.uuid4())
    token, jwks = _make_es256_token_and_jwks(user_id, "athlete@example.com")

    monkeypatch.setattr(auth_module, "_fetch_jwks", lambda force=False: jwks)

    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    user = await get_current_user(creds)

    assert str(user.auth_user_id) == user_id
    assert user.email == "athlete@example.com"


@pytest.mark.asyncio
async def test_es256_token_with_unknown_kid_is_rejected(monkeypatch):
    token, _ = _make_es256_token_and_jwks(str(uuid.uuid4()), "athlete@example.com", kid="signing-key-a")
    # Simulate the key having rotated away — JWKS no longer has this kid.
    monkeypatch.setattr(auth_module, "_fetch_jwks", lambda force=False: {"keys": []})

    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(creds)
    assert exc_info.value.status_code == 401
