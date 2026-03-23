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

export const getRoleLabel = (user) => {
  if (isSuperadmin(user)) {
    return 'Super Admin';
  }

  if (!user?.role) {
    return 'User';
  }

  return user.role[0].toUpperCase() + user.role.slice(1);
};
