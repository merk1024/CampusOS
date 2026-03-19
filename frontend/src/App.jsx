import { useEffect, useState } from 'react';

import './App.css';
import { api } from './api';
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

const getDefaultPage = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('lms_app_settings'));
    return settings?.defaultPage || 'dashboard';
  } catch {
    return 'dashboard';
  }
};

function Sidebar({ activePage, setActivePage, isOpen, onClose, user }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'courses', label: 'Courses', icon: '📚' },
    { id: 'schedule', label: 'Schedule', icon: '🗓️' },
    { id: 'exams', label: 'Exams', icon: '📝' },
    { id: 'grades', label: 'Grades', icon: '📊' },
    { id: 'assignments', label: 'Assignments', icon: '📝' },
    { id: 'attendance', label: 'Attendance', icon: '📋' },
    { id: 'messages', label: 'Messages', icon: '💬' },
    { id: 'profile', label: 'Profile', icon: '👤' }
  ];

  if (user?.role === 'admin') {
    menuItems.push({ id: 'userManagement', label: 'User Management', icon: '👥' });
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
            studentId: response.user.student_id ?? response.user.studentId ?? savedUser.studentId,
            group: response.user.group_name ?? response.user.groupName ?? savedUser.group,
            subgroup: response.user.subgroup_name ?? response.user.subgroupName ?? savedUser.subgroup
          });
        } catch {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          storage.remove('lms_user');
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    storage.set('lms_user', userData);
    setActivePage(getDefaultPage());
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
        return <Messages user={user} />;
      case 'profile':
        return <Profile user={user} />;
      case 'settings':
        return <Settings user={user} onNavigate={setActivePage} />;
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
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Header user={user} onLogout={handleLogout} onNavigate={setActivePage} />
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
      <Footer />
    </div>
  );
}
