import React, { useEffect } from 'react';
import {
  RotateCcw,
  Trophy,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Fuel,
  Award,
  Clock,
  Coins,
  CircleCheck,
  CloudOff,
  LoaderCircle,
  TriangleAlert,
} from 'lucide-react';
import { GameOverPayload, ScoreSubmissionResult } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { ScoreSaveState } from './GameView';

interface ResultOverlayProps {
  payload: GameOverPayload;
  saveState: ScoreSaveState;
  saveMessage: string;
  submissionResult: ScoreSubmissionResult | null;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
  onBackToGarage: () => void;
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({
  payload,
  saveState,
  saveMessage,
  submissionResult,
  onPlayAgain,
  onViewLeaderboard,
  onBackToGarage,
}) => {
  const { userStats, userCoins, userGdgCoins } = useAuth();
  const isBusted = payload.reason === 'police';
  const isHighscore = submissionResult?.isPersonalBest ?? payload.score > (userStats?.bestScore || 0);

  useEffect(() => {
    if (isHighscore || payload.score >= 1000) {
      void import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4285F4', '#EA4335', '#FBBC04', '#34A853'],
        });
      }).catch(() => {});
    }
  }, [isHighscore, payload.score]);

  const runGdgCoins = Number(payload.pills) || 0;
  const runIsPending = saveState === 'saving' || saveState === 'queued';
  const displayTotalCoins = submissionResult?.totalCoins ?? ((userCoins || 0) + (runIsPending ? payload.coins : 0));
  const displayTotalGdg = submissionResult?.totalGdgCoins ?? ((userGdgCoins || 0) + (runIsPending ? runGdgCoins : 0));
  const saveIcon = saveState === 'saved'
    ? <CircleCheck size={14} />
    : saveState === 'saving'
      ? <LoaderCircle size={14} className="save-spinner" />
      : saveState === 'queued'
        ? <CloudOff size={14} />
        : saveState === 'error'
          ? <TriangleAlert size={14} />
          : <LoaderCircle size={14} className="save-spinner" />;

  return (
    <div className="result-backdrop animate-fade-in">
      <div className="result-card card animate-slide-up">
        {/* Header */}
        <div className="result-header">
          {isHighscore ? (
            <div className="chip record-chip badge-gold">
              <Award size={14} />
              <span>New personal record</span>
            </div>
          ) : (
            <div className={`chip status-chip ${isBusted ? 'police-chip' : 'fuel-chip'}`}>
              {isBusted ? <ShieldAlert size={14} /> : <Fuel size={14} />}
              <span>{isBusted ? 'Busted by police' : 'Fuel exhausted'}</span>
            </div>
          )}

          <h1 className="result-title">Run Complete</h1>
          <p className="result-subtitle">
            {isBusted
              ? 'The police cruiser intercepted your vehicle.'
              : 'Your engine ran dry on the highway.'}
          </p>
        </div>

        {/* Hero Score Box */}
        <div className="score-hero-box">
          <span className="score-label">Final score</span>
          <div className="score-number-row">
            <span className="score-number font-mono">{payload.score.toLocaleString()}</span>
            <span className="score-pts">PTS</span>
          </div>
          {(submissionResult?.bestScore || userStats?.bestScore) ? (
            <span className="previous-best">
              Personal Best: {(submissionResult?.bestScore || Math.max(userStats?.bestScore || 0, payload.score)).toLocaleString()}
            </span>
          ) : null}
          {(payload.bonus || 0) > 0 && (
            <span className="run-bonus">Near-miss bonus: +{payload.bonus?.toLocaleString()}</span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="stats-breakdown-grid">
          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ color: 'var(--g-blue)' }}>
              <Trophy size={16} />
            </div>
            <div className="stat-card-details">
              <span className="stat-name">Distance</span>
              <span className="stat-value font-display">{payload.distance}m</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ color: 'var(--g-yellow)' }}>
              <Coins size={16} />
            </div>
            <div className="stat-card-details">
              <span className="stat-name">Coins</span>
              <span className="stat-value font-display">+{payload.coins}</span>
            </div>
          </div>

          <div className="stat-card gdg-coin-card">
            <div className="stat-icon-wrap">
              <img src="/branding/gdg-pill.png" alt="GDG Coin" className="gdg-pill-stat-img" />
            </div>
            <div className="stat-card-details">
              <span className="stat-name">GDG Coins</span>
              <span className="stat-value font-display gdg-pill-stat-val">
                +{runGdgCoins}
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ color: 'var(--g-green)' }}>
              <Clock size={16} />
            </div>
            <div className="stat-card-details">
              <span className="stat-name">Time</span>
              <span className="stat-value font-display">{payload.duration}s</span>
            </div>
          </div>
        </div>

        {/* Banked Wallet Banner */}
        <div className="banked-wallet-banner">
          <span className="banked-label">Total bank</span>
          <div className="banked-chips">
            <span className="banked-chip">
              <Coins size={12} style={{ color: 'var(--g-yellow)' }} />
              <span>{displayTotalCoins.toLocaleString()}</span>
            </span>
            <span className="banked-chip gdg">
              <img src="/branding/gdg-pill.png" alt="GDG" className="banked-mini-pill" />
              <span>{displayTotalGdg.toLocaleString()} GDG</span>
            </span>
          </div>
        </div>

        <div className={`score-save-status ${saveState}`} role={saveState === 'error' ? 'alert' : 'status'}>
          {saveIcon}
          <span>{saveMessage || 'Preparing score…'}</span>
        </div>

        {/* Actions */}
        <div className="result-actions">
          <button
            id="play-again-btn"
            className="btn btn-filled btn-lg action-btn action-primary"
            onClick={onPlayAgain}
          >
            <RotateCcw size={16} />
            <span>Play again</span>
          </button>

          <button
            id="back-to-garage-btn"
            className="btn btn-outlined btn-lg action-btn"
            onClick={onBackToGarage}
          >
            <ArrowLeft size={16} />
            <span>Back to garage</span>
          </button>

          <button
            id="view-leaderboard-btn"
            className="btn btn-outlined btn-lg action-btn"
            onClick={onViewLeaderboard}
          >
            <Trophy size={16} />
            <span>Leaderboard</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <style>{`
        .result-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          background: rgba(0, 0, 0, 0.78);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: max(10px, env(safe-area-inset-top)) 10px max(10px, env(safe-area-inset-bottom));
          z-index: 50;
        }

        .result-card {
          width: 100%;
          max-width: 420px;
          min-width: 0;
          border-radius: var(--r-xl);
          background: var(--surface);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-3);
          overflow: hidden;
          max-height: calc(100dvh - max(20px, env(safe-area-inset-top)) - max(20px, env(safe-area-inset-bottom)));
          overflow-y: auto;
          overscroll-behavior: contain;
          text-align: center;
          padding: 0;
        }

        .result-header {
          padding: 14px 16px 6px;
        }

        .record-chip,
        .status-chip {
          margin-bottom: 6px;
          height: 24px;
          font-size: 0.75rem;
        }

        .status-chip.police-chip {
          background: var(--danger-soft);
          color: var(--danger);
        }

        .status-chip.fuel-chip {
          background: rgba(251, 188, 4, 0.15);
          color: #B26A00;
        }

        :root[data-theme='dark'] .status-chip.fuel-chip {
          color: #FFD54F;
          background: rgba(251, 188, 4, 0.15);
        }

        .result-title {
          font-size: 1.4rem;
          font-weight: 700;
          margin-bottom: 2px;
          line-height: 1.2;
        }

        .result-subtitle {
          font-size: 0.78rem;
          color: var(--text-2);
          max-width: 320px;
          margin: 0 auto;
        }

        .score-hero-box {
          margin: 0 16px 8px;
          padding: 10px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .score-label {
          font-family: var(--font-display);
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-3);
          letter-spacing: 0.08em;
        }

        .score-number-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          margin: 2px 0;
        }

        .score-number {
          font-size: 2.2rem;
          font-weight: 700;
          color: var(--text);
          line-height: 1.1;
        }

        .score-pts {
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--accent);
        }

        .previous-best {
          font-size: 0.75rem;
          color: var(--text-3);
        }

        .run-bonus {
          margin-top: 2px;
          color: #B26A00;
          font-size: 0.75rem;
          font-weight: 500;
        }

        :root[data-theme='dark'] .run-bonus { color: #FFD54F; }

        .stats-breakdown-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          margin: 0 16px 8px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--r-sm);
          text-align: left;
        }

        .stat-card.gdg-coin-card {
          background: var(--accent-soft);
          border-color: rgba(66, 133, 244, 0.35);
        }

        .gdg-pill-stat-img {
          width: 18px;
          height: 18px;
          object-fit: contain;
        }

        .gdg-pill-stat-val {
          color: var(--accent) !important;
        }

        .stat-card-details {
          display: flex;
          flex-direction: column;
        }

        .stat-name {
          font-size: 0.75rem;
          color: var(--text-3);
        }

        .stat-value {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text);
        }

        .banked-wallet-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 16px 10px;
          padding: 6px 12px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--pill);
        }

        .banked-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-3);
          letter-spacing: 0.05em;
        }

        .banked-chips {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .banked-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text);
        }

        .banked-chip.gdg {
          color: var(--accent);
        }

        .banked-mini-pill {
          width: 12px;
          height: 12px;
          object-fit: contain;
        }

        .result-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding: 0 16px 12px;
        }

        /* Play again is the primary action and takes the full row; Garage and
           Leaderboard share the row beneath it. */
        .action-primary {
          grid-column: 1 / -1;
        }

        @media (max-width: 380px) {
          .result-actions { grid-template-columns: 1fr; }
        }

        .action-btn {
          min-height: 48px;
          min-width: 0;
          font-size: 0.82rem;
          font-weight: 500;
          letter-spacing: 0.03em;
          padding: 0 12px;
          touch-action: manipulation;
        }

        .score-save-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 28px;
          margin: -4px 16px 8px;
          color: var(--text-2);
          font-size: 0.75rem;
          font-weight: 500;
        }

        .score-save-status.saved { color: var(--g-green); }
        .score-save-status.queued { color: #B26A00; }
        :root[data-theme='dark'] .score-save-status.queued { color: #FFD54F; }
        .score-save-status.error { color: var(--danger); }

        .save-spinner { animation: score-save-spin 0.9s linear infinite; }

        @keyframes score-save-spin { to { transform: rotate(360deg); } }

        @media (max-height: 520px) and (orientation: landscape) {
          .result-backdrop { align-items: flex-start; }
          .result-card { max-width: 620px; }
          .result-header { padding-top: 8px; }
          .result-subtitle { display: none; }
          .score-hero-box { padding: 6px; }
          .stats-breakdown-grid { grid-template-columns: repeat(4, 1fr); }
        }

        @media (prefers-reduced-motion: reduce) {
          .save-spinner { animation: none; }
        }
      `}</style>
    </div>
  );
};
