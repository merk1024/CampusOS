const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { getTokenFromRequest } = require('../utils/authCookies');
const {
  hasAdminAccess,
  canManageAcademicRecords,
  isStudentAccount
} = require('../utils/access');

const getActiveUserFilter = () => (
  db.client === 'postgres'
    ? 'is_active = TRUE'
    : 'is_active = 1'
);

const isJwtValidationError = (error) => (
  error?.name === 'JsonWebTokenError'
  || error?.name === 'TokenExpiredError'
  || error?.name === 'NotBeforeError'
);

// Verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token, access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await db.get(
      `SELECT id, email, name, role, student_id, group_name, subgroup_name, is_superadmin
       FROM users
       WHERE id = ? AND ${getActiveUserFilter()}`,
      [decoded.id]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (isJwtValidationError(error)) {
      return res.status(401).json({ error: 'Token is not valid' });
    }

    res.status(500).json({ error: 'Server error' });
  }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (!hasAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

// Check if user is teacher or admin
const isTeacherOrAdmin = (req, res, next) => {
  if (!canManageAcademicRecords(req.user)) {
    return res.status(403).json({ error: 'Access denied. Teachers and admins only.' });
  }
  next();
};

// Check if user is student
const isStudent = (req, res, next) => {
  if (!isStudentAccount(req.user)) {
    return res.status(403).json({ error: 'Access denied. Students only.' });
  }
  next();
};

// Check if user can modify schedule entry (admin or teacher of the subject)
const canModifySchedule = async (req, res, next) => {
  try {
    if (hasAdminAccess(req.user)) {
      return next();
    }

    if (req.user.role === 'teacher') {
      // For new entries, check if teacher is creating for their subject
      if (req.method === 'POST') {
        const { subject } = req.body;
        // Check if teacher teaches this subject
        const course = await db.get(
          'SELECT id FROM courses WHERE name = ? AND teacher_id = ?',
          [subject, req.user.id]
        );
        if (course) {
          return next();
        }
      } else {
        // For updates/deletes, check if teacher teaches the subject in the schedule
        const scheduleEntry = await db.get(
          'SELECT s.subject FROM schedule s JOIN courses c ON s.subject = c.name WHERE s.id = ? AND c.teacher_id = ?',
          [req.params.id, req.user.id]
        );
        if (scheduleEntry) {
          return next();
        }
      }
    }

    return res.status(403).json({ error: 'Access denied: You can only modify your own subjects' });
  } catch (error) {
    console.error('Schedule permission check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { auth, isAdmin, isTeacherOrAdmin, isStudent, canModifySchedule };
