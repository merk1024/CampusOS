import { useEffect, useMemo, useState } from 'react';

import { api } from '../api';
import EmptyState from './EmptyState';
import StatusBanner from './StatusBanner';
import { canManageAcademicRecords, isStudentAccount } from '../roles';

const EMPTY_STATS = {
  total_exams: 0,
  average_grade: 0,
  highest_grade: 0,
  lowest_grade: 0
};

const EMPTY_MANAGER_FORM = {
  examId: '',
  studentId: '',
  grade: '',
  comments: ''
};
const GRADES_COPY = {
  English: {
    pageTitle: 'Grades',
    loadingStudent: 'Loading your grades...',
    loadingManager: 'Loading grade manager...',
    unavailableSubtitle: 'This section is currently available for student and academic management accounts.',
    managerSubtitle: 'Assign, review, and filter grades from one workspace.',
    studentSubtitle: 'Track your academic performance in one view.',
    errorTitle: 'Grades could not be updated',
    successTitle: 'Grades updated',
    stats: {
      availableExams: 'Available exams',
      averageGrade: 'Average grade',
      studentsLoaded: 'Students loaded',
      recordedGrades: 'Recorded grades',
      selectedAverage: 'Selected avg',
      highestGrade: 'Highest grade',
      visibleGrades: 'Visible grades',
      lowestGrade: 'Lowest grade'
    },
    manager: {
      title: 'Save grade',
      subtitle: 'Select an exam, choose a student, and submit the score without leaving the gradebook.',
      exam: 'Exam',
      selectExam: 'Select exam',
      student: 'Student ID or email',
      studentPlaceholder: 'Start typing a student ID or email',
      grade: 'Grade',
      gradePlaceholder: '0 to 100',
      comments: 'Comments',
      commentsPlaceholder: 'Optional comment',
      save: 'Save grade'
    },
    table: {
      title: 'Gradebook',
      showing: (visible, total) => `Showing ${visible} of ${total} recorded grades`,
      subject: 'Subject',
      type: 'Type',
      grade: 'Grade',
      letter: 'Letter',
      date: 'Date',
      comments: 'Comments',
      unknownSubject: 'Unknown subject',
      examFallback: 'Exam',
      noComments: 'No comments'
    },
    notGradedYet: 'Not graded yet',
    failedLoad: 'Failed to load grades',
    missingStudentId: 'Student ID is missing for this account.',
    savedSuccess: 'Grade saved successfully.',
    saveFailed: 'Failed to save grade',
    searchPlaceholder: 'Search by subject, type, comments, or grader',
    searchAria: 'Search the gradebook',
    allTypes: 'All types',
    clearFilters: 'Clear filters',
    viewingHistory: (label) => `Viewing grade history for ${label}.`,
    chooseStudentHint: 'Choose a student above to load their grade history and statistics.',
    emptyChooserEyebrow: 'Start with a student',
    emptyChooserTitle: 'Choose a student to open the gradebook',
    emptyChooserDescription: 'Enter a student ID or email in the grade form above to review results and save a new score.',
    emptyNoGradesEyebrow: 'No grades yet',
    emptyManagerTitle: 'No grades recorded for this student',
    emptyStudentTitle: 'No grades published yet',
    emptyManagerDescription: 'Once a grade is saved, it will appear here together with statistics for the selected student.',
    emptyStudentDescription: 'Grades will appear here after teachers publish exam results.',
    emptyFilteredEyebrow: 'Nothing matched',
    emptyFilteredTitle: 'No grades match the active filters',
    emptyFilteredDescription: 'Clear the current search or type filter to restore the full gradebook view.'
  },
  Kyrgyz: {
    pageTitle: 'Баалар',
    loadingStudent: 'Бааларыңыз жүктөлүүдө...',
    loadingManager: 'Баалар менеджери жүктөлүүдө...',
    unavailableSubtitle: 'Бул бөлүм азыр студенттер жана академиялык башкаруу аккаунттары үчүн жеткиликтүү.',
    managerSubtitle: 'Бааларды бир workspace ичинде коюп, карап жана чыпкалай аласыз.',
    studentSubtitle: 'Академиялык көрсөткүчүңүздү бир көрүнүштө көзөмөлдөңүз.',
    errorTitle: 'Баалар жаңыртылган жок',
    successTitle: 'Баалар жаңыртылды',
    stats: {
      availableExams: 'Жеткиликтүү экзамендер',
      averageGrade: 'Орточо баа',
      studentsLoaded: 'Жүктөлгөн студенттер',
      recordedGrades: 'Жазылган баалар',
      selectedAverage: 'Тандалган орточо',
      highestGrade: 'Эң жогорку баа',
      visibleGrades: 'Көрүнгөн баалар',
      lowestGrade: 'Эң төмөн баа'
    },
    manager: {
      title: 'Бааны сактоо',
      subtitle: 'Экзаменди тандап, студентти көрсөтүп, бааны gradebookтен чыкпай эле жибериңиз.',
      exam: 'Экзамен',
      selectExam: 'Экзаменди тандаңыз',
      student: 'Студент ID же email',
      studentPlaceholder: 'Студент ID же email жаза баштаңыз',
      grade: 'Баа',
      gradePlaceholder: '0дөн 100гө чейин',
      comments: 'Комментарийлер',
      commentsPlaceholder: 'Кошумча комментарий',
      save: 'Бааны сактоо'
    },
    table: {
      title: 'Баалар журналы',
      showing: (visible, total) => `${total} жазылган баанын ичинен ${visible} көрсөтүлдү`,
      subject: 'Предмет',
      type: 'Түрү',
      grade: 'Баа',
      letter: 'Тамга',
      date: 'Күнү',
      comments: 'Комментарийлер',
      unknownSubject: 'Белгисиз предмет',
      examFallback: 'Экзамен',
      noComments: 'Комментарий жок'
    },
    notGradedYet: 'Азырынча бааланган эмес',
    failedLoad: 'Бааларды жүктөө ишке ашкан жок',
    missingStudentId: 'Бул аккаунт үчүн студент ID табылган жок.',
    savedSuccess: 'Баа ийгиликтүү сакталды.',
    saveFailed: 'Бааны сактоо ишке ашкан жок',
    searchPlaceholder: 'Предмет, түрү, комментарий же баалаган адам боюнча издөө',
    searchAria: 'Баалар журналын издөө',
    allTypes: 'Бардык түрлөр',
    clearFilters: 'Чыпкаларды тазалоо',
    viewingHistory: (label) => `${label} үчүн баа тарыхы көрсөтүлүүдө.`,
    chooseStudentHint: 'Баа тарыхын жана статистиканы жүктөө үчүн жогорудан студентти тандаңыз.',
    emptyChooserEyebrow: 'Студенттен баштаңыз',
    emptyChooserTitle: 'Баалар журналын ачуу үчүн студент тандаңыз',
    emptyChooserDescription: 'Жыйынтыктарды көрүү жана жаңы баа сактоо үчүн жогорудагы формага студент ID же email киргизиңиз.',
    emptyNoGradesEyebrow: 'Азырынча баа жок',
    emptyManagerTitle: 'Бул студент үчүн жазылган баа жок',
    emptyStudentTitle: 'Азырынча баалар жарыяланган жок',
    emptyManagerDescription: 'Баа сакталгандан кийин ал ушул жерде тандалган студенттин статистикасы менен кошо көрүнөт.',
    emptyStudentDescription: 'Окутуучулар экзамен жыйынтыктарын жарыялаганда баалар бул жерде пайда болот.',
    emptyFilteredEyebrow: 'Дал келген жок',
    emptyFilteredTitle: 'Активдүү чыпкаларга дал келген баа жок',
    emptyFilteredDescription: 'Толук gradebook көрүнүшүн кайтаруу үчүн издөө же түр чыпкасын тазалаңыз.'
  }
};

