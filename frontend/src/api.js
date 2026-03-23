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

const getToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

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

const getErrorMessage = async (response, fallbackMessage) => {
  const payload = await parseJsonSafely(response);
  return payload?.error?.message || payload?.error || payload?.message || fallbackMessage;
};

const request = async (path, options = {}) => {
  const { skipAuthHandling = false, ...fetchOptions } = options;

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, fetchOptions);

    if (!response.ok) {
      const errorMessage = await getErrorMessage(response, 'Request failed');

      if (!skipAuthHandling && response.status === 401 && getToken()) {
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
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  async login(login, password) {
    return request('/auth/login', {
      skipAuthHandling: true,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
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

  async getAssignments() {
    return request('/assignments', { headers: getHeaders() });
  },

  async getStudentAttendance(studentId) {
    return request(`/attendance/student/${studentId}`, { headers: getHeaders() });
  },

  async markAttendance(scheduleId, studentId, date, status) {
    return request('/attendance', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ scheduleId, studentId, date, status })
    });
  }
};
