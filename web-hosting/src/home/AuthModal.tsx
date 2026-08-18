import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canDismiss?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  canDismiss = false,
}) => {
  const { signIn, signUp, error, clearError } = useAuth();

  const [tab, setTab] = useState<'login' | 'signup'>('signup');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTabSwitch = (newTab: 'login' | 'signup') => {
    setTab(newTab);
    clearError();
    setLocalError(null);
  };

  const validate = (): boolean => {
    setLocalError(null);
    const cleanUser = username.trim();

    if (!cleanUser) {
      setLocalError('Please enter a username.');
      return false;
    }

    if (cleanUser.length < 3 || cleanUser.length > 24) {
      setLocalError('Username must be between 3 and 24 characters.');
      return false;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
      setLocalError('Username can only contain letters, numbers, dashes, underscores, and dots.');
      return false;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return false;
    }

    if (tab === 'signup' && displayName.trim().length > 24) {
      setLocalError('Display name must be 24 characters or less.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    setLocalError(null);
    clearError();

    try {
      if (tab === 'signup') {
        const finalDisplayName = displayName.trim() || username.trim();
        await signUp(username, password, finalDisplayName);
      } else {
        await signIn(username, password);
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
    <div className="modal-backdrop">
      <div className="modal-card card animate-fade-in">
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

        {/* Error Alert */}
        {activeError && (
          <div className="error-banner">
            <AlertCircle size={18} className="error-icon" />
            <span>{activeError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="field-label" htmlFor="auth-username">
              Username
            </label>
            <div className="input-wrap">
              <User size={18} className="input-icon" />
              <input
                id="auth-username"
                type="text"
                className="input-field with-icon"
                placeholder="e.g. speedster99"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <span className="input-hint">3–24 characters (letters, numbers, _, -)</span>
          </div>

          {tab === 'signup' && (
            <div className="field animate-fade-in">
              <label className="field-label" htmlFor="auth-display-name">
                Display Name (Optional)
              </label>
              <div className="input-wrap">
                <User size={18} className="input-icon" />
                <input
                  id="auth-display-name"
                  type="text"
                  className="input-field with-icon"
                  placeholder="e.g. Alex Rivera"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={24}
                />
              </div>
              <span className="input-hint">Shown publicly on the leaderboard</span>
            </div>
          )}

          <div className="field">
            <label className="field-label" htmlFor="auth-password">
              Password
            </label>
            <div className="input-wrap">
              <Lock size={18} className="input-icon" />
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
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                <Loader2 size={18} className="animate-spin" />
                <span>{tab === 'signup' ? 'Creating...' : 'Signing In...'}</span>
              </>
            ) : (
              <span>{tab === 'signup' ? 'Start Racing' : 'Enter Garage'}</span>
            )}
          </button>
        </form>

        {canDismiss && onClose && (
          <button
            type="button"
            className="dismiss-btn btn-text"
            onClick={onClose}
          >
            Cancel
          </button>
        )}
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100dvh;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
          z-index: 1000;
        }

        .modal-card {
          width: 100%;
          max-width: 440px;
          max-height: min(92dvh, 640px);
          border-radius: var(--r-xl);
          background: var(--surface);
          border: 2px solid var(--border);
          box-shadow: var(--shadow-3);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 0;
        }

        .modal-header {
          padding: 28px 24px 16px;
          text-align: center;
        }

        .modal-brand-hub {
          width: 48px;
          height: 48px;
          border-radius: var(--pill);
          background: var(--surface-2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
        }

        .modal-gdg-mark {
          width: 28px;
          height: 28px;
          object-fit: contain;
        }

        .modal-title {
          font-size: 1.5rem;
          margin-bottom: 6px;
        }

        .modal-subtitle {
          font-size: 0.88rem;
          color: var(--text-2);
          line-height: 1.45;
          max-width: 360px;
          margin: 0 auto;
        }

        .tab-switcher {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          background: var(--surface-2);
          padding: 4px;
          margin: 0 24px 16px;
          border-radius: var(--pill);
          border: 1px solid var(--border);
        }

        .tab-btn {
          padding: 8px 14px;
          border-radius: var(--pill);
          background: transparent;
          border: none;
          color: var(--text-2);
          font-family: var(--font-display);
          font-weight: 500;
          font-size: 0.88rem;
          cursor: pointer;
          transition: all 0.15s var(--ease);
        }

        .tab-btn.active {
          background: var(--surface);
          color: var(--text);
          font-weight: 700;
          box-shadow: var(--shadow-1);
        }

        .error-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 0 24px 16px;
          padding: 10px 14px;
          background: var(--danger-soft);
          border: 1px solid var(--danger);
          border-radius: var(--r-md);
          color: var(--danger);
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .error-icon {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .auth-form {
          padding: 0 24px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
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

        .input-field.with-icon {
          padding-left: 42px;
        }

        .input-field.with-suffix {
          padding-right: 42px;
        }

        .password-toggle-btn {
          position: absolute;
          right: 12px;
          color: var(--text-3);
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease;
        }

        .password-toggle-btn:hover {
          color: var(--text);
        }

        .submit-btn {
          margin-top: 6px;
          width: 100%;
        }

        .dismiss-btn {
          display: block;
          width: 100%;
          text-align: center;
          padding: 10px;
          margin-top: -12px;
          margin-bottom: 12px;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
};
