import React from 'react';
import { Play, Gauge, Shield, Zap, Sparkles, Check, Coins } from 'lucide-react';
import { CARS, CarOption } from '../data/cars';
import { useAuth } from '../context/AuthContext';

interface CarPickerProps {
  selectedCarId: string;
  onSelectCar: (carId: string) => void;
  onStartGame: () => void;
}

export const CarPicker: React.FC<CarPickerProps> = ({
  selectedCarId,
  onSelectCar,
  onStartGame,
}) => {
  const { session, userCoins, userGdgCoins } = useAuth();
  const selectedCar = CARS.find((c) => c.id === selectedCarId) || CARS[0];

  return (
    <div className="car-picker-container animate-fade-in">
      {/* Header */}
      <div className="picker-header">
        <div className="picker-header-top">
          <div className="garage-badge">
            <Sparkles size={14} className="badge-icon" />
            <span>VEHICLE SELECTOR</span>
          </div>

          {session && (
            <div className="picker-wallet-group">
              <div className="wallet-chip standard" title={`Cumulative Standard Coins: ${userCoins.toLocaleString()}`}>
                <Coins size={14} className="coin-svg" />
                <span className="font-mono">{userCoins.toLocaleString()}</span>
                <span className="wallet-chip-lbl">COINS</span>
              </div>
              <div className="wallet-chip gdg" title={`Cumulative GDG Coins: ${userGdgCoins.toLocaleString()}`}>
                <img src="/branding/gdg-pill.png" alt="GDG" className="inline-gdg-pill-icon" />
                <span className="font-mono">{userGdgCoins.toLocaleString()}</span>
                <span className="wallet-chip-lbl">GDG</span>
              </div>
            </div>
          )}
        </div>

        <h1 className="picker-title">Choose your vehicle</h1>
        <p className="lede picker-lede">
          Select a tuned getaway chassis for high-speed police evasion. Each vehicle features distinct handling, top speed, and collision durability.
        </p>
      </div>

      {/* 4 Car Cards Grid */}
      <div className="cars-grid">
        {CARS.map((car: CarOption) => {
          const isSelected = car.id === selectedCarId;
          return (
            <div
              key={car.id}
              className={`car-card card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectCar(car.id)}
              style={{
                borderColor: isSelected ? 'var(--accent)' : undefined,
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCar(car.id);
                }
              }}
            >
              {isSelected && (
                <div className="active-pill-badge">
                  <Check size={12} strokeWidth={3} />
                  <span>ACTIVE CHASSIS</span>
                </div>
              )}

              {/* 3D Model Render Preview */}
              <div className="car-preview-stage">
                <img
                  src={car.image}
                  alt={car.name}
                  className="car-model-image"
                  loading="eager"
                />
              </div>

              <div className="car-info">
                <div className="car-name-row">
                  <h3 className="car-name">{car.name}</h3>
                  <span
                    className="car-type-tag"
                    style={{ color: car.badgeColor, borderColor: car.badgeColor }}
                  >
                    {car.id.toUpperCase()}
                  </span>
                </div>
                <p className="car-subtitle">{car.subtitle}</p>
                <p className="car-desc">{car.description}</p>
              </div>

              {/* Stats Meters */}
              <div className="car-stats-box">
                <div className="stat-row">
                  <div className="stat-label">
                    <span className="stat-name-label">
                      <Zap size={13} style={{ color: 'var(--g-blue)' }} />
                      <span>Speed</span>
                    </span>
                    <span className="stat-num font-mono">{car.stats.speed}</span>
                  </div>
                  <div className="stat-track">
                    <div
                      className="stat-fill"
                      style={{
                        width: `${car.stats.speed}%`,
                        background: 'var(--g-blue)',
                      }}
                    />
                  </div>
                </div>

                <div className="stat-row">
                  <div className="stat-label">
                    <span className="stat-name-label">
                      <Gauge size={13} style={{ color: 'var(--g-yellow)' }} />
                      <span>Handling</span>
                    </span>
                    <span className="stat-num font-mono">{car.stats.handling}</span>
                  </div>
                  <div className="stat-track">
                    <div
                      className="stat-fill"
                      style={{
                        width: `${car.stats.handling}%`,
                        background: 'var(--g-yellow)',
                      }}
                    />
                  </div>
                </div>

                <div className="stat-row">
                  <div className="stat-label">
                    <span className="stat-name-label">
                      <Shield size={13} style={{ color: 'var(--g-green)' }} />
                      <span>Durability</span>
                    </span>
                    <span className="stat-num font-mono">{car.stats.durability}</span>
                  </div>
                  <div className="stat-track">
                    <div
                      className="stat-fill"
                      style={{
                        width: `${car.stats.durability}%`,
                        background: 'var(--g-green)',
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`btn select-btn ${isSelected ? 'btn-filled' : 'btn-secondary'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCar(car.id);
                }}
              >
                {isSelected ? (
                  <>
                    <Check size={16} strokeWidth={2.5} />
                    <span>Selected</span>
                  </>
                ) : (
                  <span>Select Car</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Launch Section Bar */}
      <div className="launch-card card">
        <div className="launch-summary">
          <div className="summary-thumb-box">
            <img src={selectedCar.image} alt={selectedCar.name} className="summary-thumb-img" />
          </div>
          <div className="summary-details">
            <span className="summary-overline">READY ON THE STARTING LINE</span>
            <h3 className="summary-car-name">{selectedCar.name}</h3>
            <span className="summary-specs">
              Speed: {selectedCar.stats.speed} • Handling: {selectedCar.stats.handling} • Durability: {selectedCar.stats.durability}
            </span>
          </div>
        </div>

        <button
          id="start-chase-btn"
          className="btn btn-accent btn-lg launch-btn"
          onClick={onStartGame}
        >
          <Play size={20} fill="currentColor" />
          <span>START POLICE CHASE</span>
        </button>
      </div>

      <style>{`
        .car-picker-container {
          max-width: 1320px;
          margin: 0 auto;
          padding: 32px clamp(16px, 3vw, 32px) 60px;
        }

        .picker-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .picker-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .garage-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 14px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--pill);
          font-family: var(--font-display);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-2);
          letter-spacing: 0.04em;
        }

        .badge-icon {
          color: var(--g-yellow);
        }

        .picker-wallet-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .wallet-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 32px;
          padding: 0 12px;
          border-radius: var(--pill);
          font-size: 0.8125rem;
          font-weight: 700;
          background: var(--surface-2);
          border: 1px solid var(--border);
        }

        .wallet-chip.standard {
          color: #B26A00;
          border-color: rgba(251, 188, 4, 0.4);
          background: rgba(251, 188, 4, 0.1);
        }

        :root[data-theme='dark'] .wallet-chip.standard {
          color: #FFD54F;
          border-color: rgba(251, 188, 4, 0.3);
          background: rgba(251, 188, 4, 0.12);
        }

        .coin-svg {
          color: var(--g-yellow);
        }

        .wallet-chip.gdg {
          color: var(--accent);
          border-color: rgba(66, 133, 244, 0.35);
          background: var(--accent-soft);
        }

        .inline-gdg-pill-icon {
          width: 14px;
          height: 14px;
          object-fit: contain;
        }

        .wallet-chip-lbl {
          font-size: 0.65rem;
          font-weight: 800;
          opacity: 0.8;
          letter-spacing: 0.04em;
        }

        .picker-title {
          font-size: clamp(2rem, 4vw, 2.75rem);
          margin-bottom: 8px;
        }

        .picker-lede {
          margin: 0 auto;
        }

        .cars-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .car-card {
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 20px;
          border-radius: var(--r-xl);
          cursor: pointer;
          transition: all 0.2s var(--ease);
          background: var(--surface);
          border: 2px solid var(--border);
        }

        .car-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-2);
          border-color: var(--border-strong);
        }

        .car-card.selected {
          background: var(--surface);
          box-shadow: var(--shadow-2);
        }

        .active-pill-badge {
          position: absolute;
          top: -10px;
          right: 16px;
          background: var(--accent);
          color: var(--on-accent);
          font-family: var(--font-display);
          font-size: 0.68rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: var(--pill);
          letter-spacing: 0.04em;
          box-shadow: var(--shadow-1);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .car-preview-stage {
          width: 100%;
          height: 140px;
          border-radius: var(--r-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          background: radial-gradient(circle at center, var(--surface-2) 0%, var(--surface-3) 100%);
          border: 1px solid var(--border);
          overflow: hidden;
          padding: 8px;
        }

        .car-model-image {
          max-width: 90%;
          max-height: 90%;
          object-fit: contain;
          transition: transform 0.25s var(--ease);
          filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.35));
        }

        .car-card:hover .car-model-image {
          transform: scale(1.06);
        }

        .car-info {
          flex-grow: 1;
          margin-bottom: 14px;
        }

        .car-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          margin-bottom: 4px;
        }

        .car-name {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .car-type-tag {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid;
          flex-shrink: 0;
        }

        .car-subtitle {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--accent);
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .car-desc {
          font-size: 0.82rem;
          color: var(--text-2);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 3.4em;
        }

        .car-stats-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
          margin-bottom: 16px;
        }

        .stat-row {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .stat-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-2);
        }

        .stat-name-label {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .stat-num {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text);
        }

        .stat-track {
          height: 6px;
          width: 100%;
          background: var(--surface-3);
          border-radius: var(--pill);
          overflow: hidden;
        }

        .stat-fill {
          height: 100%;
          border-radius: var(--pill);
          transition: width 0.3s var(--ease);
        }

        .select-btn {
          width: 100%;
          height: 40px;
        }

        .launch-card {
          padding: 18px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: var(--surface);
          border: 2px solid var(--border);
        }

        .launch-summary {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .summary-thumb-box {
          width: 72px;
          height: 52px;
          border-radius: var(--r-md);
          background: var(--surface-2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
        }

        .summary-thumb-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .summary-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .summary-overline {
          font-family: var(--font-display);
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-3);
          letter-spacing: 0.06em;
        }

        .summary-car-name {
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text);
        }

        .summary-specs {
          font-size: 0.78rem;
          color: var(--text-2);
          font-family: var(--font-mono);
        }

        .launch-btn {
          padding: 0 36px;
          height: 52px;
          font-weight: 700;
          letter-spacing: 0.03em;
        }

        @media (max-width: 1080px) {
          .cars-grid {
            display: flex;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            padding-bottom: 8px;
            gap: 14px;
          }
          .car-card {
            min-width: 260px;
            flex: 0 0 260px;
            scroll-snap-align: start;
          }
        }

        @media (max-width: 720px) {
          .launch-card {
            flex-direction: column;
            text-align: center;
          }
          .launch-summary {
            flex-direction: column;
          }
          .launch-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
