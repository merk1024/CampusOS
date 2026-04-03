const express = require('express');

const router = express.Router();
const { auth, isTeacherOrAdmin } = require('../middleware/auth');
const db = require('../config/database');
const { logSystemAudit } = require('../utils/platformOps');

const SCHEDULE_SELECT = `
  SELECT
    s.*,
    c.code AS course_code,
    c.name AS course_name,
    c.teacher_id AS course_teacher_id,
    u.name AS course_teacher_name,
    u.email AS course_teacher_email
  FROM schedule s
  LEFT JOIN courses c ON s.course_id = c.id
  LEFT JOIN users u ON c.teacher_id = u.id
`;

const normalizeNumericId = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const getAudienceType = (value) => {
  const normalized = String(value || 'group').trim().toLowerCase();
  return ['group', 'subgroup', 'individual'].includes(normalized) ? normalized : 'group';
};

const getScheduleById = async (scheduleId) => (
  db.get(
    `${SCHEDULE_SELECT}
     WHERE s.id = ?`,
    [scheduleId]
  )
);

const resolveCourseContext = async (courseId) => {
  if (!courseId) {
    return null;
  }

  const course = await db.get(
    `SELECT
       c.id,
       c.code,
       c.name,
       c.teacher_id,
       u.name AS teacher_name,
       u.email AS teacher_email
     FROM courses c
     LEFT JOIN users u ON c.teacher_id = u.id
     WHERE c.id = ?`,
    [courseId]
  );

  if (!course) {
    throw new Error('Course not found');
  }

  return course;
};

const resolveStudentContext = async (studentUserId) => {
  if (!studentUserId) {
    return null;
  }

  const student = await db.get(
    `SELECT id, role, name, group_name, subgroup_name
     FROM users
     WHERE id = ?`,
    [studentUserId]
  );

  if (!student || student.role !== 'student') {
    throw new Error('Student not found');
  }

  return student;
};

const normalizeSchedulePayload = async (body) => {
  const courseId = normalizeNumericId(body.course_id || body.courseId);
  const audienceType = getAudienceType(body.audience_type || body.audienceType);
  const studentUserId = normalizeNumericId(body.student_user_id || body.studentUserId);
  const subgroupInput = String(body.subgroup_name || body.subgroupName || '').trim();
  const groupInput = String(body.group_name || body.groupName || '').trim();
  const course = await resolveCourseContext(courseId);
  const student = audienceType === 'individual'
    ? await resolveStudentContext(studentUserId)
    : null;

  if (audienceType === 'individual' && !studentUserId) {
    throw new Error('Student is required for an individual schedule entry');
  }

  if (audienceType === 'subgroup' && !subgroupInput) {
    throw new Error('Subgroup is required for a subgroup schedule entry');
  }

  const groupName = audienceType === 'individual'
    ? (groupInput || student?.group_name || 'INDIVIDUAL')
    : groupInput;

  if (!groupName) {
    throw new Error('Group name is required');
  }

  const subject = String(body.subject || '').trim() || course?.name || '';
  if (!subject) {
    throw new Error('Subject is required');
  }

  const teacher = String(body.teacher || '').trim()
    || course?.teacher_name
    || course?.teacher_email
    || '';

  return {
    day: body.day,
    timeSlot: body.time_slot || body.timeSlot,
    groupName,
    audienceType,
    subgroupName: audienceType === 'subgroup' ? subgroupInput : null,
    studentUserId: audienceType === 'individual' ? studentUserId : null,
    subject,
    teacher,
    room: String(body.room || '').trim(),
    courseId
  };
};

const isValidationError = (message) => (
  [
    'Course not found',
    'Student not found',
    'Student is required for an individual schedule entry',
    'Subgroup is required for a subgroup schedule entry',
    'Group name is required',
    'Subject is required'
  ].includes(message)
);

