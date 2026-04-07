import { useMemo, useState } from 'react';

import StatusBanner from './StatusBanner';
import { getRoleLabel } from '../roles';

const INFO_CENTER_COPY = {
  English: {
    roleUnknown: 'Unknown role',
    copiedTitle: 'Support details ready',
    copiedMessage: 'Support details copied. Paste them into Messages or send them to the administrator.',
    copyErrorTitle: 'Support action unavailable',
    copyErrorMessage: 'Clipboard access is unavailable in this browser. Copy the details manually from the support card below.',
    supportPacketTitle: 'Quick support packet',
    supportPacketBody: 'Use this packet when you report an issue to an administrator, teacher, or support operator.',
    supportAccount: 'Account',
    supportRole: 'Role',
    supportWorkspace: 'Last workspace',
    supportTime: 'Time',
    supportCopyButton: 'Copy support details',
    supportOpenMessages: 'Open Messages',
    supportTrackTitle: 'Common issue paths',
    supportDetailsTitle: 'CampusOS support details',
    supportDetailsUser: 'User',
    supportDetailsEmail: 'Email',
    supportDetailsRole: 'Role',
    supportDetailsStudent: 'Student ID',
    supportDetailsGroup: 'Group',
    supportDetailsSubgroup: 'Subgroup',
    supportDetailsWorkspace: 'Last workspace',
    supportDetailsPage: 'Current page',
    supportDetailsUrl: 'Browser URL',
    supportDetailsPrompt: 'Describe the issue:',
    notAvailable: 'Not available',
    dashboardLabel: 'Dashboard',
    pages: {
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
    },
    supportTracks: [
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
    ]
  },
  Kyrgyz: {
    roleUnknown: 'Белгисиз роль',
    copiedTitle: 'Колдоо үчүн маалымат даяр',
    copiedMessage: 'Колдоо маалыматтары көчүрүлдү. Аларды Messages бөлүмүнө чаптап же администраторго жөнөтүңүз.',
    copyErrorTitle: 'Колдоо аракети жеткиликсиз',
    copyErrorMessage: 'Бул браузерде clipboard жеткиликсиз. Төмөнкү картанын ичиндеги маалыматты кол менен көчүрүңүз.',
    supportPacketTitle: 'Тез колдоо пакети',
    supportPacketBody: 'Бул пакетти администраторго, окутуучуга же колдоо операторуна кайрылганда колдонуңуз.',
    supportAccount: 'Аккаунт',
    supportRole: 'Роль',
    supportWorkspace: 'Акыркы иш мейкиндиги',
    supportTime: 'Убакыт',
    supportCopyButton: 'Колдоо маалыматтарын көчүрүү',
    supportOpenMessages: 'Messages ачуу',
    supportTrackTitle: 'Көп кездешкен көйгөйлөр',
    supportDetailsTitle: 'CampusOS колдоо маалыматы',
    supportDetailsUser: 'Колдонуучу',
    supportDetailsEmail: 'Email',
    supportDetailsRole: 'Роль',
    supportDetailsStudent: 'Студент ID',
    supportDetailsGroup: 'Топ',
    supportDetailsSubgroup: 'Подгруппа',
    supportDetailsWorkspace: 'Акыркы иш мейкиндиги',
    supportDetailsPage: 'Учурдагы бет',
    supportDetailsUrl: 'Браузер URL',
    supportDetailsPrompt: 'Көйгөйдү сүрөттөп бериңиз:',
    notAvailable: 'Жеткиликтүү эмес',
    dashboardLabel: 'Башкы бет',
    pages: {
      privacy: {
        eyebrow: 'Укуктук маалымат',
        title: 'Купуялык саясаты',
        intro: 'CampusOS студенттерге, окутуучуларга жана администрацияга бир коопсуз порталдан иштөө үчүн академиялык жана операциялык маалыматтарды сактайт.',
        sections: [
          {
            heading: 'CampusOS эмне чогултат',
            items: [
              'Аты-жөнү, email, студент ID, роль, топ жана подгруппа сыяктуу профиль маалыматтары.',
              'Катышуу, баалар, экзамендер, тапшырмалар жана курс жазылуулары сыяктуу академиялык маалыматтар.',
              'Жарыялар, inbox эскертмелери жана audit trail жазуулары сыяктуу операциялык окуялар.'
            ]
          },
          {
            heading: 'Маалымат кантип колдонулат',
            items: [
              'Колдонуучуну тастыктоо жана туура роль боюнча жеткиликтүүлүктү берүү үчүн.',
              'Жадыбал, баалар, катышуу, аналитика жана операциялык эскертмелерди көрсөтүү үчүн.',
              'Сезимтал академиялык өзгөрүүлөр үчүн audit тарыхын сактоо үчүн.'
            ]
          },
          {
            heading: 'Коргоо жана сактоо',
            items: [
              'CampusOS чектелген административдик жеткиликтүүлүк жана environment сырлары менен иштеши керек.',
              'Студенттик жана академиялык маалыматтарга жетүү университеттеги ыйгарым укуктуу ролдор менен чектелиши керек.',
              'Маалыматтарды сактоо мөөнөтү мекеменин саясатына жараша аныкталат.'
            ]
          }
        ]
      },
      terms: {
        eyebrow: 'Укуктук маалымат',
        title: 'Колдонуу шарттары',
        intro: 'CampusOS академиялык операциялар платформасы. Системаны колдонуу бекитилген окуу жана административдик сценарийлер менен чектелет.',
        sections: [
          {
            heading: 'Уруксат берилген колдонуу',
            items: [
              'CampusOSту академиялык, окутуу жана администрациялык иштер үчүн гана колдонуңуз.',
              'Өз ролуңуздан тышкаркы аккаунтка же маалыматка кирүүгө аракет кылбаңыз.',
              'Зыяндуу файлдарды, жалган жазууларды же адаштырган жарыяларды жүктөбөңүз.'
            ]
          },
          {
            heading: 'Ролдордун жоопкерчилиги',
            items: [
              'Студенттер өздөрүнүн жадыбалын, катышуусун, бааларын жана жарыяларын көзөмөлдөөгө жооптуу.',
              'Окутуучулар так класстык жазуулар, баалоо аракеттери жана максаттуу байланыш үчүн жооптуу.',
              'Администраторлор операциялык туруктуулук, аккаунт башкаруу жана саясатка шайкеш жеткиликтүүлүк үчүн жооптуу.'
            ]
          },
          {
            heading: 'Кызматтын чеги',
            items: [
              'CampusOS тышкы университеттик системалар менен read-only же башкарылган сценарийлерде интеграциялана алат.',
              'Пилоттон production баскычына өткөн сайын функциялар өзгөрүшү мүмкүн.',
              'Жеткиликтүүлүк, сактоо жана колдоо эрежелери платформаны иштеткен мекемеге жараша болот.'
            ]
          }
        ]
      },
      support: {
        eyebrow: 'Жардам',
        title: 'Колдоо',
        intro: 'Эгер CampusOSто бир нерсе туура эмес көрүнсө, көйгөй туура адамга тез жетиши үчүн төмөнкү жолду колдонуңуз.',
        sections: [
          {
            heading: 'Качан колдоого кайрылуу керек',
            items: [
              'Сиз кире албай жатсаңыз, сессия бат-бат үзүлсө же бетте server error чыкса.',
              'Катышуу, баа же жадыбал жазуусу белгилүү класска же студентке туура келбесе.',
              'Курсту, аккаунтту же жарыяны ким жаңыртышы керек экенин түшүнүүдө жардам керек болсо.'
            ]
          },
          {
            heading: 'Сунушталган колдоо жолу',
            items: [
              'Адегенде Messages бөлүмүнөн pinned эскертмелерди жана жаңы жарыяларды текшериңиз.',
              'Эгер көйгөй аккаунтка байланыштуу болсо, администратор же superadmin жеткиликтүүлүктү текшерсин.',
              'Эгер көйгөй академиялык жазууларга байланыштуу болсо, кайрылуудан мурда курс, дата жана roster туура экенин текшериңиз.'
            ]
          },
          {
            heading: 'Кайрылууда эмнени кошуу керек',
            items: [
              'Ролуңуз жана аккаунт email.',
              'Таасирленген бет, курс, дата же студент ID.',
              'Сиз эмнени күткөнүңүз жана чындап эмне болгону тууралуу кыскача түшүндүрмө.'
            ]
          }
        ],
        actions: [
          { id: 'messages', label: 'Messages ачуу' },
          { id: 'dashboard', label: 'Башкы бетке кайтуу' }
        ]
      }
    },
    supportTracks: [
      {
        id: 'login',
        title: 'Кирүү же сессия көйгөйү',
        description: 'Кирүү болбой жатса, сессия бат үзүлсө же аккаунт күтүүсүз бөгөттөлсө ушул жолду колдонуңуз.',
        nextStep: 'Адегенде Messages бөлүмүн ачыңыз, андан кийин көйгөй калса администраторго кайрылыңыз.'
      },
      {
        id: 'schedule',
        title: 'Жадыбал дал келбейт',
        description: 'Класс убактысы, кабинет, предмет же дайындалган студент/топ туура эмес көрүнсө ушул жолду колдонуңуз.',
        nextStep: 'Кайрылуудан мурун күндү, топту жана студент маалыматтарын текшериңиз.'
      },
      {
        id: 'attendance',
        title: 'Катышуу көйгөйү',
        description: 'Студенттин статусу, roster же катышуу жыйынтыгы чыныгы абалга туура келбесе ушул жолду колдонуңуз.',
        nextStep: 'Сабак датасын, курс атын жана таасирленген студент IDсин кошуңуз.'
      },
      {
        id: 'grades',
        title: 'Баалар же экзамен көйгөйү',
        description: 'Экзамен, баа же упай тарыхы туура эмес же жок болсо ушул жолду колдонуңуз.',
        nextStep: 'Курс, экзамен аталышы жана күтүлгөн упайды же статусту жазыңыз.'
      }
    ]
  }
};

