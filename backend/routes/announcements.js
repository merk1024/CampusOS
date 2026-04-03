const express = require('express');
const router = express.Router();
const { auth, isTeacherOrAdmin } = require('../middleware/auth');
const db = require('../config/database');
const { enqueueJob, logSystemAudit } = require('../utils/platformOps');

// Get announcements
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, u.name as author_name 
       FROM announcements a
       JOIN users u ON a.created_by = u.id
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT 50`
    );
    res.json({ announcements: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create announcement
router.post('/', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const { title, content, type, isPinned } = req.body;
    const result = await db.query(
      'INSERT INTO announcements (title, content, type, is_pinned, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, content, type || 'general', isPinned || false, req.user.id]
    );
    const announcement = result.rows[0];

    await logSystemAudit({
      entityType: 'announcement',
      entityId: announcement.id,
      action: 'create',
      summary: `${req.user.email} published "${announcement.title}"`,
      details: {
        type: announcement.type,
        isPinned: announcement.is_pinned
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    await enqueueJob({
      jobType: 'notification.broadcast',
      createdBy: req.user.id,
      payload: {
        sourceType: 'announcement',
        sourceId: announcement.id,
        title: `CampusOS: ${announcement.title}`,
        message: announcement.content,
        excludeUserId: req.user.id,
        metadata: {
          type: announcement.type,
          isPinned: announcement.is_pinned
        }
      }
    });

    res.status(201).json({ announcement });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete announcement
router.delete('/:id', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const announcement = await db.get('SELECT id, title, type FROM announcements WHERE id = ?', [req.params.id]);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    await db.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);

    await logSystemAudit({
      entityType: 'announcement',
      entityId: req.params.id,
      action: 'delete',
      summary: `${req.user.email} deleted "${announcement.title}"`,
      details: {
        type: announcement.type
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
