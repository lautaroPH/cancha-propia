from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.core.security import hash_national_id
from app.schemas.schemas import ApplicationCreate


def _base_payload(**overrides):
    payload = dict(
        full_name="Martina López",
        date_of_birth=date(2000, 1, 1),
        national_id="30111222",
        sport="Judo",
        evidence_links=["https://example.com/ranking"],
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


def test_application_requires_at_least_one_evidence_link():
    with pytest.raises(ValidationError, match="evidence link is required"):
        ApplicationCreate(**_base_payload(date_of_birth=_years_ago(20), evidence_links=[]))


def test_application_rejects_blank_only_evidence_links():
    with pytest.raises(ValidationError, match="evidence link is required"):
        ApplicationCreate(**_base_payload(date_of_birth=_years_ago(20), evidence_links=["   "]))


def test_national_id_hash_is_stable_and_ignores_formatting():
    assert hash_national_id("30.111.222") == hash_national_id("30111222")


def test_national_id_hash_differs_for_different_ids():
    assert hash_national_id("30111222") != hash_national_id("30111223")
