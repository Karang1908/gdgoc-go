import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Award, Coins, MapPin, Clock, ArrowRight } from 'lucide-react';
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
  const { user } = useAuth();
  const [personalBest, setPersonalBest] = useState<ScoreRow | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(true);

  useEffect(() => {
    // Fire celebratory confetti!
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4285F4', '#EA4335', '#FBBC05', '#34A853'],
      });
    } catch {
      // Confetti fallback
    }

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
  }, [payload.score, user]);

  return (
    <div className="result-backdrop">
      <div className="result-card glass-panel animate-fade-in">
        <div className="google-strip" />

        <div className="result-header">
          {isNewRecord && !loadingRecord && (
            <div className="record-badge animate-fade-in">
              <Award size={16} />
              <span>NEW PERSONAL BEST!</span>
            </div>
          )}
          <h2 className="result-title">POLICE CAUGHT UP!</h2>
          <p className="result-subtitle">Run Complete — Score Verified & Saved</p>
        </div>

        {/* Main Score Readout */}
        <div className="score-hero-box">
          <span className="score-label">FINAL SCORE</span>
          <div className="score-number-row">
            <span className="score-number font-display">
              {payload.score.toLocaleString()}
            </span>
            <span className="score-pts">PTS</span>
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
            <div className="stat-icon-wrap" style={{ color: '#4285F4' }}>
              <MapPin size={20} />
            </div>
            <div className="stat-card-details">
              <span className="stat-name">Distance</span>
              <span className="stat-value font-display">{payload.distance} m</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ color: '#FBBC05' }}>
              <Coins size={20} />
            </div>
            <div className="stat-card-details">
              <span className="stat-name">Coins</span>
              <span className="stat-value font-display">{payload.coins}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap" style={{ color: '#34A853' }}>
              <Clock size={20} />
            </div>
            <div className="stat-card-details">
              <span className="stat-name">Duration</span>
              <span className="stat-value font-display">{payload.duration}s</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="result-actions">
          <button
            id="play-again-btn"
            className="btn btn-primary btn-lg action-btn"
            onClick={onPlayAgain}
          >
            <RotateCcw size={20} />
            <span>PLAY AGAIN</span>
          </button>

          <button
            id="view-leaderboard-btn"
            className="btn btn-secondary btn-lg action-btn"
            onClick={onViewLeaderboard}
          >
            <Trophy size={20} />
            <span>LEADERBOARD</span>
            <ArrowRight size={16} />
          </button>
        </div>

        <button
          type="button"
          className="signout-link"
          onClick={onSignOut}
        >
          Sign Out
        </button>
      </div>

      <style>{`
        .result-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(8, 11, 18, 0.88);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 50;
        }

        .result-card {
          width: 100%;
          max-width: 520px;
          border-radius: var(--radius-xl);
          background: var(--bg-surface);
          border: 1px solid var(--border-medium);
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.85);
          overflow: hidden;
          text-align: center;
        }

        .result-header {
          padding: 28px 28px 16px;
        }

        .record-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: linear-gradient(135deg, rgba(251, 188, 5, 0.2), rgba(234, 67, 53, 0.2));
          border: 1px solid rgba(251, 188, 5, 0.4);
          border-radius: 20px;
          color: var(--google-yellow);
          font-family: var(--font-mono);
          font-size: 0.76rem;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .result-title {
          font-size: 2rem;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .result-subtitle {
          font-size: 0.88rem;
          color: var(--text-muted);
        }

        .score-hero-box {
          margin: 0 28px 20px;
          padding: 20px;
          background: linear-gradient(180deg, rgba(26, 33, 48, 0.6) 0%, rgba(18, 23, 34, 0.8) 100%);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .score-label {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.1em;
        }

        .score-number-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin: 6px 0;
        }

        .score-number {
          font-size: 3.2rem;
          font-weight: 800;
          color: #FFFFFF;
          text-shadow: 0 0 24px rgba(66, 133, 244, 0.4);
        }

        .score-pts {
          font-family: var(--font-mono);
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--google-yellow);
        }

        .previous-best {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .stats-breakdown-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin: 0 28px 24px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          text-align: left;
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
          font-size: 0.72rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .stat-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .result-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 0 28px 16px;
        }

        .action-btn {
          width: 100%;
        }

        .signout-link {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.82rem;
          cursor: pointer;
          padding: 8px 16px 20px;
          transition: color 0.15s ease;
        }

        .signout-link:hover {
          color: var(--google-red);
        }

        @media (max-width: 600px) {
          .stats-breakdown-grid {
            grid-template-columns: 1fr;
          }
          .score-number {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
};
