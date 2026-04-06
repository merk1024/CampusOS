import { hasAdminAccess } from './roles';

const SHARED_PAGES = new Set([
  'dashboard',
  'courses',
  'schedule',
  'exams',
  'grades',
  'assignments',
  'attendance',
  'messages',
  'profile',
  'settings',
  'privacy',
  'terms',
  'support'
]);

const ADMIN_ONLY_PAGES = new Set([
  'userManagement',
  'integrations'
]);

export const canAccessPage = (user, page) => {
  if (!page) {
    return false;
  }

  if (ADMIN_ONLY_PAGES.has(page)) {
    return hasAdminAccess(user);
  }

  return SHARED_PAGES.has(page);
};

export const getAccessiblePage = (user, requestedPage, fallbackPage = 'dashboard') => {
  if (canAccessPage(user, requestedPage)) {
    return requestedPage;
  }

  if (canAccessPage(user, fallbackPage)) {
    return fallbackPage;
  }

  return 'dashboard';
};
