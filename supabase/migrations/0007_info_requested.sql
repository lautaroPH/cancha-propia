-- "Request more info" previously only wrote to admin_notes, which is
-- explicitly admin-only — the applicant never saw it and had no way to act
-- on it. These two columns are the athlete-visible version, cleared once
-- they resubmit.
alter table athlete add column info_requested_message text;
alter table athlete add column info_requested_at timestamptz;
