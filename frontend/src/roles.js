const isTruthyFlag = (value) => (
  value === true
  || value === 1
  || value === '1'
);

export const isSuperadmin = (user) => (
  isTruthyFlag(user?.is_superadmin)
  || isTruthyFlag(user?.isSuperadmin)
);

export const hasAdminAccess = (user) => (
  isSuperadmin(user)
  || user?.role === 'admin'
);

export const hasTeacherAccess = (user) => user?.role === 'teacher';

export const canManageAcademicRecords = (user) => (
  hasAdminAccess(user)
  || hasTeacherAccess(user)
);

export const isStudentAccount = (user) => user?.role === 'student';

export const getRoleKey = (user) => (
  isSuperadmin(user)
    ? 'superadmin'
    : (user?.role || 'user')
);

const ROLE_LABELS = {
  English: {
    superadmin: 'Super Admin',
    admin: 'Admin',
    teacher: 'Teacher',
    student: 'Student',
    user: 'User'
  },
  Kyrgyz: {
    superadmin: 'Башкы админ',
    admin: 'Админ',
    teacher: 'Окутуучу',
    student: 'Студент',
    user: 'Колдонуучу'
  }
};

export const getRoleLabel = (user, language = 'English') => {
  const labels = ROLE_LABELS[language] || ROLE_LABELS.English;
  const roleKey = getRoleKey(user);

  if (labels[roleKey]) {
    return labels[roleKey];
  }

  if (!user?.role) {
    return labels.user;
  }

  return user.role[0].toUpperCase() + user.role.slice(1);
};
