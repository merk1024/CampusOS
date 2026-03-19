import { useState } from 'react';

function Header({ user, onLogout, onNavigate }) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleNavigate = (page) => {
    onNavigate?.(page);
    setShowUserMenu(false);
  };

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
        <button className="icon-btn" onClick={() => handleNavigate('messages')}>
          <span>🔔</span>
          <span className="badge">3</span>
        </button>
        <button className="icon-btn" onClick={() => handleNavigate('settings')}>
          <span>⚙️</span>
        </button>

        <div className="user-menu-wrapper">
          <button className="user-btn" onClick={() => setShowUserMenu((value) => !value)}>
            <div className="user-avatar">{user.avatar}</div>
            <div className="user-details">
              <div className="user-name">{user.name.split(' ')[0]}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <button className="dropdown-item" onClick={() => handleNavigate('profile')}>Profile</button>
              <button className="dropdown-item" onClick={() => handleNavigate('settings')}>Settings</button>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item" onClick={onLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
