import { useState, useEffect } from 'react';
import { api } from '../api';

// Schedule
function Schedule() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [, setEditingSlot] = useState(null);
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
  const totalEntries = schedule.length;
  const groupsCount = new Set(schedule.map((item) => item.group_name).filter(Boolean)).size;

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

      <div className="schedule-admin-bar">
        <div className="schedule-admin-card">
          <span className="management-summary-label">Lessons loaded</span>
          <strong>{totalEntries}</strong>
        </div>
        <div className="schedule-admin-card">
          <span className="management-summary-label">Groups</span>
          <strong>{groupsCount}</strong>
        </div>
        <div className="schedule-admin-card schedule-admin-legend">
          <span className="schedule-legend-item"><span className="schedule-dot occupied"></span> Existing class</span>
          <span className="schedule-legend-item"><span className="schedule-dot empty"></span> Empty slot</span>
          {canEdit && <span className="schedule-legend-item"><span className="schedule-dot editable"></span> Click to manage</span>}
        </div>
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
            <div className="schedule-modal-copy">
              <p>Set the group, subject, teacher and room for this slot.</p>
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

export default Schedule;
