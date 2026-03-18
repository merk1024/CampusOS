import { useState, useEffect } from 'react';
import { api } from '../api';

// Assignments
function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const response = await api.getAssignments();
        setAssignments(response.assignments || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, []);

  const getStatusColor = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '#ef4444'; // overdue
    if (diffDays <= 1) return '#f59e0b'; // due soon
    return '#10b981'; // ok
  };

  const getStatusText = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due Today';
    if (diffDays === 1) return 'Due Tomorrow';
    return `Due in ${diffDays} days`;
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>📝 Assignments</h1>
          <p>Loading assignments...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>📝 Assignments</h1>
          <p>Error loading assignments: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>📝 Assignments</h1>
        <p>View and submit your assignments</p>
      </div>

      <div className="assignments-list">
        {assignments.length === 0 ? (
          <div className="no-assignments">
            <p>No assignments available</p>
          </div>
        ) : (
          assignments.map(assignment => (
            <div key={assignment.id} className="assignment-card">
              <div className="assignment-header">
                <h3>{assignment.title}</h3>
                <span
                  className="assignment-status"
                  style={{ backgroundColor: getStatusColor(assignment.due_date) }}
                >
                  {getStatusText(assignment.due_date)}
                </span>
              </div>

              <p className="assignment-description">{assignment.description}</p>

              <div className="assignment-meta">
                <div className="meta-item">
                  <span className="meta-icon">📅</span>
                  <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-icon">📊</span>
                  <span>Max Grade: {assignment.max_grade || 100}</span>
                </div>
              </div>

              <div className="assignment-actions">
                <button className="btn-submit">Submit Assignment</button>
                <button className="btn-view">View Details</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Assignments;