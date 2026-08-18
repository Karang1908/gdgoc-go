import React from 'react';
import { CircleHelp, Gamepad2, Trophy, Sun, Moon, LogOut, User, Coins } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { AppRoute } from '../lib/routes';

interface NavbarProps {
  currentRoute: AppRoute;
  navigate: (route: AppRoute) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  navigate,
  onOpenAuth,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { session, profile, userCoins, userGdgCoins, signOut } = useAuth();

  return (
    <header className="appbar">
      <div className="appbar-content">
        {/* Left: Brand Lockup with Logo and GDGoC Go! */}
        <button
          type="button"
          className="brand"
          onClick={() => navigate('home')}
          aria-label="GDGoC Go Home"
        >
          {/* Desktop full logo */}
          <img
            className="logo-desktop logo-light"
            src="/assets/gdg-logo-light.png"
            alt="Google Developer Groups"
          />
          <img
            className="logo-desktop logo-dark"
            src="/assets/gdg-logo-dark.png"
            alt="Google Developer Groups"
          />

          {/* Mobile compact mark */}
          <img
            className="logo-mobile-mark"
            src="/assets/gdg-mark.png"
            alt="GDG"
          />

          <div className="brand-divider" />
          <span className="brand-title">GDGoC Go!</span>
        </button>

        {/* Center/Nav: Pill Navigation & Actions */}
        <nav className="nav-actions">
          <button
            id="nav-play-btn"
            className={`nav-pill ${currentRoute === 'home' ? 'active' : ''}`}
            onClick={() => navigate('home')}
            aria-label="Play Game"
          >
            <Gamepad2 size={17} />
            <span className="nav-pill-label">Play</span>
          </button>

          <button
            id="nav-leaderboard-btn"
            className={`nav-pill ${currentRoute === 'leaderboard' ? 'active' : ''}`}
            onClick={() => navigate('leaderboard')}
            aria-label="Leaderboard"
          >
            <Trophy size={17} />
            <span className="nav-pill-label">Leaderboard</span>
          </button>

          <button
            id="nav-controls-btn"
            className={`nav-pill controls-nav-pill ${currentRoute === 'controls' ? 'active' : ''}`}
            onClick={() => navigate('controls')}
            aria-label="How to Play"
            title="How to Play"
          >
            <CircleHelp size={17} />
            <span className="nav-pill-label">How to Play</span>
          </button>

          {/* Cumulative Wallet Chips */}
          {session && (
            <div className="nav-wallet-group">
              <div
                className="wallet-chip standard"
                title={`Cumulative Standard Coins: ${(userCoins || 0).toLocaleString()}`}
              >
                <Coins size={13} className="coin-svg" style={{ color: 'var(--g-yellow)' }} />
                <span className="coin-count font-mono">{(userCoins || 0).toLocaleString()}</span>
              </div>

              <div
                className="wallet-chip gdg"
                title={`Cumulative GDG Coins: ${(userGdgCoins || 0).toLocaleString()}`}
              >
                <img src="/branding/gdg-pill.png" alt="GDG Coin" className="inline-gdg-pill-icon" />
                <span className="coin-count font-mono">{(userGdgCoins || 0).toLocaleString()}</span>
                <span className="coin-label">GDG</span>
              </div>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            className="icon-btn theme-toggle-btn"
            id="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User Profile or Sign In */}
          {session && profile ? (
            <div className="user-profile-pill">
              <div className="user-avatar">
                <User size={14} />
              </div>
              <div className="user-text-stack">
                <span className="user-username font-mono" title={`@${profile.username}`}>
                  @{profile.username}
                </span>
                <span className="user-displayname" title={profile.display_name}>
                  {profile.display_name}
                </span>
              </div>
              <button
                id="nav-signout-btn"
                className="signout-icon-btn"
                onClick={() => signOut()}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              id="nav-signin-btn"
              className="btn btn-filled btn-sm nav-signin-btn"
              onClick={onOpenAuth}
            >
              <span>Sign In</span>
            </button>
          )}
        </nav>
      </div>

      <style>{`
        .appbar {
          display: flex;
          align-items: center;
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 100;
          height: 64px;
          width: 100%;
          flex-shrink: 0;
          box-sizing: border-box;
          transition: background-color 0.2s var(--ease), border-color 0.2s var(--ease);
        }

        .appbar-content {
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 clamp(12px, 2.5vw, 28px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-sizing: border-box;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          cursor: pointer;
          user-select: none;
          flex-shrink: 0;
          border: 0;
          background: transparent;
          text-align: left;
        }

        .logo-desktop.logo-light {
          height: 44px;
          width: auto;
          display: block;
          object-fit: contain;
        }

        .logo-desktop.logo-dark {
          height: 44px;
          width: auto;
          display: none;
          object-fit: contain;
        }

        .logo-mobile-mark {
          display: none;
          width: 32px;
          height: 32px;
          object-fit: contain;
        }

        :root[data-theme='dark'] .logo-desktop.logo-light {
          display: none;
        }

        :root[data-theme='dark'] .logo-desktop.logo-dark {
          display: block;
        }

        .brand-divider {
          width: 2px;
          height: 24px;
          background: var(--border);
          flex: none;
        }

        .brand-title {
          font-family: var(--font-display);
          font-size: 1.22rem;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
          white-space: nowrap;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .nav-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 36px;
          padding: 0 14px;
          border-radius: var(--pill);
          font-family: var(--font-display);
          font-size: 0.84rem;
          font-weight: 500;
          color: var(--text-2);
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s var(--ease);
          white-space: nowrap;
        }

        .nav-pill:hover {
          background: var(--surface-2);
          color: var(--text);
        }

        .nav-pill.active {
          background: var(--accent-soft);
          color: var(--accent);
          font-weight: 700;
          border-color: rgba(66, 133, 244, 0.25);
        }

        .nav-wallet-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .wallet-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 32px;
          padding: 0 10px;
          border-radius: var(--pill);
          font-size: 0.78rem;
          font-weight: 700;
          background: var(--surface-2);
          border: 1px solid var(--border);
        }

        .wallet-chip.standard {
          color: #B26A00;
          border-color: rgba(251, 188, 4, 0.4);
          background: rgba(251, 188, 4, 0.1);
        }

        :root[data-theme='dark'] .wallet-chip.standard {
          color: #FFD54F;
          border-color: rgba(251, 188, 4, 0.3);
          background: rgba(251, 188, 4, 0.12);
        }

        .coin-svg {
          color: var(--g-yellow);
        }

        .wallet-chip.gdg {
          color: var(--accent);
          border-color: rgba(66, 133, 244, 0.35);
          background: var(--accent-soft);
        }

        .inline-gdg-pill-icon {
          width: 12px;
          height: 12px;
          object-fit: contain;
        }

        .coin-count {
          line-height: 1;
        }

        .coin-label {
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .theme-toggle-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: var(--text-2);
          background: var(--surface-2);
          border: 1px solid var(--border);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .theme-toggle-btn:hover {
          color: var(--text);
          background: var(--surface-3);
        }

        .user-profile-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 4px 0 10px;
          height: 36px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--pill);
        }

        .user-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--accent-soft);
          color: var(--accent);
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .user-text-stack {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
        }

        .user-username {
          font-size: 0.76rem;
          font-weight: 700;
          color: var(--text);
          max-width: 90px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .user-displayname {
          font-size: 0.64rem;
          color: var(--text-3);
          max-width: 90px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .signout-icon-btn {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: var(--text-3);
          border: none;
          background: transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .signout-icon-btn:hover {
          color: var(--danger);
          background: var(--danger-soft);
        }

        .nav-signin-btn {
          height: 36px;
          padding: 0 16px;
          font-size: 0.84rem;
          font-weight: 700;
          touch-action: manipulation;
        }

        @media (max-width: 800px), (max-height: 520px) and (pointer: coarse) {
          .logo-desktop {
            display: none !important;
          }
          .logo-mobile-mark {
            display: block !important;
          }
          .brand-divider {
            display: none;
          }
          .user-displayname {
            display: none;
          }
        }

        @media (max-width: 600px), (max-height: 520px) and (pointer: coarse) {
          .appbar {
            height: calc(60px + env(safe-area-inset-top, 0px));
            padding-top: env(safe-area-inset-top, 0px);
          }
          .appbar-content {
            height: 60px;
            padding: 0 8px;
            gap: 6px;
          }
          .brand {
            gap: 6px;
          }
          .logo-mobile-mark {
            width: 24px;
            height: 24px;
          }
          .brand-title {
            font-size: 0.95rem;
          }
          .nav-actions {
            gap: 4px;
            min-width: 0;
          }
          .nav-pill {
            display: none;
          }
          .nav-pill.controls-nav-pill {
            display: inline-flex;
            width: 44px;
            height: 44px;
            min-width: 44px;
            justify-content: center;
            padding: 0;
          }
          .controls-nav-pill .nav-pill-label {
            display: none;
          }
          .theme-toggle-btn {
            width: 44px;
            height: 44px;
            flex: 0 0 44px;
          }
          .nav-signin-btn {
            height: 44px;
            padding: 0 12px;
            font-size: 0.78rem;
          }
          .wallet-chip.standard {
            display: none;
          }
          .wallet-chip.gdg {
            height: 36px;
            padding: 0 8px;
            font-size: 0.72rem;
          }
          .user-profile-pill {
            padding: 0 0 0 8px;
            height: 44px;
          }
          .signout-icon-btn { width: 44px; height: 44px; }
          .user-username {
            max-width: 50px;
          }
        }

        @media (max-width: 480px) {
          .brand-title { display: none; }
          .coin-label { display: none; }
        }

        @media (max-width: 380px) {
          .user-text-stack { display: none; }
          .user-profile-pill { padding-left: 7px; gap: 2px; }
          .coin-label { display: none; }
        }

        @media (pointer: coarse) {
          .nav-pill,
          .theme-toggle-btn,
          .nav-signin-btn,
          .signout-icon-btn { min-height: 44px; }
        }
      `}</style>
    </header>
  );
};
