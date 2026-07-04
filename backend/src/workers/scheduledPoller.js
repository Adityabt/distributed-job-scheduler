const pool = require('../config/db');
const { CronExpressionParser } = require('cron-parser');

const POLL_INTERVAL_MS = 5000;

async function promoteDueJobs() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const due = await client.query(
      `SELECT sj.id AS schedule_id, sj.job_id, sj.cron_expression, j.type
       FROM scheduled_jobs sj
       JOIN jobs j ON j.id = sj.job_id
       WHERE sj.next_run_at <= now()
         AND j.status = 'scheduled'
       FOR UPDATE OF sj SKIP LOCKED`
    );

    for (const row of due.rows) {
      await client.query(
        `UPDATE jobs SET status = 'queued', updated_at = now() WHERE id = $1`,
        [row.job_id]
      );

      if (row.type === 'recurring' && row.cron_expression) {
        const interval = CronExpressionParser.parse(row.cron_expression);
        const nextRun = interval.next().toDate();
        await client.query(
          `UPDATE scheduled_jobs SET next_run_at = $1 WHERE id = $2`,
          [nextRun, row.schedule_id]
        );
      }

      console.log(`[poller] Promoted job ${row.job_id} (${row.type}) to queued`);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[poller] Error promoting jobs:', err);
  } finally {
    client.release();
  }
}

async function runPoller() {
  console.log(`[poller] Started, checking every ${POLL_INTERVAL_MS}ms`);
  while (true) {
    await promoteDueJobs();
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

if (require.main === module) {
  runPoller();
}

module.exports = { startPoller: runPoller };