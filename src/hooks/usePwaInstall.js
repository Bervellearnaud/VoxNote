import { useState, useEffect, useCallback } from 'react';

function getDeferredPrompt() {
  if (typeof window === 'undefined') return null;
  return window.__voxnoteDeferredPrompt || null;
}

function clearDeferredPrompt() {
  if (typeof window !== 'undefined') {
    window.__voxnoteDeferredPrompt = null;
  }
}

function checkIsStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
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

function checkIsAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
}

function checkIsInAppBrowser() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /WhatsApp|FBAN|FBAV|Instagram|Line\/|Musical_ly|TikTok|; wv\)/i.test(
    ua
  );
}

export function buildOpenInChromeIntentUrl() {
  if (typeof window === 'undefined') return '';
  const { host, pathname, search } = window.location;
  return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end`;
}

export function usePwaInstall() {
  const [canNativePrompt, setCanNativePrompt] = useState(() =>
    Boolean(getDeferredPrompt())
  );
  const [isInstalled, setIsInstalled] = useState(checkIsStandalone);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const isIos = checkIsIos();
  const isAndroid = checkIsAndroid();
  const isInAppBrowser = checkIsInAppBrowser();

  useEffect(() => {
    const syncPrompt = () => {
      setCanNativePrompt(Boolean(getDeferredPrompt()));
      setIsInstalled(checkIsStandalone());
    };

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      window.__voxnoteDeferredPrompt = e;
      syncPrompt();
    };

    const handleInstalled = () => {
      clearDeferredPrompt();
      setCanNativePrompt(false);
      setIsInstalled(true);
      setIsInstallModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('voxnote-install-ready', syncPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('voxnote-installed', handleInstalled);

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    mediaQuery?.addEventListener?.('change', syncPrompt);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Synchroniser immédiatement au montage
    syncPrompt();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('voxnote-install-ready', syncPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('voxnote-installed', handleInstalled);
      mediaQuery?.removeEventListener?.('change', syncPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    const promptEvent = getDeferredPrompt();
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        clearDeferredPrompt();
        setCanNativePrompt(false);
        if (choice?.outcome === 'accepted') {
          setIsInstallModalOpen(false);
        }
        return;
      } catch {
        clearDeferredPrompt();
        setCanNativePrompt(false);
      }
    }
    setIsInstallModalOpen(true);
  }, []);

  return {
    isInstalled,
    isIos,
    isAndroid,
    isInAppBrowser,
    isOnline,
    canNativePrompt,
    isInstallModalOpen,
    setIsInstallModalOpen,
    triggerInstall,
  };
}
