import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
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
      <div className="modal-card glass-panel animate-fade-in">
        <div className="google-strip" />

        <div className="modal-header">
          <div className="modal-badge">
            <Sparkles size={18} className="badge-sparkle" />
            <span>GDG RACING PROFILE</span>
          </div>
          <h2 className="modal-title">
            {tab === 'signup' ? 'Create Your Driver Profile' : 'Welcome Back, Driver'}
          </h2>
          <p className="modal-subtitle">
            {tab === 'signup'
              ? 'Register your callsign to save high scores and rank on the global leaderboard.'
              : 'Sign in to access your car garage and continue competing.'}
          </p>
        </div>

        {/* Tab Switcher */}
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
          <div className="input-group">
            <label className="input-label" htmlFor="auth-username">
              Username
            </label>
            <div className="input-wrapper">
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
            <div className="input-group animate-fade-in">
              <label className="input-label" htmlFor="auth-display-name">
                Display Name (Optional)
              </label>
              <div className="input-wrapper">
                <Sparkles size={18} className="input-icon" />
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
              <span className="input-hint">Name shown publicly on the leaderboard</span>
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="auth-password">
              Password
            </label>
            <div className="input-wrapper">
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
            className="btn btn-primary btn-lg submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>{tab === 'signup' ? 'Creating Driver...' : 'Signing In...'}</span>
              </>
            ) : (
              <span>{tab === 'signup' ? 'Start Racing' : 'Enter Garage'}</span>
            )}
          </button>
        </form>

        {canDismiss && onClose && (
          <button
            type="button"
            className="dismiss-btn"
            onClick={onClose}
          >
            Cancel
          </button>
        )}
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(4, 7, 13, 0.88);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }

        .modal-card {
          width: 100%;
          max-width: 440px;
          border-radius: var(--radius-xl);
          overflow: hidden;
          background: var(--bg-surface);
          border: 1px solid var(--border-medium);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        .modal-header {
          padding: 28px 28px 16px;
          text-align: center;
        }

        .modal-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(66, 133, 244, 0.15);
          border: 1px solid rgba(66, 133, 244, 0.3);
          border-radius: 20px;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--google-blue);
          margin-bottom: 12px;
        }

        .modal-title {
          font-size: 1.5rem;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .modal-subtitle {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .tab-switcher {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          background: var(--bg-primary);
          padding: 4px;
          margin: 0 28px 20px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
        }

        .tab-btn {
          padding: 10px;
          border-radius: calc(var(--radius-md) - 2px);
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-family: var(--font-sans);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .tab-btn.active {
          background: var(--bg-surface-elevated);
          color: #FFFFFF;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .error-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 0 28px 16px;
          padding: 12px 14px;
          background: rgba(234, 67, 53, 0.12);
          border: 1px solid rgba(234, 67, 53, 0.3);
          border-radius: var(--radius-md);
          color: #FF8F8F;
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .error-icon {
          flex-shrink: 0;
          color: var(--google-red);
          margin-top: 1px;
        }

        .auth-form {
          padding: 0 28px 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
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
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease;
        }

        .password-toggle-btn:hover {
          color: var(--text-primary);
        }

        .input-hint {
          font-size: 0.74rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .submit-btn {
          margin-top: 8px;
          width: 100%;
        }

        .dismiss-btn {
          display: block;
          width: 100%;
          text-align: center;
          padding: 12px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.85rem;
          cursor: pointer;
          margin-top: -12px;
          margin-bottom: 8px;
        }

        .dismiss-btn:hover {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};
