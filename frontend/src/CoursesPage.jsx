import { useEffect, useState } from 'react';
import './CoursesPage.css';
import { api } from './api';

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
  semester: 'Spring 2026'
};

const DEMO_COURSES = [
  {
    id: 1,
    code: 'CS101',
    name: 'Programming Language 2',
    description: 'Advanced OOP, design patterns, and data structures.',
    credits: 6,
    semester: 'Spring 2026',
    teacher: 'Azhar Kazakbaeva',
    topics: [
      { id: 'CS101-T1', week: 1, title: 'OOP fundamentals', desc: 'Classes, inheritance, and polymorphism.' },
      { id: 'CS101-T2', week: 2, title: 'Design patterns', desc: 'Factory, strategy, and singleton in practice.' },
      { id: 'CS101-T3', week: 3, title: 'Collections and algorithms', desc: 'Lists, stacks, queues, and problem solving.' }
    ],
    materials: [
      { id: 'CS101-M1', title: 'Course outline', type: 'pdf', size: '0.8 MB', date: '2026-02-01', url: '' },
      { id: 'CS101-M2', title: 'Week 1 slides', type: 'pptx', size: '2.1 MB', date: '2026-02-03', url: '' }
    ]
  },
  {
    id: 2,
    code: 'WEB101',
    name: 'Web Development',
    description: 'HTML, CSS, JavaScript, and modern frontend basics.',
    credits: 4,
    semester: 'Spring 2026',
    teacher: 'Maria Teacher',
    topics: [
      { id: 'WEB101-T1', week: 1, title: 'HTML and semantic layout', desc: 'Page structure and accessibility basics.' },
      { id: 'WEB101-T2', week: 2, title: 'CSS layouts', desc: 'Flexbox, grid, and responsive design.' }
    ],
    materials: [
      { id: 'WEB101-M1', title: 'Frontend checklist', type: 'docx', size: '0.4 MB', date: '2026-02-02', url: '' }
    ]
  },
  {
    id: 3,
    code: 'CYB101',
    name: 'Cybersecurity',
    description: 'Network security, basic cryptography, and secure practices.',
    credits: 4,
    semester: 'Spring 2026',
    teacher: 'Ruslan Amanov',
    topics: [
      { id: 'CYB101-T1', week: 1, title: 'Threat landscape', desc: 'Common attack vectors and risk awareness.' },
      { id: 'CYB101-T2', week: 2, title: 'Cryptography basics', desc: 'Hashing, encryption, and certificates.' }
    ],
    materials: [
      { id: 'CYB101-M1', title: 'Security glossary', type: 'pdf', size: '0.6 MB', date: '2026-02-05', url: '' }
    ]
  }
];

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
      store.set(COURSE_FALLBACK_KEY, DEMO_COURSES);
    }
    if (!store.get(ENROLLMENTS_KEY)) {
      store.set(ENROLLMENTS_KEY, {});
    }
    if (!store.get(PROGRESS_KEY)) {
      store.set(PROGRESS_KEY, {});
    }
  },
  courses: {
    all: () => store.get(COURSE_FALLBACK_KEY, DEMO_COURSES),
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
const today = () => new Date().toISOString().slice(0, 10);
const getCourseDetailStore = () => store.get(COURSE_DETAILS_KEY, {});
const saveCourseDetailStore = (value) => store.set(COURSE_DETAILS_KEY, value);

const buildDefaultTopics = (course) => {
  const code = getCourseKey(course) || 'COURSE';
  return [
    { id: `${code}-TOPIC-1`, week: 1, title: 'Course overview', desc: `Introduction to ${course.name} and course expectations.` },
    { id: `${code}-TOPIC-2`, week: 2, title: 'Core concepts', desc: course.description || `Key ideas for ${course.name}.` },
    { id: `${code}-TOPIC-3`, week: 3, title: 'Practice and assessment', desc: 'Hands-on tasks and assessment preparation.' }
  ];
};

const buildDefaultMaterials = (course) => {
  const code = getCourseKey(course) || 'COURSE';
  return [
    { id: `${code}-MAT-1`, title: 'Course outline', type: 'pdf', size: '0.5 MB', date: today(), url: '' },
    { id: `${code}-MAT-2`, title: 'Assessment guide', type: 'docx', size: '0.3 MB', date: today(), url: '' }
  ];
};

const seedCourse = (course) => DEMO_COURSES.find((item) => getCourseKey(item) === getCourseKey(course));

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
  const seeded = seedCourse(course);

  const hydrated = {
    ...seeded,
    ...course,
    code,
    color,
    icon,
    teacher: getTeacherName(course),
    credits: Number(course.credits || seeded?.credits || 3),
    semester: course.semester || seeded?.semester || 'Current semester',
    description: course.description || seeded?.description || `${course.name} course card.`,
    topics: Array.isArray(saved?.topics) && saved.topics.length
      ? saved.topics
      : Array.isArray(course.topics) && course.topics.length
        ? course.topics
        : Array.isArray(seeded?.topics) && seeded.topics.length
          ? seeded.topics
          : buildDefaultTopics({ ...course, code }),
    materials: Array.isArray(saved?.materials) && saved.materials.length
      ? saved.materials
      : Array.isArray(course.materials) && course.materials.length
        ? course.materials
        : Array.isArray(seeded?.materials) && seeded.materials.length
          ? seeded.materials
          : buildDefaultMaterials({ ...course, code })
  };

  if (!saved) {
    persistCourseContent(hydrated);
  }

  return hydrated;
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

function Detail({ course, userId, userRole, onBack, onCourseChange }) {
  const [tab, setTab] = useState('syllabus');
  const [progress, setProgress] = useState(() => db.progress.get(userId, course.id));
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [topic, setTopic] = useState({ week: 1, title: '', desc: '' });
  const [material, setMaterial] = useState({ title: '', type: 'pdf', url: '', size: '' });
  const [currentCourse, setCurrentCourse] = useState(course);

  const canEdit = userRole === 'admin' || userRole === 'teacher';
  const materialIcons = { pdf: 'PDF', video: 'VID', pptx: 'PPT', link: 'URL', docx: 'DOC', other: 'FILE' };

  const syncCourse = (nextCourse) => {
    const hydrated = enhanceCourse(nextCourse);
    persistCourseContent(hydrated);
    db.courses.save(replaceCourse(db.courses.all(), hydrated));
    setCurrentCourse(hydrated);
    onCourseChange?.(hydrated);
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
          date: today()
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
  const [listView, setListView] = useState('catalog');
  const [detailId, setDetailId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_CREATE_FORM);
  const { toast, show } = useToast();

  const isStudent = user?.role === 'student';
  const canManage = user?.role === 'admin' || user?.role === 'teacher';
  const userId = user?.id || 'guest';

  const loadCourses = async () => {
    setLoading(true);

    try {
      const response = await api.getCourses();
      const hydrated = (response?.courses || []).map(enhanceCourse);
      setCourses(hydrated);
      db.courses.save(hydrated);
      return hydrated;
    } catch (error) {
      console.error('Failed to load courses from API, using local fallback:', error);
      db.init();
      const fallback = db.courses.all().map(enhanceCourse);
      setCourses(fallback);
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
      setLoading(true);

      try {
        const response = await api.getCourses();
        const hydrated = (response?.courses || []).map(enhanceCourse);
        setCourses(hydrated);
        db.courses.save(hydrated);
      } catch (error) {
        console.error('Failed to load courses from API, using local fallback:', error);
        const fallback = db.courses.all().map(enhanceCourse);
        setCourses(fallback);
      } finally {
        setLoading(false);
      }

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
    if (detailId && !courses.some((course) => course.id === detailId)) {
      setDetailId(null);
    }
  }, [courses, detailId]);

  const updateCourseInState = (nextCourse) => {
    const hydrated = enhanceCourse(nextCourse);
    setCourses((current) => replaceCourse(current, hydrated));
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
      semester: form.semester.trim()
    };

    if (!payload.code || !payload.name) {
      show('Code and title are required', 'error');
      return;
    }

    try {
      const response = await api.createCourse(payload);
      const refreshed = await loadCourses();
      const created = refreshed.find((course) => getCourseKey(course) === payload.code) || enhanceCourse(response.course || payload);
      setShowCreateForm(false);
      setForm(DEFAULT_CREATE_FORM);
      show('Course card created');
      if (created?.id) {
        setDetailId(created.id);
      }
    } catch (error) {
      console.error('Failed to create course in API, saving locally:', error);
      const localCourse = enhanceCourse({
        id: Date.now(),
        ...payload,
        teacher: user?.name || user?.email || 'Local teacher'
      });
      const nextCourses = replaceCourse(courses, localCourse);
      db.courses.save(nextCourses);
      setCourses(nextCourses);
      setShowCreateForm(false);
      setForm(DEFAULT_CREATE_FORM);
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

  if (detailCourse) {
    return (
      <>
        <Detail
          key={`${detailCourse.id}-${userId}`}
          course={detailCourse}
          userId={userId}
          userRole={user?.role}
          onBack={() => setDetailId(null)}
          onCourseChange={updateCourseInState}
        />
        {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
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
        <div className="lms-empty">
          No courses found.
          <div className="lms-empty-note">Create a new course card or change the search term.</div>
        </div>
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

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}
