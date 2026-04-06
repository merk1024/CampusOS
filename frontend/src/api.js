const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const getDefaultApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:5000/api';
  }

  if (LOCAL_HOSTNAMES.has(window.location.hostname)) {
    return 'http://localhost:5000/api';
  }

  return `${window.location.origin}/api`;
};

const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl());
const API_TARGET = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL;
  }
})();

export const AUTH_SESSION_EXPIRED_EVENT = 'campusos:auth-session-expired';
export const SESSION_EXPIRED_MESSAGE = 'Session expired. Please sign in again.';
const GENERIC_SERVER_ERROR_MESSAGES = new Set(['Server error', 'Request failed']);
const SESSION_ERROR_MESSAGES = new Set([
  'Token is not valid',
  'No authentication token, access denied',
  'User not found or inactive',
  SESSION_EXPIRED_MESSAGE
]);

const hasKnownSession = () => (
  Boolean(localStorage.getItem('lms_user'))
  || Boolean(localStorage.getItem('token'))
  || Boolean(sessionStorage.getItem('token'))
);

export const isSessionErrorMessage = (message) => SESSION_ERROR_MESSAGES.has(message);

export const clearAuthSession = () => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
  localStorage.removeItem('lms_user');
};

const notifySessionExpired = (message = SESSION_EXPIRED_MESSAGE) => {
  clearAuthSession();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT, {
      detail: { message }
    }));
  }
};

const parseJsonSafely = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const getFriendlyRequestMessage = (path, method = 'GET') => {
  const normalizedPath = String(path || '').split('?')[0];
  const normalizedMethod = String(method || 'GET').toUpperCase();

  if (normalizedPath.startsWith('/attendance/analytics')) {
    return 'Attendance analytics are temporarily unavailable. Please try again in a moment.';
  }

  if (normalizedPath.startsWith('/attendance/management')) {
    return normalizedMethod === 'GET'
      ? 'CampusOS could not open the attendance workspace right now.'
      : 'CampusOS could not update the attendance workspace right now.';
  }

  if (normalizedPath === '/attendance' || normalizedPath.startsWith('/attendance/bulk')) {
    return 'CampusOS could not save attendance right now. Please try again.';
  }

  if (normalizedPath.startsWith('/attendance')) {
    return 'CampusOS could not load attendance right now. Please try again in a moment.';
  }

  if (normalizedPath.startsWith('/schedule')) {
    return normalizedMethod === 'GET'
      ? 'CampusOS could not load the active schedule right now.'
      : 'CampusOS could not update the schedule right now.';
  }

  if (normalizedPath.startsWith('/announcements')) {
    return normalizedMethod === 'GET'
      ? 'CampusOS could not load announcements right now.'
      : 'CampusOS could not publish or update the announcement right now.';
  }

  if (normalizedPath.startsWith('/assignments')) {
    return normalizedMethod === 'GET'
      ? 'CampusOS could not load assignments right now.'
      : 'CampusOS could not save assignment changes right now.';
  }

  if (normalizedPath.startsWith('/grades')) {
    return normalizedMethod === 'GET'
      ? 'CampusOS could not load grades right now.'
      : 'CampusOS could not save grade changes right now.';
  }

  if (normalizedPath.startsWith('/exams')) {
    return normalizedMethod === 'GET'
      ? 'CampusOS could not load exams right now.'
      : 'CampusOS could not save exam changes right now.';
  }

  if (normalizedPath.startsWith('/courses')) {
    return normalizedMethod === 'GET'
      ? 'CampusOS could not load courses right now.'
      : 'CampusOS could not update course data right now.';
  }

  if (normalizedPath.startsWith('/users')) {
    return normalizedMethod === 'GET'
      ? 'CampusOS could not load user records right now.'
      : 'CampusOS could not save user changes right now.';
  }

  if (normalizedPath.startsWith('/integrations')) {
    return 'CampusOS could not load the integration workspace right now.';
  }

  if (normalizedPath.startsWith('/ops/performance-dashboard')) {
    return 'Performance dashboard is temporarily unavailable. Please try again in a moment.';
  }

  if (normalizedPath.startsWith('/ops/risk-flags')) {
    return 'Academic risk indicators are temporarily unavailable. Please try again in a moment.';
  }

  return 'CampusOS ran into a temporary server problem. Please try again in a moment.';
};

