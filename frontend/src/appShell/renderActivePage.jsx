import { lazy } from 'react';

const AttendancePage = lazy(() => import('../AttendancePage'));
const CoursesPage = lazy(() => import('../CoursesPage'));
const UserManagement = lazy(() => import('../UserManagement'));
const Assignments = lazy(() => import('../components/Assignments'));
const Dashboard = lazy(() => import('../components/Dashboard'));
const Exams = lazy(() => import('../components/Exams'));
const Grades = lazy(() => import('../components/Grades'));
const InfoCenter = lazy(() => import('../components/InfoCenter'));
const IntegrationCenter = lazy(() => import('../components/IntegrationCenter'));
const Messages = lazy(() => import('../components/Messages'));
const Profile = lazy(() => import('../components/Profile'));
const Schedule = lazy(() => import('../components/Schedule'));
const Settings = lazy(() => import('../components/Settings'));

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
