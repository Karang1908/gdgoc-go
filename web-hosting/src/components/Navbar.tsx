import React from 'react';
import { Trophy, LogOut, User, Gamepad2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentRoute: 'home' | 'leaderboard';
  navigate: (route: 'home' | 'leaderboard') => void;
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, navigate, onOpenAuth }) => {
  const { session, profile, userCoins, userGdgCoins, signOut } = useAuth();

  return (
    <header className="navbar-container">
      <div className="google-strip" />
      <div className="navbar-content">
        {/* Brand */}
        <div
          className="brand-logo"
          onClick={() => navigate('home')}
          role="button"
          tabIndex={0}
          aria-label="Go to Home"
        >
          <div className="logo-icon-badge">
            <span className="logo-car">🏎️</span>
          </div>
          <div className="brand-text">
            <span className="brand-gdg">GDG</span>
            <span className="brand-go">GO</span>
            <span className="brand-tag">CHASE</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="nav-actions">
          <button
            id="nav-play-btn"
            className={`nav-link-btn ${currentRoute === 'home' ? 'active' : ''}`}
            onClick={() => navigate('home')}
          >
            <Gamepad2 size={18} />
            <span>Play</span>
          </button>

          <button
            id="nav-leaderboard-btn"
            className={`nav-link-btn ${currentRoute === 'leaderboard' ? 'active' : ''}`}
            onClick={() => navigate('leaderboard')}
          >
            <Trophy size={18} />
            <span>Leaderboard</span>
          </button>

          {/* Cumulative Coins & GDG Coins Wallet Badges */}
          {session && (
            <div className="nav-wallet-group animate-fade-in">
              <div className="coin-badge standard-coin" title={`Cumulative Standard Coins: ${userCoins.toLocaleString()}`}>
                <span className="coin-icon">🟡</span>
                <span className="coin-count font-mono">{userCoins.toLocaleString()}</span>
              </div>

              <div className="coin-badge gdg-coin" title={`Cumulative GDG Coins: ${userGdgCoins.toLocaleString()}`}>
                <img src="/branding/gdg-pill.png" alt="GDG Coin" className="inline-gdg-pill-icon" />
                <span className="coin-count font-mono">{userGdgCoins.toLocaleString()}</span>
                <span className="coin-tag">GDG</span>
              </div>
            </div>
          )}

          {/* Auth Button / Profile Badge */}
          {session && profile ? (
            <div className="user-profile-badge">
              <div className="user-avatar">
                <User size={16} />
              </div>
              <div className="user-identity-stack">
                <span className="user-username font-mono" title={`@${profile.username}`}>
                  @{profile.username}
                </span>
                <span className="user-realname" title={profile.display_name}>
                  {profile.display_name}
                </span>
              </div>
              <button
                id="nav-signout-btn"
                className="signout-btn"
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
              className="btn btn-primary"
              onClick={onOpenAuth}
            >
              <User size={16} />
              <span>Sign In</span>
            </button>
          )}
        </nav>
      </div>

      <style>{`
        .navbar-container {
          background: rgba(18, 23, 34, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-subtle);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .navbar-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          user-select: none;
        }

        .logo-icon-badge {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(66, 133, 244, 0.2), rgba(234, 67, 53, 0.2));
          border: 1px solid rgba(66, 133, 244, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 0 12px rgba(66, 133, 244, 0.25);
        }

        .brand-text {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .brand-gdg {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 700;
          color: #FFFFFF;
          letter-spacing: 0.05em;
        }

        .brand-go {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--google-blue);
          letter-spacing: 0.05em;
        }

        .brand-tag {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--google-yellow);
          background: rgba(251, 188, 5, 0.15);
          border: 1px solid rgba(251, 188, 5, 0.3);
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 6px;
          text-transform: uppercase;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .nav-link-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid transparent;
          font-family: var(--font-sans);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .nav-link-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .nav-link-btn.active {
          color: #FFFFFF;
          background: var(--bg-surface-elevated);
          border-color: var(--border-medium);
        }

        .nav-wallet-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .coin-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
          user-select: none;
          transition: all 0.2s ease;
        }

        .coin-badge.standard-coin {
          background: rgba(251, 188, 5, 0.12);
          border: 1px solid rgba(251, 188, 5, 0.35);
          color: #FFD54F;
        }

        .coin-badge.standard-coin:hover {
          background: rgba(251, 188, 5, 0.2);
          border-color: rgba(251, 188, 5, 0.6);
          box-shadow: 0 0 10px rgba(251, 188, 5, 0.25);
        }

        .coin-badge.gdg-coin {
          background: linear-gradient(135deg, rgba(66, 133, 244, 0.15), rgba(52, 168, 83, 0.15));
          border: 1px solid rgba(66, 133, 244, 0.4);
          color: #64B5F6;
        }

        .coin-badge.gdg-coin:hover {
          border-color: rgba(66, 133, 244, 0.7);
          box-shadow: 0 0 12px rgba(66, 133, 244, 0.3);
        }

        .coin-icon {
          font-size: 14px;
          line-height: 1;
        }

        .inline-gdg-pill-icon {
          width: 16px;
          height: 16px;
          object-fit: contain;
          filter: drop-shadow(0 0 4px rgba(66, 133, 244, 0.5));
        }

        .coin-count {
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .coin-tag {
          font-size: 0.65rem;
          font-weight: 800;
          background: rgba(66, 133, 244, 0.3);
          color: #E3F2FD;
          padding: 1px 4px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }

        .user-profile-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-medium);
          padding: 4px 6px 4px 12px;
          border-radius: 20px;
        }

        .user-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--google-blue);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .user-identity-stack {
          display: flex;
          flex-direction: column;
          max-width: 140px;
          line-height: 1.15;
          text-align: left;
        }

        .user-username {
          font-weight: 800;
          font-size: 0.84rem;
          color: #FFFFFF;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .user-realname {
          font-size: 0.68rem;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .signout-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 6px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .signout-btn:hover {
          color: #FF6B6B;
          background: rgba(234, 67, 53, 0.15);
        }

        @media (max-width: 640px) {
          .navbar-content {
            padding: 10px 16px;
          }
          .brand-tag {
            display: none;
          }
          .user-display-name {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};
