# Design Decisions — Relay (Distributed Job Scheduler)

## Why PostgreSQL over MongoDB

The assignment explicitly asks for a normalized relational schema with primary keys,
foreign keys, indexes, and defined cascading behavior. Postgres also gives row-level
locking (`SELECT ... FOR UPDATE SKIP LOCKED`) as a built-in, correct answer to atomic
job claiming — no need to bolt on a separate distributed lock (Redis, etc.) for that
specific problem. Mongo would have meant simulating relational constraints by hand.

## Why UUIDs instead of auto-incrementing integers

In a system with multiple worker processes inserting/updating concurrently, UUIDs can
be generated anywhere without coordinating on "what's the next number" — no risk of
collision, and IDs don't leak information (e.g., total row count) the way sequential
integers do.

## Why a separate `job_executions` table instead of just fields on `jobs`

A job can fail and retry multiple times. If retry data lived directly on the `jobs` row,
each retry would overwrite the last — you'd lose history of *why* attempt 1 and attempt 2
failed. Splitting executions into their own table (one row per attempt) preserves full
retry history, which is what `GET /jobs/:id` surfaces in the dashboard's job detail view.

## Why `scheduled_jobs` is separate from `jobs`

An `immediate` job never needs a `run_at`, `cron_expression`, or `next_run_at` — adding
those columns directly to `jobs` would mean most rows have them permanently null. Keeping
schedule-specific data in its own table (joined only when relevant) keeps `jobs` lean and
keeps the "does this job have scheduling info" check explicit (`schedule: null` in the API
response) rather than implicit via null-checking three unrelated columns.

## Why `SELECT ... FOR UPDATE OF j SKIP LOCKED` for claiming, instead of an `UPDATE ... RETURNING`

Both are valid atomic-claim patterns. `SKIP LOCKED` was chosen because it generalizes
better once you add ordering logic (`ORDER BY priority DESC, created_at ASC`) — the
worker needs to inspect several candidate rows and pick the best one under lock, not just
blindly flip the first match. It's also the textbook Postgres pattern for this exact
"job queue" use case, so it reads clearly to anyone reviewing the code.

## Why retry backoff is configurable per queue, not per job

Different queues represent different kinds of work with different tolerance for delay —
an `email-queue` might want fast retries, a `report-generation` queue might want long
exponential backoff to avoid hammering a slow downstream service. Putting the policy on
the queue (defaulted at creation, but a `retry_policies` row is one-to-one with a queue)
means every job in that queue inherits sensible behavior without having to specify it
per job.

## Why recurring jobs cycle back to `scheduled` instead of ever reaching `completed`

A recurring job (e.g., "sync inventory every 5 minutes") conceptually never "finishes" —
each run is one occurrence of an ongoing schedule. Marking it `completed` after the first
run would be misleading and would require creating a brand new job row for every future
occurrence, losing the job's history and identity. Instead, the worker resets it to
`scheduled` with a freshly computed `next_run_at`, and the poller picks it back up.

## Why the worker and poller are separate loops, not one combined process

They solve different problems (time-based promotion vs. claim-execute-retry) with
different polling intervals and different failure surfaces. If job execution stalls
(e.g., a task taking unusually long), a combined loop would also delay promoting other
scheduled jobs — an unrelated concern. Splitting them means either can be scaled,
restarted, or reasoned about independently, even though this deployment currently runs
both inside the same process for hosting simplicity (see ARCHITECTURE.md).

## Why job execution is simulated rather than running real tasks

The assignment is evaluating scheduler mechanics — dispatch, retries, concurrency,
lifecycle — not any particular business task. `executeJob()` uses `payload.task` to pick
a simulated handler with a realistic delay and a deliberate ~20% failure rate specifically
so retry/backoff/dead-letter behavior is visibly exercisable in the dashboard, rather than
requiring you to wire up a real failing dependency (e.g., an email provider) just to see
the failure path work.

## Trade-off acknowledged: no automatic recovery for a worker that dies mid-job

If a worker crashes after claiming a job but before finishing it, that job is stuck in
`claimed`/`running` with no automatic reaper reclaiming it (see ARCHITECTURE.md's "Known
limitation"). This was scoped out deliberately to prioritize getting the core claim →
execute → retry → dead-letter cycle fully correct within the time available, rather than
implementing a second recovery mechanism half-correctly. Framed as a next step if this
were taken further, not something overlooked and unmentioned.
