import { useCallback, useEffect, useMemo, useState } from 'react';

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

const EXAMS_COPY = {
  English: {
    pageTitle: 'Exams',
    loading: 'Loading exam list...',
    managerSubtitle: 'Create and manage exams for groups.',
    studentSubtitle: 'Your scheduled exams.',
    closeComposer: 'Close Composer',
    addExam: 'Add Exam',
    errorTitle: 'Exams could not be updated',
    successTitle: 'Exams updated',
    summary: {
      total: 'Total exams',
      upcoming: 'Upcoming',
      groups: 'Groups',
      mine: 'My exams'
    },
    searchPlaceholder: 'Search by subject, group, teacher or room',
    searchAria: 'Search exams',
    allGroups: 'All groups',
    allExams: 'All exams',
    myExams: 'My exams',
    form: {
      updateTitle: 'Update exam',
      createTitle: 'Create new exam',
      subtitle: 'Use one place to assign date, group and students. Duplicate similar sessions when the structure repeats.',
      group: 'Group',
      groupPlaceholder: 'For example CYB-23',
      subject: 'Subject',
      subjectPlaceholder: 'For example Database Systems',
      examDate: 'Exam date',
      examTime: 'Exam time',
      room: 'Room',
      roomPlaceholder: 'For example A-205',
      type: 'Type',
      typePlaceholder: 'Exam, Midterm, Quiz',
      semester: 'Semester',
      selectSemester: 'Select semester',
      students: 'Students',
      studentsPlaceholder: 'Student IDs, separated by commas or new lines',
      cancel: 'Cancel',
      update: 'Update Exam',
      create: 'Create Exam'
    },
    notices: {
      updated: 'Exam updated successfully.',
      created: 'Exam created successfully.',
      deleted: 'Exam deleted successfully.',
      saveFailed: 'Failed to save exam',
      loadFailed: 'Failed to load exams',
      deleteFailed: 'Failed to delete exam'
    },
    actions: {
      duplicate: 'Duplicate',
      edit: 'Edit',
      delete: 'Delete'
    },
    meta: {
      date: 'Date',
      time: 'Time',
      room: 'Room',
      teacher: 'Teacher',
      semester: 'Semester',
      students: 'Students'
    },
    notSet: 'Not set',
    examFallback: 'Exam',
    emptyTitle: 'No exams match the current filters',
    emptyFiltered: 'Reset the current filters to reopen the full exam list.',
    emptyFresh: 'Scheduled exams will appear here once a teacher or admin creates them.',
    clearFilters: 'Clear filters'
  },
  Kyrgyz: {
    pageTitle: 'Экзамендер',
    loading: 'Экзамендер тизмеси жүктөлүүдө...',
    managerSubtitle: 'Топтор үчүн экзамендерди түзүп жана башкарыңыз.',
    studentSubtitle: 'Сиздин пландалган экзамендериңиз.',
    closeComposer: 'Форманы жабуу',
    addExam: 'Экзамен кошуу',
    errorTitle: 'Экзамендер жаңыртылган жок',
    successTitle: 'Экзамендер жаңыртылды',
    summary: {
      total: 'Жалпы экзамендер',
      upcoming: 'Алдыдагы',
      groups: 'Топтор',
      mine: 'Менин экзамендерим'
    },
    searchPlaceholder: 'Предмет, топ, окутуучу же кабинет боюнча издөө',
    searchAria: 'Экзамендерди издөө',
    allGroups: 'Бардык топтор',
    allExams: 'Бардык экзамендер',
    myExams: 'Менин экзамендерим',
    form: {
      updateTitle: 'Экзаменди жаңыртуу',
      createTitle: 'Жаңы экзамен түзүү',
      subtitle: 'Датаны, топту жана студенттерди бир жерден дайындаңыз. Түзүмү окшош болсо, сессияларды көчүрүп пайдаланыңыз.',
      group: 'Топ',
      groupPlaceholder: 'Мисалы, CYB-23',
      subject: 'Предмет',
      subjectPlaceholder: 'Мисалы, Database Systems',
      examDate: 'Экзамен күнү',
      examTime: 'Экзамен убактысы',
      room: 'Кабинет',
      roomPlaceholder: 'Мисалы, A-205',
      type: 'Түрү',
      typePlaceholder: 'Exam, Midterm, Quiz',
      semester: 'Семестр',
      selectSemester: 'Семестрди тандаңыз',
      students: 'Студенттер',
      studentsPlaceholder: 'Студент IDлерин үтүр же жаңы сап менен жазыңыз',
      cancel: 'Жокко чыгаруу',
      update: 'Экзаменди жаңыртуу',
      create: 'Экзамен түзүү'
    },
    notices: {
      updated: 'Экзамен ийгиликтүү жаңыртылды.',
      created: 'Экзамен ийгиликтүү түзүлдү.',
      deleted: 'Экзамен ийгиликтүү өчүрүлдү.',
      saveFailed: 'Экзаменди сактоо ишке ашкан жок',
      loadFailed: 'Экзамендерди жүктөө ишке ашкан жок',
      deleteFailed: 'Экзаменди өчүрүү ишке ашкан жок'
    },
    actions: {
      duplicate: 'Көчүрүү',
      edit: 'Оңдоо',
      delete: 'Өчүрүү'
    },
    meta: {
      date: 'Күнү',
      time: 'Убактысы',
      room: 'Кабинет',
      teacher: 'Окутуучу',
      semester: 'Семестр',
      students: 'Студенттер'
    },
    notSet: 'Коюлган эмес',
    examFallback: 'Экзамен',
    emptyTitle: 'Учурдагы чыпкаларга дал келген экзамен жок',
    emptyFiltered: 'Толук экзамен тизмесин кайра ачуу үчүн чыпкаларды тазалаңыз.',
    emptyFresh: 'Окутуучу же админ экзамен түзгөндө ал бул жерде пайда болот.',
    clearFilters: 'Чыпкаларды тазалоо'
  }
};

