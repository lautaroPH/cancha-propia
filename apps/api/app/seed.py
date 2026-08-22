"""Publishes a couple of sample active athletes for local development.

Run with: python -m app.seed
Not part of the API surface — a stand-in for the admin approval flow, which
lands in Phase 2. Safe to re-run; it upserts by slug.
"""

import asyncio
from datetime import date

from sqlalchemy import select

from app.core.db import async_session
from app.models.models import Athlete, Campaign, CampaignBreakdownItem

SAMPLE_ATHLETES = [
    {
        "slug": "martina-lopez",
        "full_name": "Martina López",
        "date_of_birth": date(2001, 4, 12),
        "province": "Buenos Aires",
        "sport": "Judo",
        "discipline": "-63kg",
        "category": "Senior",
        "club": "Club Atlético River Plate",
        "federation": "Federación Argentina de Judo",
        "bio": "Cinturón negro, competidora de judo de Buenos Aires.",
        "story": (
            "Empecé a practicar judo a los 8 años en el club de mi barrio. "
            "Después de una década de entrenamiento clasifiqué para el "
            "Campeonato Panamericano 2027 en México, y ahora estoy juntando "
            "fondos para cubrir el viaje, alojamiento e inscripción."
        ),
        "achievements": [
            {"title": "Campeona Nacional Juvenil", "year": 2019, "description": "Categoría -63kg"},
            {"title": "3er puesto Sudamericano", "year": 2023, "description": "Asunción, Paraguay"},
        ],
        "identity_verified": True,
        "career_verified": True,
        "competition_verified": True,
        "instagram_handle": "martina.judo",
        "instagram_public": True,
        "whatsapp_number": "+5491100000000",
        "whatsapp_public": True,
        "alias": "MARTINA.JUDO",
        "cbu": "0000003100000000000001",
        "alias_public": True,
        "campaign": {
            "title": "Campeonato Panamericano 2027 — México",
            "description": "Necesito apoyo para cubrir viaje, alojamiento e inscripción.",
            "event_date": date(2027, 11, 15),
            "goal_amount_ars": 1_200_000,
            "raised_amount_ars": 150_000,
            "breakdown": [
                ("Viaje", 500_000),
                ("Alojamiento", 400_000),
                ("Inscripción", 200_000),
                ("Otros gastos", 100_000),
            ],
        },
    },
]


async def seed():
    async with async_session() as db:
        for data in SAMPLE_ATHLETES:
            campaign_data = data.pop("campaign")
            existing = (
                await db.execute(select(Athlete).where(Athlete.slug == data["slug"]))
            ).scalar_one_or_none()

            if existing:
                athlete = existing
                for key, value in data.items():
                    setattr(athlete, key, value)
            else:
                athlete = Athlete(status="active", contact_email=f"{data['slug']}@example.com", **data)
                db.add(athlete)

            await db.flush()

            campaign = Campaign(
                athlete_id=athlete.id,
                status="active",
                title=campaign_data["title"],
                description=campaign_data["description"],
                event_date=campaign_data["event_date"],
                goal_amount_ars=campaign_data["goal_amount_ars"],
                raised_amount_ars=campaign_data["raised_amount_ars"],
            )
            db.add(campaign)
            await db.flush()

            for i, (label, amount) in enumerate(campaign_data["breakdown"]):
                db.add(CampaignBreakdownItem(campaign_id=campaign.id, label=label, amount_ars=amount, sort_order=i))

        await db.commit()
    print(f"Seeded {len(SAMPLE_ATHLETES)} athlete(s).")


if __name__ == "__main__":
    asyncio.run(seed())
