import { useState, useEffect } from 'react';
import { api } from '../api';

// Grades
function Grades() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGrades = async () => {
      try {
        const response = await api.getGrades();
        setGrades(response.grades || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadGrades();
  }, []);

  const getGradeColor = (grade) => {
    if (grade >= 90) return '#10b981';
    if (grade >= 80) return '#3b82f6';
    if (grade >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const getLetterGrade = (grade) => {
    if (grade >= 95) return 'A+';
    if (grade >= 90) return 'A';
    if (grade >= 85) return 'A-';
    if (grade >= 80) return 'B+';
    if (grade >= 75) return 'B';
    if (grade >= 70) return 'B-';
    if (grade >= 65) return 'C+';
    if (grade >= 60) return 'C';
    return 'F';
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>📊 Grades</h1>
          <p>Loading your grades...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>📊 Grades</h1>
          <p>Error loading grades: {error}</p>
        </div>
      </div>
    );
  }

  const average = grades.length > 0 ? (grades.reduce((sum, g) => sum + g.grade, 0) / grades.length).toFixed(1) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>📊 Grades</h1>
          <p>Track your academic performance</p>
        </div>
        <div className="grades-summary">
          <div className="summary-card">
            <div className="summary-value">{average}</div>
            <div className="summary-label">Average Grade</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{grades.length}</div>
            <div className="summary-label">Total Exams</div>
          </div>
        </div>
      </div>

      <div className="grades-table">
        <div className="table-header">
          <div>Course</div>
          <div>Exam</div>
          <div>Grade</div>
          <div>Letter</div>
          <div>Date</div>
        </div>
        {grades.map(grade => (
          <div key={grade.id} className="table-row">
            <div className="course-name">{grade.course_name || 'Unknown Course'}</div>
            <div className="exam-name">{grade.exam_subject || 'Exam'}</div>
            <div className="grade-value" style={{ color: getGradeColor(grade.grade) }}>
              {grade.grade}%
            </div>
            <div className="letter-grade">{getLetterGrade(grade.grade)}</div>
            <div className="grade-date">{new Date(grade.graded_at || Date.now()).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Grades;