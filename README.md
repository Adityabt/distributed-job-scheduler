
# Relay — Distributed Job Scheduler

A full-stack distributed job scheduler: create immediate, delayed, recurring, and batch jobs, and watch them get claimed, executed, retried with exponential backoff, and tracked through their full lifecycle.

## Architecture

- **API server** (Express + PostgreSQL) — auth, org/project/queue CRUD, job creation
- **Worker** (`src/workers/jobWorker.js`) — claims queued jobs, executes them, retries failures with exponential backoff, tracks execution history
- **Poller** (`src/workers/scheduledPoller.js`) — promotes due delayed/recurring jobs from `scheduled` to `queued`; recurring jobs cycle back to `scheduled` after each run
- **Frontend** (React + Vite) — dashboard for managing orgs/projects/queues/jobs

Three separate long-running processes: **server**, **worker**, **poller**. All three must be running for the system to actually process jobs.

## Local setup

```bash
# Backend
cd backend
npm install
cp .env.example .env   # set DATABASE_URL, JWT_SECRET
psql $DATABASE_URL -f schema.sql   # or your migration command

npm run dev        # API server
npm run worker     # in a separate terminal
npm run poller     # in a separate terminal

# Frontend
cd frontend
npm install
npm run dev
```

Add these to `backend/package.json` scripts if not already present:

```json
"worker": "node src/workers/jobWorker.js",
"poller": "node src/workers/scheduledPoller.js"
```

## Job lifecycle

`queued`/`scheduled` → `claimed` → `running` → `completed` | `failed` (retries with exponential backoff up to `max_attempts`) → `dead_letter` (after exhausting retries)

Recurring jobs return to `scheduled` after each successful run instead of terminating.

## Deployment

**Database:** any managed Postgres (Render, Railway, Supabase, Neon). Run your schema/migrations against it once.

**Backend (server + worker + poller):** these are 3 separate Node processes sharing the same codebase and `DATABASE_URL`. Simplest path — Render or Railway, since both support multiple services from one repo:

1. Push backend to GitHub.
2. Create 3 services from the same repo (Render: "Web Service" for the API, 2× "Background Worker" for worker/poller). Railway: same idea, 3 separate services.
3. Each service gets the same env vars: `DATABASE_URL`, `JWT_SECRET`.
4. Start commands: API → `npm run dev` (or `node src/app.js`/your entry file), worker → `npm run worker`, poller → `npm run poller`.
5. Only the API service needs a public port/URL — worker and poller run silently in the background with no HTTP endpoint.

**Frontend:** Vercel or Netlify, pointed at the `frontend/` folder.

1. Set build command `npm run build`, output dir `dist`.
2. Set an environment variable for your deployed API URL, and update `src/api/client.js`'s `API_BASE` to read from it (`import.meta.env.VITE_API_BASE`) instead of the hardcoded `localhost:5001`.
3. Deploy.

**Order matters:** deploy DB → backend (server+worker+poller) → get the live API URL → set it in frontend env → deploy frontend.

## Known limitations

- `executeJob()` simulates task execution (weighted random success/failure) rather than performing real work — the scheduler's job is dispatch/lifecycle management, not the task logic itself, matching how real schedulers (Sidekiq, Celery, BullMQ) separate these concerns.
- `job_executions` stores status and error message, not arbitrary output/results.
