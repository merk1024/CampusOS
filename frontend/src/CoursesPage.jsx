import { useCallback, useEffect, useState } from 'react';
import './CoursesPage.css';
import { api } from './api';
import EmptyState from './components/EmptyState';
import StatusBanner from './components/StatusBanner';
import { canManageAcademicRecords, hasAdminAccess, isStudentAccount } from './roles';

const COURSE_DETAILS_KEY = 'course_details_v2';
const COURSE_FALLBACK_KEY = 'course_cards_v2';
const ENROLLMENTS_KEY = 'course_enrollments';
const PROGRESS_KEY = 'course_progress';

const COURSE_COLORS = ['#8b5cf6', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0369a1', '#be185d', '#f59e0b'];
const COURSE_ICONS = ['</>', 'Fn', 'DB', 'Net', 'Sec', 'Web', 'OS', 'AI'];

const DEFAULT_CREATE_FORM = {
  code: '',
  name: '',
  description: '',
  credits: 3,
  semester: 'Spring 2026',
  teacher_id: ''
};
const COURSES_COPY = {
  English: {
    teacherNotAssigned: 'Teacher not assigned',
    currentSemester: 'Current semester',
    cardDescription: (name) => `${name} course card.`,
    main: {
      title: 'Courses',
      studentSubtitle: 'Open subject cards, enroll, and track progress.',
      manageSubtitle: 'Create subject cards and fill them with topics and materials.',
      closeForm: 'Close form',
      createCourse: 'Create course',
      courseCards: 'Course cards',
      cardsWithSyllabus: 'Cards with syllabus',
      cardsWithMaterials: 'Cards with materials',
      enrolledCourses: 'Enrolled courses',
      totalMaterials: 'Total materials',
      createNote: 'The card will be created immediately. Then you can open it and add weekly topics and study materials.',
      cancel: 'Cancel',
      createCard: 'Create card',
      myCourseList: 'My course list',
      catalog: 'Course catalog',
      showingCards: (visible, total) => `Showing ${visible} of ${total} course card${total === 1 ? '' : 's'}`,
      all: (count) => `All (${count})`,
      mine: (count) => `Mine (${count})`,
      searchPlaceholder: 'Search by course title or code',
      searchAria: 'Search courses',
      clearSearch: 'Clear search',
      emptyTitleMine: 'No enrolled courses yet',
      emptyTitleSearch: 'No courses match the current search',
      emptyDescriptionMine: 'Enroll in a subject from the catalog to have it appear in your personal course list.',
      emptyDescriptionSearch: 'Try another code or title, or create a new course card if you are managing the catalog.',
      openCatalog: 'Open catalog',
      formLabels: {
        code: 'Code',
        credits: 'Credits',
        courseTitle: 'Course title',
        semester: 'Semester',
        teacher: 'Teacher',
        assignLater: 'Assign later',
        description: 'Description'
      },
      formPlaceholders: {
        code: 'CS305',
        courseTitle: 'Information Security',
        semester: 'Spring 2026',
        description: 'Short description of the subject'
      }
    },
    admin: {
      eyebrow: 'Admin Operations',
      title: 'Academic operations hub',
      subtitle: 'Assign teachers, enroll students into selected subjects, and export operational views without leaving the course catalog.',
      selected: (count) => `${count} selected`,
      selectVisible: 'Select visible',
      clearSelection: 'Clear selection',
      emptySelectionTitle: 'No course cards available for bulk actions',
      emptySelectionDescription: 'Create a course card first, or clear the current search to see more options.',
      bulkTeacherTitle: 'Bulk teacher assignment',
      bulkTeacherDescription: 'Assign one teacher to the selected course set, or clear the teacher slot in one step.',
      teacher: 'Teacher',
      clearTeacherAssignment: 'Clear teacher assignment',
      noSelectionYet: 'No course cards selected yet.',
      updating: 'Updating...',
      assignTeacher: 'Assign teacher to selection',
      clearTeacher: 'Clear teacher from selection',
      bulkEnrollmentTitle: 'Bulk student enrollment',
      bulkEnrollmentDescription: 'Paste student IDs or emails, one per line or separated by commas, and CampusOS will enroll them into the selected subjects.',
      studentEmails: 'Student emails or IDs',
      processing: 'Processing...',
      enrollSelection: 'Enroll students into selection',
      exportsTitle: 'Operational exports',
      exportsDescription: 'Generate operational overviews and academic lists for administration without leaving the current workspace.',
      loading: 'Loading...',
      loadOverview: 'Load overview',
      exportOverview: 'Export overview CSV',
      academicListByCourse: 'Academic list by course',
      selectCourseRoster: 'Select course for roster export',
      preparingRoster: 'Preparing roster...',
      exportAcademicList: 'Export academic list CSV',
      courses: 'Courses',
      assigned: 'Assigned',
      unassigned: 'Unassigned',
      enrollments: 'Enrollments',
      previewHint: 'Load the overview to preview course operations before export.',
      enrolled: 'enrolled'
    },
    card: {
      creditsShort: 'cr',
      topics: (count) => `${count} topics`,
      materials: (count) => `${count} materials`,
      leave: 'Leave',
      enroll: 'Enroll'
    },
    detail: {
      back: 'Back',
      credits: 'credits',
      progress: 'Progress',
      closeEdit: 'Close edit',
      editCourse: 'Edit course',
      deleteCourse: 'Delete course',
      syllabus: 'Syllabus',
      materials: 'Materials',
      hint: 'Open topics and mark them as done.',
      addTopic: 'Add topic',
      addMaterial: 'Add material',
      saveCourse: 'Save course',
      saveTopic: 'Save topic',
      saveMaterial: 'Save material',
      week: 'Week',
      title: 'Title',
      description: 'Description',
      type: 'Type',
      url: 'URL',
      size: 'Size',
      localNote: 'Local note',
      open: 'Open',
      remove: 'Remove',
      done: 'Done',
      openAction: 'Open',
      unassigned: 'Unassigned'
    }
  },
  Kyrgyz: {
    teacherNotAssigned: 'Окутуучу дайындала элек',
    currentSemester: 'Учурдагы семестр',
    cardDescription: (name) => `${name} курс картасы.`,
    main: {
      title: 'Курстар',
      studentSubtitle: 'Предмет карталарын ачып, катталып жана прогрессти көзөмөлдөңүз.',
      manageSubtitle: 'Предмет карталарын түзүп, аларды темалар жана материалдар менен толтуруңуз.',
      closeForm: 'Форманы жабуу',
      createCourse: 'Курс түзүү',
      courseCards: 'Курс карталары',
      cardsWithSyllabus: 'Силлабусу бар карталар',
      cardsWithMaterials: 'Материалдары бар карталар',
      enrolledCourses: 'Катталган курстар',
      totalMaterials: 'Жалпы материалдар',
      createNote: 'Карта дароо түзүлөт. Андан кийин аны ачып, жумалык темаларды жана окуу материалдарын кошо аласыз.',
      cancel: 'Жокко чыгаруу',
      createCard: 'Карта түзүү',
      myCourseList: 'Менин курс тизмем',
      catalog: 'Курс каталогу',
      showingCards: (visible, total) => `${total} картанын ичинен ${visible} көрсөтүлүүдө`,
      all: (count) => `Баары (${count})`,
      mine: (count) => `Менин курстарым (${count})`,
      searchPlaceholder: 'Курстун аталышы же коду боюнча издөө',
      searchAria: 'Курстарды издөө',
      clearSearch: 'Издөөнү тазалоо',
      emptyTitleMine: 'Азырынча катталган курс жок',
      emptyTitleSearch: 'Учурдагы издөө боюнча курс табылган жок',
      emptyDescriptionMine: 'Жеке курс тизмеңизде көрүнүшү үчүн каталогдон предметке катталыңыз.',
      emptyDescriptionSearch: 'Башка код же аталышты колдонуп көрүңүз, же каталогду башкарып жатсаңыз жаңы курс картасын түзүңүз.',
      openCatalog: 'Каталогду ачуу',
      formLabels: {
        code: 'Код',
        credits: 'Кредиттер',
        courseTitle: 'Курстун аталышы',
        semester: 'Семестр',
        teacher: 'Окутуучу',
        assignLater: 'Кийин дайындоо',
        description: 'Сүрөттөмө'
      },
      formPlaceholders: {
        code: 'CS305',
        courseTitle: 'Маалыматтык коопсуздук',
        semester: 'Жаз 2026',
        description: 'Предметтин кыскача сүрөттөмөсү'
      }
    },
    admin: {
      eyebrow: 'Админ операциялары',
      title: 'Академиялык операциялар борбору',
      subtitle: 'Окутуучуларды дайындап, студенттерди предметтерге каттап жана операциялык көрүнүштөрдү курс каталогунан чыкпай экспорттоңуз.',
      selected: (count) => `${count} тандалды`,
      selectVisible: 'Көрүнгөндөрдү тандоо',
      clearSelection: 'Тандоону тазалоо',
      emptySelectionTitle: 'Топтук аракеттер үчүн курс карталары жок',
      emptySelectionDescription: 'Алгач курс картасын түзүңүз же көбүрөөк нерсе көрүү үчүн учурдагы издөөнү тазалаңыз.',
      bulkTeacherTitle: 'Окутуучуну топтук дайындоо',
      bulkTeacherDescription: 'Бир кадамда тандалган курстарга бир окутуучуну дайындаңыз же окутуучуну алып салыңыз.',
      teacher: 'Окутуучу',
      clearTeacherAssignment: 'Окутуучуну алып салуу',
      noSelectionYet: 'Азырынча курс карталары тандалган жок.',
      updating: 'Жаңыртылууда...',
      assignTeacher: 'Тандоого окутуучу дайындоо',
      clearTeacher: 'Тандоодон окутуучуну алып салуу',
      bulkEnrollmentTitle: 'Студенттерди топтук каттоо',
      bulkEnrollmentDescription: 'Студент ID же email даректерин саптар боюнча же үтүр менен чаптаңыз, CampusOS аларды тандалган предметтерге каттайт.',
      studentEmails: 'Студент email же ID',
      processing: 'Иштетилип жатат...',
      enrollSelection: 'Тандоого студенттерди каттоо',
      exportsTitle: 'Операциялык экспорттор',
      exportsDescription: "Учурдагы workspace ичинде эле калып, админ үчүн жалпы көрүнүштөрдү жана академиялык тизмелерди түзүңүз.",
      loading: 'Жүктөлүүдө...',
      loadOverview: 'Жалпы көрүнүштү жүктөө',
      exportOverview: 'Жалпы CSV экспорт',
      academicListByCourse: 'Курс боюнча академиялык тизме',
      selectCourseRoster: 'Тизме үчүн курс тандаңыз',
      preparingRoster: 'Тизме даярдалууда...',
      exportAcademicList: 'Академиялык тизмени CSV экспорттоо',
      courses: 'Курстар',
      assigned: 'Дайындалган',
      unassigned: 'Дайындалбаган',
      enrollments: 'Каттоолор',
      previewHint: 'Экспортко чейин курс операцияларын көрүү үчүн жалпы көрүнүштү жүктөңүз.',
      enrolled: 'катталган'
    },
    card: {
      creditsShort: 'кр',
      topics: (count) => `${count} тема`,
      materials: (count) => `${count} материал`,
      leave: 'Чыгуу',
      enroll: 'Катталуу'
    },
    detail: {
      back: 'Артка',
      credits: 'кредит',
      progress: 'Прогресс',
      closeEdit: 'Оңдоону жабуу',
      editCourse: 'Курсту оңдоо',
      deleteCourse: 'Курсту өчүрүү',
      syllabus: 'Силлабус',
      materials: 'Материалдар',
      hint: 'Темаларды ачып, аткарылды деп белгилеңиз.',
      addTopic: 'Тема кошуу',
      addMaterial: 'Материал кошуу',
      saveCourse: 'Курсту сактоо',
      saveTopic: 'Теманы сактоо',
      saveMaterial: 'Материалды сактоо',
      week: 'Апта',
      title: 'Аталышы',
      description: 'Сүрөттөмө',
      type: 'Түрү',
      url: 'URL',
      size: 'Өлчөмү',
      localNote: 'Жергиликтүү белги',
      open: 'Ачуу',
      remove: 'Өчүрүү',
      done: 'Аткарылды',
      openAction: 'Ачуу',
      unassigned: 'Дайындалбаган'
    }
  }
};

const store = {
  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  }
};

