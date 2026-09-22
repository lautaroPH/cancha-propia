-- Codeportistas — initial schema
-- Source of truth for the data model. FastAPI connects with the Supabase
-- service-role/direct connection string and enforces all access rules in
-- application code, so this file intentionally does not define RLS policies:
-- Next.js never talks to these tables directly, only through the API.

create extension if not exists pgcrypto;

create type athlete_status as enum ('pending', 'active', 'rejected', 'suspended');
create type campaign_status as enum ('draft', 'active', 'grace', 'closed', 'expired');
create type evidence_kind as enum ('id_document', 'federation_link', 'competition_result', 'ranking', 'photo', 'other');
create type report_status as enum ('open', 'resolved');

create table guardian (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  relationship text not null,
  email text not null,
  phone text,
  id_document_s3_key text,
  created_at timestamptz not null default now()
);

-- Mirrors Supabase auth.users for admins; keeps admin metadata out of the auth schema.
create table admin_user (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  full_name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table athlete (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique, -- set on approval: athlete's own account, or the guardian's if is_minor
  slug text not null unique,
  status athlete_status not null default 'pending',

  full_name text not null,
  date_of_birth date not null,
  is_minor boolean not null default false, -- recomputed by application code from date_of_birth, not DB-generated (current_date isn't immutable)

  province text,
  sport text not null,
  discipline text,
  category text,
  club text,
  federation text,
  federation_license_number text,

  bio text,
  story text,
  achievements jsonb not null default '[]'::jsonb, -- [{ "title": "...", "year": 2025, "description": "..." }]
  photo_s3_key text,

  guardian_id uuid references guardian(id),

  identity_verified boolean not null default false,
  identity_verified_at timestamptz,
  identity_verified_by uuid references admin_user(id),
  career_verified boolean not null default false,
  career_verified_at timestamptz,
  career_verified_by uuid references admin_user(id),
  competition_verified boolean not null default false,
  competition_verified_at timestamptz,
  competition_verified_by uuid references admin_user(id),
  next_review_due date,

  instagram_handle text,
  instagram_public boolean not null default false,
  whatsapp_number text,
  whatsapp_public boolean not null default false,
  alias text,
  cbu text,
  alias_public boolean not null default false,

  national_id_hash text, -- salted hash of athlete's (or guardian's, if minor) national ID, for duplicate detection
  contact_email text not null, -- login identity: athlete's email, or guardian's if is_minor

  rejection_reason text,
  admin_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index athlete_national_id_hash_idx on athlete (national_id_hash) where national_id_hash is not null;
create index athlete_status_idx on athlete (status);
create index athlete_sport_province_idx on athlete (sport, province);

create table campaign (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athlete(id) on delete cascade,
  status campaign_status not null default 'draft',
  title text not null,
  description text,
  event_date date,
  goal_amount_ars integer not null,
  raised_amount_ars integer, -- self-reported by athlete; never treated as verified
  grace_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaign_athlete_idx on campaign (athlete_id);
create index campaign_status_event_date_idx on campaign (status, event_date);

create table campaign_breakdown_item (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaign(id) on delete cascade,
  label text not null,
  amount_ars integer not null,
  sort_order integer not null default 0
);

create table evidence_file (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athlete(id) on delete cascade,
  kind evidence_kind not null,
  s3_key text not null,
  original_filename text,
  uploaded_at timestamptz not null default now()
);

create table report (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references athlete(id) on delete cascade,
  reason text not null,
  detail text,
  status report_status not null default 'open',
  resolved_by uuid references admin_user(id),
  resolved_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admin_user(id),
  athlete_id uuid references athlete(id),
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_athlete_idx on admin_audit_log (athlete_id);
