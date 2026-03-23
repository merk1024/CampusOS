import { useState } from 'react';

import campusosBrand from '../assets/campusos-brand.svg';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 18H16M9 18V11.5C9 9.01 10.79 7 13 7C15.21 7 17 9.01 17 11.5V18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 18H18C16.9 17 16 15.43 16 13.5V11.5C16 8.46 13.98 6 11.5 6C9.02 6 7 8.46 7 11.5V13.5C7 15.43 6.1 17 5 18H7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 8.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19 12A7.53 7.53 0 0 0 18.93 11L21 9.4l-2-3.46-2.48.78A8.03 8.03 0 0 0 15 5.86L14.6 3h-4.2L10 5.86a8.03 8.03 0 0 0-1.52.86L6 5.94 4 9.4 6.07 11A7.53 7.53 0 0 0 6 12c0 .34.02.67.07 1L4 14.6l2 3.46 2.48-.78c.47.35.98.64 1.52.86l.4 2.86h4.2l.4-2.86c.54-.22 1.05-.51 1.52-.86l2.48.78 2-3.46L18.93 13c.05-.33.07-.66.07-1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Header({ user, onLogout, onNavigate }) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleNavigate = (page) => {
    onNavigate?.(page);
    setShowUserMenu(false);
  };

  return (
    <header className="header">
      <div className="logo">
        <img src={campusosBrand} alt="CampusOS" className="logo-image" />
        <span className="logo-chip">Portal</span>
      </div>

      <div className="header-center">
        <div className="search-box">
          <span className="search-icon">
            <SearchIcon />
          </span>
          <input type="text" placeholder="Search courses, assignments..." />
        </div>
      </div>

      <div className="header-right">
        <button className="icon-btn" onClick={() => handleNavigate('messages')} aria-label="Open messages">
          <BellIcon />
          <span className="badge">3</span>
        </button>
        <button className="icon-btn" onClick={() => handleNavigate('settings')} aria-label="Open settings">
          <SettingsIcon />
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
