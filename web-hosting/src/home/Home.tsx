import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';
import { CarPicker } from './CarPicker';
import { GameView } from './GameView';
import { Play, Trophy } from 'lucide-react';

interface HomeProps {
  navigate: (route: 'home' | 'leaderboard') => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
}

export const Home: React.FC<HomeProps> = ({
  navigate,
  isAuthModalOpen,
  setIsAuthModalOpen,
}) => {
  const { session, loading } = useAuth();
  const [selectedCarId, setSelectedCarId] = useState<string>('sports');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const handleStartGame = () => {
    // 1. Immediately request fullscreen on game-fullscreen-root in the synchronous user click event
    const root = document.getElementById('game-fullscreen-root');
    if (root) {
      if (root.requestFullscreen) {
        root.requestFullscreen().catch((err) => {
          console.warn('[Home] Fullscreen request warning:', err);
        });
      } else if ((root as any).webkitRequestFullscreen) {
        (root as any).webkitRequestFullscreen();
      }
    }
    // 2. Launch game
    setIsPlaying(true);
  };

  const handleBackToGarage = () => {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
    setIsPlaying(false);
  };

  if (loading) {
    return (
      <div className="home-loading">
        <div className="loading-spinner animate-spin" />
        <span className="loading-text font-mono">INITIALIZING TELEMETRY...</span>
        <style>{`
          .home-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            gap: 16px;
          }
          .loading-spinner {
            width: 44px;
            height: 44px;
            border: 3px solid var(--border);
            border-top-color: var(--accent);
            border-radius: 50%;
          }
          .loading-text {
            color: var(--text-3);
            font-size: 0.85rem;
            letter-spacing: 0.08em;
          }
        `}</style>
      </div>
    );
  }

  // Unauthenticated landing page
  if (!session) {
    return (
      <main className="hero-landing-container">
        <div className="hero-content">
          <div className="hero-badge">
            <span>Google Developer Groups on Campus</span>
          </div>

          <h1 className="hero-title">
            Outrun the police. <br />
            <span className="accent-word">Rule the leaderboard</span>.
          </h1>

          <p className="lede hero-lede">
            Step into the getaway car for an endless high-speed 3D chase. Dodge traffic, collect Google-colored energy tokens, preserve your fuel, and climb the live global ranks.
          </p>

          <div className="hero-actions">
            <button
              id="hero-start-driving-btn"
              className="btn btn-filled btn-lg hero-cta-btn"
              onClick={() => setIsAuthModalOpen(true)}
            >
              <Play size={20} fill="currentColor" />
              <span>Join the Chase</span>
            </button>

            <button
              id="hero-leaderboard-btn"
              className="btn btn-outlined btn-lg"
              onClick={() => navigate('leaderboard')}
            >
              <Trophy size={18} />
              <span>View Leaderboard</span>
            </button>
          </div>

          {/* 3 Value Pillars */}
          <div className="hero-pillars">
            <div className="pillar-card card">
              <div className="pillar-dot" style={{ background: 'var(--g-blue)' }} />
              <h3>Dynamic Pursuit</h3>
              <p>Police cruiser gap dynamically shrinks if you slow down or crash. Stay at cruising speed to survive.</p>
            </div>

            <div className="pillar-card card">
              <div className="pillar-dot" style={{ background: 'var(--g-yellow)' }} />
              <h3>Distance Fuel</h3>
              <p>Fuel range is tied to distance traveled. Refuel by grabbing energy canisters along the highway.</p>
            </div>

            <div className="pillar-card card">
              <div className="pillar-dot" style={{ background: 'var(--g-green)' }} />
              <h3>Global Ranks</h3>
              <p>Compete on a live deduplicated leaderboard with anti-cheat telemetry and cumulative coin wallets.</p>
            </div>
          </div>
        </div>

        {/* Auth Modal for Sign In / Sign Up */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          canDismiss={true}
        />

        <style>{`
          .hero-landing-container {
            position: relative;
            min-height: calc(100dvh - 68px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px clamp(12px, 3vw, 24px) 16px;
            box-sizing: border-box;
          }

          .hero-content {
            position: relative;
            max-width: 920px;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 14px;
            background: var(--surface-3);
            border: 1px solid var(--border);
            border-radius: var(--pill);
            font-family: var(--font-display);
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--text-2);
            margin-bottom: 12px;
            letter-spacing: 0.03em;
          }

          .hero-title {
            font-size: clamp(1.6rem, 3.5vw, 2.6rem);
            line-height: 1.15;
            margin-bottom: 10px;
          }

          .accent-word {
            color: var(--accent);
          }

          .hero-lede {
            font-size: clamp(0.82rem, 1.8vw, 0.95rem);
            line-height: 1.4;
            max-width: 600px;
            margin-bottom: 18px;
          }

          .hero-actions {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 24px;
          }

          .hero-cta-btn {
            height: 46px;
            padding: 0 22px;
            font-size: 0.9rem;
          }

          .hero-pillars {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            width: 100%;
            text-align: left;
          }

          .pillar-card {
            padding: 14px 16px;
            border-radius: var(--r-md);
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .pillar-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-bottom: 2px;
          }

          .pillar-card h3 {
            font-size: 0.95rem;
            font-weight: 700;
          }

          .pillar-card p {
            font-size: 0.78rem;
            color: var(--text-2);
            line-height: 1.35;
          }

          @media (max-width: 768px) {
            .hero-landing-container {
              min-height: calc(100dvh - 60px);
              padding: 8px 10px 14px;
            }
            .hero-pillars {
              grid-template-columns: 1fr;
              gap: 8px;
            }
            .pillar-card {
              padding: 10px 12px;
              gap: 4px;
            }
          }
        `}</style>
      </main>
    );
  }

  // Authenticated state
  return (
    <main className="home-main-content">
      <div id="game-fullscreen-root" className={isPlaying ? 'playing' : 'idle'}>
        {isPlaying ? (
          <GameView
            carId={selectedCarId}
            onBackToGarage={handleBackToGarage}
            onViewLeaderboard={() => {
              handleBackToGarage();
              navigate('leaderboard');
            }}
          />
        ) : (
          <CarPicker
            selectedCarId={selectedCarId}
            onSelectCar={(id) => setSelectedCarId(id)}
            onStartGame={handleStartGame}
          />
        )}
      </div>

      <style>{`
        #game-fullscreen-root {
          width: 100%;
        }

        #game-fullscreen-root.playing {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw !important;
          height: 100dvh !important;
          z-index: 9999;
          background: #000000 !important;
          display: flex !important;
          flex-direction: column !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        #game-fullscreen-root:fullscreen,
        #game-fullscreen-root:-webkit-full-screen {
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #000000 !important;
        }
      `}</style>
    </main>
  );
};
