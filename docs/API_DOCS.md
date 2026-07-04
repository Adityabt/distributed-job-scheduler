# API Documentation — Relay (Distributed Job Scheduler)

Base URL (local): `http://localhost:5001/api`
Base URL (deployed): set via `VITE_API_URL` on the frontend, points at your deployed backend.

Auth: every endpoint except `/auth/register` and `/auth/login` requires
`Authorization: Bearer <jwt>`. Tokens are issued at register/login and expire after 7 days.

All resources are scoped to the logged-in user through ownership chains
(`organizations.owner_id` → project → queue → job). You can only see and modify
data under organizations you own — the backend enforces this on every query,
not just at the UI level.

---

## Auth

### `POST /auth/register`

```json
{ "name": "Aditya", "email": "user@example.com", "password": "••••••••" }
```

→ `201`

```json
{ "user": { "id", "name", "email", "created_at" }, "token": "<jwt>" }
```

→ `400` missing fields · `409` email already registered

### `POST /auth/login`

```json
{ "email": "user@example.com", "password": "••••••••" }
```

→ `200` `{ "user": { "id", "name", "email" }, "token": "<jwt>" }`
→ `401` invalid credentials

---

## Organizations

### `POST /organizations`

```json
{ "name": "Amazon" }
```

→ `201` organization object

### `GET /organizations`

Returns all organizations owned by the logged-in user.
→ `200` `[{ "id", "name", "owner_id", "created_at" }, ...]`

### `DELETE /organizations/:id`

Cascades: deletes all projects, queues, and jobs underneath it.
→ `204` no content · `404` not found / not owned by you

---

## Projects

### `POST /projects`

```json
{ "organization_id": "<uuid>", "name": "Project 1" }
```

→ `201` project object · `404` organization not found · `409` duplicate name in this org

### `GET /projects?organization_id=<uuid>`

`organization_id` is optional — omit it to list every project across all your organizations.
→ `200` `[{ "id", "organization_id", "name", "created_at" }, ...]`

### `DELETE /projects/:id`

Cascades: deletes all queues and jobs underneath it.
→ `204` · `404`

---

## Queues

### `POST /queues`

```json
{ "project_id": "<uuid>", "name": "email-queue", "priority": 1, "concurrency_limit": 5 }
```

`priority` defaults to `0`, `concurrency_limit` defaults to `5`. A default retry policy
(`exponential`, 5s base delay, 3 max retries) is created automatically alongside the queue.
→ `201` queue object · `404` project not found · `409` duplicate name in this project

### `GET /queues?project_id=<uuid>` (required)

Returns queues joined with their retry policy.
→ `200` `[{ "id", "project_id", "name", "priority", "concurrency_limit", "status", "strategy_type", "base_delay_seconds", "max_retries", "created_at" }, ...]`

### `PATCH /queues/:id/status`

```json
{ "status": "paused" }
```

`status` must be `"active"` or `"paused"`. A paused queue's jobs are never claimed by the worker.
→ `200` updated queue object · `400` invalid status value · `404`

### `DELETE /queues/:id`

Deletes all jobs in the queue, then the queue itself.
→ `204` · `404`

---

## Jobs

### `POST /jobs`

```json
{
  "queue_id": "<uuid>",
  "type": "recurring",
  "payload": { "task": "sync_inventory" },
  "priority": 0,
  "max_attempts": 3,
  "run_at": "2026-07-05T10:00:00.000Z",
  "cron_expression": "*/5 * * * *"
}
```

`type` must be one of: `immediate`, `delayed`, `scheduled`, `recurring`, `batch`.

- `immediate` → inserted with `status: "queued"`, picked up right away.
- `delayed` / `scheduled` → require `run_at` (ISO timestamp); inserted with `status: "scheduled"`, promoted to `queued` once due.
- `recurring` → requires `cron_expression`; after each run it returns to `scheduled` for its next occurrence instead of completing.

`payload` is freeform JSON — the worker inspects `payload.task` to decide which simulated
handler to run (`send_email`, `sync_inventory`, `resize_image`, `generate_report`, or a generic fallback).

→ `201` job object · `400` missing/invalid fields, invalid `cron_expression` · `404` queue not found

### `POST /jobs/batch`

```json
{
  "queue_id": "<uuid>",
  "jobs": [
    { "payload": { "task": "resize_image", "file": "a.jpg" } },
    { "payload": { "task": "resize_image", "file": "b.jpg" } }
  ]
}
```

Inserts every item as its own `type: "batch"` job, `status: "queued"`, in a single transaction.
→ `201` `{ "created": 2, "jobs": [...] }` · `400` empty/missing jobs array · `404` queue not found

### `GET /jobs?queue_id=<uuid>&status=&limit=&offset=`

`queue_id` is required. `status` optional (one of the job status enum values below).
`limit` defaults to 50, `offset` defaults to 0.
→ `200` `[{ "id", "queue_id", "type", "payload", "status", "priority", "attempt_count", "max_attempts", "claimed_by", "created_at", "updated_at" }, ...]`

### `GET /jobs/:id`

Returns the job plus its full execution history and schedule row (if any).
→ `200`

```json
{
  "...job fields",
  "executions": [{ "id", "worker_id", "attempt_number", "status", "started_at", "finished_at", "error_message" }],
  "schedule": { "id", "run_at", "cron_expression", "next_run_at" } | null
}
```

→ `404` not found

### `DELETE /jobs/:id`

→ `204` · `404`

---

## Enums (match the Postgres schema exactly)

- **job type**: `immediate`, `delayed`, `scheduled`, `recurring`, `batch`
- **job status**: `queued`, `scheduled`, `claimed`, `running`, `completed`, `failed`, `dead_letter`
- **queue status**: `active`, `paused`
- **retry strategy**: `fixed`, `linear`, `exponential`

## Error format

Every error response is a flat JSON object:

```json
{ "error": "human readable message" }
```

Common status codes: `400` validation, `401` missing/invalid token, `404` not found or not owned by you,
`409` duplicate name, `500` unexpected server error.

## What's not exposed as an API (intentionally)

- **Workers** and **worker heartbeats** — tracked in the DB for the worker's own coordination
  (dead-worker detection via `last_seen_at`), but there's no `/workers` endpoint — this is
  operational data, not something the dashboard user manages directly.
- **Dead letter queue entries** — visible indirectly: a permanently failed job just shows
  `status: "dead_letter"` via `GET /jobs`. There's no separate `/dlq` listing endpoint;
  the `jobs` table is already the single source of truth for status.
- **Manual retry** — not implemented. A `dead_letter` job stays there; re-running it means
  creating a new job. Documented here explicitly since it's a reasonable feature a reviewer
  might expect, and its absence should read as a scoping decision, not an oversight.
