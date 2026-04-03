import { useEffect, useMemo, useState } from 'react';

import { api } from '../api';
import EmptyState from './EmptyState';
import StatusBanner from './StatusBanner';
import { canManageAcademicRecords, isStudentAccount } from '../roles';

const EMPTY_STATS = {
  total_exams: 0,
  average_grade: 0,
  highest_grade: 0,
  lowest_grade: 0
};

const EMPTY_MANAGER_FORM = {
  examId: '',
  studentId: '',
  grade: '',
  comments: ''
};

function getGradeColor(grade) {
  if (grade >= 90) return '#10b981';
  if (grade >= 80) return '#3b82f6';
  if (grade >= 70) return '#f59e0b';
  return '#ef4444';
}

function getLetterGrade(grade) {
  if (grade >= 95) return 'A+';
  if (grade >= 90) return 'A';
  if (grade >= 85) return 'A-';
  if (grade >= 80) return 'B+';
  if (grade >= 75) return 'B';
  if (grade >= 70) return 'B-';
  if (grade >= 65) return 'C+';
  if (grade >= 60) return 'C';
  return 'F';
}

function formatDate(value) {
  if (!value) return 'Not graded yet';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function GradesTable({ grades, totalCount }) {
  return (
    <div className="data-table-card">
      <div className="data-table-header">
        <div>
          <h3>Gradebook</h3>
          <p className="data-table-meta">Showing {grades.length} of {totalCount} recorded grades</p>
        </div>
      </div>

      <div className="data-table-scroll">
        <table className="data-table">
          <caption className="sr-only">CampusOS gradebook table</caption>
          <thead>
            <tr>
              <th scope="col">Subject</th>
              <th scope="col">Type</th>
              <th scope="col">Grade</th>
              <th scope="col">Letter</th>
              <th scope="col">Date</th>
              <th scope="col">Comments</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((grade) => (
              <tr key={grade.id}>
                <td>
                  <div className="grade-primary-cell">
                    <strong>{grade.subject || 'Unknown subject'}</strong>
                  </div>
                </td>
                <td>{grade.type || 'Exam'}</td>
                <td>
                  <span className="grade-score" style={{ '--grade-accent': getGradeColor(grade.grade) }}>
                    {grade.grade}%
                  </span>
                </td>
                <td>
                  <span className="grade-letter-pill">{getLetterGrade(grade.grade)}</span>
                </td>
                <td>{formatDate(grade.exam_date || grade.graded_at)}</td>
                <td className="grade-comment-cell">{grade.comments?.trim() || 'No comments'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Grades({ user }) {
  const [grades, setGrades] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [managerForm, setManagerForm] = useState(EMPTY_MANAGER_FORM);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const isStudent = isStudentAccount(user);
  const canManage = canManageAcademicRecords(user);
  const studentId = user?.studentId;
  const hasActiveFilters = typeFilter !== 'all' || searchTerm.trim() !== '';

  useEffect(() => {
    const loadStudentGrades = async (targetStudentId) => {
      const [gradesResponse, statsResponse] = await Promise.all([
        api.getGrades(targetStudentId),
        api.getGradeStats(targetStudentId)
      ]);

      setGrades(gradesResponse?.grades || []);
      setStats({
        ...EMPTY_STATS,
        ...(statsResponse?.stats || {})
      });
    };

    const loadPage = async () => {
      if (!isStudent && !canManage) {
        setGrades([]);
        setStats(EMPTY_STATS);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        if (isStudent) {
          if (!studentId) {
            setError('Student ID is missing for this account.');
            setGrades([]);
            setStats(EMPTY_STATS);
            return;
          }

          await loadStudentGrades(studentId);
          return;
        }

        const [examsResponse, usersResponse] = await Promise.allSettled([
          api.getExams(),
          api.getUsers()
        ]);

        setExams(examsResponse.status === 'fulfilled' ? (examsResponse.value?.exams || []) : []);
        setStudents(
          usersResponse.status === 'fulfilled'
            ? (usersResponse.value?.users || []).filter((item) => item.role === 'student')
            : []
        );
        setGrades([]);
        setStats(EMPTY_STATS);
      } catch (err) {
        setError(err.message || 'Failed to load grades');
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [canManage, isStudent, studentId]);

  useEffect(() => {
    if (!canManage || !managerForm.studentId) {
      if (!isStudent) {
        setGrades([]);
        setStats(EMPTY_STATS);
      }
      return;
    }

    const loadSelectedStudent = async () => {
      try {
        setError('');

        const [gradesResponse, statsResponse] = await Promise.all([
          api.getGrades(managerForm.studentId),
          api.getGradeStats(managerForm.studentId)
        ]);

        setGrades(gradesResponse?.grades || []);
        setStats({
          ...EMPTY_STATS,
          ...(statsResponse?.stats || {})
        });
      } catch (err) {
        setError(err.message || 'Failed to load grades');
      }
    };

    loadSelectedStudent();
  }, [canManage, isStudent, managerForm.studentId]);

  const gradeTypes = useMemo(() => (
    ['all', ...new Set(grades.map((grade) => grade.type || 'Exam'))]
  ), [grades]);

  const filteredGrades = useMemo(() => (
    grades.filter((grade) => {
      const matchesType = typeFilter === 'all' || (grade.type || 'Exam') === typeFilter;
      const searchable = [
        grade.subject,
        grade.type,
        grade.comments,
        grade.graded_by_name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesType && searchable.includes(searchTerm.trim().toLowerCase());
    })
  ), [grades, searchTerm, typeFilter]);

  const selectedStudent = useMemo(() => (
    students.find((student) => (
      String(student.student_id || '').trim() === managerForm.studentId.trim()
      || String(student.email || '').trim().toLowerCase() === managerForm.studentId.trim().toLowerCase()
    )) || null
  ), [managerForm.studentId, students]);

  const handleManagerInput = (field, value) => {
    setManagerForm((current) => ({ ...current, [field]: value }));
    setNotice('');
    setError('');
  };

  const handleSaveGrade = async (event) => {
    event.preventDefault();

    try {
      setError('');
      setNotice('');

      await api.saveGrade({
        examId: Number(managerForm.examId),
        studentId: managerForm.studentId.trim(),
        grade: Number(managerForm.grade),
        comments: managerForm.comments.trim()
      });

      setNotice('Grade saved successfully.');

      const [gradesResponse, statsResponse] = await Promise.all([
        api.getGrades(managerForm.studentId),
        api.getGradeStats(managerForm.studentId)
      ]);

      setGrades(gradesResponse?.grades || []);
      setStats({
        ...EMPTY_STATS,
        ...(statsResponse?.stats || {})
      });
    } catch (err) {
      setError(err.message || 'Failed to save grade');
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Grades</h1>
          <p>{isStudent ? 'Loading your grades...' : 'Loading grade manager...'}</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isStudent && !canManage) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Grades</h1>
          <p>This section is currently available for student and academic management accounts.</p>
        </div>
      </div>
    );
  }

  const average = Number(stats.average_grade || 0).toFixed(1);
  const totalExams = Number(stats.total_exams || grades.length || 0);
  const highestGrade = Number(stats.highest_grade || 0);
  const lowestGrade = Number(stats.lowest_grade || 0);
  const selectedStudentLabel = selectedStudent
    ? `${selectedStudent.name} (${selectedStudent.student_id || selectedStudent.email})`
    : managerForm.studentId || 'No student selected yet';

  const showChooserEmptyState = canManage && !isStudent && !managerForm.studentId;
  const showNoGradesState = !showChooserEmptyState && grades.length === 0;
  const showFilteredEmptyState = grades.length > 0 && filteredGrades.length === 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Grades</h1>
          <p>{canManage && !isStudent ? 'Assign, review, and filter grades from one workspace.' : 'Track your academic performance in one view.'}</p>
        </div>
      </div>

      <StatusBanner tone="error" title="Grades could not be updated" message={error} />
      <StatusBanner tone="success" title="Grades updated" message={notice} />

      <div className="management-summary-grid">
        <div className="management-summary-card">
          <span className="management-summary-label">{canManage && !isStudent ? 'Available exams' : 'Average grade'}</span>
          <strong>{canManage && !isStudent ? exams.length : average}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{canManage && !isStudent ? 'Students loaded' : 'Recorded grades'}</span>
          <strong>{canManage && !isStudent ? students.length : totalExams}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{canManage && !isStudent ? 'Selected avg' : 'Highest grade'}</span>
          <strong>{canManage && !isStudent ? (managerForm.studentId ? average : '0.0') : highestGrade}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{canManage && !isStudent ? 'Visible grades' : 'Lowest grade'}</span>
          <strong>{canManage && !isStudent ? filteredGrades.length : lowestGrade}</strong>
        </div>
      </div>

      {canManage && !isStudent && (
        <form className="exam-form-card" onSubmit={handleSaveGrade}>
          <div className="exam-form-header">
            <div>
              <h3>Save grade</h3>
              <p>Select an exam, choose a student, and submit the score without leaving the gradebook.</p>
            </div>
          </div>
          <div className="exam-form-grid">
            <label className="exam-form-field">
              <span className="exam-form-label">Exam</span>
              <select
                value={managerForm.examId}
                onChange={(event) => handleManagerInput('examId', event.target.value)}
                required
              >
                <option value="">Select exam</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.subject} - {exam.group_name} - {exam.exam_date}
                  </option>
                ))}
              </select>
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">Student ID or email</span>
              <input
                list="grade-student-ids"
                type="text"
                placeholder="Start typing a student ID or email"
                value={managerForm.studentId}
                onChange={(event) => handleManagerInput('studentId', event.target.value)}
                required
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">Grade</span>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="0 to 100"
                value={managerForm.grade}
                onChange={(event) => handleManagerInput('grade', event.target.value)}
                required
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">Comments</span>
              <input
                type="text"
                placeholder="Optional comment"
                value={managerForm.comments}
                onChange={(event) => handleManagerInput('comments', event.target.value)}
              />
            </label>
          </div>
          <datalist id="grade-student-ids">
            {students.map((student) => (
              <option
                key={student.id}
                value={student.student_id || student.email}
                label={`${student.name} (${student.email})`}
              />
            ))}
          </datalist>
          <div className="portal-actions">
            <button type="submit" className="btn-primary">Save grade</button>
          </div>
        </form>
      )}

      <div className="management-toolbar grades-toolbar">
        <div className="management-search">
          <input
            type="text"
            placeholder="Search by subject, type, comments, or grader"
            aria-label="Search the gradebook"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="management-filters">
          {gradeTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={`management-filter-chip ${typeFilter === type ? 'active' : ''}`}
              onClick={() => setTypeFilter(type)}
            >
              {type === 'all' ? 'All types' : type}
            </button>
          ))}
          {hasActiveFilters && (
            <button type="button" className="management-filter-chip" onClick={resetFilters}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      {canManage && !isStudent && (
        <p className="grades-context-note">
          {managerForm.studentId
            ? `Viewing grade history for ${selectedStudentLabel}.`
            : 'Choose a student above to load their grade history and statistics.'}
        </p>
      )}

      {showChooserEmptyState ? (
        <EmptyState
          eyebrow="Start with a student"
          title="Choose a student to open the gradebook"
          description="Enter a student ID or email in the grade form above to review results and save a new score."
          compact
        />
      ) : showNoGradesState ? (
        <EmptyState
          eyebrow="No grades yet"
          title={canManage && !isStudent ? 'No grades recorded for this student' : 'No grades published yet'}
          description={canManage && !isStudent
            ? 'Once a grade is saved, it will appear here together with statistics for the selected student.'
            : 'Grades will appear here after teachers publish exam results.'}
          compact
        />
      ) : showFilteredEmptyState ? (
        <EmptyState
          eyebrow="Nothing matched"
          title="No grades match the active filters"
          description="Clear the current search or type filter to restore the full gradebook view."
          actionLabel="Clear filters"
          onAction={resetFilters}
          compact
        />
      ) : (
        <GradesTable grades={filteredGrades} totalCount={grades.length} />
      )}
    </div>
  );
}

export default Grades;
