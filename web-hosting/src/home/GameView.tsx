import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { UnityEmbed } from '../components/UnityEmbed';
import { ResultOverlay } from './ResultOverlay';
import { GameOverPayload, submitScore } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { CARS } from '../data/cars';

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
  const { session, profile, signOut } = useAuth();
  const [runKey, setRunKey] = useState<number>(1);
  const [gameOverPayload, setGameOverPayload] = useState<GameOverPayload | null>(null);

  const selectedCar = CARS.find((c) => c.id === carId) || CARS[0];

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
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

      console.log('[GameView] Received gameover postMessage from Unity:', data);
      const payload: GameOverPayload = {
        type: 'gameover',
        score: Number(data.score) || 0,
        coins: Number(data.coins) || 0,
        distance: Number(data.distance) || 0,
        duration: Number(data.duration) || 0,
      };

      try {
        await submitScore(payload);
        console.log('[GameView] Score successfully submitted and saved in Supabase.');
      } catch (err: any) {
        console.error('[GameView] Error auto-submitting score:', err);
      } finally {
        setGameOverPayload(payload);
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  const handlePlayAgain = () => {
    setGameOverPayload(null);
    setRunKey((prev) => prev + 1);
  };

  return (
    <div className="game-view-container animate-fade-in">
      {/* Top HUD Bar */}
      <div className="game-top-bar">
        <button
          id="back-to-garage-btn"
          className="btn btn-secondary back-btn"
          onClick={onBackToGarage}
        >
          <ArrowLeft size={18} />
          <span>Change Car</span>
        </button>

        <div className="active-car-pill">
          <span className="car-pill-icon">{selectedCar.icon}</span>
          <span className="car-pill-name">{selectedCar.name}</span>
        </div>

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

      {/* Unity Canvas Container */}
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

      <style>{`
        .game-view-container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 16px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .game-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 4px;
        }

        .back-btn {
          padding: 8px 14px;
          font-size: 0.88rem;
        }

        .active-car-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-medium);
          border-radius: 20px;
        }

        .car-pill-icon {
          font-size: 16px;
        }

        .car-pill-name {
          font-family: var(--font-display);
          font-size: 0.92rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .restart-btn {
          padding: 8px 12px;
          font-size: 0.88rem;
        }

        .game-canvas-wrapper {
          position: relative;
          width: 100%;
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        @media (max-width: 640px) {
          .restart-label {
            display: none;
          }
          .game-view-container {
            padding: 10px 10px 30px;
          }
        }
      `}</style>
    </div>
  );
};
