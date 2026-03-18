import { useState, useEffect } from 'react';
import './App.css';
import CoursesPage from './CoursesPage';
import AttendancePage from './AttendancePage';
import UserManagement from './UserManagement';
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
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [formData, setFormData] = useState({
    day: '',
    time_slot: '',
    group_name: '',
    subject: '',
    teacher: '',
    room: ''
  });

  useEffect(() => {
    // Get user from localStorage
    const savedUser = JSON.parse(localStorage.getItem('lms_user'));
    setUser(savedUser);

    const loadSchedule = async () => {
      try {
        const response = await api.getSchedule();
        setSchedule(response.schedule || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, []);

  const canEdit = user && (user.role === 'admin' || user.role === 'teacher');

  const handleCellClick = (day, timeSlot) => {
    if (!canEdit) return;

    const existingClass = schedule.find(cls => cls.day === day && cls.time_slot === timeSlot);

    if (existingClass) {
      // Edit existing
      setFormData({
        id: existingClass.id,
        day: existingClass.day,
        time_slot: existingClass.time_slot,
        group_name: existingClass.group_name,
        subject: existingClass.subject,
        teacher: existingClass.teacher,
        room: existingClass.room
      });
    } else {
      // Create new
      setFormData({
        day,
        time_slot: timeSlot,
        group_name: user.role === 'student' ? user.group : '',
        subject: '',
        teacher: user.role === 'teacher' ? user.name : '',
        room: ''
      });
    }

    setEditingSlot({ day, timeSlot });
    setShowEditForm(true);
  };

  const handleSave = async () => {
    try {
      if (formData.id) {
        // Update existing
        await api.updateScheduleEntry(formData.id, formData);
      } else {
        // Create new
        await api.createScheduleEntry(formData);
      }

      // Reload schedule
      const response = await api.getSchedule();
      setSchedule(response.schedule || []);

      setShowEditForm(false);
      setEditingSlot(null);
    } catch (err) {
      console.error('Failed to save schedule entry:', err);
      alert('Failed to save schedule entry');
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;

    try {
      await api.deleteScheduleEntry(formData.id);

      // Reload schedule
      const response = await api.getSchedule();
      setSchedule(response.schedule || []);

      setShowEditForm(false);
      setEditingSlot(null);
    } catch (err) {
      console.error('Failed to delete schedule entry:', err);
      alert('Failed to delete schedule entry');
    }
  };

  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  const timeSlots = ['09:00', '10:30', '11:00', '12:00', '13:30', '14:00', '15:00', '16:30', '18:00'];

  const getClassForSlot = (day, timeSlot) => {
    return schedule.find(cls => cls.day === day && cls.time_slot === timeSlot);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>📅 Schedule</h1>
          <p>Loading your timetable...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>📅 Schedule</h1>
          <p>Error loading schedule: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>📅 Schedule</h1>
          <p>Your weekly timetable</p>
        </div>
        {canEdit && (
          <div className="page-actions">
            <p className="edit-hint">Click on any cell to add/edit classes</p>
          </div>
        )}
      </div>

      <div className="schedule-grid">
        <div className="schedule-header">
          <div className="time-column"></div>
          {days.map(day => (
            <div key={day} className="day-column">{day}</div>
          ))}
        </div>

        {timeSlots.map(timeSlot => (
          <div key={timeSlot} className="schedule-row">
            <div className="time-column">{timeSlot}</div>
            {days.map(day => {
              const cls = getClassForSlot(day, timeSlot);
              return (
                <div
                  key={`${day}-${timeSlot}`}
                  className={`schedule-cell ${cls ? 'occupied' : 'empty'} ${canEdit ? 'editable' : ''}`}
                  onClick={() => handleCellClick(day, timeSlot)}
                >
                  {cls ? (
                    <div className="class-info">
                      <div className="class-subject">{cls.subject}</div>
                      <div className="class-teacher">{cls.teacher}</div>
                      <div className="class-room">📍 {cls.room}</div>
                      {canEdit && <div className="edit-indicator">✏️</div>}
                    </div>
                  ) : canEdit ? (
                    <div className="empty-slot">
                      <span>+ Add Class</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showEditForm && (
        <div className="modal-overlay" onClick={() => setShowEditForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{formData.id ? 'Edit Class' : 'Add Class'}</h3>
              <button className="modal-close" onClick={() => setShowEditForm(false)}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Day</label>
                  <select
                    value={formData.day}
                    onChange={(e) => setFormData({...formData, day: e.target.value})}
                    required
                  >
                    {days.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Time Slot</label>
                  <select
                    value={formData.time_slot}
                    onChange={(e) => setFormData({...formData, time_slot: e.target.value})}
                    required
                  >
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Group</label>
                  <input
                    type="text"
                    value={formData.group_name}
                    onChange={(e) => setFormData({...formData, group_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Teacher</label>
                  <input
                    type="text"
                    value={formData.teacher}
                    onChange={(e) => setFormData({...formData, teacher: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Room</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({...formData, room: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                {formData.id && (
                  <button type="button" className="btn-danger" onClick={handleDelete}>
                    Delete
                  </button>
                )}
                <button type="button" className="btn-secondary" onClick={() => setShowEditForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {formData.id ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Grades
function Grades() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGrades = async () => {
      try {
        const response = await api.getGrades();
        setGrades(response.grades || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadGrades();
  }, []);

  const getGradeColor = (grade) => {
    if (grade >= 90) return '#10b981';
    if (grade >= 80) return '#3b82f6';
    if (grade >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const getLetterGrade = (grade) => {
    if (grade >= 95) return 'A+';
    if (grade >= 90) return 'A';
    if (grade >= 85) return 'A-';
    if (grade >= 80) return 'B+';
    if (grade >= 75) return 'B';
    if (grade >= 70) return 'B-';
    if (grade >= 65) return 'C+';
    if (grade >= 60) return 'C';
    return 'F';
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>📊 Grades</h1>
          <p>Loading your grades...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>📊 Grades</h1>
          <p>Error loading grades: {error}</p>
        </div>
      </div>
    );
  }

  const average = grades.length > 0 ? (grades.reduce((sum, g) => sum + g.grade, 0) / grades.length).toFixed(1) : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>📊 Grades</h1>
          <p>Track your academic performance</p>
        </div>
        <div className="grades-summary">
          <div className="summary-card">
            <div className="summary-value">{average}</div>
            <div className="summary-label">Average Grade</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{grades.length}</div>
            <div className="summary-label">Total Exams</div>
          </div>
        </div>
      </div>

      <div className="grades-table">
        <div className="table-header">
          <div>Course</div>
          <div>Exam</div>
          <div>Grade</div>
          <div>Letter</div>
          <div>Date</div>
        </div>
        {grades.map(grade => (
          <div key={grade.id} className="table-row">
            <div className="course-name">{grade.course_name || 'Unknown Course'}</div>
            <div className="exam-name">{grade.exam_subject || 'Exam'}</div>
            <div className="grade-value" style={{ color: getGradeColor(grade.grade) }}>
              {grade.grade}%
            </div>
            <div className="letter-grade">{getLetterGrade(grade.grade)}</div>
            <div className="grade-date">{new Date(grade.graded_at || Date.now()).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Assignments
function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const response = await api.getAssignments();
        setAssignments(response.assignments || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAssignments();
  }, []);

  const getStatusColor = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return '#ef4444'; // overdue
    if (diffDays <= 1) return '#f59e0b'; // due soon
    return '#10b981'; // ok
  };

  const getStatusText = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due Today';
    if (diffDays === 1) return 'Due Tomorrow';
    return `Due in ${diffDays} days`;
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>📝 Assignments</h1>
          <p>Loading assignments...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>📝 Assignments</h1>
          <p>Error loading assignments: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>📝 Assignments</h1>
        <p>View and submit your assignments</p>
      </div>

      <div className="assignments-list">
        {assignments.length === 0 ? (
          <div className="no-assignments">
            <p>No assignments available</p>
          </div>
        ) : (
          assignments.map(assignment => (
            <div key={assignment.id} className="assignment-card">
              <div className="assignment-header">
                <h3>{assignment.title}</h3>
                <span 
                  className="assignment-status" 
                  style={{ backgroundColor: getStatusColor(assignment.due_date) }}
                >
                  {getStatusText(assignment.due_date)}
                </span>
              </div>

              <p className="assignment-description">{assignment.description}</p>

              <div className="assignment-meta">
                <div className="meta-item">
                  <span className="meta-icon">📅</span>
                  <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-icon">📊</span>
                  <span>Max Grade: {assignment.max_grade || 100}</span>
                </div>
              </div>

              <div className="assignment-actions">
                <button className="btn-submit">Submit Assignment</button>
                <button className="btn-view">View Details</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Messages
function Messages() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const response = await api.getAnnouncements();
        setAnnouncements(response.announcements || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
  }, []);

  const filteredAnnouncements = announcements.filter(ann => 
    filter === 'all' || ann.type === filter
  ).sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const getTypeColor = (type) => {
    switch (type) {
      case 'important': return '#ef4444';
      case 'exam': return '#f59e0b';
      case 'general': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'important': return '⚠️';
      case 'exam': return '📝';
      case 'general': return '📢';
      default: return '💬';
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>💬 Messages</h1>
          <p>Loading announcements...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>💬 Messages</h1>
          <p>Error loading messages: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>💬 Messages</h1>
          <p>Announcements and notifications</p>
        </div>
        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${filter === 'important' ? 'active' : ''}`} 
            onClick={() => setFilter('important')}
          >
            Important
          </button>
          <button 
            className={`filter-btn ${filter === 'exam' ? 'active' : ''}`} 
            onClick={() => setFilter('exam')}
          >
            Exams
          </button>
          <button 
            className={`filter-btn ${filter === 'general' ? 'active' : ''}`} 
            onClick={() => setFilter('general')}
          >
            General
          </button>
        </div>
      </div>

      <div className="messages-list">
        {filteredAnnouncements.length === 0 ? (
          <div className="no-messages">
            <p>No messages available</p>
          </div>
        ) : (
          filteredAnnouncements.map(announcement => (
            <div key={announcement.id} className={`message-card ${announcement.is_pinned ? 'pinned' : ''}`}>
              <div className="message-header">
                <div className="message-type" style={{ backgroundColor: getTypeColor(announcement.type) }}>
                  {getTypeIcon(announcement.type)}
                </div>
                <div className="message-meta">
                  <h3>{announcement.title}</h3>
                  {announcement.is_pinned && <span className="pinned-badge">📌 Pinned</span>}
                </div>
                <div className="message-date">
                  {new Date(announcement.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="message-content">
                {announcement.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// User Management (Admin only)
function UserManagement({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'student',
    student_id: '',
    group_name: '',
    phone: '',
    date_of_birth: '',
    faculty: '',
    major: '',
    year_of_study: '',
    address: '',
    emergency_contact: ''
  });

  useEffect(() => {
    if (user.role === 'admin') {
      loadUsers();
    }
  }, [user.role]);

  const loadUsers = async () => {
    try {
      const response = await api.getUsers();
      setUsers(response.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.createUser(formData);
      setShowCreateForm(false);
      setFormData({
        email: '', password: '', name: '', role: 'student', student_id: '',
        group_name: '', phone: '', date_of_birth: '', faculty: '', major: '',
        year_of_study: '', address: '', emergency_contact: ''
      });
      loadUsers();
    } catch (err) {
      console.error('Failed to create user:', err);
      alert('Failed to create user');
    }
  };

  if (user.role !== 'admin') {
    return (
      <div className="page">
        <div className="page-header">
          <h1>🚫 Access Denied</h1>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>👥 User Management</h1>
          <p>Loading users...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>👥 User Management</h1>
          <p>Manage system users</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
          ➕ Create User
        </button>
      </div>

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New User</h3>
              <button className="modal-close" onClick={() => setShowCreateForm(false)}>×</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    required
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {formData.role === 'student' && (
                  <>
                    <div className="form-group">
                      <label>Student ID</label>
                      <input
                        type="text"
                        value={formData.student_id}
                        onChange={(e) => setFormData({...formData, student_id: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Group</label>
                      <input
                        type="text"
                        value={formData.group_name}
                        onChange={(e) => setFormData({...formData, group_name: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Faculty</label>
                      <input
                        type="text"
                        value={formData.faculty}
                        onChange={(e) => setFormData({...formData, faculty: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Major</label>
                      <input
                        type="text"
                        value={formData.major}
                        onChange={(e) => setFormData({...formData, major: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Year of Study</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={formData.year_of_study}
                        onChange={(e) => setFormData({...formData, year_of_study: e.target.value})}
                      />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="users-table">
        <div className="table-header">
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {users.map(u => (
          <div key={u.id} className="table-row">
            <div className="user-name">{u.name}</div>
            <div className="user-email">{u.email}</div>
            <div className="user-role">{u.role}</div>
            <div className="user-status">
              <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                {u.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="user-actions">
              <button className="btn-text">Edit</button>
              <button className="btn-text">View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.getProfile();
        setProfile(response.user);
        setFormData(response.user);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    try {
      const response = await api.updateProfile(formData);
      setProfile(response.user);
      setEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to update profile');
    }
  };

  const handleCancel = () => {
    setFormData(profile);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>👤 Profile</h1>
          <p>Loading profile...</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>👤 Profile</h1>
          <p>Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>👤 Profile</h1>
          <p>Manage your personal information</p>
        </div>
        {!editing && (
          <button className="btn-primary" onClick={() => setEditing(true)}>
            ✏️ Edit Profile
          </button>
        )}
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar-large">{profile.avatar}</div>
          <h2>{profile.name}</h2>
          <p className="profile-email">{profile.email}</p>
          <p className="profile-role">{profile.role}</p>
        </div>

        <div className="profile-details">
          <div className="detail-section">
            <h3>📋 Basic Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Full Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                ) : (
                  <span>{profile.name}</span>
                )}
              </div>

              <div className="detail-item">
                <label>Email</label>
                <span>{profile.email}</span>
              </div>

              {profile.student_id && (
                <div className="detail-item">
                  <label>Student ID</label>
                  <span>{profile.student_id}</span>
                </div>
              )}

              {profile.group_name && (
                <div className="detail-item">
                  <label>Group</label>
                  <span>{profile.group_name}</span>
                </div>
              )}

              <div className="detail-item">
                <label>Date of Birth</label>
                {editing ? (
                  <input
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                  />
                ) : (
                  <span>{profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not set'}</span>
                )}
              </div>

              <div className="detail-item">
                <label>Phone</label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                ) : (
                  <span>{profile.phone || 'Not set'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>🎓 Academic Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Faculty</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.faculty || ''}
                    onChange={(e) => setFormData({...formData, faculty: e.target.value})}
                  />
                ) : (
                  <span>{profile.faculty || 'Not set'}</span>
                )}
              </div>

              <div className="detail-item">
                <label>Major/Specialty</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.major || ''}
                    onChange={(e) => setFormData({...formData, major: e.target.value})}
                  />
                ) : (
                  <span>{profile.major || 'Not set'}</span>
                )}
              </div>

              <div className="detail-item">
                <label>Year of Study</label>
                {editing ? (
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={formData.year_of_study || ''}
                    onChange={(e) => setFormData({...formData, year_of_study: e.target.value})}
                  />
                ) : (
                  <span>{profile.year_of_study ? `${profile.year_of_study} year` : 'Not set'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>🏠 Contact Information</h3>
            <div className="detail-grid">
              <div className="detail-item full-width">
                <label>Address</label>
                {editing ? (
                  <textarea
                    value={formData.address || ''}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows="3"
                  />
                ) : (
                  <span>{profile.address || 'Not set'}</span>
                )}
              </div>

              <div className="detail-item full-width">
                <label>Emergency Contact</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.emergency_contact || ''}
                    onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                  />
                ) : (
                  <span>{profile.emergency_contact || 'Not set'}</span>
                )}
              </div>
            </div>
          </div>

          {editing && (
            <div className="profile-actions">
              <button className="btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save Changes</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

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
function Sidebar({ activePage, setActivePage, isOpen, onClose, user }) {
  const menuItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'courses', icon: '📚', label: 'Courses' },
    { id: 'schedule', icon: '📅', label: 'Schedule' },
    { id: 'grades', icon: '📊', label: 'Grades' },
    { id: 'assignments', icon: '📝', label: 'Assignments' },
    { id: 'attendance', icon: '📋', label: 'Attendance' },
    { id: 'messages', icon: '💬', label: 'Messages' }
  ];

  // Add admin menu items
  if (user && user.role === 'admin') {
    menuItems.push({ id: 'userManagement', icon: '👥', label: 'User Management' });
  }

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
  const [rememberMe, setRememberMe] = useState(false);

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
      if (rememberMe) {
        localStorage.setItem('token', response.token);
      } else {
        sessionStorage.setItem('token', response.token);
      }
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
                <input 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)} 
                />
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
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
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
      case 'userManagement': return <UserManagement user={user} />;
      default: return <Dashboard user={user} />;
    }
  };

  return (
    <div className="app">
      <Header user={user} onLogout={handleLogout} onToggleSidebar={toggleSidebar} />
      <div className="app-body">
        <Sidebar activePage={activePage} setActivePage={setActivePage} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />
        <main className="main-content">
          {renderPage()}
        </main>
      </div>
      <Footer />
    </div>
  );
}