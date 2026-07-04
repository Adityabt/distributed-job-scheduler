const pool = require('../config/db');
const { CronExpressionParser } = require('cron-parser');

async function verifyQueueOwnership(queueId, userId) {
  const result = await pool.query(
    `SELECT q.id FROM queues q
     JOIN projects p ON q.project_id = p.id
     JOIN organizations o ON p.organization_id = o.id
     WHERE q.id = $1 AND o.owner_id = $2`,
    [queueId, userId]
  );
  return result.rows.length > 0;
}

async function createJob(req, res) {
  const { queue_id, type, payload, priority, max_attempts, run_at, cron_expression } = req.body;

  if (!queue_id || !type) {
    return res.status(400).json({ error: 'queue_id and type are required' });
  }

  const validTypes = ['immediate', 'delayed', 'scheduled', 'recurring', 'batch'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
  }

  const owns = await verifyQueueOwnership(queue_id, req.user.id);
  if (!owns) {
    return res.status(404).json({ error: 'Queue not found' });
  }

  if ((type === 'delayed' || type === 'scheduled') && !run_at) {
    return res.status(400).json({ error: 'run_at is required for delayed/scheduled jobs' });
  }

  if (type === 'recurring' && !cron_expression) {
    return res.status(400).json({ error: 'cron_expression is required for recurring jobs' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const initialStatus = type === 'immediate' ? 'queued' : 'scheduled';

    const jobResult = await client.query(
      `INSERT INTO jobs (queue_id, type, payload, status, priority, max_attempts)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [queue_id, type, payload || {}, initialStatus, priority || 0, max_attempts || 3]
    );

    const job = jobResult.rows[0];

    if (type === 'delayed' || type === 'scheduled') {
      await client.query(
        `INSERT INTO scheduled_jobs (job_id, run_at, next_run_at) VALUES ($1, $2, $2)`,
        [job.id, run_at]
      );
    }

    if (type === 'recurring') {
      const interval = CronExpressionParser.parse(cron_expression);
      const nextRun = interval.next().toDate();

      await client.query(
        `INSERT INTO scheduled_jobs (job_id, cron_expression, next_run_at) VALUES ($1, $2, $3)`,
        [job.id, cron_expression, nextRun]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(job);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);

    if (err.message && err.message.includes('Invalid cron expression')) {
      return res.status(400).json({ error: 'Invalid cron_expression' });
    }

    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

async function createBatchJobs(req, res) {
  const { queue_id, jobs } = req.body;

  if (!queue_id || !Array.isArray(jobs) || jobs.length === 0) {
    return res.status(400).json({ error: 'queue_id and a non-empty jobs array are required' });
  }

  const owns = await verifyQueueOwnership(queue_id, req.user.id);
  if (!owns) {
    return res.status(404).json({ error: 'Queue not found' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const inserted = [];

    for (const item of jobs) {
      const result = await client.query(
        `INSERT INTO jobs (queue_id, type, payload, status, priority, max_attempts)
         VALUES ($1, 'batch', $2, 'queued', $3, $4) RETURNING *`,
        [queue_id, item.payload || {}, item.priority || 0, item.max_attempts || 3]
      );
      inserted.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json({ created: inserted.length, jobs: inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

async function listJobs(req, res) {
  const { queue_id, status, limit, offset } = req.query;

  if (!queue_id) {
    return res.status(400).json({ error: 'queue_id query param is required' });
  }

  const owns = await verifyQueueOwnership(queue_id, req.user.id);
  if (!owns) {
    return res.status(404).json({ error: 'Queue not found' });
  }

  try {
    const conditions = ['queue_id = $1'];
    const values = [queue_id];

    if (status) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    values.push(limit ? parseInt(limit) : 50);
    values.push(offset ? parseInt(offset) : 0);

    const result = await pool.query(
      `SELECT * FROM jobs WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'Invalid job id' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getJobDetail(req, res) {
  const { id } = req.params;

  try {
    const jobResult = await pool.query(
      `SELECT j.* FROM jobs j
       JOIN queues q ON j.queue_id = q.id
       JOIN projects p ON q.project_id = p.id
       JOIN organizations o ON p.organization_id = o.id
       WHERE j.id = $1 AND o.owner_id = $2`,
      [id, req.user.id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const executions = await pool.query(
      `SELECT * FROM job_executions WHERE job_id = $1 ORDER BY attempt_number ASC`,
      [id]
    );

    const schedule = await pool.query(
      `SELECT * FROM scheduled_jobs WHERE job_id = $1`,
      [id]
    );

    res.json({
      ...jobResult.rows[0],
      executions: executions.rows,
      schedule: schedule.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteJob(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM jobs j
       USING queues q, projects p, organizations o
       WHERE j.queue_id = q.id AND q.project_id = p.id AND p.organization_id = o.id
         AND j.id = $1 AND o.owner_id = $2
       RETURNING j.id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'Invalid job id' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}
module.exports = { createJob, createBatchJobs, listJobs, getJobDetail, deleteJob };