const formatSupportRole = (user, language, copy) => {
  if (!user) return copy.roleUnknown;
  return getRoleLabel(user, language);
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

function InfoCenter({ page = 'privacy', onNavigate, user = null, contextPage = 'dashboard', language = 'English' }) {
  const copy = INFO_CENTER_COPY[language] || INFO_CENTER_COPY.English;
  const content = copy.pages[page] || copy.pages.privacy;
  const [supportNotice, setSupportNotice] = useState('');
  const [supportError, setSupportError] = useState('');
  const supportDetails = useMemo(() => ([
    copy.supportDetailsTitle,
    `${copy.supportTime}: ${formatSupportTimestamp()}`,
    `${copy.supportDetailsUser}: ${user?.name || copy.roleUnknown}`,
    `${copy.supportDetailsEmail}: ${user?.email || copy.roleUnknown}`,
    `${copy.supportDetailsRole}: ${formatSupportRole(user, language, copy)}`,
    `${copy.supportDetailsStudent}: ${user?.studentId || user?.student_id || copy.notAvailable}`,
    `${copy.supportDetailsGroup}: ${user?.group || copy.notAvailable}`,
    `${copy.supportDetailsSubgroup}: ${user?.subgroup || copy.notAvailable}`,
    `${copy.supportDetailsWorkspace}: ${contextPage || copy.dashboardLabel}`,
    `${copy.supportDetailsPage}: ${content.title}`,
    `${copy.supportDetailsUrl}: ${typeof window !== 'undefined' ? window.location.href : copy.notAvailable}`,
    copy.supportDetailsPrompt
  ].join('\n')), [content.title, contextPage, copy, language, user]);

  const handleCopySupportDetails = async () => {
    try {
      await navigator.clipboard.writeText(supportDetails);
      setSupportError('');
      setSupportNotice(copy.copiedMessage);
      window.setTimeout(() => setSupportNotice(''), 2600);
    } catch {
      setSupportNotice('');
      setSupportError(copy.copyErrorMessage);
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
          <StatusBanner tone="error" title={copy.copyErrorTitle} message={supportError} />
          <StatusBanner tone="success" title={copy.copiedTitle} message={supportNotice} />

          <div className="info-center-grid info-center-grid-support">
            <section className="info-center-card info-center-card-emphasis">
              <h3>{copy.supportPacketTitle}</h3>
              <div className="info-center-list">
                <p>{copy.supportPacketBody}</p>
              </div>
              <div className="support-meta-grid">
                <div className="support-meta-item">
                  <span>{copy.supportAccount}</span>
                  <strong>{user?.email || copy.notAvailable}</strong>
                </div>
                <div className="support-meta-item">
                  <span>{copy.supportRole}</span>
                  <strong>{formatSupportRole(user, language, copy)}</strong>
                </div>
                <div className="support-meta-item">
                  <span>{copy.supportWorkspace}</span>
                  <strong>{contextPage || copy.dashboardLabel}</strong>
                </div>
                <div className="support-meta-item">
                  <span>{copy.supportTime}</span>
                  <strong>{formatSupportTimestamp()}</strong>
                </div>
              </div>
              <pre className="support-copy-card">{supportDetails}</pre>
              <div className="portal-actions info-center-actions">
                <button type="button" className="btn-primary" onClick={handleCopySupportDetails}>
                  {copy.supportCopyButton}
                </button>
                <button type="button" className="btn-secondary" onClick={() => onNavigate?.('messages')}>
                  {copy.supportOpenMessages}
                </button>
              </div>
            </section>

            <section className="info-center-card">
              <h3>{copy.supportTrackTitle}</h3>
              <div className="support-track-list">
                {copy.supportTracks.map((track) => (
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
