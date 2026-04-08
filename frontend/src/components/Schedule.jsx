import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import EmptyState from './EmptyState';
import StatusBanner from './StatusBanner';
import { canManageAcademicRecords, hasAdminAccess, isStudentAccount } from '../roles';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_LABELS = {
  English: {
    Monday: 'Monday',
    Tuesday: 'Tuesday',
    Wednesday: 'Wednesday',
    Thursday: 'Thursday',
    Friday: 'Friday',
    Saturday: 'Saturday'
  },
  Kyrgyz: {
    Monday: 'Дүйшөмбү',
    Tuesday: 'Шейшемби',
    Wednesday: 'Шаршемби',
    Thursday: 'Бейшемби',
    Friday: 'Жума',
    Saturday: 'Ишемби'
  }
};
const MOBILE_DAY_LABELS = {
  English: {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat'
  },
  Kyrgyz: {
    Monday: 'Дүй',
    Tuesday: 'Шей',
    Wednesday: 'Шар',
    Thursday: 'Бей',
    Friday: 'Жум',
    Saturday: 'Иш'
  }
};
const dayAliases = {
  Monday: ['Monday', 'РџРѕРЅРµРґРµР»СЊРЅРёРє'],
  Tuesday: ['Tuesday', 'Р’С‚РѕСЂРЅРёРє'],
  Wednesday: ['Wednesday', 'РЎСЂРµРґР°'],
  Thursday: ['Thursday', 'Р§РµС‚РІРµСЂРі'],
  Friday: ['Friday', 'РџСЏС‚РЅРёС†Р°'],
  Saturday: ['Saturday', 'РЎСѓР±Р±РѕС‚Р°']
};

const timeSlots = [
  '08:00-08:40', '08:45-09:25', '09:30-10:10', '10:15-10:55',
  '11:00-11:40', '11:45-12:25', '12:30-13:10', '13:10-13:55',
  '14:00-14:40', '14:45-15:25', '15:30-16:10', '16:15-16:55',
  '17:00-17:40', '17:45-18:25'
];
const legacyTimeSlotMap = {
  '09:00': ['08:45-09:25', '09:30-10:10'],
  '10:30': ['10:15-10:55', '11:00-11:40'],
  '12:00': ['11:45-12:25', '12:30-13:10'],
  '13:30': ['13:10-13:55', '14:00-14:40'],
  '15:00': ['14:45-15:25', '15:30-16:10'],
  '16:30': ['16:15-16:55', '17:00-17:40']
};

const emptyForm = {
  id: null,
  day: '',
  time_slot: '',
  original_time_slot: '',
  legacy_slots: [],
  group_name: '',
  audience_type: 'group',
  subgroup_name: '',
  student_user_id: '',
  course_id: '',
  subject: '',
  teacher: '',
  room: ''
};
const emptyBatchForm = {
  course_id: '',
  subject: '',
  teacher: '',
  room: ''
};
const SCHEDULE_COPY = {
  English: {
    pageTitle: 'Schedule',
    loading: 'Loading your timetable...',
    teacherNotAssigned: 'Teacher not assigned',
    student: 'Student',
    chooseStudentFirst: 'Choose a student first to create an individual slot.',
    copyNotEnoughSlots: 'Not enough consecutive slots in this day to place the copied class.',
    copyFailed: 'Failed to copy class to the selected slot.',
    conflictPrefix: 'These slots already have classes for this audience:',
    updatedSlots: (count) => `Updated ${count} selected slot${count === 1 ? '' : 's'}.`,
    deletedSlots: (count) => `Deleted ${count} selected slot${count === 1 ? '' : 's'}.`,
    chooseStudent: 'Choose a student',
    chooseGroupShort: 'Choose group',
    notSet: 'Not set',
    personalIntro: (group, subgroup) => `Personal timetable for ${group || 'your group'}${subgroup ? ` / ${subgroup}` : ''}. Course-linked classes appear automatically after enrollment, plus personal overrides.`,
    adminHint: 'Pick a scope, click any cell to edit it, drag a class onto an empty slot to copy it, or switch on batch mode for mass updates.',
    lessonsLoaded: 'Lessons loaded',
    visibleInView: 'Visible in view',
    groups: 'Groups',
    currentScope: 'Current scope',
    existingClass: 'Existing class',
    emptySlot: 'Empty slot',
    clickToManage: 'Click to manage or drag to copy',
    deleteSelected: 'Delete selected',
    groupSchedule: 'Group schedule',
    chooseGroup: 'Choose a group',
    noGroupsYet: 'No groups yet',
    newGroup: '+ New group',
    wholeGroup: 'Whole group',
    subgroup: 'Subgroup',
    individual: 'Individual',
    subgroupSchedule: 'Subgroup schedule',
    chooseSubgroup: 'Choose a subgroup',
    noSubgroupsYet: 'No subgroups yet',
    studentSchedule: 'Student schedule',
    noStudentsInGroup: 'No students in this group',
    courseFilter: 'Course filter',
    allLinkedCourses: 'All linked courses',
    resetView: 'Reset view',
    reset: 'Reset',
    wholeGroupHint: 'Whole group mode edits classes shared by every student in the selected group.',
    subgroupHint: 'Subgroup mode edits classes linked only to the selected subgroup.',
    individualHint: 'Individual mode creates personal schedule overrides for the selected student.',
    yourTimetableSource: 'Your timetable source',
    studentHint: 'Students see a personal timetable built from selected subjects, group classes, subgroup classes, and manual personal slots.',
    classWord: (count) => `class${count === 1 ? '' : 'es'}`,
    roomTbd: 'Room TBD',
    more: (count) => `+${count} more`,
    add: 'Add',
    mobileEmptyEdit: 'No classes yet. Tap Add to create one.',
    mobileEmptyReadOnly: 'No classes scheduled for this day.',
    chooseSubgroupTitle: 'Choose a subgroup to continue',
    chooseSubgroupDescription: 'Pick a subgroup to show the timetable for that audience.',
    chooseStudentTitle: 'Choose a student to continue',
    chooseStudentDescription: 'Pick a student to manage personal schedule overrides.',
    chooseGroupTitle: 'Choose a group to start building the schedule',
    chooseGroupDescription: 'Select or create a group first, then begin placing lessons into the timetable grid.',
    noLessonsTitle: 'No lessons match the current course filter',
    noLessonsDescription: 'Try another course or reset the current view to show all linked timetable entries again.',
    noLessonsAction: 'Clear course filter',
    dropToCopy: 'Drop to copy',
    addClass: '+ Add Class',
    editClass: 'Edit Class',
    addClassTitle: 'Add Class',
    editCopy: 'Edit one existing slot.',
    addCopy: 'Choose one or several hours below to place the same class into all selected slots.',
    day: 'Day',
    timeSlot: 'Time Slot',
    startSlot: 'Start Slot',
    group: 'Group',
    audience: 'Audience',
    subgroupPlaceholder: 'e.g. 1-Group',
    linkedCourse: 'Linked course',
    standaloneManual: 'Standalone / manual',
    subject: 'Subject',
    teacher: 'Teacher',
    room: 'Room',
    applyToHours: 'Apply this class to several hours',
    selected: 'Selected',
    none: 'none',
    delete: 'Delete',
    cancel: 'Cancel',
    update: 'Update',
    createFor: (count) => `Create for ${count} slot${count === 1 ? '' : 's'}`,
    batchEdit: 'Batch Edit Schedule',
    batchCopy: 'Update shared fields for the currently selected schedule slots. Leave a field blank to keep the existing value.',
    subjectOverride: 'Subject override',
    teacherOverride: 'Teacher override',
    roomOverride: 'Room override',
    updateSlots: (count) => `Update ${count} slot${count === 1 ? '' : 's'}`
  },
  Kyrgyz: {
    pageTitle: 'Жадыбал',
    loading: 'Жадыбалыңыз жүктөлүүдө...',
    teacherNotAssigned: 'Окутуучу дайындала элек',
    student: 'Студент',
    chooseStudentFirst: 'Жеке уячаны түзүү үчүн алгач студент тандаңыз.',
    copyNotEnoughSlots: 'Бул күндө көчүрүү үчүн катары менен жетиштүү убакыт уячалары жок.',
    copyFailed: 'Сабакты тандалган уячага көчүрүү мүмкүн болгон жок.',
    conflictPrefix: 'Бул убакыт уячаларында ушул аудитория үчүн сабак бар:',
    updatedSlots: (count) => `${count} тандалган уяча жаңыртылды.`,
    deletedSlots: (count) => `${count} тандалган уяча өчүрүлдү.`,
    chooseStudent: 'Студент тандаңыз',
    chooseGroupShort: 'Топ тандаңыз',
    notSet: 'Орнотулган эмес',
    personalIntro: (group, subgroup) => `${group || 'сиздин топ'}${subgroup ? ` / ${subgroup}` : ''} үчүн жеке жадыбал. Курс менен байланышкан сабактар каттоодон кийин автоматтык түрдө чыгат, жеке өзгөртүүлөр да кошулат.`,
    adminHint: 'Камтуу аймагын тандаңыз, оңдоо үчүн каалаган уячаны басыңыз, көчүрүү үчүн сабакты бош уячага сүйрөңүз же топтук өзгөртүү режимин күйгүзүңүз.',
    lessonsLoaded: 'Жүктөлгөн сабактар',
    visibleInView: 'Көрүнгөн сабактар',
    groups: 'Топтор',
    currentScope: 'Учурдагы көрүнүш',
    existingClass: 'Бар сабак',
    emptySlot: 'Бош уяча',
    clickToManage: 'Башкаруу үчүн басыңыз же көчүрүү үчүн сүйрөңүз',
    deleteSelected: 'Тандалгандарды өчүрүү',
    groupSchedule: 'Топтун жадыбалы',
    chooseGroup: 'Топ тандаңыз',
    noGroupsYet: 'Азырынча топ жок',
    newGroup: '+ Жаңы топ',
    wholeGroup: 'Бүт топ',
    subgroup: 'Подтоп',
    individual: 'Жеке',
    subgroupSchedule: 'Подтоптун жадыбалы',
    chooseSubgroup: 'Подтоп тандаңыз',
    noSubgroupsYet: 'Азырынча подтоп жок',
    studentSchedule: 'Студенттин жадыбалы',
    noStudentsInGroup: 'Бул топто студент жок',
    courseFilter: 'Курс чыпкасы',
    allLinkedCourses: 'Бардык байланышкан курстар',
    resetView: 'Көрүнүштү тазалоо',
    reset: 'Тазалоо',
    wholeGroupHint: 'Бүт топ режими тандалган топтогу бардык студенттерге жалпы болгон сабактарды түзөтөт.',
    subgroupHint: 'Подтоп режими тандалган подтопко гана тиешелүү сабактарды түзөтөт.',
    individualHint: 'Жеке режим тандалган студент үчүн жеке жадыбал өзгөртүүлөрүн түзөт.',
    yourTimetableSource: 'Сиздин жадыбал булагыңыз',
    studentHint: 'Студенттер тандаган предметтеринен, топтук сабактардан, подтоптук сабактардан жана жеке уячалардан түзүлгөн жеке жадыбалды көрүшөт.',
    classWord: () => 'сабак',
    roomTbd: 'Аудитория такталат',
    more: (count) => `+${count} дагы`,
    add: 'Кошуу',
    mobileEmptyEdit: 'Азырынча сабак жок. Түзүү үчүн Кошуу баскычын басыңыз.',
    mobileEmptyReadOnly: 'Бул күнгө сабак коюлган эмес.',
    chooseSubgroupTitle: 'Улантуу үчүн подтоп тандаңыз',
    chooseSubgroupDescription: 'Ошол аудиториянын жадыбалын көрүү үчүн подтопту тандаңыз.',
    chooseStudentTitle: 'Улантуу үчүн студент тандаңыз',
    chooseStudentDescription: 'Жеке жадыбал өзгөртүүлөрүн башкаруу үчүн студентти тандаңыз.',
    chooseGroupTitle: 'Жадыбалды түзүү үчүн топ тандаңыз',
    chooseGroupDescription: 'Алгач топту тандаңыз же түзүңүз, андан кийин сабактарды жадыбалга жайгаштырыңыз.',
    noLessonsTitle: 'Учурдагы курс чыпкасына туура келген сабактар жок',
    noLessonsDescription: 'Башка курсту тандап көрүңүз же бардык байланышкан сабактарды кайра көрсөтүү үчүн көрүнүштү тазалаңыз.',
    noLessonsAction: 'Курс чыпкасын тазалоо',
    dropToCopy: 'Көчүрүү үчүн таштаңыз',
    addClass: '+ Сабак кошуу',
    editClass: 'Сабакты оңдоо',
    addClassTitle: 'Сабак кошуу',
    editCopy: 'Учурдагы бир уячаны оңдоңуз.',
    addCopy: 'Бир эле сабакты бардык тандалган убакыттарга жайгаштыруу үчүн төмөндөн бир же бир нече саатты тандаңыз.',
    day: 'Күн',
    timeSlot: 'Убакыт уячасы',
    startSlot: 'Башталыш уячасы',
    group: 'Топ',
    audience: 'Аудитория',
    subgroupPlaceholder: 'мисалы, 1-Group',
    linkedCourse: 'Байланышкан курс',
    standaloneManual: 'Өзүнчө / кол менен',
    subject: 'Предмет',
    teacher: 'Окутуучу',
    room: 'Аудитория',
    applyToHours: 'Бул сабакты бир нече саатка колдонуу',
    selected: 'Тандалган',
    none: 'жок',
    delete: 'Өчүрүү',
    cancel: 'Жокко чыгаруу',
    update: 'Жаңыртуу',
    createFor: (count) => `${count} уяча үчүн түзүү`,
    batchEdit: 'Жадыбалды топтук оңдоо',
    batchCopy: 'Учурда тандалган жадыбал уячаларынын жалпы талааларын жаңыртыңыз. Маанини өзгөртпөө үчүн талааны бош калтырыңыз.',
    subjectOverride: 'Предметти алмаштыруу',
    teacherOverride: 'Окутуучуну алмаштыруу',
    roomOverride: 'Аудиторияны алмаштыруу',
    updateSlots: (count) => `${count} уячаны жаңыртуу`
  }
};

