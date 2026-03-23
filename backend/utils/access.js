const SUPERADMIN_EMAIL = 'erbol.abdusatov@alatoo.edu.kg';

const hasSuperadminAccess = (user) => (
  user?.is_superadmin === 1
  || user?.is_superadmin === true
  || user?.is_superadmin === '1'
  || user?.isSuperadmin === 1
  || user?.isSuperadmin === true
  || user?.isSuperadmin === '1'
);

const hasAdminAccess = (user) => (
  hasSuperadminAccess(user)
  || user?.role === 'admin'
);

const hasTeacherAccess = (user) => user?.role === 'teacher';

const canManageAcademicRecords = (user) => (
  hasAdminAccess(user)
  || hasTeacherAccess(user)
);

const isStudentAccount = (user) => user?.role === 'student';

module.exports = {
  SUPERADMIN_EMAIL,
  hasSuperadminAccess,
  hasAdminAccess,
  hasTeacherAccess,
  canManageAcademicRecords,
  isStudentAccount
};