const getErrorMessage = async (response, fallbackMessage) => {
  const payload = await parseJsonSafely(response);
  const message = payload?.error?.message || payload?.error || payload?.message || fallbackMessage;
  return GENERIC_SERVER_ERROR_MESSAGES.has(String(message || '').trim()) ? fallbackMessage : message;
};

const request = async (path, options = {}) => {
  const { skipAuthHandling = false, ...fetchOptions } = options;
  const fallbackErrorMessage = getFriendlyRequestMessage(path, fetchOptions.method);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      ...fetchOptions
    });

    if (!response.ok) {
      const errorMessage = await getErrorMessage(response, fallbackErrorMessage);

      if (!skipAuthHandling && response.status === 401 && hasKnownSession() && isSessionErrorMessage(errorMessage)) {
        notifySessionExpired();
        throw new Error(SESSION_EXPIRED_MESSAGE);
      }

      throw new Error(errorMessage);
    }

    return parseJsonSafely(response);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Cannot connect to the server. Check that backend is running and reachable at ${API_TARGET}.`);
    }
    throw error;
  }
};

const getHeaders = () => {
  return {
    'Content-Type': 'application/json'
  };
};

export const api = {
  async login(login, password, rememberMe = false) {
    return request('/auth/login', {
      skipAuthHandling: true,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password, rememberMe })
    });
  },

  async logout() {
    try {
      return await request('/auth/logout', {
        method: 'POST',
        headers: getHeaders()
      });
    } finally {
      clearAuthSession();
    }
  },

  async getProfile() {
    return request('/users/profile/me', { headers: getHeaders() });
  },

  async updateProfile(profileData) {
    return request('/users/profile/me', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData)
    });
  },

  async getUsers() {
    return request('/users', { headers: getHeaders() });
  },

  async createUser(userData) {
    return request('/users', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
  },

  async previewBulkUsers(csvText) {
    return request('/users/bulk/preview', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ csvText })
    });
  },

  async applyBulkUsers(csvText) {
    return request('/users/bulk/apply', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ csvText })
    });
  },

  async getUserById(id) {
    return request(`/users/${id}`, { headers: getHeaders() });
  },

  async updateUser(id, userData) {
    return request(`/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
  },

  async updateUserStatus(id, isActive) {
    return request(`/users/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ is_active: isActive })
    });
  },

  async getCourses() {
    return request('/courses', { headers: getHeaders() });
  },

  async getCourseById(id) {
    return request(`/courses/${id}`, { headers: getHeaders() });
  },

  async createCourse(courseData) {
    return request('/courses', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(courseData)
    });
  },

  async updateCourse(id, courseData) {
    return request(`/courses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(courseData)
    });
  },

  async deleteCourse(id) {
    return request(`/courses/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  async bulkAssignTeacherToCourses(teacherId, courseIds) {
    return request('/courses/bulk/teacher-assignment', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        teacher_id: teacherId || null,
        course_ids: courseIds
      })
    });
  },

  async bulkEnrollStudents(courseIds, studentIdentifiers) {
    return request('/courses/bulk/enrollments', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        course_ids: courseIds,
        student_identifiers: studentIdentifiers
      })
    });
  },

  async getCourseOperationsReport() {
    return request('/courses/reports/overview', {
      headers: getHeaders()
    });
  },

  async getCourseRoster(id) {
    return request(`/courses/${id}/roster`, {
      headers: getHeaders()
    });
  },

  async getIntegrationOverview() {
    return request('/integrations/overview', {
      headers: getHeaders()
    });
  },

  async analyzeSubjectSelectionIntegration(payload) {
    return request('/integrations/subject-selection/analyze', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
  },

  async applySubjectSelectionOverride(payload) {
    return request('/integrations/subject-selection/override', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
  },

  async analyzeAcademicRecordsIntegration(payload) {
    return request('/integrations/academic-records/analyze', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
  },

  async getAcademicRiskFlags(from, to, limit) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (limit) params.set('limit', String(limit));

    return request(`/ops/risk-flags?${params.toString()}`, {
      headers: getHeaders()
    });
  },

  async getPerformanceDashboard(from, to) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    return request(`/ops/performance-dashboard?${params.toString()}`, {
      headers: getHeaders()
    });
  },

  async getFacultyOverviewReport(from, to) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    return request(`/ops/reports/faculty-overview?${params.toString()}`, {
      headers: getHeaders()
    });
  },

  async getDeanOfficeReport(from, to) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    return request(`/ops/reports/dean-office?${params.toString()}`, {
      headers: getHeaders()
    });
  },

  async getNotifications() {
    return request('/ops/notifications/me', {
      headers: getHeaders()
    });
  },

  async markNotificationRead(id) {
    return request(`/ops/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getHeaders()
    });
  },

  async markAllNotificationsRead() {
    return request('/ops/notifications/me/read-all', {
      method: 'PATCH',
      headers: getHeaders()
    });
  },

  async getEnrolledCourses() {
    return request('/courses/enrolled', { headers: getHeaders() });
  },

  async enrollInCourse(courseId) {
    return request(`/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: getHeaders()
    });
  },

  async unenrollFromCourse(courseId) {
    return request(`/courses/${courseId}/enroll`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  async getExams() {
    return request('/exams', { headers: getHeaders() });
  },

  async createExam(examData) {
    return request('/exams', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(examData)
    });
  },

  async updateExam(id, examData) {
    return request(`/exams/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(examData)
    });
  },

  async deleteExam(id) {
    return request(`/exams/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  async saveGrade(gradeData) {
    return request('/grades', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(gradeData)
    });
  },

  async getGrades(studentId) {
    if (!studentId) {
      throw new Error('Student ID is required to load grades.');
    }

    return request(`/grades/student/${encodeURIComponent(studentId)}`, { headers: getHeaders() });
  },

  async getGradeStats(studentId) {
    if (!studentId) {
      throw new Error('Student ID is required to load grade statistics.');
    }

    return request(`/grades/stats/${encodeURIComponent(studentId)}`, { headers: getHeaders() });
  },

  async getSchedule() {
    return request('/schedule', { headers: getHeaders() });
  },

  async createScheduleEntry(scheduleData) {
    return request('/schedule', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(scheduleData)
    });
  },

  async updateScheduleEntry(id, scheduleData) {
    return request(`/schedule/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(scheduleData)
    });
  },

  async deleteScheduleEntry(id) {
    return request(`/schedule/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  async getAnnouncements() {
    return request('/announcements', { headers: getHeaders() });
  },

  async createAnnouncement(announcementData) {
    return request('/announcements', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(announcementData)
    });
  },

  async deleteAnnouncement(id) {
    return request(`/announcements/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  async getAssignments() {
    return request('/assignments', { headers: getHeaders() });
  },

  async createAssignment(assignmentData) {
    return request('/assignments', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(assignmentData)
    });
  },

  async getStudentAttendance(studentId) {
    return request(`/attendance/student/${studentId}`, { headers: getHeaders() });
  },

  async getAttendanceSessions(date) {
    return request(`/attendance/management/sessions?date=${encodeURIComponent(date)}`, {
      headers: getHeaders()
    });
  },

  async getAttendanceAnalytics(from, to) {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    return request(`/attendance/analytics?${params.toString()}`, {
      headers: getHeaders()
    });
  },

  async getAttendanceSession(scheduleId, date) {
    return request(
      `/attendance/management/session/${encodeURIComponent(scheduleId)}?date=${encodeURIComponent(date)}`,
      { headers: getHeaders() }
    );
  },

  async saveAttendanceBatch(scheduleId, date, records) {
    return request('/attendance/bulk', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ scheduleId, date, records })
    });
  },

  async markAttendance(scheduleId, studentId, date, status) {
    return request('/attendance', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ scheduleId, studentId, date, status })
    });
  },

  async reportClientError(payload) {
    return request('/monitoring/frontend-error', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
      skipAuthHandling: true
    });
  }
};