const normalizeId = (value) => (value === '' || value === null || value === undefined ? '' : String(value));
const getRangeSlots = (startIndex, span = 1) => timeSlots.slice(startIndex, startIndex + span);
const getCourseTeacher = (course, language = 'English') => (
  course?.teacher_name
  || course?.teacher
  || (SCHEDULE_COPY[language] || SCHEDULE_COPY.English).teacherNotAssigned
);
const getDayLabel = (day, language = 'English') => (DAY_LABELS[language] || DAY_LABELS.English)[day] || day;
const getMobileDayLabel = (day, language = 'English') => (MOBILE_DAY_LABELS[language] || MOBILE_DAY_LABELS.English)[day] || day.slice(0, 3);
const getSlotStart = (slot) => String(slot || '').split('-')[0] || slot;
const scheduleCardPalette = [
  {
    bg: 'linear-gradient(135deg, rgba(56, 189, 248, 0.18) 0%, rgba(14, 165, 233, 0.28) 100%)',
    border: 'rgba(14, 165, 233, 0.42)',
    roomBg: 'rgba(2, 132, 199, 0.16)',
    roomText: '#0369a1'
  },
  {
    bg: 'linear-gradient(135deg, rgba(52, 211, 153, 0.16) 0%, rgba(16, 185, 129, 0.28) 100%)',
    border: 'rgba(16, 185, 129, 0.42)',
    roomBg: 'rgba(5, 150, 105, 0.16)',
    roomText: '#047857'
  },
  {
    bg: 'linear-gradient(135deg, rgba(167, 139, 250, 0.16) 0%, rgba(139, 92, 246, 0.28) 100%)',
    border: 'rgba(139, 92, 246, 0.42)',
    roomBg: 'rgba(124, 58, 237, 0.16)',
    roomText: '#6d28d9'
  },
  {
    bg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.16) 0%, rgba(245, 158, 11, 0.28) 100%)',
    border: 'rgba(245, 158, 11, 0.42)',
    roomBg: 'rgba(217, 119, 6, 0.16)',
    roomText: '#b45309'
  },
  {
    bg: 'linear-gradient(135deg, rgba(244, 114, 182, 0.16) 0%, rgba(236, 72, 153, 0.26) 100%)',
    border: 'rgba(236, 72, 153, 0.38)',
    roomBg: 'rgba(219, 39, 119, 0.14)',
    roomText: '#be185d'
  },
  {
    bg: 'linear-gradient(135deg, rgba(129, 140, 248, 0.16) 0%, rgba(99, 102, 241, 0.28) 100%)',
    border: 'rgba(99, 102, 241, 0.4)',
    roomBg: 'rgba(79, 70, 229, 0.14)',
    roomText: '#4338ca'
  }
];

const getScheduleCardTheme = (entry) => {
  const key = `${entry.course_id || ''}${entry.subject || ''}${entry.room || ''}`;
  const hash = key.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return scheduleCardPalette[hash % scheduleCardPalette.length];
};
const getScheduleCardStyle = (entry) => {
  const theme = getScheduleCardTheme(entry);
  return {
    '--schedule-card-bg': theme.bg,
    '--schedule-card-border': theme.border,
    '--schedule-room-bg': theme.roomBg,
    '--schedule-room-text': theme.roomText
  };
};

