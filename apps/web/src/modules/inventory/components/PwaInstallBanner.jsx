import { useEffect, useState } from 'react';
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

const DISMISS_KEY = 'nhpaowa_pwa_install_dismissed';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Prompts phones/desktops to install the NHPAOWA PWA.
 * Chromium: uses beforeinstallprompt. iOS Safari: shows Add to Home Screen tips.
 */
export function PwaInstallBanner({ className = '' }) {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;

    if (isIos()) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    function onBeforeInstall(e) {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setDeferred(null);
      setVisible(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    };
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } finally {
      setDeferred(null);
      setVisible(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      className={`rounded-lg border border-brand/30 bg-brand/5 px-3 py-2.5 text-sm text-ink shadow-sm ${className}`}
      role="status"
    >
      <div className="flex items-start gap-2">
        <ArrowDownTrayIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">Install NHPAOWA</p>
          {iosHint ? (
            <p className="mt-0.5 text-xs text-muted">
              On iPhone/iPad: tap Share, then{' '}
              <span className="font-medium text-ink">Add to Home Screen</span>.
              Open the icon to sign in like an app.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted">
              Add to your home screen for quick login and a full-screen app
              experience.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {!iosHint && deferred ? (
              <button
                type="button"
                className="btn-primary !px-3 !py-1.5 text-xs"
                onClick={install}
              >
                Install app
              </button>
            ) : null}
            <button
              type="button"
              className="btn-ghost !px-3 !py-1.5 text-xs"
              onClick={dismiss}
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded p-1 text-muted hover:bg-surface hover:text-ink"
          aria-label="Dismiss install prompt"
          onClick={dismiss}
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function useIsPwaStandalone() {
  const [standalone, setStandalone] = useState(isStandalone);

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const sync = () => setStandalone(isStandalone());
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  return standalone;
}
