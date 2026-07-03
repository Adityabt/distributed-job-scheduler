# Design Decisions & Trade-offs

## 1. Postgres-only coordination (no Redis/Kafka)

**Decision:** Use PostgreSQL row-locking (`SELECT ... FOR UPDATE SKIP LOCKED`) for atomic job claiming instead of a dedicated message broker.

**Trade-off:** Simpler operational footprint (one datastore, one source of truth for state + queue), at the cost of higher DB load under very high job throughput compared to a purpose-built broker like Redis Streams or Kafka. Acceptable for this assignment's scale; a production system at high volume would likely split hot queue state into Redis while keeping Postgres as the durable log.

## 2. Polling over event-driven promotion

**Decision:** A separate poller process periodically scans for due `delayed`/`scheduled`/`recurring` jobs and promotes them to `queued`, rather than using DB triggers/LISTEN-NOTIFY or a timer-per-job.

**Trade-off:** Introduces up-to-`poll_interval` latency on job promotion, but is far simpler to reason about and debug than per-job timers, and scales fine since the promotion query is a single indexed range scan (`WHERE run_at <= now()`) rather than N individual timers.

## 3. Retry policy at queue level, not job level

**Decision:** `RETRY_POLICIES` is a queue-level table; individual jobs inherit their queue's strategy rather than each job carrying its own retry config.

**Trade-off:** Less flexibility for one-off custom retry behavior on a single job, but avoids duplicating policy data across potentially thousands of jobs and keeps retry behavior predictable per-queue, which matches how the assignment frames retry configuration as a queue property.

## 4. Recurring jobs cycle back to `scheduled`, not `completed`

**Decision:** On successful execution, a recurring job's status returns to `scheduled` (with an updated `run_at` for the next occurrence) instead of terminating at `completed`.

**Trade-off:** Requires care to avoid the job being mistaken for "done" in dashboards/queries — status alone doesn't distinguish "finished forever" from "finished this cycle." Mitigated by keeping `type = 'recurring'` visible alongside status, and by execution history (`JOB_EXECUTIONS`) recording each individual run separately from the parent job's current status.

## 5. Dead Letter Queue as a separate table, not a status-only flag

**Decision:** Permanently failed jobs are recorded in a dedicated `dead_letter_queue` table (`job_id`, `reason`, `moved_at`) in addition to marking `jobs.status = 'failed'`, rather than relying on the status flag alone.

**Trade-off:** Kept deliberately minimal — no payload snapshot or attempt-count duplication — since `jobs.attempt_count` and `job_executions` already retain that history via `job_id`. This avoids data duplication at the cost of requiring a join back to `jobs`/`job_executions` if full context is needed when inspecting a DLQ entry. Keeps the DLQ table cheap to query for "what failed and why" while the richer audit trail (attempts, timestamps, per-attempt errors) stays in `job_executions`.

## 6. JSONB for job payload

**Decision:** `jobs.payload` is JSONB rather than a fixed relational shape.

**Trade-off:** Loses some type safety and can't be indexed/queried as efficiently as normalized columns, but is necessary since `immediate`, `delayed`, `recurring`, and `batch` jobs all carry structurally different data — normalizing would require a job-type-specific table per type, adding significant schema complexity for little benefit at this scale.

## 7. JWT for auth, no session store

**Decision:** Stateless JWT auth rather than server-side sessions.

**Trade-off:** Simpler horizontal scaling (any API instance can validate a token without shared session state), at the cost of no immediate token revocation — mitigated by short token expiry.
