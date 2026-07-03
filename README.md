# Distributed Job Scheduler

A production-inspired distributed job scheduling platform for reliably executing asynchronous background jobs across multiple workers.

## Features

- **Auth & Project Management** — JWT-based authentication; organizations own projects; projects own queues.
- **Queue Management** — priority, concurrency limits, retry policy, pause/resume, live statistics.
- **Job Types** — immediate, delayed, scheduled, recurring (cron), and batch jobs via REST API.
- **Worker Service** — polls queues, atomically claims jobs (`SELECT ... FOR UPDATE SKIP LOCKED`), executes concurrently, sends heartbeats, supports graceful shutdown.
- **Job Lifecycle** — `Queued → Scheduled → Claimed → Running → Completed`, with retries and Dead Letter Queue (DLQ) for permanent failures.
- **Retry Strategies** — fixed delay, linear backoff, exponential backoff (configurable per queue).
- **Observability** — execution logs, retry history, worker assignment, timestamps, and metrics per job.

## Architecture

See `ARCHITECTURE.md` and `ER_DIAGRAM.md`.

## Tech Stack

- **Backend:** Node.js, Express, PostgreSQL
- **Auth:** JWT
- **Worker/Poller:** standalone Node processes polling the shared DB

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
git clone <repo-url>
cd backend
npm install
```

### Environment variables (`.env`)

```
DATABASE_URL=postgresql://<user>@localhost:5432/job_scheduler
JWT_SECRET=<your-secret>
PORT=3000
POLL_INTERVAL_MS=5000
```

### Database setup

```bash
psql -U <user> -c "CREATE DATABASE job_scheduler;"
psql -U <user> -d job_scheduler -f schema.sql
```

### Running the services

Each of these runs in its own terminal tab:

```bash
# API server
node src/index.js

# Worker (claims and executes jobs)
node src/workers/jobWorker.js

# Poller (promotes due delayed/scheduled/recurring jobs to queued)
node src/workers/scheduledPoller.js
```

### Verifying it works

1. Create a recurring job via the API.
2. Poller promotes it to `queued` when due.
3. Worker claims and executes it.
4. On success, it cycles back to `scheduled` for the next run.
5. On repeated failure past `max_retries`, it's moved to `dead_letter_queue`.

## API Documentation

See `API_DOCS.md`.

## Design Decisions

See `DESIGN_DECISIONS.md` for major trade-offs (atomic job claiming, retry backoff strategy, schema normalization choices).

## Testing

```bash
npm test
```

Covers: atomic job claiming (no double-execution under concurrent workers), retry/backoff calculation, recurring job cycle-back behavior, DLQ insertion on retry exhaustion.
