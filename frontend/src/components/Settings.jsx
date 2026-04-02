import { useMemo, useState } from 'react';

import StatusBanner from './StatusBanner';
import { getRoleLabel } from '../roles';

const SETTINGS_KEY = 'lms_app_settings';

const DEFAULT_SETTINGS = {
  language: 'English',
  defaultPage: 'dashboard',
  reminderMode: 'All notifications',
  density: 'Comfortable',
  theme: 'light'
};

const readSettings = () => {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

function Settings({ user, onNavigate, theme, onThemeChange }) {
  const [settings, setSettings] = useState(readSettings);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const summaryCards = useMemo(() => ([
    { label: 'Theme', value: theme === 'dark' ? 'Dark' : 'Light' },
    { label: 'Language', value: settings.language },
    { label: 'Default page', value: settings.defaultPage },
    { label: 'Density', value: settings.density }
  ]), [settings.defaultPage, settings.density, settings.language, theme]);

  const handleSave = (event) => {
    event.preventDefault();

    try {
      const nextSettings = { ...settings, theme };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
      setSettings(nextSettings);
      setError('');
      setNotice('Settings saved successfully.');
      window.setTimeout(() => setNotice(''), 2200);
    } catch (saveError) {
      console.error('Failed to save settings:', saveError);
      setNotice('');
      setError('Settings could not be saved locally.');
    }
  };

  const handleThemeSelect = (nextTheme) => {
    onThemeChange?.(nextTheme);
    setSettings((current) => ({ ...current, theme: nextTheme }));
    setNotice('');
  };

  const roleLabel = getRoleLabel(user);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Manage workspace preferences, interface density, theme, and quick navigation.</p>
        </div>
      </div>

      <StatusBanner tone="error" title="Settings could not be saved" message={error} />
      <StatusBanner tone="success" title="Settings updated" message={notice} />

      <div className="management-summary-grid">
        {summaryCards.map((item) => (
          <div key={item.label} className="management-summary-card">
            <span className="management-summary-label">{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <form className="exam-form-card" onSubmit={handleSave}>
        <div className="exam-form-header">
          <div>
            <h3>Workspace preferences</h3>
            <p>Choose how CampusOS should feel when you open it every day.</p>
          </div>
        </div>
        <div className="exam-form-grid">
          <label className="exam-form-field">
            <span className="exam-form-label">Language</span>
            <select value={settings.language} onChange={(event) => setSettings({ ...settings, language: event.target.value })}>
              <option>English</option>
              <option>Russian</option>
              <option>Kyrgyz</option>
            </select>
          </label>

          <label className="exam-form-field">
            <span className="exam-form-label">Default page</span>
            <select value={settings.defaultPage} onChange={(event) => setSettings({ ...settings, defaultPage: event.target.value })}>
              <option value="dashboard">Dashboard</option>
              <option value="courses">Courses</option>
              <option value="schedule">Schedule</option>
              <option value="profile">Profile</option>
              <option value="messages">Messages</option>
            </select>
          </label>

          <label className="exam-form-field">
            <span className="exam-form-label">Notifications</span>
            <select value={settings.reminderMode} onChange={(event) => setSettings({ ...settings, reminderMode: event.target.value })}>
              <option>All notifications</option>
              <option>Only important</option>
              <option>Only exams</option>
              <option>Off</option>
            </select>
          </label>

          <label className="exam-form-field">
            <span className="exam-form-label">Layout density</span>
            <select value={settings.density} onChange={(event) => setSettings({ ...settings, density: event.target.value })}>
              <option>Comfortable</option>
              <option>Compact</option>
            </select>
          </label>

          <label className="exam-form-field">
            <span className="exam-form-label">Theme</span>
            <select value={theme} onChange={(event) => handleThemeSelect(event.target.value)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>

        <div className="portal-actions">
          <button type="submit" className="btn-primary">Save settings</button>
        </div>
      </form>

      <div className="management-toolbar">
        <div>
          <span className="management-summary-label">Quick actions</span>
          <strong>{user?.name || 'CampusOS user'}</strong>
          <p className="page-context-note">Signed in as {roleLabel}. Jump straight into your most-used workspace pages.</p>
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
