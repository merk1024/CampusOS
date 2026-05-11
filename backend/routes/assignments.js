const express = require('express');

const router = express.Router();
const { auth, isTeacherOrAdmin } = require('../middleware/auth');
const { logSystemAudit } = require('../utils/platformOps');
const { createAssignment, listAssignments } = require('../services/assignmentService');
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
    const assignments = await listAssignments();
    res.json({ assignments });
  } catch (error) {
    respondWithServiceError(res, error, 'Get assignments error:');
  }
});

router.post('/', auth, isTeacherOrAdmin, async (req, res) => {
  try {
    const result = await createAssignment({
      requester: req.user,
      data: req.body
    });

    await logSystemAudit({
      entityType: 'assignment',
      entityId: result.assignment.id,
      action: 'create',
      summary: `${req.user.email} created assignment "${result.assignment.title}"`,
      details: {
        dueDate: result.assignment.due_date,
        maxGrade: result.assignment.max_grade,
        courseId: result.course?.id || result.assignment.course_id || null,
        courseCode: result.course?.code || result.assignment.course_code || null
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.status(201).json({ assignment: result.assignment });
  } catch (error) {
    respondWithServiceError(res, error, 'Create assignment error:');
  }
});

module.exports = router;
