# Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ ORGANIZATIONS : owns
    ORGANIZATIONS ||--o{ PROJECTS : contains
    PROJECTS ||--o{ QUEUES : contains
    QUEUES ||--o{ JOBS : contains
    QUEUES ||--o{ RETRY_POLICIES : configures
    JOBS ||--o{ JOB_EXECUTIONS : has
    JOBS ||--o{ JOB_LOGS : has
    JOBS ||--o{ SCHEDULED_JOBS : "has schedule"
    JOBS ||--o{ DEAD_LETTER_QUEUE : "moves to on failure"
    WORKERS ||--o{ JOB_EXECUTIONS : executes
    WORKERS ||--o{ WORKER_HEARTBEATS : sends

    USERS {
        uuid id PK
        string email
        string password_hash
        timestamp created_at
    }

    ORGANIZATIONS {
        uuid id PK
        uuid owner_id FK
        string name
        timestamp created_at
    }

    PROJECTS {
        uuid id PK
        uuid organization_id FK
        string name
        timestamp created_at
    }

    QUEUES {
        uuid id PK
        uuid project_id FK
        string name
        int priority
        int concurrency_limit
        boolean is_paused
        timestamp created_at
    }

    RETRY_POLICIES {
        uuid id PK
        uuid queue_id FK
        string strategy "fixed|linear|exponential"
        int base_delay_ms
        int max_retries
    }

    JOBS {
        uuid id PK
        uuid queue_id FK
        string type "immediate|delayed|scheduled|recurring|batch"
        string status "queued|scheduled|claimed|running|completed|failed"
        jsonb payload
        int attempts
        int max_retries
        timestamp run_at
        timestamp updated_at
        timestamp created_at
    }

    JOB_EXECUTIONS {
        uuid id PK
        uuid job_id FK
        uuid worker_id FK
        timestamp started_at
        timestamp finished_at
        string result_status
    }

    SCHEDULED_JOBS {
        uuid id PK
        uuid job_id FK
        string cron_expression
        timestamp next_run_at
    }

    WORKERS {
        uuid id PK
        string hostname
        timestamp registered_at
    }

    WORKER_HEARTBEATS {
        uuid id PK
        uuid worker_id FK
        timestamp sent_at
    }

    JOB_LOGS {
        uuid id PK
        uuid job_id FK
        string level
        text message
        timestamp created_at
    }

    DEAD_LETTER_QUEUE {
        uuid id PK
        uuid job_id FK
        text reason
        timestamp moved_at
    }
```

## Key design notes

- **Cascading:** deleting a `PROJECT` cascades to its `QUEUES`, which cascades to `JOBS` and `RETRY_POLICIES`. `JOB_EXECUTIONS`, `JOB_LOGS`, and `DEAD_LETTER_QUEUE` rows are retained (soft-referenced or `ON DELETE SET NULL`) for audit purposes rather than cascade-deleted, so history survives job cleanup.
- **Indexes:** composite index on `jobs(status, run_at)` is the critical one — both the poller (`WHERE status IN ('scheduled','delayed') AND run_at <= now()`) and the worker's claim query hit this. Also index `jobs(queue_id, status)` for per-queue stats, and `worker_heartbeats(worker_id, sent_at)` for stale-worker detection.
- **Normalization:** retry policy is factored out to `RETRY_POLICIES` (one per queue) rather than duplicated on every job row, since policy is a queue-level configuration.
- **JSONB payload:** job `payload` is stored as JSONB rather than a rigid schema, since job types (immediate/delayed/recurring/batch) carry different shapes of data.
