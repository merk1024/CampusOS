import { useEffect, useMemo, useState } from 'react';

import { api } from '../api';
import { canManageAcademicRecords } from '../roles';

const EMPTY_ASSIGNMENT_FORM = {
  title: '',
  description: '',
  dueDate: '',
  maxGrade: '100'
};

const ASSIGNMENT_FILTERS = [
  { key: 'all', label: 'All assignments' },
  { key: 'due-soon', label: 'Due soon' },
  { key: 'overdue', label: 'Overdue' }
];

function getAssignmentStatus(dueDate) {
  const parsed = dueDate ? new Date(dueDate) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return {
      key: 'unscheduled',
      label: 'No due date',
      accent: '#64748b'
    };
  }

  const now = new Date();
  const diffDays = Math.ceil((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { key: 'overdue', label: 'Overdue', accent: '#ef4444' };
  }

  if (diffDays === 0) {
    return { key: 'today', label: 'Due today', accent: '#f97316' };
  }

  if (diffDays <= 3) {
    return { key: 'due-soon', label: 'Due soon', accent: '#f59e0b' };
  }

  return { key: 'upcoming', label: `In ${diffDays} days`, accent: '#10b981' };
}

function formatDateTime(value) {
  if (!value) return 'Not scheduled';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function toDatetimeLocalInput(value) {
  if (!value) return '';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const timezoneOffsetMs = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

function AssignmentSummary({ assignments }) {
  const totals = assignments.reduce((summary, assignment) => {
    const status = getAssignmentStatus(assignment.due_date).key;
    summary.total += 1;
    if (status === 'overdue') summary.overdue += 1;
    if (status === 'due-soon' || status === 'today') summary.dueSoon += 1;
    return summary;
  }, { total: 0, dueSoon: 0, overdue: 0 });

  return (
    <div className="management-summary-grid">
      <div className="management-summary-card">
        <span className="management-summary-label">Total assignments</span>
        <strong>{totals.total}</strong>
      </div>
      <div className="management-summary-card">
        <span className="management-summary-label">Due soon</span>
        <strong>{totals.dueSoon}</strong>
      </div>
      <div className="management-summary-card">
        <span className="management-summary-label">Overdue</span>
        <strong>{totals.overdue}</strong>
      </div>
    </div>
  );
}

function AssignmentComposer({
  formData,
  onChange,
  onCancel,
  onSubmit,
  saving,
  isTemplateMode
}) {
  return (
    <form className="exam-form-card" onSubmit={onSubmit}>
      <div className="exam-form-header">
        <div>
          <h3>{isTemplateMode ? 'Duplicate assignment' : 'Create assignment'}</h3>
          <p>Keep the teacher flow fast: title, brief, deadline, and points in one place.</p>
        </div>
      </div>
      <div className="exam-form-grid">
        <label className="exam-form-field">
          <span className="exam-form-label">Title</span>
          <input
            type="text"
            placeholder="For example Lab 05 - Trees"
            value={formData.title}
            onChange={(event) => onChange('title', event.target.value)}
            required
          />
        </label>
        <label className="exam-form-field">
          <span className="exam-form-label">Due date</span>
          <input
            type="datetime-local"
            value={formData.dueDate}
            onChange={(event) => onChange('dueDate', event.target.value)}
            required
          />
        </label>
        <label className="exam-form-field">
          <span className="exam-form-label">Max grade</span>
          <input
            type="number"
            min="1"
            max="1000"
            step="1"
            placeholder="100"
            value={formData.maxGrade}
            onChange={(event) => onChange('maxGrade', event.target.value)}
            required
          />
        </label>
        <label className="exam-form-field exam-form-field-wide">
          <span className="exam-form-label">Description</span>
          <textarea
            rows="4"
            placeholder="Add instructions, topic, or deliverables"
            value={formData.description}
            onChange={(event) => onChange('description', event.target.value)}
          />
        </label>
      </div>
      <div className="portal-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : (isTemplateMode ? 'Create Copy' : 'Publish Assignment')}
        </button>
      </div>
    </form>
  );
}

function Assignments({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [composerMode, setComposerMode] = useState('create');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKey, setFilterKey] = useState('all');
  const [formData, setFormData] = useState(EMPTY_ASSIGNMENT_FORM);

  const canManage = canManageAcademicRecords(user);
  const isTemplateMode = composerMode === 'duplicate';

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const response = await api.getAssignments();
      setAssignments(response?.assignments || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const filteredAssignments = useMemo(() => (
    assignments.filter((assignment) => {
      const status = getAssignmentStatus(assignment.due_date).key;
      const matchesFilter = (
        filterKey === 'all'
        || (filterKey === 'due-soon' && (status === 'due-soon' || status === 'today'))
        || (filterKey === 'overdue' && status === 'overdue')
      );

      const searchable = [
        assignment.title,
        assignment.description,
        assignment.course_name,
        assignment.file_path
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesFilter && searchable.includes(searchTerm.trim().toLowerCase());
    })
  ), [assignments, filterKey, searchTerm]);

  const resetComposer = () => {
    setFormData(EMPTY_ASSIGNMENT_FORM);
    setComposerMode('create');
    setShowComposer(false);
    setNotice('');
  };

  const handleFormChange = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value
    }));
    setError('');
    setNotice('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setNotice('');

      await api.createAssignment({
        title: formData.title.trim(),
        description: formData.description.trim(),
        dueDate: new Date(formData.dueDate).toISOString(),
        maxGrade: Number(formData.maxGrade || 100)
      });

      await loadAssignments();
      setFormData(EMPTY_ASSIGNMENT_FORM);
      setComposerMode('create');
      setShowComposer(false);
      setNotice('Assignment published successfully.');
    } catch (err) {
      setError(err.message || 'Failed to publish assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = (assignment) => {
    setComposerMode('duplicate');
    setFormData({
      title: `${assignment.title} (Copy)`,
      description: assignment.description || '',
      dueDate: toDatetimeLocalInput(assignment.due_date),
      maxGrade: String(assignment.max_grade || 100)
    });
    setShowComposer(true);
    setNotice('');
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Assignments</h1>
          <p>Loading assignments...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Assignments</h1>
          <p>{canManage ? 'Publish coursework and keep teacher delivery fast.' : 'Track open coursework and due dates in one place.'}</p>
        </div>
        {canManage && (
          <button
            className="btn-primary"
            onClick={() => {
              if (showComposer) {
                resetComposer();
                return;
              }

              setComposerMode('create');
              setFormData(EMPTY_ASSIGNMENT_FORM);
              setShowComposer(true);
            }}
          >
            {showComposer ? 'Close Composer' : 'New Assignment'}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {notice && <div className="success-message">{notice}</div>}

      <AssignmentSummary assignments={assignments} />

      <div className="management-toolbar">
        <div className="management-search">
          <input
            type="text"
            placeholder="Search by title or description"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="management-filters">
          {ASSIGNMENT_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`management-filter-chip ${filterKey === filter.key ? 'active' : ''}`}
              onClick={() => setFilterKey(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {canManage && showComposer && (
        <AssignmentComposer
          formData={formData}
          onChange={handleFormChange}
          onCancel={resetComposer}
          onSubmit={handleSubmit}
          saving={saving}
          isTemplateMode={isTemplateMode}
        />
      )}

      <div className="assignments-list">
        {filteredAssignments.length === 0 ? (
          <div className="assignments-placeholder">
            <p>No assignments found for the current filters.</p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const status = getAssignmentStatus(assignment.due_date);
            return (
              <article key={assignment.id} className="assignment-card">
                <div className="assignment-header">
                  <div className="assignment-heading">
                    <h3>{assignment.title}</h3>
                    <p>{assignment.description || 'No description added yet.'}</p>
                  </div>
                  <span
                    className={`assignment-status assignment-status-${status.key}`}
                    style={{ '--assignment-accent': status.accent }}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="assignment-meta">
                  <div className="meta-item">
                    <strong>Due</strong>
                    <span>{formatDateTime(assignment.due_date)}</span>
                  </div>
                  <div className="meta-item">
                    <strong>Max grade</strong>
                    <span>{assignment.max_grade || 100}</span>
                  </div>
                  <div className="meta-item">
                    <strong>Published</strong>
                    <span>{formatDateTime(assignment.created_at)}</span>
                  </div>
                  {(assignment.created_by_name || assignment.course_name) && (
                    <div className="meta-item">
                      <strong>Context</strong>
                      <span>
                        {assignment.course_name || 'General assignment'}
                        {assignment.created_by_name ? ` | ${assignment.created_by_name}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="assignment-actions">
                    <button type="button" className="btn-secondary" onClick={() => handleDuplicate(assignment)}>
                      Duplicate
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Assignments;
