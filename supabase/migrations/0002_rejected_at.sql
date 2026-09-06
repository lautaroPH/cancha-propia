-- Tracks when an athlete was last rejected, so the reapplication cooldown
-- (see app/routers/applications.py) has something concrete to measure from.
alter table athlete add column rejected_at timestamptz;
