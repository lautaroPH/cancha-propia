"""Minimal in-process rate limiter — a single-instance sliding window keyed
by an arbitrary string (e.g. client IP). Resets on restart and doesn't share
state across multiple instances; fine for the current single-process scale.
Revisit with a Redis-backed limiter if this app ever runs more than one
instance behind a load balancer.
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone

_attempts: dict[str, list[datetime]] = defaultdict(list)


def check_rate_limit(key: str, max_attempts: int, window: timedelta) -> bool:
    """Records this attempt and returns False if `key` has exceeded
    `max_attempts` within `window`."""
    now = datetime.now(timezone.utc)
    recent = [t for t in _attempts[key] if now - t < window]
    recent.append(now)
    _attempts[key] = recent
    return len(recent) <= max_attempts
