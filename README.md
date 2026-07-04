
# Relay — Distributed Job Scheduler

A full-stack distributed job scheduler: create immediate, delayed, scheduled, recurring,
and batch jobs, watch them get atomically claimed and executed, automatically retried
with configurable backoff, and tracked through their full lifecycle — all from a live
dashboard.

Built for the Codity.AI technical assignment.

## What's actually in this repo

- **API server** (Express + PostgreSQL) — auth, org/project/queue/job CRUD, ownership
  checks on every query
- **Job worker** (`backend/src/workers/jobWorker.js`) — atomically claims queued jobs
  (`SELECT ... FOR UPDATE SKIP LOCKED`), executes them, retries failures with
  fixed/linear/exponential backoff, moves permanently-failed jobs to a dead letter state
- **Scheduled poller** (`backend/src/workers/scheduledPoller.js`) — promotes due
  delayed/recurring jobs from `scheduled` to `queued`; recurring jobs cycle back to
  `scheduled` after each run instead of ever completing
- **Dashboard** (React + Vite) — manage organizations/projects/queues, create every job
  type, watch live status distribution, inspect a job's full execution history

See `docs/ARCHITECTURE.md` for how these three backend pieces fit together,
`docs/DESIGN_DECISIONS.md` for the reasoning behind the schema and concurrency choices,
`docs/ER_DIAGRAM.md` for the full data model, and `docs/API_DOCS.md` for every endpoint.

## How it actually runs

The API server, worker, and poller are three independent, decoupled processes — they
share nothing except the Postgres database. In this deployment they're started together
from one entry point (`backend/src/server.js`) purely for free-tier hosting simplicity
(splitting them into 3 separate Render services costs money on Render's plans). They can
be split into genuinely separate deployed services with no code changes — see
"Deployment" below.

## Local setup

```bash
# Database
createdb job_scheduler
psql -d job_scheduler -f backend/migrations/001_init_schema.sql

# Backend — starts the API server, worker, and poller together
cd backend
npm install
cp .env.example .env   # set DATABASE_URL and JWT_SECRET
npm run dev             # http://localhost:5001

# Frontend
cd frontend
npm install
npm run dev             # http://localhost:5173
```

`backend/.env` needs:

```
PORT=5001
DATABASE_URL=postgresql://<user>@localhost:5432/job_scheduler
JWT_SECRET=<any long random string>
```

## Job lifecycle

```
queued/scheduled → claimed → running → completed
                                     └→ failed → (retry w/ backoff) → scheduled → queued
                                              └→ dead_letter (after max_attempts)
```

Recurring jobs loop back to `scheduled` after every successful run instead of terminating.

## Deployment (as currently live)

- **Database:** managed Postgres (Render/Railway/Supabase/Neon)
- **Backend:** one Render Web Service running `node src/server.js`, which starts the
  API, worker, and poller together in-process. Env vars: `DATABASE_URL`, `JWT_SECRET`.
- **Frontend:** Vercel, pointed at `frontend/`, build command `npm run build`, output
  `dist`. Env var `VITE_API_URL` set to the deployed backend's URL
  (`frontend/src/api/client.js` reads this via `import.meta.env.VITE_API_URL`, falling
  back to `localhost:5001` for local dev).

To split the worker and poller into their own services later (recommended if this grows
beyond a free-tier demo): add `"worker": "node src/workers/jobWorker.js"` and
`"poller": "node src/workers/scheduledPoller.js"` as separate Render Background Workers
pointed at the same repo and `DATABASE_URL`, and remove the `startWorker()`/`startPoller()`
calls from `server.js`.

## Known limitations

- `executeJob()` simulates task execution (realistic delay, ~20% random failure) rather
  than performing real work — the scheduler's job is dispatch and lifecycle management,
  not the task logic itself, matching how Sidekiq/Celery/BullMQ separate these concerns.
- If a worker crashes mid-execution (after claiming, before finishing), that job has no
  automatic recovery — there's no reaper process that detects a stale claim via
  `workers.last_seen_at` and requeues it. Documented as a deliberate scoping decision in
  `docs/DESIGN_DECISIONS.md`, not an oversight.
- No manual "retry" action for a `dead_letter` job — creating a new job is the current
  path back in. See `docs/API_DOCS.md`'s "what's not exposed" section.
