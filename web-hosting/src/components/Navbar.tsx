import React from 'react';
import { Trophy, LogOut, User, Gamepad2, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  currentRoute: 'home' | 'leaderboard';
  navigate: (route: 'home' | 'leaderboard') => void;
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, navigate, onOpenAuth }) => {
  const { session, profile, userCoins, userGdgCoins, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="appbar">
      <div className="appbar-content">
        {/* Left: Official Brand Lockup */}
        <div
          className="brand"
          onClick={() => navigate('home')}
          role="button"
          tabIndex={0}
          aria-label="GDG Go Home"
        >
          <img
            className="logo-light"
            src="/assets/gdg-logo-light.png"
            alt="Google Developer Groups"
          />
          <img
            className="logo-dark"
            src="/assets/gdg-logo-dark.png"
            alt="Google Developer Groups"
          />
          <div className="brand-divider" />
          <div className="brand-context">
            <span className="brand-title">GDG GO</span>
            <span className="brand-sub">BITS Pilani Dubai Campus</span>
          </div>
        </div>

        {/* Center/Nav: Pill Navigation */}
        <nav className="nav-actions">
          <button
            id="nav-play-btn"
            className={`nav-pill ${currentRoute === 'home' ? 'active' : ''}`}
            onClick={() => navigate('home')}
          >
            <Gamepad2 size={18} />
            <span>Play</span>
          </button>

          <button
            id="nav-leaderboard-btn"
            className={`nav-pill ${currentRoute === 'leaderboard' ? 'active' : ''}`}
            onClick={() => navigate('leaderboard')}
          >
            <Trophy size={18} />
            <span>Leaderboard</span>
          </button>

          {/* Cumulative Wallet Chips */}
          {session && (
            <div className="nav-wallet-group">
              <div
                className="wallet-chip standard"
                title={`Cumulative Standard Coins: ${userCoins.toLocaleString()}`}
              >
                <span className="coin-icon">🟡</span>
                <span className="coin-count font-mono">{userCoins.toLocaleString()}</span>
              </div>

              <div
                className="wallet-chip gdg"
                title={`Cumulative GDG Coins: ${userGdgCoins.toLocaleString()}`}
              >
                <img src="/branding/gdg-pill.png" alt="GDG Coin" className="inline-gdg-pill-icon" />
                <span className="coin-count font-mono">{userGdgCoins.toLocaleString()}</span>
                <span className="coin-label">GDG</span>
              </div>
            </div>
          )}

          {/* Right Actions: Theme Toggle & Profile / Sign In */}
          <button
            className="icon-btn theme-toggle-btn"
            id="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {session && profile ? (
            <div className="user-profile-pill">
              <div className="user-avatar">
                <User size={15} />
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
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              id="nav-signin-btn"
              className="btn btn-filled btn-sm"
              onClick={onOpenAuth}
            >
              <User size={16} />
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
          border-bottom: 2px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 100;
          transition: background-color 0.2s var(--ease), border-color 0.2s var(--ease);
        }

        .appbar-content {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
          padding: 12px clamp(16px, 3vw, 32px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          user-select: none;
        }

        .brand img {
          height: 38px;
          width: auto;
          display: block;
        }

        .brand .logo-dark {
          display: none;
        }

        :root[data-theme='dark'] .brand .logo-light {
          display: none;
        }

        :root[data-theme='dark'] .brand .logo-dark {
          display: block;
        }

        .brand-divider {
          width: 2px;
          height: 24px;
          background: var(--border);
          flex: none;
        }

        .brand-context {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }

        .brand-title {
          font-family: var(--font-display);
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
          letter-spacing: 0.02em;
        }

        .brand-sub {
          font-size: 0.72rem;
          color: var(--text-2);
          font-weight: 500;
          white-space: nowrap;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 40px;
          padding: 0 16px;
          border-radius: var(--pill);
          font-family: var(--font-display);
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-2);
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s var(--ease);
        }

        .nav-pill:hover {
          background: var(--surface-3);
          color: var(--text);
        }

        .nav-pill.active {
          background: var(--accent-soft);
          color: var(--accent);
          font-weight: 700;
        }

        .nav-wallet-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .wallet-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 34px;
          padding: 0 12px;
          border-radius: var(--pill);
          font-size: 0.84rem;
          font-weight: 700;
          background: var(--surface-2);
          border: 1px solid var(--border);
          user-select: none;
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

        .wallet-chip.gdg {
          color: var(--accent);
          border-color: rgba(66, 133, 244, 0.35);
          background: var(--accent-soft);
        }

        .coin-icon {
          font-size: 13px;
        }

        .inline-gdg-pill-icon {
          width: 15px;
          height: 15px;
          object-fit: contain;
        }

        .coin-label {
          font-size: 0.65rem;
          font-weight: 800;
          opacity: 0.85;
          letter-spacing: 0.05em;
        }

        .theme-toggle-btn {
          color: var(--text-2);
        }

        .theme-toggle-btn:hover {
          color: var(--text);
          background: var(--surface-3);
        }

        .user-profile-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 40px;
          padding: 0 8px 0 12px;
          border-radius: var(--pill);
          background: var(--surface-2);
          border: 1px solid var(--border);
        }

        .user-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--accent);
          color: var(--on-accent);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-text-stack {
          display: flex;
          flex-direction: column;
          line-height: 1.1;
          max-width: 120px;
        }

        .user-username {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .user-displayname {
          font-size: 0.68rem;
          color: var(--text-3);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .signout-icon-btn {
          width: 28px;
          height: 28px;
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

        @media (max-width: 860px) {
          .brand-divider,
          .brand-sub {
            display: none;
          }
          .brand img {
            height: 32px;
          }
          .user-displayname {
            display: none;
          }
        }

        @media (max-width: 600px) {
          .appbar-content {
            padding: 10px 14px;
          }
          .brand-title {
            display: none;
          }
          .nav-pill span {
            display: none;
          }
          .wallet-chip.standard {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};
