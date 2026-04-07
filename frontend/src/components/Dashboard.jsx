import { useEffect, useState } from 'react';

import { api } from '../api';
import EmptyState from './EmptyState';
import StatusBanner from './StatusBanner';
import { canManageAcademicRecords, getRoleLabel, hasAdminAccess, isStudentAccount } from '../roles';

function getDashboardCopy(language = 'English') {
  if (language === 'Kyrgyz') {
    return {
      firstNameFallback: 'досум',
      displayNameFallback: 'Профиль толтурулган эмес',
      greeting: (name) => `Кош келиңиз, ${name}!`,
      intro: 'Аккаунтуңуз даяр. Тирүү маалыматтар система жаңырган сайын ушул жерде көрүнөт.',
      accountMetaStudent: (studentId) => `Студент ID: ${studentId}`,
      accountMetaLogin: (email) => `Кирүү: ${email}`,
      accountMetaMissing: 'Кирүү маалыматы азырынча жеткиликтүү эмес',
      groupNotSet: 'Коюлган эмес',
      heroKicker: 'CampusOS иш мейкиндиги',
      identityLinked: 'Студенттик профиль туташкан',
      emailIdentity: 'Email аркылуу иденттүүлүк',
      workspaceModes: {
        admin: 'Администрация иш мейкиндиги',
        manager: 'Академиялык операциялар мейкиндиги',
        student: 'Студенттик иш мейкиндиги'
      },
      nextFocus: {
        admin: 'Колдонуучулар тизмесин, интеграцияларды жана академиялык операцияларды текшериңиз.',
        manager: 'Бүгүнкү окутуу агымын улантуу үчүн катышуу же экзамендерди ачыңыз.',
        student: 'Окуу агымын улантуу үчүн жадылыңызды, билдирүүлөрдү же бааларды ачыңыз.'
      },
      status: {
        authTitle: 'Ийгиликтүү авторизацияланды',
        authSubtitle: 'Сеансыңыз активдүү жана портал колдонууга даяр.',
        accountTitle: 'Аккаунт профили'
      },
      stats: {
        currentRole: 'Учурдагы роль',
        accountOwner: 'Аккаунт ээси',
        group: 'Топ'
      },
      sections: {
        portalStatus: 'Портал абалы',
        quickActions: 'Тез аракеттер',
        sessionSnapshot: 'Сеанс көрүнүшү',
        workspaceNotes: 'Иш мейкиндигинин жазуулары',
        reports: 'Факультет жана деканат отчеттору',
        studentPerformance: 'Жеке көрсөткүчтөр',
        teamPerformance: 'Топтук көрсөткүчтөр',
        studentRisk: 'Академиялык абал',
        teamRisk: 'Академиялык тобокелдиктер'
      },
      context: {
        displayName: 'Көрсөтүлүүчү ат',
        role: 'Роль',
        lastSeen: 'Акыркы көрүнүш',
        nextStep: 'Кийинки кадам',
        studentNext: 'Бааларды жана жадыбалды текшериңиз',
        managerNext: 'Операциялык иш мейкиндигин караңыз'
      },
      reports: {
        unavailableTitle: 'Отчет экспорттоо жеткиликсиз',
        readyTitle: 'Отчет даяр',
        from: 'Башталышы',
        to: 'Аягы',
        facultyTitle: 'Факультет боюнча CSV',
        facultyDescription: 'Катышуу, баа абалы, белгиленген студенттер жана support queue факультет боюнча.',
        deanTitle: 'Деканат кийлигишүү CSV',
        deanDescription: 'Тобокелдик деңгээли, себептери, куратору жана кийинки аракети бар студенттер.',
        preparing: 'Даярдалууда...',
        exportFaculty: 'Факультет экспорттоо',
        exportDean: 'Деканат экспорттоо',
        facultyExported: 'Факультет отчету экспорттолду.',
        facultyExportFailed: 'Факультет отчетун экспорттоо ишке ашкан жок.',
        deanExported: 'Деканат отчету экспорттолду.',
        deanExportFailed: 'Деканат отчетун экспорттоо ишке ашкан жок.'
      },
      performance: {
        unavailableTitle: 'Көрсөткүч панели жеткиликсиз',
        eyebrow: 'Көрсөткүчтөр',
        loadingTitle: 'Көрсөткүч панели даярдалып жатат',
        loadingDescription: 'CampusOS баалар менен катышууну рольго жараша бириктирип жатат.',
        noDataTitle: 'Азырынча көрсөткүч маалымат жок',
        noDataDescription: 'Академиялык жазуулар түшө баштаганда бул панель пайда болот.',
        averageGrade: 'Орточо баа',
        attendanceRate: 'Катышуу пайызы',
        gradedAssessments: 'Бааланган иштер',
        attendanceRecords: 'Катышуу жазуулары',
        strongestSubject: 'Эң күчтүү сабак',
        strongestFallback: 'Азырынча маалымат жетишсиз',
        strongestEmpty: 'Кошумча баалар жарыялангандан кийин бул жерде көрүнөт.',
        supportSubject: 'Көңүл буруу керек',
        supportFallback: 'Азырынча көйгөй жок',
        supportEmpty: 'CampusOS бул аралыкта алсыз сабакты байкаган жок.',
        averageAttendance: 'Орточо катышуу',
        groupsTracked: 'Көзөмөлдөгү топтор',
        supportQueue: 'Колдоо кезеги',
        groupPerformance: 'Топ көрсөткүчү',
        studentHighlights: 'Студенттик басымдар',
        noGroupsTitle: 'Топтук жыйынтык азырынча жок',
        noGroupsDescription: 'Катышуу жана баалар пайда болгондо топтук көрсөткүчтөр көрүнөт.',
        needsSupport: 'Колдоо керек',
        studentsUnit: 'студент'
      },
      risk: {
        unavailableTitle: 'Тобокелдик сигналдары жеткиликсиз',
        eyebrow: 'Академиялык сигналдар',
        loadingTitle: 'Тобокелдик сигналдары даярдалууда',
        loadingDescription: 'CampusOS катышуу жана баа моделдерин текшерип, мүмкүн болгон академиялык көйгөйлөрдү издеп жатат.',
        noRecordsTitle: 'Азырынча академиялык жазуу жок',
        noRecordsDescription: 'Катышуу жана баалар профилиңизге түшө баштаганда сигналдар көрүнөт.',
        attendance: 'Катышуу',
        averageGrade: 'Орточо баа',
        activeTitle: 'Активдүү академиялык тобокелдик жок',
        activeDescription: 'Акыркы катышуу жана баа көрсөткүчтөрү туруктуу көрүнөт.',
        reviewPrompt: 'Акыркы жазууларды текшерүү үчүн катышуу жана баалар бөлүмүн ачыңыз, керек болсо окутуучу менен сүйлөшүңүз.',
        flaggedStudents: 'Белгиленген студенттер',
        critical: 'Оор',
        watch: 'Көзөмөл',
        stable: 'Туруктуу',
        studentsEvaluated: 'Бааланган студенттер',
        noFlaggedTitle: 'Учурда белгиленген студенттер жок',
        noFlaggedDescription: 'Текшерилген топ боюнча катышуу жана баа сигналдары туруктуу көрүнөт.'
      },
      noGrades: 'Баалар жок',
      lastSeenFallback: 'Кийинки ийгиликтүү жаңылануудан кийин сеанс маалыматы көрүнөт.'
    };
  }

  return {
    firstNameFallback: 'there',
    displayNameFallback: 'Profile not set',
    greeting: (name) => `Welcome back, ${name}!`,
    intro: 'Your account is ready. Live data will appear here as it is added to the system.',
    accountMetaStudent: (studentId) => `Student ID: ${studentId}`,
    accountMetaLogin: (email) => `Login: ${email}`,
    accountMetaMissing: 'Login details are not available yet',
    groupNotSet: 'Not set',
    heroKicker: 'CampusOS workspace',
    identityLinked: 'Student identity linked',
    emailIdentity: 'Email-based identity',
    workspaceModes: {
      admin: 'Administration workspace',
      manager: 'Academic operations workspace',
      student: 'Student workspace'
    },
    nextFocus: {
      admin: 'Check user directory, integrations, and academic operations.',
      manager: "Open attendance or exams to continue today's teaching workflow.",
      student: 'Open your schedule, messages, or grades to continue your study flow.'
    },
    status: {
      authTitle: 'Authenticated successfully',
      authSubtitle: 'Your session is active and the portal is ready to use.',
      accountTitle: 'Account profile'
    },
    stats: {
      currentRole: 'Current role',
      accountOwner: 'Account owner',
      group: 'Group'
    },
    sections: {
      portalStatus: 'Portal Status',
      quickActions: 'Quick Actions',
      sessionSnapshot: 'Session Snapshot',
      workspaceNotes: 'Workspace Notes',
      reports: 'Faculty & Dean Reports',
      studentPerformance: 'Performance Snapshot',
      teamPerformance: 'Performance Overview',
      studentRisk: 'Academic Health',
      teamRisk: 'Academic Risk Flags'
    },
    context: {
      displayName: 'Display name',
      role: 'Role',
      lastSeen: 'Last seen',
      nextStep: 'Profile next step',
      studentNext: 'Check grades and schedule',
      managerNext: 'Review operational workspace'
    },
    reports: {
      unavailableTitle: 'Report export unavailable',
      readyTitle: 'Report export ready',
      from: 'From',
      to: 'To',
      facultyTitle: 'Faculty overview CSV',
      facultyDescription: 'Attendance, grade health, flagged students, and support queue by faculty.',
      deanTitle: 'Dean office intervention CSV',
      deanDescription: 'Flagged students with severity, reasons, advisor, and follow-up focus.',
      preparing: 'Preparing...',
      exportFaculty: 'Export faculty',
      exportDean: 'Export dean office',
      facultyExported: 'Faculty overview exported.',
      facultyExportFailed: 'Faculty overview export failed.',
      deanExported: 'Dean office report exported.',
      deanExportFailed: 'Dean office report export failed.'
    },
    performance: {
      unavailableTitle: 'Performance dashboard unavailable',
      eyebrow: 'Performance',
      loadingTitle: 'Building performance overview',
      loadingDescription: 'CampusOS is aggregating grades and attendance into a role-specific performance dashboard.',
      noDataTitle: 'No performance data yet',
      noDataDescription: 'Your grade and attendance dashboard will appear once academic records start coming in.',
      averageGrade: 'Average grade',
      attendanceRate: 'Attendance rate',
      gradedAssessments: 'Graded assessments',
      attendanceRecords: 'Attendance records',
      strongestSubject: 'Strongest subject',
      strongestFallback: 'Not enough data yet',
      strongestEmpty: 'Grades will appear here after more assessments are published.',
      supportSubject: 'Needs attention',
      supportFallback: 'No current concern',
      supportEmpty: 'CampusOS has not detected a weak subject area in the current window.',
      averageAttendance: 'Average attendance',
      groupsTracked: 'Groups tracked',
      supportQueue: 'Support queue',
      groupPerformance: 'Group performance',
      studentHighlights: 'Student highlights',
      noGroupsTitle: 'No group aggregates yet',
      noGroupsDescription: 'Performance groups will appear once attendance and grades are available.',
      needsSupport: 'Needs support',
      studentsUnit: 'students'
    },
    risk: {
      unavailableTitle: 'Risk flags unavailable',
      eyebrow: 'Academic signals',
      loadingTitle: 'Building risk signals',
      loadingDescription: 'CampusOS is reviewing attendance and grade patterns to detect possible academic problems.',
      noRecordsTitle: 'No academic records yet',
      noRecordsDescription: 'Risk flags will appear once attendance and grades start coming into your profile.',
      attendance: 'Attendance',
      averageGrade: 'Average grade',
      activeTitle: 'No active academic risk flags',
      activeDescription: 'Your recent attendance and grade patterns look stable in CampusOS.',
      reviewPrompt: 'Open attendance and grades to review the latest records and speak with your instructor if needed.',
      flaggedStudents: 'Flagged students',
      critical: 'Critical',
      watch: 'Watch',
      stable: 'Stable',
      studentsEvaluated: 'Students evaluated',
      noFlaggedTitle: 'No flagged students in the current review window',
      noFlaggedDescription: 'Attendance and grade signals look stable for the currently evaluated population.'
    },
    noGrades: 'No grades',
    lastSeenFallback: 'Session details will appear after the next authenticated refresh.'
  };
}

