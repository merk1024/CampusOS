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

    res.json(result);
  } catch (error) {
    console.error('Academic records integration analysis error:', error);
    res.status(400).json({ error: error.message || 'Failed to analyze academic records snapshot' });
  }
});

module.exports = router;
