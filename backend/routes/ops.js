const express = require('express');

const router = express.Router();
const db = require('../config/database');
const { auth, isAdmin } = require('../middleware/auth');
const { runQueuedJobs } = require('../utils/platformOps');
const {
  getDeanOfficeReport,
  getFacultyOverviewReport,
  getNotifications,
  getOpsAudit,
  getPerformanceDashboard,
  getRiskFlags,
  markAllNotificationsRead,
  markNotificationRead
} = require('../services/opsAnalyticsService');
const { getServiceErrorStatus } = require('../services/serviceError');

const respondWithServiceError = (res, error, label) => {
  const status = getServiceErrorStatus(error);
  if (status) {
    return res.status(status).json({ error: error.message });
  }

  console.error(label, error);
  return res.status(500).json({ error: 'Server error' });
};

router.get('/audit', auth, isAdmin, async (req, res) => {
  try {
    const result = await getOpsAudit({
      entityType: req.query.entityType,
      limit: req.query.limit
    });
    res.json(result);
  } catch (error) {
    respondWithServiceError(res, error, 'Ops audit error:');
  }
});

router.get('/risk-flags', auth, async (req, res) => {
  try {
    const result = await getRiskFlags({
      user: req.user,
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit
    });
    res.json(result);
  } catch (error) {
    respondWithServiceError(res, error, 'Ops risk flags error:');
  }
});

router.get('/performance-dashboard', auth, async (req, res) => {
  try {
    const result = await getPerformanceDashboard({
      user: req.user,
      from: req.query.from,
      to: req.query.to
    });
    res.json(result);
  } catch (error) {
    respondWithServiceError(res, error, 'Ops performance dashboard error:');
  }
});

router.get('/reports/faculty-overview', auth, isAdmin, async (req, res) => {
  try {
    const result = await getFacultyOverviewReport({
      user: req.user,
      from: req.query.from,
      to: req.query.to
    });
    res.json(result);
  } catch (error) {
    respondWithServiceError(res, error, 'Faculty overview report error:');
  }
});

router.get('/reports/dean-office', auth, isAdmin, async (req, res) => {
  try {
    const result = await getDeanOfficeReport({
      user: req.user,
      from: req.query.from,
      to: req.query.to
    });
    res.json(result);
  } catch (error) {
    respondWithServiceError(res, error, 'Dean office report error:');
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
    respondWithServiceError(res, error, 'Ops jobs error:');
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
    respondWithServiceError(res, error, 'Run jobs error:');
  }
});

router.get('/notifications/me', auth, async (req, res) => {
  try {
    const result = await getNotifications(req.user.id);
    res.json(result);
  } catch (error) {
    respondWithServiceError(res, error, 'Get notification inbox error:');
  }
});

router.patch('/notifications/me/read-all', auth, async (req, res) => {
  try {
    const result = await markAllNotificationsRead(req.user.id);
    res.json(result);
  } catch (error) {
    respondWithServiceError(res, error, 'Mark all notifications read error:');
  }
});

router.patch('/notifications/:id/read', auth, async (req, res) => {
  try {
    const result = await markNotificationRead({
      userId: req.user.id,
      notificationId: req.params.id
    });
    res.json(result);
  } catch (error) {
    respondWithServiceError(res, error, 'Mark notification read error:');
  }
});

module.exports = router;
