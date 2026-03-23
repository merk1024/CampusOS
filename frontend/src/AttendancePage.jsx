import { useEffect, useState } from 'react';

import './AttendancePage.css';
import { api } from './api';
import { canManageAcademicRecords } from './roles';

function getStatusColor(status) {
  switch (status) {
    case 'present':
      return '#10b981';
    case 'absent':
      return '#ef4444';
    case 'late':
      return '#f59e0b';
    case 'excused':
      return '#6366f1';
    default:
      return '#6b7280';
  }
}

function TeacherAttendance() {
  return (
    <div className="att-teacher">
      <div className="att-header">
        <h2>Attendance Management</h2>
        <p>
          Attendance for teachers and admins is available through the backend API, but this page no
          longer ships with mock classes or mock students.
        </p>
      </div>
    </div>
  );
}

function StudentAttendance({ user }) {
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const updateStats = (data) => {
      setAttendance(data);

      const total = data.length;
      const present = data.filter((item) => item.status === 'present').length;
      const absent = data.filter((item) => item.status === 'absent').length;
      const late = data.filter((item) => item.status === 'late').length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      setStats({ total, present, absent, late, percentage });
    };

    const loadAttendance = async () => {
      if (!user?.studentId) {
        setError('Student ID is missing for this account.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await api.getStudentAttendance(user.studentId);
        updateStats(response.attendance || []);
      } catch (requestError) {
        setError(requestError.message || 'Failed to load attendance');
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [user]);

  if (loading) {
    return <div className="loading-spinner">Loading...</div>;
  }

  if (error) {
    return (
      <div className="att-student">
        <div className="att-header">
          <h2>Attendance</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  

  return (
    <div className="att-student">
      <div className="att-header">
        <h2>My Attendance ({stats.percentage}%)</h2>
        <p>
          Present: {stats.present} · Absent: {stats.absent} · Late: {stats.late} · Total: {stats.total}
        </p>
      </div>

      <div className="att-history-list">
        {attendance.length === 0 ? (
          <div className="att-history-item">
            <span>No attendance records yet.</span>
          </div>
        ) : (
          attendance.map((item) => (
            <div key={`${item.schedule_id}-${item.date}`} className="att-history-item">
              <span>{item.date} - {item.schedule_id}</span>
              <span style={{ color: getStatusColor(item.status) }}>{item.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AttendancePage({ user }) {
  const isTeacher = canManageAcademicRecords(user);

  return (
    <div className="attendance-page">
      {isTeacher ? <TeacherAttendance /> : <StudentAttendance user={user} />}
    </div>
  );
}