function getGradeColor(grade) {
  if (grade >= 90) return '#10b981';
  if (grade >= 80) return '#3b82f6';
  if (grade >= 70) return '#f59e0b';
  return '#ef4444';
}

function getLetterGrade(grade) {
  if (grade >= 95) return 'A+';
  if (grade >= 90) return 'A';
  if (grade >= 85) return 'A-';
  if (grade >= 80) return 'B+';
  if (grade >= 75) return 'B';
  if (grade >= 70) return 'B-';
  if (grade >= 65) return 'C+';
  if (grade >= 60) return 'C';
  return 'F';
}

function formatDate(value, locale = 'en-GB', fallback = 'Not graded yet') {
  if (!value) return fallback;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function GradesTable({ grades, totalCount, copy, locale = 'en-GB' }) {
  return (
    <div className="data-table-card">
      <div className="data-table-header">
        <div>
          <h3>{copy.title}</h3>
          <p className="data-table-meta">{copy.showing(grades.length, totalCount)}</p>
        </div>
      </div>

      <div className="data-table-scroll">
        <table className="data-table">
          <caption className="sr-only">CampusOS gradebook table</caption>
          <thead>
            <tr>
              <th scope="col">{copy.subject}</th>
              <th scope="col">{copy.type}</th>
              <th scope="col">{copy.grade}</th>
              <th scope="col">{copy.letter}</th>
              <th scope="col">{copy.date}</th>
              <th scope="col">{copy.comments}</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((grade) => (
              <tr key={grade.id}>
                <td>
                  <div className="grade-primary-cell">
                    <strong>{grade.subject || copy.unknownSubject}</strong>
                  </div>
                </td>
                <td>{grade.type || copy.examFallback}</td>
                <td>
                  <span className="grade-score" style={{ '--grade-accent': getGradeColor(grade.grade) }}>
                    {grade.grade}%
                  </span>
                </td>
                <td>
                  <span className="grade-letter-pill">{getLetterGrade(grade.grade)}</span>
                </td>
                <td>{formatDate(grade.exam_date || grade.graded_at, locale, copy.notGradedYet || 'Not graded yet')}</td>
                <td className="grade-comment-cell">{grade.comments?.trim() || copy.noComments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Grades({ user, language = 'English', locale = 'en-GB' }) {
  const copy = GRADES_COPY[language] || GRADES_COPY.English;
  const [grades, setGrades] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [managerForm, setManagerForm] = useState(EMPTY_MANAGER_FORM);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const isStudent = isStudentAccount(user);
  const canManage = canManageAcademicRecords(user);
  const studentId = user?.studentId;
  const hasActiveFilters = typeFilter !== 'all' || searchTerm.trim() !== '';

  useEffect(() => {
    const loadStudentGrades = async (targetStudentId) => {
      const [gradesResponse, statsResponse] = await Promise.all([
        api.getGrades(targetStudentId),
        api.getGradeStats(targetStudentId)
      ]);

      setGrades(gradesResponse?.grades || []);
      setStats({
        ...EMPTY_STATS,
        ...(statsResponse?.stats || {})
      });
    };

    const loadPage = async () => {
      if (!isStudent && !canManage) {
        setGrades([]);
        setStats(EMPTY_STATS);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        if (isStudent) {
          if (!studentId) {
            setError(copy.missingStudentId);
            setGrades([]);
            setStats(EMPTY_STATS);
            return;
          }

          await loadStudentGrades(studentId);
          return;
        }

        const [examsResponse, usersResponse] = await Promise.allSettled([
          api.getExams(),
          api.getUsers()
        ]);

        setExams(examsResponse.status === 'fulfilled' ? (examsResponse.value?.exams || []) : []);
        setStudents(
          usersResponse.status === 'fulfilled'
            ? (usersResponse.value?.users || []).filter((item) => item.role === 'student')
            : []
        );
        setGrades([]);
        setStats(EMPTY_STATS);
      } catch (err) {
        setError(err.message || copy.failedLoad);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [canManage, copy.failedLoad, copy.missingStudentId, isStudent, studentId]);

  useEffect(() => {
    if (!canManage || !managerForm.studentId) {
      if (!isStudent) {
        setGrades([]);
        setStats(EMPTY_STATS);
      }
      return;
    }

    const loadSelectedStudent = async () => {
      try {
        setError('');

        const [gradesResponse, statsResponse] = await Promise.all([
          api.getGrades(managerForm.studentId),
          api.getGradeStats(managerForm.studentId)
        ]);

        setGrades(gradesResponse?.grades || []);
        setStats({
          ...EMPTY_STATS,
          ...(statsResponse?.stats || {})
        });
      } catch (err) {
        setError(err.message || copy.failedLoad);
      }
    };

    loadSelectedStudent();
  }, [canManage, copy.failedLoad, isStudent, managerForm.studentId]);

  const gradeTypes = useMemo(() => (
    ['all', ...new Set(grades.map((grade) => grade.type || copy.table.examFallback))]
  ), [copy.table.examFallback, grades]);

  const filteredGrades = useMemo(() => (
    grades.filter((grade) => {
      const matchesType = typeFilter === 'all' || (grade.type || copy.table.examFallback) === typeFilter;
      const searchable = [
        grade.subject,
        grade.type,
        grade.comments,
        grade.graded_by_name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesType && searchable.includes(searchTerm.trim().toLowerCase());
    })
  ), [copy.table.examFallback, grades, searchTerm, typeFilter]);

  const selectedStudent = useMemo(() => (
    students.find((student) => (
      String(student.student_id || '').trim() === managerForm.studentId.trim()
      || String(student.email || '').trim().toLowerCase() === managerForm.studentId.trim().toLowerCase()
    )) || null
  ), [managerForm.studentId, students]);

  const handleManagerInput = (field, value) => {
    setManagerForm((current) => ({ ...current, [field]: value }));
    setNotice('');
    setError('');
  };

  const handleSaveGrade = async (event) => {
    event.preventDefault();

    try {
      setError('');
      setNotice('');

      await api.saveGrade({
        examId: Number(managerForm.examId),
        studentId: managerForm.studentId.trim(),
        grade: Number(managerForm.grade),
        comments: managerForm.comments.trim()
      });

      setNotice(copy.savedSuccess);

      const [gradesResponse, statsResponse] = await Promise.all([
        api.getGrades(managerForm.studentId),
        api.getGradeStats(managerForm.studentId)
      ]);

      setGrades(gradesResponse?.grades || []);
      setStats({
        ...EMPTY_STATS,
        ...(statsResponse?.stats || {})
      });
    } catch (err) {
      setError(err.message || copy.saveFailed);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>{copy.pageTitle}</h1>
          <p>{isStudent ? copy.loadingStudent : copy.loadingManager}</p>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!isStudent && !canManage) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>{copy.pageTitle}</h1>
          <p>{copy.unavailableSubtitle}</p>
        </div>
      </div>
    );
  }

  const average = Number(stats.average_grade || 0).toFixed(1);
  const totalExams = Number(stats.total_exams || grades.length || 0);
  const highestGrade = Number(stats.highest_grade || 0);
  const lowestGrade = Number(stats.lowest_grade || 0);
  const selectedStudentLabel = selectedStudent
    ? `${selectedStudent.name} (${selectedStudent.student_id || selectedStudent.email})`
    : managerForm.studentId || 'No student selected yet';

  const showChooserEmptyState = canManage && !isStudent && !managerForm.studentId;
  const showNoGradesState = !showChooserEmptyState && grades.length === 0;
  const showFilteredEmptyState = grades.length > 0 && filteredGrades.length === 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{copy.pageTitle}</h1>
          <p>{canManage && !isStudent ? copy.managerSubtitle : copy.studentSubtitle}</p>
        </div>
      </div>

      <StatusBanner tone="error" title={copy.errorTitle} message={error} />
      <StatusBanner tone="success" title={copy.successTitle} message={notice} />

      <div className="management-summary-grid">
        <div className="management-summary-card">
          <span className="management-summary-label">{canManage && !isStudent ? copy.stats.availableExams : copy.stats.averageGrade}</span>
          <strong>{canManage && !isStudent ? exams.length : average}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{canManage && !isStudent ? copy.stats.studentsLoaded : copy.stats.recordedGrades}</span>
          <strong>{canManage && !isStudent ? students.length : totalExams}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{canManage && !isStudent ? copy.stats.selectedAverage : copy.stats.highestGrade}</span>
          <strong>{canManage && !isStudent ? (managerForm.studentId ? average : '0.0') : highestGrade}</strong>
        </div>
        <div className="management-summary-card">
          <span className="management-summary-label">{canManage && !isStudent ? copy.stats.visibleGrades : copy.stats.lowestGrade}</span>
          <strong>{canManage && !isStudent ? filteredGrades.length : lowestGrade}</strong>
        </div>
      </div>

      {canManage && !isStudent && (
        <form className="exam-form-card" onSubmit={handleSaveGrade}>
          <div className="exam-form-header">
            <div>
              <h3>{copy.manager.title}</h3>
              <p>{copy.manager.subtitle}</p>
            </div>
          </div>
          <div className="exam-form-grid">
            <label className="exam-form-field">
              <span className="exam-form-label">{copy.manager.exam}</span>
              <select
                value={managerForm.examId}
                onChange={(event) => handleManagerInput('examId', event.target.value)}
                required
              >
                <option value="">{copy.manager.selectExam}</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.subject} - {exam.group_name} - {exam.exam_date}
                  </option>
                ))}
              </select>
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">{copy.manager.student}</span>
              <input
                list="grade-student-ids"
                type="text"
                placeholder={copy.manager.studentPlaceholder}
                value={managerForm.studentId}
                onChange={(event) => handleManagerInput('studentId', event.target.value)}
                required
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">{copy.manager.grade}</span>
              <input
                type="number"
                min="0"
                max="100"
                placeholder={copy.manager.gradePlaceholder}
                value={managerForm.grade}
                onChange={(event) => handleManagerInput('grade', event.target.value)}
                required
              />
            </label>
            <label className="exam-form-field">
              <span className="exam-form-label">{copy.manager.comments}</span>
              <input
                type="text"
                placeholder={copy.manager.commentsPlaceholder}
                value={managerForm.comments}
                onChange={(event) => handleManagerInput('comments', event.target.value)}
              />
            </label>
          </div>
          <datalist id="grade-student-ids">
            {students.map((student) => (
              <option
                key={student.id}
                value={student.student_id || student.email}
                label={`${student.name} (${student.email})`}
              />
            ))}
          </datalist>
          <div className="portal-actions">
            <button type="submit" className="btn-primary">{copy.manager.save}</button>
          </div>
        </form>
      )}

      <div className="management-toolbar grades-toolbar">
        <div className="management-search">
          <input
            type="text"
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchAria}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="management-filters">
          {gradeTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={`management-filter-chip ${typeFilter === type ? 'active' : ''}`}
              onClick={() => setTypeFilter(type)}
            >
              {type === 'all' ? copy.allTypes : type}
            </button>
          ))}
          {hasActiveFilters && (
            <button type="button" className="management-filter-chip" onClick={resetFilters}>
              {copy.clearFilters}
            </button>
          )}
        </div>
      </div>

      {canManage && !isStudent && (
        <p className="grades-context-note">
          {managerForm.studentId
            ? copy.viewingHistory(selectedStudentLabel)
            : copy.chooseStudentHint}
        </p>
      )}

      {showChooserEmptyState ? (
        <EmptyState
          eyebrow={copy.emptyChooserEyebrow}
          title={copy.emptyChooserTitle}
          description={copy.emptyChooserDescription}
          compact
        />
      ) : showNoGradesState ? (
        <EmptyState
          eyebrow={copy.emptyNoGradesEyebrow}
          title={canManage && !isStudent ? copy.emptyManagerTitle : copy.emptyStudentTitle}
          description={canManage && !isStudent
            ? copy.emptyManagerDescription
            : copy.emptyStudentDescription}
          compact
        />
      ) : showFilteredEmptyState ? (
        <EmptyState
          eyebrow={copy.emptyFilteredEyebrow}
          title={copy.emptyFilteredTitle}
          description={copy.emptyFilteredDescription}
          actionLabel={copy.clearFilters}
          onAction={resetFilters}
          compact
        />
      ) : (
        <GradesTable grades={filteredGrades} totalCount={grades.length} copy={copy.table} locale={locale} />
      )}
    </div>
  );
}

export default Grades;
