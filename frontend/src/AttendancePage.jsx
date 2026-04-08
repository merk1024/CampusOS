import { useEffect, useState } from 'react';

import './AttendancePage.css';
import { api } from './api';
import EmptyState from './components/EmptyState';
import StatusBanner from './components/StatusBanner';
import { canManageAcademicRecords, hasAdminAccess } from './roles';

const ATTENDANCE_UI_KEY = 'attendance_ui_preferences';
const STATUS_SHORTCUTS = {
  present: 'P',
  late: 'L',
  excused: 'E',
  absent: 'A'
};
const ATTENDANCE_COPY = {
  English: {
    noDate: 'No date',
    statusLabels: {
      present: 'Present',
      absent: 'Absent',
      late: 'Late',
      excused: 'Excused',
      unmarked: 'Unmarked'
    },
    statusOptions: [
      { value: 'present', label: 'Present' },
      { value: 'late', label: 'Late' },
      { value: 'excused', label: 'Excused' },
      { value: 'absent', label: 'Absent' }
    ],
    clearDraftStatus: 'Clear draft status',
    clear: 'Clear',
    summaryCards: ['Marked', 'Present', 'Late', 'Excused', 'Absent', 'Pending'],
    analytics: {
      title: 'Attendance analytics',
      subtitle: 'Review attendance trends, risk patterns, and the courses or groups that may need follow-up.',
      from: 'From',
      to: 'To',
      unavailable: 'Attendance analytics unavailable',
      buildingTitle: 'Building attendance insights',
      buildingDescription: 'CampusOS is aggregating recent attendance records for the selected date range.',
      emptyTitle: 'No attendance insights yet',
      emptyDescription: 'Attendance analytics will appear here after teachers begin marking class sessions.',
      summaryLabels: ['Attendance rate', 'Attendance records', 'Students tracked', 'Courses tracked', 'Groups tracked', 'At-risk students'],
      dailyTrend: 'Daily trend',
      activeDays: (count) => `${count} active day(s)`,
      noMarkedTitle: 'No marked sessions in this window',
      noMarkedDescription: 'Try widening the date range or mark attendance for more sessions.',
      recordsAbsent: (records, absent) => `${records} record${records === 1 ? '' : 's'} | ${absent} absent`,
      watchlist: 'Course watchlist',
      watchlistHint: 'Lower attendance appears first',
      noCourseTitle: 'No course analytics yet',
      noCourseDescription: 'Courses with saved attendance will appear here.',
      courseFallback: 'Course',
      courseRecords: (group, total) => `${group} | ${total} record${total === 1 ? '' : 's'}`,
      absentOnly: (absent) => `${absent} absent`,
      groupsAndStudents: 'Groups and students to review',
      studentAlerts: (count) => `${count} student alert(s)`,
      groupSnapshot: 'Group snapshot',
      studentsTracked: (count) => `${count} student${count === 1 ? '' : 's'} tracked`,
      studentAlertsTitle: 'Student alerts',
      noRisk: 'No critical attendance risk flags were found in this date range.',
      noStudentId: 'No student ID',
      absentLate: (absent, late) => `${absent} absent | ${late} late`
    },
    teacher: {
      title: 'Attendance Management',
      adminSubtitle: 'Review any scheduled class, open the roster, and save attendance for the selected date.',
      teacherSubtitle: 'Open your scheduled classes, mark student attendance, and keep the daily roster up to date.',
      attendanceDate: 'Attendance date',
      updateError: 'Attendance could not be updated',
      updateSuccess: 'Attendance updated',
      scheduledClasses: 'Scheduled classes',
      found: (count) => `${count} found`,
      loadingClassesTitle: 'Loading scheduled classes',
      loadingClassesDescription: 'Checking which sessions are available for the selected date.',
      noClassesTitle: 'No scheduled classes for this date',
      noClassesDescription: 'Pick another date or add schedule entries first, then attendance management will appear here.',
      hasRecords: 'Has records',
      unmarked: 'Unmarked',
      marked: (count) => `${count} marked`,
      rosterEyebrow: 'Roster',
      chooseRosterTitle: 'Choose a class to open its roster',
      chooseRosterDescription: 'Select one scheduled class from the left panel to start marking attendance.',
      loadingRosterTitle: 'Loading roster',
      loadingRosterDescription: 'Preparing the student list and the saved attendance snapshot for this class.',
      rosterFallback: 'Roster',
      noGroup: 'No group',
      quickTitle: 'Quick check-in',
      quickDescription: 'Enter a student ID or name, then mark attendance without scrolling through the full roster.',
      currentClass: 'Current class',
      lookupStudent: 'Lookup student',
      lookupPlaceholder: 'Student ID, name, or subgroup',
      lookupAria: 'Quick attendance lookup',
      noQuickMatch: 'No students matched this lookup. Try another ID, surname, or subgroup.',
      saved: 'Saved',
      draft: 'Draft',
      startTyping: 'Start typing to find a student in the selected class.',
      student: 'Student',
      searchPlaceholder: 'Name, student ID, group',
      searchAria: 'Search students in the attendance roster',
      rows: 'Rows',
      allRows: 'All rows',
      onlyPending: 'Only pending',
      visibleAction: 'Visible action',
      applyVisible: 'Apply to visible',
      clearVisible: 'Clear visible',
      noVisibleStudents: 'No visible students right now',
      visibleStudents: (count) => `${count} visible student${count === 1 ? '' : 's'}`,
      comfortView: 'Comfort view',
      compactView: 'Compact view',
      cards: 'Cards',
      table: 'Table',
      reset: 'Reset',
      emptyFilterTitle: 'No students match the current filter',
      emptyFilterDescription: 'Clear the search or row filter to reopen the full roster.',
      emptyRosterDescription: 'The selected class does not currently have students in its roster.',
      clearFilters: 'Clear filters',
      showingStudents: (visible, total) => `Showing ${visible} of ${total} students`,
      tableHint: 'Table mode is optimized for quick roster marking',
      rosterHint: 'Only the roster scrolls, not the save action',
      quickSet: 'Quick set',
      setStatus: 'Set status',
      saveHint: (saved, total, visible) => `Saved: ${saved} of ${total} | Visible now: ${visible}`,
      saving: 'Saving...',
      saveAttendance: 'Save attendance',
      chooseStatusFirst: 'Choose at least one attendance status before saving.',
      savedStudent: (name, status) => `${name} marked as ${status}.`,
      saveSuccess: (count) => `Attendance saved for ${count} student${count === 1 ? '' : 's'}.`,
      failedLoadAnalytics: 'Failed to load attendance analytics',
      failedLoadSessions: 'Failed to load attendance sessions',
      failedLoadRoster: 'Failed to load attendance roster',
      failedSave: 'Failed to save attendance'
    },
    studentView: {
      missingStudentId: 'Student ID is missing for this account.',
      failedLoad: 'Failed to load attendance',
      title: 'Attendance',
      unavailableTitle: 'Attendance unavailable',
      unavailableSubtitle: 'CampusOS could not load the attendance history for this account.',
      myTitle: 'My Attendance',
      mySubtitle: 'Keep track of your class presence, late arrivals, excused classes, and missed lessons.',
      attendanceRate: 'Attendance rate',
      totalRecords: 'Total records',
      historyTitle: 'Attendance history',
      allStatuses: 'All statuses',
      emptyTitle: 'No records match the current filter',
      emptyDescriptionFiltered: 'Reset the status filter to reopen the full attendance history.',
      emptyDescriptionFresh: 'Attendance records will appear here after teachers start marking your classes.',
      resetFilter: 'Reset filter',
      classSession: 'Class session',
      noRoom: 'No room',
      markedBy: (name) => `Marked by ${name}`,
      loading: 'Loading...'
    }
  },
  Kyrgyz: {
    noDate: 'Дата жок',
    statusLabels: {
      present: 'Келди',
      absent: 'Жок',
      late: 'Кечикти',
      excused: 'Уруксаттуу',
      unmarked: 'Белгилене элек'
    },
    statusOptions: [
      { value: 'present', label: 'Келди' },
      { value: 'late', label: 'Кечикти' },
      { value: 'excused', label: 'Уруксаттуу' },
      { value: 'absent', label: 'Жок' }
    ],
    clearDraftStatus: 'Черновик статусту тазалоо',
    clear: 'Тазалоо',
    summaryCards: ['Белгиленген', 'Келди', 'Кечикти', 'Уруксаттуу', 'Жок', 'Күтүүдө'],
    analytics: {
      title: 'Катышуу аналитикасы',
      subtitle: 'Катышуу тренддерин, тобокел белгилерин жана кошумча көңүл бурууну талап кылган курстарды же топторду караңыз.',
      from: 'Башы',
      to: 'Аягы',
      unavailable: 'Катышуу аналитикасы жеткиликсиз',
      buildingTitle: 'Катышуу аналитикасы даярдалууда',
      buildingDescription: 'CampusOS тандалган мезгил үчүн акыркы катышуу жазууларын топтоп жатат.',
      emptyTitle: 'Азырынча катышуу аналитикасы жок',
      emptyDescription: 'Окутуучулар сабактарды белгилей баштагандан кийин катышуу аналитикасы бул жерде пайда болот.',
      summaryLabels: ['Катышуу пайызы', 'Катышуу жазуулары', 'Көзөмөлдөгү студенттер', 'Көзөмөлдөгү курстар', 'Көзөмөлдөгү топтор', 'Тобокел студенттер'],
      dailyTrend: 'Күндүк тренд',
      activeDays: (count) => `${count} активдүү күн`,
      noMarkedTitle: 'Бул аралыкта белгиленген сессиялар жок',
      noMarkedDescription: 'Даталар диапазонун кеңейтип көрүңүз же көбүрөөк катышуу белгилеңиз.',
      recordsAbsent: (records, absent) => `${records} жазуу | ${absent} жок`,
      watchlist: 'Курс байкоо тизмеси',
      watchlistHint: 'Төмөн катышуу алдыңкы орунда',
      noCourseTitle: 'Азырынча курс аналитикасы жок',
      noCourseDescription: 'Сакталган катышуусу бар курстар бул жерде көрүнөт.',
      courseFallback: 'Курс',
      courseRecords: (group, total) => `${group} | ${total} жазуу`,
      absentOnly: (absent) => `${absent} жок`,
      groupsAndStudents: 'Карала турган топтор жана студенттер',
      studentAlerts: (count) => `${count} студенттик белги`,
      groupSnapshot: 'Топтун абалы',
      studentsTracked: (count) => `${count} студент көзөмөлдө`,
      studentAlertsTitle: 'Студенттик эскертүүлөр',
      noRisk: 'Бул аралыкта олуттуу катышуу тобокел белгилери табылган жок.',
      noStudentId: 'Студент ID жок',
      absentLate: (absent, late) => `${absent} жок | ${late} кечикти`
    },
    teacher: {
      title: 'Катышууну башкаруу',
      adminSubtitle: 'Каалаган пландалган сабакты ачып, тизме менен иштеп, тандалган дата үчүн катышууну сактаңыз.',
      teacherSubtitle: 'Пландалган сабактарды ачып, студенттердин катышуусун белгилеп, күндүк тизмени жаңыртып туруңуз.',
      attendanceDate: 'Катышуу күнү',
      updateError: 'Катышуу жаңыртылган жок',
      updateSuccess: 'Катышуу жаңыртылды',
      scheduledClasses: 'Пландалган сабактар',
      found: (count) => `${count} табылды`,
      loadingClassesTitle: 'Пландалган сабактар жүктөлүүдө',
      loadingClassesDescription: 'Тандалган дата үчүн жеткиликтүү сессиялар текшерилүүдө.',
      noClassesTitle: 'Бул датага пландалган сабак жок',
      noClassesDescription: 'Башка датаны тандаңыз же адегенде жадыбал түзүңүз, андан кийин катышуу башкаруусу бул жерде көрүнөт.',
      hasRecords: 'Жазуулар бар',
      unmarked: 'Белгилене элек',
      marked: (count) => `${count} белгиленген`,
      rosterEyebrow: 'Тизме',
      chooseRosterTitle: 'Тизмени ачуу үчүн сабак тандаңыз',
      chooseRosterDescription: 'Катышууну белгилөө үчүн сол жактагы панелден бир сабакты тандаңыз.',
      loadingRosterTitle: 'Тизме жүктөлүүдө',
      loadingRosterDescription: 'Бул сабак үчүн студенттер тизмеси жана сакталган катышуу абалы даярдалууда.',
      rosterFallback: 'Тизме',
      noGroup: 'Топ жок',
      quickTitle: 'Тез белгилөө',
      quickDescription: 'Толук тизмени жылдырбай эле студент ID же атын киргизип катышууну белгилеңиз.',
      currentClass: 'Учурдагы сабак',
      lookupStudent: 'Студентти издөө',
      lookupPlaceholder: 'Студент ID, аты же подтоп',
      lookupAria: 'Катышуу үчүн тез издөө',
      noQuickMatch: 'Бул издөө боюнча студент табылган жок. Башка ID, фамилия же подтоп менен аракет кылыңыз.',
      saved: 'Сакталган',
      draft: 'Черновик',
      startTyping: 'Тандалган сабактагы студентти табуу үчүн жаза баштаңыз.',
      student: 'Студент',
      searchPlaceholder: 'Аты, студент ID, топ',
      searchAria: 'Катышуу тизмесиндеги студенттерди издөө',
      rows: 'Саптар',
      allRows: 'Бардык саптар',
      onlyPending: 'Күтүүдөгүлөр гана',
      visibleAction: 'Көрүнгөндөр үчүн аракет',
      applyVisible: 'Көрүнгөндөргө колдонуу',
      clearVisible: 'Көрүнгөндөрдү тазалоо',
      noVisibleStudents: 'Азыр көрүнгөн студент жок',
      visibleStudents: (count) => `${count} көрүнгөн студент`,
      comfortView: 'Кеңири көрүнүш',
      compactView: 'Ыкчам көрүнүш',
      cards: 'Карталар',
      table: 'Таблица',
      reset: 'Калыбына келтирүү',
      emptyFilterTitle: 'Учурдагы чыпкага ылайык студент табылган жок',
      emptyFilterDescription: 'Толук тизмени кайра ачуу үчүн издөө же сап чыпкасын тазалаңыз.',
      emptyRosterDescription: 'Тандалган сабактын тизмесинде азырынча студент жок.',
      clearFilters: 'Чыпкаларды тазалоо',
      showingStudents: (visible, total) => `${total} студенттин ичинен ${visible} көрсөтүлүүдө`,
      tableHint: 'Таблица режими тизмени тез белгилөө үчүн ыңгайлаштырылган',
      rosterHint: 'Сактоо баскычы эмес, тизме гана жылдырылат',
      quickSet: 'Тез коюу',
      setStatus: 'Статус коюу',
      saveHint: (saved, total, visible) => `Сакталган: ${saved} / ${total} | Азыр көрүнгөнү: ${visible}`,
      saving: 'Сакталып жатат...',
      saveAttendance: 'Катышууну сактоо',
      chooseStatusFirst: 'Сактоодон мурун жок дегенде бир катышуу статусун тандаңыз.',
      savedStudent: (name, status) => `${name} үчүн статус: ${status}.`,
      saveSuccess: (count) => `${count} студент үчүн катышуу сакталды.`,
      failedLoadAnalytics: 'Катышуу аналитикасын жүктөө мүмкүн болгон жок',
      failedLoadSessions: 'Катышуу сессияларын жүктөө мүмкүн болгон жок',
      failedLoadRoster: 'Катышуу тизмесин жүктөө мүмкүн болгон жок',
      failedSave: 'Катышууну сактоо мүмкүн болгон жок'
    },
    studentView: {
      missingStudentId: 'Бул аккаунт үчүн студент ID жок.',
      failedLoad: 'Катышууну жүктөө мүмкүн болгон жок',
      title: 'Катышуу',
      unavailableTitle: 'Катышуу жеткиликсиз',
      unavailableSubtitle: 'CampusOS бул аккаунт үчүн катышуу тарыхын жүктөй алган жок.',
      myTitle: 'Менин катышуум',
      mySubtitle: 'Сабакка катышууңузду, кечигүүлөрдү, уруксат берилген сабактарды жана калтырылган сабактарды көзөмөлдөңүз.',
      attendanceRate: 'Катышуу пайызы',
      totalRecords: 'Жалпы жазуулар',
      historyTitle: 'Катышуу тарыхы',
      allStatuses: 'Бардык статустар',
      emptyTitle: 'Учурдагы чыпкага ылайык жазуу жок',
      emptyDescriptionFiltered: 'Толук катышуу тарыхын кайра ачуу үчүн статус чыпкасын тазалаңыз.',
      emptyDescriptionFresh: 'Окутуучулар сабактарыңызды белгилей баштагандан кийин катышуу жазуулары бул жерде көрүнөт.',
      resetFilter: 'Чыпканы тазалоо',
      classSession: 'Сабак сессиясы',
      noRoom: 'Аудитория жок',
      markedBy: (name) => `${name} тарабынан белгиленди`,
      loading: 'Жүктөлүүдө...'
    }
  }
};

