import { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '../api';
import EmptyState from './EmptyState';
import StatusBanner from './StatusBanner';
import { canManageAcademicRecords } from '../roles';

const EMPTY_ASSIGNMENT_FORM = {
  title: '',
  description: '',
  dueDate: '',
  maxGrade: '100'
};

const ASSIGNMENTS_COPY = {
  English: {
    pageTitle: 'Assignments',
    loading: 'Loading assignments...',
    managerSubtitle: 'Publish coursework and keep teacher delivery fast.',
    studentSubtitle: 'Track open coursework and due dates in one place.',
    closeComposer: 'Close Composer',
    newAssignment: 'New Assignment',
    errorTitle: 'Assignments could not be updated',
    successTitle: 'Assignments updated',
    summary: {
      total: 'Total assignments',
      dueSoon: 'Due soon',
      overdue: 'Overdue'
    },
    filters: [
      { key: 'all', label: 'All assignments' },
      { key: 'due-soon', label: 'Due soon' },
      { key: 'overdue', label: 'Overdue' }
    ],
    statuses: {
      unscheduled: 'No due date',
      overdue: 'Overdue',
      today: 'Due today',
      dueSoon: 'Due soon',
      upcoming: (days) => `In ${days} days`
    },
    notScheduled: 'Not scheduled',
    composer: {
      duplicateTitle: 'Duplicate assignment',
      createTitle: 'Create assignment',
      subtitle: 'Keep the teacher flow fast: title, brief, deadline, and points in one place.',
      title: 'Title',
      titlePlaceholder: 'For example Lab 05 - Trees',
      dueDate: 'Due date',
      maxGrade: 'Max grade',
      description: 'Description',
      descriptionPlaceholder: 'Add instructions, topic, or deliverables',
      cancel: 'Cancel',
      saving: 'Saving...',
      createCopy: 'Create Copy',
      publish: 'Publish Assignment'
    },
    failedLoad: 'Failed to load assignments',
    publishSuccess: 'Assignment published successfully.',
    publishFailed: 'Failed to publish assignment',
    emptyTitle: 'No assignments match the current view',
    emptyFiltered: 'Clear the current filters to reopen the full assignment list.',
    emptyFresh: 'New assignments will appear here as soon as a teacher publishes them.',
    clearFilters: 'Clear filters',
    searchPlaceholder: 'Search by title or description',
    searchAria: 'Search assignments',
    noDescription: 'No description added yet.',
    due: 'Due',
    maxGrade: 'Max grade',
    published: 'Published',
    context: 'Context',
    generalAssignment: 'General assignment',
    duplicate: 'Duplicate'
  },
  Kyrgyz: {
    pageTitle: 'Тапшырмалар',
    loading: 'Тапшырмалар жүктөлүүдө...',
    managerSubtitle: 'Тапшырмаларды жарыялап, окутуучунун иш агымын ылдам кармаңыз.',
    studentSubtitle: 'Ачык тапшырмаларды жана мөөнөттөрдү бир жерден көзөмөлдөңүз.',
    closeComposer: 'Форманы жабуу',
    newAssignment: 'Жаңы тапшырма',
    errorTitle: 'Тапшырмалар жаңыртылган жок',
    successTitle: 'Тапшырмалар жаңыртылды',
    summary: {
      total: 'Жалпы тапшырмалар',
      dueSoon: 'Жакында бүтөт',
      overdue: 'Мөөнөтү өттү'
    },
    filters: [
      { key: 'all', label: 'Бардык тапшырмалар' },
      { key: 'due-soon', label: 'Жакында бүтөт' },
      { key: 'overdue', label: 'Мөөнөтү өттү' }
    ],
    statuses: {
      unscheduled: 'Мөөнөтү коюлган эмес',
      overdue: 'Мөөнөтү өттү',
      today: 'Бүгүн бүтөт',
      dueSoon: 'Жакында бүтөт',
      upcoming: (days) => `${days} күндөн кийин`
    },
    notScheduled: 'Пландалган эмес',
    composer: {
      duplicateTitle: 'Тапшырманы көчүрүү',
      createTitle: 'Тапшырма түзүү',
      subtitle: 'Окутуучунун иш агымын тез кармаңыз: аталышы, кыскача түшүндүрмө, мөөнөтү жана упайы бир жерде.',
      title: 'Аталышы',
      titlePlaceholder: 'Мисалы, Lab 05 - Trees',
      dueDate: 'Мөөнөтү',
      maxGrade: 'Максималдуу баа',
      description: 'Сүрөттөмө',
      descriptionPlaceholder: 'Нускамаларды, теманы же жыйынтыкты жазыңыз',
      cancel: 'Жокко чыгаруу',
      saving: 'Сакталууда...',
      createCopy: 'Көчүрмө түзүү',
      publish: 'Тапшырманы жарыялоо'
    },
    failedLoad: 'Тапшырмаларды жүктөө ишке ашкан жок',
    publishSuccess: 'Тапшырма ийгиликтүү жарыяланды.',
    publishFailed: 'Тапшырманы жарыялоо ишке ашкан жок',
    emptyTitle: 'Учурдагы көрүнүшкө дал келген тапшырма жок',
    emptyFiltered: 'Толук тапшырмалар тизмесин кайра ачуу үчүн чыпкаларды тазалаңыз.',
    emptyFresh: 'Окутуучу тапшырманы жарыялаганда ал бул жерде пайда болот.',
    clearFilters: 'Чыпкаларды тазалоо',
    searchPlaceholder: 'Аталышы же сүрөттөмөсү боюнча издөө',
    searchAria: 'Тапшырмаларды издөө',
    noDescription: 'Азырынча сүрөттөмө кошулган эмес.',
    due: 'Мөөнөтү',
    maxGrade: 'Макс. баа',
    published: 'Жарыяланган',
    context: 'Контекст',
    generalAssignment: 'Жалпы тапшырма',
    duplicate: 'Көчүрүү'
  }
};

function getAssignmentFilters(language = 'English') {
  return (ASSIGNMENTS_COPY[language] || ASSIGNMENTS_COPY.English).filters;
}

function getAssignmentStatus(dueDate, language = 'English') {
  const statusCopy = (ASSIGNMENTS_COPY[language] || ASSIGNMENTS_COPY.English).statuses;
  const parsed = dueDate ? new Date(dueDate) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return {
      key: 'unscheduled',
      label: statusCopy.unscheduled,
      accent: '#64748b'
    };
  }

  const now = new Date();
  const diffDays = Math.ceil((parsed.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { key: 'overdue', label: statusCopy.overdue, accent: '#ef4444' };
  }

  if (diffDays === 0) {
    return { key: 'today', label: statusCopy.today, accent: '#f97316' };
  }

  if (diffDays <= 3) {
    return { key: 'due-soon', label: statusCopy.dueSoon, accent: '#f59e0b' };
  }

  return { key: 'upcoming', label: statusCopy.upcoming(diffDays), accent: '#10b981' };
}

function formatDateTime(value, locale = 'en-GB', fallback = 'Not scheduled') {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(locale, {
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

function AssignmentSummary({ assignments, copy, language = 'English' }) {
  const totals = assignments.reduce((summary, assignment) => {
    const status = getAssignmentStatus(assignment.due_date, language).key;
    summary.total += 1;
    if (status === 'overdue') summary.overdue += 1;
    if (status === 'due-soon' || status === 'today') summary.dueSoon += 1;
    return summary;
  }, { total: 0, dueSoon: 0, overdue: 0 });

  return (
    <div className="management-summary-grid">
      <div className="management-summary-card">
        <span className="management-summary-label">{copy.total}</span>
        <strong>{totals.total}</strong>
      </div>
      <div className="management-summary-card">
        <span className="management-summary-label">{copy.dueSoon}</span>
        <strong>{totals.dueSoon}</strong>
      </div>
      <div className="management-summary-card">
        <span className="management-summary-label">{copy.overdue}</span>
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
  isTemplateMode,
  copy
}) {
  return (
    <form className="exam-form-card" onSubmit={onSubmit}>
      <div className="exam-form-header">
        <div>
          <h3>{isTemplateMode ? copy.duplicateTitle : copy.createTitle}</h3>
          <p>{copy.subtitle}</p>
        </div>
      </div>
      <div className="exam-form-grid">
        <label className="exam-form-field">
          <span className="exam-form-label">{copy.title}</span>
          <input
            type="text"
            placeholder={copy.titlePlaceholder}
            value={formData.title}
            onChange={(event) => onChange('title', event.target.value)}
            required
          />
        </label>
        <label className="exam-form-field">
          <span className="exam-form-label">{copy.dueDate}</span>
          <input
            type="datetime-local"
            value={formData.dueDate}
            onChange={(event) => onChange('dueDate', event.target.value)}
            required
          />
        </label>
        <label className="exam-form-field">
          <span className="exam-form-label">{copy.maxGrade}</span>
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
          <span className="exam-form-label">{copy.description}</span>
          <textarea
            rows="4"
            placeholder={copy.descriptionPlaceholder}
            value={formData.description}
            onChange={(event) => onChange('description', event.target.value)}
          />
        </label>
      </div>
      <div className="portal-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>{copy.cancel}</button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? copy.saving : (isTemplateMode ? copy.createCopy : copy.publish)}
        </button>
      </div>
    </form>
  );
}

function Assignments({ user, language = 'English', locale = 'en-GB' }) {
  const copy = ASSIGNMENTS_COPY[language] || ASSIGNMENTS_COPY.English;
  const filters = getAssignmentFilters(language);
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
  const hasActiveFilters = filterKey !== 'all' || searchTerm.trim() !== '';

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getAssignments();
      setAssignments(response?.assignments || []);
      setError('');
    } catch (err) {
      setError(err.message || copy.failedLoad);
    } finally {
      setLoading(false);
    }
  }, [copy.failedLoad]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

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
      setNotice(copy.publishSuccess);
    } catch (err) {
      setError(err.message || copy.publishFailed);
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
          <h1>{copy.pageTitle}</h1>
          <p>{copy.loading}</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{copy.pageTitle}</h1>
          <p>{canManage ? copy.managerSubtitle : copy.studentSubtitle}</p>
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
            {showComposer ? copy.closeComposer : copy.newAssignment}
          </button>
        )}
      </div>

      <StatusBanner tone="error" title={copy.errorTitle} message={error} />
      <StatusBanner tone="success" title={copy.successTitle} message={notice} />

      <AssignmentSummary assignments={assignments} copy={copy.summary} language={language} />

      <div className="management-toolbar">
        <div className="management-search">
          <input
            type="text"
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchAria}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="management-filters">
          {filters.map((filter) => (
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
          copy={copy.composer}
        />
      )}

      <div className="assignments-list">
        {filteredAssignments.length === 0 ? (
          <EmptyState
            eyebrow={copy.pageTitle}
            title={copy.emptyTitle}
            description={hasActiveFilters ? copy.emptyFiltered : copy.emptyFresh}
            actionLabel={hasActiveFilters ? copy.clearFilters : ''}
            onAction={() => {
              setSearchTerm('');
              setFilterKey('all');
            }}
          />
        ) : (
          filteredAssignments.map((assignment) => {
            const status = getAssignmentStatus(assignment.due_date, language);
            return (
              <article key={assignment.id} className="assignment-card">
                <div className="assignment-header">
                  <div className="assignment-heading">
                    <h3>{assignment.title}</h3>
                    <p>{assignment.description || copy.noDescription}</p>
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
                    <strong>{copy.due}</strong>
                    <span>{formatDateTime(assignment.due_date, locale, copy.notScheduled)}</span>
                  </div>
                  <div className="meta-item">
                    <strong>{copy.maxGrade}</strong>
                    <span>{assignment.max_grade || 100}</span>
                  </div>
                  <div className="meta-item">
                    <strong>{copy.published}</strong>
                    <span>{formatDateTime(assignment.created_at, locale, copy.notScheduled)}</span>
                  </div>
                  {(assignment.created_by_name || assignment.course_name) && (
                    <div className="meta-item">
                      <strong>{copy.context}</strong>
                      <span>
                        {assignment.course_name || copy.generalAssignment}
                        {assignment.created_by_name ? ` | ${assignment.created_by_name}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {canManage && (
                  <div className="assignment-actions">
                    <button type="button" className="btn-secondary" onClick={() => handleDuplicate(assignment)}>
                      {copy.duplicate}
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
