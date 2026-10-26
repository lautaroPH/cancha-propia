import hashlib
import secrets


def new_invite_token() -> tuple[str, str]:
    """Returns (token, hash). The token goes into the link the admin sends;
    only the hash is stored, so the database alone can't produce a link."""
    token = secrets.token_urlsafe(24)
    return token, hash_invite_token(token)


def hash_invite_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()
