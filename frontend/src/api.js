// API functions for authentication and data fetching
const API_BASE_URL = 'http://localhost:5001/api';

export const api = {
  // Authentication
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ login: email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  },

  async logout() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return response.json();
  },

  // Users
  async getProfile() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/users/profile/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    return response.json();
  },

  // Courses
  async getCourses() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/courses`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch courses');
    }

    return response.json();
  },

  // Exams
  async getExams() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/exams`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch exams');
    }

    return response.json();
  },

  // Grades
  async getGrades() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/grades`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch grades');
    }

    return response.json();
  },

  // Schedule
  async getSchedule() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/schedule`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch schedule');
    }

    return response.json();
  },

  // Announcements
  async getAnnouncements() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/announcements`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch announcements');
    }

    return response.json();
  },
};