const pool = require('../config/db');

async function createQueue(req, res) {
  const { project_id, name, priority, concurrency_limit } = req.body;

  if (!project_id || !name) {
    return res.status(400).json({ error: 'project_id and name are required' });
  }

  try {
    const projectCheck = await pool.query(
      `SELECT p.id FROM projects p
       JOIN organizations o ON p.organization_id = o.id
       WHERE p.id = $1 AND o.owner_id = $2`,
      [project_id, req.user.id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const result = await pool.query(
      `INSERT INTO queues (project_id, name, priority, concurrency_limit)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [project_id, name, priority || 0, concurrency_limit || 5]
    );

    await pool.query(
      `INSERT INTO retry_policies (queue_id, strategy_type, base_delay_seconds, max_retries)
       VALUES ($1, 'exponential', 5, 3)`,
      [result.rows[0].id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A queue with this name already exists in this project' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function listQueues(req, res) {
  const { project_id } = req.query;

  if (!project_id) {
    return res.status(400).json({ error: 'project_id query param is required' });
  }

  try {
    const result = await pool.query(
      `SELECT q.*, rp.strategy_type, rp.base_delay_seconds, rp.max_retries
       FROM queues q
       JOIN projects p ON q.project_id = p.id
       JOIN organizations o ON p.organization_id = o.id
       LEFT JOIN retry_policies rp ON rp.queue_id = q.id
       WHERE q.project_id = $1 AND o.owner_id = $2
       ORDER BY q.created_at DESC`,
      [project_id, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateQueueStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'paused'].includes(status)) {
    return res.status(400).json({ error: "status must be 'active' or 'paused'" });
  }

  try {
    const result = await pool.query(
      `UPDATE queues q SET status = $1
       FROM projects p, organizations o
       WHERE q.project_id = p.id AND p.organization_id = o.id
       AND q.id = $2 AND o.owner_id = $3
       RETURNING q.*`,
      [status, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { createQueue, listQueues, updateQueueStatus };