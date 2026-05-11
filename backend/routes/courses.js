const express = require('express');

const router = express.Router();
const {
  auth,
  isAdmin,
  isTeacherOrAdmin,
  isStudent
} = require('../middleware/auth');
const { logSystemAudit } = require('../utils/platformOps');
const {
  assignTeacherToCourse,
  bulkAssignTeacherToCourses,
  bulkEnrollStudents,
  createCourse,
  deleteCourse,
  enrollStudentInCourse,
  getCourseById,
  getCourseOperationsReport,
  getCourseRoster,
  listCourses,
  listEnrolledCourses,
  unenrollStudentFromCourse,
  updateCourse
} = require('../services/courseService');
const { getServiceErrorStatus } = require('../services/serviceError');

const respondWithServiceError = (res, error, label) => {
  const status = getServiceErrorStatus(error);
  if (status) {
    return res.status(status).json({ error: error.message });
  }

  console.error(label, error);
  return res.status(500).json({ error: 'Server error' });
};

router.get('/', auth, async (req, res) => {
  try {
    const courses = await listCourses();
    res.json({ courses });
  } catch (error) {
    respondWithServiceError(res, error, 'Get courses error:');
  }
});

router.post('/bulk/teacher-assignment', auth, isAdmin, async (req, res) => {
  try {
    const result = await bulkAssignTeacherToCourses({
      teacherId: req.body.teacher_id,
      courseIds: req.body.course_ids
    });

    await logSystemAudit({
      entityType: 'course',
      entityId: 'bulk-teacher-assignment',
      action: 'bulk-assign-teacher',
      summary: `${req.user.email} updated teacher assignment for ${result.courses.length} course(s)`,
      details: {
        teacherId: result.teacherId,
        updatedCourseIds: result.courses.map((course) => course.id),
        missingCourseIds: result.missingCourseIds
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({
      message: result.teacherId
        ? 'Teacher assignment updated for selected courses'
        : 'Teacher removed from selected courses',
      summary: {
        requested_courses: result.requestedCourses,
        updated_courses: result.courses.length,
        missing_courses: result.missingCourseIds.length
      },
      missing_course_ids: result.missingCourseIds,
      courses: result.courses
    });
  } catch (error) {
    respondWithServiceError(res, error, 'Bulk teacher assignment error:');
  }
});

router.post('/bulk/enrollments', auth, isAdmin, async (req, res) => {
  try {
    const result = await bulkEnrollStudents({
      courseIds: req.body.course_ids,
      studentIdentifiers: req.body.student_identifiers
    });

    await logSystemAudit({
      entityType: 'enrollment',
      entityId: 'bulk-enrollment',
      action: 'bulk-enroll',
      summary: `${req.user.email} processed bulk enrollment`,
      details: {
        created: result.created,
        skipped: result.skipped,
        matchedCourseIds: result.courses.map((course) => course.id),
        matchedStudentIds: result.students.map((student) => student.id),
        missingIdentifiers: result.missingIdentifiers
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({
      message: 'Bulk enrollment processed',
      summary: {
        requested_courses: result.requestedCourseCount,
        matched_courses: result.courses.length,
        requested_students: result.requestedStudentCount,
        matched_students: result.students.length,
        requested_pairs: result.courses.length * result.students.length,
        created: result.created,
        skipped: result.skipped,
        missing_courses: result.missingCourseIds.length,
        missing_students: result.missingIdentifiers.length
      },
      missing_course_ids: result.missingCourseIds,
      missing_students: result.missingIdentifiers,
      courses: result.courses.map((course) => ({
        id: course.id,
        code: course.code,
        name: course.name
      })),
      students: result.students.map((student) => ({
        id: student.id,
        student_id: student.student_id,
        email: student.email,
        name: student.name
      }))
    });
  } catch (error) {
    respondWithServiceError(res, error, 'Bulk course enrollment error:');
  }
});

router.get('/reports/overview', auth, isAdmin, async (req, res) => {
  try {
    const rows = await getCourseOperationsReport();

    res.json({
      generated_at: new Date().toISOString(),
      summary: {
        total_courses: rows.length,
        assigned_courses: rows.filter((row) => row.teacher_id).length,
        unassigned_courses: rows.filter((row) => !row.teacher_id).length,
        total_enrollments: rows.reduce((sum, row) => sum + row.enrollment_count, 0)
      },
      rows
    });
  } catch (error) {
    respondWithServiceError(res, error, 'Course operations report error:');
  }
});

router.get('/enrolled', auth, isStudent, async (req, res) => {
  try {
    const courses = await listEnrolledCourses(req.user.id);
    res.json({ courses });
  } catch (error) {
    respondWithServiceError(res, error, 'Get enrolled courses error:');
  }
});

router.get('/:id/roster', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const roster = await getCourseRoster({
      requester: req.user,
      courseId: req.params.id
    });

    res.json(roster);
  } catch (error) {
    respondWithServiceError(res, error, 'Get course roster error:');
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const course = await getCourseById(req.params.id);
    res.json({ course });
  } catch (error) {
    respondWithServiceError(res, error, 'Get course error:');
  }
});

router.post('/', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const course = await createCourse({
      requester: req.user,
      data: req.body
    });

    await logSystemAudit({
      entityType: 'course',
      entityId: course.id,
      action: 'create',
      summary: `${req.user.email} created course ${course.code}`,
      details: {
        teacher_id: course.teacher_id
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.status(201).json({
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    respondWithServiceError(res, error, 'Create course error:');
  }
});

router.put('/:id', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const course = await updateCourse({
      requester: req.user,
      courseId: req.params.id,
      data: req.body
    });

    await logSystemAudit({
      entityType: 'course',
      entityId: req.params.id,
      action: 'update',
      summary: `${req.user.email} updated course ${course.code}`,
      details: {
        teacher_id: course.teacher_id
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    respondWithServiceError(res, error, 'Update course error:');
  }
});

router.put('/:id/teacher', auth, async (req, res) => {
  try {
    const result = await assignTeacherToCourse({
      requester: req.user,
      courseId: req.params.id,
      teacherId: req.body.teacher_id
    });

    await logSystemAudit({
      entityType: 'course',
      entityId: req.params.id,
      action: result.teacherId ? 'assign-teacher' : 'clear-teacher',
      summary: `${req.user.email} ${result.teacherId ? 'assigned' : 'removed'} a teacher for ${result.course.code}`,
      details: {
        teacher_id: result.teacherId
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({
      message: result.teacherId ? 'Teacher assigned successfully' : 'Teacher removed successfully',
      course: result.course
    });
  } catch (error) {
    respondWithServiceError(res, error, 'Assign course teacher error:');
  }
});

router.delete('/:id', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const course = await deleteCourse({
      requester: req.user,
      courseId: req.params.id
    });

    await logSystemAudit({
      entityType: 'course',
      entityId: req.params.id,
      action: 'delete',
      summary: `${req.user.email} deleted course ${course.code}`,
      details: {
        courseCode: course.code,
        courseName: course.name
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    respondWithServiceError(res, error, 'Delete course error:');
  }
});

router.post('/:id/enroll', auth, isStudent, async (req, res) => {
  try {
    const enrollment = await enrollStudentInCourse({
      courseId: req.params.id,
      studentUserId: req.user.id
    });

    res.json({ message: 'Enrolled successfully', enrollment });
  } catch (error) {
    respondWithServiceError(res, error, 'Course enroll error:');
  }
});

router.delete('/:id/enroll', auth, isStudent, async (req, res) => {
  try {
    await unenrollStudentFromCourse({
      courseId: req.params.id,
      studentUserId: req.user.id
    });

    res.json({ message: 'Unenrolled successfully' });
  } catch (error) {
    respondWithServiceError(res, error, 'Course unenroll error:');
  }
});

module.exports = router;
