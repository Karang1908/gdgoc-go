import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Maximize2, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import { UnityEmbed, UnityEmbedHandle } from '../components/UnityEmbed';
import { ResultOverlay } from './ResultOverlay';
import {
  flushQueuedScores,
  GameOverPayload,
  GameRunTicket,
  checkpointGameRun,
  queueScore,
  removeQueuedScore,
  ScoreSubmissionError,
  ScoreSubmissionResult,
  startGameRun,
  submitScore,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { CARS } from '../data/cars';
import { bgmEngine } from '../lib/bgm';
import {
  canFullscreenDisplay,
  isFullscreenDisplay,
  isStandaloneDisplay,
} from '../lib/gameDisplay';

interface GameViewProps {
  carId: string;
  onBackToGarage: () => void;
  onViewLeaderboard: () => void;
}

export type ScoreSaveState = 'idle' | 'saving' | 'saved' | 'queued' | 'error';

export const GameView: React.FC<GameViewProps> = ({
  carId,
  onBackToGarage,
  onViewLeaderboard,
}) => {
  const { session, profile, refreshCoins } = useAuth();
  const [runTicket, setRunTicket] = useState<GameRunTicket | null>(null);
  const [runLoadError, setRunLoadError] = useState<string>('');
  const [isStartingRun, setIsStartingRun] = useState<boolean>(true);
  const [gameOverPayload, setGameOverPayload] = useState<GameOverPayload | null>(null);
  const [saveState, setSaveState] = useState<ScoreSaveState>('idle');
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [submissionResult, setSubmissionResult] = useState<ScoreSubmissionResult | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(bgmEngine.getMuted());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => (
    isStandaloneDisplay() || isFullscreenDisplay()
  ));
  const unityEmbedRef = useRef<UnityEmbedHandle>(null);
  const handledRunRef = useRef<string | null>(null);
  const runTicketRef = useRef<GameRunTicket | null>(null);
  const initialRunRequestedRef = useRef(false);
  const runRequestSequenceRef = useRef(0);
  const checkpointChainRef = useRef<Promise<void>>(Promise.resolve());

  const selectedCar = CARS.find((c) => c.id === carId) || CARS[0];
  const runId = runTicket?.runId || '';

  const beginSecureRun = useCallback(async () => {
    const requestSequence = runRequestSequenceRef.current + 1;
    runRequestSequenceRef.current = requestSequence;
    setIsStartingRun(true);
    setRunLoadError('');
    setRunTicket(null);
    runTicketRef.current = null;
    handledRunRef.current = null;
    checkpointChainRef.current = Promise.resolve();
    setGameOverPayload(null);
    setSaveState('idle');
    setSaveMessage('');
    setSubmissionResult(null);

    try {
      const ticket = await startGameRun(carId);
      if (runRequestSequenceRef.current !== requestSequence) return;
      runTicketRef.current = ticket;
      setRunTicket(ticket);
      bgmEngine.start();
    } catch (error) {
      if (runRequestSequenceRef.current !== requestSequence) return;
      setRunLoadError(error instanceof Error ? error.message : 'A secure ranked run could not be started.');
    } finally {
      if (runRequestSequenceRef.current === requestSequence) setIsStartingRun(false);
    }
  }, [carId]);

  useEffect(() => () => {
    runRequestSequenceRef.current += 1;
  }, []);

  useEffect(() => {
    if (initialRunRequestedRef.current) return;
    initialRunRequestedRef.current = true;
    void beginSecureRun();
  }, [beginSecureRun]);

  const queueCheckpoint = useCallback((payload: GameOverPayload): Promise<void> => {
    const ticket = runTicketRef.current;
    if (!ticket) return Promise.reject(new Error('The secure run ticket is missing.'));

    const next = checkpointChainRef.current
      .catch(() => {})
      .then(() => checkpointGameRun(payload, ticket.runSecret));
    checkpointChainRef.current = next;
    return next;
  }, []);

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsFullscreen(isStandaloneDisplay() || isFullscreenDisplay());
    };

    document.body.classList.add('game-active');
    document.addEventListener('fullscreenchange', updateFullscreenState);
    document.addEventListener('webkitfullscreenchange', updateFullscreenState as EventListener);
    updateFullscreenState();

    return () => {
      document.body.classList.remove('game-active');
      document.removeEventListener('fullscreenchange', updateFullscreenState);
      document.removeEventListener('webkitfullscreenchange', updateFullscreenState as EventListener);
    };
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

  // Retry scores that were banked locally during a connection interruption.
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    let cancelled = false;
    const flush = async () => {
      const saved = await flushQueuedScores(userId);
      if (cancelled || saved.size === 0) return;
      const currentResult = saved.get(runId);
      if (currentResult) {
        setSubmissionResult(currentResult);
        setSaveState('saved');
        setSaveMessage(currentResult.status === 'duplicate' ? 'Run already banked.' : 'Run banked.');
      }
      await refreshCoins();
    };

    void flush();
    window.addEventListener('online', flush);
    return () => {
      cancelled = true;
      window.removeEventListener('online', flush);
    };
  }, [refreshCoins, runId, session?.user.id]);

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

      const frameWindow = unityEmbedRef.current?.getContentWindow();
      if (event.origin !== window.location.origin || event.source !== frameWindow) return;

      const type = String(data.type || '').toLowerCase();

      if (type === 'gamestart' || type === 'start') {
        setGameOverPayload(null);
        setSaveState('idle');
        setSaveMessage('');
        setSubmissionResult(null);
      }

      if (type === 'runcheckpoint' || type === 'gameover') {
        if (String(data.run_id || '') !== runId || handledRunRef.current === runId) return;

        const metric = (value: unknown): number | null => {
          const parsed = Number(value);
          return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
        };
        const score = metric(data.score);
        const coins = metric(data.coins);
        const pills = metric(data.pills);
        const coinScore = metric(data.coin_score);
        const bonus = metric(data.bonus);
        const distance = metric(data.distance);
        const duration = metric(data.duration);
        if (score == null || coins == null || pills == null || coinScore == null || bonus == null || distance == null || duration == null) {
          console.warn('[GameView] Rejected invalid game-over telemetry.');
          return;
        }

        const payload: GameOverPayload = {
          type: type === 'gameover' ? 'gameover' : 'runcheckpoint',
          run_id: runId,
          score,
          coins,
          pills,
          coin_score: coinScore,
          bonus,
          distance,
          duration: Math.max(1, duration),
          reason: String(data.reason || 'police'),
        };

        if (type === 'runcheckpoint') {
          void queueCheckpoint(payload).catch((error) => {
            console.warn('[GameView] Ranked-run checkpoint warning:', error);
          });
          return;
        }

        handledRunRef.current = runId;
        setGameOverPayload(payload);
        setSubmissionResult(null);
        bgmEngine.stop();

        const userId = session?.user.id;
        if (!userId) {
          setSaveState('error');
          setSaveMessage('Your session expired. Sign in again to save this run.');
          return;
        }

        const ticket = runTicketRef.current;
        if (!ticket || ticket.runId !== runId) {
          setSaveState('error');
          setSaveMessage('The secure run ticket was lost. This result cannot be ranked.');
          return;
        }

        queueScore(userId, ticket.runSecret, payload);
        setSaveState('saving');
        setSaveMessage('Banking run…');
        try {
          await checkpointChainRef.current.catch(() => {});
          const result = await submitScore(payload, ticket.runSecret);
          removeQueuedScore(userId, runId);
          setSubmissionResult(result);
          setSaveState('saved');
          setSaveMessage(result.status === 'duplicate' ? 'Run already banked.' : 'Run banked.');
          await refreshCoins();
        } catch (err) {
          console.error('[GameView] Failed to submit score:', err);
          if (err instanceof ScoreSubmissionError && !err.retryable) {
            removeQueuedScore(userId, runId);
            setSaveState('error');
          } else {
            setSaveState('queued');
          }
          setSaveMessage(err instanceof Error ? err.message : 'Run saved on this device and will retry online.');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [queueCheckpoint, refreshCoins, runId, session?.user.id]);

  const handlePlayAgain = () => {
    void beginSecureRun();
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
          {!isFullscreen && canFullscreenDisplay() && (
            <button
              id="enter-fullscreen-btn"
              className="floating-hud-btn"
              onClick={() => {
                navigator.vibrate?.(10);
                unityEmbedRef.current?.triggerFullscreen();
              }}
              title="Enter Full Screen"
              aria-label="Enter Full Screen"
            >
              <Maximize2 size={16} />
            </button>
          )}

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
            disabled={isStartingRun}
            title="Restart Run"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* 100% Full-bleed Unity Canvas Container */}
      <div className="game-canvas-wrapper">
        {runTicket ? (
          <UnityEmbed
            ref={unityEmbedRef}
            key={runTicket.runId}
            runId={runTicket.runId}
            username={profile?.username || ''}
            displayName={profile?.display_name || ''}
            carId={carId}
          />
        ) : (
          <div className="secure-run-loader" role="status">
            <div className="secure-run-loader-card">
              <img src="/assets/gdg-mark.png" alt="" />
              <strong>{isStartingRun ? 'Securing ranked run…' : 'Ranked run unavailable'}</strong>
              <span>{runLoadError || 'Requesting a single-use run ticket from the score server.'}</span>
              {!isStartingRun && (
                <button type="button" className="floating-hud-btn" onClick={() => void beginSecureRun()}>
                  Try again
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mobile-control-hint" role="status">
          <span>Swipe to steer</span>
          <span>Up to jump</span>
          <span>Down to brake</span>
          <span>Double-tap to boost</span>
        </div>

        <div className="portrait-game-hint" role="status">Rotate for a wider road view</div>

        {/* Game Over Result Overlay */}
        {gameOverPayload && (
          <ResultOverlay
            payload={gameOverPayload}
            saveState={saveState}
            saveMessage={saveMessage}
            submissionResult={submissionResult}
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
          height: 100vh;
          height: 100dvh;
          height: var(--app-height, 100dvh);
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

        .secure-run-loader {
          position: absolute;
          inset: 0;
          z-index: 12;
          display: grid;
          place-items: center;
          padding: 24px;
          background: #000;
          color: #fff;
        }

        .secure-run-loader-card {
          width: min(360px, 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
          font-family: var(--font-display);
        }

        .secure-run-loader-card img {
          width: 48px;
          height: 48px;
          object-fit: contain;
        }

        .secure-run-loader-card strong { font-size: 1.1rem; }
        .secure-run-loader-card span { color: #9aa0a6; line-height: 1.45; }

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

        .mobile-control-hint,
        .portrait-game-hint {
          display: none;
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

        @media (max-width: 600px), (max-height: 520px) and (pointer: coarse) {
          .floating-game-hud {
            top: max(6px, env(safe-area-inset-top));
            left: max(6px, env(safe-area-inset-left));
            right: max(6px, env(safe-area-inset-right));
          }
          .floating-hud-btn {
            height: 44px;
            padding: 0 12px;
            min-width: 44px;
          }
          .back-garage-btn span {
            display: none;
          }
          .floating-car-indicator {
            display: none;
          }

          .mobile-control-hint {
            position: absolute;
            left: 50%;
            bottom: max(12px, env(safe-area-inset-bottom));
            transform: translateX(-50%);
            z-index: 18;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 5px 10px;
            width: min(340px, calc(100vw - 20px));
            padding: 8px 12px;
            overflow: hidden;
            border-radius: 14px;
            color: #ffffff;
            background: rgba(12, 12, 12, 0.78);
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
            font-size: 0.7rem;
            font-weight: 700;
            line-height: 1.2;
            text-align: center;
            white-space: normal;
            pointer-events: none;
            animation: control-hint-out 6s ease-out forwards;
          }

          .mobile-control-hint span + span::before {
            content: none;
          }
        }

        @media (max-width: 600px) and (orientation: portrait) {
          .portrait-game-hint {
            position: absolute;
            top: max(58px, calc(env(safe-area-inset-top) + 54px));
            left: 50%;
            transform: translateX(-50%);
            z-index: 18;
            display: block;
            padding: 7px 12px;
            border-radius: var(--pill);
            background: rgba(12, 12, 12, 0.74);
            color: #ffffff;
            box-shadow: 0 3px 14px rgba(0, 0, 0, 0.3);
            font-size: 0.72rem;
            font-weight: 700;
            white-space: nowrap;
            pointer-events: none;
          }
        }

        @keyframes control-hint-out {
          0%, 72% { opacity: 1; }
          100% { opacity: 0; visibility: hidden; }
        }

        @media (prefers-reduced-motion: reduce) {
          .mobile-control-hint { animation: none; }
        }
      `}</style>
    </div>
  );
};
