-- Same gap as info_requested_message: suspend only wrote to admin_notes,
-- which is admin-only — the athlete was never told why their live profile
-- disappeared. Athlete-visible fields, cleared on reactivation.
alter table athlete add column suspended_reason text;
alter table athlete add column suspended_at timestamptz;
