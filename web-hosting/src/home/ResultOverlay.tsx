import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Award, Coins, MapPin, Clock, ArrowRight, Fuel, Siren } from 'lucide-react';
import { GameOverPayload, ScoreRow, fetchUserBest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface ResultOverlayProps {
  payload: GameOverPayload;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
  onSignOut: () => void;
}

export const ResultOverlay: React.FC<ResultOverlayProps> = ({
  payload,
  onPlayAgain,
  onViewLeaderboard,
  onSignOut,
}) => {
  const { user, userCoins, userGdgCoins, refreshCoins } = useAuth();
  const [personalBest, setPersonalBest] = useState<ScoreRow | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(true);

  const isFuelLoss = payload.reason === 'fuel';
  const title = isFuelLoss ? 'Out of fuel' : 'Police caught up';
  const subtitle = isFuelLoss
    ? 'Your tank ran dry on the highway — telemetry and coins saved.'
    : 'Heat level peaked & patrol intercepted — telemetry and coins saved.';
  const badgeText = isFuelLoss ? 'TANK EMPTY' : 'INTERCEPTED';
  const badgeIcon = isFuelLoss ? <Fuel size={14} /> : <Siren size={14} />;

  useEffect(() => {
    // Fire celebratory confetti in Google brand colors!
    try {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4285F4', '#EA4335', '#FBBC04', '#34A853'],
      });
    } catch {
      // Confetti fallback
    }

    refreshCoins();

    if (user) {
      fetchUserBest(user.id)
        .then((best) => {
          setPersonalBest(best);
          if (!best || payload.score >= best.score) {
            setIsNewRecord(true);
          }
        })
        .finally(() => setLoadingRecord(false));
    } else {
      setLoadingRecord(false);
    }
  }, [payload.score, user, refreshCoins]);

  const displayTotalCoins = userCoins > 0 ? userCoins : payload.coins;
  const displayTotalGdg = userGdgCoins > 0 ? userGdgCoins : Math.max(1, Math.floor(payload.coins / 15));

  return (
    <div className="result-backdrop">
      <div className="result-card card animate-fade-in">
        <div className="result-header">
          {isNewRecord && !loadingRecord ? (
            <div className="record-chip chip chip-accent">
              <Award size={15} />
              <span>NEW PERSONAL BEST</span>
            </div>
          ) : (
            <div className={`status-chip chip ${isFuelLoss ? 'fuel-chip' : 'police-chip'}`}>
              {badgeIcon}
              <span>{badgeText}</span>
            </div>
          )}

          <h2 className="result-title">{title}</h2>
          <p className="result-subtitle">{subtitle}</p>
        </div>

        {/* Main Score Hero */}
        <div className="score-hero-box">
          <span className="score-label">FINAL SCORE</span>
          <div className="score-number-row">
            <span className="score-number font-display">
              {payload.score.toLocaleString()}
            </span>
            <span className="score-pts font-display">PTS</span>
          </div>
          {personalBest && !isNewRecord && (
            <span className="previous-best">
              Personal Best: {personalBest.score.toLocaleString()} pts
            </span>
          )}
        </div>

        {/* Breakdown Stats */}
        <div className="stats-breakdown-grid">
          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ color: 'var(--g-blue)' }}>
              <MapPin size={18} />
            </div>
            <div className="stat-card-details">
              <span className="stat-name">Distance</span>
              <span className="stat-value font-display">{payload.distance} m</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ color: 'var(--g-yellow)' }}>
              <Coins size={18} />
            </div>
            <div className="stat-card-details">
              <span className="stat-name">Coins Earned</span>
              <span className="stat-value font-display">+{payload.coins}</span>
            </div>
          </div>

          <div className="stat-card gdg-coin-card">
            <div className="stat-icon-wrap">
              <img src="/branding/gdg-pill.png" alt="GDG Coin" className="gdg-pill-stat-img" />
            </div>
            <div className="stat-card-details">
              <span className="stat-name">GDG Coins Earned</span>
              <span className="stat-value font-display gdg-pill-stat-val">
                +{Math.max(1, Math.floor(payload.coins / 15))}
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ color: 'var(--g-green)' }}>
              <Clock size={18} />
            </div>
            <div className="stat-card-details">
              <span className="stat-name">Duration</span>
              <span className="stat-value font-display">{payload.duration}s</span>
            </div>
          </div>
        </div>

        {/* Cumulative Bank Wallet Banner */}
        <div className="banked-wallet-banner">
          <span className="banked-label">YOUR TOTAL BANK:</span>
          <div className="banked-chips">
            <span className="banked-chip">
              <Coins size={13} style={{ color: 'var(--g-yellow)' }} />
              <span>{displayTotalCoins.toLocaleString()} coins</span>
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
            <RotateCcw size={18} />
            <span>PLAY AGAIN</span>
          </button>

          <button
            id="view-leaderboard-btn"
            className="btn btn-outlined btn-lg action-btn"
            onClick={onViewLeaderboard}
          >
            <Trophy size={18} />
            <span>LEADERBOARD</span>
            <ArrowRight size={16} />
          </button>
        </div>

        <button
          type="button"
          className="signout-link btn-text"
          onClick={onSignOut}
        >
          Sign Out
        </button>
      </div>

      <style>{`
        .result-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100dvh;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
          z-index: 50;
        }

        .result-card {
          width: 100%;
          max-width: 500px;
          max-height: min(92dvh, 680px);
          border-radius: var(--r-xl);
          background: var(--surface);
          border: 2px solid var(--border);
          box-shadow: var(--shadow-3);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          text-align: center;
          padding: 0;
        }

        .result-header {
          padding: 28px 24px 16px;
        }

        .record-chip {
          margin-bottom: 12px;
          height: 28px;
        }

        .status-chip {
          margin-bottom: 12px;
          height: 28px;
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
          font-size: 1.85rem;
          margin-bottom: 4px;
        }

        .result-subtitle {
          font-size: 0.875rem;
          color: var(--text-2);
          max-width: 380px;
          margin: 0 auto;
        }

        .score-hero-box {
          margin: 0 24px 16px;
          padding: 18px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--r-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .score-label {
          font-family: var(--font-display);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-3);
          letter-spacing: 0.08em;
        }

        .score-number-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin: 4px 0;
        }

        .score-number {
          font-size: 3rem;
          font-weight: 700;
          color: var(--text);
        }

        .score-pts {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--accent);
        }

        .previous-best {
          font-size: 0.8rem;
          color: var(--text-3);
        }

        .stats-breakdown-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin: 0 24px 16px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          text-align: left;
        }

        .stat-card.gdg-coin-card {
          background: var(--accent-soft);
          border-color: rgba(66, 133, 244, 0.35);
        }

        .gdg-pill-stat-img {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }

        .gdg-pill-stat-val {
          color: var(--accent) !important;
        }

        .stat-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-card-details {
          display: flex;
          flex-direction: column;
        }

        .stat-name {
          font-size: 0.7rem;
          color: var(--text-3);
          text-transform: uppercase;
          font-weight: 500;
        }

        .stat-value {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
        }

        .banked-wallet-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0 24px 16px;
          padding: 10px 16px;
          background: var(--surface-3);
          border: 1px dashed var(--border-strong);
          border-radius: var(--r-md);
          font-size: 0.85rem;
          flex-wrap: wrap;
          gap: 8px;
        }

        .banked-label {
          font-family: var(--font-display);
          font-size: 0.72rem;
          font-weight: 700;
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
          padding: 2px 8px;
          border-radius: var(--pill);
          font-weight: 700;
          font-size: 0.8rem;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
        }

        .banked-chip.gdg {
          color: var(--accent);
        }

        .banked-mini-pill {
          width: 13px;
          height: 13px;
          object-fit: contain;
        }

        .result-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 0 24px 12px;
        }

        .action-btn {
          width: 100%;
        }

        .signout-link {
          margin: 0 auto 16px;
          font-size: 0.82rem;
          display: inline-block;
        }

        @media (max-width: 560px) {
          .stats-breakdown-grid {
            grid-template-columns: 1fr;
          }
          .score-number {
            font-size: 2.4rem;
          }
        }
      `}</style>
    </div>
  );
};
