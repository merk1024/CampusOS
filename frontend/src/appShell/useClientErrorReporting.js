import { useEffect } from 'react';

import { api } from '../api';

export default function useClientErrorReporting(user) {
  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const sendClientError = (payload) => {
      api.reportClientError({
        route: window.location.pathname,
        userAgent: navigator.userAgent,
        ...payload
      }).catch(() => {});
    };

    const handleWindowError = (event) => {
      sendClientError({
        errorName: event.error?.name || 'Error',
        message: event.error?.message || event.message || 'Unhandled browser error',
        stack: event.error?.stack || null
      });
    };

    const handleUnhandledRejection = (event) => {
      const reason = event.reason;
      sendClientError({
        errorName: reason?.name || 'UnhandledRejection',
        message: reason?.message || String(reason || 'Unhandled promise rejection'),
        stack: reason?.stack || null
      });
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [user]);
}