// Get schedule
router.get('/', auth, async (req, res) => {
  try {
    let query = `
      ${SCHEDULE_SELECT}
      ORDER BY COALESCE(s.group_name, ''), COALESCE(s.subgroup_name, ''), s.day, s.time_slot
    `;
    let params = [];

    if (req.user.role === 'student') {
      query = `
        ${SCHEDULE_SELECT}
        LEFT JOIN course_enrollments ce
          ON ce.course_id = s.course_id
         AND ce.student_id = ?
        WHERE
          (
            (
              s.group_name = ?
              AND COALESCE(s.audience_type, 'group') = 'group'
            )
            OR (
              s.group_name = ?
              AND COALESCE(s.subgroup_name, '') = COALESCE(?, '')
              AND COALESCE(s.audience_type, 'group') = 'subgroup'
            )
            OR (
              s.student_user_id = ?
              AND COALESCE(s.audience_type, 'group') = 'individual'
            )
          )
          AND (
            s.course_id IS NULL
            OR ce.id IS NOT NULL
            OR (
              COALESCE(s.audience_type, 'group') = 'individual'
              AND s.student_user_id = ?
            )
          )
        ORDER BY s.day, s.time_slot
      `;
      params = [
        req.user.id,
        req.user.group_name,
        req.user.group_name,
        req.user.subgroup_name,
        req.user.id,
        req.user.id
      ];
    }

    const result = await db.all(query, params);
    res.json({ schedule: result });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create schedule entry
router.post('/', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const normalized = await normalizeSchedulePayload(req.body);

    const result = await db.run(
      `INSERT INTO schedule (
        day, time_slot, group_name, audience_type, subgroup_name, student_user_id, subject, teacher, room, course_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        normalized.day,
        normalized.timeSlot,
        normalized.groupName,
        normalized.audienceType,
        normalized.subgroupName,
        normalized.studentUserId,
        normalized.subject,
        normalized.teacher,
        normalized.room,
        normalized.courseId
      ]
    );

    const inserted = await getScheduleById(result.id);

    await logSystemAudit({
      entityType: 'schedule',
      entityId: inserted.id,
      action: 'create',
      summary: `${req.user.email} created schedule entry "${inserted.subject}"`,
      details: {
        day: inserted.day,
        time_slot: inserted.time_slot,
        group_name: inserted.group_name,
        audience_type: inserted.audience_type,
        subgroup_name: inserted.subgroup_name,
        course_id: inserted.course_id
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.status(201).json({ message: 'Schedule created', schedule: inserted });
  } catch (error) {
    console.error('Create schedule error:', error);
    if (isValidationError(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update schedule entry
router.put('/:id', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const existingSchedule = await getScheduleById(req.params.id);
    if (!existingSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const normalized = await normalizeSchedulePayload(req.body);

    const result = await db.run(
      `UPDATE schedule
       SET day = ?,
           time_slot = ?,
           group_name = ?,
           audience_type = ?,
           subgroup_name = ?,
           student_user_id = ?,
           subject = ?,
           teacher = ?,
           room = ?,
           course_id = ?
       WHERE id = ?`,
      [
        normalized.day,
        normalized.timeSlot,
        normalized.groupName,
        normalized.audienceType,
        normalized.subgroupName,
        normalized.studentUserId,
        normalized.subject,
        normalized.teacher,
        normalized.room,
        normalized.courseId,
        req.params.id
      ]
    );

    const updated = await getScheduleById(req.params.id);

    await logSystemAudit({
      entityType: 'schedule',
      entityId: req.params.id,
      action: 'update',
      summary: `${req.user.email} updated schedule entry "${updated.subject}"`,
      details: {
        previous: {
          day: existingSchedule.day,
          time_slot: existingSchedule.time_slot,
          group_name: existingSchedule.group_name,
          audience_type: existingSchedule.audience_type,
          subgroup_name: existingSchedule.subgroup_name,
          course_id: existingSchedule.course_id
        },
        current: {
          day: updated.day,
          time_slot: updated.time_slot,
          group_name: updated.group_name,
          audience_type: updated.audience_type,
          subgroup_name: updated.subgroup_name,
          course_id: updated.course_id
        }
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({ message: 'Schedule updated', schedule: updated });
  } catch (error) {
    console.error('Update schedule error:', error);
    if (isValidationError(error.message)) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete schedule entry
router.delete('/:id', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const existingSchedule = await getScheduleById(req.params.id);
    if (!existingSchedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const result = await db.run('DELETE FROM schedule WHERE id = ?', [req.params.id]);

    await logSystemAudit({
      entityType: 'schedule',
      entityId: req.params.id,
      action: 'delete',
      summary: `${req.user.email} deleted schedule entry "${existingSchedule.subject}"`,
      details: {
        day: existingSchedule.day,
        time_slot: existingSchedule.time_slot,
        group_name: existingSchedule.group_name,
        audience_type: existingSchedule.audience_type,
        subgroup_name: existingSchedule.subgroup_name,
        course_id: existingSchedule.course_id
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
