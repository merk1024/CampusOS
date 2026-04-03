import { useEffect, useState } from 'react';

import { api } from '../api';
import EmptyState from './EmptyState';
import StatusBanner from './StatusBanner';
import { canManageAcademicRecords, getRoleLabel, hasAdminAccess, isStudentAccount } from '../roles';

function formatLastSeen(value) {
  if (!value) {
    return 'Session details will appear after the next authenticated refresh.';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getRiskSeverityLabel(severity) {
  if (severity === 'critical') return 'Critical';
  if (severity === 'watch') return 'Watch';
  return 'Stable';
}

function Dashboard({ user, onNavigate }) {
  const [riskFlags, setRiskFlags] = useState(null);
  const [loadingRiskFlags, setLoadingRiskFlags] = useState(true);
  const [riskFlagsError, setRiskFlagsError] = useState('');
  const roleLabel = getRoleLabel(user);
  const firstName = user?.name?.split(' ')?.[0] || 'there';
  const displayName = user?.name?.trim() || 'Profile not set';
  const isStudent = isStudentAccount(user);
  const canManage = canManageAcademicRecords(user);
  const isAdmin = hasAdminAccess(user);
  const accountMeta = user?.studentId
    ? `Student ID: ${user.studentId}`
    : user?.email
      ? `Login: ${user.email}`
      : 'Login details are not available yet';
  const groupLabel = user?.group || 'Not set';
  const workspaceMode = isAdmin
    ? 'Administration workspace'
    : canManage
      ? 'Academic operations workspace'
      : 'Student workspace';
  const nextFocus = isAdmin
    ? 'Check user directory, integrations, and academic operations.'
    : canManage
      ? 'Open attendance or exams to continue today’s teaching workflow.'
      : 'Open your schedule, messages, or grades to continue your study flow.';
  const actionCards = isAdmin
    ? [
        { id: 'userManagement', label: 'Manage users', description: 'Create, disable, or restore accounts.', icon: 'USR' },
        { id: 'courses', label: 'Course operations', description: 'Assign teachers and enroll students in bulk.', icon: 'CRS' },
        { id: 'integrations', label: 'Integration center', description: 'Review external snapshots and overrides.', icon: 'INT' },
        { id: 'messages', label: 'Messages', description: 'Publish operational updates and review pinned notices.', icon: 'MSG' }
      ]
    : canManage
      ? [
          { id: 'attendance', label: 'Attendance', description: 'Open the roster and mark today’s sessions faster.', icon: 'ATT' },
          { id: 'exams', label: 'Exams', description: 'Create, duplicate, and adjust academic assessments.', icon: 'EXM' },
          { id: 'assignments', label: 'Assignments', description: 'Publish coursework and follow upcoming deadlines.', icon: 'ASN' },
          { id: 'schedule', label: 'Schedule', description: 'Review linked classes, rooms, and subject timing.', icon: 'SCH' }
        ]
      : [
          { id: 'schedule', label: 'Today’s schedule', description: 'Check current classes and personal timetable updates.', icon: 'SCH' },
          { id: 'grades', label: 'Gradebook', description: 'Review published results and academic progress.', icon: 'GRD' },
          { id: 'assignments', label: 'Assignments', description: 'Open tasks, due dates, and course requirements.', icon: 'ASN' },
          { id: 'messages', label: 'Messages', description: 'Read announcements, exam notices, and updates.', icon: 'MSG' }
        ];
  const statusItems = [
    {
      title: 'Authenticated successfully',
      subtitle: 'Your session is active and the portal is ready to use.',
      badge: 'LIVE'
    },
    {
      title: workspaceMode,
      subtitle: nextFocus,
      badge: roleLabel
    },
    {
      title: 'Account profile',
      subtitle: accountMeta,
      badge: groupLabel
    }
  ];
  const quickNotes = isAdmin
    ? [
        'Use the operations hub in Courses for bulk teacher assignment and roster exports.',
        'Integrations stay read-only unless you explicitly apply an override.',
        'System audit and queue activity are available through the ops endpoints.'
      ]
    : canManage
      ? [
          'Attendance table mode is optimized for fast roster marking.',
          'Exam and assignment flows support duplication for repeated academic structures.',
          'Messages can be published directly to the user inbox flow.'
        ]
      : [
          'Course cards only appear after enrollment or linked academic assignment.',
          'Grades and attendance update as teachers publish live records.',
        'Profile settings help keep your academic identity up to date.'
        ];

  useEffect(() => {
    const loadRiskFlags = async () => {
      try {
        setLoadingRiskFlags(true);
        setRiskFlagsError('');
        const response = await api.getAcademicRiskFlags(undefined, undefined, isStudent ? 4 : 6);
        setRiskFlags(response);
      } catch (requestError) {
        setRiskFlags(null);
        setRiskFlagsError(requestError.message || 'Failed to load academic risk flags.');
      } finally {
        setLoadingRiskFlags(false);
      }
    };

    loadRiskFlags();
  }, [isStudent]);

  const studentRiskSnapshot = riskFlags?.snapshot || null;
  const hasStudentRisk = studentRiskSnapshot && studentRiskSnapshot.severity !== 'ok';
  const riskSummary = riskFlags?.summary || {
    studentsEvaluated: 0,
    flaggedStudents: 0,
    criticalFlags: 0,
    watchFlags: 0
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome back, {firstName}!</h1>
          <p>Your account is ready. Live data will appear here as it is added to the system.</p>
        </div>
      </div>

      <section className="dashboard-hero-card">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow">CampusOS workspace</span>
          <h2>{workspaceMode}</h2>
          <p>{nextFocus}</p>
        </div>
        <div className="dashboard-pill-list" aria-label="Current account summary">
          <span className="dashboard-pill">{roleLabel}</span>
          <span className="dashboard-pill">{groupLabel}</span>
          <span className="dashboard-pill">{user?.studentId ? 'Student identity linked' : 'Email-based identity'}</span>
        </div>
      </section>

      <div className="stats-grid">
        <div className="stat-card" style={{ '--accent': '#8b5cf6' }}>
          <span className="stat-icon">R</span>
          <div className="stat-content">
            <div className="stat-value">{roleLabel}</div>
            <div className="stat-label">Current role</div>
          </div>
        </div>

        <div className="stat-card" style={{ '--accent': '#10b981' }}>
          <span className="stat-icon">@</span>
          <div className="stat-content">
            <div className="stat-value stat-value-name">{displayName}</div>
            <div className="stat-label">Account owner</div>
            <div className="stat-meta">{accountMeta}</div>
          </div>
        </div>

        <div className="stat-card" style={{ '--accent': '#3b82f6' }}>
          <span className="stat-icon">G</span>
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
            {statusItems.map((item) => (
              <div key={item.title} className="activity-item dashboard-status-item">
                <span className="activity-icon">{item.badge}</span>
                <div className="activity-content">
                  <div className="activity-text">{item.title}</div>
                  <div className="activity-time">{item.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="dashboard-action-grid">
            {actionCards.map((action) => (
              <button
                key={action.id}
                type="button"
                className="dashboard-action-card"
                onClick={() => onNavigate?.(action.id)}
              >
                <span className="dashboard-action-icon">{action.icon}</span>
                <div className="dashboard-action-copy">
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <div className="card-header">
            <h3>Session Snapshot</h3>
          </div>
          <div className="dashboard-context-grid">
            <div className="dashboard-context-item">
              <span className="dashboard-context-label">Display name</span>
              <strong>{displayName}</strong>
            </div>
            <div className="dashboard-context-item">
              <span className="dashboard-context-label">Role</span>
              <strong>{roleLabel}</strong>
            </div>
            <div className="dashboard-context-item">
              <span className="dashboard-context-label">Last seen</span>
              <strong>{formatLastSeen(user?.last_login_at || user?.lastLoginAt)}</strong>
            </div>
            <div className="dashboard-context-item">
              <span className="dashboard-context-label">Profile next step</span>
              <strong>{isStudent ? 'Check grades and schedule' : 'Review operational workspace'}</strong>
            </div>
          </div>
        </div>

        <div className="dash-card">
          <div className="card-header">
            <h3>Workspace Notes</h3>
          </div>
          <div className="deadline-list dashboard-note-list">
            {quickNotes.map((item) => (
              <div key={item} className="deadline-item dashboard-note-item">
                <div className="deadline-info">
                  <span className="deadline-title">{item}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <div className="card-header">
            <h3>{isStudent ? 'Academic Health' : 'Academic Risk Flags'}</h3>
          </div>

          <StatusBanner
            tone="error"
            title="Risk flags unavailable"
            message={riskFlagsError}
          />

          {loadingRiskFlags ? (
            <EmptyState
              eyebrow="Academic signals"
              title="Building risk signals"
              description="CampusOS is reviewing attendance and grade patterns to detect possible academic problems."
              compact
              className="dashboard-inline-empty"
            />
          ) : isStudent ? (
            studentRiskSnapshot ? (
              <div className="dashboard-risk-shell">
                <div className={`dashboard-risk-banner ${studentRiskSnapshot.severity}`}>
                  <span className={`dashboard-risk-badge ${studentRiskSnapshot.severity}`}>
                    {getRiskSeverityLabel(studentRiskSnapshot.severity)}
                  </span>
                  <div className="dashboard-risk-metrics">
                    <div className="dashboard-risk-metric">
                      <span>Attendance</span>
                      <strong>{studentRiskSnapshot.attendanceRate}%</strong>
                    </div>
                    <div className="dashboard-risk-metric">
                      <span>Average grade</span>
                      <strong>{studentRiskSnapshot.averageGrade ?? 'No grades'}</strong>
                    </div>
                  </div>
                </div>

                {hasStudentRisk ? (
                  <div className="dashboard-risk-list">
                    {studentRiskSnapshot.reasons.map((reason) => (
                      <div key={reason} className="dashboard-risk-item">
                        <strong>{reason}</strong>
                        <span>
                          Open attendance and grades to review the latest records and speak with your instructor if needed.
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dashboard-risk-clear">
                    <strong>No active academic risk flags</strong>
                    <span>
                      Your recent attendance and grade patterns look stable in CampusOS.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                eyebrow="Academic signals"
                title="No academic records yet"
                description="Risk flags will appear once attendance and grades start coming into your profile."
                compact
                className="dashboard-inline-empty"
              />
            )
          ) : (
            <div className="dashboard-risk-shell">
              <div className="dashboard-risk-summary">
                <div className="dashboard-risk-summary-card">
                  <strong>{riskSummary.flaggedStudents}</strong>
                  <span>Flagged students</span>
                </div>
                <div className="dashboard-risk-summary-card">
                  <strong>{riskSummary.criticalFlags}</strong>
                  <span>Critical</span>
                </div>
                <div className="dashboard-risk-summary-card">
                  <strong>{riskSummary.watchFlags}</strong>
                  <span>Watch</span>
                </div>
                <div className="dashboard-risk-summary-card">
                  <strong>{riskSummary.studentsEvaluated}</strong>
                  <span>Students evaluated</span>
                </div>
              </div>

              {riskFlags?.flags?.length ? (
                <div className="dashboard-risk-list">
                  {riskFlags.flags.slice(0, 4).map((flag) => (
                    <div key={flag.studentId} className="dashboard-risk-item">
                      <div className="dashboard-risk-item-head">
                        <strong>{flag.studentName}</strong>
                        <span className={`dashboard-risk-badge ${flag.severity}`}>
                          {getRiskSeverityLabel(flag.severity)}
                        </span>
                      </div>
                      <span>
                        {flag.studentId}
                        {flag.groupName ? ` | ${flag.groupName}` : ''}
                      </span>
                      <small>
                        Attendance {flag.attendanceRate}% | Average grade {flag.averageGrade ?? 'No grades'}
                      </small>
                      <p>{flag.reasons.join(' | ')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-risk-clear">
                  <strong>No flagged students in the current review window</strong>
                  <span>
                    Attendance and grade signals look stable for the currently evaluated population.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
