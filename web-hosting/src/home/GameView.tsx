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
        reason: (data.reason === 'fuel' ? 'fuel' : 'police'),
      };

      try {
        await submitScore(payload);
        console.log('[GameView] Score successfully submitted and saved in Supabase.');
        await refreshCoins();
      } catch (err: any) {
        console.error('[GameView] Error auto-submitting score:', err);
      }

      // Wait exactly 2 seconds as requested, then exit fullscreen and display Result Overlay
      setTimeout(() => {
        try {
          handleExitFullscreen();
        } catch (err) {
          console.warn('[GameView] Auto exit fullscreen error:', err);
        }
        setGameOverPayload(payload);
      }, 2000);
    },
    [refreshCoins, handleExitFullscreen]
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
    // Trigger Unity fullscreen for the new run
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

        {/* Fullscreen Recommendation Banner */}
        <div
          className="fullscreen-recommendation-pill"
          onClick={handleFullscreen}
          title="Click to trigger full screen"
          role="button"
          tabIndex={0}
        >
          <Maximize2 size={13} className="sparkle-icon" />
          <span>For the best experience, play in full screen</span>
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
            onSignOut={() => {
              handleExitFullscreen();
              signOut();
            }}
          />
        )}
      </div>

      <style>{`
        .game-view-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 16px clamp(16px, 3vw, 32px) 40px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .game-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 0;
          gap: 10px;
          flex-wrap: wrap;
        }

        .top-bar-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .back-btn {
          height: 38px;
          padding: 0 16px;
          font-size: 0.875rem;
        }

        .active-car-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 38px;
          padding: 0 14px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--pill);
        }

        .car-pill-img {
          width: 32px;
          height: 22px;
          object-fit: contain;
        }

        .car-pill-name {
          font-family: var(--font-display);
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text);
        }

        .fullscreen-recommendation-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 38px;
          padding: 0 16px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--pill);
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--text-2);
          cursor: pointer;
          transition: all 0.15s var(--ease);
          user-select: none;
        }

        .fullscreen-recommendation-pill:hover {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent);
        }

        .sparkle-icon {
          color: var(--g-yellow);
        }

        .top-bar-right-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .fullscreen-hud-btn {
          height: 38px;
          padding: 0 16px;
          font-size: 0.875rem;
        }

        .music-toggle-btn,
        .restart-btn {
          height: 38px;
          padding: 0 14px;
          font-size: 0.875rem;
        }

        .game-canvas-wrapper {
          position: relative;
          width: 100%;
          border-radius: var(--r-xl);
          overflow: hidden;
          border: 2px solid var(--border);
          box-shadow: var(--shadow-2);
          background: #000000;
        }

        .game-view-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px clamp(12px, 3vw, 24px) 40px;
          padding-bottom: max(40px, env(safe-area-inset-bottom, 0px) + 20px);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        @media (max-width: 880px) {
          .fullscreen-recommendation-pill {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .game-view-container {
            padding: 8px 10px 24px;
            gap: 8px;
          }
          .game-top-bar {
            gap: 6px;
          }
          .back-btn span {
            display: none;
          }
          .fullscreen-label, .restart-label, .music-toggle-label {
            display: none;
          }
          .fullscreen-hud-btn, .music-toggle-btn, .restart-btn, .back-btn {
            height: 36px;
            padding: 0 10px;
            min-width: 36px;
          }
          .active-car-pill {
            height: 36px;
            padding: 0 10px;
          }
          .car-pill-name {
            font-size: 0.8rem;
          }
          .game-canvas-wrapper {
            border-radius: var(--r-md);
          }
        }
      `}</style>
    </div>
  );
};
