const { hasAdminAccess, canManageAcademicRecords } = require('./access');

const AUDIENCE_SCOPE_SET = new Set([
  'all',
  'students',
  'teachers',
  'admins',
  'group',
  'course'
]);

const normalizeAudienceScope = (value) => {
  const normalized = String(value || 'all').trim().toLowerCase();
  return AUDIENCE_SCOPE_SET.has(normalized) ? normalized : 'all';
};

const parseAudienceTokens = (value) => (
  String(value || '')
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
);

const normalizeGroupToken = (value) => String(value || '').trim().toLowerCase();

const normalizeNumericId = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeAudienceInput = (payload = {}) => {
  const audienceScope = normalizeAudienceScope(payload.audienceScope || payload.audience_scope);
  const groupTokens = parseAudienceTokens(
    payload.audienceValue
    || payload.audience_value
    || payload.targetGroups
    || payload.target_groups
    || payload.groupNames
    || payload.group_names
  );
  const courseId = normalizeNumericId(payload.courseId ?? payload.course_id);
  const errors = [];
  let audienceValue = null;

  if (audienceScope === 'group') {
    if (groupTokens.length === 0) {
      errors.push('Provide at least one group or subgroup');
    } else {
      audienceValue = groupTokens.join(', ');
    }
  }

  if (audienceScope === 'course' && !courseId) {
    errors.push('Select a course for course-targeted announcements');
  }

  return {
    audienceScope,
    audienceValue,
    courseId,
    groupTokens,
    errors
  };
};

const getAnnouncementAudienceLabel = ({
  audienceScope,
  audienceValue,
  courseName
}) => {
  switch (normalizeAudienceScope(audienceScope)) {
    case 'students':
      return 'Students';
    case 'teachers':
      return 'Teachers';
    case 'admins':
      return 'Admins';
    case 'group': {
      const groups = parseAudienceTokens(audienceValue);
      if (groups.length === 0) {
        return 'Selected groups';
      }

      if (groups.length === 1) {
        return groups[0];
      }

      return `${groups[0]} +${groups.length - 1}`;
    }
    case 'course':
      return courseName || 'Course audience';
    case 'all':
    default:
      return 'All users';
  }
};

const canUserSeeAnnouncement = ({
  announcement,
  user,
  enrolledCourseIds = new Set()
}) => {
  if (!announcement || !user) {
    return false;
  }

  if (hasAdminAccess(user) || canManageAcademicRecords(user)) {
    return true;
  }

  const audienceScope = normalizeAudienceScope(announcement.audience_scope);
  if (announcement.created_by === user.id) {
    return true;
  }

  if (audienceScope === 'all') {
    return true;
  }

  if (audienceScope === 'students') {
    return user.role === 'student';
  }

  if (audienceScope === 'teachers') {
    return user.role === 'teacher';
  }

  if (audienceScope === 'admins') {
    return hasAdminAccess(user);
  }

  if (audienceScope === 'group') {
    const targetGroups = new Set(parseAudienceTokens(announcement.audience_value).map(normalizeGroupToken));
    return targetGroups.has(normalizeGroupToken(user.group_name))
      || targetGroups.has(normalizeGroupToken(user.subgroup_name));
  }

  if (audienceScope === 'course') {
    const courseId = normalizeNumericId(announcement.course_id);
    return courseId ? enrolledCourseIds.has(courseId) : false;
  }

  return false;
};

module.exports = {
  normalizeAudienceScope,
  normalizeAudienceInput,
  parseAudienceTokens,
  normalizeGroupToken,
  normalizeNumericId,
  getAnnouncementAudienceLabel,
  canUserSeeAnnouncement
};
