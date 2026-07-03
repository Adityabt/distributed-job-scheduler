const pool = require('../config/db');

const os = require('os');

const POLL_INTERVAL_MS = 3000;
const HEARTBEAT_INTERVAL_MS = 10000;
const WORKER_LABEL = `worker-${process.pid}`;
let WORKER_UUID = null; // set after registration

async function registerWorker() {
  const result = await pool.query(
    `INSERT INTO workers (name, hostname, status, last_seen_at)
     VALUES ($1, $2, 'idle', now()) RETURNING id`,
    [WORKER_LABEL, os.hostname()]
  );
  WORKER_UUID = result.rows[0].id;
  console.log(`[${WORKER_LABEL}] Registered as worker ${WORKER_UUID}`);
}

async function heartbeat() {
  try {
    await pool.query(
      `UPDATE workers SET last_seen_at = now(), status = 'idle' WHERE id = $1`,
      [WORKER_UUID]
    );
  } catch (err) {
    console.error(`[${WORKER_LABEL}] Heartbeat failed:`, err.message);
  }
}

async function deregisterWorker() {
  if (!WORKER_UUID) return;
  try {
    await pool.query(`UPDATE workers SET status = 'offline' WHERE id = $1`, [WORKER_UUID]);
  } catch (err) {
    console.error(`[${WORKER_LABEL}] Deregister failed:`, err.message);
  }
}

async function claimJob() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT j.*, rp.strategy_type, rp.base_delay_seconds
       FROM jobs j
       JOIN queues q ON j.queue_id = q.id
       LEFT JOIN retry_policies rp ON rp.queue_id = q.id
       WHERE j.status = 'queued'
       ORDER BY j.priority DESC, j.created_at ASC
       LIMIT 1
       FOR UPDATE OF j SKIP LOCKED`
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const job = result.rows[0];

    await client.query(
      `UPDATE jobs SET status = 'running', claimed_by = $1, updated_at = now() WHERE id = $2`,
      [WORKER_UUID, job.id]
    );

    await client.query('COMMIT');
    return job;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function executeJob(job) {
  // Simulated execution — real task logic would dispatch based on payload.task
  const shouldFail = Math.random() < 0.2; // 20% simulated failure rate
  await new Promise((r) => setTimeout(r, 500));
  if (shouldFail) throw new Error('Simulated task failure');
  return { output: `Processed ${job.payload?.task || 'job'}` };
}

function computeBackoffSeconds(strategyType, baseDelay, attemptNumber) {
  const delay = baseDelay || 5;
  if (strategyType === 'exponential') {
    return delay * Math.pow(2, attemptNumber - 1);
  }
  if (strategyType === 'linear') {
    return delay * attemptNumber;
  }
  return delay; // fixed
}

async function handleSuccess(job, result) {
  await pool.query(
    `UPDATE jobs SET status = 'completed', updated_at = now() WHERE id = $1`,
    [job.id]
  );
  await pool.query(
    `INSERT INTO job_executions (job_id, worker_id, attempt_number, status, started_at, finished_at)
     VALUES ($1, $2, $3, 'succeeded', now(), now())`,
    [job.id, WORKER_UUID, job.attempt_count + 1]
  );
}

async function handleFailure(job, err) {
  const newAttemptCount = job.attempt_count + 1;

  await pool.query(
    `INSERT INTO job_executions (job_id, worker_id, attempt_number, status, error_message, started_at, finished_at)
     VALUES ($1, $2, $3, 'failed', $4, now(), now())`,
    [job.id, WORKER_UUID, newAttemptCount, err.message]
  );

  if (newAttemptCount >= job.max_attempts) {
    await pool.query(
      `UPDATE jobs SET status = 'failed', attempt_count = $1, updated_at = now() WHERE id = $2`,
      [newAttemptCount, job.id]
    );
    console.log(`[${WORKER_LABEL}] Job ${job.id} permanently failed after ${newAttemptCount} attempts`);
    return;
  }

  const delaySeconds = computeBackoffSeconds(job.strategy_type, job.base_delay_seconds, newAttemptCount);
  const nextRunAt = new Date(Date.now() + delaySeconds * 1000);

  await pool.query(
    `UPDATE jobs SET status = 'scheduled', attempt_count = $1, claimed_by = NULL, updated_at = now() WHERE id = $2`,
    [newAttemptCount, job.id]
  );

  await pool.query(
    `INSERT INTO scheduled_jobs (job_id, run_at, next_run_at)
     VALUES ($1, $2, $2)
     ON CONFLICT (job_id) DO UPDATE SET run_at = $2, next_run_at = $2`,
    [job.id, nextRunAt]
  );

  console.log(`[${WORKER_LABEL}] Job ${job.id} failed, retrying in ${delaySeconds}s (attempt ${newAttemptCount}/${job.max_attempts})`);
}

async function runLoop() {
  await registerWorker();
  console.log(`[${WORKER_LABEL}] Worker started, polling every ${POLL_INTERVAL_MS}ms`);

  setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

  process.on('SIGINT', async () => {
    console.log(`[${WORKER_LABEL}] Shutting down...`);
    await deregisterWorker();
    process.exit(0);
  });

  while (true) {
    try {
      const job = await claimJob();

      if (job) {
        console.log(`[${WORKER_LABEL}] Claimed job ${job.id} (${job.type})`);
        try {
          const result = await executeJob(job);
          await handleSuccess(job, result);
          console.log(`[${WORKER_LABEL}] Job ${job.id} completed`);
        } catch (err) {
          await handleFailure(job, err);
        }
      }
    } catch (err) {
      console.error(`[${WORKER_LABEL}] Worker loop error:`, err);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

runLoop();