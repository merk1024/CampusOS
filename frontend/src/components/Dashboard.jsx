function Dashboard({ user }) {
  const roleLabel = user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : 'User';

  const quickActions = [
    'Open your schedule to check current classes.',
    'Review assignments and announcements from teachers.',
    'Update your profile information before sharing the portal.'
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {user.name.split(' ')[0]}!</h1>
          <p>Your account is ready. Live data will appear here as it is added to the system.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ '--accent': '#8b5cf6' }}>
          <span className="stat-icon">👤</span>
          <div className="stat-content">
            <div className="stat-value">{roleLabel}</div>
            <div className="stat-label">Current role</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--accent': '#10b981' }}>
          <span className="stat-icon">🪪</span>
          <div className="stat-content">
            <div className="stat-value">{user.studentId || user.email}</div>
            <div className="stat-label">Primary login</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--accent': '#3b82f6' }}>
          <span className="stat-icon">🏫</span>
          <div className="stat-content">
            <div className="stat-value">{user.group || 'Not set'}</div>
            <div className="stat-label">Group</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dash-card">
          <div className="card-header">
            <h3>Portal Status</h3>
          </div>
          <div className="activity-list">
            <div className="activity-item">
              <span className="activity-icon">✅</span>
              <div className="activity-content">
                <div className="activity-text">Authenticated successfully</div>
                <div className="activity-time">Your session is active</div>
              </div>
            </div>
            <div className="activity-item">
              <span className="activity-icon">🗂️</span>
              <div className="activity-content">
                <div className="activity-text">No demo data is shown on this dashboard</div>
                <div className="activity-time">Only live system data should be displayed</div>
              </div>
            </div>
          </div>
        </div>

        <div className="dash-card">
          <div className="card-header">
            <h3>Quick Start</h3>
          </div>
          <div className="deadline-list">
            {quickActions.map((item) => (
              <div key={item} className="deadline-item">
                <div className="deadline-info">
                  <span className="deadline-title">{item}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
