import { useEffect, useRef, useState } from 'react';

import campusosBrandDark from '../assets/campusos-brand-dark.svg';
import campusosBrandLight from '../assets/campusos-brand-light.svg';
import campusosMobileDark from '../assets/campusos-mobile-dark.svg';
import campusosMobileLight from '../assets/campusos-mobile-light.svg';
import useMediaQuery from '../hooks/useMediaQuery';
import { getRoleLabel } from '../roles';

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

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

function InstallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4V14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 10.5L12 14L15.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2V4.5M12 19.5V22M4.93 4.93L6.7 6.7M17.3 17.3L19.07 19.07M2 12H4.5M19.5 12H22M4.93 19.07L6.7 17.3M17.3 6.7L19.07 4.93"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A7.5 7.5 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Header({
  user,
  onLogout,
  onNavigate,
  onMenuToggle,
  theme,
  onToggleTheme,
  messageUnreadCount = 0,
  mobileInstall
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const isCompactBrand = useMediaQuery('(max-width: 768px)');
  const brandLogo = theme === 'dark' ? campusosBrandDark : campusosBrandLight;
  const mobileBrandLogo = theme === 'dark' ? campusosMobileDark : campusosMobileLight;
  const activeBrandLogo = isCompactBrand ? mobileBrandLogo : brandLogo;
  const displayName = user?.name?.trim() || user?.email || 'User';
  const firstName = displayName.split(/\s+/)[0] || 'User';
  const avatarLabel = user?.avatar?.trim()
    || displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  useEffect(() => {
    if (!showUserMenu) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showUserMenu]);

  const handleNavigate = (page) => {
    onNavigate?.(page);
    setShowUserMenu(false);
  };

  const handleLogoutClick = () => {
    setShowUserMenu(false);
    onLogout?.();
  };

  const handleInstallClick = async () => {
    await mobileInstall?.installApp?.();
  };

  return (
    <header className="header">
      <div className="header-left">
        <button type="button" className="menu-btn" onClick={onMenuToggle} aria-label="Open navigation">
          <MenuIcon />
        </button>
        <button type="button" className="logo" onClick={() => handleNavigate('dashboard')} aria-label="Open dashboard">
          <span className="logo-media">
            <img src={activeBrandLogo} alt="CampusOS" className="logo-image" />
          </span>
          <span className="logo-chip">Portal</span>
        </button>
      </div>

      <div className="header-center">
        <div className="search-box">
          <span className="search-icon">
            <SearchIcon />
          </span>
          <input type="text" placeholder="Search courses, assignments..." aria-label="Search CampusOS content" />
        </div>
      </div>

      <div className="header-right">
        <button
          type="button"
          className={`theme-toggle ${theme === 'dark' ? 'active' : ''}`}
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={theme === 'dark'}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          <span className="theme-toggle-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        <button type="button" className="icon-btn" onClick={() => handleNavigate('messages')} aria-label="Open messages" title="Messages">
          <BellIcon />
          {messageUnreadCount > 0 && (
            <span className="badge" aria-live="polite">{messageUnreadCount > 99 ? '99+' : messageUnreadCount}</span>
          )}
        </button>
        {mobileInstall?.canInstall && (
          <button
            type="button"
            className="icon-btn install-app-btn"
            onClick={handleInstallClick}
            aria-label="Install CampusOS app"
            title="Install CampusOS app"
            disabled={mobileInstall.installing}
          >
            <InstallIcon />
          </button>
        )}
        <button type="button" className="icon-btn" onClick={() => handleNavigate('settings')} aria-label="Open settings" title="Settings">
          <SettingsIcon />
        </button>

        <div className="user-menu-wrapper" ref={userMenuRef}>
          <button type="button" className="user-btn" onClick={() => setShowUserMenu((value) => !value)} aria-expanded={showUserMenu} aria-haspopup="menu" aria-label="Open user menu">
            <div className="user-avatar">{avatarLabel}</div>
            <div className="user-details">
              <div className="user-name">{firstName}</div>
              <div className="user-role">{getRoleLabel(user)}</div>
            </div>
          </button>

          {showUserMenu && (
            <div className="user-dropdown" role="menu">
              <button type="button" className="dropdown-item" role="menuitem" onClick={() => handleNavigate('profile')}>Profile</button>
              <button type="button" className="dropdown-item" role="menuitem" onClick={() => handleNavigate('settings')}>Settings</button>
              <div className="dropdown-divider"></div>
              <button type="button" className="dropdown-item" role="menuitem" onClick={handleLogoutClick}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
