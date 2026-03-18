import { useState } from 'react';

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

export default Header;