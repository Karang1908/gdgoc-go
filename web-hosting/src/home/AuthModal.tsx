import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, Mail, AlertCircle, Loader2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  canDismiss?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  canDismiss = true,
}) => {
  const { signIn, signUp, error, clearError } = useAuth();

  const [tab, setTab] = useState<'signup' | 'login'>('signup');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTabSwitch = (nextTab: 'signup' | 'login') => {
    setTab(nextTab);
    clearError();
    setLocalError(null);
  };

  const validate = () => {
    if (!username.trim()) {
      setLocalError('Please enter a username');
      return false;
    }
    if (username.trim().length < 3) {
      setLocalError('Username must be at least 3 characters');
      return false;
    }
    if (tab === 'signup' && !/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      setLocalError('Username can only contain letters, numbers, _, -');
      return false;
    }

    if (tab === 'signup') {
      if (!displayName.trim()) {
        setLocalError('Please enter your name');
        return false;
      }
      if (displayName.trim().length < 2) {
        setLocalError('Name must be at least 2 characters');
        return false;
      }
      if (!email.trim()) {
        setLocalError('Please enter your email address');
        return false;
      }
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email.trim())) {
        setLocalError('Please enter a valid email address');
        return false;
      }
    }

    if (!password) {
      setLocalError('Please enter a password');
      return false;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (tab === 'signup') {
        await signUp(username.trim(), email.trim(), password, displayName.trim());
      } else {
        await signIn(username.trim(), password);
      }
      if (onClose) onClose();
    } catch (err: any) {
      // AuthContext sets error state
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeError = localError || error;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && canDismiss && onClose) {
          onClose();
        }
      }}
    >
      <div className="modal-card card animate-fade-in">
        {/* Top Right Close Button */}
        {canDismiss && (
          <button
            type="button"
            className="modal-close-icon-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        )}

        <div className="modal-header">
          <div className="modal-brand-hub">
            <img src="/assets/gdg-mark.png" alt="GDG" className="modal-gdg-mark" />
          </div>

          <h2 className="modal-title">
            {tab === 'signup' ? 'Create driver profile' : 'Welcome back'}
          </h2>
          <p className="modal-subtitle">
            {tab === 'signup'
              ? 'Register your handle to save high scores and rank on the global leaderboard.'
              : 'Sign in to access your garage and continue competing.'}
          </p>
        </div>

        {/* Tab Switcher (Google Pills) */}
        <div className="tab-switcher">
          <button
            type="button"
            id="tab-signup-btn"
            className={`tab-btn ${tab === 'signup' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('signup')}
          >
            Create Account
          </button>
          <button
            type="button"
            id="tab-login-btn"
            className={`tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('login')}
          >
            Sign In
          </button>
        </div>

        {tab === 'signup' && (
          <p className="profile-note">
            Please use your real name and email address so we can verify scores and contact you when needed.
          </p>
        )}

        {/* Error Alert */}
        {activeError && (
          <div className="error-banner">
            <AlertCircle size={16} className="error-icon" />
            <span>{activeError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="field-label" htmlFor="auth-username">
              {tab === 'signup' ? 'Username' : 'Username or Email'}
            </label>
            <div className="input-wrap">
              <User size={16} className="input-icon" />
              <input
                id="auth-username"
                type="text"
                className="input-field with-icon"
                placeholder={tab === 'signup' ? 'Your username' : 'Your username or email'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete={tab === 'signup' ? 'username' : 'username email'}
                required
              />
            </div>
            <span className="input-hint">
              {tab === 'signup' ? '3–24 chars (letters, numbers, _, -)' : 'Your registered handle or email'}
            </span>
          </div>

          {tab === 'signup' && (
            <>
              <div className="field animate-fade-in">
                <label className="field-label" htmlFor="auth-display-name">
                  Name
                </label>
                <div className="input-wrap">
                  <User size={16} className="input-icon" />
                  <input
                    id="auth-display-name"
                    type="text"
                    className="input-field with-icon"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={24}
                    required
                  />
                </div>
                <span className="input-hint">Shown publicly on the leaderboard</span>
              </div>

              <div className="field animate-fade-in">
                <label className="field-label" htmlFor="auth-email">
                  Email Address
                </label>
                <div className="input-wrap">
                  <Mail size={16} className="input-icon" />
                  <input
                    id="auth-email"
                    type="email"
                    className="input-field with-icon"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <span className="input-hint">For score verification and contact</span>
              </div>
            </>
          )}

          <div className="field">
            <label className="field-label" htmlFor="auth-password">
              Password
            </label>
            <div className="input-wrap">
              <Lock size={16} className="input-icon" />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                className="input-field with-icon with-suffix"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                className="password-toggle-btn icon-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className="input-hint">Minimum 6 characters</span>
          </div>

          <button
            type="submit"
            id="auth-submit-btn"
            className="btn btn-filled btn-lg submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{tab === 'signup' ? 'Start Racing' : 'Sign In'}</span>
            )}
          </button>
        </form>
      </div>

      <style>{`
        /* Google dialogs sit on a plain scrim — no backdrop blur. */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          background: var(--scrim);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
          z-index: 1000;
        }

        .modal-card {
          position: relative;
          width: 100%;
          max-width: 400px;
          border-radius: var(--r-xl);
          background: var(--surface);
          border: none;
          box-shadow: var(--shadow-4);
          overflow: hidden;
          max-height: calc(100dvh - max(24px, env(safe-area-inset-top)) - max(24px, env(safe-area-inset-bottom)));
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 0;
        }

        .modal-close-icon-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: transparent;
          background-image: none;
          border: none;
          color: var(--text-2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color var(--dur-sm) var(--ease), color var(--dur-sm) var(--ease);
          z-index: 5;
          touch-action: manipulation;
        }

        .modal-close-icon-btn:hover {
          background-image: linear-gradient(var(--state-hover), var(--state-hover));
          color: var(--text);
        }

        .modal-header {
          padding: 28px 24px 10px;
          text-align: center;
        }

        .modal-brand-hub {
          width: 44px;
          height: 44px;
          border-radius: var(--pill);
          background: var(--surface-2);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
        }

        .modal-gdg-mark {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }

        .modal-title {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 500;
          letter-spacing: -0.015em;
          margin-bottom: 6px;
          line-height: 1.25;
        }

        .modal-subtitle {
          font-size: 0.875rem;
          color: var(--text-2);
          line-height: 1.45;
          max-width: 320px;
          margin: 0 auto;
        }

        /* M3 segmented button */
        .tab-switcher {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px;
          background: var(--surface-3);
          padding: 4px;
          margin: 16px 24px 12px;
          border-radius: var(--pill);
          border: none;
        }

        .tab-btn {
          padding: 9px 12px;
          border-radius: var(--pill);
          background-color: transparent;
          background-image: none;
          border: none;
          color: var(--text-2);
          font-family: var(--font-display);
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background-color var(--dur-sm) var(--ease), color var(--dur-sm) var(--ease);
          user-select: none;
          touch-action: manipulation;
        }

        .tab-btn:hover:not(.active) {
          background-image: linear-gradient(var(--state-hover), var(--state-hover));
          color: var(--text);
        }

        .tab-btn.active {
          background-color: var(--surface);
          color: var(--accent);
          font-weight: 500;
          box-shadow: var(--shadow-1);
        }

        /* Tonal error container: colour plus an icon, never colour alone. */
        .error-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 0 24px 10px;
          padding: 12px 14px;
          background: var(--danger-soft);
          border: none;
          border-radius: var(--r-md);
          color: var(--danger);
          font-size: 0.8125rem;
          line-height: 1.45;
        }

        .error-icon {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .profile-note {
          margin: 0 24px 10px;
          color: var(--text-2);
          font-size: 0.75rem;
          line-height: 1.5;
          text-align: center;
        }

        .auth-form {
          padding: 0 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--text-2);
          margin-bottom: 0;
        }

        .input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: var(--text-3);
          pointer-events: none;
        }

        .input-field {
          height: 48px;
          font-size: 0.9375rem;
          border-radius: var(--r-sm);
        }

        .input-field.with-icon {
          padding-left: 44px;
        }

        .input-field.with-suffix {
          padding-right: 48px;
        }

        .input-hint {
          font-size: 0.75rem;
          color: var(--text-3);
          margin-top: 0;
        }

        .password-toggle-btn {
          position: absolute;
          right: 6px;
          width: 36px;
          height: 36px;
          color: var(--text-3);
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color var(--dur-sm) var(--ease), background-color var(--dur-sm) var(--ease);
          border-radius: 50%;
        }

        .password-toggle-btn:hover {
          color: var(--text);
        }

        .submit-btn {
          margin-top: 6px;
          width: 100%;
          height: 48px;
          font-size: 0.9375rem;
          font-weight: 500;
          touch-action: manipulation;
        }

        @media (max-width: 600px), (pointer: coarse) {
          .modal-header { padding: 24px 20px 8px; }
          .tab-switcher { margin: 14px 20px 10px; }
          .error-banner, .profile-note { margin-left: 20px; margin-right: 20px; }
          .auth-form { padding: 0 20px 20px; }

          .modal-close-icon-btn {
            top: 6px;
            right: 6px;
            width: 44px;
            height: 44px;
          }

          .tab-btn { min-height: 44px; }

          .input-field {
            height: 52px;
            font-size: 1rem;
          }

          .password-toggle-btn {
            right: 4px;
            width: 44px;
            height: 44px;
          }

          .input-field.with-suffix { padding-right: 52px; }
          .submit-btn { min-height: 52px; }
        }
      `}</style>
    </div>
  );
};
