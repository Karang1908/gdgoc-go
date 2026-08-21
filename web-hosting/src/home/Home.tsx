import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Play, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CarPicker } from './CarPicker';
import { exitFullscreenDisplay, requestFullscreenDisplay } from '../lib/gameDisplay';
import { AppRoute } from '../lib/routes';

const GameView = lazy(() => import('./GameView').then((module) => ({
  default: module.GameView,
})));

interface HomeProps {
  navigate: (route: AppRoute) => void;
  setIsAuthModalOpen: (open: boolean) => void;
}

export const Home: React.FC<HomeProps> = ({
  navigate,
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
                alt="GDGoC Go! — Build. Connect. Race."
                className="hero-brand-logo animate-fade-in"
              />
            </div>
          </div>
        </div>

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
            grid-template-columns: 1fr 1fr;
            align-items: center;
            gap: clamp(20px, 3vw, 56px);
            max-width: 1240px;
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
            letter-spacing: -0.032em;
            color: var(--text);
            margin-bottom: 20px;
            text-wrap: balance;
          }

          .accent-word {
            color: var(--accent);
          }

          .hero-lede {
            font-family: var(--font-body);
            font-size: clamp(0.95rem, 1.4vw, 1.125rem);
            line-height: 1.6;
            color: var(--text-2);
            max-width: 52ch;
            margin-bottom: 32px;
          }

          .hero-actions {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }

          /* Google keeps its primary action at medium weight; bolding a pill
             button is a non-Google tell. */
          .hero-cta-btn {
            height: 48px;
            padding: 0 28px;
            font-size: 0.9375rem;
            font-weight: 500;
            border-radius: var(--pill);
            touch-action: manipulation;
          }

          .hero-secondary-btn {
            height: 48px;
            padding: 0 24px;
            font-size: 0.9375rem;
            font-weight: 500;
            border-radius: var(--pill);
            border: 1px solid var(--border);
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
            max-width: 560px;
          }

          .hero-brand-logo {
            width: 100%;
            max-width: 520px;
            height: auto;
            max-height: clamp(280px, 46vh, 420px);
            object-fit: contain;
            filter: drop-shadow(0 8px 24px rgba(60, 64, 67, 0.18));
            user-select: none;
            pointer-events: none;
          }

          :root[data-theme='dark'] .hero-brand-logo {
            filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.5));
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
              margin-bottom: 8px;
              text-align: center;
              width: 100%;
            }
            .hero-lede {
              font-size: 0.8125rem;
              line-height: 1.45;
              margin-bottom: 14px;
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
              font-size: 0.8125rem;
              font-weight: 500;
              white-space: nowrap;
              min-width: 0;
            }
            .hero-brand-logo {
              width: clamp(230px, 70vw, 280px);
              max-width: 100%;
              max-height: 190px;
              margin-top: 6px;
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
