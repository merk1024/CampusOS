import { useState, useEffect } from 'react';
import { api } from '../api';

// Messages
function Messages() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const response = await api.getAnnouncements();
        setAnnouncements(response.announcements || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
  }, []);

  const filteredAnnouncements = announcements.filter(ann =>
    filter === 'all' || ann.type === filter
  ).sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const getTypeColor = (type) => {
    switch (type) {
      case 'important': return '#ef4444';
      case 'exam': return '#f59e0b';
      case 'general': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'important': return '⚠️';
      case 'exam': return '📝';
      case 'general': return '📢';
      default: return '💬';
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>💬 Messages</h1>
          <p>Loading announcements...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>💬 Messages</h1>
          <p>Error loading messages: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>💬 Messages</h1>
          <p>Announcements and notifications</p>
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'important' ? 'active' : ''}`}
            onClick={() => setFilter('important')}
          >
            Important
          </button>
          <button
            className={`filter-btn ${filter === 'exam' ? 'active' : ''}`}
            onClick={() => setFilter('exam')}
          >
            Exams
          </button>
          <button
            className={`filter-btn ${filter === 'general' ? 'active' : ''}`}
            onClick={() => setFilter('general')}
          >
            General
          </button>
        </div>
      </div>

      <div className="messages-list">
        {filteredAnnouncements.length === 0 ? (
          <div className="no-messages">
            <p>No messages available</p>
          </div>
        ) : (
          filteredAnnouncements.map(announcement => (
            <div key={announcement.id} className={`message-card ${announcement.is_pinned ? 'pinned' : ''}`}>
              <div className="message-header">
                <div className="message-type" style={{ backgroundColor: getTypeColor(announcement.type) }}>
                  {getTypeIcon(announcement.type)}
                </div>
                <div className="message-meta">
                  <h3>{announcement.title}</h3>
                  {announcement.is_pinned && <span className="pinned-badge">📌 Pinned</span>}
                </div>
                <div className="message-date">
                  {new Date(announcement.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="message-content">
                {announcement.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Messages;