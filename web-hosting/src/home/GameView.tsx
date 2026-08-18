import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RefreshCw, Volume2, VolumeX, Maximize2, Sparkles } from 'lucide-react';
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

  const handleFullscreen = () => {
    unityEmbedRef.current?.triggerFullscreen();
  };

  return (
    <div className="game-view-container animate-fade-in">
      {/* Top HUD Control Bar */}
      <div className="game-top-bar">
        <div className="top-bar-left-group">
          <button
            id="back-to-garage-btn"
            className="btn btn-secondary back-btn"
            onClick={() => {
              bgmEngine.stop();
              onBackToGarage();
            }}
            title="Back to Car Selection"
          >
            <ArrowLeft size={18} />
            <span>Change Car</span>
          </button>

          <div className="active-car-pill">
            <span className="car-pill-icon">{selectedCar.icon}</span>
            <span className="car-pill-name">{selectedCar.name}</span>
          </div>
        </div>

        {/* Fullscreen Recommendation Banner */}
        <div
          className="fullscreen-recommendation-pill"
          onClick={handleFullscreen}
          title="Click to enter Full Screen"
          role="button"
          tabIndex={0}
        >
          <Sparkles size={14} className="sparkle-icon" />
          <span>For the best experience, play in full screen</span>
        </div>

        <div className="top-bar-right-controls">
          <button
            id="unity-fullscreen-btn"
            className="btn btn-primary fullscreen-btn"
            onClick={handleFullscreen}
            title="Enter Full Screen Mode"
          >
            <Maximize2 size={16} />
            <span className="fullscreen-label">Full Screen</span>
          </button>

          <button
            id="toggle-music-btn"
            className="btn btn-secondary music-toggle-btn"
            onClick={handleToggleMusic}
            title={isMuted ? 'Unmute Background Music' : 'Mute Background Music'}
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
            onViewLeaderboard={onViewLeaderboard}
            onSignOut={() => signOut()}
          />
        )}
      </div>

      <style>{`
        .game-view-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 12px 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .game-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 2px;
          gap: 12px;
          flex-wrap: wrap;
        }

        .top-bar-left-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .back-btn {
          padding: 8px 16px;
          font-size: 0.88rem;
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          transition: all 0.18s ease;
        }

        .back-btn:hover {
          border-color: #FBBC05;
          box-shadow: 0 4px 16px rgba(251, 188, 5, 0.25);
          transform: translateY(-1px);
        }

        .active-car-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-medium);
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .car-pill-icon {
          font-size: 16px;
        }

        .car-pill-name {
          font-family: var(--font-display);
          font-size: 0.90rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.04em;
        }

        .fullscreen-recommendation-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(52, 168, 83, 0.12) 100%);
          border: 1px solid rgba(66, 133, 244, 0.3);
          border-radius: 20px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #90CAF9;
          cursor: pointer;
          transition: all 0.18s ease;
          user-select: none;
        }

        .fullscreen-recommendation-pill:hover {
          background: linear-gradient(135deg, rgba(66, 133, 244, 0.22) 0%, rgba(52, 168, 83, 0.22) 100%);
          border-color: var(--google-blue);
          color: #FFFFFF;
          box-shadow: 0 4px 16px rgba(66, 133, 244, 0.25);
          transform: scale(1.02);
        }

        .sparkle-icon {
          color: var(--google-yellow);
          animation: pulse 2s infinite;
        }

        .top-bar-right-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .fullscreen-btn {
          padding: 8px 16px;
          font-size: 0.88rem;
          font-weight: 700;
          background: linear-gradient(135deg, #4285F4, #3367D6);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 14px rgba(66, 133, 244, 0.35);
        }

        .fullscreen-btn:hover {
          box-shadow: 0 6px 20px rgba(66, 133, 244, 0.5);
          transform: translateY(-1px);
        }

        .music-toggle-btn {
          padding: 8px 14px;
          font-size: 0.88rem;
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
        }

        .music-toggle-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.12);
        }

        .restart-btn {
          padding: 8px 14px;
          font-size: 0.88rem;
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-md);
          color: var(--text-primary);
        }

        .restart-btn:hover {
          border-color: var(--google-blue);
          box-shadow: 0 4px 16px rgba(66, 133, 244, 0.25);
          transform: translateY(-1px);
        }

        .game-canvas-wrapper {
          position: relative;
          width: 100%;
          min-height: 520px;
          height: calc(100vh - 180px);
          max-height: 840px;
          border-radius: var(--radius-xl);
          overflow: hidden;
          background: #080B12;
          border: 1px solid var(--border-medium);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08);
        }

        @media (max-width: 900px) {
          .fullscreen-recommendation-pill {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .game-view-container {
            padding: 8px 8px 20px;
          }
          .game-canvas-wrapper {
            min-height: 380px;
            height: calc(100vh - 160px);
            border-radius: var(--radius-lg);
          }
          .active-car-pill {
            display: none;
          }
          .fullscreen-label, .restart-label, .music-toggle-label {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};
