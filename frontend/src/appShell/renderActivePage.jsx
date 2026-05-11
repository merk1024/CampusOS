import AttendancePage from '../AttendancePage';
import CoursesPage from '../CoursesPage';
import UserManagement from '../UserManagement';
import Assignments from '../components/Assignments';
import Dashboard from '../components/Dashboard';
import Exams from '../components/Exams';
import Grades from '../components/Grades';
import InfoCenter from '../components/InfoCenter';
import IntegrationCenter from '../components/IntegrationCenter';
import Messages from '../components/Messages';
import Profile from '../components/Profile';
import Schedule from '../components/Schedule';
import Settings from '../components/Settings';

export function renderActivePage({
  resolvedActivePage,
  user,
  locale,
  language,
  onNavigate,
  onUnreadCountChange,
  onUserChange,
  settings,
  theme,
  onThemeChange,
  onSaveSettings,
  mobileInstall,
  lastWorkspacePage
}) {
  switch (resolvedActivePage) {
    case 'dashboard':
      return <Dashboard user={user} onNavigate={onNavigate} locale={locale} language={language} />;
    case 'courses':
      return <CoursesPage user={user} language={language} locale={locale} />;
    case 'schedule':
      return <Schedule user={user} language={language} />;
    case 'exams':
      return <Exams user={user} language={language} locale={locale} />;
    case 'grades':
      return <Grades user={user} language={language} locale={locale} />;
    case 'assignments':
      return <Assignments user={user} language={language} locale={locale} />;
    case 'attendance':
      return <AttendancePage user={user} language={language} locale={locale} />;
    case 'messages':
      return (
        <Messages
          user={user}
          locale={locale}
          language={language}
          onUnreadCountChange={onUnreadCountChange}
        />
      );
    case 'profile':
      return <Profile user={user} onUserChange={onUserChange} language={language} locale={locale} />;
    case 'settings':
      return (
        <Settings
          user={user}
          onNavigate={onNavigate}
          settings={settings}
          language={language}
          theme={theme}
          onThemeChange={onThemeChange}
          onSaveSettings={onSaveSettings}
          mobileInstall={mobileInstall}
        />
      );
    case 'privacy':
      return (
        <InfoCenter
          page="privacy"
          onNavigate={onNavigate}
          user={user}
          contextPage={lastWorkspacePage}
          language={language}
        />
      );
    case 'terms':
      return (
        <InfoCenter
          page="terms"
          onNavigate={onNavigate}
          user={user}
          contextPage={lastWorkspacePage}
          language={language}
        />
      );
    case 'support':
      return (
        <InfoCenter
          page="support"
          onNavigate={onNavigate}
          user={user}
          contextPage={lastWorkspacePage}
          language={language}
        />
      );
    case 'userManagement':
      return <UserManagement user={user} language={language} />;
    case 'integrations':
      return <IntegrationCenter user={user} />;
    default:
      return <Dashboard user={user} onNavigate={onNavigate} locale={locale} language={language} />;
  }
}
