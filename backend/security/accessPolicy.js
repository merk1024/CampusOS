const { hasAdminAccess, hasSuperadminAccess } = require('../utils/access');

const validId = value => ['number', 'string'].includes(typeof value)
  && String(value).trim() !== '' && Number.isSafeInteger(Number(value)) && Number(value) > 0;
const sameId = (left, right) => validId(left) && validId(right) && Number(left) === Number(right);
const ownsCourse = (user, resource) => validId(resource.course_id)
  && sameId(user.id, resource.teacher_id);

// Resource attributes must come from the database, never from client role claims.
const RULES = Object.freeze({
  'course.manage': ownsCourse,
  'attendance.manage': ownsCourse,
  'exam.manage': (user, resource) => resource.course_id == null
    ? sameId(user.id, resource.created_by) : ownsCourse(user, resource),
  'announcement.publish': (user, resource) => resource.audience_scope === 'course'
    && ownsCourse(user, resource),
  'announcement.delete': (user, resource) => sameId(user.id, resource.created_by)
    && (resource.course_id == null || ownsCourse(user, resource)),
  'admin.create': () => false
});

function can(user, action, resource = {}) {
  if (!validId(user?.id) || !Object.hasOwn(RULES, action) || !resource) return false;
  if (action === 'admin.create') return hasSuperadminAccess(user);
  if (hasAdminAccess(user)) return true;
  return user.role === 'teacher' && RULES[action](user, resource);
}

module.exports = { can };