const normalizeDay = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  const normalizedAliases = {
    понедельник: 'Monday',
    вторник: 'Tuesday',
    среда: 'Wednesday',
    четверг: 'Thursday',
    пятница: 'Friday',
    суббота: 'Saturday'
  };

  if (normalizedAliases[normalized]) {
    return normalizedAliases[normalized];
  }

  const match = Object.entries(dayAliases).find(([, aliases]) => aliases.some((alias) => alias.toLowerCase() === normalized));
  return match ? match[0] : value;
};

const normalizeEntries = (entries) => (
  (entries || []).flatMap((item) => {
    const originalTimeSlot = String(item.time_slot || '').trim();
    const mappedSlots = legacyTimeSlotMap[originalTimeSlot]
      || (timeSlots.includes(originalTimeSlot) ? [originalTimeSlot] : [originalTimeSlot]);

    return mappedSlots.map((renderedSlot) => ({
      ...item,
      day: normalizeDay(item.day),
      time_slot: renderedSlot,
      original_time_slot: originalTimeSlot,
      legacy_slots: mappedSlots,
      student_user_id: item.student_user_id ?? '',
      course_id: item.course_id ?? ''
    }));
  })
);

const getStudentLabel = (student, language = 'English') => {
  if (!student) return (SCHEDULE_COPY[language] || SCHEDULE_COPY.English).student;
  const group = student.group_name || '';
  const subgroup = student.subgroup_name || '';
  return `${student.name}${group ? ` (${group}${subgroup ? ` / ${subgroup}` : ''})` : ''}`;
};

const matchesScope = (item, scope) => {
  const audienceType = item.audience_type || 'group';
  if (audienceType !== scope.audienceType) return false;
  if ((item.group_name || '') !== (scope.groupName || '')) return false;
  if (scope.audienceType === 'subgroup') return (item.subgroup_name || '') === (scope.subgroupName || '');
  if (scope.audienceType === 'individual') return Number(item.student_user_id || 0) === Number(scope.studentUserId || 0);
  return true;
};