const db = {
  init() {
    if (!store.get(COURSE_FALLBACK_KEY)) {
      store.set(COURSE_FALLBACK_KEY, []);
    }
    if (!store.get(ENROLLMENTS_KEY)) {
      store.set(ENROLLMENTS_KEY, {});
    }
    if (!store.get(PROGRESS_KEY)) {
      store.set(PROGRESS_KEY, {});
    }
  },
  courses: {
    all: () => store.get(COURSE_FALLBACK_KEY, []),
    save: (courses) => store.set(COURSE_FALLBACK_KEY, courses)
  },
  enrollments: {
    get: (userId) => store.get(ENROLLMENTS_KEY, {})[userId] || [],
    add: (userId, courseId) => {
      const all = store.get(ENROLLMENTS_KEY, {});
      all[userId] = [...new Set([...(all[userId] || []), courseId])];
      store.set(ENROLLMENTS_KEY, all);
    },
    remove: (userId, courseId) => {
      const all = store.get(ENROLLMENTS_KEY, {});
      all[userId] = (all[userId] || []).filter((value) => value !== courseId);
      store.set(ENROLLMENTS_KEY, all);
    }
  },
  progress: {
    get: (userId, courseId) => store.get(PROGRESS_KEY, {})[`${userId}_${courseId}`] || { pct: 0, done: [] },
    save: (userId, courseId, value) => {
      const all = store.get(PROGRESS_KEY, {});
      all[`${userId}_${courseId}`] = value;
      store.set(PROGRESS_KEY, all);
    }
  }
};

const getCourseKey = (course) => String(course?.code || course?.id || '').trim().toUpperCase();
const getTeacherName = (course, language = 'English') => (
  course?.teacher_name || course?.teacher || (COURSES_COPY[language] || COURSES_COPY.English).teacherNotAssigned
);
const normalizeTeacherId = (value) => (value === '' || value === null || value === undefined ? '' : String(value));
const isConnectionError = (error) => error?.message?.includes('Cannot connect to the server');
const getCourseDetailStore = () => store.get(COURSE_DETAILS_KEY, {});
const saveCourseDetailStore = (value) => store.set(COURSE_DETAILS_KEY, value);
const removeCourseDetailStore = (key) => {
  const details = getCourseDetailStore();
  delete details[key];
  saveCourseDetailStore(details);
};

const replaceCourse = (courses, nextCourse) => {
  const nextKey = getCourseKey(nextCourse);
  const existingIndex = courses.findIndex((course) => getCourseKey(course) === nextKey || course.id === nextCourse.id);
  if (existingIndex === -1) {
    return [nextCourse, ...courses];
  }

  const copy = [...courses];
  copy[existingIndex] = nextCourse;
  return copy;
};

const persistCourseContent = (course) => {
  const key = getCourseKey(course);
  if (!key) return;

  const details = getCourseDetailStore();
  details[key] = {
    topics: Array.isArray(course.topics) ? course.topics : [],
    materials: Array.isArray(course.materials) ? course.materials : []
  };
  saveCourseDetailStore(details);
};

const enhanceCourse = (course, language = 'English') => {
  const copy = COURSES_COPY[language] || COURSES_COPY.English;
  const code = getCourseKey(course) || `COURSE-${course.id}`;
  const hash = code.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const color = COURSE_COLORS[hash % COURSE_COLORS.length];
  const icon = COURSE_ICONS[hash % COURSE_ICONS.length];
  const details = getCourseDetailStore();
  const saved = details[code];

  const hydrated = {
    ...course,
    code,
    color,
    icon,
    teacher: getTeacherName(course, language),
    credits: Number(course.credits || 3),
    semester: course.semester || copy.currentSemester,
    description: course.description || copy.cardDescription(course.name),
    topics: Array.isArray(saved?.topics) && saved.topics.length
      ? saved.topics
      : Array.isArray(course.topics) && course.topics.length
        ? course.topics
        : [],
    materials: Array.isArray(saved?.materials) && saved.materials.length
      ? saved.materials
      : Array.isArray(course.materials) && course.materials.length
        ? course.materials
        : []
  };

  if (!saved) {
    persistCourseContent(hydrated);
  }

  return hydrated;
};

const escapeCsvValue = (value) => (
  `"${String(value ?? '')
    .replace(/"/g, '""')}"`
);

const downloadCsvFile = (filename, headers, rows) => {
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
};

function Ring({ pct = 0, size = 52 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#8b5cf6';

  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize={size * 0.2} fontWeight="700" fill={color}>
        {pct}%
      </text>
    </svg>
  );
}

function useToast() {
  const [toast, setToast] = useState(null);

  const show = (message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2500);
  };

  return { toast, show };
}

