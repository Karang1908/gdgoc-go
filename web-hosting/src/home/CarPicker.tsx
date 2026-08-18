import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Play, Gauge, Shield, Zap, Check, Coins, ChevronLeft, ChevronRight } from 'lucide-react';
import { CARS, CarOption } from '../data/cars';
import { useAuth } from '../context/AuthContext';
import { CarShowcase3D } from '../components/CarShowcase3D';

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

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

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

  // Touch swipe support for mobile phones & tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const diffX = touchStartXRef.current - e.changedTouches[0].clientX;
    const diffY = touchStartYRef.current - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
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
                <Coins size={13} className="coin-svg" />
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
          Swipe or navigate left and right to select your getaway vehicle. Each chassis features distinct handling, top speed, and collision durability.
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
          title="Previous Vehicle (Left Arrow / Swipe Right)"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Focused Hero Vehicle Card */}
        <div
          className="showcase-card card"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="showcase-stage" onContextMenu={(e) => e.preventDefault()}>
            <CarShowcase3D
              key={activeCar.id}
              carId={activeCar.id}
              fallbackImage={activeCar.image}
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
                    <Zap size={13} style={{ color: 'var(--g-blue)' }} />
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
                    <Gauge size={13} style={{ color: 'var(--g-yellow)' }} />
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
                    <Shield size={13} style={{ color: 'var(--g-green)' }} />
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
                className="btn btn-filled btn-lg launch-showcase-btn"
                onClick={onStartGame}
              >
                <Play size={18} fill="currentColor" />
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
          title="Next Vehicle (Right Arrow / Swipe Left)"
        >
          <ChevronRight size={22} />
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
          height: 100%;
          max-height: 100%;
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          padding: clamp(4px, 1.2vh, 12px) clamp(10px, 3vw, 24px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          box-sizing: border-box;
        }

        .picker-header {
          flex: 0 0 auto;
          text-align: center;
          margin-bottom: clamp(2px, 0.8vh, 8px);
        }

        .picker-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2px;
          flex-wrap: wrap;
          gap: 6px;
        }

        .garage-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 2px 8px;
          background: var(--surface-3);
          border: 1px solid var(--border);
          border-radius: var(--pill);
          font-family: var(--font-display);
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-2);
          letter-spacing: 0.04em;
        }

        .picker-wallet-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .wallet-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 26px;
          padding: 0 8px;
          border-radius: var(--pill);
          font-size: 0.72rem;
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
          width: 12px;
          height: 12px;
          object-fit: contain;
        }

        .wallet-chip-lbl {
          font-size: 0.58rem;
          font-weight: 800;
          opacity: 0.8;
          letter-spacing: 0.04em;
        }

        .picker-title {
          font-size: clamp(1.3rem, 2.4vw, 1.85rem);
          margin-bottom: 2px;
          line-height: 1.15;
          letter-spacing: -0.02em;
        }

        .picker-lede {
          margin: 0 auto;
          max-width: 580px;
          font-size: clamp(0.74rem, 1.4vw, 0.84rem);
          line-height: 1.3;
          color: var(--text-2);
        }

        /* Carousel Navigation Wrapper */
        .carousel-wrapper {
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          align-items: center;
          gap: clamp(6px, 1.5vw, 14px);
          margin-bottom: clamp(4px, 1vh, 10px);
          position: relative;
          width: 100%;
        }

        .carousel-arrow-btn {
          width: 40px;
          height: 40px;
          min-width: 40px;
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
          touch-action: manipulation;
        }

        .carousel-arrow-btn:active {
          transform: scale(0.92);
        }

        /* Showcase Hero Card */
        .showcase-card {
          flex: 1 1 auto;
          min-height: 0;
          height: 100%;
          max-height: 100%;
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: clamp(10px, 2vw, 18px);
          padding: clamp(8px, 1.6vh, 16px) clamp(12px, 2vw, 20px);
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--r-xl);
          box-shadow: var(--shadow-2);
          align-items: center;
          touch-action: pan-y;
          user-select: none;
          box-sizing: border-box;
          overflow: hidden;
        }

        .showcase-stage {
          width: 100%;
          height: 100%;
          max-height: clamp(140px, 32vh, 260px);
          min-height: 110px;
          border-radius: var(--r-lg);
          background: radial-gradient(circle at center, var(--surface-2) 0%, var(--surface-3) 100%);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          overflow: hidden;
          pointer-events: none;
          user-select: none;
          -webkit-user-select: none;
        }

        .showcase-details {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          gap: clamp(4px, 1vh, 8px);
          overflow: hidden;
        }

        .showcase-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 6px;
        }

        .showcase-type-tag {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 0.62rem;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid;
          margin-bottom: 1px;
        }

        .showcase-car-name {
          font-family: var(--font-display);
          font-size: clamp(1.15rem, 2vw, 1.55rem);
          font-weight: 700;
          color: var(--text);
          margin-bottom: 0px;
          line-height: 1.15;
        }

        .showcase-subtitle {
          font-size: 0.74rem;
          font-weight: 500;
          color: var(--accent);
        }

        .showcase-index-pill {
          padding: 1px 6px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--pill);
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-2);
          flex-shrink: 0;
        }

        .showcase-desc {
          font-size: 0.76rem;
          color: var(--text-2);
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .showcase-stats-grid {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 6px 10px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--r-md);
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.68rem;
          font-weight: 500;
          color: var(--text-2);
        }

        .stat-name-label {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .stat-num {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text);
        }

        .stat-track {
          height: 4px;
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
          margin-top: 2px;
        }

        .launch-showcase-btn {
          width: 100%;
          height: 42px;
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 0.02em;
          touch-action: manipulation;
          background: var(--g-green) !important;
          color: #ffffff !important;
          border: none !important;
          border-radius: var(--pill) !important;
          box-shadow: 0 4px 14px rgba(52, 168, 83, 0.35);
        }

        .launch-showcase-btn:hover {
          background: #2d9249 !important;
        }

        /* Thumbnails Selector Dock */
        .thumbnails-dock {
          flex: 0 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          width: 100%;
          margin-bottom: 2px;
        }

        .thumbnail-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 8px;
          height: 38px;
          border-radius: var(--r-md);
          background: var(--surface);
          border: 2px solid var(--border);
          cursor: pointer;
          transition: all 0.2s var(--ease);
          text-align: left;
          touch-action: manipulation;
          box-sizing: border-box;
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
          width: 32px;
          height: 22px;
          border-radius: 4px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1px;
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
          font-size: 0.74rem;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .thumb-stats {
          font-size: 0.6rem;
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
          .car-picker-container {
            padding: 4px 8px 8px;
          }
          .showcase-card {
            grid-template-columns: 1fr;
            gap: 8px;
            padding: 10px 12px;
          }
          .showcase-stage {
            max-height: clamp(120px, 22vh, 160px);
          }
          .showcase-desc {
            display: none;
          }
          .thumbnails-dock {
            grid-template-columns: repeat(4, 1fr);
            gap: 5px;
          }
          .thumb-stats {
            display: none;
          }
          .thumbnail-chip {
            padding: 4px 6px;
            height: 34px;
          }
          .carousel-arrow-btn {
            width: 34px;
            height: 34px;
            min-width: 34px;
          }
        }
      `}</style>
    </div>
  );
};
