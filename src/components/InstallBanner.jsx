import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import {
  DEFAULT_INSTALL_COPY,
  DISMISS_SESSION_KEY,
  isRunningStandalone,
  isIOSSafari,
} from '../utils/pwa';

export {
  DEFAULT_INSTALL_COPY,
  DISMISS_SESSION_KEY,
  isRunningStandalone,
  isIOSSafari,
};

export default function InstallBanner({
  title = DEFAULT_INSTALL_COPY.title,
  description = DEFAULT_INSTALL_COPY.description,
  iosDescription = DEFAULT_INSTALL_COPY.iosDescription,
  installText = DEFAULT_INSTALL_COPY.installText,
  dismissAriaLabel = DEFAULT_INSTALL_COPY.dismissAriaLabel,
  className = '',
}) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // default true until verified in useEffect
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // 1. Check if already installed
    if (isRunningStandalone()) {
      setIsInstalled(true);
      return;
    }

    // 2. Check if dismissed for current session
    try {
      const dismissed = sessionStorage.getItem(DISMISS_SESSION_KEY) === 'true';
      setIsDismissed(dismissed);
    } catch {
      setIsDismissed(false);
    }

    // 3. Detect iOS Safari
    const iosDevice = isIOSSafari();
    setIsIOS(iosDevice);

    // 4. Listen for beforeinstallprompt (Android / Desktop Chrome / Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // 5. Listen for appinstalled (Android / Desktop)
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    // 6. Listen for display-mode changes (e.g. user installs or launches installed instance)
    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayModeChange = (e) => {
      if (e.matches) {
        setIsInstalled(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_SESSION_KEY, 'true');
    } catch {
      // Ignore sessionStorage errors in restricted privacy modes
    }
    setIsDismissed(true);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (err) {
      console.error('[InstallBanner] Install prompt failed:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  // Visibility logic:
  // - Never show if already installed
  // - Never show if dismissed in this session
  // - Show if on iOS Safari (manual flow) OR beforeinstallprompt has fired and prompt is stashed
  const shouldShow = !isInstalled && !isDismissed && (isIOS || deferredPrompt !== null);

  if (!shouldShow) {
    return null;
  }

  return (
    <aside
      role="banner"
      aria-label={title}
      className={`fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm bg-white rounded-xl border border-brand-secondary/25 shadow-xl shadow-brand-primary/10 p-4 transition-all duration-200 ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* App / Download Icon */}
        <div className="w-10 h-10 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center flex-shrink-0 mt-0.5">
          <Download className="w-5 h-5 text-brand-primary" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-ink-primary tracking-tight">
              {title}
            </h3>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-ink-secondary/70 hover:text-ink-primary hover:bg-brand-primary/5 rounded-lg p-1 transition-colors cursor-pointer -mr-1 -mt-1"
              aria-label={dismissAriaLabel}
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <p className="text-xs text-ink-secondary mt-1 leading-relaxed">
            {isIOS ? (
              <span className="inline-flex items-center gap-1 flex-wrap">
                {iosDescription}
              </span>
            ) : (
              description
            )}
          </p>

          {/* Action Button for Android / Desktop */}
          {!isIOS && deferredPrompt && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-3.5 py-1.5 bg-brand-primary hover:bg-brand-primary/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {installText}
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
