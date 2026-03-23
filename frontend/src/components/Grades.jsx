import { useEffect, useState } from 'react';

import { api } from '../api';
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

  return parsed.toLocaleDateString();
}

function GradesTable({ grades }) {
  return (
    <div className="grades-table">
      <div className="table-header">
        <div>Subject</div>
        <div>Type</div>
        <div>Grade</div>
        <div>Letter</div>
        <div>Date</div>
      </div>
      {grades.length === 0 ? (
        <div className="table-row">
          <div className="course-name">No grades yet</div>
          <div className="exam-name">-</div>
          <div className="grade-value">-</div>
          <div className="letter-grade">-</div>
          <div className="grade-date">-</div>
        </div>
      ) : (
        grades.map((grade) => (
          <div key={grade.id} className="table-row">
            <div className="course-name">{grade.subject || 'Unknown subject'}</div>
            <div className="exam-name">{grade.type || 'Exam'}</div>
            <div className="grade-value" style={{ color: getGradeColor(grade.grade) }}>
              {grade.grade}%
            </div>
            <div className="letter-grade">{getLetterGrade(grade.grade)}</div>
            <div className="grade-date">{formatDate(grade.exam_date || grade.graded_at)}</div>
          </div>
        ))
      )}
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

  const isStudent = isStudentAccount(user);
  const canManage = canManageAcademicRecords(user);
  const studentId = user?.studentId;

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

  const handleManagerInput = (field, value) => {
    setManagerForm((current) => ({ ...current, [field]: value }));
    setNotice('');
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

  if (error && isStudent) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Grades</h1>
          <p>Error loading grades: {error}</p>
        </div>
      </div>
    );
  }

  const average = Number(stats.average_grade || 0).toFixed(1);
  const totalExams = Number(stats.total_exams || grades.length || 0);
  const highestGrade = Number(stats.highest_grade || 0);

  if (canManage && !isStudent) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Grades</h1>
            <p>Assign and update grades for exam records.</p>
          </div>
          <div className="grades-summary">
            <div className="summary-card">
              <div className="summary-value">{exams.length}</div>
              <div className="summary-label">Available Exams</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{students.length}</div>
              <div className="summary-label">Students Loaded</div>
            </div>
            <div className="summary-card">
              <div className="summary-value">{managerForm.studentId ? average : '0.0'}</div>
              <div className="summary-label">Selected Avg</div>
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {notice && <div className="success-message">{notice}</div>}

        <form className="exam-form-card" onSubmit={handleSaveGrade}>
          <div className="exam-form-header">
            <div>
              <h3>Save grade</h3>
              <p>Select an exam, choose a student, and submit the score.</p>
            </div>
          </div>
          <div className="exam-form-grid">
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
            <input
              list="grade-student-ids"
              type="text"
              placeholder="Student ID"
              value={managerForm.studentId}
              onChange={(event) => handleManagerInput('studentId', event.target.value)}
              required
            />
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Grade"
              value={managerForm.grade}
              onChange={(event) => handleManagerInput('grade', event.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Comments"
              value={managerForm.comments}
              onChange={(event) => handleManagerInput('comments', event.target.value)}
            />
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
            <button type="submit" className="btn-primary">Save Grade</button>
          </div>
        </form>

        <GradesTable grades={grades} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Grades</h1>
          <p>Track your academic performance</p>
        </div>
        <div className="grades-summary">
          <div className="summary-card">
            <div className="summary-value">{average}</div>
            <div className="summary-label">Average Grade</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{totalExams}</div>
            <div className="summary-label">Total Exams</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{highestGrade}</div>
            <div className="summary-label">Highest Grade</div>
          </div>
        </div>
      </div>

      <GradesTable grades={grades} />
    </div>
  );
}

export default Grades;
