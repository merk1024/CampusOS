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

export default Dashboard;
