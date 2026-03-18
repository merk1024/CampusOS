import { useState, useEffect } from 'react';
import './AttendancePage.css';
import { api } from './api';

// ══════════════════════════════════════════════════════════
//  MOCK DATA (Заглушки для тестов)
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
  '1_1': 'present', '1_2': 'absent', '1_3': 'present', '1_4': 'late', '1_5': 'present',
};

// ══════════════════════════════════════════════════════════
//  COMPONENTS
// ══════════════════════════════════════════════════════════

// Вид преподавателя
function TeacherAttendance() {
  const [selectedClass, setSelectedClass] = useState(null);
  const [attendance, setAttendance] = useState({ ...MOCK_ATTENDANCE });

  const markAttendance = (classId, studentId, status) => {
    const key = `${classId}_${studentId}`;
    setAttendance(prev => ({ ...prev, [key]: status }));
  };

  const getStatus = (classId, studentId) => attendance[`${classId}_${studentId}`] || 'unknown';

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
          </div>
        ))}
      </div>

      {selectedClass && (
        <div className="att-marking">
          <h3>Marking: {MOCK_CLASSES.find(c => c.id === selectedClass)?.course}</h3>
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
                      {status.toUpperCase()}
                    </span>
                  </div>
                  <div className="att-buttons">
                    <button onClick={() => markAttendance(selectedClass, student.id, 'present')} className={status === 'present' ? 'active' : ''}>P</button>
                    <button onClick={() => markAttendance(selectedClass, student.id, 'absent')} className={status === 'absent' ? 'active' : ''}>A</button>
                    <button onClick={() => markAttendance(selectedClass, student.id, 'late')} className={status === 'late' ? 'active' : ''}>L</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Вид студента
function StudentAttendance({ user }) {
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const updateStats = (data) => {
      setAttendance(data);
      const total = data.length;
      const present = data.filter(a => a.status === 'present').length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      setStats({ total, present, absent: data.filter(a => a.status === 'absent').length, late: data.filter(a => a.status === 'late').length, percentage });
    };

    const loadAttendance = async () => {
      try {
        setLoading(true);
        // Пытаемся получить данные с бэкенда
        const response = await api.getStudentAttendance(user.studentId);
        const data = response.attendance || [];
        updateStats(data);
      } catch {
        // Если NetworkError (сервер лежит) — грузим моки, чтобы страница не ломалась
        console.warn("Backend unavailable, loading offline mode.");
        const fallbackData = [
            { schedule_id: 'PRG101', date: '2026-03-17', status: 'present' },
            { schedule_id: 'CALC2', date: '2026-03-17', status: 'late' }
        ];
        updateStats(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    if (user?.studentId) loadAttendance();
  }, [user]);

  if (loading) return <div className="loading-spinner">Loading...</div>;

  return (
    <div className="att-student">
      <div className="att-header">
        <h2>📊 My Attendance ({stats.percentage}%)</h2>
      </div>
      <div className="att-history-list">
        {attendance.map((att, i) => (
          <div key={i} className="att-history-item">
            <span>{att.date} - {att.schedule_id}</span>
            <span style={{ color: getStatusColor(att.status) }}>{att.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN & HELPERS
// ══════════════════════════════════════════════════════════
export default function AttendancePage({ user }) {
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  return (
    <div className="attendance-page">
      {isTeacher ? <TeacherAttendance user={user} /> : <StudentAttendance user={user} />}
    </div>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'present': return '#10b981';
    case 'absent': return '#ef4444';
    case 'late': return '#f59e0b';
    default: return '#6b7280';
  }
}
