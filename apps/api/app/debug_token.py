"""Diagnoses why a Supabase access token fails verification. Temporary — safe
to delete once auth is working end to end.

Usage: python -m app.debug_token "<the access token>"
"""

import base64
import json
import sys

from jose import jwt

from app.core.config import settings


def decode_unverified(token: str):
    header = json.loads(base64.urlsafe_b64decode(token.split(".")[0] + "=="))
    payload = json.loads(base64.urlsafe_b64decode(token.split(".")[1] + "=="))
    return header, payload


def try_verify(token: str, secret_bytes: bytes, label: str):
    try:
        jwt.decode(token, secret_bytes, algorithms=["HS256"], audience="authenticated")
        print(f"[OK]   {label}: signature verifies")
        return True
    except Exception as exc:
        print(f"[FAIL] {label}: {exc}")
        return False


if __name__ == "__main__":
    token = sys.argv[1]

    header, payload = decode_unverified(token)
    print("Header:", json.dumps(header, indent=2))
    print("Payload (relevant fields):")
    for k in ("aud", "role", "iss", "exp", "sub", "email"):
        if k in payload:
            print(f"  {k}: {payload[k]}")
    print()

    raw = settings.supabase_jwt_secret
    print(f"SUPABASE_JWT_SECRET length: {len(raw)} chars")
    print()

    try_verify(token, raw.encode(), "raw string as-is (current app behavior)")

    try:
        decoded = base64.b64decode(raw)
        try_verify(token, decoded, "base64-decoded")
    except Exception as exc:
        print(f"[SKIP] base64-decode of secret failed: {exc}")
