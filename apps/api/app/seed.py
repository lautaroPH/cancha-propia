"""Publishes sample active athletes for local development, covering a spread
of sports/provinces/verification states so search and filters have something
real to test against.

Run with: python -m app.seed
Not part of the API surface — a stand-in for the admin approval flow, which
lands in Phase 2. Safe to re-run; it upserts by slug.
"""

import asyncio
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.db import async_session
from app.models.models import Athlete, Campaign, CampaignBreakdownItem, SportOption

# Suggestion list for the apply form's sport datalist (admin-editable afterward
# at /admin/sports) — not authoritative data, just a reasonable starting set
# so the field isn't empty on a fresh database.
SPORT_OPTIONS = [
    "Atletismo", "Natación", "Nado sincronizado", "Aguas abiertas", "Clavados",
    "Gimnasia artística", "Gimnasia rítmica", "Trampolín",
    "Judo", "Taekwondo", "Karate", "Boxeo", "Lucha", "Esgrima",
    "Ciclismo de ruta", "Ciclismo de pista", "Mountain bike", "BMX",
    "Remo", "Canotaje/Kayak", "Vela", "Surf", "Triatlón",
    "Tenis", "Tenis de mesa", "Bádminton", "Squash", "Pádel",
    "Rugby", "Fútbol", "Handball", "Vóley", "Vóley playa", "Básquet", "Básquet 3x3", "Hockey sobre césped",
    "Levantamiento de pesas", "Powerlifting", "CrossFit",
    "Tiro deportivo", "Tiro con arco", "Pentatlón moderno",
    "Patín artístico", "Patín de carrera", "Skateboarding", "Escalada deportiva",
    "Golf", "Equitación", "Polo",
    "Automovilismo", "Motociclismo", "Karting",
    "Esquí", "Snowboard",
    "Para atletismo", "Para natación", "Para powerlifting",
    "Básquet en silla de ruedas", "Rugby en silla de ruedas", "Goalball",
]

# https://i.pravatar.cc serves stable, real-looking headshot placeholders by
# id — good enough for dev/demo data without needing a real S3 upload
# (services/s3.public_url passes external URLs through unchanged).
def _avatar(n: int) -> str:
    return f"https://i.pravatar.cc/500?img={n}"


