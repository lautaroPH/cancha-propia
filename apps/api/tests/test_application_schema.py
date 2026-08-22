from datetime import date, timedelta

import pytest
from pydantic import ValidationError

from app.core.security import hash_national_id
from app.schemas.schemas import ApplicationCreate, GuardianIn


def _base_payload(**overrides):
    payload = dict(
        full_name="Martina López",
        date_of_birth=date(2000, 1, 1),
        national_id="30111222",
        sport="Judo",
        contact_email="martina@example.com",
    )
    payload.update(overrides)
    return payload


def _years_ago(years: float) -> date:
    return date.today() - timedelta(days=int(years * 365.25))


def test_adult_application_does_not_require_guardian():
    app = ApplicationCreate(**_base_payload(date_of_birth=_years_ago(20)))
    assert app.guardian is None


def test_minor_application_requires_guardian():
    with pytest.raises(ValidationError, match="guardian is required"):
        ApplicationCreate(**_base_payload(date_of_birth=_years_ago(15)))


def test_minor_application_with_guardian_is_valid():
    app = ApplicationCreate(
        **_base_payload(
            date_of_birth=_years_ago(15),
            guardian=GuardianIn(
                full_name="Ana López",
                relationship="Madre",
                email="ana@example.com",
            ),
        )
    )
    assert app.guardian is not None
    assert app.guardian.email == "ana@example.com"


def test_national_id_hash_is_stable_and_ignores_formatting():
    assert hash_national_id("30.111.222") == hash_national_id("30111222")


def test_national_id_hash_differs_for_different_ids():
    assert hash_national_id("30111222") != hash_national_id("30111223")
