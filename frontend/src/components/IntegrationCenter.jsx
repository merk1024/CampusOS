import { useEffect, useState } from 'react';

import { api } from '../api';
import EmptyState from './EmptyState';
import StatusBanner from './StatusBanner';

const DEFAULT_SUBJECT_FORM = {
  sourceName: 'My Alatoo Export',
  coursesCsvText: '',
  enrollmentsCsvText: ''
};

const DEFAULT_ACADEMIC_FORM = {
  sourceName: 'OCS Export',
  gradesCsvText: '',
  attendanceCsvText: ''
};

const countFindingsByStatus = (findings = [], statuses = []) => (
  findings.filter((finding) => statuses.includes(finding.status)).length
);

function SummaryBucketGrid({ summary }) {
  const buckets = Object.values(summary || {});
  if (buckets.length === 0) {
    return null;
  }

  return (
    <div className="integration-bucket-grid">
      {buckets.map((bucket) => (
        <div key={bucket.label} className="integration-bucket-card">
          <strong>{bucket.label}</strong>
          <div className="integration-bucket-stats">
            <span>Source rows: {bucket.rowsInExport ?? bucket.rowsInSource ?? 0}</span>
            <span>CampusOS rows: {bucket.rowsInCampusOS ?? 0}</span>
            <span>Matched: {bucket.matched ?? 0}</span>
            <span>Mismatched: {bucket.mismatched ?? 0}</span>
            <span>Only in source: {bucket.onlyInExport ?? bucket.onlyInSource ?? 0}</span>
            <span>Only in CampusOS: {bucket.onlyInCampusOS ?? 0}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FindingsList({ title, findings, emptyTitle, emptyDescription }) {
  if (!Array.isArray(findings) || findings.length === 0) {
    return (
      <EmptyState
        compact
        eyebrow="Integration"
        title={emptyTitle}
        description={emptyDescription}
        className="integration-empty-state"
      />
    );
  }

  return (
    <section className="integration-findings-card">
      <div className="integration-section-head">
        <h4>{title}</h4>
        <span>{findings.length} finding(s)</span>
      </div>

      <div className="integration-findings-list">
        {findings.slice(0, 10).map((finding, index) => (
          <div key={`${finding.entity}-${finding.key}-${index}`} className={`integration-finding-row status-${finding.status}`}>
            <div>
              <strong>{finding.entity}</strong>
              <span>{finding.key}</span>
            </div>
            <div className="integration-finding-meta">
              <span>{finding.status.replace(/_/g, ' ')}</span>
              {Array.isArray(finding.differences) && finding.differences.length > 0 ? (
                <span>{finding.differences.map((difference) => difference.field).join(', ')}</span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function IntegrationCenter() {
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [campusOverview, setCampusOverview] = useState(null);
  const [templates, setTemplates] = useState({
    subjectSelection: { courses: '', enrollments: '' },
    academicRecords: { grades: '', attendance: '' }
  });
  const [statusBanner, setStatusBanner] = useState({ tone: '', title: '', message: '' });
  const [subjectForm, setSubjectForm] = useState(DEFAULT_SUBJECT_FORM);
  const [academicForm, setAcademicForm] = useState(DEFAULT_ACADEMIC_FORM);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [subjectApplying, setSubjectApplying] = useState(false);
  const [academicLoading, setAcademicLoading] = useState(false);
  const [subjectAnalysis, setSubjectAnalysis] = useState(null);
  const [academicAnalysis, setAcademicAnalysis] = useState(null);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const response = await api.getIntegrationOverview();
        setCampusOverview(response?.campusOverview || null);
        setTemplates(response?.templates || {
          subjectSelection: { courses: '', enrollments: '' },
          academicRecords: { grades: '', attendance: '' }
        });
      } catch (error) {
        setStatusBanner({
          tone: 'error',
          title: 'Integration overview is unavailable',
          message: error.message || 'CampusOS could not load the integration overview right now.'
        });
      } finally {
        setLoadingOverview(false);
      }
    };

    loadOverview();
  }, []);

  const refreshOverview = async () => {
    const response = await api.getIntegrationOverview();
    setCampusOverview(response?.campusOverview || null);
    setTemplates(response?.templates || templates);
  };

  const handleAnalyzeSubjectSelection = async () => {
    setSubjectLoading(true);
    try {
      const result = await api.analyzeSubjectSelectionIntegration(subjectForm);
      setSubjectAnalysis(result);
      setStatusBanner({
        tone: 'success',
        title: 'Subject selection snapshot analyzed',
        message: `CampusOS processed ${result?.overview?.externalSelections || 0} external selections and found ${result?.overview?.totalFindings || 0} issue(s) to review.`
      });
    } catch (error) {
      setStatusBanner({
        tone: 'error',
        title: 'Subject selection analysis failed',
        message: error.message || 'CampusOS could not analyze the provided subject selection snapshot.'
      });
    } finally {
      setSubjectLoading(false);
    }
  };

  const handleApplySubjectSelectionOverride = async () => {
    setSubjectApplying(true);
    try {
      const result = await api.applySubjectSelectionOverride(subjectForm);
      const changedCourses = Number(result?.summary?.courses?.create || 0) + Number(result?.summary?.courses?.update || 0);
      const changedSelections = Number(result?.summary?.enrollments?.create || 0) + Number(result?.summary?.enrollments?.update || 0);
      setStatusBanner({
        tone: 'success',
        title: 'Manual override applied',
        message: `CampusOS updated ${changedCourses} course record(s) and ${changedSelections} selection record(s) from the external snapshot.`
      });
      setSubjectAnalysis(null);
      await refreshOverview();
    } catch (error) {
      setStatusBanner({
        tone: 'error',
        title: 'Manual override failed',
        message: error.message || 'CampusOS could not apply the subject selection override.'
      });
    } finally {
      setSubjectApplying(false);
    }
  };

  const handleAnalyzeAcademicRecords = async () => {
    setAcademicLoading(true);
    try {
      const result = await api.analyzeAcademicRecordsIntegration(academicForm);
      setAcademicAnalysis(result);
      setStatusBanner({
        tone: 'success',
        title: 'Academic records snapshot analyzed',
        message: `CampusOS compared ${result?.overview?.externalGrades || 0} grades and ${result?.overview?.externalAttendance || 0} attendance rows against the current portal data.`
      });
    } catch (error) {
      setStatusBanner({
        tone: 'error',
        title: 'Academic records analysis failed',
        message: error.message || 'CampusOS could not analyze the grades and attendance snapshot.'
      });
    } finally {
      setAcademicLoading(false);
    }
  };

  const unifiedConflictCount = (subjectAnalysis?.overview?.totalFindings || 0) + (academicAnalysis?.overview?.totalFindings || 0);

  return (
    <div className="page integration-page">
      <div className="page-header integration-header">
        <div>
          <span className="integration-eyebrow">Integration Layer</span>
          <h1>CampusOS Integration Center</h1>
          <p>Run read-only snapshot analysis across subject selection, grades, and attendance systems, then apply safe admin overrides where CampusOS should absorb the external result.</p>
        </div>
      </div>

      <StatusBanner tone={statusBanner.tone || 'info'} title={statusBanner.title} message={statusBanner.message} />

      {loadingOverview ? null : (
        <div className="integration-overview-grid">
          <div className="integration-overview-card">
            <span>Students</span>
            <strong>{campusOverview?.students || 0}</strong>
          </div>
          <div className="integration-overview-card">
            <span>Courses</span>
            <strong>{campusOverview?.courses || 0}</strong>
          </div>
          <div className="integration-overview-card">
            <span>Enrollments</span>
            <strong>{campusOverview?.enrollments || 0}</strong>
          </div>
          <div className="integration-overview-card">
            <span>Grades</span>
            <strong>{campusOverview?.grades || 0}</strong>
          </div>
          <div className="integration-overview-card">
            <span>Attendance</span>
            <strong>{campusOverview?.attendanceRecords || 0}</strong>
          </div>
          <div className="integration-overview-card highlight">
            <span>Open integration findings</span>
            <strong>{unifiedConflictCount}</strong>
          </div>
        </div>
      )}

      <div className="integration-panels">
        <section className="integration-panel">
          <div className="integration-section-head">
            <div>
              <h3>Subject Selection Snapshot</h3>
              <p>Use this with exports from systems that manage course selection and enrollment decisions.</p>
            </div>
          </div>

          <div className="integration-form-grid">
            <label className="integration-field">
              <span>Source label</span>
              <input
                value={subjectForm.sourceName}
                onChange={(event) => setSubjectForm((current) => ({ ...current, sourceName: event.target.value }))}
                placeholder="My Alatoo Export"
              />
            </label>

            <label className="integration-field integration-field-wide">
              <span>Courses CSV / TSV</span>
              <textarea
                value={subjectForm.coursesCsvText}
                onChange={(event) => setSubjectForm((current) => ({ ...current, coursesCsvText: event.target.value }))}
                placeholder={templates.subjectSelection?.courses || ''}
              />
            </label>

            <label className="integration-field integration-field-wide">
              <span>Selections / Enrollments CSV / TSV</span>
              <textarea
                value={subjectForm.enrollmentsCsvText}
                onChange={(event) => setSubjectForm((current) => ({ ...current, enrollmentsCsvText: event.target.value }))}
                placeholder={templates.subjectSelection?.enrollments || ''}
              />
            </label>
          </div>

          <div className="integration-action-row">
            <button type="button" className="btn-secondary" onClick={() => setSubjectForm({
              sourceName: 'My Alatoo Export',
              coursesCsvText: templates.subjectSelection?.courses || '',
              enrollmentsCsvText: templates.subjectSelection?.enrollments || ''
            })}>
              Load example
            </button>
            <button type="button" className="btn-secondary" onClick={handleAnalyzeSubjectSelection} disabled={subjectLoading}>
              {subjectLoading ? 'Analyzing...' : 'Analyze snapshot'}
            </button>
            <button type="button" className="btn-primary" onClick={handleApplySubjectSelectionOverride} disabled={subjectApplying}>
              {subjectApplying ? 'Applying override...' : 'Apply manual override'}
            </button>
          </div>

          {subjectAnalysis ? (
            <>
              <div className="integration-mini-stats">
                <div>
                  <strong>{subjectAnalysis.overview.externalCourses}</strong>
                  <span>external courses</span>
                </div>
                <div>
                  <strong>{subjectAnalysis.overview.externalSelections}</strong>
                  <span>external selections</span>
                </div>
                <div>
                  <strong>{subjectAnalysis.overview.pendingCourseConflicts + subjectAnalysis.overview.pendingSelectionConflicts}</strong>
                  <span>pending conflicts</span>
                </div>
              </div>

              <SummaryBucketGrid summary={subjectAnalysis.summary} />
              <FindingsList
                title="Subject selection findings"
                findings={subjectAnalysis.findings}
                emptyTitle="No subject-selection conflicts"
                emptyDescription="The current export lines up with CampusOS on the compared selection entities."
              />
            </>
          ) : (
            <EmptyState
              compact
              eyebrow="Read-only integration"
              title="No subject-selection snapshot analyzed yet"
              description="Paste external course and enrollment exports, then run the analyzer to see how CampusOS lines up with the source system."
              className="integration-empty-state"
            />
          )}
        </section>

        <section className="integration-panel">
          <div className="integration-section-head">
            <div>
              <h3>Grades and Attendance Snapshot</h3>
              <p>Use this with exports from academic record systems to compare grades and presence signals without writing into CampusOS.</p>
            </div>
          </div>

          <div className="integration-form-grid">
            <label className="integration-field">
              <span>Source label</span>
              <input
                value={academicForm.sourceName}
                onChange={(event) => setAcademicForm((current) => ({ ...current, sourceName: event.target.value }))}
                placeholder="OCS Export"
              />
            </label>

            <label className="integration-field integration-field-wide">
              <span>Grades CSV / TSV</span>
              <textarea
                value={academicForm.gradesCsvText}
                onChange={(event) => setAcademicForm((current) => ({ ...current, gradesCsvText: event.target.value }))}
                placeholder={templates.academicRecords?.grades || ''}
              />
            </label>

            <label className="integration-field integration-field-wide">
              <span>Attendance CSV / TSV</span>
              <textarea
                value={academicForm.attendanceCsvText}
                onChange={(event) => setAcademicForm((current) => ({ ...current, attendanceCsvText: event.target.value }))}
                placeholder={templates.academicRecords?.attendance || ''}
              />
            </label>
          </div>

          <div className="integration-action-row">
            <button type="button" className="btn-secondary" onClick={() => setAcademicForm({
              sourceName: 'OCS Export',
              gradesCsvText: templates.academicRecords?.grades || '',
              attendanceCsvText: templates.academicRecords?.attendance || ''
            })}>
              Load example
            </button>
            <button type="button" className="btn-primary" onClick={handleAnalyzeAcademicRecords} disabled={academicLoading}>
              {academicLoading ? 'Analyzing...' : 'Analyze academic records'}
            </button>
          </div>

          {academicAnalysis ? (
            <>
              <div className="integration-mini-stats">
                <div>
                  <strong>{academicAnalysis.overview.externalGrades}</strong>
                  <span>external grades</span>
                </div>
                <div>
                  <strong>{academicAnalysis.overview.externalAttendance}</strong>
                  <span>external attendance</span>
                </div>
                <div>
                  <strong>{countFindingsByStatus(academicAnalysis.findings, ['mismatch', 'only_in_source'])}</strong>
                  <span>records needing review</span>
                </div>
              </div>

              <SummaryBucketGrid summary={academicAnalysis.summary} />
              <FindingsList
                title="Academic record findings"
                findings={academicAnalysis.findings}
                emptyTitle="No grades or attendance conflicts"
                emptyDescription="CampusOS and the external academic record export currently line up on the compared fields."
              />
            </>
          ) : (
            <EmptyState
              compact
              eyebrow="Read-only integration"
              title="No academic-record snapshot analyzed yet"
              description="Paste grades and attendance exports to compare external academic records against the current CampusOS view."
              className="integration-empty-state"
            />
          )}
        </section>
      </div>
    </div>
  );
}
