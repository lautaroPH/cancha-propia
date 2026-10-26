import pytest
from pydantic import ValidationError

from app.schemas.schemas import InviteCreate
from app.services.invites import hash_invite_token, new_invite_token


def test_invite_token_is_random_and_only_hash_is_derived():
    token_a, hash_a = new_invite_token()
    token_b, _ = new_invite_token()
    assert token_a != token_b
    assert hash_a == hash_invite_token(token_a)
    assert token_a not in hash_a


def test_invite_create_normalizes_instagram():
    invite = InviteCreate(
        full_name="Alexis Corrias",
        sport="Atletismo",
        instagram_handle="https://www.instagram.com/alexiscorrias_atl/",
        instagram_posts=["https://www.instagram.com/p/ABC123/?igsh=x", "https://www.instagram.com/p/ABC123/"],
    )
    assert invite.instagram_handle == "alexiscorrias_atl"
    assert invite.instagram_posts == ["https://www.instagram.com/p/ABC123/"]


def test_invite_create_rejects_unknown_fields():
    # No birth date, email or payment alias: those only come from the athlete.
    with pytest.raises(ValidationError):
        InviteCreate(full_name="X", sport="Judo", alias="robado.mp")
