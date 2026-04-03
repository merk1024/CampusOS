const express = require('express');

const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const {
  SUBJECT_SELECTION_TEMPLATES,
  ACADEMIC_RECORDS_TEMPLATES,
  getCampusIntegrationOverview,
  runSubjectSelectionAnalysis,
  applySubjectSelectionOverride,
  runAcademicRecordsAnalysis
} = require('../utils/integrationCenter');
const { enqueueJob, logSystemAudit } = require('../utils/platformOps');

router.get('/overview', auth, isAdmin, async (req, res) => {
  try {
    const campusOverview = await getCampusIntegrationOverview();

    res.json({
      campusOverview,
      templates: {
        subjectSelection: SUBJECT_SELECTION_TEMPLATES,
        academicRecords: ACADEMIC_RECORDS_TEMPLATES
      }
    });
  } catch (error) {
    console.error('Integration overview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/subject-selection/analyze', auth, isAdmin, async (req, res) => {
  try {
    const result = await runSubjectSelectionAnalysis({
      sourceName: req.body.sourceName,
      coursesCsvText: req.body.coursesCsvText,
      enrollmentsCsvText: req.body.enrollmentsCsvText
    });

    await logSystemAudit({
      entityType: 'integration',
      entityId: 'subject-selection-analysis',
      action: 'analyze',
      summary: `${req.user.email} analyzed a subject selection snapshot`,
      details: {
        sourceName: req.body.sourceName,
        summary: result.summary
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    await enqueueJob({
      jobType: 'import.summary',
      createdBy: req.user.id,
      payload: {
        notifyUserId: req.user.id,
        sourceType: 'subject-selection-analysis',
        sourceId: `subject-selection-${Date.now()}`,
        title: 'CampusOS subject selection analysis finished',
        message: `Matched ${result.summary?.matchedCourses || 0} courses and ${result.summary?.matchedEnrollments || 0} enrollments.`,
        metadata: result.summary
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Subject selection integration analysis error:', error);
    res.status(400).json({ error: error.message || 'Failed to analyze subject selection snapshot' });
  }
});

router.post('/subject-selection/override', auth, isAdmin, async (req, res) => {
  try {
    const result = await applySubjectSelectionOverride({
      sourceName: req.body.sourceName,
      coursesCsvText: req.body.coursesCsvText,
      enrollmentsCsvText: req.body.enrollmentsCsvText
    });

    await logSystemAudit({
      entityType: 'integration',
      entityId: 'subject-selection-override',
      action: 'override',
      summary: `${req.user.email} applied a subject selection override`,
      details: {
        sourceName: req.body.sourceName,
        summary: result.summary
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Subject selection override error:', error);
    res.status(400).json({ error: error.message || 'Failed to apply subject selection override' });
  }
});

router.post('/academic-records/analyze', auth, isAdmin, async (req, res) => {
  try {
    const result = await runAcademicRecordsAnalysis({
      sourceName: req.body.sourceName,
      gradesCsvText: req.body.gradesCsvText,
      attendanceCsvText: req.body.attendanceCsvText
    });

    await logSystemAudit({
      entityType: 'integration',
      entityId: 'academic-records-analysis',
      action: 'analyze',
      summary: `${req.user.email} analyzed academic records`,
      details: {
        sourceName: req.body.sourceName,
        summary: result.summary
      },
      changedBy: req.user.id,
      requestId: req.requestId
    });

    await enqueueJob({
      jobType: 'import.summary',
      createdBy: req.user.id,
      payload: {
        notifyUserId: req.user.id,
        sourceType: 'academic-records-analysis',
        sourceId: `academic-records-${Date.now()}`,
        title: 'CampusOS academic records analysis finished',
        message: `Matched ${result.summary?.matchedGrades || 0} grades and ${result.summary?.matchedAttendance || 0} attendance rows.`,
        metadata: result.summary
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Academic records integration analysis error:', error);
    res.status(400).json({ error: error.message || 'Failed to analyze academic records snapshot' });
  }
});

module.exports = router;
