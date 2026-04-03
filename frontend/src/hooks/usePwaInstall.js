import { useEffect, useState } from 'react';

const DISPLAY_MODE_QUERY = '(display-mode: standalone)';

const getInstalledState = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia?.(DISPLAY_MODE_QUERY).matches || window.navigator.standalone === true;
};

function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(getInstalledState);
  const [installing, setInstalling] = useState(false);
  const [recentOutcome, setRecentOutcome] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia?.(DISPLAY_MODE_QUERY);

    const syncInstalledState = () => {
      setIsInstalled(getInstalledState());
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setRecentOutcome('');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstalling(false);
      setRecentOutcome('accepted');
    };

    syncInstalledState();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery?.addEventListener?.('change', syncInstalledState);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery?.removeEventListener?.('change', syncInstalledState);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt || installing) {
      return false;
    }

    setInstalling(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      const accepted = choice?.outcome === 'accepted';
      setRecentOutcome(accepted ? 'accepted' : 'dismissed');
      setDeferredPrompt(null);
      return accepted;
    } finally {
      setInstalling(false);
    }
  };

  return {
    canInstall: Boolean(deferredPrompt) && !isInstalled,
    isInstalled,
    installing,
    recentOutcome,
    installApp
  };
}

export default usePwaInstall;