function Schedule({ language = 'English' }) {
  const copy = SCHEDULE_COPY[language] || SCHEDULE_COPY.English;
  const [schedule, setSchedule] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedAudienceView, setSelectedAudienceView] = useState('group');
  const [selectedSubgroup, setSelectedSubgroup] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('');
  const [showCustomGroupInput, setShowCustomGroupInput] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState({ type: '', message: '' });
  const [batchSelectMode, setBatchSelectMode] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [showBatchEditor, setShowBatchEditor] = useState(false);
  const [batchForm, setBatchForm] = useState(emptyBatchForm);

  const canEdit = canManageAcademicRecords(user);
  const isAdmin = hasAdminAccess(user);
  const isStudent = isStudentAccount(user);
  const studentGroup = user?.group_name || user?.group || '';
  const studentSubgroup = user?.subgroup_name || user?.subgroup || '';

  const courseOptions = useMemo(() => [...courses].sort((a, b) => a.name.localeCompare(b.name)), [courses]);
  const groupOptions = useMemo(() => {
    const groups = new Set();
    schedule.forEach((item) => { if (item.group_name && item.group_name !== 'INDIVIDUAL') groups.add(item.group_name); });
    students.forEach((item) => { if (item.group_name) groups.add(item.group_name); });
    if (studentGroup) groups.add(studentGroup);
    return Array.from(groups).sort((a, b) => a.localeCompare(b));
  }, [schedule, students, studentGroup]);
  const subgroupOptions = useMemo(() => {
    if (!selectedGroup) return [];
    const subgroups = new Set();
    schedule.forEach((item) => {
      if (item.group_name === selectedGroup && (item.audience_type || 'group') === 'subgroup' && item.subgroup_name) {
        subgroups.add(item.subgroup_name);
      }
    });
    students.forEach((item) => {
      if (item.group_name === selectedGroup && item.subgroup_name) {
        subgroups.add(item.subgroup_name);
      }
    });
    if (studentGroup === selectedGroup && studentSubgroup) subgroups.add(studentSubgroup);
    return Array.from(subgroups).sort((a, b) => a.localeCompare(b));
  }, [schedule, selectedGroup, students, studentGroup, studentSubgroup]);
  const studentOptions = useMemo(
    () => students.filter((item) => !selectedGroup || item.group_name === selectedGroup).sort((a, b) => a.name.localeCompare(b.name)),
    [selectedGroup, students]
  );

  const visibleSchedule = useMemo(() => {
    if (isStudent) return schedule;
    if (selectedAudienceView === 'individual') {
      return schedule.filter((item) => (
        (item.audience_type || 'group') === 'individual'
        && (!selectedGroup || item.group_name === selectedGroup)
        && (!selectedStudentId || Number(item.student_user_id || 0) === Number(selectedStudentId || 0))
      ));
    }
    if (!selectedGroup) return [];
    return schedule.filter((item) => {
      if (item.group_name !== selectedGroup) return false;
      const audienceType = item.audience_type || 'group';
      if (selectedAudienceView === 'subgroup') return audienceType === 'subgroup' && item.subgroup_name === selectedSubgroup;
      return audienceType === 'group';
    });
  }, [isStudent, schedule, selectedAudienceView, selectedGroup, selectedStudentId, selectedSubgroup]);
  const filteredSchedule = useMemo(() => (
    selectedCourseFilter
      ? visibleSchedule.filter((item) => String(item.course_id || '') === String(selectedCourseFilter))
      : visibleSchedule
  ), [selectedCourseFilter, visibleSchedule]);
  const overviewByDay = useMemo(() => (
    days
      .map((day) => ({
        day,
        items: filteredSchedule
          .filter((item) => item.day === day)
          .sort((left, right) => timeSlots.indexOf(left.time_slot) - timeSlots.indexOf(right.time_slot))
      }))
      .filter((section) => section.items.length > 0)
  ), [filteredSchedule]);
  const mobileScheduleSections = useMemo(() => {
    const sections = days.map((day) => ({
      day,
      items: filteredSchedule
        .filter((item) => item.day === day)
        .sort((left, right) => timeSlots.indexOf(left.time_slot) - timeSlots.indexOf(right.time_slot))
    }));

    return canEdit ? sections : sections.filter((section) => section.items.length > 0);
  }, [canEdit, filteredSchedule]);
  const mobileDayTabs = useMemo(() => (
    mobileScheduleSections.map((section) => ({
      day: section.day,
      shortLabel: getMobileDayLabel(section.day, language),
      count: section.items.length
    }))
  ), [language, mobileScheduleSections]);
  const [activeMobileDay, setActiveMobileDay] = useState(days[0]);
  const activeMobileSection = useMemo(() => (
    mobileScheduleSections.find((section) => section.day === activeMobileDay)
    || mobileScheduleSections[0]
    || null
  ), [activeMobileDay, mobileScheduleSections]);

  const scheduleMap = useMemo(() => new Map(filteredSchedule.map((item) => [`${item.day}__${item.time_slot}`, item])), [filteredSchedule]);
  const mergedBlocks = useMemo(() => {
    const signature = (item) => [item.subject, item.teacher, item.room, item.group_name, item.audience_type || 'group', item.subgroup_name || '', item.student_user_id || '', item.course_id || ''].join('||');
    const blocks = [];
    days.forEach((day, dayIndex) => {
      let slotIndex = 0;
      while (slotIndex < timeSlots.length) {
        const current = scheduleMap.get(`${day}__${timeSlots[slotIndex]}`);
        if (!current) {
          blocks.push({ type: 'empty', day, dayIndex, startIndex: slotIndex, span: 1, startSlot: timeSlots[slotIndex] });
          slotIndex += 1;
          continue;
        }
        let span = 1;
        while (slotIndex + span < timeSlots.length) {
          const next = scheduleMap.get(`${day}__${timeSlots[slotIndex + span]}`);
          if (!next || signature(next) !== signature(current)) break;
          span += 1;
        }
        const entryIds = getRangeSlots(slotIndex, span)
          .map((slot) => scheduleMap.get(`${day}__${slot}`)?.id)
          .filter(Boolean);
        blocks.push({
          type: 'occupied',
          day,
          dayIndex,
          startIndex: slotIndex,
          span,
          startSlot: timeSlots[slotIndex],
          endSlot: timeSlots[slotIndex + span - 1],
          entry: current,
          entryIds
        });
        slotIndex += span;
      }
    });
    return blocks;
  }, [scheduleMap]);

  const loadSchedule = async () => {
    const response = await api.getSchedule();
    const entries = normalizeEntries(response?.schedule || []);
    setSchedule(entries);
    return entries;
  };

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('lms_user'));
    setUser(savedUser);
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [scheduleResponse, courseResponse, usersResponse] = await Promise.all([
          api.getSchedule(),
          api.getCourses(),
          isAdmin ? api.getUsers() : Promise.resolve({ users: [] })
        ]);
        const nextSchedule = normalizeEntries(scheduleResponse?.schedule || []);
        const nextStudents = (usersResponse?.users || []).filter((item) => item.role === 'student');
        setSchedule(nextSchedule);
        setCourses(courseResponse?.courses || []);
        setStudents(nextStudents);
        if (isStudent) {
          setSelectedGroup(studentGroup);
          setSelectedSubgroup(studentSubgroup);
        } else {
          const groups = Array.from(new Set([
            ...nextSchedule.map((item) => item.group_name).filter((value) => value && value !== 'INDIVIDUAL'),
            ...nextStudents.map((item) => item.group_name).filter(Boolean)
          ])).sort((a, b) => a.localeCompare(b));
          setSelectedGroup((current) => current || groups[0] || '');
        }
      } catch (loadError) {
        setError(loadError.message || 'Failed to load schedule');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [canEdit, isAdmin, isStudent, studentGroup, studentSubgroup, user]);

  useEffect(() => {
    if (selectedAudienceView !== 'subgroup') return;
    if (!subgroupOptions.length) {
      setSelectedSubgroup('');
      return;
    }
    if (!subgroupOptions.includes(selectedSubgroup)) {
      setSelectedSubgroup(subgroupOptions[0]);
    }
  }, [selectedAudienceView, selectedSubgroup, subgroupOptions]);

  useEffect(() => {
    if (selectedAudienceView !== 'individual') return;
    if (!studentOptions.length) {
      setSelectedStudentId('');
      return;
    }
    if (!studentOptions.some((item) => String(item.id) === String(selectedStudentId))) {
      setSelectedStudentId(String(studentOptions[0].id));
    }
  }, [selectedAudienceView, selectedStudentId, studentOptions]);

  useEffect(() => {
    if (!selectedCourseFilter) return;
    if (!filteredSchedule.some((item) => String(item.course_id || '') === String(selectedCourseFilter))) {
      const courseStillExists = courseOptions.some((item) => String(item.id) === String(selectedCourseFilter));
      if (!courseStillExists) {
        setSelectedCourseFilter('');
      }
    }
  }, [courseOptions, filteredSchedule, selectedCourseFilter]);

  useEffect(() => {
    setSelectedBatchIds((current) => current.filter((id) => filteredSchedule.some((item) => String(item.id) === String(id))));
  }, [filteredSchedule]);

  useEffect(() => {
    if (!mobileScheduleSections.length) {
      return;
    }

    const preferredDay = mobileScheduleSections.find((section) => section.items.length > 0)?.day
      || mobileScheduleSections[0]?.day
      || days[0];

    if (!mobileDayTabs.some((tab) => tab.day === activeMobileDay)) {
      setActiveMobileDay(preferredDay);
      return;
    }

    if (!canEdit) {
      const activeTab = mobileDayTabs.find((tab) => tab.day === activeMobileDay);
      if (!activeTab?.count) {
        setActiveMobileDay(preferredDay);
      }
    }
  }, [activeMobileDay, canEdit, mobileDayTabs, mobileScheduleSections]);

  const reloadSchedule = async (nextGroup = selectedGroup) => {
    const entries = await loadSchedule();
    setSelectedBatchIds((current) => current.filter((id) => entries.some((item) => String(item.id) === String(id))));
    if (isStudent) {
      setSelectedGroup(studentGroup);
      return;
    }
    const groups = Array.from(new Set([
      ...entries.map((item) => item.group_name).filter((value) => value && value !== 'INDIVIDUAL'),
      ...students.map((item) => item.group_name).filter(Boolean)
    ])).sort((a, b) => a.localeCompare(b));
    setSelectedGroup(groups.includes(nextGroup) ? nextGroup : (groups[0] || nextGroup || ''));
  };

  const clearDragState = () => {
    setDraggedBlock(null);
    setDropTarget(null);
  };

  const getConflictingSlots = ({ day, slots, scope, ignoreId = null }) => (
    slots.filter((slot) => schedule.some((item) => (
      item.day === day
      && item.time_slot === slot
      && item.id !== ignoreId
      && matchesScope(item, scope)
    )))
  );

  const handleStudentPick = (studentId, applyToForm = false) => {
    setSelectedStudentId(studentId);
    const student = students.find((item) => String(item.id) === String(studentId));
    if (student?.group_name) {
      setSelectedGroup(student.group_name);
      setShowCustomGroupInput(false);
    }
    if (!applyToForm) return;
    if (!student) return;
    setFormData((current) => ({
      ...current,
      student_user_id: String(student.id),
      group_name: student.group_name || current.group_name,
      subgroup_name: '',
      audience_type: 'individual'
    }));
  };

  const resetFilters = () => {
    if (isStudent) {
      setSelectedCourseFilter('');
      return;
    }

    setSelectedAudienceView('group');
    setSelectedSubgroup('');
    setSelectedCourseFilter('');
    setSelectedGroup(groupOptions[0] || '');
  };

  const openQuickAddForDay = (day) => {
    if (!canEdit) return;

    const student = students.find((item) => String(item.id) === String(selectedStudentId));
    setFormData({
      id: null,
      day,
      time_slot: timeSlots[0],
      original_time_slot: timeSlots[0],
      legacy_slots: [timeSlots[0]],
      group_name: isStudent ? studentGroup : (selectedGroup || student?.group_name || ''),
      audience_type: selectedAudienceView,
      subgroup_name: selectedAudienceView === 'subgroup' ? selectedSubgroup : '',
      student_user_id: selectedAudienceView === 'individual' ? normalizeId(selectedStudentId) : '',
      course_id: '',
      subject: '',
      teacher: user?.role === 'teacher' ? user.name : '',
      room: ''
    });
    setSelectedTimeSlots([timeSlots[0]]);
    setShowEditForm(true);
  };

  const handleCoursePick = (courseId) => {
    const course = courseOptions.find((item) => String(item.id) === String(courseId));
    setFormData((current) => ({
      ...current,
      course_id: courseId,
      subject: course ? course.name : current.subject,
      teacher: course ? getCourseTeacher(course, language) : current.teacher
    }));
  };

  const handleBatchCoursePick = (courseId) => {
    const course = courseOptions.find((item) => String(item.id) === String(courseId));
    setBatchForm((current) => ({
      ...current,
      course_id: courseId,
      subject: course ? course.name : current.subject,
      teacher: course ? getCourseTeacher(course, language) : current.teacher
    }));
  };

  const toggleBatchSelection = (entryIds = []) => {
    setSelectedBatchIds((current) => {
      const allSelected = entryIds.every((id) => current.includes(id));
      if (allSelected) {
        return current.filter((id) => !entryIds.includes(id));
      }

      return [...new Set([...current, ...entryIds])];
    });
  };

  const resetBatchEditor = () => {
    setShowBatchEditor(false);
    setBatchForm(emptyBatchForm);
  };

  const clearBatchSelection = () => {
    setSelectedBatchIds([]);
    resetBatchEditor();
  };

  const handleCellClick = (day, timeSlot) => {
    if (!canEdit) return;
    const existing = visibleSchedule.find((item) => item.day === day && item.time_slot === timeSlot);
    if (existing && batchSelectMode) {
      const linkedIds = filteredSchedule
        .filter((item) => item.day === day && item.subject === existing.subject && item.teacher === existing.teacher && item.room === existing.room && item.group_name === existing.group_name && (item.audience_type || 'group') === (existing.audience_type || 'group') && (item.subgroup_name || '') === (existing.subgroup_name || '') && String(item.student_user_id || '') === String(existing.student_user_id || '') && String(item.course_id || '') === String(existing.course_id || ''))
        .map((item) => item.id)
        .filter(Boolean);
      toggleBatchSelection(linkedIds.length ? linkedIds : [existing.id]);
      return;
    }
    if (!existing && selectedAudienceView === 'individual' && isAdmin && !selectedStudentId) {
      window.alert(copy.chooseStudentFirst);
      return;
    }
    if (existing) {
      setFormData({
        id: existing.id,
        day: existing.day,
        time_slot: existing.time_slot,
        original_time_slot: existing.original_time_slot || existing.time_slot,
        legacy_slots: Array.isArray(existing.legacy_slots) ? existing.legacy_slots : [existing.time_slot],
        group_name: existing.group_name || '',
        audience_type: existing.audience_type || 'group',
        subgroup_name: existing.subgroup_name || '',
        student_user_id: normalizeId(existing.student_user_id),
        course_id: normalizeId(existing.course_id),
        subject: existing.subject,
        teacher: existing.teacher || '',
        room: existing.room || ''
      });
      setSelectedTimeSlots([existing.time_slot]);
    } else {
      const student = students.find((item) => String(item.id) === String(selectedStudentId));
      setFormData({
        id: null,
        day,
        time_slot: timeSlot,
        original_time_slot: timeSlot,
        legacy_slots: [timeSlot],
        group_name: isStudent ? studentGroup : (selectedGroup || student?.group_name || ''),
        audience_type: selectedAudienceView,
        subgroup_name: selectedAudienceView === 'subgroup' ? selectedSubgroup : '',
        student_user_id: selectedAudienceView === 'individual' ? normalizeId(selectedStudentId) : '',
        course_id: '',
        subject: '',
        teacher: user?.role === 'teacher' ? user.name : '',
        room: ''
      });
      setSelectedTimeSlots([timeSlot]);
    }
    setShowEditForm(true);
  };

  const handleBlockClick = (block) => {
    if (block.type === 'occupied' && batchSelectMode) {
      toggleBatchSelection(block.entryIds?.length ? block.entryIds : [block.entry.id]);
      return;
    }

    handleCellClick(block.day, block.startSlot);
  };

  const handleDragStart = (block) => (event) => {
    if (!canEdit || block.type !== 'occupied') return;
    setDraggedBlock(block);
    setCopyFeedback({ type: '', message: '' });
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', `${block.day}__${block.startSlot}`);
  };

  const handleDragEnd = () => clearDragState();

  const handleDragOver = (block) => (event) => {
    if (!draggedBlock) return;
    const targetSlots = getRangeSlots(block.startIndex, draggedBlock.span);
    const scope = {
      groupName: draggedBlock.entry.group_name,
      audienceType: draggedBlock.entry.audience_type || 'group',
      subgroupName: draggedBlock.entry.subgroup_name || '',
      studentUserId: draggedBlock.entry.student_user_id || ''
    };
    if (block.type !== 'empty' || targetSlots.length !== draggedBlock.span || getConflictingSlots({ day: block.day, slots: targetSlots, scope }).length) {
      setDropTarget(null);
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDropTarget({ day: block.day, startSlot: block.startSlot });
  };

  const handleDragLeave = (block) => () => {
    setDropTarget((current) => (current?.day === block.day && current?.startSlot === block.startSlot ? null : current));
  };

  const handleDrop = (block) => async (event) => {
    event.preventDefault();
    if (!draggedBlock) return;
    const targetSlots = getRangeSlots(block.startIndex, draggedBlock.span);
    const scope = {
      groupName: draggedBlock.entry.group_name,
      audienceType: draggedBlock.entry.audience_type || 'group',
      subgroupName: draggedBlock.entry.subgroup_name || '',
      studentUserId: draggedBlock.entry.student_user_id || ''
    };
    const conflicts = getConflictingSlots({ day: block.day, slots: targetSlots, scope });
    if (targetSlots.length !== draggedBlock.span) {
      setCopyFeedback({ type: 'error', message: copy.copyNotEnoughSlots });
      clearDragState();
      return;
    }
    if (conflicts.length) {
      setCopyFeedback({ type: 'error', message: `Cannot copy into ${block.day}. Occupied slots: ${conflicts.join(', ')}.` });
      clearDragState();
      return;
    }
    try {
      await Promise.all(targetSlots.map((slot) => api.createScheduleEntry({
        day: block.day,
        time_slot: slot,
        group_name: draggedBlock.entry.group_name,
        audience_type: draggedBlock.entry.audience_type || 'group',
        subgroup_name: draggedBlock.entry.subgroup_name || null,
        student_user_id: draggedBlock.entry.student_user_id || null,
        course_id: draggedBlock.entry.course_id || null,
        subject: draggedBlock.entry.subject,
        teacher: draggedBlock.entry.teacher,
        room: draggedBlock.entry.room
      })));
      await reloadSchedule(draggedBlock.entry.group_name.trim());
      setCopyFeedback({ type: 'success', message: `Copied "${draggedBlock.entry.subject}" to ${block.day} at ${targetSlots[0]}.` });
    } catch (dropError) {
      setCopyFeedback({ type: 'error', message: dropError.message || copy.copyFailed });
    } finally {
      clearDragState();
    }
  };

  const closeModal = () => {
    setShowEditForm(false);
    setFormData(emptyForm);
    setSelectedTimeSlots([]);
  };

  const toggleTimeSlot = (slot) => {
    setSelectedTimeSlots((current) => (
      current.includes(slot)
        ? (current.length === 1 ? current : current.filter((value) => value !== slot))
        : [...current, slot].sort((a, b) => timeSlots.indexOf(a) - timeSlots.indexOf(b))
    ));
  };

  const handleSave = async () => {
    const audienceType = formData.audience_type || 'group';
    const groupName = formData.group_name.trim();
    const subgroupName = audienceType === 'subgroup' ? formData.subgroup_name.trim() : '';
    const studentUserId = audienceType === 'individual' ? normalizeId(formData.student_user_id) : '';
    const slots = formData.id ? [formData.time_slot] : selectedTimeSlots;

    if (!groupName) return window.alert('Please enter a group name.');
    if (audienceType === 'subgroup' && !subgroupName) return window.alert('Please enter a subgroup.');
    if (audienceType === 'individual' && !studentUserId) return window.alert('Please choose a student.');
    if (!slots.length) return window.alert('Please choose at least one time slot.');

    const scope = { groupName, audienceType, subgroupName, studentUserId };
    const conflicts = getConflictingSlots({ day: formData.day, slots, scope, ignoreId: formData.id });
    if (conflicts.length) {
      return window.alert(`${copy.conflictPrefix} ${conflicts.join(', ')}`);
    }

    const payload = {
      ...formData,
      group_name: groupName,
      audience_type: audienceType,
      subgroup_name: audienceType === 'subgroup' ? subgroupName : null,
      student_user_id: audienceType === 'individual' ? Number(studentUserId) : null,
      course_id: formData.course_id ? Number(formData.course_id) : null,
      subject: formData.subject.trim(),
      teacher: formData.teacher.trim(),
      room: formData.room.trim()
    };

    try {
      if (formData.id) {
        const legacySlots = Array.isArray(formData.legacy_slots) ? formData.legacy_slots : [];
        if (legacySlots.length > 1) {
          await api.deleteScheduleEntry(formData.id);
          await Promise.all(legacySlots.map((slot) => api.createScheduleEntry({ ...payload, time_slot: slot })));
        } else {
          await api.updateScheduleEntry(formData.id, payload);
        }
      } else {
        await Promise.all(slots.map((slot) => api.createScheduleEntry({ ...payload, time_slot: slot })));
      }
      await reloadSchedule(groupName);
      closeModal();
    } catch (saveError) {
      window.alert(saveError.message || 'Failed to save schedule entry');
    }
  };

  const handleDelete = async () => {
    if (!formData.id) return;
    try {
      await api.deleteScheduleEntry(formData.id);
      await reloadSchedule(formData.group_name.trim());
      closeModal();
    } catch (deleteError) {
      window.alert(deleteError.message || 'Failed to delete schedule entry');
    }
  };

  const selectedBatchEntries = useMemo(
    () => filteredSchedule.filter((item) => selectedBatchIds.includes(item.id)),
    [filteredSchedule, selectedBatchIds]
  );
  const selectedBatchSummary = useMemo(() => {
    const groups = new Set(selectedBatchEntries.map((item) => item.group_name).filter(Boolean));
    const coursesInSelection = new Set(selectedBatchEntries.map((item) => item.course_id).filter(Boolean));
    return {
      count: selectedBatchEntries.length,
      groups: groups.size,
      courses: coursesInSelection.size
    };
  }, [selectedBatchEntries]);

  const openBatchEditor = () => {
    if (!selectedBatchEntries.length) return;
    const [firstEntry] = selectedBatchEntries;
    setBatchForm({
      course_id: normalizeId(firstEntry.course_id),
      subject: '',
      teacher: '',
      room: ''
    });
    setShowBatchEditor(true);
  };

  const handleBatchSave = async () => {
    if (!selectedBatchEntries.length) return;

    try {
      await Promise.all(selectedBatchEntries.map((entry) => {
        const nextCourseId = batchForm.course_id ? Number(batchForm.course_id) : entry.course_id || null;
        return api.updateScheduleEntry(entry.id, {
          day: entry.day,
          time_slot: entry.original_time_slot || entry.time_slot,
          group_name: entry.group_name,
          audience_type: entry.audience_type || 'group',
          subgroup_name: entry.subgroup_name || null,
          student_user_id: entry.student_user_id || null,
          course_id: nextCourseId,
          subject: batchForm.subject.trim() || entry.subject,
          teacher: batchForm.teacher.trim() || entry.teacher || '',
          room: batchForm.room.trim() || entry.room || ''
        });
      }));

      await reloadSchedule(selectedGroup);
      setCopyFeedback({ type: 'success', message: copy.updatedSlots(selectedBatchEntries.length) });
      clearBatchSelection();
    } catch (batchError) {
      window.alert(batchError.message || 'Failed to update selected schedule entries.');
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedBatchEntries.length) return;

    try {
      await Promise.all(selectedBatchEntries.map((entry) => api.deleteScheduleEntry(entry.id)));
      await reloadSchedule(selectedGroup);
      setCopyFeedback({ type: 'success', message: copy.deletedSlots(selectedBatchEntries.length) });
      clearBatchSelection();
    } catch (batchError) {
      window.alert(batchError.message || 'Failed to delete selected schedule entries.');
    }
  };

  const totalEntries = schedule.length;
  const usesCustomGroup = showCustomGroupInput || (!!selectedGroup && !groupOptions.includes(selectedGroup));
  const selectedStudent = studentOptions.find((item) => String(item.id) === String(selectedStudentId));
  const visibleEntryCount = filteredSchedule.length;
  const currentScopeLabel = isStudent
    ? `${studentGroup || copy.notSet}${studentSubgroup ? ` / ${studentSubgroup}` : ''}`
    : (selectedAudienceView === 'individual'
      ? (selectedStudent ? getStudentLabel(selectedStudent, language) : copy.chooseStudent)
      : (selectedAudienceView === 'subgroup'
        ? `${selectedGroup || copy.chooseGroupShort}${selectedSubgroup ? ` / ${selectedSubgroup}` : ''}`
        : (selectedGroup || copy.chooseGroupShort)));
  const needsSubgroup = canEdit && selectedAudienceView === 'subgroup' && !selectedSubgroup;
  const needsStudent = canEdit && selectedAudienceView === 'individual' && !selectedStudentId;
  const needsGroup = !visibleSchedule.length && !selectedGroup && canEdit && selectedAudienceView !== 'individual';
  const hasCourseFilter = Boolean(selectedCourseFilter);
  const filterClearedViewEmpty = hasCourseFilter && filteredSchedule.length === 0;
  const canRenderScheduleView = !needsSubgroup && !needsStudent && !needsGroup && !filterClearedViewEmpty;

  if (loading) {
    return <div className="page"><div className="page-header"><h1>{copy.pageTitle}</h1><p>{copy.loading}</p></div><div className="loading-spinner"></div></div>;
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>{copy.pageTitle}</h1>
            <p>{language === 'Kyrgyz' ? 'CampusOS учурдагы жадыбал көрүнүшүн жүктөй алган жок.' : 'CampusOS could not load the active timetable view.'}</p>
          </div>
        </div>
        <StatusBanner tone="error" title={language === 'Kyrgyz' ? 'Жадыбал жеткиликсиз' : 'Schedule unavailable'} message={error} />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{copy.pageTitle}</h1>
          <p>
            {isStudent
              ? copy.personalIntro(studentGroup, studentSubgroup)
              : (language === 'Kyrgyz'
                ? 'Топтор, подтоптор жана жеке студенттер үчүн курс жадыбалдарын башкарыңыз.'
                : 'Manage course schedules for groups, subgroups, and individual students.')}
          </p>
        </div>
        {canEdit && <div className="page-actions"><p className="edit-hint">{copy.adminHint}</p></div>}
      </div>

      <div className="schedule-admin-bar">
        <div className="schedule-admin-card"><span className="management-summary-label">{copy.lessonsLoaded}</span><strong>{totalEntries}</strong></div>
        <div className="schedule-admin-card"><span className="management-summary-label">{copy.visibleInView}</span><strong>{visibleEntryCount}</strong></div>
        <div className="schedule-admin-card"><span className="management-summary-label">{copy.groups}</span><strong>{groupOptions.length}</strong></div>
        <div className="schedule-admin-card">
          <span className="management-summary-label">{copy.currentScope}</span>
          <strong>{currentScopeLabel}</strong>
        </div>
        <div className="schedule-admin-card schedule-admin-legend">
          <span className="schedule-legend-item"><span className="schedule-dot occupied"></span> {copy.existingClass}</span>
          <span className="schedule-legend-item"><span className="schedule-dot empty"></span> {copy.emptySlot}</span>
          {canEdit && <span className="schedule-legend-item"><span className="schedule-dot editable"></span> {copy.clickToManage}</span>}
        </div>
      </div>

      {canEdit && (
        <div className="schedule-batch-toolbar">
          <div className="schedule-batch-copy">
            <strong>{language === 'Kyrgyz' ? 'Топтук иш агымы' : 'Batch workflow'}</strong>
            <span>
              {selectedBatchEntries.length
                ? (language === 'Kyrgyz'
                  ? `${selectedBatchSummary.count} уяча тандалды, ${selectedBatchSummary.groups} топ камтылды.`
                  : `${selectedBatchSummary.count} slot${selectedBatchSummary.count === 1 ? '' : 's'} selected across ${selectedBatchSummary.groups} group${selectedBatchSummary.groups === 1 ? '' : 's'}.`)
                : (language === 'Kyrgyz'
                  ? 'Топтук режимди күйгүзүп, жалпы жаңыртуу үчүн толтурулган уячаларды белгилеңиз.'
                  : 'Turn on batch mode and click occupied slots to queue them for a shared update.')}
            </span>
          </div>
          <div className="schedule-batch-actions">
            <button
              type="button"
              className={`management-filter-chip ${batchSelectMode ? 'active' : ''}`}
              onClick={() => setBatchSelectMode((value) => !value)}
            >
              {batchSelectMode
                ? (language === 'Kyrgyz' ? 'Топтук режимден чыгуу' : 'Exit batch mode')
                : (language === 'Kyrgyz' ? 'Топтук тандоо' : 'Batch select')}
            </button>
            <button
              type="button"
              className="management-filter-chip"
              onClick={() => setSelectedBatchIds(Array.from(new Set(filteredSchedule.map((item) => item.id).filter(Boolean))))}
              disabled={!filteredSchedule.length}
            >
              {language === 'Kyrgyz' ? 'Көрүнгөндөрдү тандоо' : 'Select visible'}
            </button>
            <button
              type="button"
              className="management-filter-chip"
              onClick={openBatchEditor}
              disabled={!selectedBatchEntries.length}
            >
              {language === 'Kyrgyz' ? 'Топтук оңдоо' : 'Batch edit'}
            </button>
            <button
              type="button"
              className="management-filter-chip"
              onClick={handleBatchDelete}
              disabled={!selectedBatchEntries.length}
            >
              {copy.deleteSelected}
            </button>
            <button
              type="button"
              className="management-filter-chip"
              onClick={clearBatchSelection}
              disabled={!selectedBatchEntries.length && !showBatchEditor}
            >
              {language === 'Kyrgyz' ? 'Тазалоо' : 'Clear'}
            </button>
          </div>
        </div>
      )}

      <StatusBanner
        tone={copyFeedback.type === 'error' ? 'error' : 'success'}
        title={copyFeedback.type === 'error'
          ? (language === 'Kyrgyz' ? 'Жадыбал жаңыртылган жок' : 'Schedule update blocked')
          : (language === 'Kyrgyz' ? 'Жадыбал жаңыртылды' : 'Schedule updated')}
        message={copyFeedback.message}
      />

      {canEdit ? (
        <div className="management-toolbar schedule-group-toolbar">
          <div className="schedule-group-switcher">
            <div className="schedule-group-field">
              <span className="management-summary-label">{copy.groupSchedule}</span>
              <div className="schedule-group-select-row">
                <select className="schedule-group-select" value={groupOptions.includes(selectedGroup) ? selectedGroup : ''} onChange={(event) => { setSelectedGroup(event.target.value); setShowCustomGroupInput(false); }}>
                  <option value="" disabled>{groupOptions.length ? copy.chooseGroup : copy.noGroupsYet}</option>
                  {groupOptions.map((groupName) => <option key={groupName} value={groupName}>{groupName}</option>)}
                </select>
                <button type="button" className="management-filter-chip" onClick={() => { setSelectedGroup(''); setShowCustomGroupInput(true); }}>{copy.newGroup}</button>
              </div>
              {usesCustomGroup && <input value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} placeholder={language === 'Kyrgyz' ? 'Мисалы, CYB-23' : 'For example CYB-23'} />}
            </div>

            {groupOptions.length > 0 && (
              <div className="management-filters schedule-group-chips">
                {groupOptions.map((groupName) => (
                  <button key={groupName} type="button" className={`management-filter-chip ${selectedGroup === groupName ? 'active' : ''}`} onClick={() => { setSelectedGroup(groupName); setShowCustomGroupInput(false); }}>
                    {groupName}
                  </button>
                ))}
              </div>
            )}

            <div className="management-filters schedule-group-chips">
              <button type="button" className={`management-filter-chip ${selectedAudienceView === 'group' ? 'active' : ''}`} onClick={() => setSelectedAudienceView('group')}>{copy.wholeGroup}</button>
              <button type="button" className={`management-filter-chip ${selectedAudienceView === 'subgroup' ? 'active' : ''}`} onClick={() => setSelectedAudienceView('subgroup')}>{copy.subgroup}</button>
              {isAdmin && <button type="button" className={`management-filter-chip ${selectedAudienceView === 'individual' ? 'active' : ''}`} onClick={() => setSelectedAudienceView('individual')}>{copy.individual}</button>}
            </div>

            {selectedAudienceView === 'subgroup' && (
              <div className="schedule-group-field">
                <span className="management-summary-label">{copy.subgroupSchedule}</span>
                <div className="schedule-group-select-row">
                  <select className="schedule-group-select" value={subgroupOptions.includes(selectedSubgroup) ? selectedSubgroup : ''} onChange={(event) => setSelectedSubgroup(event.target.value)}>
                    <option value="" disabled>{subgroupOptions.length ? copy.chooseSubgroup : copy.noSubgroupsYet}</option>
                    {subgroupOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <input value={selectedSubgroup} onChange={(event) => setSelectedSubgroup(event.target.value)} placeholder={language === 'Kyrgyz' ? 'Мисалы, 1-Group' : 'For example 1-Group'} />
                </div>
              </div>
            )}

            {selectedAudienceView === 'individual' && (
              <div className="schedule-group-field">
                <span className="management-summary-label">{copy.studentSchedule}</span>
                <div className="schedule-group-select-row">
                  <select className="schedule-group-select" value={selectedStudentId} onChange={(event) => handleStudentPick(event.target.value)}>
                    <option value="" disabled>{studentOptions.length ? copy.chooseStudent : copy.noStudentsInGroup}</option>
                    {studentOptions.map((student) => <option key={student.id} value={student.id}>{getStudentLabel(student, language)}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="schedule-group-field">
              <span className="management-summary-label">{copy.courseFilter}</span>
              <div className="schedule-group-select-row">
                <select className="schedule-group-select" value={selectedCourseFilter} onChange={(event) => setSelectedCourseFilter(event.target.value)}>
                  <option value="">{copy.allLinkedCourses}</option>
                  {courseOptions.map((course) => <option key={course.id} value={course.id}>{course.code} - {course.name}</option>)}
                </select>
                <button type="button" className="management-filter-chip" onClick={resetFilters}>{copy.resetView}</button>
              </div>
            </div>
          </div>
          <p className="schedule-group-hint">
            {selectedAudienceView === 'individual'
              ? copy.individualHint
              : selectedAudienceView === 'subgroup'
                ? copy.subgroupHint
                : copy.wholeGroupHint}
          </p>
        </div>
      ) : (
        <div className="management-toolbar schedule-group-toolbar">
          <div className="schedule-group-field"><span className="management-summary-label">{copy.yourTimetableSource}</span><input value={`${studentGroup}${studentSubgroup ? ` / ${studentSubgroup}` : ''}`} readOnly /></div>
          <div className="schedule-group-field">
            <span className="management-summary-label">{copy.courseFilter}</span>
            <div className="schedule-group-select-row">
              <select className="schedule-group-select" value={selectedCourseFilter} onChange={(event) => setSelectedCourseFilter(event.target.value)}>
                <option value="">{copy.allLinkedCourses}</option>
                {courseOptions.map((course) => <option key={course.id} value={course.id}>{course.code} - {course.name}</option>)}
              </select>
              <button type="button" className="management-filter-chip" onClick={resetFilters}>{copy.reset}</button>
            </div>
          </div>
          <p className="schedule-group-hint">{copy.studentHint}</p>
        </div>
      )}

      {overviewByDay.length > 0 && (
        <div className="schedule-overview-strip">
          {overviewByDay.map((section) => (
            <div key={section.day} className="schedule-overview-card">
              <div className="schedule-overview-head">
                <strong>{getDayLabel(section.day, language)}</strong>
                <span>{section.items.length} {copy.classWord(section.items.length)}</span>
              </div>
              <div className="schedule-overview-body">
                {section.items.slice(0, 4).map((item) => {
                  const overviewStyle = getScheduleCardStyle(item);

                  return canEdit ? (
                    <button
                      key={`${item.id}-${item.time_slot}`}
                      type="button"
                      className="schedule-overview-item"
                      style={overviewStyle}
                      onClick={() => handleCellClick(item.day, item.time_slot)}
                    >
                      <span>{getSlotStart(item.time_slot)}</span>
                      <strong>{item.subject}</strong>
                      <small>{item.room || copy.roomTbd}</small>
                    </button>
                  ) : (
                    <div key={`${item.id}-${item.time_slot}`} className="schedule-overview-item" style={overviewStyle}>
                      <span>{getSlotStart(item.time_slot)}</span>
                      <strong>{item.subject}</strong>
                      <small>{item.room || copy.roomTbd}</small>
                    </div>
                  );
                })}
                {section.items.length > 4 && <div className="schedule-overview-more">{copy.more(section.items.length - 4)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {canRenderScheduleView && activeMobileSection && (
        <>
          <div className="schedule-mobile-tabs" role="tablist" aria-label="Schedule day tabs">
            {mobileDayTabs.map((tab) => (
              <button
                key={tab.day}
                type="button"
                role="tab"
                aria-selected={activeMobileDay === tab.day}
                className={`schedule-mobile-tab ${activeMobileDay === tab.day ? 'active' : ''}`}
                onClick={() => setActiveMobileDay(tab.day)}
              >
                <span>{tab.shortLabel}</span>
                <small>{tab.count}</small>
              </button>
            ))}
          </div>

          <div className="schedule-mobile-stack" aria-label="Mobile schedule view">
            <section key={activeMobileSection.day} className="schedule-mobile-day">
              <div className="schedule-mobile-day-head">
                <div>
                  <strong>{getDayLabel(activeMobileSection.day, language)}</strong>
                  <span>{activeMobileSection.items.length} {copy.classWord(activeMobileSection.items.length)}</span>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    className="schedule-mobile-add"
                    onClick={() => openQuickAddForDay(activeMobileSection.day)}
                  >
                    {copy.add}
                  </button>
                )}
              </div>

              {activeMobileSection.items.length > 0 ? (
                <div className="schedule-mobile-list">
                  {activeMobileSection.items.map((item) => {
                    const mobileStyle = getScheduleCardStyle(item);
                    const content = (
                      <>
                        <div className="schedule-mobile-time">{getSlotStart(item.time_slot)}</div>
                        <div className="schedule-mobile-copy">
                          <strong>{item.subject}</strong>
                          <span>{item.room || copy.roomTbd}</span>
                        </div>
                      </>
                    );

                    return canEdit ? (
                      <button
                        key={`${item.id}-${item.time_slot}`}
                        type="button"
                        className="schedule-mobile-strip"
                        style={mobileStyle}
                        onClick={() => handleCellClick(item.day, item.time_slot)}
                      >
                        {content}
                      </button>
                    ) : (
                      <div
                        key={`${item.id}-${item.time_slot}`}
                        className="schedule-mobile-strip"
                        style={mobileStyle}
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="schedule-mobile-empty">
                  {canEdit ? copy.mobileEmptyEdit : copy.mobileEmptyReadOnly}
                </div>
              )}
            </section>
          </div>
        </>
      )}

      {needsSubgroup ? (
        <EmptyState
          eyebrow={copy.pageTitle}
          title={copy.chooseSubgroupTitle}
          description={language === 'Kyrgyz'
            ? 'Подтоп режими бир убакта бир гана подтопту түзөтөт. Жогору жактан тандаңыз же жаңы ат жазыңыз.'
            : 'Subgroup mode only edits one subgroup at a time. Pick it above or type a new subgroup name.'}
          compact
          className="schedule-empty-state"
        />
      ) : needsStudent ? (
        <EmptyState
          eyebrow={copy.pageTitle}
          title={copy.chooseStudentTitle}
          description={copy.chooseStudentDescription}
          compact
          className="schedule-empty-state"
        />
      ) : needsGroup ? (
        <EmptyState
          eyebrow={copy.pageTitle}
          title={copy.chooseGroupTitle}
          description={language === 'Kyrgyz'
            ? 'Жадыбал торун ачуу үчүн жогору жактан бар топту тандаңыз же жаңы ат жазыңыз.'
            : 'Select an existing group or type a new group name above to open the timetable grid.'}
          compact
          className="schedule-empty-state"
        />
      ) : filterClearedViewEmpty ? (
        <EmptyState
          eyebrow={copy.courseFilter}
          title={copy.noLessonsTitle}
          description={language === 'Kyrgyz'
            ? 'Учурдагы көрүнүш үчүн толук жадыбалды кайра ачуу үчүн курс чыпкасын тазалаңыз.'
            : 'Reset the course filter to reopen the full timetable for the current scope.'}
          actionLabel={copy.noLessonsAction}
          onAction={() => setSelectedCourseFilter('')}
          compact
          className="schedule-empty-state"
        />
      ) : (
        <div className="schedule-grid">
          <div className="schedule-grid-board" style={{ gridTemplateColumns: '76px repeat(6, minmax(122px, 1fr))', gridTemplateRows: `52px repeat(${timeSlots.length}, 56px)` }}>
            <div className="schedule-board-corner"></div>
            {days.map((day, index) => <div key={day} className="day-column schedule-grid-day" style={{ gridColumn: index + 2, gridRow: 1 }}>{getDayLabel(day, language)}</div>)}
            {timeSlots.map((slot, index) => <div key={slot} className="time-column schedule-grid-time" style={{ gridColumn: 1, gridRow: index + 2 }}>{getSlotStart(slot)}</div>)}
            {mergedBlocks.map((block) => (
              <div
                key={`${block.day}-${block.startSlot}-${block.type}`}
                className={`schedule-cell schedule-grid-item ${block.type === 'occupied' ? 'occupied merged-block' : 'empty'} ${canEdit ? 'editable' : ''} ${block.type === 'occupied' && block.entryIds?.some((id) => selectedBatchIds.includes(id)) ? 'batch-selected' : ''} ${draggedBlock?.day === block.day && draggedBlock?.startSlot === block.startSlot ? 'drag-source' : ''} ${dropTarget?.day === block.day && dropTarget?.startSlot === block.startSlot ? 'drop-target' : ''}`}
                style={{
                  gridColumn: block.dayIndex + 2,
                  gridRow: `${block.startIndex + 2} / span ${block.span}`,
                  ...(block.type === 'occupied' ? getScheduleCardStyle(block.entry) : {})
                }}
                onClick={() => handleBlockClick(block)}
                draggable={canEdit && !batchSelectMode && block.type === 'occupied'}
                onDragStart={block.type === 'occupied' && !batchSelectMode ? handleDragStart(block) : undefined}
                onDragEnd={block.type === 'occupied' && !batchSelectMode ? handleDragEnd : undefined}
                onDragOver={canEdit && !batchSelectMode ? handleDragOver(block) : undefined}
                onDragLeave={canEdit && !batchSelectMode ? handleDragLeave(block) : undefined}
                onDrop={canEdit && !batchSelectMode ? handleDrop(block) : undefined}
              >
                {block.type === 'occupied' ? (
                  <div className="class-info">
                    <div className="class-subject">{block.entry.subject}</div>
                    <div className="class-room-chip">{block.entry.room || copy.roomTbd}</div>
                  </div>
                ) : canEdit ? <div className="empty-slot"><span>{dropTarget?.day === block.day && dropTarget?.startSlot === block.startSlot ? copy.dropToCopy : copy.addClass}</span></div> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header"><h3>{formData.id ? copy.editClass : copy.addClassTitle}</h3><button className="modal-close" onClick={closeModal}>x</button></div>
            <div className="schedule-modal-copy"><p>{formData.id ? copy.editCopy : copy.addCopy}</p></div>
            <form onSubmit={(event) => { event.preventDefault(); handleSave(); }}>
              <div className="form-grid">
                <div className="form-group"><label>{copy.day}</label><select value={formData.day} onChange={(event) => setFormData({ ...formData, day: event.target.value })} required>{days.map((day) => <option key={day} value={day}>{getDayLabel(day, language)}</option>)}</select></div>
                <div className="form-group"><label>{formData.id ? copy.timeSlot : copy.startSlot}</label><select value={formData.time_slot} onChange={(event) => setFormData({ ...formData, time_slot: event.target.value })} required>{timeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></div>
                <div className="form-group"><label>{copy.group}</label><input list="schedule-groups" value={formData.group_name} onChange={(event) => setFormData({ ...formData, group_name: event.target.value })} readOnly={formData.audience_type === 'individual'} required /></div>
                <div className="form-group"><label>{copy.audience}</label><select value={formData.audience_type} onChange={(event) => setFormData((current) => ({ ...current, audience_type: event.target.value, subgroup_name: event.target.value === 'subgroup' ? current.subgroup_name : '', student_user_id: event.target.value === 'individual' ? current.student_user_id || selectedStudentId : '' }))}><option value="group">{copy.wholeGroup}</option><option value="subgroup">{copy.subgroup}</option>{isAdmin && <option value="individual">{copy.individual}</option>}</select></div>
                {formData.audience_type === 'subgroup' && <div className="form-group"><label>{copy.subgroup}</label><input value={formData.subgroup_name} onChange={(event) => setFormData({ ...formData, subgroup_name: event.target.value })} placeholder={copy.subgroupPlaceholder} required /></div>}
                {formData.audience_type === 'individual' && <div className="form-group"><label>{copy.student}</label><select value={formData.student_user_id} onChange={(event) => handleStudentPick(event.target.value, true)} required><option value="" disabled>{copy.chooseStudent}</option>{studentOptions.map((student) => <option key={student.id} value={student.id}>{getStudentLabel(student, language)}</option>)}</select></div>}
                <div className="form-group"><label>{copy.linkedCourse}</label><select value={formData.course_id} onChange={(event) => handleCoursePick(event.target.value)}><option value="">{copy.standaloneManual}</option>{courseOptions.map((course) => <option key={course.id} value={course.id}>{course.code} - {course.name}</option>)}</select></div>
                <div className="form-group"><label>{copy.subject}</label><input value={formData.subject} onChange={(event) => setFormData({ ...formData, subject: event.target.value })} required /></div>
                <div className="form-group"><label>{copy.teacher}</label><input value={formData.teacher} onChange={(event) => setFormData({ ...formData, teacher: event.target.value })} /></div>
                <div className="form-group"><label>{copy.room}</label><input value={formData.room} onChange={(event) => setFormData({ ...formData, room: event.target.value })} required /></div>
                {!formData.id && <div className="form-group form-group-wide"><label>{copy.applyToHours}</label><div className="schedule-slot-picker">{timeSlots.map((slot) => <button key={slot} type="button" className={`schedule-slot-chip ${selectedTimeSlots.includes(slot) ? 'active' : ''}`} onClick={() => toggleTimeSlot(slot)}>{slot}</button>)}</div><p className="schedule-slot-hint">{copy.selected}: {selectedTimeSlots.length ? selectedTimeSlots.join(', ') : copy.none}</p></div>}
              </div>
              <datalist id="schedule-groups">{groupOptions.map((groupName) => <option key={groupName} value={groupName} />)}</datalist>
              <div className="form-actions">
                {formData.id && <button type="button" className="btn-danger" onClick={handleDelete}>{copy.delete}</button>}
                <button type="button" className="btn-secondary" onClick={closeModal}>{copy.cancel}</button>
                <button type="submit" className="btn-primary">{formData.id ? copy.update : copy.createFor(selectedTimeSlots.length || 1)}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBatchEditor && (
        <div className="modal-overlay" onClick={clearBatchSelection}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{copy.batchEdit}</h3>
              <button className="modal-close" onClick={clearBatchSelection}>x</button>
            </div>
            <div className="schedule-modal-copy">
              <p>{copy.batchCopy}</p>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); handleBatchSave(); }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>{copy.linkedCourse}</label>
                  <select value={batchForm.course_id} onChange={(event) => handleBatchCoursePick(event.target.value)}>
                    <option value="">{language === 'Kyrgyz' ? 'Ар бир учурдагы курсту сактоо' : 'Keep each current course'}</option>
                    {courseOptions.map((course) => <option key={course.id} value={course.id}>{course.code} - {course.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>{copy.subjectOverride}</label>
                  <input value={batchForm.subject} onChange={(event) => setBatchForm((current) => ({ ...current, subject: event.target.value }))} placeholder={language === 'Kyrgyz' ? 'Бош болсо учурдагы предмет сакталат' : 'Keep current subject if empty'} />
                </div>
                <div className="form-group">
                  <label>{copy.teacherOverride}</label>
                  <input value={batchForm.teacher} onChange={(event) => setBatchForm((current) => ({ ...current, teacher: event.target.value }))} placeholder={language === 'Kyrgyz' ? 'Бош болсо учурдагы окутуучу сакталат' : 'Keep current teacher if empty'} />
                </div>
                <div className="form-group">
                  <label>{copy.roomOverride}</label>
                  <input value={batchForm.room} onChange={(event) => setBatchForm((current) => ({ ...current, room: event.target.value }))} placeholder={language === 'Kyrgyz' ? 'Бош болсо учурдагы аудитория сакталат' : 'Keep current room if empty'} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={clearBatchSelection}>{copy.cancel}</button>
                <button type="submit" className="btn-primary">{copy.updateSlots(selectedBatchEntries.length)}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Schedule;
