const express = require('express');

const router = express.Router();
const db = require('../config/database');
const { auth, isAdmin } = require('../middleware/auth');
const { runQueuedJobs } = require('../utils/platformOps');

router.get('/audit', auth, isAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    const entityType = String(req.query.entityType || '').trim();
    const params = [];
    let sql = `
      SELECT
        sal.*,
        u.name AS changed_by_name,
        u.email AS changed_by_email
      FROM system_audit_log sal
      LEFT JOIN users u ON sal.changed_by = u.id
    `;

    if (entityType) {
      sql += db.client === 'postgres'
        ? ' WHERE sal.entity_type = $1'
        : ' WHERE sal.entity_type = ?';
      params.push(entityType);
    }

    sql += db.client === 'postgres'
      ? ` ORDER BY sal.created_at DESC LIMIT $${params.length + 1}`
      : ' ORDER BY sal.created_at DESC LIMIT ?';
    params.push(limit);

    const audit = await db.all(sql, params);
    res.json({ audit });
  } catch (error) {
    console.error('Ops audit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/jobs', auth, isAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    const status = String(req.query.status || '').trim();
    const params = [];
    let sql = 'SELECT * FROM job_queue';

    if (status) {
      sql += db.client === 'postgres'
        ? ' WHERE status = $1'
        : ' WHERE status = ?';
      params.push(status);
    }

    sql += db.client === 'postgres'
      ? ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
      : ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const jobs = await db.all(sql, params);
    res.json({ jobs });
  } catch (error) {
    console.error('Ops jobs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/jobs/run', auth, isAdmin, async (req, res) => {
  try {
    const result = await runQueuedJobs({
      workerName: `manual-${req.user.id}`,
      limit: Math.min(Math.max(Number(req.body?.limit || 20), 1), 100)
    });

    res.json(result);
  } catch (error) {
    console.error('Run jobs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/notifications/me', auth, async (req, res) => {
  try {
    const notifications = await db.all(
      `SELECT *
       FROM notification_inbox
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json({ notifications });
  } catch (error) {
    console.error('Get notification inbox error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
