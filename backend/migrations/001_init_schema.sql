CREATE TYPE queue_status AS ENUM ('active', 'paused');
CREATE TYPE job_type AS ENUM ('immediate', 'delayed', 'scheduled', 'recurring', 'batch');
CREATE TYPE job_status AS ENUM ('queued', 'scheduled', 'claimed', 'running', 'completed', 'failed', 'dead_letter');
CREATE TYPE execution_status AS ENUM ('running', 'succeeded', 'failed');
CREATE TYPE worker_status AS ENUM ('idle', 'busy', 'offline');
CREATE TYPE log_level AS ENUM ('info', 'warn', 'error');
CREATE TYPE retry_strategy AS ENUM ('fixed', 'linear', 'exponential');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name)
);

CREATE TABLE queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    concurrency_limit INTEGER NOT NULL DEFAULT 5,
    status queue_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, name)
);

CREATE TABLE retry_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    strategy_type retry_strategy NOT NULL DEFAULT 'exponential',
    base_delay_seconds INTEGER NOT NULL DEFAULT 5,
    max_retries INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (queue_id)
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    type job_type NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status job_status NOT NULL DEFAULT 'queued',
    priority INTEGER NOT NULL DEFAULT 0,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    claimed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    run_at TIMESTAMPTZ,
    cron_expression VARCHAR(120),
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_id)
);

CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    hostname VARCHAR(255),
    status worker_status NOT NULL DEFAULT 'offline',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ
);

ALTER TABLE jobs
    ADD CONSTRAINT fk_jobs_claimed_by
    FOREIGN KEY (claimed_by) REFERENCES workers(id) ON DELETE SET NULL;

CREATE TABLE job_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    attempt_number INTEGER NOT NULL,
    status execution_status NOT NULL DEFAULT 'running',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE TABLE worker_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_execution_id UUID NOT NULL REFERENCES job_executions(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    level log_level NOT NULL DEFAULT 'info',
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    moved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_id)
);

CREATE INDEX idx_jobs_status ON jobs (status);
CREATE INDEX idx_jobs_queue_id ON jobs (queue_id);
CREATE INDEX idx_jobs_queue_status_priority ON jobs (queue_id, status, priority DESC);
CREATE INDEX idx_scheduled_jobs_next_run_at ON scheduled_jobs (next_run_at);
CREATE INDEX idx_job_executions_job_id ON job_executions (job_id);
CREATE INDEX idx_job_executions_worker_id ON job_executions (worker_id);
CREATE INDEX idx_worker_heartbeats_worker_id_time ON worker_heartbeats (worker_id, heartbeat_at DESC);
CREATE INDEX idx_job_logs_execution_id ON job_logs (job_execution_id);
CREATE INDEX idx_projects_org_id ON projects (organization_id);
CREATE INDEX idx_queues_project_id ON queues (project_id);
