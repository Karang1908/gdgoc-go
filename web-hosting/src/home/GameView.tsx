import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RefreshCw, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { UnityEmbed, UnityEmbedHandle } from '../components/UnityEmbed';
import { ResultOverlay } from './ResultOverlay';
import { GameOverPayload, submitScore } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { CARS } from '../data/cars';
import { bgmEngine } from '../lib/bgm';

interface GameViewProps {
  carId: string;
  onBackToGarage: () => void;
  onViewLeaderboard: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  carId,
  onBackToGarage,
  onViewLeaderboard,
}) => {
  const { session, profile, signOut, refreshCoins } = useAuth();
  const [runKey, setRunKey] = useState<number>(1);
  const [gameOverPayload, setGameOverPayload] = useState<GameOverPayload | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(bgmEngine.getMuted());
  const unityEmbedRef = useRef<UnityEmbedHandle>(null);

  const selectedCar = CARS.find((c) => c.id === carId) || CARS[0];

  const handleFullscreen = useCallback(() => {
    const root = document.getElementById('game-fullscreen-root') || document.documentElement;
    if (root) {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (root.requestFullscreen) {
          root.requestFullscreen().catch(() => {});
        } else if ((root as any).webkitRequestFullscreen) {
          (root as any).webkitRequestFullscreen();
        }
      }
    }
  }, []);

  const handleExitFullscreen = useCallback(() => {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  }, []);

  // Start background music on mount / user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      bgmEngine.start();
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    bgmEngine.start();
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });

    return () => {
      bgmEngine.stop();
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // Handle postMessage events sent from Unity WebGL inside iframe
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'gameStart') {
        setGameOverPayload(null);
      }

      if (data.type === 'gameOver') {
        const payload: GameOverPayload = {
          type: 'gameover',
          score: Number(data.score) || 0,
          coins: Number(data.coins) || 0,
          distance: Number(data.distance) || 0,
          duration: Number(data.duration) || 0,
          reason: data.reason || 'police',
        };

        setGameOverPayload(payload);
        bgmEngine.stop();

        // Submit score to Supabase
        try {
          await submitScore(payload);
          await refreshCoins();
        } catch (err) {
          console.error('[GameView] Failed to submit score:', err);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [carId, refreshCoins]);

  const handlePlayAgain = () => {
    setGameOverPayload(null);
    setRunKey((prev) => prev + 1);
    bgmEngine.start();
    handleFullscreen();
  };

  const handleToggleMusic = () => {
    const muted = bgmEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="game-view-container animate-fade-in">
      {/* Top HUD Bar */}
      <div className="game-top-bar">
        <div className="top-bar-left">
          <button
            id="back-to-garage-btn"
            className="btn btn-secondary back-btn"
            onClick={() => {
              bgmEngine.stop();
              handleExitFullscreen();
              onBackToGarage();
            }}
            title="Back to Car Selection"
          >
            <ArrowLeft size={16} />
            <span>Change Car</span>
          </button>

          <div className="active-car-pill">
            <img src={selectedCar.image} alt="" className="car-pill-img" />
            <span className="car-pill-name">{selectedCar.name}</span>
          </div>
        </div>

        <div className="top-bar-right-controls">
          <button
            id="fullscreen-hud-btn"
            className="btn btn-tonal fullscreen-hud-btn"
            onClick={handleFullscreen}
            title="Full Screen Mode"
          >
            <Maximize2 size={16} />
            <span className="fullscreen-label">Full Screen</span>
          </button>

          <button
            id="toggle-music-btn"
            className="btn btn-secondary music-toggle-btn"
            onClick={handleToggleMusic}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span className="music-toggle-label">{isMuted ? 'Music OFF' : 'Music ON'}</span>
          </button>

          <button
            id="restart-run-btn"
            className="btn btn-secondary restart-btn"
            onClick={handlePlayAgain}
            title="Restart Run"
          >
            <RefreshCw size={16} />
            <span className="restart-label">Restart</span>
          </button>
        </div>
      </div>

      {/* Unity Canvas Container */}
      <div className="game-canvas-wrapper">
        <UnityEmbed
          ref={unityEmbedRef}
          key={runKey}
          token={session?.access_token || ''}
          username={profile?.username || ''}
          displayName={profile?.display_name || ''}
          carId={carId}
        />

        {/* Game Over Result Overlay */}
        {gameOverPayload && (
          <ResultOverlay
            payload={gameOverPayload}
            onPlayAgain={handlePlayAgain}
            onViewLeaderboard={() => {
              handleExitFullscreen();
              onViewLeaderboard();
            }}
            onSignOut={async () => {
              handleExitFullscreen();
              await signOut();
              onBackToGarage();
            }}
          />
        )}
      </div>

      <style>{`
        .game-view-container {
          width: 100vw;
          height: 100dvh;
          max-width: 100vw;
          margin: 0;
          padding: max(8px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: #000000;
          box-sizing: border-box;
          overflow: hidden;
        }

        .game-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 2px 0;
          gap: 8px;
          flex-shrink: 0;
        }

        .top-bar-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .back-btn {
          height: 36px;
          padding: 0 14px;
          font-size: 0.85rem;
          touch-action: manipulation;
        }

        .active-car-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 36px;
          padding: 0 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--pill);
        }

        .car-pill-img {
          width: 28px;
          height: 20px;
          object-fit: contain;
        }

        .car-pill-name {
          font-family: var(--font-display);
          font-size: 0.84rem;
          font-weight: 700;
          color: var(--text);
        }

        .top-bar-right-controls {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .fullscreen-hud-btn,
        .music-toggle-btn,
        .restart-btn {
          height: 36px;
          padding: 0 12px;
          font-size: 0.84rem;
          touch-action: manipulation;
        }

        .game-canvas-wrapper {
          flex: 1;
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 0;
          border-radius: var(--r-md);
          overflow: hidden;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-2);
          background: #000000;
        }

        @media (max-width: 640px) {
          .game-view-container {
            padding: max(6px, env(safe-area-inset-top)) max(6px, env(safe-area-inset-right)) max(6px, env(safe-area-inset-bottom)) max(6px, env(safe-area-inset-left));
            gap: 6px;
          }
          .back-btn span {
            display: none;
          }
          .fullscreen-label, .restart-label, .music-toggle-label {
            display: none;
          }
          .fullscreen-hud-btn, .music-toggle-btn, .restart-btn, .back-btn {
            padding: 0 8px;
            min-width: 36px;
          }
          .active-car-pill {
            padding: 0 8px;
          }
          .car-pill-name {
            font-size: 0.78rem;
          }
        }
      `}</style>
    </div>
  );
};
