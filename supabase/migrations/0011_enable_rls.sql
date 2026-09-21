-- CRITICAL: without RLS, Supabase's auto-generated PostgREST API serves
-- every row of every table to anyone holding the public anon key (shipped
-- in the frontend bundle) — no policies needed for that exposure, just the
-- absence of RLS. This app's entire authorization model lives in FastAPI
-- (get_current_athlete/get_current_admin, public/private field gating in
-- routers/*.py) and the backend connects as the `postgres` table owner,
-- which bypasses RLS regardless. So enabling RLS with zero policies is the
-- correct fix here: it default-denies the PostgREST/anon path completely
-- while leaving the backend, which is the only intended data path,
-- completely unaffected. Add real policies later only if something is
-- deliberately meant to be reachable directly from the frontend via
-- Supabase's client — nothing currently is.

alter table athlete enable row level security;
alter table campaign enable row level security;
alter table campaign_breakdown_item enable row level security;
alter table evidence_file enable row level security;
alter table report enable row level security;
alter table admin_user enable row level security;
alter table admin_audit_log enable row level security;
alter table sport_option enable row level security;
