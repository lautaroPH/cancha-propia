"""Generates a ready-to-use login link without sending an email — bypasses
Supabase's email rate limit entirely, since no email is sent. Local dev only;
never expose this capability to the running API.

Usage: python -m app.dev_login_link --email you@example.com [--next /dashboard]
"""

import argparse
import json
import urllib.error
import urllib.request

from app.core.config import settings


def generate_link(email: str, next_path: str) -> str:
    redirect_to = f"http://localhost:3000/auth/confirm?next={next_path}"
    payload = json.dumps(
        {"type": "magiclink", "email": email, "options": {"redirect_to": redirect_to}}
    ).encode()

    req = urllib.request.Request(
        f"{settings.supabase_url}/auth/v1/admin/generate_link",
        data=payload,
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            body = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"Supabase rejected the request ({exc.code}): {exc.read().decode()}") from exc

    # The raw GoTrue endpoint's exact shape isn't pinned down here — try the
    # documented spots, else dump the body so it's obvious what came back.
    link = body.get("action_link") or body.get("properties", {}).get("action_link")
    if not link:
        raise SystemExit(f"No action_link in response, here's the raw body:\n{json.dumps(body, indent=2)}")
    return link


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--next", default="/dashboard", dest="next_path")
    args = parser.parse_args()

    link = generate_link(args.email, args.next_path)
    print("\nOpen this in your browser (works once, like a normal magic link):\n")
    print(link)
    print()
