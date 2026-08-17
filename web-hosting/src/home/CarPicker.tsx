import React from 'react';
import { Play, Gauge, Shield, Zap, Sparkles } from 'lucide-react';
import { CARS, CarOption } from '../data/cars';

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
  const selectedCar = CARS.find((c) => c.id === selectedCarId) || CARS[0];

  return (
    <div className="car-picker-container animate-fade-in">
      <div className="picker-header">
        <div className="garage-tag">
          <Sparkles size={16} />
          <span>VEHICLE SELECTOR</span>
        </div>
        <h1 className="picker-title">Choose Your Getaway Car</h1>
        <p className="picker-desc">
          Select a vehicle from your garage tuned for high-speed police evasion. Each chassis features distinct handling, top speed, and durability.
        </p>
      </div>

      {/* Car Cards Grid - All in 1 line */}
      <div className="cars-grid">
        {CARS.map((car: CarOption) => {
          const isSelected = car.id === selectedCarId;
          return (
            <div
              key={car.id}
              className={`car-card glass-panel ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectCar(car.id)}
              style={{
                borderColor: isSelected ? car.badgeColor : undefined,
                boxShadow: isSelected ? `0 10px 30px ${car.accentColor}` : undefined,
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
                <div
                  className="selected-pill"
                  style={{ background: car.badgeColor }}
                >
                  ACTIVE
                </div>
              )}

              <div className="car-icon-wrapper" style={{ background: car.accentColor }}>
                <span className="car-emoji">{car.icon}</span>
              </div>

              <div className="car-info">
                <div className="car-name-row">
                  <h3 className="car-name">{car.name}</h3>
                  <span
                    className="car-type-badge"
                    style={{ color: car.badgeColor, borderColor: car.badgeColor }}
                  >
                    {car.id.toUpperCase()}
                  </span>
                </div>
                <p className="car-subtitle">{car.subtitle}</p>
                <p className="car-desc">{car.description}</p>
              </div>

              {/* Stats */}
              <div className="car-stats">
                <div className="stat-row">
                  <div className="stat-label">
                    <Zap size={13} style={{ color: '#4285F4' }} />
                    <span>Top Speed</span>
                    <span className="stat-value font-mono">{car.stats.speed}</span>
                  </div>
                  <div className="stat-bar-track">
                    <div
                      className="stat-bar-fill"
                      style={{
                        width: `${car.stats.speed}%`,
                        background: '#4285F4',
                      }}
                    />
                  </div>
                </div>

                <div className="stat-row">
                  <div className="stat-label">
                    <Gauge size={13} style={{ color: '#FBBC05' }} />
                    <span>Handling</span>
                    <span className="stat-value font-mono">{car.stats.handling}</span>
                  </div>
                  <div className="stat-bar-track">
                    <div
                      className="stat-bar-fill"
                      style={{
                        width: `${car.stats.handling}%`,
                        background: '#FBBC05',
                      }}
                    />
                  </div>
                </div>

                <div className="stat-row">
                  <div className="stat-label">
                    <Shield size={13} style={{ color: '#34A853' }} />
                    <span>Durability</span>
                    <span className="stat-value font-mono">{car.stats.durability}</span>
                  </div>
                  <div className="stat-bar-track">
                    <div
                      className="stat-bar-fill"
                      style={{
                        width: `${car.stats.durability}%`,
                        background: '#34A853',
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`btn select-car-btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCar(car.id);
                }}
              >
                {isSelected ? '✓ Selected' : 'Select Car'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Launch Section */}
      <div className="launch-section glass-panel">
        <div className="launch-summary">
          <div className="summary-icon">{selectedCar.icon}</div>
          <div className="summary-details">
            <span className="summary-ready">READY ON THE STARTING LINE:</span>
            <span className="summary-car-name">{selectedCar.name}</span>
          </div>
        </div>

        <button
          id="start-chase-btn"
          className="btn btn-accent btn-lg launch-btn"
          onClick={onStartGame}
        >
          <Play size={22} fill="currentColor" />
          <span>START POLICE CHASE</span>
        </button>
      </div>

      <style>{`
        .car-picker-container {
          max-width: 1360px;
          margin: 0 auto;
          padding: 36px 20px 60px;
        }

        .picker-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .garage-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(66, 133, 244, 0.12);
          border: 1px solid rgba(66, 133, 244, 0.3);
          border-radius: 20px;
          font-family: var(--font-mono);
          font-size: 0.76rem;
          font-weight: 700;
          color: var(--google-blue);
          margin-bottom: 12px;
        }

        .picker-title {
          font-size: 2.5rem;
          margin-bottom: 10px;
          background: linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .picker-desc {
          max-width: 680px;
          margin: 0 auto;
          color: var(--text-secondary);
          font-size: 0.95rem;
          line-height: 1.5;
        }

        /* 1 Single Line Grid for all 4 cars */
        .cars-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 30px;
        }

        .car-card {
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 20px 16px;
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.22s ease-in-out;
          border: 1px solid var(--border-medium);
          background: var(--bg-surface);
        }

        .car-card:hover {
          transform: translateY(-5px);
          border-color: rgba(255, 255, 255, 0.35);
        }

        .car-card.selected {
          background: var(--bg-surface-elevated);
          transform: translateY(-4px);
        }

        .selected-pill {
          position: absolute;
          top: -9px;
          right: 14px;
          color: #FFFFFF;
          font-family: var(--font-mono);
          font-size: 0.62rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 10px;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
        }

        .car-icon-wrapper {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          border: 1px solid var(--border-subtle);
        }

        .car-emoji {
          font-size: 34px;
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4));
        }

        .car-info {
          flex-grow: 1;
          margin-bottom: 16px;
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
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .car-type-badge {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid;
          flex-shrink: 0;
        }

        .car-subtitle {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--google-blue);
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .car-desc {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 3.4em;
        }

        .car-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 14px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: var(--radius-md);
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
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .stat-label span:first-of-type {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .stat-value {
          font-size: 0.72rem;
          color: var(--text-secondary);
        }

        .stat-bar-track {
          height: 5px;
          width: 100%;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 3px;
          overflow: hidden;
        }

        .stat-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .select-car-btn {
          width: 100%;
          padding: 9px 12px;
          font-size: 0.88rem;
        }

        .launch-section {
          padding: 20px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-lg);
          background: var(--bg-surface);
        }

        .launch-summary {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .summary-icon {
          font-size: 32px;
        }

        .summary-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .summary-ready {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .summary-car-name {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .launch-btn {
          padding: 16px 36px;
          font-size: 1.15rem;
          letter-spacing: 0.02em;
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

        @media (max-width: 768px) {
          .launch-section {
            flex-direction: column;
            gap: 20px;
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
