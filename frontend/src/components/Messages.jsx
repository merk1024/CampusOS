import { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '../api';
import EmptyState from './EmptyState';
import StatusBanner from './StatusBanner';
import { canManageAcademicRecords } from '../roles';

const EMPTY_FORM = {
  title: '',
  content: '',
  type: 'general',
  isPinned: false,
  audienceScope: 'all',
  audienceValue: '',
  courseId: ''
};

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All users' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'admins', label: 'Admins' },
  { value: 'group', label: 'Specific groups' },
  { value: 'course', label: 'Specific course' }
];
const MESSAGES_COPY = {
  English: {
    dateUnavailable: 'Date unavailable',
    title: 'Messages',
    loading: 'Loading the CampusOS communication center...',
    refreshing: 'Refreshing...',
    markInboxRead: 'Mark inbox read',
    closeComposer: 'Close composer',
    newAnnouncement: 'New announcement',
    errorTitle: 'Messages could not be updated',
    successTitle: 'Messages updated',
    summaryAnnouncements: 'Announcements',
    summaryPinned: 'Pinned',
    summaryUnread: 'Unread inbox',
    summaryImports: 'Import alerts',
    searchAnnouncements: 'Search by title, content, author or audience',
    searchInbox: 'Search inbox notifications',
    clearFilters: 'Clear filters',
    composerTitle: 'Publish announcement',
    composerSubtitle: 'Route the message to the right audience before it lands in the CampusOS inbox.',
    announcementTitle: 'Announcement title',
    audience: 'Audience',
    groupsOrSubgroups: 'Groups or subgroups',
    course: 'Course',
    selectCourse: 'Select a course',
    contentPlaceholder: 'Write the announcement details here',
    pinToTop: 'Pin this announcement to the top',
    publishing: 'Publishing...',
    publish: 'Publish',
    cancel: 'Cancel',
    announcementsEmptyTitle: 'No announcements match the current view',
    announcementsEmptyDescription: 'Clear the current filters or publish a new message for the selected audience.',
    inboxEmptyTitle: 'The inbox is clear',
    inboxEmptyDescription: 'New announcement deliveries, import summaries, and system updates will appear here.',
    unread: 'Unread',
    pinned: 'Pinned',
    delete: 'Delete',
    markRead: 'Mark read',
    audiencePreviewCoursePrefix: 'This announcement will target the course:',
    audiencePreviewCourseEmpty: 'Select a course to route this announcement to enrolled students and linked staff.',
    audiencePreviewPrefix: 'Audience:',
    audiencePreviewChoose: 'Choose who should receive this announcement.',
    audiencePreviewGroupEmpty: 'Add one or more groups or subgroups to target a specific cohort.',
    publishedNotice: 'Announcement published and inbox updated.',
    deletedNotice: 'Announcement deleted.',
    inboxReadNotice: 'Inbox marked as read.',
    notificationReadNotice: 'Notification marked as read.',
    deleteConfirm: 'Delete this announcement?',
    failedLoad: 'Failed to load message center',
    typeLabels: { all: 'All', important: 'Important', exam: 'Exams', general: 'General' },
    inboxLabels: { all: 'All inbox', unread: 'Unread', announcement: 'Announcements', import: 'Imports', system: 'System' },
    audienceLabels: { all: 'All users', students: 'Students', teachers: 'Teachers', admins: 'Admins', group: 'Specific groups', course: 'Specific course' },
    inboxTitle: 'Inbox',
    announcementsTitle: 'Announcements'
  },
  Kyrgyz: {
    dateUnavailable: 'Дата жеткиликсиз',
    title: 'Билдирүүлөр',
    loading: 'CampusOS байланыш борбору жүктөлүүдө...',
    refreshing: 'Жаңыртылууда...',
    markInboxRead: 'Inbox окулган деп белгилөө',
    closeComposer: 'Редакторду жабуу',
    newAnnouncement: 'Жаңы билдирүү',
    errorTitle: 'Билдирүүлөр жаңыртылган жок',
    successTitle: 'Билдирүүлөр жаңыртылды',
    summaryAnnouncements: 'Билдирүүлөр',
    summaryPinned: 'Бекитилгендер',
    summaryUnread: 'Окулбаган inbox',
    summaryImports: 'Импорт эскертүүлөрү',
    searchAnnouncements: 'Аталышы, мазмуну, автору же аудиториясы боюнча издөө',
    searchInbox: 'Inbox эскертүүлөрүн издөө',
    clearFilters: 'Чыпкаларды тазалоо',
    composerTitle: 'Билдирүү жарыялоо',
    composerSubtitle: 'Билдирүү CampusOS inbox бөлүмүнө жеткенче туура аудиторияга багыттаңыз.',
    announcementTitle: 'Билдирүүнүн аталышы',
    audience: 'Аудитория',
    groupsOrSubgroups: 'Топтор же подтоптор',
    course: 'Курс',
    selectCourse: 'Курс тандаңыз',
    contentPlaceholder: 'Билдирүүнүн мазмунун бул жерге жазыңыз',
    pinToTop: 'Бул билдирүүнү жогоруга бекитүү',
    publishing: 'Жарыяланып жатат...',
    publish: 'Жарыялоо',
    cancel: 'Жокко чыгаруу',
    announcementsEmptyTitle: 'Учурдагы көрүнүшкө туура келген билдирүүлөр жок',
    announcementsEmptyDescription: 'Учурдагы чыпкаларды тазалаңыз же тандалган аудитория үчүн жаңы билдирүү жарыялаңыз.',
    inboxEmptyTitle: 'Inbox бош',
    inboxEmptyDescription: 'Жаңы билдирүүлөр, импорт жыйынтыктары жана системалык жаңыртуулар бул жерде чыгат.',
    unread: 'Окулбаган',
    pinned: 'Бекитилген',
    delete: 'Өчүрүү',
    markRead: 'Окулду деп белгилөө',
    audiencePreviewCoursePrefix: 'Бул билдирүү төмөнкү курс үчүн жөнөтүлөт:',
    audiencePreviewCourseEmpty: 'Бул билдирүүнү катталган студенттерге жана байланышкан кызматкерлерге жөнөтүү үчүн курс тандаңыз.',
    audiencePreviewPrefix: 'Аудитория:',
    audiencePreviewChoose: 'Бул билдирүүнү ким алышы керек экенин тандаңыз.',
    audiencePreviewGroupEmpty: 'Так аудиторияга жөнөтүү үчүн бир же бир нече топту же подтопту кошуңуз.',
    publishedNotice: 'Билдирүү жарыяланып, inbox жаңыртылды.',
    deletedNotice: 'Билдирүү өчүрүлдү.',
    inboxReadNotice: 'Inbox окулду деп белгиленди.',
    notificationReadNotice: 'Эскертүү окулду деп белгиленди.',
    deleteConfirm: 'Бул билдирүүнү өчүрөсүзбү?',
    failedLoad: 'Билдирүүлөр борборун жүктөө мүмкүн болгон жок',
    typeLabels: { all: 'Баары', important: 'Маанилүү', exam: 'Экзамендер', general: 'Жалпы' },
    inboxLabels: { all: 'Бардык inbox', unread: 'Окулбаган', announcement: 'Билдирүүлөр', import: 'Импорттор', system: 'Система' },
    audienceLabels: { all: 'Бардык колдонуучулар', students: 'Студенттер', teachers: 'Окутуучулар', admins: 'Админдер', group: 'Белгилүү топтор', course: 'Белгилүү курс' },
    inboxTitle: 'Inbox',
    announcementsTitle: 'Билдирүүлөр'
  }
};

