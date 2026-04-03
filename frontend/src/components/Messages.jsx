import { useCallback, useEffect, useMemo, useState } from 'react';

import { api } from '../api';
import EmptyState from './EmptyState';
import StatusBanner from './StatusBanner';
import { canManageAcademicRecords } from '../roles';

const EMPTY_FORM = {
  title: '',
  content: '',
  type: 'general',
  isPinned: false
};

const TYPE_META = {
  all: { label: 'All', badge: 'ALL' },
  important: { label: 'Important', badge: 'IMP' },
  exam: { label: 'Exams', badge: 'EXM' },
  general: { label: 'General', badge: 'GEN' }
};

const formatAnnouncementDate = (value) => {
  if (!value) return 'Date unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

function Messages({ user, onAnnouncementsSync, onAnnouncementsViewed }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const canManage = canManageAcademicRecords(user);
  const hasActiveFilters = filter !== 'all' || searchTerm.trim() !== '';

  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getAnnouncements();
      const nextAnnouncements = response?.announcements || [];
      setAnnouncements(nextAnnouncements);
      onAnnouncementsSync?.(nextAnnouncements);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [onAnnouncementsSync]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  useEffect(() => {
    if (!loading) {
      onAnnouncementsViewed?.(announcements);
    }
  }, [announcements, loading, onAnnouncementsViewed]);

  const filteredAnnouncements = useMemo(() => (
    announcements
      .filter((announcement) => (
        (filter === 'all' || announcement.type === filter)
        && [
          announcement.title,
          announcement.content,
          announcement.author_name,
          announcement.type
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
  ), [announcements, filter, searchTerm]);

  const summary = useMemo(() => ({
    total: announcements.length,
    pinned: announcements.filter((announcement) => announcement.is_pinned).length,
    important: announcements.filter((announcement) => announcement.type === 'important').length
  }), [announcements]);

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
        isPinned: formData.isPinned
      });
      await loadAnnouncements();
      setNotice('Announcement published.');
      resetComposer();
      window.setTimeout(() => setNotice(''), 2200);
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
      await loadAnnouncements();
      setNotice('Announcement deleted.');
      window.setTimeout(() => setNotice(''), 2200);
    } catch (err) {
      setError(err.message || 'Failed to delete announcement');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Messages</h1>
          <p>Loading announcements...</p>
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
          <p>Campus announcements, exam notices, and important updates.</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowComposer((current) => !current)}>
            {showComposer ? 'Close composer' : 'New announcement'}
          </button>
        )}
      </div>

      <StatusBanner tone="error" title="Messages could not be updated" message={error} />
      <StatusBanner tone="success" title="Messages updated" message={notice} />

      <div className="management-summary-grid">
        <div className="management-summary-card">
          <span className="management-summary-label">Total messages</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">Pinned</span>
          <strong>{summary.pinned}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">Important</span>
          <strong>{summary.important}</strong>
        </div>
      </div>

      <div className="management-toolbar messages-toolbar">
        <div className="management-search">
          <input
            type="text"
            placeholder="Search by title, content, author or type"
            aria-label="Search announcements and messages"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="management-filters">
          {Object.entries(TYPE_META).map(([typeKey, meta]) => (
            <button
              key={typeKey}
              type="button"
              className={`management-filter-chip ${filter === typeKey ? 'active' : ''}`}
              onClick={() => setFilter(typeKey)}
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
              <p>Share important updates with students and staff from one place.</p>
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

      <div className="messages-list">
        {filteredAnnouncements.length === 0 ? (
          <EmptyState
            eyebrow="Messages"
            title="No announcements match the current view"
            description={hasActiveFilters ? 'Clear the current filters to reopen the full message stream.' : 'Published announcements and exam notices will appear here.'}
            actionLabel={hasActiveFilters ? 'Clear filters' : ''}
            onAction={() => {
              setFilter('all');
              setSearchTerm('');
            }}
          />
        ) : (
          filteredAnnouncements.map((announcement) => {
            const typeKey = TYPE_META[announcement.type] ? announcement.type : 'general';
            const meta = TYPE_META[typeKey];

            return (
              <article key={announcement.id} className={`message-card ${announcement.is_pinned ? 'pinned' : ''}`}>
                <div className="message-header">
                  <div className="message-meta">
                    <div className="message-badge-row">
                      <span className={`message-type-badge ${typeKey}`}>{meta.badge}</span>
                      <span className="message-type-label">{meta.label}</span>
                      {announcement.is_pinned && <span className="pinned-badge">Pinned</span>}
                    </div>
                    <h3>{announcement.title}</h3>
                    <div className="message-subline">
                      <span>{announcement.author_name || 'CampusOS'}</span>
                      <span>{formatAnnouncementDate(announcement.created_at)}</span>
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
                <div className="message-content">
                  {announcement.content}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Messages;
