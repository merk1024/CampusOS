import { Suspense, useEffect, useState } from 'react';

import './App.css';
import {
  api,
  AUTH_SESSION_EXPIRED_EVENT,
  SESSION_EXPIRED_MESSAGE,
  clearAuthSession,
  isSessionErrorMessage
} from './api';
import Footer from './components/Footer';
import Header from './components/Header';
import LoginPage from './components/LoginPage';
import usePwaInstall from './hooks/usePwaInstall';
import { getAccessiblePage } from './pageAccess';
import {
  readAppSettings,
  resolveAppSettings,
  writeAppSettings,
  getLocaleCode,
  getHtmlLangCode,
  getShellCopy
} from './appPreferences';
import { renderActivePage } from './appShell/renderActivePage';
import Sidebar from './appShell/Sidebar';
import {
  getDefaultPage,
  getRequestedPage,
  mergeSessionUserData,
  storage
} from './appShell/storage';
import useClientErrorReporting from './appShell/useClientErrorReporting';
import useMessageNotifications from './appShell/useMessageNotifications';
import useMobileSidebarLock from './appShell/useMobileSidebarLock';

export default function App() {
  const [appSettings, setAppSettings] = useState(() => resolveAppSettings(readAppSettings()));
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState(() => getRequestedPage() || getDefaultPage());
  const [lastWorkspacePage, setLastWorkspacePage] = useState(() => getRequestedPage() || getDefaultPage());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState('');
  const [messageUnreadCount, setMessageUnreadCount] = useMessageNotifications({
    user,
    activePage,
    reminderMode: appSettings.reminderMode
  });
  const mobileInstall = usePwaInstall();
  const theme = appSettings.theme;
  const locale = getLocaleCode(appSettings.language);
  const shellCopy = getShellCopy(appSettings.language);
  const effectiveMessageUnreadCount = appSettings.reminderMode === 'Off' ? 0 : messageUnreadCount;
  const resolvedActivePage = user
    ? getAccessiblePage(user, activePage || appSettings.defaultPage || getDefaultPage())
    : activePage;

  useMobileSidebarLock(sidebarOpen);
  useClientErrorReporting(user);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.density = appSettings.density === 'Compact' ? 'compact' : 'comfortable';
    document.documentElement.lang = getHtmlLangCode(appSettings.language);
    document.documentElement.style.colorScheme = theme;
    writeAppSettings(appSettings);
  }, [appSettings, theme]);

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
  }, [appSettings.defaultPage, setMessageUnreadCount]);

  useEffect(() => {
    const initAuth = async () => {
      const savedUser = storage.get('lms_user');

      try {
        const response = await api.getProfile();
        setUser(mergeSessionUserData(savedUser, response.user));
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

  const handleLogin = (userData) => {
    setUser(userData);
    storage.set('lms_user', userData);
    const nextPage = getAccessiblePage(userData, getRequestedPage() || appSettings.defaultPage || getDefaultPage());
    setActivePage(nextPage);
    setLastWorkspacePage(nextPage);
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

  const handleUserSync = (nextUserData) => {
    setUser((current) => {
      const mergedUser = mergeSessionUserData(current, nextUserData);
      storage.set('lms_user', mergedUser);
      return mergedUser;
    });
  };

  const handleSettingsSave = (nextSettings) => {
    setAppSettings(resolveAppSettings(nextSettings));
  };

  const handleNavigate = (page) => {
    const nextPage = getAccessiblePage(user, page);
    if (!['privacy', 'terms', 'support'].includes(nextPage)) {
      setLastWorkspacePage(nextPage);
    }
    setActivePage(nextPage);
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

  const pageLoadingFallback = (
    <div className="page">
      <div className="loading-spinner"></div>
      <p>{shellCopy.app.loading}</p>
    </div>
  );

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
        <main id="main-content" className="main-content" tabIndex="-1">
          <Suspense fallback={pageLoadingFallback}>
            {renderActivePage({
              resolvedActivePage,
              user,
              locale,
              language: appSettings.language,
              onNavigate: handleNavigate,
              onUnreadCountChange: handleMessageUnreadSync,
              onUserChange: handleUserSync,
              settings: appSettings,
              theme,
              onThemeChange: handleThemeChange,
              onSaveSettings: handleSettingsSave,
              mobileInstall,
              lastWorkspacePage
            })}
          </Suspense>
        </main>
      </div>
      <Footer theme={theme} language={appSettings.language} onNavigate={handleNavigate} />
    </div>
  );
}
