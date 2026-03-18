// Автоматически выбираем URL: если мы на Render — берем его адрес, если нет — localhost
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5001/api' 
  : 'https://web-table-exam.onrender.com/api';

// Вспомогательная функция для заголовков (чтобы не писать одно и то же)
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const api = {
  // --- AUTHENTICATION ---
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: email, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }
    return response.json();
  },

  async logout() {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return response.ok ? response.json() : null;
  },

  // --- USERS & PROFILE ---
  async getProfile() {
    const response = await fetch(`${API_BASE_URL}/users/profile/me`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  },

  async updateProfile(profileData) {
    const response = await fetch(`${API_BASE_URL}/users/profile/me`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData),
    });
    if (!response.ok) throw new Error('Failed to update profile');
    return response.json();
  },

  async getUsers() {
    const response = await fetch(`${API_BASE_URL}/users`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  async createUser(userData) {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  },

  async getUserById(id) {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },

  async updateUser(id, userData) {
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    if (!response.ok) throw new Error('Failed to update user');
    return response.json();
  },

  // --- COURSES & ENROLLMENT ---
  async getCourses() {
    const response = await fetch(`${API_BASE_URL}/courses`, { headers: getHeaders() });
    return response.json();
  },

  async getEnrolledCourses() {
    const response = await fetch(`${API_BASE_URL}/courses/enrolled`, { headers: getHeaders() });
    return response.json();
  },

  async enrollInCourse(courseId) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return response.json();
  },

  async unenrollFromCourse(courseId) {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/enroll`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return response.json();
  },

  // --- ACADEMIC DATA ---
  async getExams() {
    const response = await fetch(`${API_BASE_URL}/exams`, { headers: getHeaders() });
    return response.json();
  },

  async getGrades() {
    const response = await fetch(`${API_BASE_URL}/grades`, { headers: getHeaders() });
    return response.json();
  },

  async getSchedule() {
    const response = await fetch(`${API_BASE_URL}/schedule`, { headers: getHeaders() });
    return response.json();
  },

  async createScheduleEntry(scheduleData) {
    const response = await fetch(`${API_BASE_URL}/schedule`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(scheduleData),
    });
    if (!response.ok) throw new Error('Failed to create schedule entry');
    return response.json();
  },

  async updateScheduleEntry(id, scheduleData) {
    const response = await fetch(`${API_BASE_URL}/schedule/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(scheduleData),
    });
    if (!response.ok) throw new Error('Failed to update schedule entry');
    return response.json();
  },

  async deleteScheduleEntry(id) {
    const response = await fetch(`${API_BASE_URL}/schedule/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete schedule entry');
    return response.json();
  },

  async getAnnouncements() {
    const response = await fetch(`${API_BASE_URL}/announcements`, { headers: getHeaders() });
    return response.json();
  },

  async getAssignments() {
    const response = await fetch(`${API_BASE_URL}/assignments`, { headers: getHeaders() });
    return response.json();
  },

  // --- ATTENDANCE ---
  async getStudentAttendance(studentId) {
    const response = await fetch(`${API_BASE_URL}/attendance/student/${studentId}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch attendance');
    return response.json();
  },

  async markAttendance(scheduleId, studentId, date, status) {
    const response = await fetch(`${API_BASE_URL}/attendance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ scheduleId, studentId, date, status }),
    });
    return response.json();
  },
};  