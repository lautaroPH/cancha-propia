# Codeportistas

Discovery and trust platform for Argentine high-performance athletes. See the
[product plan](https://claude.ai/code/artifact/9924618e-4080-42f6-946a-68f825e99634) for the
full MVP scope, verification model, and roadmap.

## Stack

- `apps/web` — Next.js 16 (App Router), the public directory/profile pages and the athlete application form.
- `apps/api` — FastAPI, owns all business logic (verification, campaigns, duplicate detection).
- **Postgres**, hosted on **Supabase** — schema lives in `supabase/migrations/`.
- **S3** (not Supabase Storage) for photos/video/evidence files — kept in a separate account/bucket
  from the database on purpose, so the evidence bucket's access policy isn't tied to the public data project.

Phase 1 has no auth wired up yet (that's Phase 2) — the public application form writes directly to
Postgres, and publishing a profile is done via the seed script below rather than an admin UI.

## One-time setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
3. Copy your connection string from **Settings → Database** (use the "Session pooler" or direct
   connection string, not the pgbouncer transaction-mode one — SQLAlchemy needs a stable connection
   for this app's usage pattern). Rewrite it to use the `asyncpg` driver, e.g.:
   `postgresql+asyncpg://postgres:[password]@[host]:5432/postgres`

### 2. S3 bucket

Create a bucket (any AWS account) for uploads. Public-read is fine for photos; keep evidence/ID
uploads under a prefix you don't expose via `public_url` (see `apps/api/app/services/s3.py`) — Phase 1
doesn't wire up uploads yet, this just gets the bucket ready for Phase 2.

### 3. Backend

```bash
cd apps/api
python -m venv .venv
.venv/Scripts/pip install -r requirements-dev.txt   # includes test deps
cp .env.example .env   # fill in DATABASE_URL, AWS keys
.venv/Scripts/python -m app.seed                     # publishes sample athlete "martina-lopez"
.venv/Scripts/uvicorn app.main:app --reload --port 8000
```

Run the tests with `.venv/Scripts/python -m pytest tests/ -q`.

### 4. Frontend

```bash
cd apps/web
npm install
cp .env.local.example .env.local
npm run dev
```

Visit `http://localhost:3000` — you should see the seeded athlete in the directory, and
`http://localhost:3000/athletes/martina-lopez` should render her full profile.
`http://localhost:3000/apply` is the public application form (writes a `pending` athlete row;
there's no admin queue yet to approve it — that's Phase 2).

## Repo layout

```
apps/
  web/    Next.js frontend
  api/    FastAPI backend
supabase/
  migrations/   SQL schema, source of truth for the data model
```
