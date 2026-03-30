import { useEffect, useState } from 'react';

import './AttendancePage.css';
import { api } from './api';
import EmptyState from './components/EmptyState';
import StatusBanner from './components/StatusBanner';
import { canManageAcademicRecords, hasAdminAccess } from './roles';

const ATTENDANCE_UI_KEY = 'attendance_ui_preferences';
const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
  { value: 'absent', label: 'Absent' }
];
const STATUS_SHORTCUTS = {
  present: 'P',
  late: 'L',
  excused: 'E',
  absent: 'A'
};

const STATUS_LABELS = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
  unmarked: 'Unmarked'
};

const EMPTY_SUMMARY = {
  total: 0,
  present: 0,
  absent: 0,
  late: 0,
  excused: 0,
  marked: 0,
  unmarked: 0
};

const readAttendancePreferences = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(ATTENDANCE_UI_KEY));
    return {
      compactMode: Boolean(stored?.compactMode),
      rosterFilter: stored?.rosterFilter || 'all',
      layoutMode: stored?.layoutMode === 'table' ? 'table' : 'cards'
    };
  } catch {
    return {
      compactMode: false,
      rosterFilter: 'all',
      layoutMode: 'cards'
    };
  }
};

const writeAttendancePreferences = (patch) => {
  const nextValue = {
    ...readAttendancePreferences(),
    ...patch
  };
  localStorage.setItem(ATTENDANCE_UI_KEY, JSON.stringify(nextValue));
  return nextValue;
};

const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  if (!value) return 'No date';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
};

const buildDraftSummary = (students, draftStatuses) => {
  const summary = { ...EMPTY_SUMMARY, total: students.length };

  students.forEach((student) => {
    const status = draftStatuses[student.student_id];
    if (!status) {
      summary.unmarked += 1;
      return;
    }

    summary.marked += 1;
    summary[status] += 1;
  });

  return summary;
};

const getStudentStats = (records) => {
  const stats = {
    total: records.length,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0
  };

  records.forEach((record) => {
    if (stats[record.status] !== undefined) {
      stats[record.status] += 1;
    }
  });

  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + stats.late + stats.excused) / stats.total) * 100)
    : 0;

  return { ...stats, attendanceRate };
};

function StatusBadge({ status }) {
  const normalizedStatus = status || 'unmarked';
  return (
    <span className={`att-status-badge ${normalizedStatus}`}>
      {STATUS_LABELS[normalizedStatus] || STATUS_LABELS.unmarked}
    </span>
  );
}

function AttendanceQuickStatusButtons({ value, onChange, compact = false }) {
  return (
    <div className={`att-status-matrix ${compact ? 'compact' : ''}`}>
      {STATUS_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`att-status-quick ${value === option.value ? 'active' : ''} ${option.value}`}
          onClick={() => onChange(option.value)}
          title={option.label}
        >
          {STATUS_SHORTCUTS[option.value]}
        </button>
      ))}
      <button
        type="button"
        className={`att-status-quick clear ${!value ? 'active' : ''}`}
        onClick={() => onChange('')}
        title="Clear draft status"
      >
        Clear
      </button>
    </div>
  );
}

function AttendanceSummary({ summary }) {
  const cards = [
    { label: 'Marked', value: summary.marked },
    { label: 'Present', value: summary.present },
    { label: 'Late', value: summary.late },
    { label: 'Excused', value: summary.excused },
    { label: 'Absent', value: summary.absent },
    { label: 'Pending', value: summary.unmarked }
  ];

  return (
    <div className="att-summary-grid">
      {cards.map((card) => (
        <div key={card.label} className="att-summary-card">
          <strong>{card.value}</strong>
          <span>{card.label}</span>
        </div>
      ))}
    </div>
  );
}

