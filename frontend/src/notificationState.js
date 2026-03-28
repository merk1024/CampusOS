const MESSAGE_READ_STORAGE_KEY = 'campusos:message-read-state';

const getNotificationScope = (user) => {
  if (user?.id) {
    return `user:${user.id}`;
  }

  if (user?.email) {
    return `email:${String(user.email).trim().toLowerCase()}`;
  }

  return 'anonymous';
};

const readStoredState = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(MESSAGE_READ_STORAGE_KEY));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeStoredState = (nextState) => {
  localStorage.setItem(MESSAGE_READ_STORAGE_KEY, JSON.stringify(nextState));
};

const normalizeAnnouncementIds = (announcements) => (
  (Array.isArray(announcements) ? announcements : [])
    .map((announcement) => String(announcement?.id || '').trim())
    .filter(Boolean)
);

const getSeenIdSet = (user) => {
  const state = readStoredState();
  const scope = getNotificationScope(user);
  const scopedIds = Array.isArray(state[scope]) ? state[scope] : [];
  return new Set(scopedIds.map((id) => String(id)));
};

export const getUnreadMessageCount = (announcements, user) => {
  const seenIds = getSeenIdSet(user);
  return normalizeAnnouncementIds(announcements).filter((id) => !seenIds.has(id)).length;
};

export const markMessagesAsRead = (announcements, user) => {
  const state = readStoredState();
  const scope = getNotificationScope(user);
  const nextIds = normalizeAnnouncementIds(announcements);

  if (nextIds.length === 0) {
    state[scope] = [];
    writeStoredState(state);
    return [];
  }

  state[scope] = [...new Set(nextIds)].slice(-200);
  writeStoredState(state);
  return state[scope];
};