SAMPLE_ATHLETES = [
    {
        "slug": "martina-lopez",
        "full_name": "Martina López",
        "date_of_birth": date(2001, 4, 12),
        "province": "Buenos Aires",
        "city": "La Plata",
        "sport": "Judo",
        "discipline": "-63kg",
        "category": "Senior",
        "club": "Club Atlético River Plate",
        "federation": "Federación Argentina de Judo",
        "photo_s3_key": _avatar(1),
        "bio": "Cinturón negro, competidora de judo de Buenos Aires.",
        "story": (
            "Empecé a practicar judo a los 8 años en el club de mi barrio. "
            "Después de una década de entrenamiento clasifiqué para el "
            "Campeonato Panamericano 2027 en México, y ahora estoy juntando "
            "fondos para cubrir el viaje, alojamiento e inscripción."
        ),
        "achievements": [
            {"title": "Campeona Nacional Juvenil", "date": "2019-11-03", "description": "Categoría -63kg"},
            {"title": "3er puesto Sudamericano", "date": "2023-06-18", "description": "Asunción, Paraguay"},
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
    {
        "slug": "joaquin-fernandez",
        "full_name": "Joaquín Fernández",
        "date_of_birth": date(1999, 8, 22),
        "province": "Córdoba",
        "city": "Córdoba",
        "sport": "Atletismo",
        "discipline": "400m con vallas",
        "category": "Senior",
        "club": "Club Atlético Talleres",
        "federation": "Confederación Argentina de Atletismo",
        "photo_s3_key": _avatar(12),
        "bio": "Especialista en 400m con vallas, ranking nacional top 5.",
        "story": (
            "Corro desde los 14 años. Este año clasifiqué al Mundial de "
            "Atletismo y necesito cubrir los costos de viaje y preparación "
            "de los últimos meses antes de la competencia."
        ),
        "achievements": [
            {"title": "Récord provincial 400mv", "date": "2024-03-10", "description": "Córdoba"},
        ],
        "identity_verified": True,
        "career_verified": True,
        "competition_verified": True,
        "instagram_handle": "joaco.vallas",
        "instagram_public": True,
        "alias": "JOACO.ATLETISMO",
        "alias_public": True,
        "campaign": {
            "title": "Mundial de Atletismo 2026 — Tokio",
            "description": "Últimos meses de preparación antes del Mundial.",
            "event_date": date(2026, 12, 5),
            "goal_amount_ars": 2_000_000,
            "raised_amount_ars": 400_000,
            "breakdown": [
                ("Pasajes", 900_000),
                ("Preparación física", 600_000),
                ("Inscripción", 300_000),
                ("Otros gastos", 200_000),
            ],
        },
    },
    {
        "slug": "valentina-suarez",
        "full_name": "Valentina Suárez",
        "date_of_birth": date(2002, 1, 30),
        "province": "Santa Fe",
        "city": "Rosario",
        "sport": "Natación",
        "discipline": "Aguas abiertas",
        "category": "Senior",
        "club": "Náutico Rosario",
        "federation": "Federación Santafesina de Natación",
        "photo_s3_key": _avatar(23),
        "bio": "Nadadora de aguas abiertas, especialista en 10km.",
        "story": "Compito en aguas abiertas hace 6 años. Todavía no tengo una campaña activa, pero estoy armando mi perfil para el próximo ciclo de competencias.",
        "achievements": [],
        "identity_verified": True,
        "career_verified": True,
        "competition_verified": False,
        "instagram_handle": "valen.openwater",
        "instagram_public": True,
        "campaign": None,
    },
    {
        "slug": "tomas-gimenez",
        "full_name": "Tomás Giménez",
        "date_of_birth": date(2000, 6, 5),
        "province": "Ciudad Autónoma de Buenos Aires",
        "city": "Buenos Aires",
        "sport": "Boxeo",
        "discipline": "Peso welter",
        "category": "Senior",
        "club": "Club Boxeo Amateur CABA",
        "federation": "Federación Argentina de Box",
        "photo_s3_key": _avatar(33),
        "bio": "Boxeador amateur, peso welter, convocado a la selección nacional.",
        "story": (
            "Boxeo desde los 10 años. Fui convocado a la selección nacional "
            "para el Preolímpico y necesito ayuda para cubrir la concentración "
            "y el viaje."
        ),
        "achievements": [
            {"title": "Campeón Nacional Amateur", "date": "2023-09-01", "description": "Peso welter"},
        ],
        "identity_verified": True,
        "career_verified": True,
        "competition_verified": True,
        "whatsapp_number": "+5491100000001",
        "whatsapp_public": True,
        "alias": "TOMI.BOX",
        "alias_public": True,
        "campaign": {
            "title": "Preolímpico de Boxeo 2026 — Lima",
            "description": "Concentración y viaje para el Preolímpico.",
            "event_date": date(2026, 10, 20),
            "goal_amount_ars": 900_000,
            "raised_amount_ars": 900_000,
            "breakdown": [
                ("Viaje", 500_000),
                ("Concentración", 300_000),
                ("Inscripción", 100_000),
            ],
        },
    },
    {
        "slug": "sofia-alvarez",
        "full_name": "Sofía Álvarez",
        "date_of_birth": date(2003, 3, 17),
        "province": "Mendoza",
        "city": "Mendoza",
        "sport": "Tenis",
        "discipline": "Individual",
        "category": "Sub-23",
        "club": "Círculo de Tenis Mendoza",
        "federation": "Asociación Argentina de Tenis",
        "photo_s3_key": _avatar(44),
        "bio": "Jugadora de tenis juvenil, en ascenso en el ranking ITF.",
        "story": (
            "Juego torneos ITF desde los 16 años. Mi perfil recién está en "
            "revisión de trayectoria — todavía no se confirmó mi participación "
            "en competencias."
        ),
        "achievements": [
            {"title": "Semifinalista ITF J60", "date": "2025-05-14", "description": "Buenos Aires"},
        ],
        "identity_verified": True,
        "career_verified": False,
        "competition_verified": False,
        "instagram_handle": "sofi.tenis",
        "instagram_public": True,
        "campaign": {
            "title": "Gira ITF Sudamericana 2026",
            "description": "Gira de torneos ITF para sumar puntos de ranking.",
            "event_date": date(2027, 2, 10),
            "goal_amount_ars": 1_500_000,
            "raised_amount_ars": 0,
            "breakdown": [
                ("Pasajes", 700_000),
                ("Alojamiento", 500_000),
                ("Inscripciones", 300_000),
            ],
        },
    },
    {
        "slug": "lucas-romero",
        "full_name": "Lucas Romero",
        "date_of_birth": date(1998, 11, 2),
        "province": "Tucumán",
        "city": "San Miguel de Tucumán",
        "sport": "Rugby",
        "discipline": "Seven",
        "category": "Senior",
        "club": "Tucumán Rugby Club",
        "federation": "Unión Argentina de Rugby",
        "photo_s3_key": _avatar(52),
        "bio": "Jugador de seven, convocado a los Pumas 7s.",
        "story": (
            "Juego rugby seven hace 8 años. Fui convocado a la gira de los "
            "Pumas 7s y necesito cubrir gastos que la federación no cubre "
            "en su totalidad."
        ),
        "achievements": [
            {"title": "Campeón Torneo Regional NOA", "date": "2024-08-20"},
        ],
        "identity_verified": True,
        "career_verified": True,
        "competition_verified": True,
        "instagram_handle": "luqui.rugby7",
        "instagram_public": True,
        "alias": "LUCAS.RUGBY7",
        "alias_public": True,
        "campaign": {
            "title": "Gira Pumas 7s 2026 — Sudáfrica",
            "description": "Viaje y estadía para la gira sudafricana.",
            "event_date": date(2026, 11, 8),
            "goal_amount_ars": 1_800_000,
            "raised_amount_ars": 600_000,
            "breakdown": [
                ("Viaje", 900_000),
                ("Estadía", 600_000),
                ("Otros gastos", 300_000),
            ],
        },
    },
    {
        "slug": "camila-diaz",
        "full_name": "Camila Díaz",
        "date_of_birth": date(2004, 7, 9),
        "province": "Neuquén",
        "city": "Neuquén",
        "sport": "Ciclismo",
        "discipline": "BMX Racing",
        "category": "Sub-23",
        "club": "Bike Club Neuquén",
        "federation": "Confederación Argentina de Ciclismo",
        "photo_s3_key": _avatar(9),
        "bio": "Ciclista de BMX racing, campeona regional patagónica.",
        "story": (
            "Corro BMX desde los 12 años. Mi trayectoria y participación en "
            "competencias ya están confirmadas — me falta la verificación de "
            "identidad, en trámite."
        ),
        "achievements": [
            {"title": "Campeona Patagónica BMX", "date": "2025-02-01"},
        ],
        "identity_verified": False,
        "career_verified": True,
        "competition_verified": True,
        "campaign": {
            "title": "Copa Nacional BMX 2026",
            "description": "Viaje a la final de la Copa Nacional.",
            "event_date": date(2026, 9, 28),
            "goal_amount_ars": 600_000,
            "raised_amount_ars": 120_000,
            "breakdown": [
                ("Viaje", 300_000),
                ("Inscripción", 150_000),
                ("Mantenimiento de bici", 150_000),
            ],
        },
    },
    {
        "slug": "mateo-herrera",
        "full_name": "Mateo Herrera",
        "date_of_birth": date(1997, 5, 25),
        "province": "Chubut",
        "city": "Puerto Madryn",
        "sport": "Remo",
        "discipline": "Single Skiff",
        "category": "Senior",
        "club": "Club Náutico Puerto Madryn",
        "federation": "Asociación Argentina de Remo",
        "photo_s3_key": _avatar(15),
        "bio": "Remero de single skiff, clasificado a los Panamericanos.",
        "story": "Remo compite hace 10 años y clasificó a los Panamericanos de este año — la competencia es en unas semanas.",
        "achievements": [
            {"title": "Clasificado Panamericanos", "date": "2026-04-01"},
        ],
        "identity_verified": True,
        "career_verified": True,
        "competition_verified": True,
        "whatsapp_number": "+5491100000002",
        "whatsapp_public": True,
        "alias": "MATEO.REMO",
        "alias_public": True,
        "campaign": {
            "title": "Panamericanos de Remo 2026",
            "description": "Últimas semanas antes de la competencia.",
            "event_date": date(2026, 9, 25),
            "goal_amount_ars": 800_000,
            "raised_amount_ars": 300_000,
            "breakdown": [
                ("Viaje", 400_000),
                ("Equipamiento", 250_000),
                ("Inscripción", 150_000),
            ],
        },
    },
    {
        "slug": "agustina-flores",
        "full_name": "Agustina Flores",
        "date_of_birth": date(2001, 9, 14),
        "province": "Salta",
        "city": "Salta",
        "sport": "Taekwondo",
        "discipline": "-57kg",
        "category": "Senior",
        "club": "Taekwondo Club Salta",
        "federation": "Federación Argentina de Taekwondo",
        "photo_s3_key": _avatar(29),
        "bio": "Cinturón negro 2do Dan, competidora de taekwondo olímpico.",
        "story": "Compito en taekwondo desde los 9 años. Mi perfil está completamente verificado; por ahora no tengo una campaña abierta.",
        "achievements": [
            {"title": "Medalla de oro Nacional", "date": "2022-10-11", "description": "Categoría -57kg"},
        ],
        "identity_verified": True,
        "career_verified": True,
        "competition_verified": True,
        "instagram_handle": "agus.tkd",
        "instagram_public": True,
        "campaign": None,
    },
    {
        "slug": "nicolas-castro",
        "full_name": "Nicolás Castro",
        "date_of_birth": date(2000, 2, 28),
        "province": "Misiones",
        "city": "Posadas",
        "sport": "Esgrima",
        "discipline": "Sable",
        "category": "Senior",
        "club": "Club de Esgrima Posadas",
        "federation": "Federación Argentina de Esgrima",
        "photo_s3_key": _avatar(41),
        "bio": "Esgrimista de sable, en proceso de verificación.",
        "story": "Empecé a competir hace poco y mi perfil todavía está en las primeras etapas de revisión.",
        "achievements": [],
        "identity_verified": False,
        "career_verified": False,
        "competition_verified": False,
        "campaign": {
            "title": "Torneo Nacional de Esgrima 2026",
            "description": "Inscripción y viaje al torneo nacional.",
            "event_date": date(2026, 10, 30),
            "goal_amount_ars": 400_000,
            "raised_amount_ars": 50_000,
            "breakdown": [
                ("Viaje", 200_000),
                ("Inscripción", 120_000),
                ("Equipamiento", 80_000),
            ],
        },
    },
]


async def seed():
    async with async_session() as db:
        existing_sports = set(
            (await db.execute(select(SportOption.name))).scalars().all()
        )
        for name in SPORT_OPTIONS:
            if name not in existing_sports:
                db.add(SportOption(name=name))
        await db.flush()

        for data in SAMPLE_ATHLETES:
            campaign_data = data.pop("campaign", None)
            existing = (
                await db.execute(
                    select(Athlete)
                    .where(Athlete.slug == data["slug"])
                    .options(selectinload(Athlete.campaigns).selectinload(Campaign.breakdown_items))
                )
            ).scalar_one_or_none()

            if existing:
                athlete = existing
                existing_campaigns = list(athlete.campaigns)
                for key, value in data.items():
                    setattr(athlete, key, value)
            else:
                athlete = Athlete(status="active", contact_email=f"{data['slug']}@example.com", **data)
                db.add(athlete)
                existing_campaigns = []

            await db.flush()

            if campaign_data is not None:
                # Upsert by title so re-running the seed doesn't pile up duplicate
                # campaigns for an athlete that was already seeded before.
                campaign = next((c for c in existing_campaigns if c.title == campaign_data["title"]), None)
                is_new_campaign = campaign is None
                if is_new_campaign:
                    campaign = Campaign(athlete_id=athlete.id, status="active", title=campaign_data["title"])
                    db.add(campaign)

                campaign.description = campaign_data["description"]
                campaign.event_date = campaign_data["event_date"]
                campaign.goal_amount_ars = campaign_data["goal_amount_ars"]
                campaign.raised_amount_ars = campaign_data["raised_amount_ars"]
                await db.flush()

                if not is_new_campaign:
                    for item in list(campaign.breakdown_items):
                        await db.delete(item)
                    await db.flush()

                for i, (label, amount) in enumerate(campaign_data["breakdown"]):
                    db.add(
                        CampaignBreakdownItem(campaign_id=campaign.id, label=label, amount_ars=amount, sort_order=i)
                    )

        await db.commit()
    print(f"Seeded {len(SAMPLE_ATHLETES)} athlete(s) and {len(SPORT_OPTIONS)} sport option(s).")


if __name__ == "__main__":
    asyncio.run(seed())
