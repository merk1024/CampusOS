const db = require('../config/database');

const normalizeNullableText = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const normalizeNullableNumber = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

async function logGradeChange({
  gradeId,
  examId,
  studentId,
  previousGrade,
  newGrade,
  previousComments,
  newComments,
  changedBy
}) {
  const normalizedPreviousGrade = normalizeNullableNumber(previousGrade);
  const normalizedNewGrade = normalizeNullableNumber(newGrade);
  const normalizedPreviousComments = normalizeNullableText(previousComments);
  const normalizedNewComments = normalizeNullableText(newComments);

  if (
    normalizedPreviousGrade === normalizedNewGrade
    && normalizedPreviousComments === normalizedNewComments
  ) {
    return null;
  }

  const action = normalizedPreviousGrade === null && normalizedPreviousComments === null
    ? 'created'
    : 'updated';

  return db.run(
    `INSERT INTO grade_audit_log
      (grade_id, exam_id, student_id, action, previous_grade, new_grade, previous_comments, new_comments, changed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      gradeId || null,
      examId,
      studentId,
      action,
      normalizedPreviousGrade,
      normalizedNewGrade,
      normalizedPreviousComments,
      normalizedNewComments,
      changedBy || null
    ]
  );
}

async function logAttendanceChange({
  attendanceId,
  scheduleId,
  studentId,
  date,
  previousStatus,
  newStatus,
  changedBy
}) {
  const normalizedPreviousStatus = normalizeNullableText(previousStatus);
  const normalizedNewStatus = normalizeNullableText(newStatus);

  if (!normalizedNewStatus || normalizedPreviousStatus === normalizedNewStatus) {
    return null;
  }

  const action = normalizedPreviousStatus ? 'updated' : 'created';

  return db.run(
    `INSERT INTO attendance_audit_log
      (attendance_id, schedule_id, student_id, date, action, previous_status, new_status, changed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      attendanceId || null,
      scheduleId,
      studentId,
      date,
      action,
      normalizedPreviousStatus,
      normalizedNewStatus,
      changedBy || null
    ]
  );
}

module.exports = {
  logGradeChange,
  logAttendanceChange
};
