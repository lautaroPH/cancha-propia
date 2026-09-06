"""Wipes ALL application data (athletes, campaigns, guardians, admins, audit
log, reports). Does NOT touch Supabase's own auth.users — accounts you've
logged in with stay valid, just unlinked from any athlete/admin row.

Usage: python -m app.reset_db --yes
"""

import argparse
import asyncio

from sqlalchemy import text

from app.core.db import async_session

TABLES = [
    "admin_audit_log",
    "evidence_file",
    "campaign_breakdown_item",
    "campaign",
    "report",
    "athlete",
    "guardian",
    "admin_user",
]


async def reset():
    async with async_session() as db:
        await db.execute(text(f"TRUNCATE TABLE {', '.join(TABLES)} CASCADE"))
        await db.commit()
    print("Database reset — all app tables are empty.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--yes", action="store_true", required=True, help="confirm you want to wipe all data")
    parser.parse_args()
    asyncio.run(reset())
