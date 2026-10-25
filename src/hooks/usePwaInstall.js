import { useState, useEffect, useCallback } from 'react';

// Capture globale dès le chargement du script pour ne jamais manquer l'événement Android Chrome
let globalDeferredPrompt = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function checkIsStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator?.standalone === true
  );
}

function checkIsIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    notifyListeners();
  });
}

export function usePwaInstall() {
  const [canNativePrompt, setCanNativePrompt] = useState(
    Boolean(globalDeferredPrompt)
  );
  const [isInstalled, setIsInstalled] = useState(checkIsStandalone);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const isIos = checkIsIos();

  useEffect(() => {
    const syncState = () => {
      setCanNativePrompt(Boolean(globalDeferredPrompt));
      setIsInstalled(checkIsStandalone());
    };

    listeners.add(syncState);

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayChange = () => setIsInstalled(checkIsStandalone());
    mediaQuery?.addEventListener?.('change', handleDisplayChange);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      listeners.delete(syncState);
      mediaQuery?.removeEventListener?.('change', handleDisplayChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (globalDeferredPrompt) {
      try {
        await globalDeferredPrompt.prompt();
        const choice = await globalDeferredPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
          globalDeferredPrompt = null;
          setCanNativePrompt(false);
          setIsInstallModalOpen(false);
        }
        return;
      } catch {
        // Fallback vers la modale explicative
      }
    }
    setIsInstallModalOpen(true);
  }, []);

  return {
    isInstalled,
    isIos,
    isOnline,
    canNativePrompt,
    isInstallModalOpen,
    setIsInstallModalOpen,
    triggerInstall,
  };
}
