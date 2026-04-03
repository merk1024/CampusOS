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

const TYPE_META = {
  all: { label: 'All', badge: 'ALL' },
  important: { label: 'Important', badge: 'IMP' },
  exam: { label: 'Exams', badge: 'EXM' },
  general: { label: 'General', badge: 'GEN' }
};

const INBOX_META = {
  all: { label: 'All inbox', badge: 'INB' },
  unread: { label: 'Unread', badge: 'NEW' },
  announcement: { label: 'Announcements', badge: 'ANN' },
  import: { label: 'Imports', badge: 'IMP' },
  system: { label: 'System', badge: 'SYS' }
};

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All users' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'admins', label: 'Admins' },
  { value: 'group', label: 'Specific groups' },
  { value: 'course', label: 'Specific course' }
];

const formatDateTime = (value, locale = 'en-GB') => {
  if (!value) return 'Date unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

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
  return INBOX_META[sourceType] ? sourceType : 'system';
};

function Messages({ user, onUnreadCountChange, locale = 'en-GB' }) {
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
      setError(err.message || 'Failed to load message center');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canManage, onUnreadCountChange]);

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
      setNotice('Announcement published and inbox updated.');
      resetComposer();
      clearNoticeLater();
    } catch (err) {
      setError(err.message || 'Failed to publish announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) {
      return;
    }

    try {
      await api.deleteAnnouncement(id);
      await loadStreams({ silent: true });
      setNotice('Announcement deleted.');
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
      setNotice('Inbox marked as read.');
      clearNoticeLater();
    } catch (err) {
      setError(err.message || 'Failed to update inbox state');
    }
  };

  const handleMarkNotificationRead = async (notificationId) => {
    try {
      await api.markNotificationRead(notificationId);
      await loadStreams({ silent: true });
      setNotice('Notification marked as read.');
      clearNoticeLater();
    } catch (err) {
      setError(err.message || 'Failed to mark notification as read');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Messages</h1>
          <p>Loading the CampusOS communication center...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Messages</h1>
          <p>Targeted announcements, inbox alerts, and operational updates in one place.</p>
        </div>
        <div className="portal-actions">
          {refreshing && <span className="management-summary-label">Refreshing...</span>}
          {inboxSummary.unread > 0 && (
            <button className="btn-secondary" onClick={handleMarkAllRead}>
              Mark inbox read
            </button>
          )}
          {canManage && (
            <button className="btn-primary" onClick={() => setShowComposer((current) => !current)}>
              {showComposer ? 'Close composer' : 'New announcement'}
            </button>
          )}
        </div>
      </div>

      <StatusBanner tone="error" title="Messages could not be updated" message={error} />
      <StatusBanner tone="success" title="Messages updated" message={notice} />

      <div className="management-summary-grid">
        <div className="management-summary-card">
          <span className="management-summary-label">Announcements</span>
          <strong>{announcementSummary.total}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">Pinned</span>
          <strong>{announcementSummary.pinned}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">Unread inbox</span>
          <strong>{inboxSummary.unread}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">Import alerts</span>
          <strong>{inboxSummary.imports}</strong>
        </div>
      </div>

      <div className="messages-view-toggle">
        <button
          type="button"
          className={`management-filter-chip ${activeView === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveView('announcements')}
        >
          Announcements
        </button>
        <button
          type="button"
          className={`management-filter-chip ${activeView === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveView('inbox')}
        >
          Inbox
        </button>
      </div>

      <div className="management-toolbar messages-toolbar">
        <div className="management-search">
          <input
            type="text"
            placeholder={activeView === 'announcements' ? 'Search by title, content, author or audience' : 'Search inbox notifications'}
            aria-label="Search messages"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="management-filters">
          {activeView === 'announcements'
            ? Object.entries(TYPE_META).map(([typeKey, meta]) => (
                <button
                  key={typeKey}
                  type="button"
                  className={`management-filter-chip ${typeFilter === typeKey ? 'active' : ''}`}
                  onClick={() => setTypeFilter(typeKey)}
                >
                  {meta.label}
                </button>
              ))
            : Object.entries(INBOX_META).map(([filterKey, meta]) => (
                <button
                  key={filterKey}
                  type="button"
                  className={`management-filter-chip ${inboxFilter === filterKey ? 'active' : ''}`}
                  onClick={() => setInboxFilter(filterKey)}
                >
                  {meta.label}
                </button>
              ))}
        </div>
      </div>

      {canManage && showComposer && (
        <form className="exam-form-card message-compose-card" onSubmit={handleCreateAnnouncement}>
          <div className="exam-form-header">
            <div>
              <h3>Publish announcement</h3>
              <p>Route the message to the right audience before it lands in the CampusOS inbox.</p>
            </div>
          </div>
          <div className="exam-form-grid">
            <label className="exam-form-field">
              <span className="exam-form-label">Title</span>
              <input
                type="text"
                placeholder="Announcement title"
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
              <span className="exam-form-label">Audience</span>
              <select
                value={formData.audienceScope}
                onChange={(event) => setFormData({
                  ...formData,
                  audienceScope: event.target.value,
                  audienceValue: '',
                  courseId: ''
                })}
              >
                {AUDIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {formData.audienceScope === 'group' && (
              <label className="exam-form-field">
                <span className="exam-form-label">Groups or subgroups</span>
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
                <span className="exam-form-label">Course</span>
                <select
                  value={formData.courseId}
                  onChange={(event) => setFormData({ ...formData, courseId: event.target.value })}
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="exam-form-field exam-form-field-wide">
              <span className="exam-form-label">Content</span>
              <textarea
                className="message-compose-textarea"
                placeholder="Write the announcement details here"
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
            <span>Pin this announcement to the top</span>
          </label>
          <div className="portal-actions">
            <button type="button" className="btn-secondary" onClick={resetComposer}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </form>
      )}

      {activeView === 'announcements' ? (
        <div className="messages-list">
          {filteredAnnouncements.length === 0 ? (
            <EmptyState
              eyebrow="Announcements"
              title="No announcements match the current view"
              description="Clear the current filters or publish a new message for the selected audience."
              actionLabel={(searchTerm || typeFilter !== 'all') ? 'Reset filters' : ''}
              onAction={() => {
                setTypeFilter('all');
                setSearchTerm('');
              }}
            />
          ) : (
            filteredAnnouncements.map((announcement) => {
              const typeKey = TYPE_META[announcement.type] ? announcement.type : 'general';
              const meta = TYPE_META[typeKey];

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
                        {!announcement.is_read && <span className="message-unread-chip">Unread</span>}
                        {announcement.is_pinned && <span className="pinned-badge">Pinned</span>}
                      </div>
                      <h3>{announcement.title}</h3>
                      <div className="message-subline">
                        <span>{announcement.author_name || 'CampusOS'}</span>
                        <span>{formatDateTime(announcement.created_at, locale)}</span>
                      </div>
                    </div>
                    {canManage && (
                      <div className="message-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                        >
                          Delete
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
              eyebrow="Inbox"
              title="The inbox is clear"
              description="New announcement deliveries, import summaries, and system updates will appear here."
            />
          ) : (
            filteredNotifications.map((notification) => {
              const sourceKey = normalizeNotificationSource(notification);
              const sourceMeta = INBOX_META[sourceKey] || INBOX_META.system;
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
                        {!notification.is_read && <span className="message-unread-chip">Unread</span>}
                      </div>
                      <h3>{notification.title}</h3>
                      <div className="message-subline">
                        <span>{formatDateTime(notification.delivered_at || notification.created_at, locale)}</span>
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
                          Mark read
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
