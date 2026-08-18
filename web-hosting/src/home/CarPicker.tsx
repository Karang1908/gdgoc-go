import React, { useEffect, useState, useCallback } from 'react';
import { Play, Gauge, Shield, Zap, Check, Coins, ChevronLeft, ChevronRight } from 'lucide-react';
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

  const initialIndex = Math.max(0, CARS.findIndex((c) => c.id === selectedCarId));
  const [activeIndex, setActiveIndex] = useState<number>(initialIndex !== -1 ? initialIndex : 0);

  // Sync state if selectedCarId changes from external props
  useEffect(() => {
    const idx = CARS.findIndex((c) => c.id === selectedCarId);
    if (idx !== -1 && idx !== activeIndex) {
      setActiveIndex(idx);
    }
  }, [selectedCarId]);

  const activeCar: CarOption = CARS[activeIndex] || CARS[0];

  const handlePrev = useCallback(() => {
    const nextIdx = (activeIndex - 1 + CARS.length) % CARS.length;
    setActiveIndex(nextIdx);
    onSelectCar(CARS[nextIdx].id);
  }, [activeIndex, onSelectCar]);

  const handleNext = useCallback(() => {
    const nextIdx = (activeIndex + 1) % CARS.length;
    setActiveIndex(nextIdx);
    onSelectCar(CARS[nextIdx].id);
  }, [activeIndex, onSelectCar]);

  const handleSelectIndex = (idx: number) => {
    setActiveIndex(idx);
    onSelectCar(CARS[idx].id);
  };

  // Keyboard navigation: Left/Right to change car, Enter/Space to start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  return (
    <div className="car-picker-container animate-fade-in">
      {/* Top Header */}
      <div className="picker-header">
        <div className="picker-header-top">
          <div className="garage-badge">
            <span>VEHICLE SELECTOR</span>
          </div>

          {session && (
            <div className="picker-wallet-group">
              <div className="wallet-chip standard" title={`Cumulative Standard Coins: ${(userCoins || 0).toLocaleString()}`}>
                <Coins size={14} className="coin-svg" />
                <span className="font-mono">{(userCoins || 0).toLocaleString()}</span>
                <span className="wallet-chip-lbl">COINS</span>
              </div>
              <div className="wallet-chip gdg" title={`Cumulative GDG Coins: ${(userGdgCoins || 0).toLocaleString()}`}>
                <img src="/branding/gdg-pill.png" alt="GDG" className="inline-gdg-pill-icon" />
                <span className="font-mono">{(userGdgCoins || 0).toLocaleString()}</span>
                <span className="wallet-chip-lbl">GDG</span>
              </div>
            </div>
          )}
        </div>

        <h1 className="picker-title">Choose your vehicle</h1>
        <p className="lede picker-lede">
          Navigate left and right to select your getaway vehicle. Each chassis features distinct handling, top speed, and collision durability.
        </p>
      </div>

      {/* Main Carousel Showcase */}
      <div className="carousel-wrapper">
        {/* Left Navigation Arrow */}
        <button
          type="button"
          className="carousel-arrow-btn prev-btn icon-btn"
          onClick={handlePrev}
          aria-label="Previous Vehicle"
          title="Previous Vehicle (Left Arrow)"
        >
          <ChevronLeft size={28} />
        </button>

        {/* Focused Hero Vehicle Card */}
        <div className="showcase-card card">
          <div className="showcase-stage" onContextMenu={(e) => e.preventDefault()}>
            <img
              key={activeCar.id}
              src={activeCar.spinImage || activeCar.image}
              alt={activeCar.name}
              className="showcase-car-img"
              draggable={false}
              loading="eager"
            />
          </div>

          <div className="showcase-details">
            <div className="showcase-header-row">
              <div>
                <span
                  className="showcase-type-tag"
                  style={{ color: activeCar.badgeColor, borderColor: activeCar.badgeColor }}
                >
                  {activeCar.id.toUpperCase()} CHASSIS
                </span>
                <h2 className="showcase-car-name">{activeCar.name}</h2>
                <p className="showcase-subtitle">{activeCar.subtitle}</p>
              </div>

              <div className="showcase-index-pill font-mono">
                {activeIndex + 1} / {CARS.length}
              </div>
            </div>

            <p className="showcase-desc">{activeCar.description}</p>

            {/* Spec Meters */}
            <div className="showcase-stats-grid">
              <div className="stat-card">
                <div className="stat-label">
                  <span className="stat-name-label">
                    <Zap size={14} style={{ color: 'var(--g-blue)' }} />
                    <span>Top Speed</span>
                  </span>
                  <span className="stat-num font-mono">{activeCar.stats.speed}</span>
                </div>
                <div className="stat-track">
                  <div
                    className="stat-fill"
                    style={{
                      width: `${activeCar.stats.speed}%`,
                      background: 'var(--g-blue)',
                    }}
                  />
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">
                  <span className="stat-name-label">
                    <Gauge size={14} style={{ color: 'var(--g-yellow)' }} />
                    <span>Handling</span>
                  </span>
                  <span className="stat-num font-mono">{activeCar.stats.handling}</span>
                </div>
                <div className="stat-track">
                  <div
                    className="stat-fill"
                    style={{
                      width: `${activeCar.stats.handling}%`,
                      background: 'var(--g-yellow)',
                    }}
                  />
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-label">
                  <span className="stat-name-label">
                    <Shield size={14} style={{ color: 'var(--g-green)' }} />
                    <span>Durability</span>
                  </span>
                  <span className="stat-num font-mono">{activeCar.stats.durability}</span>
                </div>
                <div className="stat-track">
                  <div
                    className="stat-fill"
                    style={{
                      width: `${activeCar.stats.durability}%`,
                      background: 'var(--g-green)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="showcase-actions">
              <button
                id="start-chase-btn"
                className="btn btn-accent btn-lg launch-showcase-btn"
                onClick={onStartGame}
              >
                <Play size={20} fill="currentColor" />
                <span>START POLICE CHASE</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Navigation Arrow */}
        <button
          type="button"
          className="carousel-arrow-btn next-btn icon-btn"
          onClick={handleNext}
          aria-label="Next Vehicle"
          title="Next Vehicle (Right Arrow)"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {/* Mini Thumbnails Selector Dock */}
      <div className="thumbnails-dock">
        {CARS.map((car, idx) => {
          const isSelected = idx === activeIndex;
          return (
            <button
              key={car.id}
              type="button"
              className={`thumbnail-chip card ${isSelected ? 'active' : ''}`}
              onClick={() => handleSelectIndex(idx)}
              aria-label={`Select ${car.name}`}
            >
              <div className="thumb-preview-box">
                <img src={car.image} alt={car.name} className="thumb-img" draggable={false} />
              </div>
              <div className="thumb-info">
                <span className="thumb-name">{car.name}</span>
                <span className="thumb-stats font-mono">
                  SPD {car.stats.speed} • HDL {car.stats.handling}
                </span>
              </div>
              {isSelected && (
                <div className="thumb-check">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        .car-picker-container {
          max-width: 1080px;
          margin: 0 auto;
          padding: 24px clamp(16px, 3vw, 24px) 50px;
        }

        .picker-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .picker-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
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
          font-size: clamp(2rem, 3.8vw, 2.6rem);
          margin-bottom: 6px;
        }

        .picker-lede {
          margin: 0 auto;
          max-width: 680px;
        }

        /* Carousel Navigation Wrapper */
        .carousel-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          position: relative;
        }

        .carousel-arrow-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--surface);
          border: 2px solid var(--border);
          color: var(--text);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s var(--ease);
          flex-shrink: 0;
          box-shadow: var(--shadow-1);
        }

        .carousel-arrow-btn:hover {
          background: var(--surface-3);
          border-color: var(--border-strong);
          transform: scale(1.06);
          box-shadow: var(--shadow-2);
        }

        /* Showcase Hero Card */
        .showcase-card {
          flex: 1;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 28px;
          padding: 28px;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--r-xl);
          box-shadow: var(--shadow-2);
          align-items: center;
        }

        .showcase-stage {
          width: 100%;
          height: 330px;
          border-radius: var(--r-lg);
          background: radial-gradient(circle at center, var(--surface-2) 0%, var(--surface-3) 100%);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          overflow: hidden;
          pointer-events: none;
          user-select: none;
          -webkit-user-select: none;
        }

        .showcase-car-img {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.45));
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
        }

        .showcase-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .showcase-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .showcase-type-tag {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid;
          margin-bottom: 6px;
        }

        .showcase-car-name {
          font-family: var(--font-display);
          font-size: 1.85rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 2px;
        }

        .showcase-subtitle {
          font-size: 0.88rem;
          font-weight: 500;
          color: var(--accent);
        }

        .showcase-index-pill {
          padding: 3px 10px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--pill);
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-2);
          flex-shrink: 0;
        }

        .showcase-desc {
          font-size: 0.88rem;
          color: var(--text-2);
          line-height: 1.45;
        }

        .showcase-stats-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 14px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .stat-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-2);
        }

        .stat-name-label {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .stat-num {
          font-size: 0.8rem;
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

        .showcase-actions {
          margin-top: 6px;
        }

        .launch-showcase-btn {
          width: 100%;
          height: 52px;
          font-weight: 700;
          letter-spacing: 0.03em;
        }

        /* Thumbnails Selector Dock */
        .thumbnails-dock {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .thumbnail-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: var(--r-lg);
          background: var(--surface);
          border: 2px solid var(--border);
          cursor: pointer;
          transition: all 0.2s var(--ease);
          text-align: left;
        }

        .thumbnail-chip:hover {
          border-color: var(--border-strong);
          background: var(--surface-2);
        }

        .thumbnail-chip.active {
          border-color: var(--accent);
          background: var(--accent-soft);
        }

        .thumb-preview-box {
          width: 44px;
          height: 32px;
          border-radius: 6px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
          flex-shrink: 0;
        }

        .thumb-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          pointer-events: none;
          user-select: none;
        }

        .thumb-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .thumb-name {
          font-family: var(--font-display);
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .thumb-stats {
          font-size: 0.68rem;
          color: var(--text-2);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .thumb-check {
          color: var(--accent);
          flex-shrink: 0;
        }

        @media (max-width: 860px) {
          .showcase-card {
            grid-template-columns: 1fr;
            gap: 18px;
            padding: 20px;
          }
          .showcase-stage {
            height: 240px;
          }
          .thumbnails-dock {
            grid-template-columns: repeat(2, 1fr);
          }
          .carousel-arrow-btn {
            width: 42px;
            height: 42px;
          }
        }

        @media (max-width: 540px) {
          .carousel-wrapper {
            flex-direction: column;
          }
          .carousel-arrow-btn {
            display: none;
          }
          .thumbnails-dock {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
