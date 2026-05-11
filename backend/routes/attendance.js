const express = require('express');

const router = express.Router();
const { auth, isTeacherOrAdmin } = require('../middleware/auth');
const { logAttendanceChange } = require('../utils/auditTrail');
const { logSystemAudit } = require('../utils/platformOps');
const {
  getAttendanceAnalytics,
  getAttendanceAudit,
  getManagementSession,
  getStudentAttendance,
  listManagementSessions,
  saveAttendanceBatch,
  saveAttendanceRecord
} = require('../services/attendanceService');
const { getServiceErrorStatus } = require('../services/serviceError');

const respondWithServiceError = (res, error, label) => {
  const status = getServiceErrorStatus(error);
  if (status) {
    return res.status(status).json({ error: error.message });
  }

  console.error(label, error);
  return res.status(500).json({ error: 'Server error' });
};

router.get('/management/sessions', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const result = await listManagementSessions({
      user: req.user,
      date: req.query.date
    });
    res.json(result);
  } catch (error) {
    respondWithServiceError(res, error, 'Get attendance sessions error:');
  }
});

router.get('/management/session/:scheduleId', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const result = await getManagementSession({
      user: req.user,
      scheduleId: req.params.scheduleId,
      date: req.query.date
    });
    res.json(result);
  } catch (error) {
    respondWithServiceError(res, error, 'Get attendance session error:');
  }
});

router.get('/analytics', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const result = await getAttendanceAnalytics({
      user: req.user,
      from: req.query.from,
      to: req.query.to
    });
    res.json(result);
  } catch (error) {
    respondWithServiceError(res, error, 'Get attendance analytics error:');
  }
});

router.post('/bulk', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const result = await saveAttendanceBatch({
      user: req.user,
      scheduleId: req.body.scheduleId,
      date: req.body.date,
      records: req.body.records
    });

    for (const auditEntry of result.auditEntries) {
      await logAttendanceChange({
        attendanceId: auditEntry.attendanceId,
        scheduleId: auditEntry.scheduleId,
        studentId: auditEntry.studentId,
        date: auditEntry.date,
        previousStatus: auditEntry.previousStatus,
        newStatus: auditEntry.newStatus,
        changedBy: req.user.id
      });
    }

    await logSystemAudit({
      entityType: 'attendance',
      entityId: `${req.body.scheduleId}:${result.date}`,
      action: 'bulk-update',
      summary: `${req.user.email} saved attendance for ${result.savedCount} student(s)`,
      details: {
        scheduleId: Number(req.body.scheduleId),
        date: result.date,
        savedCount: result.savedCount,
        course_name: result.session.course_name || result.session.subject || null,
        group_name: result.session.group_name || null
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({
      message: 'Attendance saved successfully',
      date: result.date,
      savedCount: result.savedCount,
      students: result.students,
      summary: result.summary
    });
  } catch (error) {
    respondWithServiceError(res, error, 'Bulk attendance save error:');
  }
});

router.post('/', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const result = await saveAttendanceRecord({
      user: req.user,
      scheduleId: req.body.scheduleId,
      studentId: req.body.studentId,
      date: req.body.date,
      status: req.body.status
    });

    await logAttendanceChange({
      attendanceId: result.auditEntry.attendanceId,
      scheduleId: result.auditEntry.scheduleId,
      studentId: result.auditEntry.studentId,
      date: result.auditEntry.date,
      previousStatus: result.auditEntry.previousStatus,
      newStatus: result.auditEntry.newStatus,
      changedBy: req.user.id
    });

    await logSystemAudit({
      entityType: 'attendance',
      entityId: `${result.auditEntry.scheduleId}:${result.auditEntry.studentId}:${result.auditEntry.date}`,
      action: result.action,
      summary: `${req.user.email} marked attendance for ${result.auditEntry.studentId}`,
      details: {
        scheduleId: result.auditEntry.scheduleId,
        studentId: result.auditEntry.studentId,
        date: result.auditEntry.date,
        status: result.auditEntry.newStatus
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({ attendance: result.attendance });
  } catch (error) {
    respondWithServiceError(res, error, 'Mark attendance error:');
  }
});

router.get('/audit', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const result = await getAttendanceAudit({
      user: req.user,
      filters: req.query
    });
    res.json(result);
  } catch (error) {
    respondWithServiceError(res, error, 'Get attendance audit error:');
  }
});

router.get('/student/:studentId', auth, async (req, res) => {
  try {
    const result = await getStudentAttendance({
      requester: req.user,
      studentId: req.params.studentId
    });
    res.json(result);
  } catch (error) {
    respondWithServiceError(res, error, 'Get student attendance error:');
  }
});

module.exports = router;
