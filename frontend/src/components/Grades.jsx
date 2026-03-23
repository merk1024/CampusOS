import { useEffect, useState } from 'react';

import { api } from '../api';

const EMPTY_STATS = {
  total_exams: 0,
  average_grade: 0,
  highest_grade: 0,
  lowest_grade: 0
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

function Grades({ user }) {
  const [grades, setGrades] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isStudent = user?.role === 'student';
  const studentId = user?.studentId;

  useEffect(() => {
    const loadGrades = async () => {
      if (!isStudent) {
        setGrades([]);
        setStats(EMPTY_STATS);
        setLoading(false);
        return;
      }

      if (!studentId) {
        setError('Student ID is missing for this account.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const [gradesResponse, statsResponse] = await Promise.all([
          api.getGrades(studentId),
          api.getGradeStats(studentId)
        ]);

        setGrades(gradesResponse?.grades || []);
        setStats({
          ...EMPTY_STATS,
          ...(statsResponse?.stats || {})
        });
      } catch (err) {
        setError(err.message || 'Failed to load grades');
      } finally {
        setLoading(false);
      }
    };

    loadGrades();
  }, [isStudent, studentId]);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Grades</h1>
          <p>Loading your grades...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isStudent) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Grades</h1>
          <p>This section is currently available for student accounts.</p>
        </div>
      </div>
    );
  }

  if (error) {
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
    </div>
  );
}

export default Grades;
