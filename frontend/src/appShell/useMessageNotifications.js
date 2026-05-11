import { useEffect, useState } from 'react';

import { api } from '../api';
import { getReminderUnreadCount } from '../appPreferences';

export default function useMessageNotifications({ user, activePage, reminderMode }) {
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    if (reminderMode === 'Off') {
      return undefined;
    }

    let cancelled = false;

    const refreshMessageNotifications = async () => {
      try {
        const response = await api.getNotifications();
        if (cancelled) {
          return;
        }

        const unreadCount = getReminderUnreadCount(
          response?.notifications || [],
          reminderMode
        );
        setMessageUnreadCount(activePage === 'messages' ? 0 : unreadCount);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to refresh message notifications:', error);
        }
      }
    };

    refreshMessageNotifications();
    const intervalId = window.setInterval(refreshMessageNotifications, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activePage, reminderMode, user]);

  return [messageUnreadCount, setMessageUnreadCount];
}