function TeacherAttendance({ user }) {
  const initialPreferences = readAttendancePreferences();
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [draftStatuses, setDraftStatuses] = useState({});
  const [savedSummary, setSavedSummary] = useState(EMPTY_SUMMARY);
  const [search, setSearch] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [compactMode, setCompactMode] = useState(initialPreferences.compactMode);
  const [rosterFilter, setRosterFilter] = useState(initialPreferences.rosterFilter);
  const [layoutMode, setLayoutMode] = useState(initialPreferences.layoutMode);

  useEffect(() => {
    writeAttendancePreferences({ compactMode });
  }, [compactMode]);

  useEffect(() => {
    writeAttendancePreferences({ rosterFilter });
  }, [rosterFilter]);

  useEffect(() => {
    writeAttendancePreferences({ layoutMode });
  }, [layoutMode]);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoadingSessions(true);
        setError('');
        setNotice('');

        const response = await api.getAttendanceSessions(selectedDate);
        const nextSessions = response.sessions || [];
        setSessions(nextSessions);
        setSelectedSessionId((current) => (
          nextSessions.some((session) => String(session.id) === String(current))
            ? current
            : (nextSessions[0]?.id ?? null)
        ));
      } catch (requestError) {
        setError(requestError.message || 'Failed to load attendance sessions');
        setSessions([]);
        setSelectedSessionId(null);
      } finally {
        setLoadingSessions(false);
      }
    };

    loadSessions();
  }, [selectedDate]);

  useEffect(() => {
    const loadRoster = async () => {
      if (!selectedSessionId) {
        setSelectedSession(null);
        setStudents([]);
        setDraftStatuses({});
        setSavedSummary(EMPTY_SUMMARY);
        return;
      }

      try {
        setLoadingRoster(true);
        setError('');

        const response = await api.getAttendanceSession(selectedSessionId, selectedDate);
        const nextStudents = response.students || [];

        setSelectedSession(response.session || null);
        setStudents(nextStudents);
        setSavedSummary(response.summary || EMPTY_SUMMARY);
        setDraftStatuses(
          Object.fromEntries(nextStudents.map((student) => [student.student_id, student.status || '']))
        );
      } catch (requestError) {
        setError(requestError.message || 'Failed to load attendance roster');
        setSelectedSession(null);
        setStudents([]);
        setDraftStatuses({});
        setSavedSummary(EMPTY_SUMMARY);
      } finally {
        setLoadingRoster(false);
      }
    };

    loadRoster();
  }, [selectedDate, selectedSessionId]);

  const filteredStudents = students.filter((student) => {
    const haystack = [
      student.name,
      student.student_id,
      student.group_name,
      student.subgroup_name
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = haystack.includes(search.trim().toLowerCase());
    const currentStatus = draftStatuses[student.student_id] || 'unmarked';
    const matchesFilter = rosterFilter === 'all' || currentStatus === rosterFilter;

    return matchesSearch && matchesFilter;
  });

  const draftSummary = buildDraftSummary(students, draftStatuses);
  const isAdmin = hasAdminAccess(user);
  const hasRosterFilters = rosterFilter !== 'all' || search.trim() !== '';
  const setStudentDraftStatus = (studentId, status) => {
    setDraftStatuses((current) => ({
      ...current,
      [studentId]: status
    }));
  };

  const applyStatusToVisible = (status) => {
    setDraftStatuses((current) => ({
      ...current,
      ...Object.fromEntries(filteredStudents.map((student) => [student.student_id, status]))
    }));
  };

  const resetDraftToSaved = () => {
    setDraftStatuses(
      Object.fromEntries(students.map((student) => [student.student_id, student.status || '']))
    );
  };

  const handleSave = async () => {
    const records = students
      .map((student) => ({
        studentId: student.student_id,
        status: draftStatuses[student.student_id]
      }))
      .filter((record) => record.studentId && record.status);

    if (records.length === 0) {
      setError('Choose at least one attendance status before saving.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setNotice('');

      const response = await api.saveAttendanceBatch(selectedSessionId, selectedDate, records);
      const nextStudents = response.students || [];

      setStudents(nextStudents);
      setSavedSummary(response.summary || EMPTY_SUMMARY);
      setDraftStatuses(
        Object.fromEntries(nextStudents.map((student) => [student.student_id, student.status || '']))
      );
      setNotice(`Attendance saved for ${records.length} student${records.length === 1 ? '' : 's'}.`);

      const sessionsResponse = await api.getAttendanceSessions(selectedDate);
      setSessions(sessionsResponse.sessions || []);
    } catch (requestError) {
      setError(requestError.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="att-shell">
      <div className="att-header">
        <div>
          <h2>Attendance Management</h2>
          <p>
            {isAdmin
              ? 'Review any scheduled class, open the roster, and save attendance for the selected date.'
              : 'Open your scheduled classes, mark student attendance, and keep the daily roster up to date.'}
          </p>
        </div>
        <div className="att-date-card">
          <label htmlFor="attendance-date">Attendance date</label>
          <input
            id="attendance-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
          <span>{formatDate(selectedDate)}</span>
        </div>
      </div>

      <StatusBanner tone="error" title="Attendance could not be updated" message={error} />
      <StatusBanner tone="success" title="Attendance updated" message={notice} />

      <div className="att-management-grid">
        <section className="att-panel att-session-panel">
          <div className="att-panel-head">
            <h3>Scheduled classes</h3>
            <span>{sessions.length} found</span>
          </div>

          {loadingSessions ? (
            <EmptyState
              eyebrow="Attendance"
              title="Loading scheduled classes"
              description="Checking which sessions are available for the selected date."
              compact
              className="att-inline-empty"
            />
          ) : sessions.length === 0 ? (
            <EmptyState
              eyebrow="Attendance"
              title="No scheduled classes for this date"
              description="Pick another date or add schedule entries first, then attendance management will appear here."
              compact
              className="att-inline-empty"
            />
          ) : (
            <div className="att-session-list">
              {sessions.map((session) => {
                const isActive = String(session.id) === String(selectedSessionId);
                return (
                  <button
                    key={session.id}
                    type="button"
                    className={`att-session-card ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <div className="att-session-main">
                      <strong>{session.course_name || session.subject}</strong>
                      <span>{session.day} | {session.time_slot}</span>
                    </div>
                    <div className="att-session-meta">
                      <span>{session.group_name}</span>
                      {session.subgroup_name ? <span>{session.subgroup_name}</span> : null}
                      {session.room ? <span>{session.room}</span> : null}
                    </div>
                    <div className="att-session-footer">
                      <span className={`att-session-mark ${Number(session.marked_count) > 0 ? 'done' : ''}`}>
                        {Number(session.marked_count) > 0 ? 'Has records' : 'Unmarked'}
                      </span>
                      <small>{session.marked_count || 0} marked</small>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className={`att-panel att-roster-panel ${compactMode ? 'compact' : ''}`}>
          {!selectedSessionId ? (
            <EmptyState
              eyebrow="Roster"
              title="Choose a class to open its roster"
              description="Select one scheduled class from the left panel to start marking attendance."
              compact
              className="att-inline-empty"
            />
          ) : loadingRoster ? (
            <EmptyState
              eyebrow="Roster"
              title="Loading roster"
              description="Preparing the student list and the saved attendance snapshot for this class."
              compact
              className="att-inline-empty"
            />
          ) : (
            <>
              <div className="att-panel-head att-roster-head">
                <div>
                  <h3>{selectedSession?.course_name || selectedSession?.subject || 'Roster'}</h3>
                  <p>
                    {selectedSession?.day} | {selectedSession?.time_slot}
                    {selectedSession?.room ? ` | ${selectedSession.room}` : ''}
                  </p>
                </div>
                <div className="att-roster-tags">
                  <span>{selectedSession?.group_name || 'No group'}</span>
                  {selectedSession?.subgroup_name ? <span>{selectedSession.subgroup_name}</span> : null}
                </div>
              </div>

              <AttendanceSummary summary={draftSummary} />

              <div className="att-toolbar">
                <div className="att-toolbar-main">
                  <label className="att-search">
                    <span>Search student</span>
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Name, student ID, group"
                    />
                  </label>

                  <label className="att-filter">
                    <span>Show rows</span>
                    <select value={rosterFilter} onChange={(event) => setRosterFilter(event.target.value)}>
                      <option value="all">All rows</option>
                      <option value="unmarked">Only pending</option>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="att-quick-actions">
                  {STATUS_OPTIONS.map((option) => (
                    <button key={option.value} type="button" onClick={() => applyStatusToVisible(option.value)}>
                      Visible {option.label.toLowerCase()}
                    </button>
                  ))}
                  <button type="button" onClick={() => applyStatusToVisible('')}>Clear visible</button>
                  <button type="button" onClick={() => setCompactMode((value) => !value)}>
                    {compactMode ? 'Comfort view' : 'Compact view'}
                  </button>
                  <div className="att-layout-switch" role="tablist" aria-label="Attendance layout">
                    <button
                      type="button"
                      className={layoutMode === 'cards' ? 'active' : ''}
                      onClick={() => setLayoutMode('cards')}
                    >
                      Cards
                    </button>
                    <button
                      type="button"
                      className={layoutMode === 'table' ? 'active' : ''}
                      onClick={() => setLayoutMode('table')}
                    >
                      Table
                    </button>
                  </div>
                  <button type="button" onClick={resetDraftToSaved}>Reset</button>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <EmptyState
                  eyebrow="Roster"
                  title="No students match the current filter"
                  description={hasRosterFilters ? 'Clear the search or row filter to reopen the full roster.' : 'The selected class does not currently have students in its roster.'}
                  actionLabel={hasRosterFilters ? 'Clear filters' : ''}
                  onAction={() => {
                    setSearch('');
                    setRosterFilter('all');
                  }}
                  compact
                  className="att-inline-empty"
                />
              ) : (
                <div className="att-roster-scroll">
                  <div className="att-roster-meta">
                    <span>Showing {filteredStudents.length} of {students.length} students</span>
                    <span>{layoutMode === 'table' ? 'Table mode is optimized for quick roster marking' : 'Only the roster scrolls, not the save action'}</span>
                  </div>
                  {layoutMode === 'table' ? (
                    <div className="att-roster-table-shell">
                      <table className="att-roster-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Saved</th>
                            <th>Draft</th>
                            <th>Quick set</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.map((student) => {
                            const draftValue = draftStatuses[student.student_id] || '';

                            return (
                              <tr key={student.student_id}>
                                <td>
                                  <div className="att-table-student">
                                    <strong>{student.name}</strong>
                                    <span>
                                      {student.student_id}
                                      {student.group_name ? ` | ${student.group_name}` : ''}
                                      {student.subgroup_name ? ` | ${student.subgroup_name}` : ''}
                                    </span>
                                  </div>
                                </td>
                                <td><StatusBadge status={student.status} /></td>
                                <td><StatusBadge status={draftValue || 'unmarked'} /></td>
                                <td>
                                  <AttendanceQuickStatusButtons
                                    compact
                                    value={draftValue}
                                    onChange={(status) => setStudentDraftStatus(student.student_id, status)}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="att-roster-list">
                      {filteredStudents.map((student) => (
                        <article key={student.student_id} className="att-student-row">
                          <div className="att-student-info">
                            <strong>{student.name}</strong>
                            <span>
                              {student.student_id}
                              {student.group_name ? ` | ${student.group_name}` : ''}
                              {student.subgroup_name ? ` | ${student.subgroup_name}` : ''}
                            </span>
                          </div>

                          <div className="att-student-current">
                            <small>Saved</small>
                            <StatusBadge status={student.status} />
                          </div>

                          <div className="att-status-select">
                            <span>Set status</span>
                            <AttendanceQuickStatusButtons
                              value={draftStatuses[student.student_id] || ''}
                              onChange={(status) => setStudentDraftStatus(student.student_id, status)}
                            />
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="att-actions att-actions-sticky">
                <div className="att-save-hint">
                  Saved: {savedSummary.marked} of {savedSummary.total} | Visible now: {filteredStudents.length}
                </div>
                <button
                  type="button"
                  className="att-save-btn"
                  onClick={handleSave}
                  disabled={saving || students.length === 0}
                >
                  {saving ? 'Saving...' : 'Save attendance'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function StudentAttendance({ user }) {
  const [attendance, setAttendance] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAttendance = async () => {
      const studentId = user?.studentId || user?.student_id;

      if (!studentId) {
        setError('Student ID is missing for this account.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await api.getStudentAttendance(studentId);
        setAttendance(response.attendance || []);
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
      <div className="att-shell">
        <div className="att-header">
          <div>
            <h2>Attendance</h2>
            <p>CampusOS could not load the attendance history for this account.</p>
          </div>
        </div>
        <StatusBanner tone="error" title="Attendance unavailable" message={error} />
      </div>
    );
  }

  const stats = getStudentStats(attendance);
  const hasHistoryFilter = statusFilter !== 'all';
  const filteredAttendance = attendance.filter((record) => (
    statusFilter === 'all' || record.status === statusFilter
  ));

  return (
    <div className="att-shell">
      <div className="att-header">
        <div>
          <h2>My Attendance</h2>
          <p>Keep track of your class presence, late arrivals, excused classes, and missed lessons.</p>
        </div>
        <div className="att-rate-card">
          <strong>{stats.attendanceRate}%</strong>
          <span>Attendance rate</span>
        </div>
      </div>

      <div className="att-summary-grid">
        <div className="att-summary-card"><strong>{stats.total}</strong><span>Total records</span></div>
        <div className="att-summary-card"><strong>{stats.present}</strong><span>Present</span></div>
        <div className="att-summary-card"><strong>{stats.late}</strong><span>Late</span></div>
        <div className="att-summary-card"><strong>{stats.excused}</strong><span>Excused</span></div>
        <div className="att-summary-card"><strong>{stats.absent}</strong><span>Absent</span></div>
      </div>

      <section className="att-panel">
        <div className="att-panel-head">
          <h3>Attendance history</h3>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {filteredAttendance.length === 0 ? (
          <EmptyState
            eyebrow="Attendance history"
            title="No records match the current filter"
            description={hasHistoryFilter ? 'Reset the status filter to reopen the full attendance history.' : 'Attendance records will appear here after teachers start marking your classes.'}
            actionLabel={hasHistoryFilter ? 'Reset filter' : ''}
            onAction={() => setStatusFilter('all')}
            compact
            className="att-inline-empty"
          />
        ) : (
          <div className="att-history-list">
            {filteredAttendance.map((item) => (
              <article key={`${item.schedule_id}-${item.date}`} className="att-history-card">
                <div className="att-history-main">
                  <strong>{item.course_name || item.subject || 'Class session'}</strong>
                  <span>
                    {formatDate(item.date)}
                    {item.day ? ` | ${item.day}` : ''}
                    {item.time_slot ? ` | ${item.time_slot}` : ''}
                  </span>
                </div>
                <div className="att-history-meta">
                  {item.room ? <span>{item.room}</span> : <span>No room</span>}
                  {item.marked_by_name ? <span>Marked by {item.marked_by_name}</span> : null}
                </div>
                <StatusBadge status={item.status} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AttendancePage({ user }) {
  const isTeacher = canManageAcademicRecords(user);

  return (
    <div className="attendance-page">
      {isTeacher ? <TeacherAttendance user={user} /> : <StudentAttendance user={user} />}
    </div>
  );
}
