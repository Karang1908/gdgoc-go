import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISSED_KEY = 'gdg-go:install-prompt-dismissed';
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const iOSSafari = iOSDevice && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);

  useEffect(() => {
    if (isStandalone()) return;

    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    } catch {
      dismissedAt = 0;
    }
    const recentlyDismissed = Date.now() - dismissedAt < DISMISS_FOR_MS;
    const mobileQuery = window.matchMedia('(max-width: 700px), (pointer: coarse)');
    let timer = 0;

    const reveal = () => {
      if (!recentlyDismissed && mobileQuery.matches && (iOSSafari || installEvent)) {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => setVisible(true), 1200);
      }
    };

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      if (!recentlyDismissed && mobileQuery.matches) {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => setVisible(true), 1200);
      }
    };

    const handleInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    reveal();
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [iOSSafari, installEvent]);

  // The banner is fixed, so it would otherwise sit on top of the last rows of
  // a scrolling page. Flag it on <body> and let the scroll owners reserve room.
  useEffect(() => {
    const shown = visible && !isStandalone();
    document.body.classList.toggle('install-prompt-visible', shown);
    return () => document.body.classList.remove('install-prompt-visible');
  }, [visible]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setVisible(false);
      setInstallEvent(null);
    } else {
      dismiss();
    }
  };

  if (!visible || isStandalone()) return null;

  return (
    <aside className="install-prompt" aria-label="Install GDGoC Go">
      <div className="install-prompt-icon" aria-hidden="true">
        {iOSSafari ? <Share size={19} /> : <Download size={19} />}
      </div>
      <div className="install-prompt-copy">
        <strong>Keep the chase on your Home Screen</strong>
        <span>
          {iOSSafari
            ? 'Tap Share, then Add to Home Screen.'
            : 'Install for a full-screen, app-like game.'}
        </span>
      </div>
      {!iOSSafari && installEvent && (
        <button type="button" className="install-action" onClick={install}>Install</button>
      )}
      <button type="button" className="install-dismiss" onClick={dismiss} aria-label="Dismiss install prompt">
        <X size={18} />
      </button>

      <style>{`
        .install-prompt {
          position: fixed;
          right: 12px;
          bottom: max(12px, env(safe-area-inset-bottom));
          left: 12px;
          z-index: 220;
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 520px;
          min-height: 64px;
          margin: 0 auto;
          padding: 10px 8px 10px 12px;
          border: 1px solid var(--border-strong);
          border-radius: var(--r-lg);
          background: var(--surface);
          color: var(--text);
          box-shadow: var(--shadow-3);
          animation: install-prompt-in 0.3s var(--ease-out) both;
        }

        .install-prompt-icon {
          display: grid;
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          place-items: center;
          border-radius: 12px;
          background: var(--accent-soft);
          color: var(--accent);
        }

        .install-prompt-copy {
          display: flex;
          flex: 1;
          min-width: 0;
          flex-direction: column;
          line-height: 1.25;
        }

        .install-prompt-copy strong { font-size: 0.82rem; }
        .install-prompt-copy span { margin-top: 2px; color: var(--text-2); font-size: 0.75rem; }

        .install-action {
          min-width: 68px;
          min-height: 44px;
          padding: 0 14px;
          border-radius: var(--pill);
          background: var(--accent);
          color: var(--on-accent);
          font-weight: 500;
        }

        .install-dismiss {
          display: grid;
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          place-items: center;
          border-radius: var(--pill);
          color: var(--text-2);
        }

        @keyframes install-prompt-in {
          from { opacity: 0.01; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (min-width: 701px) and (pointer: fine) { .install-prompt { display: none; } }
        @media (prefers-reduced-motion: reduce) { .install-prompt { animation: none; } }
      `}</style>
    </aside>
  );
}
