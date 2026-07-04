
# Architecture — Relay (Distributed Job Scheduler)

## System overview

Relay is three independent Node.js processes sharing one Postgres database, plus a
React dashboard. Nothing talks directly process-to-process — Postgres is the only
shared state, which is what makes the workers horizontally scalable (see below).

```
                        ┌─────────────────────┐
                        │   React Dashboard    │
                        │   (Vite, deployed    │
                        │    on Vercel)        │
                        └──────────┬───────────┘
                                   │ HTTPS / JSON
                                   ▼
                        ┌─────────────────────┐
                        │    API Server        │
                        │  (Express, port 5001)│
                        │  auth · CRUD ·       │
                        │  job creation        │
                        └──────────┬───────────┘
                                   │
                 ┌─────────────────┼─────────────────┐
                 ▼                 ▼                 ▼
        ┌────────────────┐ ┌──────────────┐  ┌──────────────┐
        │   PostgreSQL    │ │  Job Worker   │  │  Scheduled   │
        │  (single shared │◄┤  (claims,     │  │  Poller      │
        │   source of     │ │   executes,   │  │  (promotes   │
        │   truth)        │ │   retries)    │  │  due jobs)   │
        └────────────────┘ └──────────────┘  └──────────────┘
```

## The three backend processes

### 1. API server (`src/server.js` → `src/app.js`)

Handles everything synchronous: register/login, org/project/queue/job CRUD, and reading
job status/history for the dashboard. Stateless — every request re-derives ownership
from the database (`organizations.owner_id` → project → queue → job), so it can be
scaled to multiple instances behind a load balancer with no code changes.

### 2. Job worker (`src/workers/jobWorker.js`)

An infinite loop, polling every 3 seconds:

1. **Claim** — atomically grab one `queued` job using
   `SELECT ... FOR UPDATE OF j SKIP LOCKED`, ordered by priority then age.
   `SKIP LOCKED` is what makes this safe to run **multiple worker instances at once** —
   if worker A has a row locked, worker B's query simply skips it instead of blocking
   or double-claiming it. This is the core answer to the assignment's "atomic claiming"
   requirement.
2. **Execute** — `executeJob()` simulates the actual task (3–5 second delay, ~20%
   random failure rate) based on `payload.task`. This is intentionally a stand-in:
   a real scheduler's job is dispatch and lifecycle management, not the business logic
   of the task itself — same separation Sidekiq/Celery/BullMQ make.
3. **Resolve** — on success, job becomes `completed` (or cycles back to `scheduled` if
   `recurring`). On failure, `job_executions` gets a row, and either the job is
   rescheduled with backoff (fixed/linear/exponential, per the queue's retry policy) or,
   after `max_attempts`, moved to `status: dead_letter` with a row in `dead_letter_queue`.
4. **Heartbeat** — every 10 seconds, updates `workers.last_seen_at` so a stalled/crashed
   worker is detectable (even though there's no `/workers` API surfacing this today —
   see API_DOCS.md's "not exposed" section).

### 3. Scheduled poller (`src/workers/scheduledPoller.js`)

A separate infinite loop, every 5 seconds, doing one job: find rows in `scheduled_jobs`
where `next_run_at <= now()` and their parent job is still `status: scheduled`, then flip
that job to `queued` (so the worker picks it up) using the same `SKIP LOCKED` pattern.
For `recurring` jobs, it also computes the next cron occurrence and updates `next_run_at`
so the cycle continues indefinitely.

**Why a separate process from the worker**, instead of one loop doing both: the poller's
job (time-based promotion) and the worker's job (claim-execute-retry) have different
concerns and different failure modes — bundling them would mean a slow/stuck job
execution could delay scheduled-job promotion, or vice versa. Splitting them means either
can be scaled or restarted independently.

**In this deployment**, all three (API, worker, poller) are started from the same
`server.js` entry point in a single process, for free-tier hosting simplicity — Render's
free tier doesn't support multiple services per project without cost. Architecturally
they're still fully independent (no shared in-memory state, only the DB), so splitting
them into 3 separate deployed services later is a one-line change (see README's
deployment section) — not a redesign.

## Concurrency & reliability mechanisms (the assignment's core evaluation criteria)

| Requirement                       | How it's implemented                                                                                                                                                                      |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No two workers claim the same job | `SELECT ... FOR UPDATE OF j SKIP LOCKED` in `claimJob()`                                                                                                                              |
| Priority-ordered dispatch         | `ORDER BY priority DESC, created_at ASC` in the claim query                                                                                                                             |
| Retry with backoff                | `computeBackoffSeconds()` — fixed/linear/exponential, configurable per queue via `retry_policies`                                                                                    |
| Permanent failure handling        | After`max_attempts`, job → `dead_letter`, row inserted into `dead_letter_queue`                                                                                                    |
| Recurring jobs don't terminate    | On success,`recurring` jobs return to `scheduled` instead of `completed`, with a freshly computed `next_run_at`                                                                   |
| Crash/dead worker detection       | `workers.last_seen_at`, updated via heartbeat every 10s (detection logic itself isn't automated — no process currently reaps stale `claimed` jobs, documented as a known limitation) |
| Multi-tenant data isolation       | Every query joins up through`organizations.owner_id`, not just checked at the API boundary                                                                                              |

## Known limitation worth stating explicitly

If a worker crashes **mid-execution** (after claiming a job but before finishing it),
that job stays `status: running` or `claimed` indefinitely — there's no separate reaper
process that detects a stale claim (via `worker.last_seen_at` going quiet) and requeues
it. This is a common real-world scheduler feature (Sidekiq calls this "orphan job
recovery") that's out of scope here but worth naming as a next step rather than leaving
implicit.

## Frontend architecture

React (Vite) with a hooks-per-resource pattern: `useOrganizations`, `useProjects`,
`useQueues`, `useJobs` each own their piece of API state and expose CRUD functions —
no component calls `fetch` directly. `AuthContext` and `ToastContext` hold cross-cutting
state so it isn't prop-drilled. See `frontend/src/` for the full component tree.
