const express = require('express');
const router = express.Router();
const { auth, isTeacherOrAdmin } = require('../middleware/auth');
const db = require('../config/database');
const { canManageAcademicRecords } = require('../utils/access');
const {
  normalizeAudienceInput,
  getAnnouncementAudienceLabel,
  canUserSeeAnnouncement
} = require('../utils/announcementAudience');
const { enqueueJob, logSystemAudit, deliverNotificationBroadcast } = require('../utils/platformOps');

const normalizeBooleanFlag = (value) => (
  value === true
  || value === 1
  || value === '1'
);

const getStudentCourseIds = async (userId) => {
  const rows = await db.all(
    `SELECT course_id
     FROM course_enrollments
     WHERE student_id = ?`,
    [userId]
  );

  return new Set(
    rows
      .map((row) => Number(row.course_id))
      .filter((value) => Number.isInteger(value) && value > 0)
  );
};

const formatAnnouncementForClient = (announcement, user) => {
  const notificationWasDelivered = Boolean(announcement.notification_id);
  const isOwned = Number(announcement.created_by) === Number(user?.id);
  const isRead = notificationWasDelivered
    ? normalizeBooleanFlag(announcement.notification_is_read)
    : (isOwned || canManageAcademicRecords(user));

  return {
    ...announcement,
    is_pinned: normalizeBooleanFlag(announcement.is_pinned),
    is_read: isRead,
    audience_label: getAnnouncementAudienceLabel({
      audienceScope: announcement.audience_scope,
      audienceValue: announcement.audience_value,
      courseName: announcement.course_name
    }),
    notification_id: announcement.notification_id || null
  };
};

// Get announcements
router.get('/', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         a.*,
         COALESCE(u.name, 'CampusOS') AS author_name,
         c.name AS course_name,
         ni.id AS notification_id,
         ni.is_read AS notification_is_read,
         ni.status AS notification_status,
         ni.created_at AS notification_created_at
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       LEFT JOIN courses c ON c.id = a.course_id
       LEFT JOIN notification_inbox ni
         ON ni.user_id = ?
        AND ni.source_type = 'announcement'
        AND ni.source_id = CAST(a.id AS TEXT)
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT 100`,
      [req.user.id]
    );

    const enrolledCourseIds = req.user.role === 'student'
      ? await getStudentCourseIds(req.user.id)
      : new Set();
    const announcements = result.rows
      .filter((announcement) => canUserSeeAnnouncement({
        announcement,
        user: req.user,
        enrolledCourseIds
      }))
      .map((announcement) => formatAnnouncementForClient(announcement, req.user));

    res.json({ announcements });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create announcement
router.post('/', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '').trim();
    const type = String(req.body.type || 'general').trim().toLowerCase();
    const isPinned = normalizeBooleanFlag(
      req.body.isPinned !== undefined ? req.body.isPinned : req.body.is_pinned
    );
    const audience = normalizeAudienceInput(req.body);

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    if (audience.errors.length > 0) {
      return res.status(400).json({ error: audience.errors[0] });
    }

    let course = null;
    if (audience.courseId) {
      course = await db.get(
        'SELECT id, code, name FROM courses WHERE id = ?',
        [audience.courseId]
      );

      if (!course) {
        return res.status(400).json({ error: 'Selected course was not found' });
      }
    }

    const result = await db.query(
      `INSERT INTO announcements
        (title, content, type, audience_scope, audience_value, course_id, is_pinned, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        title,
        content,
        type || 'general',
        audience.audienceScope,
        audience.audienceValue,
        audience.courseId,
        isPinned,
        req.user.id
      ]
    );
    const announcement = {
      ...result.rows[0],
      author_name: req.user.name,
      course_name: course?.name || null,
      notification_id: null,
      notification_is_read: true
    };
    const broadcastPayload = {
      sourceType: 'announcement',
      sourceId: announcement.id,
      title: `CampusOS: ${announcement.title}`,
      message: announcement.content,
      excludeUserId: req.user.id,
      audienceScope: announcement.audience_scope,
      audienceValue: announcement.audience_value,
      courseId: announcement.course_id,
      metadata: {
        type: announcement.type,
        isPinned: normalizeBooleanFlag(announcement.is_pinned),
        audienceScope: announcement.audience_scope,
        audienceValue: announcement.audience_value,
        courseId: announcement.course_id
      }
    };

    await logSystemAudit({
      entityType: 'announcement',
      entityId: announcement.id,
      action: 'create',
      summary: `${req.user.email} published "${announcement.title}"`,
      details: {
        type: announcement.type,
        isPinned: announcement.is_pinned,
        audienceScope: announcement.audience_scope,
        audienceValue: announcement.audience_value,
        courseId: announcement.course_id
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    await enqueueJob({
      jobType: 'notification.broadcast',
      createdBy: req.user.id,
      payload: broadcastPayload
    });

    await deliverNotificationBroadcast(broadcastPayload);

    res.status(201).json({
      announcement: formatAnnouncementForClient(announcement, req.user)
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete announcement
router.delete('/:id', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const announcement = await db.get(
      'SELECT id, title, type, audience_scope, audience_value, course_id FROM announcements WHERE id = ?',
      [req.params.id]
    );
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
        type: announcement.type,
        audienceScope: announcement.audience_scope,
        audienceValue: announcement.audience_value,
        courseId: announcement.course_id
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
