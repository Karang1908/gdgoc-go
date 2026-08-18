import React, { useEffect } from 'react';
import { RotateCcw, Trophy, ArrowRight, ShieldAlert, Fuel, Award, Clock, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameOverPayload } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface ResultOverlayProps {
  payload: GameOverPayload;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({
  payload,
  onPlayAgain,
  onViewLeaderboard,
}) => {
  const { userStats, userCoins, userGdgCoins } = useAuth();
  const isBusted = payload.reason === 'police';
  const isHighscore = userStats?.bestScore ? payload.score > userStats.bestScore : false;

  useEffect(() => {
    if (isHighscore || payload.score >= 1000) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4285F4', '#EA4335', '#FBBC04', '#34A853'],
        });
      } catch (err) {}
    }
  }, [isHighscore, payload.score]);

  const runGdgCoins = Number(payload.pills) || 0;
  const displayTotalCoins = (userCoins || 0) + payload.coins;
  const displayTotalGdg = (userGdgCoins || 0) + runGdgCoins;

  return (
    <div className="result-backdrop animate-fade-in">
      <div className="result-card card animate-slide-up">
        {/* Header */}
        <div className="result-header">
          {isHighscore ? (
            <div className="chip record-chip badge-gold">
              <Award size={14} />
              <span>NEW PERSONAL RECORD</span>
            </div>
          ) : (
            <div className={`chip status-chip ${isBusted ? 'police-chip' : 'fuel-chip'}`}>
              {isBusted ? <ShieldAlert size={14} /> : <Fuel size={14} />}
              <span>{isBusted ? 'BUSTED BY POLICE' : 'FUEL EXHAUSTED'}</span>
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
          <span className="score-label">FINAL SCORE</span>
          <div className="score-number-row">
            <span className="score-number font-mono">{payload.score.toLocaleString()}</span>
            <span className="score-pts">PTS</span>
          </div>
          {userStats?.bestScore && (
            <span className="previous-best">
              Personal Best: {Math.max(userStats.bestScore, payload.score).toLocaleString()}
            </span>
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
          <span className="banked-label">TOTAL BANK:</span>
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

        {/* Actions */}
        <div className="result-actions">
          <button
            id="play-again-btn"
            className="btn btn-filled btn-lg action-btn"
            onClick={onPlayAgain}
          >
            <RotateCcw size={16} />
            <span>PLAY AGAIN</span>
          </button>

          <button
            id="view-leaderboard-btn"
            className="btn btn-outlined btn-lg action-btn"
            onClick={onViewLeaderboard}
          >
            <Trophy size={16} />
            <span>LEADERBOARD</span>
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
          height: 100dvh;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: max(10px, env(safe-area-inset-top)) 10px max(10px, env(safe-area-inset-bottom));
          z-index: 50;
        }

        .result-card {
          width: 100%;
          max-width: 420px;
          border-radius: var(--r-xl);
          background: var(--surface);
          border: 2px solid var(--border);
          box-shadow: var(--shadow-3);
          overflow: hidden;
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
          font-size: 0.72rem;
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
          font-size: 0.68rem;
          font-weight: 700;
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
          font-weight: 700;
          color: var(--accent);
        }

        .previous-best {
          font-size: 0.72rem;
          color: var(--text-3);
        }

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
          font-size: 0.65rem;
          color: var(--text-3);
        }

        .stat-value {
          font-size: 0.85rem;
          font-weight: 700;
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
          font-size: 0.65rem;
          font-weight: 800;
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
          font-weight: 700;
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

        .action-btn {
          height: 42px;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          padding: 0 12px;
          touch-action: manipulation;
        }
      `}</style>
    </div>
  );
};
