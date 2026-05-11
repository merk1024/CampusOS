import { hasAdminAccess } from '../roles';

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

export default Sidebar;
