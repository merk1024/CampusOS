import { useEffect, useState } from 'react';

import { api } from '../api';

const EMPTY_FORM = {
  group_name: '',
  subject: '',
  exam_date: '',
  exam_time: '',
  room: '',
  type: 'Exam',
  semester: '',
  studentsText: ''
};

function Exams({ user }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');

  const canManage = user?.role === 'teacher' || user?.role === 'admin';

  const loadExams = async () => {
    try {
      setLoading(true);
      const response = await api.getExams();
      setExams(response?.exams || []);
      setError('');
    } catch (err) {
      console.error('Failed to load exams:', err);
      setError(err.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const students = formData.studentsText
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      group_name: formData.group_name,
      subject: formData.subject,
      exam_date: formData.exam_date,
      exam_time: formData.exam_time,
      room: formData.room,
      type: formData.type,
      semester: formData.semester,
      students
    };

    try {
      if (editingId) {
        await api.updateExam(editingId, payload);
      } else {
        await api.createExam(payload);
      }

      await loadExams();
      resetForm();
    } catch (err) {
      console.error('Failed to save exam:', err);
      setError(err.message || 'Failed to save exam');
    }
  };

  const handleEdit = (exam) => {
    setEditingId(exam.id);
    setFormData({
      group_name: exam.group_name || '',
      subject: exam.subject || '',
      exam_date: exam.exam_date || '',
      exam_time: exam.exam_time || '',
      room: exam.room || '',
      type: exam.type || 'Exam',
      semester: exam.semester || '',
      studentsText: (exam.students || []).join(', ')
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteExam(id);
      await loadExams();
    } catch (err) {
      console.error('Failed to delete exam:', err);
      setError(err.message || 'Failed to delete exam');
    }
  };

  const groups = ['all', ...new Set(exams.map((exam) => exam.group_name).filter(Boolean))];
  const filteredExams = exams.filter((exam) => {
    const matchesGroup = groupFilter === 'all' || exam.group_name === groupFilter;
    const haystack = [exam.subject, exam.group_name, exam.teacher_name, exam.room, exam.type]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return matchesGroup && haystack.includes(searchTerm.toLowerCase());
  });
  const upcomingCount = exams.filter((exam) => exam.exam_date && new Date(exam.exam_date) >= new Date(new Date().toDateString())).length;

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Exams</h1>
          <p>Loading exam list...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Exams</h1>
          <p>{canManage ? 'Create and manage exams for groups' : 'Your scheduled exams'}</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            Add Exam
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="exam-dashboard-grid">
        <div className="management-summary-card">
          <span className="management-summary-label">Total exams</span>
          <strong>{exams.length}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">Upcoming</span>
          <strong>{upcomingCount}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">Groups</span>
          <strong>{groups.length - 1}</strong>
        </div>
      </div>

      <div className="management-toolbar">
        <div className="management-search">
          <input
            type="text"
            placeholder="Search by subject, group, teacher or room"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="management-filters">
          {groups.map((group) => (
            <button
              key={group}
              type="button"
              className={`management-filter-chip ${groupFilter === group ? 'active' : ''}`}
              onClick={() => setGroupFilter(group)}
            >
              {group === 'all' ? 'All groups' : group}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <form className="exam-form-card" onSubmit={handleSubmit}>
          <div className="exam-form-header">
            <div>
              <h3>{editingId ? 'Update exam' : 'Create new exam'}</h3>
              <p>Use one place to assign date, group and students.</p>
            </div>
          </div>
          <div className="exam-form-grid">
            <input
              type="text"
              placeholder="Group"
              value={formData.group_name}
              onChange={(event) => setFormData({ ...formData, group_name: event.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Subject"
              value={formData.subject}
              onChange={(event) => setFormData({ ...formData, subject: event.target.value })}
              required
            />
            <input
              type="date"
              value={formData.exam_date}
              onChange={(event) => setFormData({ ...formData, exam_date: event.target.value })}
              required
            />
            <input
              type="time"
              value={formData.exam_time}
              onChange={(event) => setFormData({ ...formData, exam_time: event.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Room"
              value={formData.room}
              onChange={(event) => setFormData({ ...formData, room: event.target.value })}
            />
            <input
              type="text"
              placeholder="Type"
              value={formData.type}
              onChange={(event) => setFormData({ ...formData, type: event.target.value })}
            />
            <select
              value={formData.semester}
              onChange={(event) => setFormData({ ...formData, semester: event.target.value })}
            >
              <option value="">Select semester</option>
              <option value="Spring 2025-2026">Spring 2025-2026</option>
              <option value="Fall 2025-2026">Fall 2025-2026</option>
            </select>
            <textarea
              className="exam-students-textarea"
              placeholder="Student IDs, separated by commas or new lines"
              value={formData.studentsText}
              onChange={(event) => setFormData({ ...formData, studentsText: event.target.value })}
              rows="3"
            />
          </div>
          <div className="portal-actions">
            <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
            <button type="submit" className="btn-primary">{editingId ? 'Update Exam' : 'Create Exam'}</button>
          </div>
        </form>
      )}

      <div className="exam-list">
        {filteredExams.map((exam) => (
          <div key={exam.id} className="exam-card">
            <div className="exam-card-header">
              <div>
                <h3>{exam.subject}</h3>
                <p>{exam.group_name} • {exam.type || 'Exam'}</p>
              </div>
              {canManage && (
                <div className="exam-card-actions">
                  <button className="btn-secondary" onClick={() => handleEdit(exam)}>Edit</button>
                  <button className="btn-secondary" onClick={() => handleDelete(exam.id)}>Delete</button>
                </div>
              )}
            </div>
            <div className="exam-meta-grid">
              <div><strong>Date:</strong> {exam.exam_date}</div>
              <div><strong>Time:</strong> {exam.exam_time}</div>
              <div><strong>Room:</strong> {exam.room || 'Not set'}</div>
              <div><strong>Teacher:</strong> {exam.teacher_name || 'Not set'}</div>
              <div><strong>Semester:</strong> {exam.semester || 'Not set'}</div>
              <div><strong>Students:</strong> {exam.students?.length ? exam.students.join(', ') : 'Not set'}</div>
            </div>
          </div>
        ))}

        {filteredExams.length === 0 && (
          <div className="schedule-placeholder">
            <p>No exams found for the current filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Exams;
