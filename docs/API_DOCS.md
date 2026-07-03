# API Documentation

Base URL: `http://localhost:3000/api`
Auth: `Authorization: Bearer <jwt>` header on all endpoints except `/auth/*`

## Auth

### `POST /auth/register`
```json
{ "email": "user@example.com", "password": "••••••••" }
```
→ `201` `{ "id", "email", "token" }`

### `POST /auth/login`
```json
{ "email": "user@example.com", "password": "••••••••" }
```
→ `200` `{ "token" }`

## Projects

### `GET /projects`
Query params: `?page=1&limit=20`
→ `200` `{ "data": [...], "page": 1, "total": N }`

### `POST /projects`
```json
{ "name": "My Project" }
```
→ `201` project object

## Queues

### `POST /projects/:projectId/queues`
```json
{
  "name": "email-queue",
  "priority": 1,
  "concurrency_limit": 5,
  "retry_policy": { "strategy": "exponential", "base_delay_ms": 2000, "max_retries": 3 }
}
```
→ `201` queue object

### `PATCH /queues/:id/pause`
→ `200` `{ "id", "is_paused": true }`

### `PATCH /queues/:id/resume`
→ `200` `{ "id", "is_paused": false }`

### `GET /queues/:id/stats`
→ `200` `{ "queued", "running", "completed", "failed", "dead_lettered" }`

## Jobs

### `POST /queues/:queueId/jobs`
```json
{
  "type": "recurring",
  "payload": { "task": "send-digest" },
  "cron_expression": "0 * * * *"
}
```
Valid `type` values: `immediate`, `delayed`, `scheduled`, `recurring`, `batch`.
For `delayed`: include `run_at` (ISO timestamp). For `batch`: `payload` is an array.

→ `201` job object

### `GET /jobs/:id`
→ `200` job object with latest execution status

### `GET /queues/:queueId/jobs`
Query params: `?status=queued&page=1&limit=20`
→ `200` `{ "data": [...], "page": 1, "total": N }`

### `POST /jobs/:id/retry`
Manually re-queue a `failed` or dead-lettered job.
→ `200` job object with `status: "queued"`

### `GET /jobs/:id/executions`
Execution history for a job.
→ `200` `[{ "worker_id", "started_at", "finished_at", "result_status" }, ...]`

### `GET /jobs/:id/logs`
→ `200` `[{ "level", "message", "created_at" }, ...]`

## Dead Letter Queue

### `GET /queues/:queueId/dlq`
→ `200` `[{ "job_id", "failure_reason", "attempts", "failed_at" }, ...]`

### `POST /dlq/:id/requeue`
Moves a DLQ entry back into `queued` status for the original job.
→ `200` job object

## Workers

### `GET /workers`
→ `200` `[{ "id", "hostname", "registered_at", "last_heartbeat" }, ...]`

## Error format

All errors follow:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "field 'type' is required" } }
```

Standard HTTP status codes: `400` validation, `401` unauthenticated, `403` unauthorized, `404` not found, `409` conflict (e.g. re-claiming a claimed job), `500` server error.
