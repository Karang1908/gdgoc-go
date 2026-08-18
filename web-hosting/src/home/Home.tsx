import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';
import { CarPicker } from './CarPicker';
import { GameView } from './GameView';

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
            width: 40px;
            height: 40px;
            border: 3px solid rgba(66, 133, 244, 0.2);
            border-top-color: var(--google-blue);
            border-radius: 50%;
          }
          .loading-text {
            color: var(--text-muted);
            font-size: 0.85rem;
            letter-spacing: 0.1em;
          }
        `}</style>
      </div>
    );
  }

  // Not signed in -> Prompt Auth Modal
  if (!session) {
    return (
      <main className="hero-unauth-container">
        <div className="hero-glow-effect" />
        <div className="hero-unauth-content">
          <div className="hero-badge">
            <span>GOOGLE DEVELOPER GROUPS</span>
          </div>
          <h1 className="hero-main-title">
            OUTRUN THE POLICE. <br />
            <span className="text-gradient">RULE THE LEADERBOARD.</span>
          </h1>
          <p className="hero-main-desc">
            Jump in the driver's seat for an endless high-speed 3D police chase. Dodge traffic, collect Google-colored energy coins, and climb the live global ranks.
          </p>

          <button
            id="hero-start-driving-btn"
            className="btn btn-primary btn-lg hero-cta-btn"
            onClick={() => setIsAuthModalOpen(true)}
          >
            <span>JOIN THE CHASE</span>
          </button>
        </div>

        {/* Forced Auth Modal for Unauthenticated Users */}
        <AuthModal
          isOpen={isAuthModalOpen || !session}
          onClose={() => setIsAuthModalOpen(false)}
          canDismiss={false}
        />

        <style>{`
          .hero-unauth-container {
            position: relative;
            min-height: 80vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 40px 24px;
            overflow: hidden;
          }

          .hero-glow-effect {
            position: absolute;
            top: 20%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(66, 133, 244, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
            pointer-events: none;
          }

          .hero-unauth-content {
            position: relative;
            max-width: 780px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .hero-badge {
            display: inline-flex;
            padding: 6px 16px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid var(--border-medium);
            border-radius: 20px;
            font-family: var(--font-mono);
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--text-secondary);
            margin-bottom: 24px;
            letter-spacing: 0.08em;
          }

          .hero-main-title {
            font-size: 3.4rem;
            line-height: 1.15;
            margin-bottom: 20px;
            color: #FFFFFF;
          }

          .text-gradient {
            background: linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC05 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .hero-main-desc {
            font-size: 1.15rem;
            color: var(--text-secondary);
            line-height: 1.6;
            margin-bottom: 36px;
            max-width: 640px;
          }

          .hero-cta-btn {
            padding: 16px 40px;
            font-size: 1.15rem;
            font-weight: 700;
          }

          @media (max-width: 640px) {
            .hero-main-title {
              font-size: 2.2rem;
            }
            .hero-main-desc {
              font-size: 1rem;
            }
          }
        `}</style>
      </main>
    );
  }

  // Signed in -> Show Game View only when playing, or Car Picker in garage
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

        #game-fullscreen-root:fullscreen,
        #game-fullscreen-root:-webkit-full-screen {
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #080B12 !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          align-items: center !important;
        }

        #game-fullscreen-root:fullscreen .game-view-container,
        #game-fullscreen-root:-webkit-full-screen .game-view-container {
          max-width: 100vw !important;
          width: 100vw !important;
          height: 100vh !important;
          margin: 0 !important;
          padding: 0 !important;
          gap: 0 !important;
        }

        #game-fullscreen-root:fullscreen .game-top-bar,
        #game-fullscreen-root:-webkit-full-screen .game-top-bar {
          display: none !important;
        }

        #game-fullscreen-root:fullscreen .game-canvas-wrapper,
        #game-fullscreen-root:-webkit-full-screen .game-canvas-wrapper {
          width: 100vw !important;
          height: 100vh !important;
          border-radius: 0 !important;
        }

        #game-fullscreen-root:fullscreen .unity-embed-container,
        #game-fullscreen-root:-webkit-full-screen .unity-embed-container {
          width: 100vw !important;
          height: 100vh !important;
          max-height: none !important;
          aspect-ratio: auto !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        #game-fullscreen-root:fullscreen .unity-iframe,
        #game-fullscreen-root:-webkit-full-screen .unity-iframe {
          width: 100vw !important;
          height: 100vh !important;
        }
      `}</style>
    </main>
  );
};