function formatLastSeen(value, locale = 'en-GB', fallback = 'Session details will appear after the next authenticated refresh.') {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getRiskSeverityLabel(severity, riskCopy) {
  if (severity === 'critical') return riskCopy.critical;
  if (severity === 'watch') return riskCopy.watch;
  return riskCopy.stable;
}

function formatMetricPercent(value) {
  return `${Math.round(Number(value) || 0)}%`;
}

function normalizeDateInput(value) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultReportRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 119);

  return {
    from: normalizeDateInput(from),
    to: normalizeDateInput(to)
  };
}

function escapeCsvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function sanitizeUiCopy(value) {
  return String(value ?? '').replaceAll('вЂ™', "'");
}

function downloadCsvFile(filename, headers, rows) {
  const csvLines = [
    headers.map((header) => escapeCsvValue(header.label)).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header.key])).join(','))
  ];

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function Dashboard({ user, onNavigate, locale = 'en-GB', language = 'English' }) {
  const copy = getDashboardCopy(language);
  const [riskFlags, setRiskFlags] = useState(null);
  const [loadingRiskFlags, setLoadingRiskFlags] = useState(true);
  const [riskFlagsError, setRiskFlagsError] = useState('');
  const [performanceDashboard, setPerformanceDashboard] = useState(null);
  const [loadingPerformanceDashboard, setLoadingPerformanceDashboard] = useState(true);
  const [performanceDashboardError, setPerformanceDashboardError] = useState('');
  const [reportRange, setReportRange] = useState(getDefaultReportRange);
  const [reportNotice, setReportNotice] = useState('');
  const [reportError, setReportError] = useState('');
  const [exportingReport, setExportingReport] = useState('');
  const roleLabel = getRoleLabel(user, language);
  const firstName = user?.name?.split(' ')?.[0] || copy.firstNameFallback;
  const displayName = user?.name?.trim() || copy.displayNameFallback;
  const isStudent = isStudentAccount(user);
  const canManage = canManageAcademicRecords(user);
  const isAdmin = hasAdminAccess(user);
  const accountMeta = user?.studentId
    ? copy.accountMetaStudent(user.studentId)
    : user?.email
      ? copy.accountMetaLogin(user.email)
      : copy.accountMetaMissing;
  const groupLabel = user?.group || copy.groupNotSet;
  const workspaceMode = isAdmin
    ? copy.workspaceModes.admin
    : canManage
      ? copy.workspaceModes.manager
      : copy.workspaceModes.student;
  const nextFocus = isAdmin
    ? copy.nextFocus.admin
    : canManage
      ? 'Open attendance or exams to continue today’s teaching workflow.'
      : copy.nextFocus.student;
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
  const quickNotes = isAdmin
    ? (language === 'Kyrgyz'
        ? [
            'Courses бөлүмүндөгү operations hub аркылуу массалык дайындап, roster экспорттой аласыз.',
            'Интеграциялар override кол менен колдонулмайынча read-only бойдон калат.',
            'Системалык audit жана queue активдүүлүгү ops endpoint аркылуу жеткиликтүү.'
          ]
        : [
            'Use the operations hub in Courses for bulk teacher assignment and roster exports.',
            'Integrations stay read-only unless you explicitly apply an override.',
            'System audit and queue activity are available through the ops endpoints.'
          ])
    : canManage
      ? (language === 'Kyrgyz'
          ? [
              'Катышуу таблица режими roster белгилөөнү ылдамдатууга ылайыкташкан.',
              'Экзамен жана тапшырма агымдары кайталанма структуралар үчүн duplication колдойт.',
              'Билдирүүлөрдү түз эле колдонуучунун inbox агымына жарыялоого болот.'
            ]
          : [
              'Attendance table mode is optimized for fast roster marking.',
              'Exam and assignment flows support duplication for repeated academic structures.',
              'Messages can be published directly to the user inbox flow.'
            ])
      : (language === 'Kyrgyz'
          ? [
              'Курс карталары катталгандан кийин же академиялык байланыш пайда болгондо гана көрүнөт.',
              'Баалар жана катышуу окутуучулар жазууну жарыялаган сайын жаңыланат.',
              'Профиль жөндөөлөрү академиялык маалыматты так кармоого жардам берет.'
            ]
          : [
              'Course cards only appear after enrollment or linked academic assignment.',
              'Grades and attendance update as teachers publish live records.',
              'Profile settings help keep your academic identity up to date.'
            ]);
  const displayNextFocus = sanitizeUiCopy(nextFocus);
  const displayActionCards = actionCards.map((item) => ({
    ...item,
    label: sanitizeUiCopy(item.label),
    description: sanitizeUiCopy(item.description)
  }));
  const displayQuickNotes = quickNotes.map((item) => sanitizeUiCopy(item));
  const statusItems = [
    {
      title: copy.status.authTitle,
      subtitle: copy.status.authSubtitle,
      badge: 'LIVE'
    },
    {
      title: workspaceMode,
      subtitle: displayNextFocus,
      badge: roleLabel
    },
    {
      title: copy.status.accountTitle,
      subtitle: accountMeta,
      badge: groupLabel
    }
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
        setRiskFlagsError(requestError.message || copy.risk.unavailableTitle);
      } finally {
        setLoadingRiskFlags(false);
      }
    };

    loadRiskFlags();
  }, [copy.risk.unavailableTitle, isStudent, user?.id]);

  useEffect(() => {
    const loadPerformanceDashboard = async () => {
      try {
        setLoadingPerformanceDashboard(true);
        setPerformanceDashboardError('');
        const response = await api.getPerformanceDashboard();
        setPerformanceDashboard(response);
      } catch (requestError) {
        setPerformanceDashboard(null);
        setPerformanceDashboardError(requestError.message || copy.performance.unavailableTitle);
      } finally {
        setLoadingPerformanceDashboard(false);
      }
    };

    loadPerformanceDashboard();
  }, [copy.performance.unavailableTitle, user?.id]);

  const studentRiskSnapshot = riskFlags?.snapshot || null;
  const hasStudentRisk = studentRiskSnapshot && studentRiskSnapshot.severity !== 'ok';
  const riskSummary = riskFlags?.summary || {
    studentsEvaluated: 0,
    flaggedStudents: 0,
    criticalFlags: 0,
    watchFlags: 0
  };
  const performanceSummary = performanceDashboard?.summary || {
    studentsTracked: 0,
    groupsTracked: 0,
    averageGrade: null,
    averageAttendanceRate: 0,
    supportQueueSize: 0
  };
  const studentPerformance = performanceDashboard?.studentSnapshot || null;

  const clearReportNoticeLater = () => {
    window.setTimeout(() => setReportNotice(''), 2400);
  };

  const handleExportFacultyReport = async () => {
    try {
      setExportingReport('faculty');
      setReportError('');
      const response = await api.getFacultyOverviewReport(reportRange.from, reportRange.to);
      downloadCsvFile(
        `campusos-faculty-overview-${reportRange.from}-to-${reportRange.to}.csv`,
        [
          { key: 'faculty', label: 'Faculty' },
          { key: 'majorsTracked', label: 'Majors tracked' },
          { key: 'groupsTracked', label: 'Groups tracked' },
          { key: 'studentsTracked', label: 'Students tracked' },
          { key: 'averageAttendanceRate', label: 'Average attendance rate' },
          { key: 'averageGrade', label: 'Average grade' },
          { key: 'flaggedStudents', label: 'Flagged students' },
          { key: 'criticalFlags', label: 'Critical flags' },
          { key: 'watchFlags', label: 'Watch flags' },
          { key: 'supportQueue', label: 'Support queue' }
        ],
        response?.rows || []
      );
      setReportNotice(copy.reports.facultyExported);
      clearReportNoticeLater();
    } catch (requestError) {
      setReportError(requestError.message || copy.reports.facultyExportFailed);
    } finally {
      setExportingReport('');
    }
  };

  const handleExportDeanOfficeReport = async () => {
    try {
      setExportingReport('dean');
      setReportError('');
      const response = await api.getDeanOfficeReport(reportRange.from, reportRange.to);
      downloadCsvFile(
        `campusos-dean-office-${reportRange.from}-to-${reportRange.to}.csv`,
        [
          { key: 'studentId', label: 'Student ID' },
          { key: 'studentName', label: 'Student name' },
          { key: 'faculty', label: 'Faculty' },
          { key: 'major', label: 'Major' },
          { key: 'advisor', label: 'Advisor' },
          { key: 'groupName', label: 'Group' },
          { key: 'attendanceRate', label: 'Attendance rate' },
          { key: 'averageGrade', label: 'Average grade' },
          { key: 'severity', label: 'Severity' },
          { key: 'riskScore', label: 'Risk score' },
          { key: 'supportSubject', label: 'Support focus' },
          { key: 'reasons', label: 'Reasons' },
          { key: 'lastAttendanceDate', label: 'Last attendance date' },
          { key: 'lastGradeDate', label: 'Last grade date' }
        ],
        response?.rows || []
      );
      setReportNotice(copy.reports.deanExported);
      clearReportNoticeLater();
    } catch (requestError) {
      setReportError(requestError.message || copy.reports.deanExportFailed);
    } finally {
      setExportingReport('');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{copy.greeting(firstName)}</h1>
          <p>{copy.intro}</p>
        </div>
      </div>

      <section className="dashboard-hero-card">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow">{copy.heroKicker}</span>
          <h2>{workspaceMode}</h2>
          <p>{displayNextFocus}</p>
        </div>
        <div className="dashboard-pill-list" aria-label="Current account summary">
          <span className="dashboard-pill">{roleLabel}</span>
          <span className="dashboard-pill">{groupLabel}</span>
          <span className="dashboard-pill">{user?.studentId ? copy.identityLinked : copy.emailIdentity}</span>
        </div>
      </section>

      <div className="stats-grid">
        <div className="stat-card" style={{ '--accent': '#8b5cf6' }}>
          <span className="stat-icon">R</span>
          <div className="stat-content">
            <div className="stat-value">{roleLabel}</div>
            <div className="stat-label">{copy.stats.currentRole}</div>
          </div>
        </div>

        <div className="stat-card" style={{ '--accent': '#10b981' }}>
          <span className="stat-icon">@</span>
          <div className="stat-content">
            <div className="stat-value stat-value-name">{displayName}</div>
            <div className="stat-label">{copy.stats.accountOwner}</div>
            <div className="stat-meta">{accountMeta}</div>
          </div>
        </div>

        <div className="stat-card" style={{ '--accent': '#3b82f6' }}>
          <span className="stat-icon">G</span>
          <div className="stat-content">
            <div className="stat-value">{user.group || copy.groupNotSet}</div>
            <div className="stat-label">{copy.stats.group}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dash-card">
          <div className="card-header">
            <h3>{copy.sections.portalStatus}</h3>
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
            <h3>{copy.sections.quickActions}</h3>
          </div>
          <div className="dashboard-action-grid">
            {displayActionCards.map((action) => (
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
            <h3>{copy.sections.sessionSnapshot}</h3>
          </div>
          <div className="dashboard-context-grid">
            <div className="dashboard-context-item">
              <span className="dashboard-context-label">{copy.context.displayName}</span>
              <strong>{displayName}</strong>
            </div>
            <div className="dashboard-context-item">
              <span className="dashboard-context-label">{copy.context.role}</span>
              <strong>{roleLabel}</strong>
            </div>
            <div className="dashboard-context-item">
              <span className="dashboard-context-label">{copy.context.lastSeen}</span>
              <strong>{formatLastSeen(user?.last_login_at || user?.lastLoginAt, locale, copy.lastSeenFallback)}</strong>
            </div>
            <div className="dashboard-context-item">
              <span className="dashboard-context-label">{copy.context.nextStep}</span>
              <strong>{isStudent ? copy.context.studentNext : copy.context.managerNext}</strong>
            </div>
          </div>
        </div>

        <div className="dash-card">
          <div className="card-header">
            <h3>{copy.sections.workspaceNotes}</h3>
          </div>
          <div className="deadline-list dashboard-note-list">
            {displayQuickNotes.map((item) => (
              <div key={item} className="deadline-item dashboard-note-item">
                <div className="deadline-info">
                  <span className="deadline-title">{item}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div className="dash-card">
            <div className="card-header">
              <h3>{copy.sections.reports}</h3>
            </div>

            <StatusBanner
              tone="error"
              title={copy.reports.unavailableTitle}
              message={reportError}
            />
            <StatusBanner
              tone="success"
              title={copy.reports.readyTitle}
              message={reportNotice}
            />

            <div className="dashboard-report-range">
              <label className="dashboard-report-field">
                <span className="dashboard-context-label">{copy.reports.from}</span>
                <input
                  type="date"
                  value={reportRange.from}
                  onChange={(event) => setReportRange((current) => ({ ...current, from: event.target.value }))}
                />
              </label>
              <label className="dashboard-report-field">
                <span className="dashboard-context-label">{copy.reports.to}</span>
                <input
                  type="date"
                  value={reportRange.to}
                  onChange={(event) => setReportRange((current) => ({ ...current, to: event.target.value }))}
                />
              </label>
            </div>

            <div className="dashboard-report-list">
              <div className="dashboard-report-item">
                <div>
                  <strong>{copy.reports.facultyTitle}</strong>
                  <span>{copy.reports.facultyDescription}</span>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleExportFacultyReport}
                  disabled={exportingReport === 'faculty'}
                >
                  {exportingReport === 'faculty' ? copy.reports.preparing : copy.reports.exportFaculty}
                </button>
              </div>
              <div className="dashboard-report-item">
                <div>
                  <strong>{copy.reports.deanTitle}</strong>
                  <span>{copy.reports.deanDescription}</span>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleExportDeanOfficeReport}
                  disabled={exportingReport === 'dean'}
                >
                  {exportingReport === 'dean' ? copy.reports.preparing : copy.reports.exportDean}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="dash-card">
          <div className="card-header">
            <h3>{isStudent ? copy.sections.studentPerformance : copy.sections.teamPerformance}</h3>
          </div>

          <StatusBanner
            tone="error"
            title={copy.performance.unavailableTitle}
            message={performanceDashboardError}
          />

          {loadingPerformanceDashboard ? (
            <EmptyState
              eyebrow={copy.performance.eyebrow}
              title={copy.performance.loadingTitle}
              description={copy.performance.loadingDescription}
              compact
              className="dashboard-inline-empty"
            />
          ) : isStudent ? (
            studentPerformance ? (
              <div className="dashboard-risk-shell">
                <div className="dashboard-risk-summary">
                  <div className="dashboard-risk-summary-card">
                    <strong>{studentPerformance.averageGrade ?? copy.noGrades}</strong>
                    <span>{copy.performance.averageGrade}</span>
                  </div>
                  <div className="dashboard-risk-summary-card">
                    <strong>{formatMetricPercent(studentPerformance.attendanceRate)}</strong>
                    <span>{copy.performance.attendanceRate}</span>
                  </div>
                  <div className="dashboard-risk-summary-card">
                    <strong>{studentPerformance.totalGrades}</strong>
                    <span>{copy.performance.gradedAssessments}</span>
                  </div>
                  <div className="dashboard-risk-summary-card">
                    <strong>{studentPerformance.attendanceRecords}</strong>
                    <span>{copy.performance.attendanceRecords}</span>
                  </div>
                </div>

                <div className="dashboard-performance-list">
                  <div className="dashboard-performance-item">
                    <span className="dashboard-context-label">{copy.performance.strongestSubject}</span>
                    <strong>{studentPerformance.strongestSubject?.subject || copy.performance.strongestFallback}</strong>
                    <small>
                      {studentPerformance.strongestSubject
                        ? `${copy.performance.averageGrade} ${studentPerformance.strongestSubject.averageGrade}`
                        : copy.performance.strongestEmpty}
                    </small>
                  </div>
                  <div className="dashboard-performance-item">
                    <span className="dashboard-context-label">{copy.performance.supportSubject}</span>
                    <strong>{studentPerformance.supportSubject?.subject || copy.performance.supportFallback}</strong>
                    <small>
                      {studentPerformance.supportSubject
                        ? `${copy.performance.attendanceRate} ${formatMetricPercent(studentPerformance.supportSubject.attendanceRate)}`
                        : copy.performance.supportEmpty}
                    </small>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                eyebrow={copy.performance.eyebrow}
                title={copy.performance.noDataTitle}
                description={copy.performance.noDataDescription}
                compact
                className="dashboard-inline-empty"
              />
            )
          ) : (
            <div className="dashboard-risk-shell">
              <div className="dashboard-risk-summary">
                <div className="dashboard-risk-summary-card">
                  <strong>{performanceSummary.averageGrade ?? copy.noGrades}</strong>
                  <span>{copy.performance.averageGrade}</span>
                </div>
                <div className="dashboard-risk-summary-card">
                  <strong>{formatMetricPercent(performanceSummary.averageAttendanceRate)}</strong>
                  <span>{copy.performance.averageAttendance}</span>
                </div>
                <div className="dashboard-risk-summary-card">
                  <strong>{performanceSummary.groupsTracked}</strong>
                  <span>{copy.performance.groupsTracked}</span>
                </div>
                <div className="dashboard-risk-summary-card">
                  <strong>{performanceSummary.supportQueueSize}</strong>
                  <span>{copy.performance.supportQueue}</span>
                </div>
              </div>

              <div className="dashboard-performance-columns">
                <div className="dashboard-performance-list">
                  <span className="dashboard-context-label">{copy.performance.groupPerformance}</span>
                  {(performanceDashboard?.groupPerformance || []).slice(0, 4).map((group) => (
                    <div key={group.groupName} className="dashboard-performance-item">
                      <strong>{group.groupName}</strong>
                      <small>
                        {group.studentCount} {copy.performance.studentsUnit} | {copy.performance.averageGrade} {group.averageGrade ?? copy.noGrades} | {copy.performance.attendanceRate} {formatMetricPercent(group.attendanceRate)}
                      </small>
                    </div>
                  ))}
                  {!performanceDashboard?.groupPerformance?.length ? (
                    <div className="dashboard-risk-clear">
                      <strong>{copy.performance.noGroupsTitle}</strong>
                      <span>{copy.performance.noGroupsDescription}</span>
                    </div>
                  ) : null}
                </div>

                <div className="dashboard-performance-list">
                  <span className="dashboard-context-label">{copy.performance.studentHighlights}</span>
                  {(performanceDashboard?.topStudents || []).slice(0, 3).map((student) => (
                    <div key={student.studentId} className="dashboard-performance-item">
                      <strong>{student.studentName}</strong>
                      <small>
                        {student.groupName} | {copy.performance.averageGrade} {student.averageGrade ?? copy.noGrades} | {copy.performance.attendanceRate} {formatMetricPercent(student.attendanceRate)}
                      </small>
                    </div>
                  ))}
                  {(performanceDashboard?.supportQueue || []).slice(0, 2).map((student) => (
                    <div key={`${student.studentId}-support`} className="dashboard-performance-item attention">
                      <strong>{student.studentName}</strong>
                      <small>
                        {copy.performance.needsSupport} | {copy.performance.averageGrade} {student.averageGrade ?? copy.noGrades} | {copy.performance.attendanceRate} {formatMetricPercent(student.attendanceRate)}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="dash-card">
          <div className="card-header">
            <h3>{isStudent ? copy.sections.studentRisk : copy.sections.teamRisk}</h3>
          </div>

          <StatusBanner
            tone="error"
            title={copy.risk.unavailableTitle}
            message={riskFlagsError}
          />

          {loadingRiskFlags ? (
            <EmptyState
              eyebrow={copy.risk.eyebrow}
              title={copy.risk.loadingTitle}
              description={copy.risk.loadingDescription}
              compact
              className="dashboard-inline-empty"
            />
          ) : isStudent ? (
            studentRiskSnapshot ? (
              <div className="dashboard-risk-shell">
                <div className={`dashboard-risk-banner ${studentRiskSnapshot.severity}`}>
                  <span className={`dashboard-risk-badge ${studentRiskSnapshot.severity}`}>
                    {getRiskSeverityLabel(studentRiskSnapshot.severity, copy.risk)}
                  </span>
                  <div className="dashboard-risk-metrics">
                    <div className="dashboard-risk-metric">
                      <span>{copy.risk.attendance}</span>
                      <strong>{studentRiskSnapshot.attendanceRate}%</strong>
                    </div>
                    <div className="dashboard-risk-metric">
                      <span>{copy.risk.averageGrade}</span>
                      <strong>{studentRiskSnapshot.averageGrade ?? copy.noGrades}</strong>
                    </div>
                  </div>
                </div>

                {hasStudentRisk ? (
                  <div className="dashboard-risk-list">
                    {studentRiskSnapshot.reasons.map((reason) => (
                      <div key={reason} className="dashboard-risk-item">
                        <strong>{reason}</strong>
                        <span>{copy.risk.reviewPrompt}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dashboard-risk-clear">
                    <strong>{copy.risk.activeTitle}</strong>
                    <span>{copy.risk.activeDescription}</span>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                eyebrow={copy.risk.eyebrow}
                title={copy.risk.noRecordsTitle}
                description={copy.risk.noRecordsDescription}
                compact
                className="dashboard-inline-empty"
              />
            )
          ) : (
            <div className="dashboard-risk-shell">
              <div className="dashboard-risk-summary">
                <div className="dashboard-risk-summary-card">
                  <strong>{riskSummary.flaggedStudents}</strong>
                  <span>{copy.risk.flaggedStudents}</span>
                </div>
                <div className="dashboard-risk-summary-card">
                  <strong>{riskSummary.criticalFlags}</strong>
                  <span>{copy.risk.critical}</span>
                </div>
                <div className="dashboard-risk-summary-card">
                  <strong>{riskSummary.watchFlags}</strong>
                  <span>{copy.risk.watch}</span>
                </div>
                <div className="dashboard-risk-summary-card">
                  <strong>{riskSummary.studentsEvaluated}</strong>
                  <span>{copy.risk.studentsEvaluated}</span>
                </div>
              </div>

              {riskFlags?.flags?.length ? (
                <div className="dashboard-risk-list">
                  {riskFlags.flags.slice(0, 4).map((flag) => (
                    <div key={flag.studentId} className="dashboard-risk-item">
                      <div className="dashboard-risk-item-head">
                        <strong>{flag.studentName}</strong>
                        <span className={`dashboard-risk-badge ${flag.severity}`}>
                          {getRiskSeverityLabel(flag.severity, copy.risk)}
                        </span>
                      </div>
                      <span>
                        {flag.studentId}
                        {flag.groupName ? ` | ${flag.groupName}` : ''}
                      </span>
                      <small>
                        {copy.risk.attendance} {flag.attendanceRate}% | {copy.risk.averageGrade} {flag.averageGrade ?? copy.noGrades}
                      </small>
                      <p>{flag.reasons.join(' | ')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-risk-clear">
                  <strong>{copy.risk.noFlaggedTitle}</strong>
                  <span>{copy.risk.noFlaggedDescription}</span>
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
