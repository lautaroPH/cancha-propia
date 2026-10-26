from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.schemas.schemas import AthleteSelfUpdate, ApplicationCreate


def _base_payload(**overrides):
    payload = dict(
        full_name="Martina López",
        date_of_birth=date(2000, 1, 1),
        sport="Judo",
        instagram_handle="martinalopez.judo",
    )
    payload.update(overrides)
    return payload


def _years_ago(years: float) -> date:
    return date.today() - timedelta(days=int(years * 365.25))


def test_adult_application_does_not_require_guardian():
    app = ApplicationCreate(**_base_payload(date_of_birth=_years_ago(20)))
    assert app.guardian_email is None


def test_minor_application_requires_guardian_email():
    with pytest.raises(ValidationError, match="guardian_email is required"):
        ApplicationCreate(**_base_payload(date_of_birth=_years_ago(15)))


def test_minor_application_requires_guardian_consent():
    with pytest.raises(ValidationError, match="guardian consent is required"):
        ApplicationCreate(
            **_base_payload(date_of_birth=_years_ago(15), guardian_email="ana@example.com", guardian_consent=False)
        )


def test_minor_application_with_email_and_consent_is_valid():
    app = ApplicationCreate(
        **_base_payload(
            date_of_birth=_years_ago(15),
            guardian_email="ana@example.com",
            guardian_consent=True,
        )
    )
    assert str(app.guardian_email) == "ana@example.com"
    assert app.guardian_consent is True


def test_application_requires_instagram_or_a_link():
    with pytest.raises(ValidationError, match="Instagram or at least one link"):
        ApplicationCreate(**_base_payload(instagram_handle=None, evidence_links=[]))


def test_application_with_only_a_link_is_valid():
    app = ApplicationCreate(**_base_payload(instagram_handle=None, evidence_links=["  https://example.com/ranking "]))
    assert app.evidence_links == ["https://example.com/ranking"]


def test_application_rejects_blank_only_links_without_instagram():
    with pytest.raises(ValidationError, match="Instagram or at least one link"):
        ApplicationCreate(**_base_payload(instagram_handle="", evidence_links=["   "]))


def test_application_rejects_national_id_field():
    # DNI is no longer collected — extra="forbid" keeps a stale client from
    # silently sending it anyway.
    with pytest.raises(ValidationError):
        ApplicationCreate(**_base_payload(national_id="30111222"))


@pytest.mark.parametrize(
    "raw",
    ["martina", "@martina", "https://www.instagram.com/martina/", "instagram.com/martina?igsh=abc"],
)
def test_instagram_handle_is_normalized(raw):
    if raw.startswith("instagram.com"):
        raw = "https://" + raw
    assert ApplicationCreate(**_base_payload(instagram_handle=raw)).instagram_handle == "martina"


def test_instagram_handle_rejects_invalid_characters():
    with pytest.raises(ValidationError, match="valid Instagram username"):
        ApplicationCreate(**_base_payload(instagram_handle="martina lópez"))


def test_application_rejects_javascript_uri_evidence_link():
    # Rendered as a raw <a href> on the admin review page — a javascript:
    # URI there would be a stored XSS against whichever admin clicks it.
    with pytest.raises(ValidationError, match="http"):
        ApplicationCreate(
            **_base_payload(date_of_birth=_years_ago(20), evidence_links=["javascript:alert(1)"])
        )


def test_raffle_url_rejects_javascript_uri():
    # Same as above, but rendered on the athlete's public profile — any
    # visitor who clicks "Ver sorteo" would trigger it.
    with pytest.raises(ValidationError, match="http"):
        AthleteSelfUpdate(raffle_url="javascript:alert(document.cookie)")


def test_raffle_url_accepts_http_url():
    update = AthleteSelfUpdate(raffle_url="https://instagram.com/p/example")
    assert update.raffle_url == "https://instagram.com/p/example"


def test_instagram_posts_are_canonicalized_and_deduplicated():
    update = AthleteSelfUpdate(
        instagram_posts=[
            "https://www.instagram.com/p/C8abc123/?igsh=xyz",
            "https://instagram.com/reels/DA_x-9/",
            "https://www.instagram.com/martina/p/C8abc123/",
            "  ",
        ]
    )
    assert update.instagram_posts == [
        "https://www.instagram.com/p/C8abc123/",
        "https://www.instagram.com/reel/DA_x-9/",
    ]


def test_instagram_posts_reject_non_instagram_links():
    with pytest.raises(ValidationError, match="Instagram post or reel"):
        AthleteSelfUpdate(instagram_posts=["https://tiktok.com/@martina/video/1"])


def test_instagram_posts_are_capped():
    with pytest.raises(ValidationError):
        AthleteSelfUpdate(instagram_posts=[f"https://www.instagram.com/p/post{i}/" for i in range(7)])
