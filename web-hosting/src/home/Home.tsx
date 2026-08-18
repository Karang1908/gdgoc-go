import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Play, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';
import { CarPicker } from './CarPicker';
import { exitFullscreenDisplay, requestFullscreenDisplay } from '../lib/gameDisplay';
import { AppRoute } from '../lib/routes';

const GameView = lazy(() => import('./GameView').then((module) => ({
  default: module.GameView,
})));

interface HomeProps {
  navigate: (route: AppRoute) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
}

export const Home: React.FC<HomeProps> = ({
  navigate,
  isAuthModalOpen,
  setIsAuthModalOpen,
}) => {
  const { session } = useAuth();
  const [selectedCarId, setSelectedCarId] = useState<string>('sports');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const handleStartGame = () => {
    const root = document.getElementById('game-fullscreen-root');
    if (root) {
      // Start this before React updates so mobile browsers retain the launch tap.
      void requestFullscreenDisplay(root);
    }
    document.body.classList.add('game-active');
    setIsPlaying(true);
  };

  const handleBackToGarage = () => {
    void exitFullscreenDisplay();
    document.body.classList.remove('game-active');
    setIsPlaying(false);
  };

  useEffect(() => () => {
    document.body.classList.remove('game-active');
  }, []);

  // Unauthenticated landing page
  if (!session) {
    return (
      <main className="hero-landing-container">
        <div className="hero-split-grid">
          {/* Left Column: Left-aligned typography and CTAs */}
          <div className="hero-text-col">
            <h1 className="hero-title">
              Outrun the police. <br />
              <span className="accent-word">Rule the leaderboard</span>.
            </h1>

            <p className="lede hero-lede">
              Step into the getaway car for an endless high-speed chase. Dodge traffic, collect GDG Coins, preserve your fuel, and climb the live global ranks.
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
                className="btn btn-outlined btn-lg hero-secondary-btn"
                onClick={() => navigate('leaderboard')}
              >
                <Trophy size={18} />
                <span>View Leaderboard</span>
              </button>
            </div>
          </div>

          {/* Right Column: Transparent Logo Graphic */}
          <div className="hero-graphic-col">
            <div className="hero-logo-frame">
              <img
                src="/branding/gdgoc-go-logo.png"
                alt="GDGoC Go!"
                className="hero-brand-logo animate-fade-in"
              />
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
            height: 100%;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px clamp(16px, 4vw, 48px);
            box-sizing: border-box;
            overflow: hidden;
          }

          .hero-split-grid {
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            align-items: center;
            gap: clamp(24px, 5vw, 64px);
            max-width: 1180px;
            width: 100%;
            margin: 0 auto;
          }

          .hero-text-col {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
          }

          .hero-title {
            font-family: var(--font-display);
            font-size: clamp(2.2rem, 4.4vw, 3.75rem);
            font-weight: 700;
            line-height: 1.08;
            letter-spacing: -0.03em;
            color: var(--text);
            margin-bottom: 16px;
            text-wrap: balance;
          }

          .accent-word {
            color: var(--accent);
          }

          .hero-lede {
            font-family: var(--font-body);
            font-size: clamp(0.95rem, 1.4vw, 1.15rem);
            line-height: 1.5;
            color: var(--text-2);
            max-width: 520px;
            margin-bottom: 28px;
          }

          .hero-actions {
            display: flex;
            align-items: center;
            gap: 14px;
            flex-wrap: wrap;
          }

          .hero-cta-btn {
            height: 50px;
            padding: 0 26px;
            font-size: 0.95rem;
            font-weight: 700;
            border-radius: var(--pill);
            touch-action: manipulation;
          }

          .hero-secondary-btn {
            height: 50px;
            padding: 0 22px;
            font-size: 0.95rem;
            font-weight: 700;
            border-radius: var(--pill);
            border: 2px solid var(--border);
            touch-action: manipulation;
          }

          .hero-graphic-col {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .hero-logo-frame {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            max-width: 420px;
          }

          .hero-brand-logo {
            width: 100%;
            max-width: 380px;
            height: auto;
            max-height: clamp(200px, 38vh, 360px);
            object-fit: contain;
            filter: drop-shadow(0 12px 32px rgba(0, 0, 0, 0.25));
            user-select: none;
            pointer-events: none;
          }

          @media (max-width: 820px) {
            .hero-landing-container {
              padding: 12px;
              align-items: center;
              justify-content: center;
              box-sizing: border-box;
              overflow-y: auto;
              overscroll-behavior: contain;
            }
            .hero-split-grid {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 8px;
              text-align: center;
              width: 100%;
              max-width: 340px;
              margin: 0 auto;
            }
            .hero-text-col {
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              width: 100%;
            }
            .hero-title {
              font-size: clamp(1.45rem, 5.8vw, 1.95rem);
              line-height: 1.12;
              margin-bottom: 6px;
              text-align: center;
              width: 100%;
            }
            .hero-lede {
              font-size: 0.8rem;
              line-height: 1.35;
              margin-bottom: 12px;
              max-width: 320px;
              text-align: center;
              width: 100%;
            }
            .hero-actions {
              display: flex;
              flex-direction: row;
              justify-content: center;
              gap: 8px;
              width: 100%;
            }
            .hero-cta-btn, .hero-secondary-btn {
              flex: 1 1 0;
              min-height: 48px;
              padding: 0 8px;
              font-size: 0.78rem;
              font-weight: 700;
              white-space: nowrap;
              min-width: 0;
            }
            .hero-brand-logo {
              max-width: 145px;
              max-height: 115px;
              margin-top: 2px;
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
          <Suspense fallback={<div className="game-module-loading" role="status">Loading chase…</div>}>
            <GameView
              carId={selectedCarId}
              onBackToGarage={handleBackToGarage}
              onViewLeaderboard={() => {
                handleBackToGarage();
                navigate('leaderboard');
              }}
            />
          </Suspense>
        ) : (
          <CarPicker
            selectedCarId={selectedCarId}
            onSelectCar={(id) => setSelectedCarId(id)}
            onStartGame={handleStartGame}
          />
        )}
      </div>

      <style>{`
        .home-main-content {
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        #game-fullscreen-root {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        #game-fullscreen-root.playing {
          position: fixed;
          inset: 0;
          width: 100vw !important;
          height: var(--app-height, 100dvh) !important;
          max-width: none !important;
          max-height: none !important;
          z-index: 9999;
          background: #000000 !important;
          display: flex !important;
          flex-direction: column !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .game-module-loading {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          background: #000000;
          color: #ffffff;
          font-weight: 700;
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
