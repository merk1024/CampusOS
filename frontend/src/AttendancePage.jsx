import { useState, useEffect } from 'react';
import './AttendancePage.css';
import './AttendancePage.css';

// ══════════════════════════════════════════════════════════
//  MOCK DATA (пока нет backend)
// ══════════════════════════════════════════════════════════
const MOCK_CLASSES = [
  { id: 1, course: 'Programming Language 2', date: '2026-03-17', time: '10:00-11:30', room: 'A101' },
  { id: 2, course: 'Calculus 2', date: '2026-03-17', time: '12:00-13:30', room: 'B202' },
  { id: 3, course: 'Data Structures', date: '2026-03-18', time: '14:00-15:30', room: 'C303' },
];

const MOCK_STUDENTS = [
  { id: 1, name: 'Alice Johnson', studentId: 'STU001' },
  { id: 2, name: 'Bob Smith', studentId: 'STU002' },
  { id: 3, name: 'Charlie Brown', studentId: 'STU003' },
  { id: 4, name: 'Diana Prince', studentId: 'STU004' },
  { id: 5, name: 'Eve Wilson', studentId: 'STU005' },
];

const MOCK_ATTENDANCE = {
  '1_1': 'present', // classId_studentId: status
  '1_2': 'absent',
  '1_3': 'present',
  '1_4': 'late',
  '1_5': 'present',
  '2_1': 'present',
  '2_2': 'present',
  '2_3': 'absent',
  '2_4': 'present',
  '2_5': 'late',
};

// ══════════════════════════════════════════════════════════
//  COMPONENTS
// ══════════════════════════════════════════════════════════

// Teacher View: Mark Attendance
function TeacherAttendance({ user }) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [attendance, setAttendance] = useState({ ...MOCK_ATTENDANCE });

  const markAttendance = (classId, studentId, status) => {
    const key = `${classId}_${studentId}`;
    setAttendance(prev => ({ ...prev, [key]: status }));
  };

  const getStatus = (classId, studentId) => attendance[`${classId}_${studentId}`] || 'unknown';

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return '#10b981';
      case 'absent': return '#ef4444';
      case 'late': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div className="att-teacher">
      <div className="att-header">
        <h2>📋 Mark Attendance</h2>
        <p>Select a class to mark attendance</p>
      </div>

      <div className="att-classes">
        {MOCK_CLASSES.map(cls => (
          <div key={cls.id} className={`att-class-card ${selectedClass === cls.id ? 'active' : ''}`}
            onClick={() => setSelectedClass(cls.id)}>
            <div className="att-class-info">
              <h3>{cls.course}</h3>
              <p>{cls.date} • {cls.time} • Room {cls.room}</p>
            </div>
            <div className="att-class-stats">
              <span>Present: {MOCK_STUDENTS.filter(s => getStatus(cls.id, s.id) === 'present').length}</span>
              <span>Absent: {MOCK_STUDENTS.filter(s => getStatus(cls.id, s.id) === 'absent').length}</span>
            </div>
          </div>
        ))}
      </div>

      {selectedClass && (
        <div className="att-marking">
          <h3>Mark Attendance for {MOCK_CLASSES.find(c => c.id === selectedClass)?.course}</h3>
          <div className="att-students">
            {MOCK_STUDENTS.map(student => {
              const status = getStatus(selectedClass, student.id);
              return (
                <div key={student.id} className="att-student-row">
                  <div className="att-student-info">
                    <span className="att-student-name">{student.name}</span>
                    <span className="att-student-id">{student.studentId}</span>
                  </div>
                  <div className="att-status">
                    <span className="att-status-badge" style={{ background: getStatusColor(status) }}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                  <div className="att-buttons">
                    <button onClick={() => markAttendance(selectedClass, student.id, 'present')}
                      className={status === 'present' ? 'active' : ''}>Present</button>
                    <button onClick={() => markAttendance(selectedClass, student.id, 'absent')}
                      className={status === 'absent' ? 'active' : ''}>Absent</button>
                    <button onClick={() => markAttendance(selectedClass, student.id, 'late')}
                      className={status === 'late' ? 'active' : ''}>Late</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="att-actions">
            <button className="att-save-btn">Save Attendance</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Student View: View Attendance
function StudentAttendance({ user }) {
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });

  useEffect(() => {
    // Calculate stats for current student (mock user.id = 1)
    const studentId = 1; // Mock
    let present = 0, absent = 0, late = 0, total = 0;

    Object.keys(MOCK_ATTENDANCE).forEach(key => {
      const [classId, studId] = key.split('_').map(Number);
      if (studId === studentId) {
        total++;
        const status = MOCK_ATTENDANCE[key];
        if (status === 'present') present++;
        else if (status === 'absent') absent++;
        else if (status === 'late') late++;
      }
    });

    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    setStats({ total, present, absent, late, percentage });
  }, []);

  return (
    <div className="att-student">
      <div className="att-header">
        <h2>📊 My Attendance</h2>
        <p>Track your attendance across all courses</p>
      </div>

      <div className="att-stats">
        <div className="att-stat-card">
          <div className="att-stat-value">{stats.percentage}%</div>
          <div className="att-stat-label">Overall Attendance</div>
        </div>
        <div className="att-stat-card">
          <div className="att-stat-value">{stats.present}</div>
          <div className="att-stat-label">Present</div>
        </div>
        <div className="att-stat-card">
          <div className="att-stat-value">{stats.absent}</div>
          <div className="att-stat-label">Absent</div>
        </div>
        <div className="att-stat-card">
          <div className="att-stat-value">{stats.late}</div>
          <div className="att-stat-label">Late</div>
        </div>
      </div>

      <div className="att-history">
        <h3>Recent Attendance</h3>
        <div className="att-history-list">
          {MOCK_CLASSES.slice(0, 5).map(cls => {
            const status = MOCK_ATTENDANCE[`${cls.id}_1`] || 'unknown'; // Mock student id 1
            return (
              <div key={cls.id} className="att-history-item">
                <div className="att-history-info">
                  <div className="att-history-course">{cls.course}</div>
                  <div className="att-history-date">{cls.date} • {cls.time}</div>
                </div>
                <div className="att-history-status" style={{ color: getStatusColor(status) }}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════
export default function AttendancePage({ user }) {
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <div className="attendance-page">
      {isTeacher ? <TeacherAttendance user={user} /> : <StudentAttendance user={user} />}
    </div>
  );
}

// Helper function
function getStatusColor(status) {
  switch (status) {
    case 'present': return '#10b981';
    case 'absent': return '#ef4444';
    case 'late': return '#f59e0b';
    default: return '#6b7280';
  }
}