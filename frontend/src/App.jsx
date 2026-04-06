import { useEffect, useState } from 'react';

import './App.css';
import {
  api,
  AUTH_SESSION_EXPIRED_EVENT,
  SESSION_EXPIRED_MESSAGE,
  clearAuthSession,
  isSessionErrorMessage
} from './api';
import AttendancePage from './AttendancePage';
import CoursesPage from './CoursesPage';
import UserManagement from './UserManagement';
import Assignments from './components/Assignments';
import Dashboard from './components/Dashboard';
import Exams from './components/Exams';
import Footer from './components/Footer';
import Grades from './components/Grades';
import Header from './components/Header';
import InfoCenter from './components/InfoCenter';
import IntegrationCenter from './components/IntegrationCenter';
import LoginPage from './components/LoginPage';
import Messages from './components/Messages';
import Profile from './components/Profile';
import Schedule from './components/Schedule';
import Settings from './components/Settings';
import usePwaInstall from './hooks/usePwaInstall';
import { getAccessiblePage } from './pageAccess';
import { hasAdminAccess } from './roles';
import {
  readAppSettings,
  resolveAppSettings,
  writeAppSettings,
  getLocaleCode,
  getHtmlLangCode,
  getReminderUnreadCount,
  getShellCopy
} from './appPreferences';

const storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

const getDefaultPage = () => readAppSettings().defaultPage || 'dashboard';
const getRequestedPage = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return new URLSearchParams(window.location.search).get('page') || '';
};

