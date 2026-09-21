import uuid

import boto3

from app.core.config import settings

_client = None


def client():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id or None,
            aws_secret_access_key=settings.aws_secret_access_key or None,
        )
    return _client


def build_key(prefix: str, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    return f"{prefix}/{uuid.uuid4()}.{ext}"


def presigned_upload_post(
    key: str, content_type: str, max_bytes: int, expires_in: int = 900, encrypt: bool = False
) -> dict:
    """A presigned POST (not PUT) — the `content-length-range` policy condition
    that actually caps upload size only exists on this form, not on a simple
    presigned PUT URL. Returns {"url": ..., "fields": {...}}; the caller POSTs
    a multipart form with those fields plus the file itself (must be the last
    field — see api.ts)."""
    fields = {"Content-Type": content_type}
    conditions = [{"Content-Type": content_type}, ["content-length-range", 1, max_bytes]]
    if encrypt:
        # SSE-S3 (AES256) needs no bucket-level permission — unlike a bucket-default
        # encryption policy, this only requires the caller's existing s3:PutObject grant.
        fields["x-amz-server-side-encryption"] = "AES256"
        conditions.append({"x-amz-server-side-encryption": "AES256"})
    return client().generate_presigned_post(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Fields=fields,
        Conditions=conditions,
        ExpiresIn=expires_in,
    )


def public_url(key: str | None) -> str | None:
    if not key:
        return None
    # Seed/dev data can point photo_s3_key straight at an external image
    # instead of a real upload — pass it through unchanged.
    if key.startswith("http://") or key.startswith("https://"):
        return key
    return f"https://{settings.s3_bucket_name}.s3.{settings.aws_region}.amazonaws.com/{key}"


def presigned_read_url(key: str, expires_in: int = 900) -> str:
    """For private objects (evidence/ID docs) — admin-only access, never public_url."""
    return client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )
