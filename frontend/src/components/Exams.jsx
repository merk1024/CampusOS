import { useEffect, useMemo, useState } from 'react';

import { api } from '../api';
import EmptyState from './EmptyState';
import StatusBanner from './StatusBanner';
import { canManageAcademicRecords } from '../roles';

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

function formatExamDate(value) {
  if (!value) return 'Not set';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString();
}

function toLocalDateValue(value) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function Exams({ user }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [ownershipFilter, setOwnershipFilter] = useState('all');

  const canManage = canManageAcademicRecords(user);
  const hasActiveFilters = groupFilter !== 'all' || ownershipFilter !== 'all' || searchTerm.trim() !== '';

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

  const openCreateForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
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
      let nextNotice = '';
      if (editingId) {
        await api.updateExam(editingId, payload);
        nextNotice = 'Exam updated successfully.';
      } else {
        await api.createExam(payload);
        nextNotice = 'Exam created successfully.';
      }

      await loadExams();
      resetForm();
      setNotice(nextNotice);
    } catch (err) {
      console.error('Failed to save exam:', err);
      setError(err.message || 'Failed to save exam');
      setNotice('');
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

  const handleDuplicate = (exam) => {
    setEditingId(null);
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
      setNotice('Exam deleted successfully.');
    } catch (err) {
      console.error('Failed to delete exam:', err);
      setError(err.message || 'Failed to delete exam');
      setNotice('');
    }
  };

  const groups = useMemo(
    () => ['all', ...new Set(exams.map((exam) => exam.group_name).filter(Boolean))],
    [exams]
  );

  const filteredExams = useMemo(() => (
    exams.filter((exam) => {
      const matchesGroup = groupFilter === 'all' || exam.group_name === groupFilter;
      const isOwnedByCurrentUser = canManage && (
        Number(exam.created_by) === Number(user?.id)
        || exam.teacher_name === user?.name
      );
      const matchesOwnership = ownershipFilter === 'all' || isOwnedByCurrentUser;
      const haystack = [exam.subject, exam.group_name, exam.teacher_name, exam.room, exam.type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesGroup && matchesOwnership && haystack.includes(searchTerm.toLowerCase());
    })
  ), [canManage, exams, groupFilter, ownershipFilter, searchTerm, user?.id, user?.name]);

  const today = new Date(new Date().toDateString());
  const upcomingCount = exams.filter((exam) => {
    const examDate = toLocalDateValue(exam.exam_date);
    return examDate && examDate >= today;
  }).length;
  const mineCount = exams.filter((exam) => (
    Number(exam.created_by) === Number(user?.id)
    || exam.teacher_name === user?.name
  )).length;

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
          <p>{canManage ? 'Create and manage exams for groups.' : 'Your scheduled exams.'}</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => (showForm ? resetForm() : openCreateForm())}>
            {showForm ? 'Close Composer' : 'Add Exam'}
          </button>
        )}
      </div>

      <StatusBanner tone="error" title="Exams could not be updated" message={error} />
      <StatusBanner tone="success" title="Exams updated" message={notice} />

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
        {canManage && (
          <div className="management-summary-card">
            <span className="management-summary-label">My exams</span>
            <strong>{mineCount}</strong>
          </div>
        )}
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
          {canManage && (
            <>
              <button
                type="button"
                className={`management-filter-chip ${ownershipFilter === 'all' ? 'active' : ''}`}
                onClick={() => setOwnershipFilter('all')}
              >
                All exams
              </button>
              <button
                type="button"
                className={`management-filter-chip ${ownershipFilter === 'mine' ? 'active' : ''}`}
                onClick={() => setOwnershipFilter('mine')}
              >
                My exams
              </button>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <form className="exam-form-card" onSubmit={handleSubmit}>
          <div className="exam-form-header">
            <div>
              <h3>{editingId ? 'Update exam' : 'Create new exam'}</h3>
              <p>Use one place to assign date, group and students. Duplicate similar sessions when the structure repeats.</p>
            </div>
          </div>
          <div className="exam-form-grid">
            <label className="exam-form-field">
              <span className="exam-form-label">Group</span>
              <input
                type="text"
                placeholder="For example CYB-23"
                value={formData.group_name}
                onChange={(event) => setFormData({ ...formData, group_name: event.target.value })}
                required
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">Subject</span>
              <input
                type="text"
                placeholder="For example Database Systems"
                value={formData.subject}
                onChange={(event) => setFormData({ ...formData, subject: event.target.value })}
                required
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">Exam date</span>
              <input
                type="date"
                value={formData.exam_date}
                onChange={(event) => setFormData({ ...formData, exam_date: event.target.value })}
                required
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">Exam time</span>
              <input
                type="time"
                value={formData.exam_time}
                onChange={(event) => setFormData({ ...formData, exam_time: event.target.value })}
                required
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">Room</span>
              <input
                type="text"
                placeholder="For example A-205"
                value={formData.room}
                onChange={(event) => setFormData({ ...formData, room: event.target.value })}
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">Type</span>
              <input
                type="text"
                placeholder="Exam, Midterm, Quiz"
                value={formData.type}
                onChange={(event) => setFormData({ ...formData, type: event.target.value })}
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">Semester</span>
              <select
                value={formData.semester}
                onChange={(event) => setFormData({ ...formData, semester: event.target.value })}
              >
                <option value="">Select semester</option>
                <option value="Spring 2025-2026">Spring 2025-2026</option>
                <option value="Fall 2025-2026">Fall 2025-2026</option>
              </select>
            </label>
            <label className="exam-form-field exam-form-field-wide">
              <span className="exam-form-label">Students</span>
              <textarea
                className="exam-students-textarea"
                placeholder="Student IDs, separated by commas or new lines"
                value={formData.studentsText}
                onChange={(event) => setFormData({ ...formData, studentsText: event.target.value })}
                rows="3"
              />
            </label>
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
                <p>{exam.group_name} | {exam.type || 'Exam'}</p>
              </div>
              {canManage && (
                <div className="exam-card-actions">
                  <button className="btn-secondary" onClick={() => handleDuplicate(exam)}>Duplicate</button>
                  <button className="btn-secondary" onClick={() => handleEdit(exam)}>Edit</button>
                  <button className="btn-secondary" onClick={() => handleDelete(exam.id)}>Delete</button>
                </div>
              )}
            </div>
            <div className="exam-meta-grid">
              <div><strong>Date:</strong> {formatExamDate(exam.exam_date)}</div>
              <div><strong>Time:</strong> {exam.exam_time || 'Not set'}</div>
              <div><strong>Room:</strong> {exam.room || 'Not set'}</div>
              <div><strong>Teacher:</strong> {exam.teacher_name || 'Not set'}</div>
              <div><strong>Semester:</strong> {exam.semester || 'Not set'}</div>
              <div><strong>Students:</strong> {exam.students?.length ? exam.students.join(', ') : 'Not set'}</div>
            </div>
          </div>
        ))}

        {filteredExams.length === 0 && (
          <EmptyState
            eyebrow="Exams"
            title="No exams match the current filters"
            description={hasActiveFilters ? 'Reset the current filters to reopen the full exam list.' : 'Scheduled exams will appear here once a teacher or admin creates them.'}
            actionLabel={hasActiveFilters ? 'Clear filters' : ''}
            onAction={() => {
              setSearchTerm('');
              setGroupFilter('all');
              setOwnershipFilter('all');
            }}
          />
        )}
      </div>
    </div>
  );
}

export default Exams;