function Sidebar({ activePage, setActivePage, isOpen, onClose, user, labels }) {
  const menuItems = [
    { id: 'dashboard', label: labels.dashboard, icon: 'DB' },
    { id: 'courses', label: labels.courses, icon: 'CRS' },
    { id: 'schedule', label: labels.schedule, icon: 'SCH' },
    { id: 'exams', label: labels.exams, icon: 'EXM' },
    { id: 'grades', label: labels.grades, icon: 'GRD' },
    { id: 'assignments', label: labels.assignments, icon: 'ASN' },
    { id: 'attendance', label: labels.attendance, icon: 'ATT' },
    { id: 'messages', label: labels.messages, icon: 'MSG' },
    { id: 'profile', label: labels.profile, icon: 'PRF' }
  ];

  if (hasAdminAccess(user)) {
    menuItems.push({ id: 'userManagement', label: labels.userManagement, icon: 'USR' });
    menuItems.push({ id: 'integrations', label: labels.integrations, icon: 'INT' });
  }

  const handleNavigate = (page) => {
    setActivePage(page);
    onClose();
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNavigate(item.id)}
              aria-current={activePage === item.id ? 'page' : undefined}
              aria-label={`Open ${item.label}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default function App() {
  const [appSettings, setAppSettings] = useState(() => resolveAppSettings(readAppSettings()));
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState(() => getRequestedPage() || getDefaultPage());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState('');
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const mobileInstall = usePwaInstall();
  const theme = appSettings.theme;
  const locale = getLocaleCode(appSettings.language);
  const shellCopy = getShellCopy(appSettings.language);
  const effectiveMessageUnreadCount = appSettings.reminderMode === 'Off' ? 0 : messageUnreadCount;
  const resolvedActivePage = user
    ? getAccessiblePage(user, activePage || appSettings.defaultPage || getDefaultPage())
    : activePage;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.density = appSettings.density === 'Compact' ? 'compact' : 'comfortable';
    document.documentElement.lang = getHtmlLangCode(appSettings.language);
    document.documentElement.style.colorScheme = theme;
    writeAppSettings(appSettings);
  }, [appSettings, theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
    if (!sidebarOpen || !isMobileViewport) {
      return undefined;
    }

    const scrollY = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      window.scrollTo(0, scrollY);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    const handleAuthSessionExpired = (event) => {
      setUser(null);
      setActivePage(getRequestedPage() || appSettings.defaultPage || getDefaultPage());
      setSidebarOpen(false);
      setAuthNotice(event.detail?.message || SESSION_EXPIRED_MESSAGE);
      setMessageUnreadCount(0);
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleAuthSessionExpired);

    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleAuthSessionExpired);
    };
  }, [appSettings.defaultPage]);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = storage.get('lms_user');

      try {
        const response = await api.getProfile();
        setUser({
          ...savedUser,
          ...response.user,
          isSuperadmin: response.user.is_superadmin ?? response.user.isSuperadmin ?? savedUser?.isSuperadmin,
          studentId: response.user.student_id ?? response.user.studentId ?? savedUser?.studentId,
          group: response.user.group_name ?? response.user.groupName ?? savedUser?.group,
          subgroup: response.user.subgroup_name ?? response.user.subgroupName ?? savedUser?.subgroup
        });
        setAuthNotice('');
      } catch (error) {
        if (savedUser && isSessionErrorMessage(error?.message)) {
          clearAuthSession();
          storage.remove('lms_user');
          setAuthNotice(SESSION_EXPIRED_MESSAGE);
        } else if (savedUser) {
          console.error('Failed to restore session, using saved profile:', error);
          setUser(savedUser);
          setAuthNotice('');
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    if (appSettings.reminderMode === 'Off') {
      return undefined;
    }

    let cancelled = false;

    const refreshMessageNotifications = async () => {
      try {
        const response = await api.getNotifications();
        if (cancelled) {
          return;
        }

        const unreadCount = getReminderUnreadCount(
          response?.notifications || [],
          appSettings.reminderMode
        );
        setMessageUnreadCount(activePage === 'messages' ? 0 : unreadCount);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to refresh message notifications:', error);
        }
      }
    };

    refreshMessageNotifications();
    const intervalId = window.setInterval(refreshMessageNotifications, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activePage, appSettings.reminderMode, user]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const sendClientError = (payload) => {
      api.reportClientError({
        route: window.location.pathname,
        userAgent: navigator.userAgent,
        ...payload
      }).catch(() => {});
    };

    const handleWindowError = (event) => {
      sendClientError({
        errorName: event.error?.name || 'Error',
        message: event.error?.message || event.message || 'Unhandled browser error',
        stack: event.error?.stack || null
      });
    };

    const handleUnhandledRejection = (event) => {
      const reason = event.reason;
      sendClientError({
        errorName: reason?.name || 'UnhandledRejection',
        message: reason?.message || String(reason || 'Unhandled promise rejection'),
        stack: reason?.stack || null
      });
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
    storage.set('lms_user', userData);
    setActivePage(getAccessiblePage(userData, getRequestedPage() || appSettings.defaultPage || getDefaultPage()));
    setAuthNotice('');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    setUser(null);
    clearAuthSession();
    setActivePage(getRequestedPage() || appSettings.defaultPage || getDefaultPage());
    setSidebarOpen(false);
    setAuthNotice('');
    setMessageUnreadCount(0);
  };

  const handleMessageUnreadSync = (unreadCount) => {
    setMessageUnreadCount(Number(unreadCount || 0));
  };

  const handleThemeChange = (nextTheme) => {
    setAppSettings((current) => ({ ...current, theme: nextTheme }));
  };

  const handleThemeToggle = () => {
    setAppSettings((current) => ({
      ...current,
      theme: current.theme === 'dark' ? 'light' : 'dark'
    }));
  };

  const handleSettingsSave = (nextSettings) => {
    setAppSettings(resolveAppSettings(nextSettings));
  };

  const handleNavigate = (page) => {
    setActivePage(getAccessiblePage(user, page));
  };

  const renderPage = () => {
    switch (resolvedActivePage) {
      case 'dashboard':
        return <Dashboard user={user} onNavigate={handleNavigate} locale={locale} />;
      case 'courses':
        return <CoursesPage user={user} />;
      case 'schedule':
        return <Schedule user={user} />;
      case 'exams':
        return <Exams user={user} />;
      case 'grades':
        return <Grades user={user} />;
      case 'assignments':
        return <Assignments user={user} />;
      case 'attendance':
        return <AttendancePage user={user} />;
      case 'messages':
        return (
          <Messages
            user={user}
            locale={locale}
            onUnreadCountChange={handleMessageUnreadSync}
          />
        );
      case 'profile':
        return <Profile user={user} />;
      case 'settings':
        return (
          <Settings
            user={user}
            onNavigate={handleNavigate}
            settings={appSettings}
            language={appSettings.language}
            theme={theme}
            onThemeChange={handleThemeChange}
            onSaveSettings={handleSettingsSave}
            mobileInstall={mobileInstall}
          />
        );
      case 'privacy':
        return <InfoCenter page="privacy" onNavigate={handleNavigate} />;
      case 'terms':
        return <InfoCenter page="terms" onNavigate={handleNavigate} />;
      case 'support':
        return <InfoCenter page="support" onNavigate={handleNavigate} />;
      case 'userManagement':
        return <UserManagement user={user} />;
      case 'integrations':
        return <IntegrationCenter user={user} />;
      default:
        return <Dashboard user={user} onNavigate={handleNavigate} locale={locale} />;
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>{shellCopy.app.loading}</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} notice={authNotice} language={appSettings.language} />;
  }

  return (
    <div className={`app ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Header
        user={user}
        language={appSettings.language}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        onMenuToggle={() => setSidebarOpen((value) => !value)}
        theme={theme}
        onToggleTheme={handleThemeToggle}
        messageUnreadCount={effectiveMessageUnreadCount}
        mobileInstall={mobileInstall}
      />
      <div className="app-body">
        <Sidebar
          activePage={resolvedActivePage}
          setActivePage={handleNavigate}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
          labels={shellCopy.nav}
        />
        <main id="main-content" className="main-content" tabIndex="-1">{renderPage()}</main>
      </div>
      <Footer theme={theme} language={appSettings.language} onNavigate={handleNavigate} />
    </div>
  );
}
