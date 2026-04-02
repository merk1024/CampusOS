import { useEffect, useState } from 'react';
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
const getTeacherName = (course) => course?.teacher_name || course?.teacher || 'Teacher not assigned';
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

const enhanceCourse = (course) => {
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
    teacher: getTeacherName(course),
    credits: Number(course.credits || 3),
    semester: course.semester || 'Current semester',
    description: course.description || `${course.name} course card.`,
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
  onToast
}) {
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
        title: 'Operational overview ready',
        message: `CampusOS prepared ${response?.summary?.total_courses || 0} course rows for export and review.`
      });
      return response;
    } catch (error) {
      onStatus({
        tone: 'error',
        title: 'Failed to load operational overview',
        message: error.message || 'CampusOS could not prepare the course operations report.'
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
        title: 'No course selection',
        message: 'Select at least one course card before assigning a teacher.'
      });
      return;
    }

    setLoadingState((current) => ({ ...current, assign: true }));

    try {
      const response = await api.bulkAssignTeacherToCourses(teacherId || null, selectedCourseIds);
      await onCoursesUpdated();
      onStatus({
        tone: 'success',
        title: 'Teacher assignment updated',
        message: `${response?.summary?.updated_courses || 0} selected course card(s) were updated.${response?.summary?.missing_courses ? ` Missing: ${response.summary.missing_courses}.` : ''}`
      });
      onToast(teacherId ? 'Teacher assigned to selected courses' : 'Teacher cleared from selected courses');
    } catch (error) {
      onStatus({
        tone: 'error',
        title: 'Bulk teacher assignment failed',
        message: error.message || 'CampusOS could not update teacher assignments.'
      });
    } finally {
      setLoadingState((current) => ({ ...current, assign: false }));
    }
  };

  const handleBulkEnrollment = async () => {
    if (selectedCourseIds.length === 0) {
      onStatus({
        tone: 'error',
        title: 'No course selection',
        message: 'Select one or more course cards before enrolling students.'
      });
      return;
    }

    if (!studentIdentifiers.trim()) {
      onStatus({
        tone: 'error',
        title: 'Student list is empty',
        message: 'Paste student emails or student IDs to process bulk enrollment.'
      });
      return;
    }

    setLoadingState((current) => ({ ...current, enroll: true }));

    try {
      const response = await api.bulkEnrollStudents(selectedCourseIds, studentIdentifiers);
      await onCoursesUpdated();
      onStatus({
        tone: 'success',
        title: 'Bulk enrollment completed',
        message: `${response?.summary?.created || 0} new enrollments were created, ${response?.summary?.skipped || 0} were already present.${response?.summary?.missing_students ? ` Missing students: ${response.summary.missing_students}.` : ''}`
      });
      onToast('Bulk enrollment processed');
      setStudentIdentifiers('');
    } catch (error) {
      onStatus({
        tone: 'error',
        title: 'Bulk enrollment failed',
        message: error.message || 'CampusOS could not process the enrollment batch.'
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
        title: 'Overview export failed',
        message: error.message || 'CampusOS could not export the operations overview.'
      });
    }
  };

  const handleExportRoster = async () => {
    if (!reportCourseId) {
      onStatus({
        tone: 'error',
        title: 'No course selected for roster export',
        message: 'Choose a course before exporting its academic list.'
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
      onToast(`Academic list exported for ${course.name || 'selected course'}`);
    } catch (error) {
      onStatus({
        tone: 'error',
        title: 'Roster export failed',
        message: error.message || 'CampusOS could not export the selected academic list.'
      });
    } finally {
      setLoadingState((current) => ({ ...current, roster: false }));
    }
  };

  return (
    <section className="lms-admin-ops">
      <div className="lms-admin-ops-head">
        <div>
          <span className="lms-admin-ops-eyebrow">Admin Operations</span>
          <h3>Academic operations hub</h3>
          <p>Assign teachers, enroll students into selected subjects, and export operational views without leaving the course catalog.</p>
        </div>

        <div className="lms-admin-ops-actions">
          <span className="lms-admin-selection-pill">{selectedCourseIds.length} selected</span>
          <button type="button" className="cd-btn-sec" onClick={selectVisibleCourses}>
            Select visible
          </button>
          <button type="button" className="cd-btn-sec" onClick={clearSelectedCourses}>
            Clear selection
          </button>
        </div>
      </div>

      {visibleSelectionPool.length === 0 ? (
        <EmptyState
          compact
          eyebrow="Course selection"
          title="No course cards available for bulk actions"
          description="Create a course card first, or clear the current search to see more options."
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
                <span className="lms-admin-course-chip-meta">{getTeacherName(course)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="lms-admin-ops-grid">
        <section className="lms-admin-op-card">
          <div className="lms-admin-op-head">
            <h4>Bulk teacher assignment</h4>
            <p>Assign one teacher to the selected course set, or clear the teacher slot in one step.</p>
          </div>

          <label className="lms-admin-op-field">
            <span>Teacher</span>
            <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)}>
              <option value="">Clear teacher assignment</option>
              {teacherOptions.map((teacherOption) => (
                <option key={teacherOption.id} value={teacherOption.id}>{teacherOption.name}</option>
              ))}
            </select>
          </label>

          <div className="lms-admin-selected-list">
            {selectedCourses.length === 0 ? (
              <span className="lms-admin-inline-note">No course cards selected yet.</span>
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
            {loadingState.assign ? 'Updating...' : (teacherId ? 'Assign teacher to selection' : 'Clear teacher from selection')}
          </button>
        </section>

        <section className="lms-admin-op-card">
          <div className="lms-admin-op-head">
            <h4>Bulk student enrollment</h4>
            <p>Paste student IDs or emails, one per line or separated by commas, and CampusOS will enroll them into the selected subjects.</p>
          </div>

          <label className="lms-admin-op-field">
            <span>Student emails or IDs</span>
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
            {loadingState.enroll ? 'Processing...' : 'Enroll students into selection'}
          </button>
        </section>

        <section className="lms-admin-op-card">
          <div className="lms-admin-op-head">
            <h4>Operational exports</h4>
            <p>Generate operational overviews and academic lists for administration without leaving the current workspace.</p>
          </div>

          <div className="lms-admin-report-actions">
            <button type="button" className="cd-btn-sec" onClick={loadOverviewReport} disabled={loadingState.report}>
              {loadingState.report ? 'Loading...' : 'Load overview'}
            </button>
            <button type="button" className="cd-btn-pri" onClick={handleExportOverview}>
              Export overview CSV
            </button>
          </div>

          <label className="lms-admin-op-field">
            <span>Academic list by course</span>
            <select value={reportCourseId} onChange={(event) => setReportCourseId(event.target.value)}>
              <option value="">Select course for roster export</option>
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
            {loadingState.roster ? 'Preparing roster...' : 'Export academic list CSV'}
          </button>

          {reportSummary ? (
            <div className="lms-admin-report-summary">
              <div className="lms-admin-report-metric">
                <strong>{reportSummary.total_courses}</strong>
                <span>Courses</span>
              </div>
              <div className="lms-admin-report-metric">
                <strong>{reportSummary.assigned_courses}</strong>
                <span>Assigned</span>
              </div>
              <div className="lms-admin-report-metric">
                <strong>{reportSummary.unassigned_courses}</strong>
                <span>Unassigned</span>
              </div>
              <div className="lms-admin-report-metric">
                <strong>{reportSummary.total_enrollments}</strong>
                <span>Enrollments</span>
              </div>
            </div>
          ) : (
            <span className="lms-admin-inline-note">Load the overview to preview course operations before export.</span>
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
                    <span>enrolled</span>
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

function Card({ course, enrolled, progress, isStudent, onOpen, onEnroll, onUnenroll, index }) {
  return (
    <div className="cv-card" onClick={onOpen} style={{ '--cc': course.color, animationDelay: `${index * 0.04}s` }}>
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
          <span>{getTeacherName(course)}</span>
          <span>{course.credits} cr</span>
          <span>{course.topics.length} topics</span>
          <span>{course.materials.length} materials</span>
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
            {enrolled ? 'Leave' : 'Enroll'}
          </button>
        )}
      </div>
    </div>
  );
}

function Detail({ course, userId, userRole, isAdmin, teacherOptions, onBack, onCourseChange }) {
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
    const hydrated = enhanceCourse(nextCourse);
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
        teacher: getTeacherName(nextCourseData),
        topics: currentCourse.topics,
        materials: currentCourse.materials
      });
    } catch (error) {
      if (!isConnectionError(error)) {
        window.alert(error.message || 'Failed to update course');
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
    const confirmed = window.confirm(`Delete course "${currentCourse.name}"?`);
    if (!confirmed) return;

    try {
      await api.deleteCourse(currentCourse.id);
    } catch (error) {
      if (!isConnectionError(error)) {
        window.alert(error.message || 'Failed to delete course');
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
        <button className="cd-back" onClick={onBack}>Back</button>

        <div className="cd-hero-inner">
          <div className="cd-hero-left">
            <span className="cd-hero-icon">{currentCourse.icon}</span>
            <div>
              <div className="cd-hero-code">{currentCourse.code} - {currentCourse.semester}</div>
              <h2 className="cd-hero-name">{currentCourse.name}</h2>
              <div className="cd-hero-meta">
                <span>{getTeacherName(currentCourse)}</span>
                <span>{currentCourse.credits} credits</span>
              </div>
            </div>
          </div>

          {userRole === 'student' && (
            <div className="cd-hero-ring">
              <Ring pct={progress.pct} size={76} />
              <div className="cd-ring-label">Progress</div>
            </div>
          )}
        </div>

        <p className="cd-hero-desc">{currentCourse.description}</p>

        {canEdit && (
          <div className="cd-hero-actions">
            <button className="cd-btn-sec cd-hero-btn" onClick={() => setShowCourseForm((value) => !value)}>
              {showCourseForm ? 'Close edit' : 'Edit course'}
            </button>
            <button className="cd-btn-danger cd-hero-btn" onClick={deleteCourse}>
              Delete course
            </button>
          </div>
        )}
      </div>

      <div className="cd-tabs">
        {['syllabus', 'materials'].map((value) => (
          <button key={value} className={`cd-tab ${tab === value ? 'active' : ''}`} onClick={() => setTab(value)}>
            {value === 'syllabus' ? 'Syllabus' : 'Materials'}
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
                <span>Code</span>
                <input value={courseForm.code} onChange={(event) => setCourseForm({ ...courseForm, code: event.target.value })} required />
              </label>
              <label>
                <span>Credits</span>
                <input type="number" min="1" max="12" value={courseForm.credits} onChange={(event) => setCourseForm({ ...courseForm, credits: event.target.value })} required />
              </label>
              <label>
                <span>Name</span>
                <input value={courseForm.name} onChange={(event) => setCourseForm({ ...courseForm, name: event.target.value })} required />
              </label>
              <label>
                <span>Semester</span>
                <input value={courseForm.semester} onChange={(event) => setCourseForm({ ...courseForm, semester: event.target.value })} required />
              </label>
              {isAdmin && (
                <label>
                  <span>Teacher</span>
                  <select
                    value={courseForm.teacher_id}
                    onChange={(event) => setCourseForm({ ...courseForm, teacher_id: event.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {teacherOptions.map((teacherOption) => (
                      <option key={teacherOption.id} value={teacherOption.id}>{teacherOption.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="cd-form-wide">
                <span>Description</span>
                <textarea value={courseForm.description} onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })} />
              </label>
            </div>

            <div className="cd-form-actions">
              <button type="button" className="cd-btn-sec" onClick={() => setShowCourseForm(false)}>Cancel</button>
              <button type="submit" className="cd-btn-pri">Save course</button>
            </div>
          </form>
        )}

        {tab === 'syllabus' && (
          <div>
            {userRole === 'student' && <div className="cd-hint">Open topics and mark them as done.</div>}

            {canEdit && (
              <button className="cd-add-btn" onClick={() => setShowTopicForm((value) => !value)}>
                {showTopicForm ? 'Cancel' : 'Add topic'}
              </button>
            )}

            {showTopicForm && (
              <form className="cd-inline-form" onSubmit={addTopic}>
                <div className="cd-form-grid">
                  <label>
                    <span>Week</span>
                    <input type="number" min="1" value={topic.week} onChange={(event) => setTopic({ ...topic, week: event.target.value })} required />
                  </label>
                  <label>
                    <span>Title</span>
                    <input value={topic.title} onChange={(event) => setTopic({ ...topic, title: event.target.value })} required />
                  </label>
                  <label>
                    <span>Description</span>
                    <textarea value={topic.desc} onChange={(event) => setTopic({ ...topic, desc: event.target.value })} />
                  </label>
                </div>

                <div className="cd-form-actions">
                  <button type="button" className="cd-btn-sec" onClick={() => setShowTopicForm(false)}>Cancel</button>
                  <button type="submit" className="cd-btn-pri">Save topic</button>
                </div>
              </form>
            )}

            {weeks.map((week) => (
              <div key={week} className="cd-week-block">
                <div className="cd-week-label">
                  <span className="cd-week-num">Week {week}</span>
                  <span className="cd-week-done">
                    {currentCourse.topics.filter((item) => item.week === week && progress.done.includes(item.id)).length}/
                    {currentCourse.topics.filter((item) => item.week === week).length}
                  </span>
                </div>

                {currentCourse.topics.filter((item) => item.week === week).map((item) => {
                  const done = progress.done.includes(item.id);

                  return (
                    <div key={item.id} className={`cd-topic-row ${done ? 'done' : 'clickable'}`} onClick={() => toggleTopic(item.id)}>
                      <span className="cd-topic-check">{done ? 'Done' : 'Open'}</span>
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
                          Remove
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
                {showMaterialForm ? 'Cancel' : 'Add material'}
              </button>
            )}

            {showMaterialForm && (
              <form className="cd-inline-form" onSubmit={addMaterial}>
                <div className="cd-form-grid">
                  <label>
                    <span>Title</span>
                    <input value={material.title} onChange={(event) => setMaterial({ ...material, title: event.target.value })} required />
                  </label>
                  <label>
                    <span>Type</span>
                    <select value={material.type} onChange={(event) => setMaterial({ ...material, type: event.target.value })}>
                      {Object.keys(materialIcons).map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>{material.type === 'link' ? 'URL' : 'Size'}</span>
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
                  <button type="button" className="cd-btn-sec" onClick={() => setShowMaterialForm(false)}>Cancel</button>
                  <button type="submit" className="cd-btn-pri">Save material</button>
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
                    {item.url ? <a href={item.url} target="_blank" rel="noreferrer">Open</a> : <span>Local note</span>}
                    {canEdit && <button onClick={() => deleteMaterial(item.id)}>Remove</button>}
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

export default function CoursesPage({ user }) {
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

  const loadCourses = async () => {
    setLoading(true);

    try {
      const response = await api.getCourses();
      const hydrated = (response?.courses || []).map(enhanceCourse);
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
      const fallback = db.courses.all().map(enhanceCourse);
      setCourses(fallback);
      setStatusBanner({
        tone: 'info',
        title: 'Offline catalog mode',
        message: 'CampusOS is using the locally cached course catalog because the API is currently unavailable.'
      });
      return fallback;
    } finally {
      setLoading(false);
    }
  };

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
  }, [isStudent, userId]);

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

    const hydrated = enhanceCourse(nextCourse);
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
        title: 'Course form is incomplete',
        message: 'Course code and course title are required before a card can be created.'
      });
      show('Code and title are required', 'error');
      return;
    }

    try {
      const response = await api.createCourse(payload);
      const refreshed = await loadCourses();
      const created = refreshed.find((course) => getCourseKey(course) === payload.code) || enhanceCourse(response.course || payload);
      setShowCreateForm(false);
      setForm(DEFAULT_CREATE_FORM);
      setStatusBanner({ tone: '', title: '', message: '' });
      show('Course card created');
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
          ? (teacherLookup[String(payload.teacher_id)] || 'Teacher not assigned')
          : (user?.name || user?.email || 'Local teacher'),
        teacher: isAdmin
          ? (teacherLookup[String(payload.teacher_id)] || 'Teacher not assigned')
          : (user?.name || user?.email || 'Local teacher')
      });
      const nextCourses = replaceCourse(courses, localCourse);
      db.courses.save(nextCourses);
      setCourses(nextCourses);
      setShowCreateForm(false);
      setForm(DEFAULT_CREATE_FORM);
      setStatusBanner({
        tone: 'info',
        title: 'Saved locally',
        message: 'The new course card was stored locally because the API is unavailable right now.'
      });
      show('Course card saved locally');
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
        />
        {toast && <div className={`lms-toast lms-toast-${toast.type}`}>{toast.message}</div>}
      </>
    );
  }

  return (
    <div className="lms-courses">
      <div className="lms-header">
        <div>
          <h2 className="lms-title">Courses</h2>
          <p className="lms-sub">
            {isStudent ? 'Open subject cards, enroll, and track progress.' : 'Create subject cards and fill them with topics and materials.'}
          </p>
        </div>

        {canManage && (
          <button className="lms-create-btn" onClick={() => setShowCreateForm((value) => !value)}>
            {showCreateForm ? 'Close form' : 'Create course'}
          </button>
        )}
      </div>

      <StatusBanner tone={statusBanner.tone || 'info'} title={statusBanner.title} message={statusBanner.message} />

      <div className="lms-stats">
        <div className="lms-stat">
          <div>
            <div className="lms-stat-val">{courses.length}</div>
            <div className="lms-stat-lbl">Course cards</div>
          </div>
        </div>
        <div className="lms-stat">
          <div>
            <div className="lms-stat-val">{courses.filter((course) => course.topics.length > 0).length}</div>
            <div className="lms-stat-lbl">Cards with syllabus</div>
          </div>
        </div>
        <div className="lms-stat">
          <div>
            <div className="lms-stat-val">{courses.filter((course) => course.materials.length > 0).length}</div>
            <div className="lms-stat-lbl">Cards with materials</div>
          </div>
        </div>
        <div className="lms-stat">
          <div>
            <div className="lms-stat-val">{isStudent ? enrolled.length : courses.reduce((sum, course) => sum + course.materials.length, 0)}</div>
            <div className="lms-stat-lbl">{isStudent ? 'Enrolled courses' : 'Total materials'}</div>
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
        />
      )}

      {canManage && showCreateForm && (
        <form className="lms-course-form" onSubmit={handleCreateCourse}>
          <div className="lms-course-form-grid">
            <label>
              <span>Code</span>
              <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="CS305" required />
            </label>
            <label>
              <span>Credits</span>
              <input type="number" min="1" max="12" value={form.credits} onChange={(event) => setForm({ ...form, credits: event.target.value })} required />
            </label>
            <label className="lms-course-form-wide">
              <span>Course title</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Information Security" required />
            </label>
            <label>
              <span>Semester</span>
              <input value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })} placeholder="Spring 2026" required />
            </label>
            {isAdmin && (
              <label>
                <span>Teacher</span>
                <select value={form.teacher_id} onChange={(event) => setForm({ ...form, teacher_id: event.target.value })}>
                  <option value="">Assign later</option>
                  {teacherOptions.map((teacherOption) => (
                    <option key={teacherOption.id} value={teacherOption.id}>{teacherOption.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="lms-course-form-wide">
              <span>Description</span>
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Short description of the subject" />
            </label>
          </div>

          <div className="lms-course-form-actions">
            <p className="lms-course-form-note">
              The card will be created immediately. Then you can open it and add weekly topics and study materials.
            </p>
            <div className="cd-form-actions">
              <button type="button" className="cd-btn-sec" onClick={() => setShowCreateForm(false)}>Cancel</button>
              <button type="submit" className="cd-btn-pri">Create card</button>
            </div>
          </div>
        </form>
      )}

      <div className="lms-controls">
        <div className="lms-controls-copy">
          <strong>{listView === 'mine' ? 'My course list' : 'Course catalog'}</strong>
          <span>Showing {visibleCourses.length} of {visibleCourseBase} course card{visibleCourseBase === 1 ? '' : 's'}</span>
        </div>
        <div className="lms-controls-actions">
          {isStudent && (
            <div className="lms-tabs">
              <button className={listView === 'catalog' ? 'lms-tab active' : 'lms-tab'} onClick={() => setListView('catalog')}>
                <span>All ({courses.length})</span>
              </button>
              <button className={listView === 'mine' ? 'lms-tab active' : 'lms-tab'} onClick={() => setListView('mine')}>
                <span>Mine ({enrolled.length})</span>
              </button>
            </div>
          )}

          <input className="lms-search" placeholder="Search by course title or code" value={search} onChange={(event) => setSearch(event.target.value)} />
          {hasSearch && (
            <button type="button" className="management-filter-chip lms-clear-search" onClick={() => setSearch('')}>
              Clear search
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
          eyebrow="Courses"
          title={listView === 'mine' ? 'No enrolled courses yet' : 'No courses match the current search'}
          description={
            listView === 'mine'
              ? 'Enroll in a subject from the catalog to have it appear in your personal course list.'
              : 'Try another code or title, or create a new course card if you are managing the catalog.'
          }
          actionLabel={hasSearch ? 'Clear search' : (isStudent && listView === 'mine' ? 'Open catalog' : '')}
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
            />
          ))}
        </div>
      )}

      {toast && <div className={`lms-toast lms-toast-${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
