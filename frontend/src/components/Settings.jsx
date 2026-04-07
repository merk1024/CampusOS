import { useEffect, useMemo, useState } from 'react';

import { getDefaultPageLabel, getLanguageLabel, getShellCopy } from '../appPreferences';
import StatusBanner from './StatusBanner';
import { getRoleLabel } from '../roles';

function Settings({
  user,
  onNavigate,
  settings,
  language,
  theme,
  onThemeChange,
  onSaveSettings,
  mobileInstall
}) {
  const shellCopy = getShellCopy(language);
  const copy = shellCopy.settings;
  const themeCopy = shellCopy.header;
  const [formState, setFormState] = useState(settings);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setFormState(settings);
  }, [settings]);

  const summaryCards = useMemo(() => ([
    { label: copy.summaryTheme, value: theme === 'dark' ? themeCopy.dark : themeCopy.light },
    { label: copy.summaryLanguage, value: getLanguageLabel(formState.language, formState.language) },
    { label: copy.summaryDefaultPage, value: getDefaultPageLabel(formState.defaultPage, formState.language) },
    { label: copy.summaryDensity, value: formState.density === 'Compact' ? copy.densityCompact : copy.densityComfortable }
  ]), [copy, formState.defaultPage, formState.density, formState.language, theme, themeCopy.dark, themeCopy.light]);

  const handleSave = (event) => {
    event.preventDefault();

    try {
      const nextSettings = { ...formState, theme };
      onSaveSettings?.(nextSettings);
      setFormState(nextSettings);
      setError('');
      setNotice(copy.saveSuccess);
      window.setTimeout(() => setNotice(''), 2200);
    } catch (saveError) {
      console.error('Failed to save settings:', saveError);
      setNotice('');
      setError(copy.saveError);
    }
  };

  const handleThemeSelect = (nextTheme) => {
    onThemeChange?.(nextTheme);
    setFormState((current) => ({ ...current, theme: nextTheme }));
    setNotice('');
  };

  const roleLabel = getRoleLabel(user, language);
  const mobileStatus = mobileInstall?.isInstalled
    ? copy.mobileInstalled
    : mobileInstall?.canInstall
      ? copy.mobileReady
      : copy.mobileBrowser;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
      </div>

      <StatusBanner tone="error" title={copy.saveErrorTitle} message={error} />
      <StatusBanner tone="success" title={copy.saveSuccessTitle} message={notice} />

      <div className="management-summary-grid">
        {summaryCards.map((item) => (
          <div key={item.label} className="management-summary-card">
            <span className="management-summary-label">{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
        <div className="management-summary-card">
          <span className="management-summary-label">{copy.summaryMobile}</span>
          <strong>{mobileStatus}</strong>
        </div>
      </div>

      <form className="exam-form-card" onSubmit={handleSave}>
        <div className="exam-form-header">
          <div>
            <h3>{copy.workspaceTitle}</h3>
            <p>{copy.workspaceSubtitle}</p>
          </div>
        </div>
        <div className="exam-form-grid">
          <label className="exam-form-field">
            <span className="exam-form-label">{copy.language}</span>
            <select
              value={formState.language}
              onChange={(event) => setFormState({ ...formState, language: event.target.value })}
            >
              <option value="English">{getLanguageLabel('English', formState.language)}</option>
              <option value="Kyrgyz">{getLanguageLabel('Kyrgyz', formState.language)}</option>
            </select>
          </label>

          <label className="exam-form-field">
            <span className="exam-form-label">{copy.defaultPage}</span>
            <select
              value={formState.defaultPage}
              onChange={(event) => setFormState({ ...formState, defaultPage: event.target.value })}
            >
              <option value="dashboard">{getDefaultPageLabel('dashboard', formState.language)}</option>
              <option value="courses">{getDefaultPageLabel('courses', formState.language)}</option>
              <option value="schedule">{getDefaultPageLabel('schedule', formState.language)}</option>
              <option value="profile">{getDefaultPageLabel('profile', formState.language)}</option>
              <option value="messages">{getDefaultPageLabel('messages', formState.language)}</option>
            </select>
          </label>

          <label className="exam-form-field">
            <span className="exam-form-label">{copy.notifications}</span>
            <select
              value={formState.reminderMode}
              onChange={(event) => setFormState({ ...formState, reminderMode: event.target.value })}
            >
              <option value="All notifications">{copy.reminderAll}</option>
              <option value="Only important">{copy.reminderImportant}</option>
              <option value="Only exams">{copy.reminderExam}</option>
              <option value="Off">{copy.reminderOff}</option>
            </select>
          </label>

          <label className="exam-form-field">
            <span className="exam-form-label">{copy.density}</span>
            <select
              value={formState.density}
              onChange={(event) => setFormState({ ...formState, density: event.target.value })}
            >
              <option value="Comfortable">{copy.densityComfortable}</option>
              <option value="Compact">{copy.densityCompact}</option>
            </select>
          </label>

          <label className="exam-form-field">
            <span className="exam-form-label">{copy.theme}</span>
            <select value={theme} onChange={(event) => handleThemeSelect(event.target.value)}>
              <option value="light">{themeCopy.light}</option>
              <option value="dark">{themeCopy.dark}</option>
            </select>
          </label>
        </div>

        <div className="portal-actions">
          <button type="submit" className="btn-primary">{copy.saveButton}</button>
        </div>
      </form>

      <section className="exam-form-card mobile-pilot-card">
        <div className="exam-form-header">
          <div>
            <h3>{copy.mobileTitle}</h3>
            <p>{copy.mobileSubtitle}</p>
          </div>
        </div>
        <div className="portal-records">
          <div className="portal-row">
            <div>
              <span className="portal-kicker">{copy.mobileDirection}</span>
              <strong>{copy.mobileDirectionValue}</strong>
            </div>
            <p className="page-context-note">{copy.mobileDirectionBody}</p>
          </div>
          <div className="portal-row">
            <div>
              <span className="portal-kicker">{copy.mobileStatus}</span>
              <strong>{mobileStatus}</strong>
            </div>
            <p className="page-context-note">
              {mobileInstall?.isInstalled
                ? copy.mobileInstalledBody
                : mobileInstall?.canInstall
                  ? copy.mobileReadyBody
                  : copy.mobileBrowserBody}
            </p>
          </div>
        </div>
        <div className="portal-actions">
          {mobileInstall?.canInstall ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => mobileInstall.installApp?.()}
              disabled={mobileInstall.installing}
            >
              {mobileInstall.installing ? copy.mobileInstalling : copy.mobileInstallButton}
            </button>
          ) : (
            <button type="button" className="btn-secondary" disabled>
              {mobileInstall?.isInstalled ? copy.mobileInstalledButton : copy.mobileBrowserButton}
            </button>
          )}
        </div>
      </section>

      <div className="management-toolbar">
        <div>
          <span className="management-summary-label">{copy.quickActions}</span>
          <strong>{user?.name || 'CampusOS user'}</strong>
          <p className="page-context-note">{copy.quickActionsBody.replace('{role}', roleLabel)}</p>
        </div>
        <div className="management-filters">
          <button className="management-filter-chip" onClick={() => onNavigate('profile')}>{copy.openProfile}</button>
          <button className="management-filter-chip" onClick={() => onNavigate('messages')}>{copy.openMessages}</button>
          <button className="management-filter-chip" onClick={() => onNavigate('schedule')}>{copy.openSchedule}</button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
