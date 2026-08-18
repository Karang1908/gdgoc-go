import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RefreshCw, Volume2, VolumeX } from 'lucide-react';
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
  const { session, profile, refreshCoins } = useAuth();
  const [runKey, setRunKey] = useState<number>(1);
  const [gameOverPayload, setGameOverPayload] = useState<GameOverPayload | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(bgmEngine.getMuted());
  const unityEmbedRef = useRef<UnityEmbedHandle>(null);

  const selectedCar = CARS.find((c) => c.id === carId) || CARS[0];

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

      const type = String(data.type || '').toLowerCase();

      if (type === 'gamestart' || type === 'start') {
        setGameOverPayload(null);
      }

      if (type === 'gameover') {
        const payload: GameOverPayload = {
          type: 'gameover',
          score: Number(data.score) || 0,
          coins: Number(data.coins) || 0,
          pills: Number(data.pills) || 0,
          distance: Number(data.distance) || 0,
          duration: Number(data.duration) || 0,
          reason: String(data.reason || 'police'),
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
  };

  const handleToggleMusic = () => {
    const muted = bgmEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="game-view-container">
      {/* Floating HUD Controls */}
      <div className="floating-game-hud">
        <div className="floating-hud-left">
          <button
            id="back-to-garage-btn"
            className="floating-hud-btn back-garage-btn"
            onClick={() => {
              bgmEngine.stop();
              handleExitFullscreen();
              onBackToGarage();
            }}
            title="Back to Garage"
          >
            <ArrowLeft size={16} />
            <span>Garage</span>
          </button>

          <div className="floating-car-indicator">
            <img src={selectedCar.image} alt="" className="floating-car-img" />
            <span className="floating-car-name">{selectedCar.name}</span>
          </div>
        </div>

        <div className="floating-hud-right">
          <button
            id="toggle-music-btn"
            className="floating-hud-btn"
            onClick={handleToggleMusic}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <button
            id="restart-run-btn"
            className="floating-hud-btn"
            onClick={handlePlayAgain}
            title="Restart Run"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* 100% Full-bleed Unity Canvas Container */}
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
          />
        )}
      </div>

      <style>{`
        .game-view-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100dvh;
          margin: 0;
          padding: 0;
          background: #000000;
          overflow: hidden;
          z-index: 9999;
        }

        .game-canvas-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #000000;
          overflow: hidden;
        }

        .floating-game-hud {
          position: absolute;
          top: max(10px, env(safe-area-inset-top));
          left: max(10px, env(safe-area-inset-left));
          right: max(10px, env(safe-area-inset-right));
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 20;
          pointer-events: none;
        }

        .floating-hud-left,
        .floating-hud-right {
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: auto;
        }

        .floating-hud-btn {
          height: 38px;
          padding: 0 12px;
          border-radius: var(--pill);
          background: rgba(20, 20, 20, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-family: var(--font-display);
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s var(--ease);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          touch-action: manipulation;
        }

        .floating-hud-btn:hover {
          background: rgba(40, 40, 40, 0.9);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .floating-hud-btn:active {
          transform: scale(0.95);
        }

        .floating-car-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 38px;
          padding: 0 12px;
          border-radius: var(--pill);
          background: rgba(20, 20, 20, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .floating-car-img {
          width: 24px;
          height: 16px;
          object-fit: contain;
        }

        .floating-car-name {
          font-family: var(--font-display);
          font-size: 0.8rem;
          font-weight: 700;
          color: #ffffff;
        }

        @media (max-width: 600px) {
          .floating-game-hud {
            top: max(6px, env(safe-area-inset-top));
            left: max(6px, env(safe-area-inset-left));
            right: max(6px, env(safe-area-inset-right));
          }
          .floating-hud-btn {
            height: 34px;
            padding: 0 8px;
            min-width: 34px;
          }
          .back-garage-btn span {
            display: none;
          }
          .floating-car-indicator {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};
