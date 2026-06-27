import { useState, useEffect } from 'react';

const INSTALLED_KEY = 'pwa_installed';

export type PWAInstallState =
  | 'standalone'       // Ya está instalada como PWA
  | 'installable'      // Tiene el prompt nativo disponible (Android Chrome/Edge)
  | 'ios'              // iOS Safari — requiere guía manual
  | 'ios-installed'    // iOS en modo standalone (ya instalada)
  | 'manual'           // Android/Desktop sin prompt (Firefox, Samsung, etc.) — mostrar guía
  | 'hidden';          // Ocultar (e.g. browser no compatible)

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installState, setInstallState] = useState<PWAInstallState>('hidden');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Si el usuario ya instaló la app anteriormente, no mostrar nada
    if (localStorage.getItem(INSTALLED_KEY) === 'true') {
      setInstallState('standalone');
      return;
    }

    const ua = window.navigator.userAgent.toLowerCase();

    // ── Detectar iOS (incluyendo iPads con iPadOS 13+ que reportan MacIntel) ──
    const isIPad =
      ua.includes('ipad') ||
      (ua.includes('macintosh') && navigator.maxTouchPoints > 1);
    const isIPhone = /iphone|ipod/.test(ua);
    const isIOS = isIPad || isIPhone;

    // ── Detectar modo standalone (ya instalada) ──
    const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
    const isStandaloneNavigator = !!(window.navigator as any).standalone;
    const isAndroidApp = document.referrer.includes('android-app://');
    const isStandalone = isStandaloneMedia || isStandaloneNavigator || isAndroidApp;

    if (isStandalone) {
      localStorage.setItem(INSTALLED_KEY, 'true');
      setInstallState('standalone');
      return;
    }

    if (isIOS) {
      if ((window.navigator as any).standalone === true) {
        localStorage.setItem(INSTALLED_KEY, 'true');
        setInstallState('ios-installed');
      } else {
        setInstallState('ios');
      }
      return;
    }

    // ── Para Android/Desktop: escuchar el evento nativo ──
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setInstallState('installable');
    };

    window.addEventListener('beforeinstallprompt', handler);

    // ── Fallback: si el navegador no dispara beforeinstallprompt en 3 segundos ──
    const fallbackTimer = setTimeout(() => {
      const isMobileUA = /android|mobile|tablet/i.test(ua);
      const isHttps =
        window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost';

      if (isMobileUA && isHttps) {
        setInstallState((prev) => (prev === 'hidden' ? 'manual' : prev));
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(INSTALLED_KEY, 'true');
      setInstallState('standalone');
    }
    setInstallPrompt(null);
    if (outcome !== 'accepted') {
      setInstallState('manual');
    }
  };

  // Llamar cuando el usuario confirma instalación manual (iOS / guía Android)
  const markAsInstalled = () => {
    localStorage.setItem(INSTALLED_KEY, 'true');
    setInstallState('standalone');
  };

  const isInstallable = installState === 'installable';
  const isStandalone = installState === 'standalone' || installState === 'ios-installed';
  const isIOS = installState === 'ios';
  const isManual = installState === 'manual';

  return {
    installState,
    isInstallable,
    isStandalone,
    isIOS,
    isManual,
    handleInstallClick,
    markAsInstalled,
  };
}