const getStatusOptions = (language = 'English') => (ATTENDANCE_COPY[language] || ATTENDANCE_COPY.English).statusOptions;
const getStatusLabels = (language = 'English') => (ATTENDANCE_COPY[language] || ATTENDANCE_COPY.English).statusLabels;

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

const shiftDate = (value, dayOffset) => {
  const [year, month, day] = String(value || getTodayDate()).split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + dayOffset);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
};

const createDefaultAnalyticsRange = () => {
  const to = getTodayDate();
  return {
    from: shiftDate(to, -29),
    to
  };
};

const formatDate = (value, locale = 'en-GB', fallback = 'No date') => {
  if (!value) return fallback;

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value));
};

const formatPercentage = (value) => `${Math.round(Number(value) || 0)}%`;

const buildStudentSearchText = (student) => (
  [
    student?.name,
    student?.student_id,
    student?.group_name,
    student?.subgroup_name
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
);

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

function StatusBadge({ status, labels }) {
  const normalizedStatus = status || 'unmarked';
  return (
    <span className={`att-status-badge ${normalizedStatus}`}>
      {labels[normalizedStatus] || labels.unmarked}
    </span>
  );
}

function AttendanceQuickStatusButtons({ value, onChange, compact = false, statusOptions, clearLabel, clearTitle }) {
  return (
    <div className={`att-status-matrix ${compact ? 'compact' : ''}`}>
      {statusOptions.map((option) => (
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
        title={clearTitle}
      >
        {clearLabel}
      </button>
    </div>
  );
}

function AttendanceSummary({ summary, labels }) {
  const cards = [
    { label: labels[0], value: summary.marked },
    { label: labels[1], value: summary.present },
    { label: labels[2], value: summary.late },
    { label: labels[3], value: summary.excused },
    { label: labels[4], value: summary.absent },
    { label: labels[5], value: summary.unmarked }
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

function AttendanceAnalyticsPanel({
  analytics,
  analyticsRange,
  analyticsError,
  loadingAnalytics,
  onAnalyticsRangeChange,
  locale = 'en-GB',
  copy
}) {
  const a = copy.analytics;
  const summaryCards = analytics ? [
    { label: a.summaryLabels[0], value: formatPercentage(analytics.summary.attendanceRate) },
    { label: a.summaryLabels[1], value: analytics.summary.totalRecords },
    { label: a.summaryLabels[2], value: analytics.summary.studentsTracked },
    { label: a.summaryLabels[3], value: analytics.summary.coursesTracked },
    { label: a.summaryLabels[4], value: analytics.summary.groupsTracked },
    { label: a.summaryLabels[5], value: analytics.summary.atRiskStudents }
  ] : [];

  return (
    <section className="att-panel att-analytics-panel">
      <div className="att-panel-head att-analytics-head">
        <div>
          <h3>{a.title}</h3>
          <p>{a.subtitle}</p>
        </div>

        <div className="att-analytics-range">
          <label className="att-filter">
            <span>{a.from}</span>
            <input
              type="date"
              value={analyticsRange.from}
              onChange={(event) => onAnalyticsRangeChange('from', event.target.value)}
            />
          </label>
          <label className="att-filter">
            <span>{a.to}</span>
            <input
              type="date"
              value={analyticsRange.to}
              onChange={(event) => onAnalyticsRangeChange('to', event.target.value)}
            />
          </label>
        </div>
      </div>

      <StatusBanner tone="error" title={a.unavailable} message={analyticsError} />

      {loadingAnalytics ? (
        <EmptyState
          eyebrow="Analytics"
          title={a.buildingTitle}
          description={a.buildingDescription}
          compact
          className="att-inline-empty"
        />
      ) : !analytics ? (
        <EmptyState
          eyebrow="Analytics"
          title={a.emptyTitle}
          description={a.emptyDescription}
          compact
          className="att-inline-empty"
        />
      ) : (
        <>
          <div className="att-summary-grid att-summary-grid-analytics">
            {summaryCards.map((card) => (
              <div key={card.label} className="att-summary-card">
                <strong>{card.value}</strong>
                <span>{card.label}</span>
              </div>
            ))}
          </div>

          <div className="att-analytics-grid">
            <section className="att-analytics-card">
              <div className="att-analytics-card-head">
                <h4>Daily trend</h4>
                <span>{a.activeDays(analytics.trend.length)}</span>
              </div>
              {analytics.trend.length === 0 ? (
                <EmptyState
                  eyebrow="Trend"
                  title={a.noMarkedTitle}
                  description={a.noMarkedDescription}
                  compact
                  className="att-inline-empty"
                />
              ) : (
                <div className="att-analytics-list">
                  {analytics.trend.map((entry) => (
                    <article key={entry.date} className="att-analytics-row">
                      <div className="att-analytics-main">
                        <strong>{formatDate(entry.date, locale, copy.noDate)}</strong>
                        <span>
                          {a.recordsAbsent(entry.totalRecords, entry.absent)}
                        </span>
                      </div>
                      <div className="att-analytics-kpi">
                        <strong>{formatPercentage(entry.attendanceRate)}</strong>
                        <div className="att-analytics-meter" aria-hidden="true">
                          <span style={{ width: `${entry.attendanceRate}%` }} />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="att-analytics-card">
              <div className="att-analytics-card-head">
                <h4>{a.watchlist}</h4>
                <span>{a.watchlistHint}</span>
              </div>
              {analytics.courseBreakdown.length === 0 ? (
                <EmptyState
                  eyebrow="Courses"
                  title={a.noCourseTitle}
                  description={a.noCourseDescription}
                  compact
                  className="att-inline-empty"
                />
              ) : (
                <div className="att-analytics-list">
                  {analytics.courseBreakdown.map((entry) => (
                    <article
                      key={`${entry.courseId || entry.courseCode || entry.subject}-${entry.groupName}`}
                      className="att-analytics-row"
                    >
                      <div className="att-analytics-main">
                        <strong>{entry.courseName || entry.courseCode || entry.subject || a.courseFallback}</strong>
                        <span>{a.courseRecords(entry.groupName, entry.totalRecords)}</span>
                      </div>
                      <div className="att-analytics-kpi">
                        <strong>{formatPercentage(entry.attendanceRate)}</strong>
                        <small>{a.absentOnly(entry.absent)}</small>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="att-analytics-card">
              <div className="att-analytics-card-head">
                <h4>{a.groupsAndStudents}</h4>
                <span>{a.studentAlerts(analytics.riskStudents.length)}</span>
              </div>

              <div className="att-analytics-section">
                {analytics.groupBreakdown.length === 0 ? null : (
                  <div className="att-analytics-subsection">
                    <h5>{a.groupSnapshot}</h5>
                    <div className="att-analytics-list compact">
                      {analytics.groupBreakdown.slice(0, 4).map((entry) => (
                        <article key={entry.groupName} className="att-analytics-row compact">
                          <div className="att-analytics-main">
                            <strong>{entry.groupName}</strong>
                            <span>{a.studentsTracked(entry.studentsTracked)}</span>
                          </div>
                          <div className="att-analytics-kpi">
                            <strong>{formatPercentage(entry.attendanceRate)}</strong>
                            <small>{a.absentOnly(entry.absent)}</small>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                <div className="att-analytics-subsection">
                  <h5>{a.studentAlertsTitle}</h5>
                  {analytics.riskStudents.length === 0 ? (
                    <p className="att-analytics-note">
                      {a.noRisk}
                    </p>
                  ) : (
                    <div className="att-analytics-list compact">
                      {analytics.riskStudents.map((entry) => (
                        <article key={entry.studentId || entry.studentName} className="att-analytics-row compact risk">
                          <div className="att-analytics-main">
                            <strong>{entry.studentName}</strong>
                            <span>
                              {entry.studentId || a.noStudentId}
                              {entry.groupName ? ` | ${entry.groupName}` : ''}
                            </span>
                            {entry.courseLabels?.length ? (
                              <small>{entry.courseLabels.join(' | ')}</small>
                            ) : null}
                          </div>
                          <div className="att-analytics-kpi">
                            <strong>{formatPercentage(entry.attendanceRate)}</strong>
                            <small>{a.absentLate(entry.absent, entry.late)}</small>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </section>
  );
}

function TeacherAttendance({ user, language = 'English', locale = 'en-GB' }) {
  const copy = ATTENDANCE_COPY[language] || ATTENDANCE_COPY.English;
  const statusOptions = getStatusOptions(language);
  const statusLabels = getStatusLabels(language);
  const initialPreferences = readAttendancePreferences();
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [analyticsRange, setAnalyticsRange] = useState(createDefaultAnalyticsRange);
  const [analytics, setAnalytics] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [draftStatuses, setDraftStatuses] = useState({});
  const [savedSummary, setSavedSummary] = useState(EMPTY_SUMMARY);
  const [search, setSearch] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [analyticsError, setAnalyticsError] = useState('');
  const [notice, setNotice] = useState('');
  const [compactMode, setCompactMode] = useState(initialPreferences.compactMode);
  const [rosterFilter, setRosterFilter] = useState(initialPreferences.rosterFilter);
  const [layoutMode, setLayoutMode] = useState(initialPreferences.layoutMode);
  const [bulkStatus, setBulkStatus] = useState('present');
  const [quickQuery, setQuickQuery] = useState('');
  const [quickStudentId, setQuickStudentId] = useState('');

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
    const loadAnalytics = async () => {
      try {
        setLoadingAnalytics(true);
        setAnalyticsError('');

        const response = await api.getAttendanceAnalytics(analyticsRange.from, analyticsRange.to);
        setAnalytics(response);
      } catch (requestError) {
        setAnalytics(null);
        setAnalyticsError(requestError.message || copy.teacher.failedLoadAnalytics);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    loadAnalytics();
  }, [analyticsRange.from, analyticsRange.to, copy.teacher.failedLoadAnalytics]);

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
        setError(requestError.message || copy.teacher.failedLoadSessions);
        setSessions([]);
        setSelectedSessionId(null);
      } finally {
        setLoadingSessions(false);
      }
    };

    loadSessions();
  }, [copy.teacher.failedLoadSessions, selectedDate]);

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
        setError(requestError.message || copy.teacher.failedLoadRoster);
        setSelectedSession(null);
        setStudents([]);
        setDraftStatuses({});
        setSavedSummary(EMPTY_SUMMARY);
      } finally {
        setLoadingRoster(false);
      }
    };

    loadRoster();
  }, [copy.teacher.failedLoadRoster, selectedDate, selectedSessionId]);

  const filteredStudents = students.filter((student) => {
    const matchesSearch = buildStudentSearchText(student).includes(search.trim().toLowerCase());
    const currentStatus = draftStatuses[student.student_id] || 'unmarked';
    const matchesFilter = rosterFilter === 'all' || currentStatus === rosterFilter;

    return matchesSearch && matchesFilter;
  });

  const draftSummary = buildDraftSummary(students, draftStatuses);
  const isAdmin = hasAdminAccess(user);
  const hasRosterFilters = rosterFilter !== 'all' || search.trim() !== '';
  const visibleCount = filteredStudents.length;
  const quickMatches = quickQuery.trim()
    ? students.filter((student) => buildStudentSearchText(student).includes(quickQuery.trim().toLowerCase())).slice(0, 6)
    : [];
  const activeQuickStudent = quickMatches.find((student) => String(student.student_id) === String(quickStudentId))
    || quickMatches[0]
    || null;
  const activeQuickDraft = activeQuickStudent ? (draftStatuses[activeQuickStudent.student_id] || '') : '';
  const handleAnalyticsRangeChange = (field, value) => {
    setAnalyticsRange((current) => {
      if (!value) {
        return current;
      }

      if (field === 'from') {
        return {
          from: value,
          to: value > current.to ? value : current.to
        };
      }

      return {
        from: value < current.from ? value : current.from,
        to: value
      };
    });
  };

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

  const handleQuickMark = (status) => {
    if (!activeQuickStudent) {
      return;
    }

    setStudentDraftStatus(activeQuickStudent.student_id, status);
    setError('');
      setNotice(copy.teacher.savedStudent(activeQuickStudent.name, statusLabels[status]));
    setQuickQuery('');
    setQuickStudentId('');
  };

  const handleSave = async () => {
    const records = students
      .map((student) => ({
        studentId: student.student_id,
        status: draftStatuses[student.student_id]
      }))
      .filter((record) => record.studentId && record.status);

    if (records.length === 0) {
      setError(copy.teacher.chooseStatusFirst);
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
      setNotice(copy.teacher.saveSuccess(records.length));

      const sessionsResponse = await api.getAttendanceSessions(selectedDate);
      setSessions(sessionsResponse.sessions || []);

      if (selectedDate >= analyticsRange.from && selectedDate <= analyticsRange.to) {
        const analyticsResponse = await api.getAttendanceAnalytics(analyticsRange.from, analyticsRange.to);
        setAnalytics(analyticsResponse);
      }
    } catch (requestError) {
      setError(requestError.message || copy.teacher.failedSave);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="att-shell">
      <div className="att-header">
        <div>
          <h2>{copy.teacher.title}</h2>
          <p>
            {isAdmin
              ? copy.teacher.adminSubtitle
              : copy.teacher.teacherSubtitle}
          </p>
        </div>
        <div className="att-date-card">
          <label htmlFor="attendance-date">{copy.teacher.attendanceDate}</label>
          <input
            id="attendance-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
          <span>{formatDate(selectedDate, locale, copy.noDate)}</span>
        </div>
      </div>

      <StatusBanner tone="error" title={copy.teacher.updateError} message={error} />
      <StatusBanner tone="success" title={copy.teacher.updateSuccess} message={notice} />

      <AttendanceAnalyticsPanel
        analytics={analytics}
        analyticsRange={analyticsRange}
        analyticsError={analyticsError}
        loadingAnalytics={loadingAnalytics}
        onAnalyticsRangeChange={handleAnalyticsRangeChange}
        locale={locale}
        copy={copy}
      />

      <div className="att-management-grid">
        <section className="att-panel att-session-panel">
          <div className="att-panel-head">
            <h3>{copy.teacher.scheduledClasses}</h3>
            <span>{copy.teacher.found(sessions.length)}</span>
          </div>

          {loadingSessions ? (
            <EmptyState
              eyebrow="Attendance"
              title={copy.teacher.loadingClassesTitle}
              description={copy.teacher.loadingClassesDescription}
              compact
              className="att-inline-empty"
            />
          ) : sessions.length === 0 ? (
            <EmptyState
              eyebrow="Attendance"
              title={copy.teacher.noClassesTitle}
              description={copy.teacher.noClassesDescription}
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
                        {Number(session.marked_count) > 0 ? copy.teacher.hasRecords : copy.teacher.unmarked}
                      </span>
                      <small>{copy.teacher.marked(session.marked_count || 0)}</small>
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
              eyebrow={copy.teacher.rosterEyebrow}
              title={copy.teacher.chooseRosterTitle}
              description={copy.teacher.chooseRosterDescription}
              compact
              className="att-inline-empty"
            />
          ) : loadingRoster ? (
            <EmptyState
              eyebrow={copy.teacher.rosterEyebrow}
              title={copy.teacher.loadingRosterTitle}
              description={copy.teacher.loadingRosterDescription}
              compact
              className="att-inline-empty"
            />
          ) : (
            <>
              <div className="att-panel-head att-roster-head">
                <div>
                  <h3>{selectedSession?.course_name || selectedSession?.subject || copy.teacher.rosterFallback}</h3>
                  <p>
                    {selectedSession?.day} | {selectedSession?.time_slot}
                    {selectedSession?.room ? ` | ${selectedSession.room}` : ''}
                  </p>
                </div>
                <div className="att-roster-tags">
                  <span>{selectedSession?.group_name || copy.teacher.noGroup}</span>
                  {selectedSession?.subgroup_name ? <span>{selectedSession.subgroup_name}</span> : null}
                </div>
              </div>

              <AttendanceSummary summary={draftSummary} labels={copy.summaryCards} />

              <section className="att-quick-mark">
                <div className="att-quick-mark-head">
                  <div>
                    <h4>{copy.teacher.quickTitle}</h4>
                    <p>{copy.teacher.quickDescription}</p>
                  </div>
                  <span>{selectedSession?.group_name || copy.teacher.currentClass}</span>
                </div>

                <label className="att-search att-quick-mark-search">
                  <span>{copy.teacher.lookupStudent}</span>
                  <input
                    type="search"
                    value={quickQuery}
                    onChange={(event) => {
                      setQuickQuery(event.target.value);
                      setQuickStudentId('');
                    }}
                    placeholder={copy.teacher.lookupPlaceholder}
                    aria-label={copy.teacher.lookupAria}
                  />
                </label>

                {quickQuery.trim() ? (
                  <>
                    <div className="att-quick-mark-list">
                      {quickMatches.length > 0 ? (
                        quickMatches.map((student) => {
                          const isActive = activeQuickStudent && String(activeQuickStudent.student_id) === String(student.student_id);
                          return (
                            <button
                              key={student.student_id}
                              type="button"
                              className={`att-quick-match ${isActive ? 'active' : ''}`}
                              onClick={() => setQuickStudentId(student.student_id)}
                            >
                              <strong>{student.name}</strong>
                              <span>
                                {student.student_id}
                                {student.subgroup_name ? ` | ${student.subgroup_name}` : ''}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="att-quick-empty">
                          {copy.teacher.noQuickMatch}
                        </div>
                      )}
                    </div>

                    {activeQuickStudent ? (
                      <div className="att-quick-mark-current">
                        <div>
                          <strong>{activeQuickStudent.name}</strong>
                          <span>
                            {activeQuickStudent.student_id}
                            {activeQuickStudent.group_name ? ` | ${activeQuickStudent.group_name}` : ''}
                            {activeQuickStudent.subgroup_name ? ` | ${activeQuickStudent.subgroup_name}` : ''}
                          </span>
                        </div>
                        <div className="att-quick-mark-statuses">
                          <span>{copy.teacher.saved}: <StatusBadge status={activeQuickStudent.status} labels={statusLabels} /></span>
                          <span>{copy.teacher.draft}: <StatusBadge status={activeQuickDraft || 'unmarked'} labels={statusLabels} /></span>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="att-quick-empty">
                    {copy.teacher.startTyping}
                  </div>
                )}

                <div className="att-quick-mark-actions">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`att-quick-mark-btn ${option.value}`}
                      onClick={() => handleQuickMark(option.value)}
                      disabled={!activeQuickStudent}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>

              <div className="att-toolbar">
                <div className="att-toolbar-main">
                  <label className="att-search">
                    <span>{copy.teacher.student}</span>
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={copy.teacher.searchPlaceholder}
                      aria-label={copy.teacher.searchAria}
                    />
                  </label>

                  <label className="att-filter">
                    <span>{copy.teacher.rows}</span>
                    <select value={rosterFilter} onChange={(event) => setRosterFilter(event.target.value)}>
                      <option value="all">{copy.teacher.allRows}</option>
                      <option value="unmarked">{copy.teacher.onlyPending}</option>
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="att-toolbar-secondary">
                  <div className="att-bulk-actions">
                    <label className="att-filter att-filter-compact">
                      <span>{copy.teacher.visibleAction}</span>
                      <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)}>
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => applyStatusToVisible(bulkStatus)}
                      disabled={visibleCount === 0}
                    >
                      {copy.teacher.applyVisible}
                    </button>
                    <button
                      type="button"
                      onClick={() => applyStatusToVisible('')}
                      disabled={visibleCount === 0}
                    >
                      {copy.teacher.clearVisible}
                    </button>
                    <span className="att-toolbar-note">
                      {visibleCount === 0
                        ? copy.teacher.noVisibleStudents
                        : copy.teacher.visibleStudents(visibleCount)}
                    </span>
                  </div>

                  <div className="att-quick-actions">
                    <button type="button" onClick={() => setCompactMode((value) => !value)}>
                      {compactMode ? copy.teacher.comfortView : copy.teacher.compactView}
                    </button>
                    <div className="att-layout-switch" role="tablist" aria-label="Attendance layout">
                      <button
                        type="button"
                        className={layoutMode === 'cards' ? 'active' : ''}
                        onClick={() => setLayoutMode('cards')}
                      >
                        {copy.teacher.cards}
                      </button>
                      <button
                        type="button"
                        className={layoutMode === 'table' ? 'active' : ''}
                        onClick={() => setLayoutMode('table')}
                      >
                        {copy.teacher.table}
                      </button>
                    </div>
                    <button type="button" onClick={resetDraftToSaved}>{copy.teacher.reset}</button>
                  </div>
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <EmptyState
                  eyebrow={copy.teacher.rosterEyebrow}
                  title={copy.teacher.emptyFilterTitle}
                  description={hasRosterFilters ? copy.teacher.emptyFilterDescription : copy.teacher.emptyRosterDescription}
                  actionLabel={hasRosterFilters ? copy.teacher.clearFilters : ''}
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
                    <span>{copy.teacher.showingStudents(filteredStudents.length, students.length)}</span>
                    <span>{layoutMode === 'table' ? copy.teacher.tableHint : copy.teacher.rosterHint}</span>
                  </div>
                  {layoutMode === 'table' ? (
                    <div className="att-roster-table-shell">
                      <table className="att-roster-table">
                        <caption className="sr-only">Attendance roster table</caption>
                        <thead>
                          <tr>
                            <th scope="col">{copy.teacher.student}</th>
                            <th scope="col">{copy.teacher.saved}</th>
                            <th scope="col">{copy.teacher.draft}</th>
                            <th scope="col">{copy.teacher.quickSet}</th>
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
                                <td><StatusBadge status={student.status} labels={statusLabels} /></td>
                                <td><StatusBadge status={draftValue || 'unmarked'} labels={statusLabels} /></td>
                                <td>
                                  <AttendanceQuickStatusButtons
                                    compact
                                    value={draftValue}
                                    onChange={(status) => setStudentDraftStatus(student.student_id, status)}
                                    statusOptions={statusOptions}
                                    clearLabel={copy.clear}
                                    clearTitle={copy.clearDraftStatus}
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
                            <small>{copy.teacher.saved}</small>
                            <StatusBadge status={student.status} labels={statusLabels} />
                          </div>

                          <div className="att-status-select">
                            <span>{copy.teacher.setStatus}</span>
                            <AttendanceQuickStatusButtons
                              value={draftStatuses[student.student_id] || ''}
                              onChange={(status) => setStudentDraftStatus(student.student_id, status)}
                              statusOptions={statusOptions}
                              clearLabel={copy.clear}
                              clearTitle={copy.clearDraftStatus}
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
                  {copy.teacher.saveHint(savedSummary.marked, savedSummary.total, filteredStudents.length)}
                </div>
                <button
                  type="button"
                  className="att-save-btn"
                  onClick={handleSave}
                  disabled={saving || students.length === 0}
                >
                  {saving ? copy.teacher.saving : copy.teacher.saveAttendance}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function StudentAttendance({ user, language = 'English', locale = 'en-GB' }) {
  const copy = ATTENDANCE_COPY[language] || ATTENDANCE_COPY.English;
  const statusOptions = getStatusOptions(language);
  const statusLabels = getStatusLabels(language);
  const [attendance, setAttendance] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAttendance = async () => {
      const studentId = user?.studentId || user?.student_id;

      if (!studentId) {
        setError(copy.studentView.missingStudentId);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await api.getStudentAttendance(studentId);
        setAttendance(response.attendance || []);
      } catch (requestError) {
        setError(requestError.message || copy.studentView.failedLoad);
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [copy.studentView.failedLoad, copy.studentView.missingStudentId, user]);

  if (loading) {
    return <div className="loading-spinner">{copy.studentView.loading}</div>;
  }

  if (error) {
    return (
      <div className="att-shell">
        <div className="att-header">
          <div>
            <h2>{copy.studentView.title}</h2>
            <p>{copy.studentView.unavailableSubtitle}</p>
          </div>
        </div>
        <StatusBanner tone="error" title={copy.studentView.unavailableTitle} message={error} />
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
          <h2>{copy.studentView.myTitle}</h2>
          <p>{copy.studentView.mySubtitle}</p>
        </div>
        <div className="att-rate-card">
          <strong>{stats.attendanceRate}%</strong>
          <span>{copy.studentView.attendanceRate}</span>
        </div>
      </div>

      <div className="att-summary-grid">
        <div className="att-summary-card"><strong>{stats.total}</strong><span>{copy.studentView.totalRecords}</span></div>
        <div className="att-summary-card"><strong>{stats.present}</strong><span>{statusLabels.present}</span></div>
        <div className="att-summary-card"><strong>{stats.late}</strong><span>{statusLabels.late}</span></div>
        <div className="att-summary-card"><strong>{stats.excused}</strong><span>{statusLabels.excused}</span></div>
        <div className="att-summary-card"><strong>{stats.absent}</strong><span>{statusLabels.absent}</span></div>
      </div>

      <section className="att-panel">
        <div className="att-panel-head">
          <h3>{copy.studentView.historyTitle}</h3>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">{copy.studentView.allStatuses}</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {filteredAttendance.length === 0 ? (
          <EmptyState
            eyebrow={copy.studentView.historyTitle}
            title={copy.studentView.emptyTitle}
            description={hasHistoryFilter ? copy.studentView.emptyDescriptionFiltered : copy.studentView.emptyDescriptionFresh}
            actionLabel={hasHistoryFilter ? copy.studentView.resetFilter : ''}
            onAction={() => setStatusFilter('all')}
            compact
            className="att-inline-empty"
          />
        ) : (
          <div className="att-history-list">
            {filteredAttendance.map((item) => (
              <article key={`${item.schedule_id}-${item.date}`} className="att-history-card">
                <div className="att-history-main">
                  <strong>{item.course_name || item.subject || copy.studentView.classSession}</strong>
                  <span>
                    {formatDate(item.date, locale, copy.noDate)}
                    {item.day ? ` | ${item.day}` : ''}
                    {item.time_slot ? ` | ${item.time_slot}` : ''}
                  </span>
                </div>
                <div className="att-history-meta">
                  {item.room ? <span>{item.room}</span> : <span>{copy.studentView.noRoom}</span>}
                  {item.marked_by_name ? <span>{copy.studentView.markedBy(item.marked_by_name)}</span> : null}
                </div>
                <StatusBadge status={item.status} labels={statusLabels} />
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AttendancePage({ user, language = 'English', locale = 'en-GB' }) {
  const isTeacher = canManageAcademicRecords(user);

  return (
    <div className="attendance-page">
      {isTeacher
        ? <TeacherAttendance user={user} language={language} locale={locale} />
        : <StudentAttendance user={user} language={language} locale={locale} />}
    </div>
  );
}
