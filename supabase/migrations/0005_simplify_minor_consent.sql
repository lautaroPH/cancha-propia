-- Simplifies minor handling: the guardian is no longer a separate account
-- that controls the profile — the minor manages their own account, and the
-- guardian's role is reduced to what's legally load-bearing: an email and a
-- one-time consent, captured at application time. See plan discussion —
-- the original full guardian-account design was judged too much complexity
-- for the trust value it added before real ID verification exists.

alter table athlete drop column guardian_id;
drop table if exists guardian;

alter table athlete add column guardian_email text;
alter table athlete add column guardian_consent_at timestamptz;
