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

function InfoCenter({ page = 'privacy', onNavigate }) {
  const content = PAGE_CONTENT[page] || PAGE_CONTENT.privacy;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <span className="page-kicker">{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
        </div>
      </div>

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