function AdminOperationsHub({
  courses,
  visibleCourses,
  teacherOptions,
  onCoursesUpdated,
  onStatus,
  onToast,
  language = 'English'
}) {
  const baseCopy = (COURSES_COPY[language] || COURSES_COPY.English).admin;
  const copy = {
    ...baseCopy,
    selectionEyebrow: baseCopy.selectionEyebrow || (language === 'Kyrgyz' ? 'Курс тандоосу' : 'Course selection'),
    overviewReadyTitle: language === 'Kyrgyz' ? 'Операциялык сереп даяр' : 'Operational overview ready',
    overviewReadyMessage: language === 'Kyrgyz'
      ? (count) => `CampusOS экспорт жана кароо үчүн ${count} курс сабын даярдады.`
      : (count) => `CampusOS prepared ${count} course row${count === 1 ? '' : 's'} for export and review.`,
    failedOverviewTitle: language === 'Kyrgyz' ? 'Операциялык серепти жүктөө ишке ашкан жок' : 'Failed to load operational overview',
    failedOverviewMessage: language === 'Kyrgyz'
      ? 'CampusOS курс операциялары боюнча отчетту даярдай алган жок.'
      : 'CampusOS could not prepare the course operations report.',
    noSelectionTitle: language === 'Kyrgyz' ? 'Курс тандалган жок' : 'No course selection',
    noSelectionAssignMessage: language === 'Kyrgyz'
      ? 'Окутуучуну дайындоодон мурда жок дегенде бир курс картасын тандаңыз.'
      : 'Select at least one course card before assigning a teacher.',
    noSelectionEnrollMessage: language === 'Kyrgyz'
      ? 'Студенттерди каттоодон мурда бир же бир нече курс картасын тандаңыз.'
      : 'Select one or more course cards before enrolling students.',
    studentListEmptyTitle: language === 'Kyrgyz' ? 'Студенттер тизмеси бош' : 'Student list is empty',
    studentListEmptyMessage: language === 'Kyrgyz'
      ? 'Топтук каттоо үчүн студенттин email дарегин же ID санын чаптаңыз.'
      : 'Paste student emails or student IDs to process bulk enrollment.',
    teacherUpdatedTitle: language === 'Kyrgyz' ? 'Окутуучу дайындоосу жаңыртылды' : 'Teacher assignment updated',
    teacherUpdatedMessage: language === 'Kyrgyz'
      ? (updated, missing) => `${updated} тандалган курс картасы жаңыртылды.${missing ? ` Жетишпегени: ${missing}.` : ''}`
      : (updated, missing) => `${updated} selected course card(s) were updated.${missing ? ` Missing: ${missing}.` : ''}`,
    teacherAssignedToast: language === 'Kyrgyz' ? 'Окутуучу тандалган курстарга дайындалды' : 'Teacher assigned to selected courses',
    teacherClearedToast: language === 'Kyrgyz' ? 'Окутуучу тандалган курстардан алынды' : 'Teacher cleared from selected courses',
    teacherFailedTitle: language === 'Kyrgyz' ? 'Топтук окутуучу дайындоосу ишке ашкан жок' : 'Bulk teacher assignment failed',
    teacherFailedMessage: language === 'Kyrgyz' ? 'CampusOS окутуучуларды жаңырта алган жок.' : 'CampusOS could not update teacher assignments.',
    bulkEnrollmentDoneTitle: language === 'Kyrgyz' ? 'Топтук каттоо аяктады' : 'Bulk enrollment completed',
    bulkEnrollmentDoneMessage: language === 'Kyrgyz'
      ? (created, skipped, missing) => `${created} жаңы каттоо түзүлдү, ${skipped} мурунтан бар эле.${missing ? ` Табылбаган студенттер: ${missing}.` : ''}`
      : (created, skipped, missing) => `${created} new enrollment(s) were created, ${skipped} were already present.${missing ? ` Missing students: ${missing}.` : ''}`,
    bulkEnrollmentProcessedToast: language === 'Kyrgyz' ? 'Топтук каттоо иштетилди' : 'Bulk enrollment processed',
    bulkEnrollmentFailedTitle: language === 'Kyrgyz' ? 'Топтук каттоо ишке ашкан жок' : 'Bulk enrollment failed',
    bulkEnrollmentFailedMessage: language === 'Kyrgyz' ? 'CampusOS каттоо топтомун иштете алган жок.' : 'CampusOS could not process the enrollment batch.',
    overviewExportFailedTitle: language === 'Kyrgyz' ? 'Серепти экспорттоо ишке ашкан жок' : 'Overview export failed',
    overviewExportFailedMessage: language === 'Kyrgyz' ? 'CampusOS операциялык серепти экспорттой алган жок.' : 'CampusOS could not export the operations overview.',
    rosterCourseRequiredTitle: language === 'Kyrgyz' ? 'Тизмени экспорттоо үчүн курс тандалган жок' : 'No course selected for roster export',
    rosterCourseRequiredMessage: language === 'Kyrgyz' ? 'Академиялык тизмени экспорттоодон мурда курсту тандаңыз.' : 'Choose a course before exporting its academic list.',
    rosterExportedToast: language === 'Kyrgyz'
      ? (courseName) => `${courseName} үчүн академиялык тизме экспорттолду`
      : (courseName) => `Academic list exported for ${courseName}`,
    rosterExportFailedTitle: language === 'Kyrgyz' ? 'Тизмени экспорттоо ишке ашкан жок' : 'Roster export failed',
    rosterExportFailedMessage: language === 'Kyrgyz' ? 'CampusOS тандалган академиялык тизмени экспорттой алган жок.' : 'CampusOS could not export the selected academic list.',
    selectedCourseFallback: language === 'Kyrgyz' ? 'тандалган курс' : 'selected course'
  };
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [teacherId, setTeacherId] = useState('');
  const [studentIdentifiers, setStudentIdentifiers] = useState('');
  const [reportRows, setReportRows] = useState([]);
  const [reportSummary, setReportSummary] = useState(null);
  const [reportCourseId, setReportCourseId] = useState('');
  const [loadingState, setLoadingState] = useState({
    assign: false,
    enroll: false,
    report: false,
    roster: false
  });

  const visibleSelectionPool = visibleCourses.length > 0 ? visibleCourses : courses;
  const selectedCourseSet = new Set(selectedCourseIds.map(String));
  const selectedCourses = courses.filter((course) => selectedCourseSet.has(String(course.id)));

  useEffect(() => {
    setSelectedCourseIds((current) => current.filter((courseId) => courses.some((course) => String(course.id) === String(courseId))));

    if (reportCourseId && !courses.some((course) => String(course.id) === String(reportCourseId))) {
      setReportCourseId('');
    }
  }, [courses, reportCourseId]);

  const toggleCourseSelection = (courseId) => {
    const nextId = String(courseId);
    setSelectedCourseIds((current) => (
      current.includes(nextId)
        ? current.filter((value) => value !== nextId)
        : [...current, nextId]
    ));
  };

  const selectVisibleCourses = () => {
    setSelectedCourseIds((current) => {
      const next = new Set(current);
      visibleSelectionPool.forEach((course) => next.add(String(course.id)));
      return [...next];
    });
  };

  const clearSelectedCourses = () => {
    setSelectedCourseIds([]);
  };

  const loadOverviewReport = async () => {
    setLoadingState((current) => ({ ...current, report: true }));

    try {
      const response = await api.getCourseOperationsReport();
      setReportRows(response?.rows || []);
      setReportSummary(response?.summary || null);
      onStatus({
        tone: 'success',
        title: copy.overviewReadyTitle,
        message: copy.overviewReadyMessage(response?.summary?.total_courses || 0)
      });
      return response;
    } catch (error) {
      onStatus({
        tone: 'error',
        title: copy.failedOverviewTitle,
        message: error.message || copy.failedOverviewMessage
      });
      throw error;
    } finally {
      setLoadingState((current) => ({ ...current, report: false }));
    }
  };

  const handleBulkTeacherAssignment = async () => {
    if (selectedCourseIds.length === 0) {
      onStatus({
        tone: 'error',
        title: copy.noSelectionTitle,
        message: copy.noSelectionAssignMessage
      });
      return;
    }

    setLoadingState((current) => ({ ...current, assign: true }));

    try {
      const response = await api.bulkAssignTeacherToCourses(teacherId || null, selectedCourseIds);
      await onCoursesUpdated();
      onStatus({
        tone: 'success',
        title: copy.teacherUpdatedTitle,
        message: copy.teacherUpdatedMessage(response?.summary?.updated_courses || 0, response?.summary?.missing_courses || 0)
      });
      onToast(teacherId ? copy.teacherAssignedToast : copy.teacherClearedToast);
    } catch (error) {
      onStatus({
        tone: 'error',
        title: copy.teacherFailedTitle,
        message: error.message || copy.teacherFailedMessage
      });
    } finally {
      setLoadingState((current) => ({ ...current, assign: false }));
    }
  };

  const handleBulkEnrollment = async () => {
    if (selectedCourseIds.length === 0) {
      onStatus({
        tone: 'error',
        title: copy.noSelectionTitle,
        message: copy.noSelectionEnrollMessage
      });
      return;
    }

    if (!studentIdentifiers.trim()) {
      onStatus({
        tone: 'error',
        title: copy.studentListEmptyTitle,
        message: copy.studentListEmptyMessage
      });
      return;
    }

    setLoadingState((current) => ({ ...current, enroll: true }));

    try {
      const response = await api.bulkEnrollStudents(selectedCourseIds, studentIdentifiers);
      await onCoursesUpdated();
      onStatus({
        tone: 'success',
        title: copy.bulkEnrollmentDoneTitle,
        message: copy.bulkEnrollmentDoneMessage(
          response?.summary?.created || 0,
          response?.summary?.skipped || 0,
          response?.summary?.missing_students || 0
        )
      });
      onToast(copy.bulkEnrollmentProcessedToast);
      setStudentIdentifiers('');
    } catch (error) {
      onStatus({
        tone: 'error',
        title: copy.bulkEnrollmentFailedTitle,
        message: error.message || copy.bulkEnrollmentFailedMessage
      });
    } finally {
      setLoadingState((current) => ({ ...current, enroll: false }));
    }
  };

  const handleExportOverview = async () => {
    try {
      const response = reportRows.length > 0 && reportSummary
        ? { rows: reportRows, summary: reportSummary }
        : await loadOverviewReport();

      downloadCsvFile(
        'campusos-course-operations-overview.csv',
        [
          { key: 'code', label: 'Course Code' },
          { key: 'name', label: 'Course Name' },
          { key: 'semester', label: 'Semester' },
          { key: 'credits', label: 'Credits' },
          { key: 'teacher_name', label: 'Teacher' },
          { key: 'teacher_email', label: 'Teacher Email' },
          { key: 'enrollment_count', label: 'Enrollment Count' },
          { key: 'group_count', label: 'Group Count' }
        ],
        response?.rows || []
      );

      onToast('Operations overview exported');
    } catch (error) {
      onStatus({
        tone: 'error',
        title: copy.overviewExportFailedTitle,
        message: error.message || copy.overviewExportFailedMessage
      });
    }
  };

  const handleExportRoster = async () => {
    if (!reportCourseId) {
      onStatus({
        tone: 'error',
        title: copy.rosterCourseRequiredTitle,
        message: copy.rosterCourseRequiredMessage
      });
      return;
    }

    setLoadingState((current) => ({ ...current, roster: true }));

    try {
      const response = await api.getCourseRoster(reportCourseId);
      const course = response?.course || {};
      downloadCsvFile(
        `campusos-${String(course.code || reportCourseId).toLowerCase()}-roster.csv`,
        [
          { key: 'student_id', label: 'Student ID' },
          { key: 'name', label: 'Student Name' },
          { key: 'email', label: 'Email' },
          { key: 'group_name', label: 'Group' },
          { key: 'subgroup_name', label: 'Subgroup' },
          { key: 'faculty', label: 'Faculty' },
          { key: 'major', label: 'Major' },
          { key: 'enrolled_at', label: 'Enrolled At' }
        ],
        response?.students || []
      );
      onToast(copy.rosterExportedToast(course.name || copy.selectedCourseFallback));
    } catch (error) {
      onStatus({
        tone: 'error',
        title: copy.rosterExportFailedTitle,
        message: error.message || copy.rosterExportFailedMessage
      });
    } finally {
      setLoadingState((current) => ({ ...current, roster: false }));
    }
  };

  return (
    <section className="lms-admin-ops">
      <div className="lms-admin-ops-head">
        <div>
          <span className="lms-admin-ops-eyebrow">{copy.eyebrow}</span>
          <h3>{copy.title}</h3>
          <p>{copy.subtitle}</p>
        </div>

        <div className="lms-admin-ops-actions">
          <span className="lms-admin-selection-pill">{copy.selected(selectedCourseIds.length)}</span>
          <button type="button" className="cd-btn-sec" onClick={selectVisibleCourses}>
            {copy.selectVisible}
          </button>
          <button type="button" className="cd-btn-sec" onClick={clearSelectedCourses}>
            {copy.clearSelection}
          </button>
        </div>
      </div>

      {visibleSelectionPool.length === 0 ? (
        <EmptyState
          compact
          eyebrow={copy.selectionEyebrow}
          title={copy.emptySelectionTitle}
          description={copy.emptySelectionDescription}
        />
      ) : (
        <div className="lms-admin-course-picker">
          {visibleSelectionPool.map((course) => {
            const isSelected = selectedCourseSet.has(String(course.id));

            return (
              <button
                key={course.id}
                type="button"
                className={`lms-admin-course-chip ${isSelected ? 'active' : ''}`}
                onClick={() => toggleCourseSelection(course.id)}
              >
                <span className="lms-admin-course-chip-title">{course.code} · {course.name}</span>
                <span className="lms-admin-course-chip-meta">{getTeacherName(course, language)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="lms-admin-ops-grid">
        <section className="lms-admin-op-card">
          <div className="lms-admin-op-head">
            <h4>{copy.bulkTeacherTitle}</h4>
            <p>{copy.bulkTeacherDescription}</p>
          </div>

          <label className="lms-admin-op-field">
            <span>{copy.teacher}</span>
            <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
              <option value="">{copy.clearTeacherAssignment}</option>
              {teacherOptions.map((teacherOption) => (
                <option key={teacherOption.id} value={teacherOption.id}>{teacherOption.name}</option>
              ))}
            </select>
          </label>

          <div className="lms-admin-selected-list">
            {selectedCourses.length === 0 ? (
              <span className="lms-admin-inline-note">{copy.noSelectionYet}</span>
            ) : (
              selectedCourses.map((course) => (
                <span key={course.id} className="lms-admin-selected-item">{course.code}</span>
              ))
            )}
          </div>

          <button
            type="button"
            className="cd-btn-pri"
            onClick={handleBulkTeacherAssignment}
            disabled={loadingState.assign || selectedCourseIds.length === 0}
          >
            {loadingState.assign ? copy.updating : (teacherId ? copy.assignTeacher : copy.clearTeacher)}
          </button>
        </section>

        <section className="lms-admin-op-card">
          <div className="lms-admin-op-head">
            <h4>{copy.bulkEnrollmentTitle}</h4>
            <p>{copy.bulkEnrollmentDescription}</p>
          </div>

          <label className="lms-admin-op-field">
            <span>{copy.studentEmails}</span>
            <textarea
              value={studentIdentifiers}
              onChange={(event) => setStudentIdentifiers(event.target.value)}
              placeholder={'240141052\nstudent.one@alatoo.edu.kg\n240141053'}
            />
          </label>

          <button
            type="button"
            className="cd-btn-pri"
            onClick={handleBulkEnrollment}
            disabled={loadingState.enroll || selectedCourseIds.length === 0}
          >
            {loadingState.enroll ? copy.processing : copy.enrollSelection}
          </button>
        </section>

        <section className="lms-admin-op-card">
          <div className="lms-admin-op-head">
            <h4>{copy.exportsTitle}</h4>
            <p>{copy.exportsDescription}</p>
          </div>

          <div className="lms-admin-report-actions">
            <button type="button" className="cd-btn-sec" onClick={loadOverviewReport} disabled={loadingState.report}>
              {loadingState.report ? copy.loading : copy.loadOverview}
            </button>
            <button type="button" className="cd-btn-pri" onClick={handleExportOverview}>
              {copy.exportOverview}
            </button>
          </div>

          <label className="lms-admin-op-field">
            <span>{copy.academicListByCourse}</span>
            <select value={reportCourseId} onChange={(event) => setReportCourseId(event.target.value)}>
              <option value="">{copy.selectCourseRoster}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.code} · {course.name}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="cd-btn-sec"
            onClick={handleExportRoster}
            disabled={loadingState.roster}
          >
            {loadingState.roster ? copy.preparingRoster : copy.exportAcademicList}
          </button>

          {reportSummary ? (
            <div className="lms-admin-report-summary">
              <div className="lms-admin-report-metric">
                <strong>{reportSummary.total_courses}</strong>
                <span>{copy.courses}</span>
              </div>
              <div className="lms-admin-report-metric">
                <strong>{reportSummary.assigned_courses}</strong>
                <span>{copy.assigned}</span>
              </div>
              <div className="lms-admin-report-metric">
                <strong>{reportSummary.unassigned_courses}</strong>
                <span>{copy.unassigned}</span>
              </div>
              <div className="lms-admin-report-metric">
                <strong>{reportSummary.total_enrollments}</strong>
                <span>{copy.enrollments}</span>
              </div>
            </div>
          ) : (
            <span className="lms-admin-inline-note">{copy.previewHint}</span>
          )}

          {reportRows.length > 0 ? (
            <div className="lms-admin-report-preview">
              {reportRows.slice(0, 5).map((row) => (
                <div key={row.id} className="lms-admin-report-row">
                  <div>
                    <strong>{row.code}</strong>
                    <span>{row.name}</span>
                  </div>
                  <div>
                    <strong>{row.enrollment_count}</strong>
                    <span>{copy.enrolled}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function Card({ course, enrolled, progress, isStudent, onOpen, onEnroll, onUnenroll, index, language = 'English' }) {
  const baseCopy = (COURSES_COPY[language] || COURSES_COPY.English).card;
  const copy = {
    ...baseCopy,
    creditsShort: baseCopy.creditsShort || (language === 'Kyrgyz' ? 'кр' : 'cr'),
    leave: baseCopy.leave || (language === 'Kyrgyz' ? 'Чыгуу' : 'Leave'),
    enroll: baseCopy.enroll || (language === 'Kyrgyz' ? 'Катталуу' : 'Enroll')
  };

  return (
    <div className="cv-card" onClick={onOpen} style={{ '--cc': course.color, animationDelay: `${index * 0.04}s` }} aria-label={(COURSES_COPY[language] || COURSES_COPY.English).cardDescription(course.name)}>
      <div className="cv-card-top">
        <span className="cv-card-icon">{course.icon}</span>
        {isStudent && enrolled ? <Ring pct={progress?.pct || 0} size={46} /> : <span className="cv-card-code">{course.code}</span>}
      </div>

      <div className="cv-card-body">
        {isStudent && <div className="cv-card-code">{course.code}</div>}
        <div className="cv-card-name">{course.name}</div>
        <div className="cv-card-desc">{course.description}</div>
      </div>

      <div className="cv-card-footer">
        <div className="cv-card-meta">
          <span>{getTeacherName(course, language)}</span>
          <span>{course.credits} {copy.creditsShort}</span>
          <span>{copy.topics(course.topics.length)}</span>
          <span>{copy.materials(course.materials.length)}</span>
        </div>

        {isStudent && (
          <button
            className={enrolled ? 'cv-btn-leave' : 'cv-btn-join'}
            onClick={(event) => {
              event.stopPropagation();
              if (enrolled) {
                onUnenroll();
                return;
              }
              onEnroll();
            }}
          >
            {enrolled ? copy.leave : copy.enroll}
          </button>
        )}
      </div>
    </div>
  );
}

function Detail({ course, userId, userRole, isAdmin, teacherOptions, onBack, onCourseChange, language = 'English' }) {
  const baseCopy = (COURSES_COPY[language] || COURSES_COPY.English).detail;
  const copy = {
    ...baseCopy,
    code: baseCopy.code || (language === 'Kyrgyz' ? 'Код' : 'Code'),
    creditsField: baseCopy.creditsField || (language === 'Kyrgyz' ? 'Кредиттер' : 'Credits'),
    name: baseCopy.name || (language === 'Kyrgyz' ? 'Аталышы' : 'Name'),
    semester: baseCopy.semester || (language === 'Kyrgyz' ? 'Семестр' : 'Semester'),
    teacher: baseCopy.teacher || (language === 'Kyrgyz' ? 'Окутуучу' : 'Teacher'),
    cancel: baseCopy.cancel || (language === 'Kyrgyz' ? 'Жокко чыгаруу' : 'Cancel'),
    failedUpdate: baseCopy.failedUpdate || (language === 'Kyrgyz' ? 'Курсту жаңыртуу ишке ашкан жок' : 'Failed to update course'),
    failedDelete: baseCopy.failedDelete || (language === 'Kyrgyz' ? 'Курсту өчүрүү ишке ашкан жок' : 'Failed to delete course'),
    deleteConfirm: baseCopy.deleteConfirm || ((name) => (language === 'Kyrgyz' ? `"${name}" курсун өчүрөсүзбү?` : `Delete course "${name}"?`))
  };
  const [tab, setTab] = useState('syllabus');
  const [progress, setProgress] = useState(() => db.progress.get(userId, course.id));
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [topic, setTopic] = useState({ week: 1, title: '', desc: '' });
  const [material, setMaterial] = useState({ title: '', type: 'pdf', url: '', size: '' });
  const [courseForm, setCourseForm] = useState({
    code: course.code,
    name: course.name,
    description: course.description,
    credits: course.credits,
    semester: course.semester,
    teacher_id: normalizeTeacherId(course.teacher_id)
  });
  const [currentCourse, setCurrentCourse] = useState(course);

  const canEdit = userRole === 'admin' || userRole === 'teacher';
  const materialIcons = { pdf: 'PDF', video: 'VID', pptx: 'PPT', link: 'URL', docx: 'DOC', other: 'FILE' };

  const syncCourse = (nextCourse) => {
    const hydrated = enhanceCourse(nextCourse, language);
    persistCourseContent(hydrated);
    db.courses.save(replaceCourse(db.courses.all(), hydrated));
    setCurrentCourse(hydrated);
    setCourseForm({
      code: hydrated.code,
      name: hydrated.name,
      description: hydrated.description,
      credits: hydrated.credits,
      semester: hydrated.semester,
      teacher_id: normalizeTeacherId(hydrated.teacher_id)
    });
    onCourseChange?.(hydrated);
  };

  const saveCourseMeta = async (event) => {
    event.preventDefault();

    const payload = {
      code: courseForm.code.trim().toUpperCase(),
      name: courseForm.name.trim(),
      description: courseForm.description.trim(),
      credits: Number(courseForm.credits),
      semester: courseForm.semester.trim(),
      ...(isAdmin ? { teacher_id: courseForm.teacher_id || null } : {})
    };

    if (!payload.code || !payload.name) {
      return;
    }

    try {
      const response = await api.updateCourse(currentCourse.id, payload);
      const nextCourseData = response?.course || payload;
      syncCourse({
        ...currentCourse,
        ...nextCourseData,
        teacher: getTeacherName(nextCourseData, language),
        topics: currentCourse.topics,
        materials: currentCourse.materials
      });
    } catch (error) {
      if (!isConnectionError(error)) {
        window.alert(error.message || copy.failedUpdate);
        return;
      }

      console.error('Failed to update course in API, saving locally:', error);
      syncCourse({
        ...currentCourse,
        ...payload
      });
    }

    setShowCourseForm(false);
  };

  const deleteCourse = async () => {
    const confirmed = window.confirm(copy.deleteConfirm(currentCourse.name));
    if (!confirmed) return;

    try {
      await api.deleteCourse(currentCourse.id);
    } catch (error) {
      if (!isConnectionError(error)) {
        window.alert(error.message || copy.failedDelete);
        return;
      }

      console.error('Failed to delete course in API, deleting locally:', error);
    }

    removeCourseDetailStore(getCourseKey(currentCourse));
    onCourseChange?.(null, currentCourse.id);
    onBack();
  };

  const toggleTopic = (topicId) => {
    if (canEdit || currentCourse.topics.length === 0) return;

    const done = progress.done.includes(topicId)
      ? progress.done.filter((value) => value !== topicId)
      : [...progress.done, topicId];
    const pct = Math.round((done.length / currentCourse.topics.length) * 100);

    db.progress.save(userId, currentCourse.id, { pct, done });
    setProgress({ pct, done });
  };

  const addTopic = (event) => {
    event.preventDefault();

    syncCourse({
      ...currentCourse,
      topics: [
        ...currentCourse.topics,
        {
          id: `${getCourseKey(currentCourse)}-TOPIC-${Date.now()}`,
          week: Number(topic.week),
          title: topic.title.trim(),
          desc: topic.desc.trim()
        }
      ]
    });

    setTopic({ week: 1, title: '', desc: '' });
    setShowTopicForm(false);
  };

  const deleteTopic = (topicId) => {
    syncCourse({
      ...currentCourse,
      topics: currentCourse.topics.filter((item) => item.id !== topicId)
    });
  };

  const addMaterial = (event) => {
    event.preventDefault();

    syncCourse({
      ...currentCourse,
      materials: [
        ...currentCourse.materials,
        {
          id: `${getCourseKey(currentCourse)}-MAT-${Date.now()}`,
          title: material.title.trim(),
          type: material.type,
          size: material.size.trim() || 'Local file',
          url: material.url.trim(),
          date: new Date().toISOString().slice(0, 10)
        }
      ]
    });

    setMaterial({ title: '', type: 'pdf', url: '', size: '' });
    setShowMaterialForm(false);
  };

  const deleteMaterial = (materialId) => {
    syncCourse({
      ...currentCourse,
      materials: currentCourse.materials.filter((item) => item.id !== materialId)
    });
  };

  const weeks = [...new Set(currentCourse.topics.map((item) => item.week))].sort((left, right) => left - right);

  return (
    <div className="cd-wrap">
      <div className="cd-hero" style={{ '--cc': currentCourse.color }}>
        <button className="cd-back" onClick={onBack}>{copy.back}</button>

        <div className="cd-hero-inner">
          <div className="cd-hero-left">
            <span className="cd-hero-icon">{currentCourse.icon}</span>
            <div>
              <div className="cd-hero-code">{currentCourse.code} - {currentCourse.semester}</div>
              <h2 className="cd-hero-name">{currentCourse.name}</h2>
              <div className="cd-hero-meta">
                <span>{getTeacherName(currentCourse, language)}</span>
                <span>{currentCourse.credits} {copy.credits}</span>
              </div>
            </div>
          </div>

          {userRole === 'student' && (
            <div className="cd-hero-ring">
              <Ring pct={progress.pct} size={76} />
              <div className="cd-ring-label">{copy.progress}</div>
            </div>
          )}
        </div>

        <p className="cd-hero-desc">{currentCourse.description}</p>

        {canEdit && (
          <div className="cd-hero-actions">
            <button className="cd-btn-sec cd-hero-btn" onClick={() => setShowCourseForm((value) => !value)}>
              {showCourseForm ? copy.closeEdit : copy.editCourse}
            </button>
            <button className="cd-btn-danger cd-hero-btn" onClick={deleteCourse}>
              {copy.deleteCourse}
            </button>
          </div>
        )}
      </div>

      <div className="cd-tabs">
        {['syllabus', 'materials'].map((value) => (
          <button key={value} className={`cd-tab ${tab === value ? 'active' : ''}`} onClick={() => setTab(value)}>
            {value === 'syllabus' ? copy.syllabus : copy.materials}
            <span className="cd-tab-count">{value === 'syllabus' ? currentCourse.topics.length : currentCourse.materials.length}</span>
          </button>
        ))}

        {userRole === 'student' && (
          <div className="cd-progress-bar-wrap">
            <div className="cd-progress-bar" style={{ width: `${progress.pct}%`, background: currentCourse.color }} />
          </div>
        )}
      </div>

      <div className="cd-body">
        {canEdit && showCourseForm && (
          <form className="cd-inline-form" onSubmit={saveCourseMeta}>
            <div className="cd-form-grid">
              <label>
                <span>{copy.code}</span>
                <input value={courseForm.code} onChange={(event) => setCourseForm({ ...courseForm, code: event.target.value })} required />
              </label>
              <label>
                <span>{copy.creditsField}</span>
                <input type="number" min="1" max="12" value={courseForm.credits} onChange={(event) => setCourseForm({ ...courseForm, credits: event.target.value })} required />
              </label>
              <label>
                <span>{copy.name}</span>
                <input value={courseForm.name} onChange={(event) => setCourseForm({ ...courseForm, name: event.target.value })} required />
              </label>
              <label>
                <span>{copy.semester}</span>
                <input value={courseForm.semester} onChange={(event) => setCourseForm({ ...courseForm, semester: event.target.value })} required />
              </label>
              {isAdmin && (
                <label>
                  <span>{copy.teacher}</span>
                  <select
                    value={courseForm.teacher_id}
                    onChange={(event) => setCourseForm({ ...courseForm, teacher_id: event.target.value })}
                  >
                    <option value="">{copy.unassigned}</option>
                    {teacherOptions.map((teacherOption) => (
                      <option key={teacherOption.id} value={teacherOption.id}>{teacherOption.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="cd-form-wide">
                <span>{copy.description}</span>
                <textarea value={courseForm.description} onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })} />
              </label>
            </div>

            <div className="cd-form-actions">
              <button type="button" className="cd-btn-sec" onClick={() => setShowCourseForm(false)}>{copy.cancel}</button>
              <button type="submit" className="cd-btn-pri">{copy.saveCourse}</button>
            </div>
          </form>
        )}

        {tab === 'syllabus' && (
          <div>
            {userRole === 'student' && <div className="cd-hint">{copy.hint}</div>}

            {canEdit && (
              <button className="cd-add-btn" onClick={() => setShowTopicForm((value) => !value)}>
                {showTopicForm ? copy.cancel : copy.addTopic}
              </button>
            )}

            {showTopicForm && (
              <form className="cd-inline-form" onSubmit={addTopic}>
                <div className="cd-form-grid">
                  <label>
                    <span>{copy.week}</span>
                    <input type="number" min="1" value={topic.week} onChange={(event) => setTopic({ ...topic, week: event.target.value })} required />
                  </label>
                  <label>
                    <span>{copy.title}</span>
                    <input value={topic.title} onChange={(event) => setTopic({ ...topic, title: event.target.value })} required />
                  </label>
                  <label>
                    <span>{copy.description}</span>
                    <textarea value={topic.desc} onChange={(event) => setTopic({ ...topic, desc: event.target.value })} />
                  </label>
                </div>

                <div className="cd-form-actions">
                  <button type="button" className="cd-btn-sec" onClick={() => setShowTopicForm(false)}>{copy.cancel}</button>
                  <button type="submit" className="cd-btn-pri">{copy.saveTopic}</button>
                </div>
              </form>
            )}

            {weeks.map((week) => (
              <div key={week} className="cd-week-block">
                <div className="cd-week-label">
                  <span className="cd-week-num">{copy.week} {week}</span>
                  <span className="cd-week-done">
                    {currentCourse.topics.filter((item) => item.week === week && progress.done.includes(item.id)).length}/
                    {currentCourse.topics.filter((item) => item.week === week).length}
                  </span>
                </div>

                {currentCourse.topics.filter((item) => item.week === week).map((item) => {
                  const done = progress.done.includes(item.id);

                  return (
                    <div key={item.id} className={`cd-topic-row ${done ? 'done' : 'clickable'}`} onClick={() => toggleTopic(item.id)}>
                      <span className="cd-topic-check">{done ? copy.done : copy.openAction}</span>
                      <div className="cd-topic-text">
                        <div className="cd-topic-title">{item.title}</div>
                        {item.desc && <div className="cd-topic-desc">{item.desc}</div>}
                      </div>
                      {canEdit && (
                        <button
                          className="cd-row-del"
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteTopic(item.id);
                          }}
                        >
                          {copy.remove}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {tab === 'materials' && (
          <div>
            {canEdit && (
              <button className="cd-add-btn" onClick={() => setShowMaterialForm((value) => !value)}>
                {showMaterialForm ? copy.cancel : copy.addMaterial}
              </button>
            )}

            {showMaterialForm && (
              <form className="cd-inline-form" onSubmit={addMaterial}>
                <div className="cd-form-grid">
                  <label>
                    <span>{copy.title}</span>
                    <input value={material.title} onChange={(event) => setMaterial({ ...material, title: event.target.value })} required />
                  </label>
                  <label>
                    <span>{copy.type}</span>
                    <select value={material.type} onChange={(event) => setMaterial({ ...material, type: event.target.value })}>
                      {Object.keys(materialIcons).map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{material.type === 'link' ? copy.url : copy.size}</span>
                    <input
                      type={material.type === 'link' ? 'url' : 'text'}
                      value={material.type === 'link' ? material.url : material.size}
                      onChange={(event) => {
                        if (material.type === 'link') {
                          setMaterial({ ...material, url: event.target.value });
                          return;
                        }
                        setMaterial({ ...material, size: event.target.value });
                      }}
                    />
                  </label>
                </div>

                <div className="cd-form-actions">
                  <button type="button" className="cd-btn-sec" onClick={() => setShowMaterialForm(false)}>{copy.cancel}</button>
                  <button type="submit" className="cd-btn-pri">{copy.saveMaterial}</button>
                </div>
              </form>
            )}

            <div className="cd-mat-grid">
              {currentCourse.materials.map((item) => (
                <div key={item.id} className="cd-mat-card">
                  <div className="cd-mat-type-badge">{item.type.toUpperCase()}</div>
                  <div className="cd-mat-icon">{materialIcons[item.type] || materialIcons.other}</div>
                  <div className="cd-mat-title">{item.title}</div>
                  <div className="cd-mat-info">{item.size} - {item.date}</div>
                  <div className="cd-mat-actions">
                    {item.url ? <a href={item.url} target="_blank" rel="noreferrer">{copy.open}</a> : <span>{copy.localNote}</span>}
                    {canEdit && <button onClick={() => deleteMaterial(item.id)}>{copy.remove}</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoursesPage({ user, language = 'English' }) {
  const courseCopy = COURSES_COPY[language] || COURSES_COPY.English;
  const mainCopy = {
    ...courseCopy.main,
    offlineTitle: courseCopy.main.offlineTitle || (language === 'Kyrgyz' ? 'Оффлайн каталог режими' : 'Offline catalog mode'),
    offlineMessage: courseCopy.main.offlineMessage || (language === 'Kyrgyz' ? 'CampusOS локалдык сакталган курс каталогун колдонуп жатат, анткени API азыр жеткиликсиз.' : 'CampusOS is using the locally cached course catalog because the API is currently unavailable.'),
    formIncompleteTitle: courseCopy.main.formIncompleteTitle || (language === 'Kyrgyz' ? 'Курс формасы толук эмес' : 'Course form is incomplete'),
    formIncompleteMessage: courseCopy.main.formIncompleteMessage || (language === 'Kyrgyz' ? 'Карта түзүлүшү үчүн курс коду менен курс аталышы милдеттүү.' : 'Course code and course title are required before a card can be created.'),
    requiredToast: courseCopy.main.requiredToast || (language === 'Kyrgyz' ? 'Код менен аталыш талап кылынат' : 'Code and title are required'),
    createdToast: courseCopy.main.createdToast || (language === 'Kyrgyz' ? 'Курс картасы түзүлдү' : 'Course card created'),
    savedLocallyTitle: courseCopy.main.savedLocallyTitle || (language === 'Kyrgyz' ? 'Жергиликтүү сакталды' : 'Saved locally'),
    savedLocallyMessage: courseCopy.main.savedLocallyMessage || (language === 'Kyrgyz' ? 'API азыр жеткиликсиз болгондуктан, жаңы курс картасы жергиликтүү сакталды.' : 'The new course card was stored locally because the API is unavailable right now.'),
    savedLocallyToast: courseCopy.main.savedLocallyToast || (language === 'Kyrgyz' ? 'Курс картасы жергиликтүү сакталды' : 'Course card saved locally'),
    localTeacher: courseCopy.main.localTeacher || (language === 'Kyrgyz' ? 'Жергиликтүү окутуучу' : 'Local teacher')
  };
  const [courses, setCourses] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [listView, setListView] = useState('catalog');
  const [detailId, setDetailId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_CREATE_FORM);
  const [statusBanner, setStatusBanner] = useState({ tone: '', title: '', message: '' });
  const { toast, show } = useToast();

  const isStudent = isStudentAccount(user);
  const canManage = canManageAcademicRecords(user);
  const isAdmin = hasAdminAccess(user);
  const userId = user?.id || 'guest';
  const teacherLookup = teacherOptions.reduce((lookup, teacher) => {
    lookup[String(teacher.id)] = teacher.name;
    return lookup;
  }, {});

  const loadCourses = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.getCourses();
      const hydrated = (response?.courses || []).map((course) => enhanceCourse(course, language));
      setCourses(hydrated);
      db.courses.save(hydrated);
      setStatusBanner((current) => (
        current.tone === 'info'
          ? { tone: '', title: '', message: '' }
          : current
      ));
      return hydrated;
    } catch (error) {
      console.error('Failed to load courses from API, using local fallback:', error);
      db.init();
      const fallback = db.courses.all().map((course) => enhanceCourse(course, language));
      setCourses(fallback);
      setStatusBanner({
        tone: 'info',
        title: mainCopy.offlineTitle,
        message: mainCopy.offlineMessage
      });
      return fallback;
    } finally {
      setLoading(false);
    }
  }, [language, mainCopy.offlineMessage, mainCopy.offlineTitle]);

  const loadEnrolledCourses = async () => {
    if (!isStudent) {
      setEnrolled([]);
      return [];
    }

    try {
      const response = await api.getEnrolledCourses();
      const courseIds = (response?.courses || []).map((course) => course.id);
      setEnrolled(courseIds);
      return courseIds;
    } catch (error) {
      console.error('Failed to load enrolled courses, using local fallback:', error);
      const fallback = db.enrollments.get(userId);
      setEnrolled(fallback);
      return fallback;
    }
  };

  useEffect(() => {
    db.init();

    const load = async () => {
      await loadCourses();

      if (!isStudent) {
        setEnrolled([]);
        return;
      }

      try {
        const response = await api.getEnrolledCourses();
        const courseIds = (response?.courses || []).map((course) => course.id);
        setEnrolled(courseIds);
      } catch (error) {
        console.error('Failed to load enrolled courses, using local fallback:', error);
        setEnrolled(db.enrollments.get(userId));
      }
    };

    load();
  }, [isStudent, loadCourses, userId]);

  useEffect(() => {
    if (!isAdmin) {
      setTeacherOptions([]);
      return;
    }

    const loadTeacherOptions = async () => {
      try {
        const response = await api.getUsers();
        setTeacherOptions((response?.users || []).filter((item) => item.role === 'teacher'));
      } catch (error) {
        console.error('Failed to load teachers:', error);
        setTeacherOptions([]);
      }
    };

    loadTeacherOptions();
  }, [isAdmin]);

  useEffect(() => {
    if (detailId && !courses.some((course) => course.id === detailId)) {
      setDetailId(null);
    }
  }, [courses, detailId]);

  const updateCourseInState = (nextCourse, removedId = null) => {
    if (removedId !== null) {
      setCourses((current) => {
        const nextCourses = current.filter((course) => course.id !== removedId);
        db.courses.save(nextCourses);
        return nextCourses;
      });
      setEnrolled((current) => current.filter((courseId) => courseId !== removedId));
      return;
    }

    const hydrated = enhanceCourse(nextCourse, language);
    setCourses((current) => {
      const nextCourses = replaceCourse(current, hydrated);
      db.courses.save(nextCourses);
      return nextCourses;
    });
  };

  const enroll = async (courseId) => {
    try {
      await api.enrollInCourse(courseId);
      const updated = await loadEnrolledCourses();
      if (!updated.includes(courseId)) {
        setEnrolled((current) => [...new Set([...current, courseId])]);
      }
      db.enrollments.add(userId, courseId);
      show('Course added to your list');
    } catch (error) {
      console.error('Failed to enroll from API, saving locally:', error);
      db.enrollments.add(userId, courseId);
      setEnrolled((current) => [...new Set([...current, courseId])]);
      show('Course added locally');
    }
  };

  const unenroll = async (courseId) => {
    try {
      await api.unenrollFromCourse(courseId);
      await loadEnrolledCourses();
      db.enrollments.remove(userId, courseId);
      show('Course removed');
    } catch (error) {
      console.error('Failed to unenroll from API, updating locally:', error);
      db.enrollments.remove(userId, courseId);
      setEnrolled((current) => current.filter((value) => value !== courseId));
      show('Course removed locally');
    }
  };

  const handleCreateCourse = async (event) => {
    event.preventDefault();

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim(),
      credits: Number(form.credits),
      semester: form.semester.trim(),
      ...(isAdmin ? { teacher_id: form.teacher_id || null } : {})
    };

    if (!payload.code || !payload.name) {
      setStatusBanner({
        tone: 'error',
        title: mainCopy.formIncompleteTitle,
        message: mainCopy.formIncompleteMessage
      });
      show(mainCopy.requiredToast, 'error');
      return;
    }

    try {
      const response = await api.createCourse(payload);
      const refreshed = await loadCourses();
      const created = refreshed.find((course) => getCourseKey(course) === payload.code) || enhanceCourse(response.course || payload, language);
      setShowCreateForm(false);
      setForm(DEFAULT_CREATE_FORM);
      setStatusBanner({ tone: '', title: '', message: '' });
      show(mainCopy.createdToast);
      if (created?.id) {
        setDetailId(created.id);
      }
    } catch (error) {
      console.error('Failed to create course in API, saving locally:', error);
      const localCourse = enhanceCourse({
        id: Date.now(),
        ...payload,
        teacher_id: payload.teacher_id || null,
        teacher_name: isAdmin
          ? (teacherLookup[String(payload.teacher_id)] || courseCopy.teacherNotAssigned)
          : (user?.name || user?.email || mainCopy.localTeacher),
        teacher: isAdmin
          ? (teacherLookup[String(payload.teacher_id)] || courseCopy.teacherNotAssigned)
          : (user?.name || user?.email || mainCopy.localTeacher)
      }, language);
      const nextCourses = replaceCourse(courses, localCourse);
      db.courses.save(nextCourses);
      setCourses(nextCourses);
      setShowCreateForm(false);
      setForm(DEFAULT_CREATE_FORM);
      setStatusBanner({
        tone: 'info',
        title: mainCopy.savedLocallyTitle,
        message: mainCopy.savedLocallyMessage
      });
      show(mainCopy.savedLocallyToast);
      setDetailId(localCourse.id);
    }
  };

  const detailCourse = courses.find((course) => course.id === detailId);
  const visibleCourses = (listView === 'mine' ? courses.filter((course) => enrolled.includes(course.id)) : courses)
    .filter((course) => {
      const term = search.toLowerCase();
      return course.name.toLowerCase().includes(term) || course.code.toLowerCase().includes(term);
    });
  const hasSearch = search.trim().length > 0;
  const visibleCourseBase = listView === 'mine' ? enrolled.length : courses.length;

  if (detailCourse) {
    return (
      <>
        <Detail
          key={`${detailCourse.id}-${userId}`}
          course={detailCourse}
          userId={userId}
          userRole={user?.role}
          isAdmin={isAdmin}
          teacherOptions={teacherOptions}
          onBack={() => setDetailId(null)}
          onCourseChange={updateCourseInState}
          language={language}
        />
        {toast && <div className={`lms-toast lms-toast-${toast.type}`}>{toast.message}</div>}
      </>
    );
  }

  return (
    <div className="lms-courses">
      <div className="lms-header">
        <div>
          <h2 className="lms-title">{mainCopy.title}</h2>
          <p className="lms-sub">
            {isStudent ? mainCopy.studentSubtitle : mainCopy.manageSubtitle}
          </p>
        </div>

        {canManage && (
          <button className="lms-create-btn" onClick={() => setShowCreateForm((value) => !value)}>
            {showCreateForm ? mainCopy.closeForm : mainCopy.createCourse}
          </button>
        )}
      </div>

      <StatusBanner tone={statusBanner.tone || 'info'} title={statusBanner.title} message={statusBanner.message} />

      <div className="lms-stats">
        <div className="lms-stat">
          <div>
            <div className="lms-stat-val">{courses.length}</div>
            <div className="lms-stat-lbl">{mainCopy.courseCards}</div>
          </div>
        </div>
        <div className="lms-stat">
          <div>
            <div className="lms-stat-val">{courses.filter((course) => course.topics.length > 0).length}</div>
            <div className="lms-stat-lbl">{mainCopy.cardsWithSyllabus}</div>
          </div>
        </div>
        <div className="lms-stat">
          <div>
            <div className="lms-stat-val">{courses.filter((course) => course.materials.length > 0).length}</div>
            <div className="lms-stat-lbl">{mainCopy.cardsWithMaterials}</div>
          </div>
        </div>
        <div className="lms-stat">
          <div>
            <div className="lms-stat-val">{isStudent ? enrolled.length : courses.reduce((sum, course) => sum + course.materials.length, 0)}</div>
            <div className="lms-stat-lbl">{isStudent ? mainCopy.enrolledCourses : mainCopy.totalMaterials}</div>
          </div>
        </div>
      </div>

      {isAdmin && (
        <AdminOperationsHub
          courses={courses}
          visibleCourses={visibleCourses}
          teacherOptions={teacherOptions}
          onCoursesUpdated={loadCourses}
          onStatus={setStatusBanner}
          onToast={show}
          language={language}
        />
      )}

      {canManage && showCreateForm && (
        <form className="lms-course-form" onSubmit={handleCreateCourse}>
          <div className="lms-course-form-grid">
            <label>
              <span>{mainCopy.formLabels.code}</span>
              <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder={mainCopy.formPlaceholders.code} required />
            </label>
            <label>
              <span>{mainCopy.formLabels.credits}</span>
              <input type="number" min="1" max="12" value={form.credits} onChange={(event) => setForm({ ...form, credits: event.target.value })} required />
            </label>
            <label className="lms-course-form-wide">
              <span>{mainCopy.formLabels.courseTitle}</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={mainCopy.formPlaceholders.courseTitle} required />
            </label>
            <label>
              <span>{mainCopy.formLabels.semester}</span>
              <input value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })} placeholder={mainCopy.formPlaceholders.semester} required />
            </label>
            {isAdmin && (
              <label>
                <span>{mainCopy.formLabels.teacher}</span>
                <select value={form.teacher_id} onChange={(event) => setForm({ ...form, teacher_id: event.target.value })}>
                  <option value="">{mainCopy.formLabels.assignLater}</option>
                  {teacherOptions.map((teacherOption) => (
                    <option key={teacherOption.id} value={teacherOption.id}>{teacherOption.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="lms-course-form-wide">
              <span>{mainCopy.formLabels.description}</span>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={mainCopy.formPlaceholders.description} />
            </label>
          </div>

          <div className="lms-course-form-actions">
            <p className="lms-course-form-note">
              {mainCopy.createNote}
            </p>
            <div className="cd-form-actions">
              <button type="button" className="cd-btn-sec" onClick={() => setShowCreateForm(false)}>{mainCopy.cancel}</button>
              <button type="submit" className="cd-btn-pri">{mainCopy.createCard}</button>
            </div>
          </div>
        </form>
      )}

      <div className="lms-controls">
        <div className="lms-controls-copy">
          <strong>{listView === 'mine' ? mainCopy.myCourseList : mainCopy.catalog}</strong>
          <span>{mainCopy.showingCards(visibleCourses.length, visibleCourseBase)}</span>
        </div>
        <div className="lms-controls-actions">
          {isStudent && (
            <div className="lms-tabs">
              <button className={listView === 'catalog' ? 'lms-tab active' : 'lms-tab'} onClick={() => setListView('catalog')}>
                <span>{mainCopy.all(courses.length)}</span>
              </button>
              <button className={listView === 'mine' ? 'lms-tab active' : 'lms-tab'} onClick={() => setListView('mine')}>
                <span>{mainCopy.mine(enrolled.length)}</span>
              </button>
            </div>
          )}

          <input className="lms-search" placeholder={mainCopy.searchPlaceholder} aria-label={mainCopy.searchAria} value={search} onChange={(event) => setSearch(event.target.value)} />
          {hasSearch && (
            <button type="button" className="management-filter-chip lms-clear-search" onClick={() => setSearch('')}>
              {mainCopy.clearSearch}
            </button>
          )}
        </div>
      </div>

      {isStudent && listView === 'mine' && enrolled.length > 0 && (
        <div className="lms-progress-strip">
          {courses.filter((course) => enrolled.includes(course.id)).map((course) => {
            const progress = db.progress.get(userId, course.id);

            return (
              <div key={course.id} className="lms-pstrip-item" style={{ '--cc': course.color }} onClick={() => setDetailId(course.id)}>
                <span className="lms-pstrip-icon">{course.icon}</span>
                <div className="lms-pstrip-info">
                  <div className="lms-pstrip-name">{course.name}</div>
                  <div className="lms-pstrip-bar">
                    <div className="lms-pstrip-fill" style={{ width: `${progress.pct}%`, background: course.color }} />
                  </div>
                </div>
                <span className="lms-pstrip-pct" style={{ color: course.color }}>{progress.pct}%</span>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="lms-grid">
          {[0, 1, 2, 3].map((item) => (
            <div className="cv-card skeleton" key={item} />
          ))}
        </div>
      ) : visibleCourses.length === 0 ? (
        <EmptyState
          eyebrow={mainCopy.title}
          title={listView === 'mine' ? mainCopy.emptyTitleMine : mainCopy.emptyTitleSearch}
          description={
            listView === 'mine'
              ? mainCopy.emptyDescriptionMine
              : mainCopy.emptyDescriptionSearch
          }
          actionLabel={hasSearch ? mainCopy.clearSearch : (isStudent && listView === 'mine' ? mainCopy.openCatalog : '')}
          onAction={() => {
            if (hasSearch) {
              setSearch('');
              return;
            }
            if (isStudent && listView === 'mine') {
              setListView('catalog');
            }
          }}
        />
      ) : (
        <div className="lms-grid">
          {visibleCourses.map((course, index) => (
            <Card
              key={course.id}
              course={course}
              index={index}
              enrolled={enrolled.includes(course.id)}
              progress={db.progress.get(userId, course.id)}
              isStudent={isStudent}
              onOpen={() => setDetailId(course.id)}
              onEnroll={() => enroll(course.id)}
              onUnenroll={() => unenroll(course.id)}
              language={language}
            />
          ))}
        </div>
      )}

      {toast && <div className={`lms-toast lms-toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
