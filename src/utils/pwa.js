export const DEFAULT_INSTALL_COPY = {
  title: 'Install UniX',
  description: 'Install UniX for faster, app-like access.',
  iosDescription: "Tap Share, then 'Add to Home Screen' for faster, app-like access.",
  installText: 'Install',
  dismissAriaLabel: 'Dismiss install banner',
};

export const DISMISS_KEY = 'unix_pwa_banner_dismissed_until';
export const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
export const DISMISS_SESSION_KEY = DISMISS_KEY; // For backwards compatibility

/**
 * Checks if the application is currently running in standalone display mode (installed PWA)
 */
export function isRunningStandalone(
  win = typeof window !== 'undefined' ? window : null,
  nav = typeof navigator !== 'undefined' ? navigator : null
) {
  if (!win) return false;
  const isStandaloneMatch = win.matchMedia?.('(display-mode: standalone)')?.matches;
  const isIosStandalone = nav?.standalone === true;
  return Boolean(isStandaloneMatch || isIosStandalone);
}

/**
 * Checks if the client is iOS Safari/WebKit (where beforeinstallprompt does not fire)
 */
export function isIOSSafari(nav = typeof navigator !== 'undefined' ? navigator : null) {
  if (!nav) return false;
  const ua = nav.userAgent || '';
  const isAppleTouch =
    /iPad|iPhone|iPod/.test(ua) || (nav.platform === 'MacIntel' && (nav.maxTouchPoints || 0) > 1);
  return Boolean(isAppleTouch);
}
