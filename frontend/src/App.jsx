import { useState, useEffect } from 'react';
import './App.css';
import CoursesPage from './CoursesPage';
import AttendancePage from './AttendancePage';
import { api } from './api';

// ══════════════════════════════════════════════════════════
//  STORAGE & DATA
// ══════════════════════════════════════════════════════════
const storage = {
  get: (key) => {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  },
  set: (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch (e) { console.error(e); }
  }
};

// ══════════════════════════════════════════════════════════
//  PAGES
// ══════════════════════════════════════════════════════════

// Dashboard
function Dashboard({ user }) {
  const stats = [
    { icon: '📚', value: '8', label: 'Active Courses', color: '#8b5cf6' },
    { icon: '✅', value: '24', label: 'Tasks Done', color: '#10b981' },
    { icon: '⭐', value: '4.8', label: 'Average', color: '#f59e0b' },
    { icon: '🎯', value: '92%', label: 'Attendance', color: '#3b82f6' }
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user.name.split(' ')[0]}! 👋</h1>
          <p>Here's what's happening with your studies today</p>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card" style={{ '--accent': stat.color }}>
            <span className="stat-icon">{stat.icon}</span>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="dash-card">
          <div className="card-header">
            <h3>📋 Upcoming Deadlines</h3>
            <button className="btn-text">View All</button>
          </div>
          <div className="deadline-list">
            {[
              { title: 'CS101 Assignment 3', date: 'Today', type: 'urgent' },
              { title: 'Math201 Quiz', date: 'Tomorrow', type: 'soon' },
              { title: 'Web Dev Project', date: 'In 3 days', type: 'normal' }
            ].map((item, i) => (
              <div key={i} className="deadline-item">
                <div className="deadline-info">
                  <span className="deadline-title">{item.title}</span>
                  <span className={`deadline-badge ${item.type}`}>{item.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <div className="card-header">
            <h3>📅 Today's Classes</h3>
            <button className="btn-text">Full Schedule</button>
          </div>
          <div className="class-list">
            {[
              { time: '09:00', subject: 'Programming Language 2', room: 'B101', status: 'completed' },
              { time: '11:00', subject: 'Calculus 2', room: 'B203', status: 'current' },
              { time: '14:00', subject: 'Web Development', room: 'BIGLAB', status: 'upcoming' }
            ].map((cls, i) => (
              <div key={i} className={`class-item ${cls.status}`}>
                <div className="class-time">{cls.time}</div>
                <div className="class-info">
                  <div className="class-subject">{cls.subject}</div>
                  <div className="class-room">📍 {cls.room}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <div className="card-header">
            <h3>🎯 Recent Activity</h3>
          </div>
          <div className="activity-list">
            {[
              { icon: '✅', text: 'Completed CS101 Lab 3', time: '2 hours ago' },
              { icon: '📝', text: 'Submitted Math Assignment', time: '5 hours ago' },
              { icon: '⭐', text: 'Achieved 95% in Quiz', time: 'Yesterday' }
            ].map((act, i) => (
              <div key={i} className="activity-item">
                <span className="activity-icon">{act.icon}</span>
                <div className="activity-content">
                  <div className="activity-text">{act.text}</div>
                  <div className="activity-time">{act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <div className="card-header">
            <h3>📊 Quick Stats</h3>
          </div>
          <div className="quick-stats">
            <div className="quick-stat">
              <span className="quick-stat-icon">📖</span>
              <div>
                <div className="quick-stat-value">12</div>
                <div className="quick-stat-label">Total Courses</div>
              </div>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-icon">⏰</span>
              <div>
                <div className="quick-stat-value">156</div>
                <div className="quick-stat-label">Study Hours</div>
              </div>
            </div>
            <div className="quick-stat">
              <span className="quick-stat-icon">🏆</span>
              <div>
                <div className="quick-stat-value">A-</div>
                <div className="quick-stat-label">Current GPA</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Schedule
function Schedule() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>📅 Schedule</h1>
        <p>Your weekly timetable</p>
      </div>
      <div className="schedule-placeholder">
        <p>Schedule grid coming soon...</p>
      </div>
    </div>
  );
}

// Grades
function Grades() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>📊 Grades</h1>
        <p>Track your academic performance</p>
      </div>
      <div className="grades-placeholder">
        <p>Grades list coming soon...</p>
      </div>
    </div>
  );
}

// Assignments
function Assignments() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>📝 Assignments</h1>
        <p>View and submit your assignments</p>
      </div>
      <div className="assignments-placeholder">
        <p>Assignments list coming soon...</p>
      </div>
    </div>
  );
}

// Messages
function Messages() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>💬 Messages</h1>
        <p>Communicate with teachers and classmates</p>
      </div>
      <div className="messages-placeholder">
        <p>Messages coming soon...</p>
      </div>
    </div>
  );
}

// Profile
function Profile({ user }) {
  return (
    <div className="page">
      <div className="page-header">
        <h1>👤 Profile</h1>
      </div>
      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar-large">{user.avatar}</div>
          <h2>{user.name}</h2>
          <p className="profile-email">{user.email}</p>
          {user.studentId && <p className="profile-id">ID: {user.studentId}</p>}
          {user.group && <p className="profile-group">Group: {user.group}</p>}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  COMPONENTS
// ══════════════════════════════════════════════════════════

// Header
function Header({ user, onLogout, onToggleSidebar }) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="header">
        <div className="logo">
          <span className="logo-icon">🎓</span>
          <span className="logo-text">Alatoo LMS</span>
        
      </div>

      <div className="header-center">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search courses, assignments..." />
        </div>
      </div>

      <div className="header-right">
        <button className="icon-btn">
          <span>🔔</span>
          <span className="badge">3</span>
        </button>
        <button className="icon-btn">
          <span>✉️</span>
        </button>
        <div className="user-menu-wrapper">
          <button className="user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="user-avatar">{user.avatar}</div>
            <div className="user-details">
              <div className="user-name">{user.name.split(' ')[0]}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </button>
          {showUserMenu && (
            <div className="user-dropdown">
              <div className="dropdown-item">👤 Profile</div>
              <div className="dropdown-item">⚙️ Settings</div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-item" onClick={onLogout}>🚪 Logout</div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// Footer
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <div className="footer-logo">
            <span className="logo-icon">🎓</span>
            <span className="logo-text">Alatoo University</span>
          </div>
          <p className="footer-text">© 2024 Alatoo University. All rights reserved.</p>
        </div>
        <div className="footer-right">
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Sidebar
function Sidebar({ activePage, setActivePage, isOpen, onClose }) {
  const menuItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'courses', icon: '📚', label: 'Courses' },
    { id: 'schedule', icon: '📅', label: 'Schedule' },
    { id: 'grades', icon: '📊', label: 'Grades' },
    { id: 'assignments', icon: '📝', label: 'Assignments' },
    { id: 'attendance', icon: '📋', label: 'Attendance' },
    { id: 'messages', icon: '💬', label: 'Messages' }
  ];

  const handleItemClick = (id) => {
    setActivePage(id);
    onClose();
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleItemClick(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => handleItemClick('profile')}>
            <span className="nav-icon">👤</span>
            <span className="nav-label">Profile</span>
          </button>
          <button className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// Login Page
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.login(email, password);
      const userData = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role,
        studentId: response.user.student_id,
        group: response.user.group_name,
        avatar: response.user.avatar || response.user.name.split(' ').map(n => n[0]).join('').toUpperCase(),
        token: response.token
      };

      // Store token
      localStorage.setItem('token', response.token);
      onLogin(userData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-left">
          <div className="login-brand">
            <span className="brand-icon">🎓</span>
            <h1>Alatoo University</h1>
            <h2>Learning Management System</h2>
          </div>
          <div className="login-features">
            <div className="feature">
              <span className="feature-icon">✅</span>
              <span>Access all your courses</span>
            </div>
            <div className="feature">
              <span className="feature-icon">📊</span>
              <span>Track your progress</span>
            </div>
            <div className="feature">
              <span className="feature-icon">📅</span>
              <span>Manage your schedule</span>
            </div>
            <div className="feature">
              <span className="feature-icon">💬</span>
              <span>Connect with teachers</span>
            </div>
          </div>
        </div>

        <div className="login-right">
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Welcome Back</h2>
            <p className="login-subtitle">Sign in to continue to your dashboard</p>

            {error && <div className="error-message">{error}</div>}

            <div className="form-field">
              <label>Email</label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder=" "
                required
              />
            </div>

            <div className="form-field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder=" "
                required
              />
            </div>

            <div className="form-row">
              <label className="checkbox">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="#" className="link">Forgot password?</a>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="demo-hint">
              <p><strong>Demo Accounts:</strong></p>
              <p>👨‍🎓 Student: student@alatoo.edu.kg / student</p>
              <p>👩‍🏫 Teacher: teacher@alatoo.edu.kg / teacher</p>
              <p>👤 Admin: admin@alatoo.edu.kg / admin</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = storage.get('lms_user');

      if (token && savedUser) {
        // Verify token is still valid by fetching profile
        try {
          await api.getProfile();
          setUser(savedUser);
        } catch (err) {
          // Token invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('lms_user');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    storage.set('lms_user', userData);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    localStorage.removeItem('lms_user');
    setActivePage('dashboard');
    setSidebarOpen(false);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard user={user} />;
      case 'courses': return <CoursesPage user={user} />;
      case 'schedule': return <Schedule />;
      case 'grades': return <Grades />;
      case 'assignments': return <Assignments />;
      case 'attendance': return <AttendancePage user={user} />;
      case 'messages': return <Messages />;
      case 'profile': return <Profile user={user} />;
      default: return <Dashboard user={user} />;
    }
  };

  return (
    <div className="app">
      <Header user={user} onLogout={handleLogout} onToggleSidebar={toggleSidebar} />
      <div className="app-body">
        <Sidebar activePage={activePage} setActivePage={setActivePage} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="main-content">
          {renderPage()}
        </main>
      </div>
      <Footer />
    </div>
  );
}