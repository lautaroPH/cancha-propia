-- Athletes feature a handful of their own Instagram posts/reels on their
-- public profile. Stored as canonical permalinks; the frontend renders them
-- through Instagram's /embed endpoint (no API token, no scraping).
alter table athlete add column instagram_posts jsonb not null default '[]'::jsonb;

-- Signup no longer collects a national ID (DNI) or ID photos. The column
-- stays nullable for rows created before this change; nothing writes it now.
comment on column athlete.national_id_hash is 'Legacy: only set on applications made before DNI collection was removed.';
