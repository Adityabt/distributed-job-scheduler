const pool = require('../config/db');

async function createOrganization(req, res) {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO organizations (name, owner_id) VALUES ($1, $2) RETURNING *',
      [name, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function listOrganizations(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM organizations WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createProject(req, res) {
  const { organization_id, name } = req.body;

  if (!organization_id || !name) {
    return res.status(400).json({ error: 'organization_id and name are required' });
  }

  try {
    const org = await pool.query(
      'SELECT id FROM organizations WHERE id = $1 AND owner_id = $2',
      [organization_id, req.user.id]
    );

    if (org.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const result = await pool.query(
      'INSERT INTO projects (organization_id, name) VALUES ($1, $2) RETURNING *',
      [organization_id, name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A project with this name already exists in this organization' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function listProjects(req, res) {
  const { organization_id } = req.query;

  try {
    const result = await pool.query(
      `SELECT p.* FROM projects p
       JOIN organizations o ON p.organization_id = o.id
       WHERE o.owner_id = $1 ${organization_id ? 'AND p.organization_id = $2' : ''}
       ORDER BY p.created_at DESC`,
      organization_id ? [req.user.id, organization_id] : [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteOrganization(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const owns = await client.query(
      `SELECT id FROM organizations WHERE id = $1 AND owner_id = $2`,
      [id, req.user.id]
    );
    if (owns.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Organization not found' });
    }

    await client.query(
      `DELETE FROM jobs WHERE queue_id IN (
         SELECT q.id FROM queues q JOIN projects p ON q.project_id = p.id WHERE p.organization_id = $1
       )`,
      [id]
    );
    await client.query(
      `DELETE FROM queues WHERE project_id IN (SELECT id FROM projects WHERE organization_id = $1)`,
      [id]
    );
    await client.query(`DELETE FROM projects WHERE organization_id = $1`, [id]);
    await client.query(`DELETE FROM organizations WHERE id = $1`, [id]);

    await client.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

async function deleteProject(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const owns = await client.query(
      `SELECT p.id FROM projects p JOIN organizations o ON p.organization_id = o.id
       WHERE p.id = $1 AND o.owner_id = $2`,
      [id, req.user.id]
    );
    if (owns.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Project not found' });
    }

    await client.query(
      `DELETE FROM jobs WHERE queue_id IN (SELECT id FROM queues WHERE project_id = $1)`,
      [id]
    );
    await client.query(`DELETE FROM queues WHERE project_id = $1`, [id]);
    await client.query(`DELETE FROM projects WHERE id = $1`, [id]);

    await client.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

module.exports = { createOrganization, listOrganizations, createProject, listProjects, deleteOrganization, deleteProject };