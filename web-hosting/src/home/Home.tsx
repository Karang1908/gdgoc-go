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
    // 1. Immediately request fullscreen on the game iframe in the synchronous user click event
    const iframe = document.querySelector('.unity-iframe') as HTMLIFrameElement;
    if (iframe) {
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen().catch((err) => {
          console.warn('[Home] Fullscreen request warning:', err);
        });
      } else if ((iframe as any).webkitRequestFullscreen) {
        (iframe as any).webkitRequestFullscreen();
      }
    }
    // 2. Set active game state
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

  // Signed in -> Render both CarPicker and GameView cleanly so GameView iframe is ready for click-based fullscreen
  return (
    <main className="home-main-content">
      {!isPlaying && (
        <CarPicker
          selectedCarId={selectedCarId}
          onSelectCar={(id) => setSelectedCarId(id)}
          onStartGame={handleStartGame}
        />
      )}

      <div
        style={{
          visibility: isPlaying ? 'visible' : 'hidden',
          pointerEvents: isPlaying ? 'auto' : 'none',
          position: isPlaying ? 'relative' : 'fixed',
          top: isPlaying ? 'auto' : '-9999px',
          left: 0,
          width: '100%',
        }}
      >
        <GameView
          carId={selectedCarId}
          onBackToGarage={handleBackToGarage}
          onViewLeaderboard={() => {
            handleBackToGarage();
            navigate('leaderboard');
          }}
        />
      </div>
    </main>
  );
};
