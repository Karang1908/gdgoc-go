import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { UnityEmbed } from '../components/UnityEmbed';
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

  const selectedCar = CARS.find((c) => c.id === carId) || CARS[0];

  // Start background music on mount / user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      bgmEngine.start();
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
    };

    bgmEngine.start();
    window.addEventListener('keydown', handleFirstInteraction);
    window.addEventListener('click', handleFirstInteraction);

    return () => {
      bgmEngine.stop();
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
    };
  }, []);

  const hasSubmittedRef = React.useRef<boolean>(false);

  const processGameOver = useCallback(
    async (data: any) => {
      if (hasSubmittedRef.current) {
        console.log('[GameView] Duplicate gameover event ignored.');
        return;
      }
      hasSubmittedRef.current = true;

      console.log('[GameView] Processing verified gameover event from Unity:', data);
      bgmEngine.stop();

      const payload: GameOverPayload = {
        type: 'gameover',
        score: Number(data.score) || 0,
        coins: Number(data.coins) || 0,
        pills: Number(data.pills) || 0,
        distance: Number(data.distance) || 0,
        duration: Number(data.duration) || 0,
      };

      try {
        await submitScore(payload);
        console.log('[GameView] Score successfully submitted and saved in Supabase.');
        await refreshCoins();
      } catch (err: any) {
        console.error('[GameView] Error auto-submitting score:', err);
      } finally {
        setGameOverPayload(payload);
      }
    },
    [refreshCoins]
  );

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      let data = event.data;
      if (!data) return;

      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      if (typeof data !== 'object' || data.type !== 'gameover') {
        return;
      }

      processGameOver(data);
    },
    [processGameOver]
  );

  useEffect(() => {
    (window as any).onUnityGameOver = (data: any) => {
      processGameOver(data);
    };
    window.addEventListener('message', handleMessage);
    return () => {
      delete (window as any).onUnityGameOver;
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage, processGameOver]);

  const handlePlayAgain = () => {
    hasSubmittedRef.current = false;
    setGameOverPayload(null);
    setRunKey((prev) => prev + 1);
    bgmEngine.start();
  };

  const handleToggleMusic = () => {
    const muted = bgmEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="game-view-container animate-fade-in">
      {/* Unity Canvas Container - 100% Full Viewport */}
      <div className="game-canvas-wrapper">
        <UnityEmbed
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
            onViewLeaderboard={onViewLeaderboard}
            onSignOut={() => signOut()}
          />
        )}
      </div>

      {/* Floating Top HUD Bar */}
      <div className="game-top-bar">
        <button
          id="back-to-garage-btn"
          className="floating-hud-btn back-btn"
          onClick={() => {
            bgmEngine.stop();
            onBackToGarage();
          }}
          title="Back to Car Selection"
        >
          <ArrowLeft size={18} />
          <span>Change Car</span>
        </button>

        <div className="floating-car-pill">
          <span className="car-pill-icon">{selectedCar.icon}</span>
          <span className="car-pill-name">{selectedCar.name}</span>
        </div>

        <div className="top-bar-right-controls">
          <button
            id="toggle-music-btn"
            className="floating-hud-btn music-btn"
            onClick={handleToggleMusic}
            title={isMuted ? 'Unmute Background Music' : 'Mute Background Music'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            <span className="music-toggle-label">{isMuted ? 'Music OFF' : 'Music ON'}</span>
          </button>

          <button
            id="restart-run-btn"
            className="floating-hud-btn restart-btn"
            onClick={handlePlayAgain}
            title="Restart Run"
          >
            <RefreshCw size={16} />
            <span className="restart-label">Restart</span>
          </button>
        </div>
      </div>

      <style>{`
        .game-view-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 999;
          background: #080B12;
          overflow: hidden;
          margin: 0;
          padding: 0;
        }

        .game-canvas-wrapper {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .game-top-bar {
          position: absolute;
          top: 14px;
          left: 16px;
          right: 16px;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: space-between;
          pointer-events: none;
        }

        .game-top-bar > * {
          pointer-events: auto;
        }

        .floating-hud-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(14, 19, 30, 0.82);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 24px;
          font-family: var(--font-body);
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
          transition: all 0.18s ease;
        }

        .floating-hud-btn:hover {
          background: rgba(26, 35, 54, 0.95);
          border-color: var(--google-blue);
          box-shadow: 0 8px 28px rgba(66, 133, 244, 0.35);
          transform: translateY(-1px);
        }

        .floating-hud-btn.back-btn:hover {
          border-color: #FBBC05;
          box-shadow: 0 8px 28px rgba(251, 188, 5, 0.35);
        }

        .floating-car-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(14, 19, 30, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }

        .car-pill-icon {
          font-size: 16px;
        }

        .car-pill-name {
          font-family: var(--font-display);
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.04em;
        }

        .top-bar-right-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .floating-hud-btn.music-btn {
          color: var(--text-secondary);
        }

        .floating-hud-btn.music-btn:hover {
          color: #FFFFFF;
        }

        @media (max-width: 640px) {
          .game-top-bar {
            top: 10px;
            left: 10px;
            right: 10px;
          }
          .floating-car-pill {
            display: none;
          }
          .restart-label, .music-toggle-label {
            display: none;
          }
          .floating-hud-btn {
            padding: 8px 12px;
          }
        }
      `}</style>
    </div>
  );
};
