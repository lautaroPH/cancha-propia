-- Phase 5: raffle display block (external link only — plan explicitly cuts
-- an internal raffle system) and admin-managed sport list (so it's not
-- hardcoded in the frontend).

alter table athlete add column raffle_url text;
alter table athlete add column raffle_description text;
alter table athlete add column raffle_public boolean not null default false;

create table sport_option (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
