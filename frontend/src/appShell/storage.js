import { readAppSettings } from '../appPreferences';

export const storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

export const getDefaultPage = () => readAppSettings().defaultPage || 'dashboard';

export const getRequestedPage = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return new URLSearchParams(window.location.search).get('page') || '';
};

export const mergeSessionUserData = (baseUser, nextUserData) => ({
  ...baseUser,
  ...nextUserData,
  isSuperadmin: nextUserData?.is_superadmin ?? nextUserData?.isSuperadmin ?? baseUser?.isSuperadmin,
  studentId: nextUserData?.student_id ?? nextUserData?.studentId ?? baseUser?.studentId,
  group: nextUserData?.group_name ?? nextUserData?.groupName ?? baseUser?.group,
  subgroup: nextUserData?.subgroup_name ?? nextUserData?.subgroupName ?? baseUser?.subgroup
});
