const express = require('express');

const router = express.Router();
const { auth } = require('../middleware/auth');
const { logSystemAudit } = require('../utils/platformOps');
const { captureMonitoringEvent } = require('../utils/monitoring');

router.post('/frontend-error', auth, async (req, res) => {
  try {
    const payload = {
      route: req.body?.route || null,
      userAgent: req.body?.userAgent || null,
      errorName: req.body?.errorName || null,
      message: req.body?.message || 'Unknown frontend error',
      stack: req.body?.stack || null
    };

    await logSystemAudit({
      entityType: 'frontend',
      entityId: req.user.id,
      action: 'client-error',
      summary: payload.message,
      details: payload,
      changedBy: req.user.id,
      requestId: req.requestId
    });

    await captureMonitoringEvent({
      source: 'frontend',
      message: payload.message,
      requestId: req.requestId,
      details: {
        userId: req.user.id,
        ...payload
      }
    });

    res.status(202).json({ accepted: true });
  } catch (error) {
    console.error('Frontend monitoring error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