const formatDateTime = (value, locale = 'en-GB', fallback = 'Date unavailable') => {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const getNotificationTone = (sourceType) => {
  switch (sourceType) {
    case 'announcement':
      return 'exam';
    case 'import':
      return 'important';
    default:
      return 'general';
  }
};

const normalizeNotificationSource = (notification) => {
  const sourceType = String(notification?.source_type || 'system').trim().toLowerCase();
  return ['announcement', 'import', 'system'].includes(sourceType) ? sourceType : 'system';
};

const buildFilterCountMap = (items, getKey, keys) => {
  const initial = Object.fromEntries(keys.map((key) => [key, 0]));

  items.forEach((item) => {
    const key = getKey(item);
    if (initial[key] !== undefined) {
      initial[key] += 1;
    }
  });

  initial.all = items.length;
  return initial;
};

function Messages({ user, onUnreadCountChange, locale = 'en-GB', language = 'English' }) {
  const copy = MESSAGES_COPY[language] || MESSAGES_COPY.English;
  const typeMeta = useMemo(() => ({
    all: { label: copy.typeLabels.all, badge: 'ALL' },
    important: { label: copy.typeLabels.important, badge: 'IMP' },
    exam: { label: copy.typeLabels.exam, badge: 'EXM' },
    general: { label: copy.typeLabels.general, badge: 'GEN' }
  }), [copy]);
  const inboxMeta = useMemo(() => ({
    all: { label: copy.inboxLabels.all, badge: 'INB' },
    unread: { label: copy.inboxLabels.unread, badge: 'NEW' },
    announcement: { label: copy.inboxLabels.announcement, badge: 'ANN' },
    import: { label: copy.inboxLabels.import, badge: 'IMP' },
    system: { label: copy.inboxLabels.system, badge: 'SYS' }
  }), [copy]);
  const audienceOptions = useMemo(() => (
    AUDIENCE_OPTIONS.map((option) => ({
      ...option,
      label: copy.audienceLabels[option.value] || option.label
    }))
  ), [copy]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeView, setActiveView] = useState('announcements');
  const [typeFilter, setTypeFilter] = useState('all');
  const [inboxFilter, setInboxFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const canManage = canManageAcademicRecords(user);

  const clearNoticeLater = () => {
    window.setTimeout(() => setNotice(''), 2400);
  };

  const loadStreams = useCallback(async ({ markInboxRead = false, silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const requests = [api.getAnnouncements(), api.getNotifications()];
      if (canManage) {
        requests.push(api.getCourses());
      }

      const [announcementResponse, notificationResponse, courseResponse] = await Promise.all(requests);
      let nextAnnouncements = announcementResponse?.announcements || [];
      let nextNotifications = notificationResponse?.notifications || [];
      let unreadCount = Number(notificationResponse?.summary?.unread || 0);

      if (markInboxRead && unreadCount > 0) {
        await api.markAllNotificationsRead();
        const [announcementRefresh, notificationRefresh] = await Promise.all([
          api.getAnnouncements(),
          api.getNotifications()
        ]);
        nextAnnouncements = announcementRefresh?.announcements || [];
        nextNotifications = notificationRefresh?.notifications || [];
        unreadCount = Number(notificationRefresh?.summary?.unread || 0);
      }

      setAnnouncements(nextAnnouncements);
      setNotifications(nextNotifications);
      if (canManage) {
        setCourses(courseResponse?.courses || []);
      }
      onUnreadCountChange?.(unreadCount);
      setError('');
    } catch (err) {
      setError(err.message || copy.failedLoad);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canManage, copy.failedLoad, onUnreadCountChange]);

  useEffect(() => {
    loadStreams({ markInboxRead: true });
  }, [loadStreams]);

  const announcementSummary = useMemo(() => ({
    total: announcements.length,
    pinned: announcements.filter((announcement) => announcement.is_pinned).length,
    unread: announcements.filter((announcement) => !announcement.is_read).length
  }), [announcements]);

  const inboxSummary = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter((notification) => !notification.is_read).length,
    imports: notifications.filter((notification) => normalizeNotificationSource(notification) === 'import').length
  }), [notifications]);

  const announcementTypeCounts = useMemo(() => (
    buildFilterCountMap(
      announcements,
      (announcement) => (typeMeta[announcement.type] ? announcement.type : 'general'),
      Object.keys(typeMeta)
    )
  ), [announcements, typeMeta]);

  const inboxTypeCounts = useMemo(() => {
    const counts = buildFilterCountMap(
      notifications,
      (notification) => normalizeNotificationSource(notification),
      Object.keys(inboxMeta)
    );

    counts.unread = notifications.filter((notification) => !notification.is_read).length;
    return counts;
  }, [inboxMeta, notifications]);

  const filteredAnnouncements = useMemo(() => (
    announcements
      .filter((announcement) => (
        (typeFilter === 'all' || announcement.type === typeFilter)
        && [
          announcement.title,
          announcement.content,
          announcement.author_name,
          announcement.type,
          announcement.audience_label
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.trim().toLowerCase())
      ))
      .sort((left, right) => {
        if (left.is_pinned && !right.is_pinned) return -1;
        if (!left.is_pinned && right.is_pinned) return 1;
        return new Date(right.created_at) - new Date(left.created_at);
      })
  ), [announcements, typeFilter, searchTerm]);

  const filteredNotifications = useMemo(() => (
    notifications
      .filter((notification) => {
        const sourceType = normalizeNotificationSource(notification);
        const matchesFilter = (
          inboxFilter === 'all'
          || (inboxFilter === 'unread' && !notification.is_read)
          || sourceType === inboxFilter
        );

        if (!matchesFilter) {
          return false;
        }

        const haystack = [
          notification.title,
          notification.message,
          sourceType,
          notification.metadata?.audienceScope,
          notification.metadata?.audienceValue
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(searchTerm.trim().toLowerCase());
      })
      .sort((left, right) => new Date(right.created_at) - new Date(left.created_at))
  ), [notifications, inboxFilter, searchTerm]);

  const hasActiveAnnouncementFilters = searchTerm.trim() !== '' || typeFilter !== 'all';
  const hasActiveInboxFilters = searchTerm.trim() !== '' || inboxFilter !== 'all';
  const activeCount = activeView === 'announcements' ? filteredAnnouncements.length : filteredNotifications.length;
  const activeTotal = activeView === 'announcements' ? announcements.length : notifications.length;
  const activeFilterLabel = activeView === 'announcements'
    ? typeMeta[typeFilter]?.label || typeMeta.all.label
    : inboxMeta[inboxFilter]?.label || inboxMeta.all.label;
  const selectedAudienceCourse = courses.find((course) => String(course.id) === String(formData.courseId));
  const audiencePreview = formData.audienceScope === 'group'
    ? (formData.audienceValue.trim() ? `${copy.audiencePreviewPrefix} ${formData.audienceValue.trim()}` : copy.audiencePreviewGroupEmpty)
    : formData.audienceScope === 'course'
      ? (selectedAudienceCourse?.name
        ? `${copy.audiencePreviewCoursePrefix} ${selectedAudienceCourse.name}`
        : copy.audiencePreviewCourseEmpty)
      : audienceOptions.find((option) => option.value === formData.audienceScope)?.label
        ? `${copy.audiencePreviewPrefix} ${audienceOptions.find((option) => option.value === formData.audienceScope)?.label}`
        : copy.audiencePreviewChoose;

  const resetComposer = () => {
    setFormData(EMPTY_FORM);
    setShowComposer(false);
  };

  const handleCreateAnnouncement = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      await api.createAnnouncement({
        title: formData.title.trim(),
        content: formData.content.trim(),
        type: formData.type,
        isPinned: formData.isPinned,
        audienceScope: formData.audienceScope,
        audienceValue: formData.audienceScope === 'group' ? formData.audienceValue : '',
        courseId: formData.audienceScope === 'course' ? Number(formData.courseId || 0) : null
      });
      await loadStreams({ silent: true });
      setNotice(copy.publishedNotice);
      resetComposer();
      clearNoticeLater();
    } catch (err) {
      setError(err.message || 'Failed to publish announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm(copy.deleteConfirm)) {
      return;
    }

    try {
      await api.deleteAnnouncement(id);
      await loadStreams({ silent: true });
      setNotice(copy.deletedNotice);
      clearNoticeLater();
    } catch (err) {
      setError(err.message || 'Failed to delete announcement');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      await loadStreams({ silent: true });
      onUnreadCountChange?.(0);
      setNotice(copy.inboxReadNotice);
      clearNoticeLater();
    } catch (err) {
      setError(err.message || 'Failed to update inbox state');
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await api.markNotificationRead(notificationId);
      await loadStreams({ silent: true });
      setNotice(copy.notificationReadNotice);
      clearNoticeLater();
    } catch (err) {
      setError(err.message || 'Failed to mark notification as read');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>{copy.title}</h1>
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
          <h1>{copy.title}</h1>
          <p>{language === 'Kyrgyz' ? 'Даректүү билдирүүлөр, inbox эскертүүлөрү жана операциялык жаңыртуулар бир жерде.' : 'Targeted announcements, inbox alerts, and operational updates in one place.'}</p>
        </div>
        <div className="portal-actions">
          {refreshing && <span className="management-summary-label">{copy.refreshing}</span>}
          {inboxSummary.unread > 0 && (
            <button className="btn-secondary" onClick={handleMarkAllRead}>
              {copy.markInboxRead}
            </button>
          )}
          {canManage && (
            <button className="btn-primary" onClick={() => setShowComposer((current) => !current)}>
              {showComposer ? copy.closeComposer : copy.newAnnouncement}
            </button>
          )}
        </div>
      </div>

      <StatusBanner tone="error" title={copy.errorTitle} message={error} />
      <StatusBanner tone="success" title={copy.successTitle} message={notice} />

      <div className="management-summary-grid">
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.summaryAnnouncements}</span>
          <strong>{announcementSummary.total}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.summaryPinned}</span>
          <strong>{announcementSummary.pinned}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.summaryUnread}</span>
          <strong>{inboxSummary.unread}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.summaryImports}</span>
          <strong>{inboxSummary.imports}</strong>
        </div>
      </div>

      <div className="messages-view-toggle">
        <button
          type="button"
          className={`management-filter-chip ${activeView === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveView('announcements')}
        >
          {copy.announcementsTitle}
        </button>
        <button
          type="button"
          className={`management-filter-chip ${activeView === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveView('inbox')}
        >
          {copy.inboxTitle}
        </button>
      </div>

      <div className="management-toolbar messages-toolbar">
        <div className="management-search">
          <input
            type="text"
            placeholder={activeView === 'announcements' ? copy.searchAnnouncements : copy.searchInbox}
            aria-label={copy.title}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="management-filters">
          {activeView === 'announcements'
            ? Object.entries(typeMeta).map(([typeKey, meta]) => (
                <button
                  key={typeKey}
                  type="button"
                  className={`management-filter-chip ${typeFilter === typeKey ? 'active' : ''}`}
                  onClick={() => setTypeFilter(typeKey)}
                >
                  {meta.label}
                  <span className="management-filter-chip-count">{announcementTypeCounts[typeKey] || 0}</span>
                </button>
              ))
            : Object.entries(inboxMeta).map(([filterKey, meta]) => (
                <button
                  key={filterKey}
                  type="button"
                  className={`management-filter-chip ${inboxFilter === filterKey ? 'active' : ''}`}
                  onClick={() => setInboxFilter(filterKey)}
                >
                  {meta.label}
                  <span className="management-filter-chip-count">{inboxTypeCounts[filterKey] || 0}</span>
                </button>
              ))}
        </div>
        <div className="messages-toolbar-footer">
          <span className="messages-toolbar-note">
            {activeView === 'announcements' ? copy.announcementsTitle : copy.inboxTitle}: {activeCount} / {activeTotal}
            {' '}| {language === 'Kyrgyz' ? 'Чыпка' : 'Filter'}: {activeFilterLabel}
          </span>
          {(activeView === 'announcements' ? hasActiveAnnouncementFilters : hasActiveInboxFilters) && (
            <button
              type="button"
              className="btn-secondary messages-inline-action"
              onClick={() => {
                setSearchTerm('');
                if (activeView === 'announcements') {
                  setTypeFilter('all');
                } else {
                  setInboxFilter('all');
                }
              }}
            >
              {copy.clearFilters}
            </button>
          )}
        </div>
      </div>

      {canManage && showComposer && (
        <form className="exam-form-card message-compose-card" onSubmit={handleCreateAnnouncement}>
          <div className="exam-form-header">
            <div>
              <h3>{copy.composerTitle}</h3>
              <p>{copy.composerSubtitle}</p>
            </div>
          </div>
          <div className="exam-form-grid">
            <label className="exam-form-field">
              <span className="exam-form-label">Title</span>
              <input
                type="text"
                placeholder={copy.announcementTitle}
                value={formData.title}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                required
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">Type</span>
              <select
                value={formData.type}
                onChange={(event) => setFormData({ ...formData, type: event.target.value })}
              >
                <option value="general">General</option>
                <option value="important">Important</option>
                <option value="exam">Exam</option>
              </select>
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">{copy.audience}</span>
              <select
                value={formData.audienceScope}
                onChange={(event) => setFormData({
                  ...formData,
                  audienceScope: event.target.value,
                  audienceValue: '',
                  courseId: ''
                })}
              >
                {audienceOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {formData.audienceScope === 'group' && (
              <label className="exam-form-field">
                <span className="exam-form-label">{copy.groupsOrSubgroups}</span>
                <input
                  type="text"
                  placeholder="CYB-23, CS-24-A"
                  value={formData.audienceValue}
                  onChange={(event) => setFormData({ ...formData, audienceValue: event.target.value })}
                  required
                />
              </label>
            )}
            {formData.audienceScope === 'course' && (
              <label className="exam-form-field">
                <span className="exam-form-label">{copy.course}</span>
                <select
                  value={formData.courseId}
                  onChange={(event) => setFormData({ ...formData, courseId: event.target.value })}
                  required
                >
                  <option value="">{copy.selectCourse}</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="message-audience-preview">{audiencePreview}</div>
            <label className="exam-form-field exam-form-field-wide">
              <span className="exam-form-label">Content</span>
              <textarea
                className="message-compose-textarea"
                placeholder={copy.contentPlaceholder}
                value={formData.content}
                onChange={(event) => setFormData({ ...formData, content: event.target.value })}
                rows="5"
                required
              />
            </label>
          </div>
          <label className="message-pin-toggle">
            <input
              type="checkbox"
              checked={formData.isPinned}
              onChange={(event) => setFormData({ ...formData, isPinned: event.target.checked })}
            />
            <span>{copy.pinToTop}</span>
          </label>
          <div className="portal-actions">
            <button type="button" className="btn-secondary" onClick={resetComposer}>{copy.cancel}</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? copy.publishing : copy.publish}
            </button>
          </div>
        </form>
      )}

      {activeView === 'announcements' ? (
        <div className="messages-list">
          {filteredAnnouncements.length === 0 ? (
            <EmptyState
              eyebrow={copy.announcementsTitle}
              title={copy.announcementsEmptyTitle}
              description={copy.announcementsEmptyDescription}
              actionLabel={(searchTerm || typeFilter !== 'all') ? copy.clearFilters : ''}
              onAction={() => {
                setTypeFilter('all');
                setSearchTerm('');
              }}
            />
          ) : (
            filteredAnnouncements.map((announcement) => {
              const typeKey = typeMeta[announcement.type] ? announcement.type : 'general';
              const meta = typeMeta[typeKey];

              return (
                <article
                  key={announcement.id}
                  className={`message-card ${announcement.is_pinned ? 'pinned' : ''} ${announcement.is_read ? '' : 'unread'}`}
                >
                  <div className="message-header">
                    <div className="message-meta">
                      <div className="message-badge-row">
                        <span className={`message-type-badge ${typeKey}`}>{meta.badge}</span>
                        <span className="message-type-label">{meta.label}</span>
                        <span className="message-audience-chip">{announcement.audience_label}</span>
                        {!announcement.is_read && <span className="message-unread-chip">{copy.unread}</span>}
                        {announcement.is_pinned && <span className="pinned-badge">{copy.pinned}</span>}
                      </div>
                      <h3>{announcement.title}</h3>
                      <div className="message-subline">
                        <span>{announcement.author_name || 'CampusOS'}</span>
                        <span>{formatDateTime(announcement.created_at, locale, copy.dateUnavailable)}</span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="message-actions">
                        <button
                          type="button"
                        className="btn-secondary"
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                      >
                          {copy.delete}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="message-content">{announcement.content}</div>
                </article>
              );
            })
          )}
        </div>
      ) : (
        <div className="messages-list">
          {filteredNotifications.length === 0 ? (
            <EmptyState
              eyebrow={copy.inboxTitle}
              title={copy.inboxEmptyTitle}
              description={copy.inboxEmptyDescription}
            />
          ) : (
            filteredNotifications.map((notification) => {
              const sourceKey = normalizeNotificationSource(notification);
              const sourceMeta = inboxMeta[sourceKey] || inboxMeta.system;
              const tone = getNotificationTone(sourceKey);

              return (
                <article
                  key={notification.id}
                  className={`message-card inbox-card ${notification.is_read ? '' : 'unread'}`}
                >
                  <div className="message-header">
                    <div className="message-meta">
                      <div className="message-badge-row">
                        <span className={`message-type-badge ${tone}`}>{sourceMeta.badge}</span>
                        <span className="message-type-label">{sourceMeta.label}</span>
                        {!notification.is_read && <span className="message-unread-chip">{copy.unread}</span>}
                      </div>
                      <h3>{notification.title}</h3>
                      <div className="message-subline">
                        <span>{formatDateTime(notification.delivered_at || notification.created_at, locale, copy.dateUnavailable)}</span>
                        <span>{notification.status || 'delivered'}</span>
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div className="message-actions">
                        <button
                          type="button"
                        className="btn-secondary"
                        onClick={() => handleMarkNotificationRead(notification.id)}
                      >
                          {copy.markRead}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="message-content">{notification.message}</div>
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default Messages;
