import { useEffect, useRef, useState } from 'react';
import { BookOpen, Gamepad2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface WelcomeDialogProps {
  /** Suppressed while another dialog owns the screen. */
  suppressed?: boolean;
  /** Send the player to the How to Play guide. */
  onHowToPlay: () => void;
}

export function WelcomeDialog({ suppressed = false, onHowToPlay }: WelcomeDialogProps) {
  const { loginEvent } = useAuth();
  const [visible, setVisible] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Shown on every sign-in and sign-up. loginEvent starts at 0 and is bumped
  // only by an explicit auth action, so a page reload that restores an existing
  // session does not re-trigger it. The short delay lets the auth dialog finish
  // closing first.
  useEffect(() => {
    if (loginEvent === 0) return;
    const timer = window.setTimeout(() => setVisible(true), 350);
    return () => window.clearTimeout(timer);
  }, [loginEvent]);

  const dismiss = () => setVisible(false);

  const showGuide = () => {
    setVisible(false);
    onHowToPlay();
  };

  const open = visible && !suppressed;

  useEffect(() => {
    document.body.classList.toggle('welcome-open', open);
    return () => document.body.classList.remove('welcome-open');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="welcome-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="welcome-card">
        <img src="/assets/gdg-mark.png" alt="" className="welcome-mark" aria-hidden="true" />

        <h2 id="welcome-title" className="welcome-title">Ready to drive?</h2>
        <p className="welcome-copy">
          You are the getaway driver. Swipe or steer to change lanes, dodge traffic,
          collect coins, and keep an eye on your fuel.
        </p>

        <div className="welcome-actions">
          <button
            ref={primaryRef}
            type="button"
            id="welcome-how-to-play"
            className="btn btn-filled btn-lg welcome-btn"
            onClick={showGuide}
          >
            <BookOpen size={17} />
            <span>Show me how to play</span>
          </button>

          <button
            type="button"
            id="welcome-skip"
            className="btn btn-outlined btn-lg welcome-btn"
            onClick={dismiss}
          >
            <Gamepad2 size={17} />
            <span>I already know</span>
          </button>
        </div>

        <p className="welcome-footnote">The full guide is always in How to Play.</p>
      </div>

      <style>{`
        .welcome-scrim {
          position: fixed;
          inset: 0;
          z-index: 1200;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--scrim);
          padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
        }

        .welcome-card {
          width: 100%;
          max-width: 420px;
          min-width: 0;
          box-sizing: border-box;
          padding: 32px 24px 24px;
          border-radius: var(--r-xl);
          background: var(--surface);
          box-shadow: var(--shadow-4);
          text-align: center;
          max-height: calc(100dvh - max(32px, env(safe-area-inset-top)) - max(32px, env(safe-area-inset-bottom)));
          overflow-y: auto;
          overscroll-behavior: contain;
          animation: fadeIn var(--dur-md) var(--ease-out) both;
        }

        .welcome-mark {
          width: 44px;
          height: 44px;
          object-fit: contain;
          margin-bottom: 16px;
        }

        .welcome-title {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 500;
          letter-spacing: -0.015em;
          color: var(--text);
          margin-bottom: 8px;
        }

        .welcome-copy {
          font-size: 0.9375rem;
          line-height: 1.55;
          color: var(--text-2);
          margin: 0 auto 24px;
          max-width: 34ch;
        }

        .welcome-actions {
          display: grid;
          gap: 10px;
        }

        .welcome-btn {
          width: 100%;
          min-height: 48px;
          font-size: 0.9375rem;
          font-weight: 500;
          touch-action: manipulation;
        }

        .welcome-footnote {
          margin-top: 16px;
          font-size: 0.75rem;
          color: var(--text-3);
        }

        @media (pointer: coarse) {
          .welcome-btn { min-height: 52px; }
        }

        /* Short landscape phones: keep both actions reachable without scrolling. */
        @media (max-height: 520px) {
          .welcome-card { padding: 20px 20px 16px; }
          .welcome-mark { width: 32px; height: 32px; margin-bottom: 10px; }
          .welcome-title { font-size: 1.25rem; }
          .welcome-copy { margin-bottom: 16px; font-size: 0.875rem; }
          .welcome-footnote { margin-top: 10px; }
        }
      `}</style>
    </div>
  );
}
