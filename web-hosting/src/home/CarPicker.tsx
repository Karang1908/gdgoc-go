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
          Select a vehicle from your garage tuned for high-speed police evasion. Each chassis features distinct handling and durability.
        </p>
      </div>

      {/* Car Cards Grid */}
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
                boxShadow: isSelected ? `0 8px 30px ${car.accentColor}` : undefined,
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
                  ACTIVE CHOICE
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
                    {car.id}
                  </span>
                </div>
                <p className="car-subtitle">{car.subtitle}</p>
                <p className="car-desc">{car.description}</p>
              </div>

              {/* Stats */}
              <div className="car-stats">
                <div className="stat-row">
                  <div className="stat-label">
                    <Zap size={14} style={{ color: '#4285F4' }} />
                    <span>Top Speed</span>
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
                    <Gauge size={14} style={{ color: '#FBBC05' }} />
                    <span>Handling</span>
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
                    <Shield size={14} style={{ color: '#34A853' }} />
                    <span>Durability</span>
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
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px;
        }

        .picker-header {
          text-align: center;
          margin-bottom: 36px;
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
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--google-blue);
          margin-bottom: 14px;
        }

        .picker-title {
          font-size: 2.6rem;
          margin-bottom: 12px;
          background: linear-gradient(180deg, #FFFFFF 0%, #CBD5E1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .picker-desc {
          max-width: 620px;
          margin: 0 auto;
          color: var(--text-secondary);
          font-size: 1rem;
          line-height: 1.55;
        }

        .cars-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 36px;
        }

        .car-card {
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 24px;
          border-radius: var(--radius-xl);
          cursor: pointer;
          transition: all 0.22s ease-in-out;
          border: 1px solid var(--border-medium);
          background: var(--bg-surface);
        }

        .car-card:hover {
          transform: translateY(-6px);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .car-card.selected {
          background: var(--bg-surface-elevated);
          transform: translateY(-4px);
        }

        .selected-pill {
          position: absolute;
          top: -10px;
          right: 20px;
          color: #FFFFFF;
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 12px;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
        }

        .car-icon-wrapper {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          border: 1px solid var(--border-subtle);
        }

        .car-emoji {
          font-size: 42px;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
        }

        .car-info {
          flex-grow: 1;
          margin-bottom: 20px;
        }

        .car-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .car-name {
          font-size: 1.3rem;
          color: var(--text-primary);
        }

        .car-type-badge {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid;
        }

        .car-subtitle {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--google-blue);
          margin-bottom: 8px;
        }

        .car-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.45;
        }

        .car-stats {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.25);
          border-radius: var(--radius-md);
          margin-bottom: 20px;
        }

        .stat-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .stat-bar-track {
          height: 6px;
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
        }

        .launch-section {
          padding: 20px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-xl);
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

        @media (max-width: 900px) {
          .cars-grid {
            grid-template-columns: 1fr;
          }
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
