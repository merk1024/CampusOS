import { useMemo, useState } from 'react';

import StatusBanner from './StatusBanner';

const PAGE_CONTENT = {
  privacy: {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    intro: 'CampusOS stores academic and operational data so students, teachers, and administrators can work from one secure portal.',
    sections: [
      {
        heading: 'What CampusOS collects',
        items: [
          'Profile data such as name, email, student ID, role, group, and subgroup.',
          'Academic records such as attendance, grades, exams, assignments, and course enrollments.',
          'Operational events such as announcements, inbox notifications, and audit trail entries.'
        ]
      },
      {
        heading: 'How CampusOS uses the data',
        items: [
          'To authenticate users and apply the correct role-based access.',
          'To display schedules, grades, attendance, analytics, and operational notices.',
          'To maintain audit history for sensitive academic changes.'
        ]
      },
      {
        heading: 'Protection and retention',
        items: [
          'CampusOS is intended to run with restricted administrative access and environment-based secrets.',
          'Access to student and academic data should remain limited to authorized university roles.',
          'Records are retained according to the institution policy applied to the deployment.'
        ]
      }
    ]
  },
  terms: {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    intro: 'CampusOS is an academic operations platform. Use of the system is limited to approved educational and administrative workflows.',
    sections: [
      {
        heading: 'Acceptable use',
        items: [
          'Use CampusOS only for authorized academic, teaching, and administrative work.',
          'Do not attempt to access another user account or data outside your assigned role.',
          'Do not upload malicious files, false records, or misleading announcements.'
        ]
      },
      {
        heading: 'Role responsibility',
        items: [
          'Students are responsible for reviewing their own schedules, attendance, grades, and announcements.',
          'Teachers are responsible for accurate classroom records, grading actions, and targeted communication.',
          'Administrators are responsible for operational integrity, account management, and policy-aligned access.'
        ]
      },
      {
        heading: 'Service scope',
        items: [
          'CampusOS may integrate with external university systems in read-only or managed workflows.',
          'Features can change as the product evolves from pilot mode to production.',
          'Availability, retention, and support rules depend on the institution operating the deployment.'
        ]
      }
    ]
  },
  support: {
    eyebrow: 'Help',
    title: 'Support',
    intro: 'If something looks wrong in CampusOS, use the fastest route below so the issue reaches the right person quickly.',
    sections: [
      {
        heading: 'When to use support',
        items: [
          'You cannot sign in, your session keeps expiring, or a page shows a server error.',
          'Attendance, grades, or schedule records look incorrect for the current class or student.',
          'You need help understanding who should update a course, account, or announcement.'
        ]
      },
      {
        heading: 'Recommended support path',
        items: [
          'Check Messages first for pinned operational notices and recent announcements.',
          'If the issue is account-related, ask an administrator or superadmin to verify access.',
          'If the issue is academic-record related, verify the course, date, and roster before reporting it.'
        ]
      },
      {
        heading: 'What to include in a report',
        items: [
          'Your role and account email.',
          'The affected page, course, date, or student ID.',
          'A short description of what you expected and what actually happened.'
        ]
      }
    ],
    actions: [
      { id: 'messages', label: 'Open Messages' },
      { id: 'dashboard', label: 'Back to Dashboard' }
    ]
  }
};

const SUPPORT_TRACKS = [
  {
    id: 'login',
    title: 'Login or session problem',
    description: 'Use this when sign-in fails, the session expires too often, or the account is unexpectedly blocked.',
    nextStep: 'Open Messages first, then contact an admin if the issue remains.'
  },
  {
    id: 'schedule',
    title: 'Schedule mismatch',
    description: 'Use this when the class time, room, subject, or assigned student/group does not look correct.',
    nextStep: 'Verify the day, group, and student details before reporting it.'
  },
  {
    id: 'attendance',
    title: 'Attendance issue',
    description: 'Use this when a student status, roster, or attendance summary does not match the class reality.',
    nextStep: 'Include the lesson date, course name, and affected student ID.'
  },
  {
    id: 'grades',
    title: 'Grades or exam issue',
    description: 'Use this when an exam, grade, or score history looks incorrect or is missing.',
    nextStep: 'Include the course, exam title, and expected score or status.'
  }
];

