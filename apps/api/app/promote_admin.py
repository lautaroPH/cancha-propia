"""Grants admin access to a Supabase auth user by email.

The person must have already signed in once via magic link (so Supabase has
created their auth.users row) before running this — there's no way to look
up a user that's never authenticated.

Usage: python -m app.promote_admin --email you@example.com --name "Your Name"
"""

import argparse
import asyncio
import json
import urllib.request

from sqlalchemy import select

from app.core.config import settings
from app.core.db import async_session
from app.models.models import AdminUser


def find_auth_user_id(email: str) -> str:
    req = urllib.request.Request(
        f"{settings.supabase_url}/auth/v1/admin/users?per_page=200",
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        },
    )
    with urllib.request.urlopen(req) as resp:
        body = json.loads(resp.read())

    for user in body.get("users", []):
        if user.get("email", "").lower() == email.lower():
            return user["id"]

    raise SystemExit(
        f"No Supabase auth user found for {email}. They need to request a magic link and "
        "click it at least once before you can promote them."
    )


async def promote(email: str, full_name: str):
    auth_user_id = find_auth_user_id(email)

    async with async_session() as db:
        existing = (
            await db.execute(select(AdminUser).where(AdminUser.email == email))
        ).scalar_one_or_none()

        if existing:
            existing.auth_user_id = auth_user_id
            existing.full_name = full_name
        else:
            db.add(AdminUser(auth_user_id=auth_user_id, email=email, full_name=full_name))

        await db.commit()

    print(f"{email} is now an admin.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True, dest="full_name")
    args = parser.parse_args()
    asyncio.run(promote(args.email, args.full_name))
