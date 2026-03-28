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
import LoginPage from './components/LoginPage';
import Messages from './components/Messages';
import Profile from './components/Profile';
import Schedule from './components/Schedule';
import Settings from './components/Settings';
import { getUnreadMessageCount, markMessagesAsRead } from './notificationState';
import { hasAdminAccess } from './roles';

const SETTINGS_KEY = 'lms_app_settings';

const DEFAULT_SETTINGS = {
  language: 'English',
  defaultPage: 'dashboard',
  reminderMode: 'All notifications',
  density: 'Comfortable',
  theme: null
};

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

const readAppSettings = () => {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return { ...DEFAULT_SETTINGS, ...(value || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

const writeAppSettings = (patch) => {
  const nextSettings = { ...readAppSettings(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
  return nextSettings;
};

const getDefaultPage = () => readAppSettings().defaultPage || 'dashboard';

const getInitialTheme = () => {
  const storedTheme = readAppSettings().theme;
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
};

function Sidebar({ activePage, setActivePage, isOpen, onClose, user }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'DB' },
    { id: 'courses', label: 'Courses', icon: 'CRS' },
    { id: 'schedule', label: 'Schedule', icon: 'SCH' },
    { id: 'exams', label: 'Exams', icon: 'EXM' },
    { id: 'grades', label: 'Grades', icon: 'GRD' },
    { id: 'assignments', label: 'Assignments', icon: 'ASN' },
    { id: 'attendance', label: 'Attendance', icon: 'ATT' },
    { id: 'messages', label: 'Messages', icon: 'MSG' },
    { id: 'profile', label: 'Profile', icon: 'PRF' }
  ];

  if (hasAdminAccess(user)) {
    menuItems.push({ id: 'userManagement', label: 'User Management', icon: 'USR' });
  }

  const handleNavigate = (page) => {
    setActivePage(page);
    onClose();
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNavigate(item.id)}
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
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState(getDefaultPage);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(getInitialTheme);
  const [authNotice, setAuthNotice] = useState('');
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    writeAppSettings({ theme });
  }, [theme]);

  useEffect(() => {
    const handleAuthSessionExpired = (event) => {
      setUser(null);
      setActivePage(getDefaultPage());
      setSidebarOpen(false);
      setAuthNotice(event.detail?.message || SESSION_EXPIRED_MESSAGE);
      setMessageUnreadCount(0);
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleAuthSessionExpired);

    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleAuthSessionExpired);
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const savedUser = storage.get('lms_user');

      if (token && savedUser) {
        try {
          const response = await api.getProfile();
          setUser({
            ...savedUser,
            ...response.user,
            isSuperadmin: response.user.is_superadmin ?? response.user.isSuperadmin ?? savedUser.isSuperadmin,
            studentId: response.user.student_id ?? response.user.studentId ?? savedUser.studentId,
            group: response.user.group_name ?? response.user.groupName ?? savedUser.group,
            subgroup: response.user.subgroup_name ?? response.user.subgroupName ?? savedUser.subgroup
          });
          setAuthNotice('');
        } catch (error) {
          if (isSessionErrorMessage(error?.message)) {
            clearAuthSession();
            setAuthNotice(SESSION_EXPIRED_MESSAGE);
          } else {
            console.error('Failed to restore session, using saved profile:', error);
            setUser(savedUser);
            setAuthNotice('');
          }
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

    let cancelled = false;

    const refreshMessageNotifications = async () => {
      try {
        const response = await api.getAnnouncements();
        if (cancelled) {
          return;
        }

        const announcements = response?.announcements || [];
        if (activePage === 'messages') {
          markMessagesAsRead(announcements, user);
          setMessageUnreadCount(0);
          return;
        }

        setMessageUnreadCount(getUnreadMessageCount(announcements, user));
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
  }, [activePage, user]);

  const handleLogin = (userData) => {
    setUser(userData);
    storage.set('lms_user', userData);
    setActivePage(getDefaultPage());
    setAuthNotice('');
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    setUser(null);
    storage.remove('lms_user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setActivePage(getDefaultPage());
    setSidebarOpen(false);
    setAuthNotice('');
    setMessageUnreadCount(0);
  };

  const handleAnnouncementsSync = (announcements) => {
    if (!user) {
      setMessageUnreadCount(0);
      return;
    }

    if (activePage === 'messages') {
      markMessagesAsRead(announcements, user);
      setMessageUnreadCount(0);
      return;
    }

    setMessageUnreadCount(getUnreadMessageCount(announcements, user));
  };

  const handleAnnouncementsViewed = (announcements) => {
    if (!user) {
      return;
    }

    markMessagesAsRead(announcements, user);
    setMessageUnreadCount(0);
  };

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme);
  };

  const handleThemeToggle = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard user={user} />;
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
            onAnnouncementsSync={handleAnnouncementsSync}
            onAnnouncementsViewed={handleAnnouncementsViewed}
          />
        );
      case 'profile':
        return <Profile user={user} />;
      case 'settings':
        return (
          <Settings
            user={user}
            onNavigate={setActivePage}
            theme={theme}
            onThemeChange={handleThemeChange}
          />
        );
      case 'userManagement':
        return <UserManagement user={user} />;
      default:
        return <Dashboard user={user} />;
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} notice={authNotice} />;
  }

  return (
    <div className="app">
      <Header
        user={user}
        onLogout={handleLogout}
        onNavigate={setActivePage}
        onMenuToggle={() => setSidebarOpen((value) => !value)}
        theme={theme}
        onToggleTheme={handleThemeToggle}
        messageUnreadCount={messageUnreadCount}
      />
      <div className="app-body">
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={user}
        />
        <main className="main-content">{renderPage()}</main>
      </div>
      <Footer theme={theme} />
    </div>
  );
}