function formatExamDate(value, locale = 'en-GB', fallback = 'Not set') {
  if (!value) return fallback;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(locale);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(locale);
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

function Exams({ user, language = 'English', locale = 'en-GB' }) {
  const copy = EXAMS_COPY[language] || EXAMS_COPY.English;
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

  const loadExams = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getExams();
      setExams(response?.exams || []);
      setError('');
    } catch (err) {
      console.error('Failed to load exams:', err);
      setError(err.message || copy.notices.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [copy.notices.loadFailed]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

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
        nextNotice = copy.notices.updated;
      } else {
        await api.createExam(payload);
        nextNotice = copy.notices.created;
      }

      await loadExams();
      resetForm();
      setNotice(nextNotice);
    } catch (err) {
      console.error('Failed to save exam:', err);
      setError(err.message || copy.notices.saveFailed);
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
      type: exam.type || copy.examFallback,
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
      type: exam.type || copy.examFallback,
      semester: exam.semester || '',
      studentsText: (exam.students || []).join(', ')
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteExam(id);
      await loadExams();
      setNotice(copy.notices.deleted);
    } catch (err) {
      console.error('Failed to delete exam:', err);
      setError(err.message || copy.notices.deleteFailed);
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
          <button className="btn-primary" onClick={() => (showForm ? resetForm() : openCreateForm())}>
            {showForm ? copy.closeComposer : copy.addExam}
          </button>
        )}
      </div>

      <StatusBanner tone="error" title={copy.errorTitle} message={error} />
      <StatusBanner tone="success" title={copy.successTitle} message={notice} />

      <div className="exam-dashboard-grid">
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.summary.total}</span>
          <strong>{exams.length}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.summary.upcoming}</span>
          <strong>{upcomingCount}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.summary.groups}</span>
          <strong>{groups.length - 1}</strong>
        </div>
        {canManage && (
          <div className="management-summary-card">
            <span className="management-summary-label">{copy.summary.mine}</span>
            <strong>{mineCount}</strong>
          </div>
        )}
      </div>

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
          {groups.map((group) => (
            <button
              key={group}
              type="button"
              className={`management-filter-chip ${groupFilter === group ? 'active' : ''}`}
              onClick={() => setGroupFilter(group)}
            >
              {group === 'all' ? copy.allGroups : group}
            </button>
          ))}
          {canManage && (
            <>
              <button
                type="button"
                className={`management-filter-chip ${ownershipFilter === 'all' ? 'active' : ''}`}
                onClick={() => setOwnershipFilter('all')}
              >
                {copy.allExams}
              </button>
              <button
                type="button"
                className={`management-filter-chip ${ownershipFilter === 'mine' ? 'active' : ''}`}
                onClick={() => setOwnershipFilter('mine')}
              >
                {copy.myExams}
              </button>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <form className="exam-form-card" onSubmit={handleSubmit}>
          <div className="exam-form-header">
            <div>
              <h3>{editingId ? copy.form.updateTitle : copy.form.createTitle}</h3>
              <p>{copy.form.subtitle}</p>
            </div>
          </div>
          <div className="exam-form-grid">
            <label className="exam-form-field">
              <span className="exam-form-label">{copy.form.group}</span>
              <input
                type="text"
                placeholder={copy.form.groupPlaceholder}
                value={formData.group_name}
                onChange={(event) => setFormData({ ...formData, group_name: event.target.value })}
                required
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">{copy.form.subject}</span>
              <input
                type="text"
                placeholder={copy.form.subjectPlaceholder}
                value={formData.subject}
                onChange={(event) => setFormData({ ...formData, subject: event.target.value })}
                required
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">{copy.form.examDate}</span>
              <input
                type="date"
                value={formData.exam_date}
                onChange={(event) => setFormData({ ...formData, exam_date: event.target.value })}
                required
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">{copy.form.examTime}</span>
              <input
                type="time"
                value={formData.exam_time}
                onChange={(event) => setFormData({ ...formData, exam_time: event.target.value })}
                required
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">{copy.form.room}</span>
              <input
                type="text"
                placeholder={copy.form.roomPlaceholder}
                value={formData.room}
                onChange={(event) => setFormData({ ...formData, room: event.target.value })}
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">{copy.form.type}</span>
              <input
                type="text"
                placeholder={copy.form.typePlaceholder}
                value={formData.type}
                onChange={(event) => setFormData({ ...formData, type: event.target.value })}
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">{copy.form.semester}</span>
              <select
                value={formData.semester}
                onChange={(event) => setFormData({ ...formData, semester: event.target.value })}
              >
                <option value="">{copy.form.selectSemester}</option>
                <option value="Spring 2025-2026">Spring 2025-2026</option>
                <option value="Fall 2025-2026">Fall 2025-2026</option>
              </select>
            </label>
            <label className="exam-form-field exam-form-field-wide">
              <span className="exam-form-label">{copy.form.students}</span>
              <textarea
                className="exam-students-textarea"
                placeholder={copy.form.studentsPlaceholder}
                value={formData.studentsText}
                onChange={(event) => setFormData({ ...formData, studentsText: event.target.value })}
                rows="3"
              />
            </label>
          </div>
          <div className="portal-actions">
            <button type="button" className="btn-secondary" onClick={resetForm}>{copy.form.cancel}</button>
            <button type="submit" className="btn-primary">{editingId ? copy.form.update : copy.form.create}</button>
          </div>
        </form>
      )}

      <div className="exam-list">
        {filteredExams.map((exam) => (
          <div key={exam.id} className="exam-card">
            <div className="exam-card-header">
              <div>
                <h3>{exam.subject}</h3>
                <p>{exam.group_name} | {exam.type || copy.examFallback}</p>
              </div>
              {canManage && (
                <div className="exam-card-actions">
                  <button className="btn-secondary" onClick={() => handleDuplicate(exam)}>{copy.actions.duplicate}</button>
                  <button className="btn-secondary" onClick={() => handleEdit(exam)}>{copy.actions.edit}</button>
                  <button className="btn-secondary" onClick={() => handleDelete(exam.id)}>{copy.actions.delete}</button>
                </div>
              )}
            </div>
            <div className="exam-meta-grid">
              <div><strong>{copy.meta.date}:</strong> {formatExamDate(exam.exam_date, locale, copy.notSet)}</div>
              <div><strong>{copy.meta.time}:</strong> {exam.exam_time || copy.notSet}</div>
              <div><strong>{copy.meta.room}:</strong> {exam.room || copy.notSet}</div>
              <div><strong>{copy.meta.teacher}:</strong> {exam.teacher_name || copy.notSet}</div>
              <div><strong>{copy.meta.semester}:</strong> {exam.semester || copy.notSet}</div>
              <div><strong>{copy.meta.students}:</strong> {exam.students?.length ? exam.students.join(', ') : copy.notSet}</div>
            </div>
          </div>
        ))}

        {filteredExams.length === 0 && (
          <EmptyState
            eyebrow={copy.pageTitle}
            title={copy.emptyTitle}
            description={hasActiveFilters ? copy.emptyFiltered : copy.emptyFresh}
            actionLabel={hasActiveFilters ? copy.clearFilters : ''}
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
