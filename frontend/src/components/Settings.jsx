import { useState } from 'react';

const SETTINGS_KEY = 'lms_app_settings';

const readSettings = () => {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
      language: 'English',
      defaultPage: 'dashboard',
      reminderMode: 'All notifications',
      density: 'Comfortable'
    };
  } catch {
    return {
      language: 'English',
      defaultPage: 'dashboard',
      reminderMode: 'All notifications',
      density: 'Comfortable'
    };
  }
};

function Settings({ user, onNavigate }) {
  const [settings, setSettings] = useState(readSettings);
  const [saved, setSaved] = useState('');

  const handleSave = (event) => {
    event.preventDefault();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved('Settings saved');
    window.setTimeout(() => setSaved(''), 2200);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your account preferences and quick navigation.</p>
        </div>
      </div>

      <form className="exam-form-card" onSubmit={handleSave}>
        <h3>Application Settings</h3>
        <div className="exam-form-grid">
          <label>
            Language
            <select value={settings.language} onChange={(event) => setSettings({ ...settings, language: event.target.value })}>
              <option>English</option>
              <option>Russian</option>
              <option>Kyrgyz</option>
            </select>
          </label>

          <label>
            Default page
            <select value={settings.defaultPage} onChange={(event) => setSettings({ ...settings, defaultPage: event.target.value })}>
              <option value="dashboard">Dashboard</option>
              <option value="courses">Courses</option>
              <option value="schedule">Schedule</option>
              <option value="profile">Profile</option>
              <option value="messages">Messages</option>
            </select>
          </label>

          <label>
            Notifications
            <select value={settings.reminderMode} onChange={(event) => setSettings({ ...settings, reminderMode: event.target.value })}>
              <option>All notifications</option>
              <option>Only important</option>
              <option>Only exams</option>
              <option>Off</option>
            </select>
          </label>

          <label>
            Layout density
            <select value={settings.density} onChange={(event) => setSettings({ ...settings, density: event.target.value })}>
              <option>Comfortable</option>
              <option>Compact</option>
            </select>
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary">Save settings</button>
        </div>

        {saved && <p className="schedule-group-hint">{saved}</p>}
      </form>

      <div className="management-toolbar">
        <div>
          <span className="management-summary-label">Quick Actions</span>
          <strong>{user?.name}</strong>
        </div>
        <div className="management-filters">
          <button className="management-filter-chip" onClick={() => onNavigate('profile')}>Open profile</button>
          <button className="management-filter-chip" onClick={() => onNavigate('messages')}>Open messages</button>
          <button className="management-filter-chip" onClick={() => onNavigate('schedule')}>Open schedule</button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