const formatSupportRole = (user) => {
  if (!user) return 'Unknown role';
  if (user.isSuperadmin) return 'Super Admin';
  if (!user.role) return 'Unknown role';
  return String(user.role).charAt(0).toUpperCase() + String(user.role).slice(1);
};

const formatSupportTimestamp = () => (
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date())
);

function InfoCenter({ page = 'privacy', onNavigate, user = null, contextPage = 'dashboard' }) {
  const content = PAGE_CONTENT[page] || PAGE_CONTENT.privacy;
  const [supportNotice, setSupportNotice] = useState('');
  const [supportError, setSupportError] = useState('');
  const supportDetails = useMemo(() => ([
    `CampusOS support details`,
    `Time: ${formatSupportTimestamp()}`,
    `User: ${user?.name || 'Unknown user'}`,
    `Email: ${user?.email || 'No email available'}`,
    `Role: ${formatSupportRole(user)}`,
    `Student ID: ${user?.studentId || user?.student_id || 'N/A'}`,
    `Group: ${user?.group || 'N/A'}`,
    `Subgroup: ${user?.subgroup || 'N/A'}`,
    `Last workspace: ${contextPage || 'dashboard'}`,
    `Current page: ${content.title}`,
    `Browser URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`,
    `Describe the issue:`
  ].join('\n')), [content.title, contextPage, user]);

  const handleCopySupportDetails = async () => {
    try {
      await navigator.clipboard.writeText(supportDetails);
      setSupportError('');
      setSupportNotice('Support details copied. Paste them into Messages or send them to the administrator.');
      window.setTimeout(() => setSupportNotice(''), 2600);
    } catch {
      setSupportNotice('');
      setSupportError('Clipboard access is unavailable in this browser. Copy the details manually from the support card below.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="page-kicker">{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
        </div>
      </div>

      {page === 'support' ? (
        <>
          <StatusBanner tone="error" title="Support action unavailable" message={supportError} />
          <StatusBanner tone="success" title="Support details ready" message={supportNotice} />

          <div className="info-center-grid info-center-grid-support">
            <section className="info-center-card info-center-card-emphasis">
              <h3>Quick support packet</h3>
              <div className="info-center-list">
                <p>Use this packet when you report an issue to an administrator, teacher, or support operator.</p>
              </div>
              <div className="support-meta-grid">
                <div className="support-meta-item">
                  <span>Account</span>
                  <strong>{user?.email || 'No email available'}</strong>
                </div>
                <div className="support-meta-item">
                  <span>Role</span>
                  <strong>{formatSupportRole(user)}</strong>
                </div>
                <div className="support-meta-item">
                  <span>Last workspace</span>
                  <strong>{contextPage || 'dashboard'}</strong>
                </div>
                <div className="support-meta-item">
                  <span>Time</span>
                  <strong>{formatSupportTimestamp()}</strong>
                </div>
              </div>
              <pre className="support-copy-card">{supportDetails}</pre>
              <div className="portal-actions info-center-actions">
                <button type="button" className="btn-primary" onClick={handleCopySupportDetails}>
                  Copy support details
                </button>
                <button type="button" className="btn-secondary" onClick={() => onNavigate?.('messages')}>
                  Open Messages
                </button>
              </div>
            </section>

            <section className="info-center-card">
              <h3>Common issue paths</h3>
              <div className="support-track-list">
                {SUPPORT_TRACKS.map((track) => (
                  <article key={track.id} className="support-track-card">
                    <strong>{track.title}</strong>
                    <p>{track.description}</p>
                    <span>{track.nextStep}</span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </>
      ) : null}

      <div className="info-center-grid">
        {content.sections.map((section) => (
          <section key={section.heading} className="info-center-card">
            <h3>{section.heading}</h3>
            <div className="info-center-list">
              {section.items.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {content.actions?.length ? (
        <div className="portal-actions info-center-actions">
          {content.actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={action.id === 'dashboard' ? 'btn-secondary' : 'btn-primary'}
              onClick={() => onNavigate?.(action.id)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default InfoCenter;
