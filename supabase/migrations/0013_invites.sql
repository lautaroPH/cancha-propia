-- Admin-prepared profile drafts that a real athlete claims through a private
-- link. An invited draft has no login (auth_user_id), no contact email and
-- possibly no birth date yet — the athlete supplies those when claiming,
-- which moves the row to 'pending' for normal review. Invited rows are never
-- listed publicly (the directory only serves status = 'active').
alter type athlete_status add value if not exists 'invited';

alter table athlete alter column contact_email drop not null;
alter table athlete alter column date_of_birth drop not null;

-- Only a SHA-256 of the token is stored: the link itself is shown to the
-- admin once, so a database leak can't be turned into claimable links.
alter table athlete add column invite_token_hash text unique;
alter table athlete add column invite_created_at timestamptz;
