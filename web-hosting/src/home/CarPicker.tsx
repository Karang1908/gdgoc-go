import React, { lazy, Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { Play, Check, Coins, ChevronLeft, ChevronRight } from 'lucide-react';
import { CARS, CarOption } from '../data/cars';
import { useAuth } from '../context/AuthContext';

const CarShowcase3D = lazy(() => import('../components/CarShowcase3D').then((module) => ({
  default: module.CarShowcase3D,
})));

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
  const [use3DPreview, setUse3DPreview] = useState<boolean>(false);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 861px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const update = () => setUse3DPreview(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  // Sync state if selectedCarId changes from external props
  useEffect(() => {
    const idx = CARS.findIndex((c) => c.id === selectedCarId);
    if (idx !== -1 && idx !== activeIndex) {
      setActiveIndex(idx);
    }
  }, [selectedCarId]);

  const activeCar: CarOption = CARS[activeIndex] || CARS[0];

  const tapFeedback = () => {
    navigator.vibrate?.(8);
  };

  const handlePrev = useCallback(() => {
    const nextIdx = (activeIndex - 1 + CARS.length) % CARS.length;
    navigator.vibrate?.(8);
    setActiveIndex(nextIdx);
    onSelectCar(CARS[nextIdx].id);
  }, [activeIndex, onSelectCar]);

  const handleNext = useCallback(() => {
    const nextIdx = (activeIndex + 1) % CARS.length;
    navigator.vibrate?.(8);
    setActiveIndex(nextIdx);
    onSelectCar(CARS[nextIdx].id);
  }, [activeIndex, onSelectCar]);

  const handleSelectIndex = (idx: number) => {
    tapFeedback();
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
          Pick your vehicle, then start the chase. Swipe or use the arrows to browse the garage.
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
            {use3DPreview ? (
              <Suspense fallback={<img src={activeCar.image} alt={activeCar.name} className="showcase-static-car" draggable={false} />}>
                <CarShowcase3D
                  key={activeCar.id}
                  carId={activeCar.id}
                  fallbackImage={activeCar.image}
                />
              </Suspense>
            ) : (
              <img src={activeCar.image} alt={activeCar.name} className="showcase-static-car" draggable={false} />
            )}
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

            <div className="vehicle-stat-bars" aria-label={`${activeCar.name} vehicle profile`}>
              {([
                ['Speed', activeCar.stats.speed, 'var(--g-blue)'],
                ['Handling', activeCar.stats.handling, 'var(--g-red)'],
                ['Armor', activeCar.stats.durability, 'var(--g-yellow)'],
              ] as const).map(([label, value, color]) => (
                <div className="vehicle-stat" key={label}>
                  <div className="vehicle-stat-label">
                    <span>{label}</span>
                    <span className="font-mono">{value}</span>
                  </div>
                  <div className="vehicle-stat-track" aria-hidden="true">
                    <span style={{ width: `${value}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Actions Bar */}
            <div className="showcase-actions">
              <button
                id="start-chase-btn"
                className="btn btn-filled btn-lg launch-showcase-btn"
                onClick={() => {
                  navigator.vibrate?.(14);
                  onStartGame();
                }}
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
                  {car.subtitle}
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
          max-width: 960px;
          margin: 0 auto;
          padding: clamp(6px, 1.8vh, 16px) clamp(12px, 3vw, 24px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: clamp(8px, 1.6vh, 18px);
          overflow: hidden;
          box-sizing: border-box;
        }

        .picker-header {
          width: 100%;
          text-align: center;
          flex-shrink: 0;
        }

        .picker-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
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
          font-size: clamp(1.35rem, 2.6vw, 1.85rem);
          margin-bottom: 2px;
          line-height: 1.15;
          letter-spacing: -0.02em;
        }

        .picker-lede {
          margin: 0 auto;
          max-width: 580px;
          font-size: clamp(0.75rem, 1.4vw, 0.84rem);
          line-height: 1.35;
          color: var(--text-2);
        }

        /* Carousel Navigation Wrapper */
        .carousel-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(10px, 2vw, 20px);
          width: 100%;
          flex-shrink: 1;
          min-height: 0;
        }

        .carousel-arrow-btn {
          width: 42px;
          height: 42px;
          min-width: 42px;
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
          width: 100%;
          max-width: 860px;
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: clamp(16px, 2.5vw, 28px);
          padding: clamp(14px, 2vh, 24px) clamp(16px, 2.5vw, 28px);
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--r-xl);
          box-shadow: var(--shadow-2);
          align-items: stretch;
          touch-action: pan-y;
          user-select: none;
          box-sizing: border-box;
          overflow: hidden;
        }

        .showcase-stage {
          width: 100%;
          min-height: 180px;
          max-height: 280px;
          border-radius: var(--r-lg);
          background: radial-gradient(circle at center, var(--surface-2) 0%, var(--surface-3) 100%);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          overflow: hidden;
          pointer-events: none;
          user-select: none;
          -webkit-user-select: none;
          box-sizing: border-box;
        }

        .showcase-static-car {
          width: min(92%, 360px);
          height: min(92%, 240px);
          object-fit: contain;
          filter: drop-shadow(0 14px 24px rgba(0, 0, 0, 0.32));
          user-select: none;
          pointer-events: none;
        }

        .showcase-details {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: clamp(8px, 1.2vh, 12px);
          box-sizing: border-box;
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
          font-size: clamp(1.2rem, 2vw, 1.6rem);
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
          padding: 2px 8px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--pill);
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-2);
          flex-shrink: 0;
        }

        .showcase-desc {
          font-size: 0.78rem;
          color: var(--text-2);
          line-height: 1.35;
        }

        .vehicle-stat-bars {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .vehicle-stat {
          min-width: 0;
        }

        .vehicle-stat-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          margin-bottom: 4px;
          color: var(--text-2);
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .vehicle-stat-label .font-mono {
          color: var(--text);
          font-size: 0.64rem;
        }

        .vehicle-stat-track {
          height: 6px;
          overflow: hidden;
          border-radius: var(--pill);
          background: var(--surface-3);
        }

        .vehicle-stat-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
        }

        .showcase-actions {
          margin-top: 2px;
        }

        .launch-showcase-btn {
          width: 100%;
          min-height: 48px;
          font-weight: 700;
          font-size: 0.88rem;
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
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: clamp(6px, 1.2vw, 10px);
          width: 100%;
          max-width: 860px;
          flex-shrink: 0;
        }

        .thumbnail-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          height: 40px;
          border-radius: var(--r-md);
          background: var(--surface);
          border: 2px solid var(--border);
          cursor: pointer;
          transition: all 0.2s var(--ease);
          text-align: left;
          touch-action: manipulation;
          box-sizing: border-box;
          min-width: 0;
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
          min-width: 0;
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
            justify-content: flex-start;
            padding: 8px 10px max(10px, env(safe-area-inset-bottom));
            gap: clamp(6px, 1.1vh, 9px);
            overflow: hidden;
            overscroll-behavior: contain;
          }
          .picker-header {
            max-width: 440px;
            margin-top: auto;
          }
          .picker-header-top {
            display: none;
          }
          .picker-title {
            font-size: clamp(1.18rem, 5.6vw, 1.45rem);
          }
          .picker-lede {
            max-width: 390px;
            font-size: clamp(0.68rem, 3vw, 0.78rem);
            line-height: 1.25;
          }
          .showcase-card {
            grid-template-columns: 1fr;
            gap: clamp(5px, 0.8vh, 8px);
            padding: clamp(7px, 1vh, 10px);
            max-width: 440px;
            min-width: 0;
            border-radius: 18px;
          }
          .showcase-stage {
            height: clamp(108px, 20vh, 154px);
            min-height: 0;
            max-height: none;
            border-radius: 14px;
            padding: 4px;
          }
          .showcase-desc {
            display: none;
          }
          .showcase-details {
            gap: clamp(5px, 0.8vh, 8px);
          }
          .showcase-car-name {
            font-size: clamp(1.08rem, 5vw, 1.32rem);
          }
          .showcase-subtitle {
            font-size: 0.68rem;
          }
          .showcase-type-tag {
            font-size: 0.56rem;
          }
          .thumbnails-dock {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 4px;
            max-width: 440px;
            min-width: 0;
            margin-bottom: auto;
          }
          .thumb-stats {
            display: none;
          }
          .thumbnail-chip {
            position: relative;
            flex-direction: column;
            justify-content: center;
            gap: 1px;
            height: 44px;
            min-height: 44px;
            padding: 4px;
            border-radius: 10px;
            overflow: hidden;
          }
          .thumb-preview-box {
            width: 24px;
            height: 18px;
          }
          .thumb-info {
            width: 100%;
            flex: 0 1 auto;
            text-align: center;
          }
          .thumb-name {
            font-size: clamp(0.5rem, 2.2vw, 0.58rem);
            line-height: 1;
          }
          .thumb-check {
            position: absolute;
            top: 2px;
            right: 2px;
            display: grid;
            width: 15px;
            height: 15px;
            place-items: center;
            border-radius: 50%;
            background: var(--accent-soft);
          }
          .thumb-check svg {
            width: 10px;
            height: 10px;
          }
          .carousel-arrow-btn {
            position: absolute;
            top: calc(clamp(54px, 10vh, 77px) - 12px);
            z-index: 3;
            width: 48px;
            height: 48px;
            min-width: 48px;
            background: rgba(10, 10, 10, 0.82);
            border-color: rgba(255, 255, 255, 0.22);
            color: #ffffff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          .carousel-wrapper {
            position: relative;
            display: block;
            max-width: 440px;
            min-width: 0;
          }
          .carousel-arrow-btn.prev-btn { left: 8px; }
          .carousel-arrow-btn.next-btn { right: 8px; }
          .vehicle-stat-bars { gap: 8px; }
          .vehicle-stat-label {
            margin-bottom: 3px;
            font-size: 0.56rem;
          }
          .vehicle-stat-label .font-mono {
            font-size: 0.58rem;
          }
          .vehicle-stat-track {
            height: 5px;
          }
          .launch-showcase-btn {
            min-height: 46px;
            height: 46px;
            font-size: clamp(0.72rem, 3.4vw, 0.86rem);
          }
        }

        @media (max-width: 600px) {
          .car-picker-container {
            justify-content: center;
            padding: clamp(10px, 1.8vh, 16px) 12px max(12px, env(safe-area-inset-bottom));
            gap: clamp(10px, 1.4vh, 14px);
          }
          .picker-header,
          .carousel-wrapper,
          .thumbnails-dock {
            max-width: 420px;
          }
          .picker-header {
            margin-top: 0;
          }
          .picker-title {
            font-size: clamp(1.35rem, 6vw, 1.6rem);
          }
          .picker-lede {
            max-width: 350px;
            font-size: clamp(0.76rem, 3.2vw, 0.84rem);
            line-height: 1.3;
            text-wrap: balance;
          }
          .carousel-wrapper {
            height: clamp(390px, 58vh, 500px);
            flex: 0 1 auto;
          }
          .showcase-card {
            height: 100%;
            grid-template-rows: minmax(0, 1fr) auto;
            gap: 8px;
            padding: 8px;
            border-radius: 20px;
          }
          .showcase-stage {
            height: 100%;
            min-height: 0;
            max-height: none;
            border-radius: 15px;
            padding: 8px;
          }
          .showcase-static-car {
            width: min(94%, 360px);
            height: min(92%, 270px);
          }
          .showcase-details {
            gap: 8px;
            padding: 2px 3px 1px;
          }
          .showcase-car-name {
            font-size: clamp(1.24rem, 5.8vw, 1.48rem);
          }
          .showcase-subtitle {
            font-size: 0.74rem;
          }
          .showcase-type-tag {
            font-size: 0.58rem;
          }
          .showcase-index-pill {
            padding: 3px 9px;
            font-size: 0.72rem;
          }
          .vehicle-stat-bars {
            gap: 10px;
          }
          .vehicle-stat-label {
            margin-bottom: 4px;
            font-size: 0.6rem;
          }
          .vehicle-stat-label .font-mono {
            font-size: 0.62rem;
          }
          .vehicle-stat-track {
            height: 6px;
          }
          .launch-showcase-btn {
            height: 52px;
            min-height: 52px;
            font-size: clamp(0.8rem, 3.6vw, 0.92rem);
          }
          .carousel-arrow-btn {
            top: 32%;
            transform: translateY(-50%);
          }
          .carousel-arrow-btn:active {
            transform: translateY(-50%) scale(0.92);
          }
          .thumbnails-dock {
            gap: 6px;
            margin-bottom: 0;
          }
          .thumbnail-chip {
            height: 54px;
            min-height: 54px;
            gap: 2px;
            padding: 5px 3px;
            border-radius: 12px;
          }
          .thumb-preview-box {
            width: 27px;
            height: 20px;
          }
          .thumb-name {
            font-size: clamp(0.56rem, 2.45vw, 0.66rem);
          }
        }

        @media (max-width: 420px) {
          .carousel-arrow-btn {
            width: 44px;
            height: 44px;
            min-width: 44px;
          }
          .showcase-card { padding: 7px; }
          .thumb-preview-box { width: 22px; }
        }

        @media (max-width: 360px) {
          .car-picker-container {
            padding-inline: 7px;
          }
          .picker-wallet-group .wallet-chip.standard,
          .wallet-chip-lbl,
          .thumb-info {
            display: none;
          }
          .thumbnail-chip {
            justify-content: center;
          }
        }

        @media (max-width: 600px) and (max-height: 700px) {
          .picker-lede {
            display: none;
          }
          .car-picker-container {
            gap: 7px;
          }
          .carousel-wrapper {
            height: clamp(330px, 59vh, 390px);
          }
          .showcase-stage {
            height: 100%;
          }
          .thumbnail-chip {
            height: 46px;
            min-height: 46px;
          }
        }

        @media (max-width: 600px) and (max-height: 580px) {
          .garage-badge,
          .picker-wallet-group {
            display: none;
          }
          .picker-title {
            font-size: 1.18rem;
          }
          .carousel-wrapper {
            height: 310px;
          }
          .showcase-stage {
            height: 100%;
          }
          .launch-showcase-btn {
            height: 46px;
            min-height: 46px;
          }
        }

        @media (max-width: 900px) and (max-height: 520px) and (orientation: landscape) {
          .car-picker-container {
            justify-content: center;
            gap: 6px;
            max-width: 900px;
            padding: 6px max(12px, env(safe-area-inset-right)) 6px max(12px, env(safe-area-inset-left));
          }
          .picker-header {
            display: none;
          }
          .carousel-wrapper {
            display: flex;
            width: min(100%, 760px);
            max-width: 760px;
            height: clamp(190px, calc(100vh - 118px), 230px);
          }
          .showcase-card {
            height: 100%;
            max-width: 720px;
            grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
            grid-template-rows: minmax(0, 1fr);
            gap: 10px;
            padding: 7px;
          }
          .showcase-stage {
            height: 100%;
            min-height: 0;
            max-height: none;
          }
          .showcase-details {
            justify-content: center;
            gap: 5px;
            padding: 0 4px;
          }
          .showcase-car-name {
            font-size: 1.12rem;
          }
          .showcase-subtitle {
            font-size: 0.66rem;
          }
          .showcase-type-tag {
            font-size: 0.52rem;
          }
          .vehicle-stat-label {
            margin-bottom: 2px;
            font-size: 0.52rem;
          }
          .vehicle-stat-label .font-mono {
            font-size: 0.54rem;
          }
          .vehicle-stat-track {
            height: 4px;
          }
          .launch-showcase-btn {
            height: 42px;
            min-height: 42px;
            font-size: 0.74rem;
          }
          .carousel-arrow-btn {
            top: 50%;
            transform: translateY(-50%);
          }
          .carousel-arrow-btn:active {
            transform: translateY(-50%) scale(0.92);
          }
          .thumbnails-dock {
            width: min(100%, 720px);
            max-width: 720px;
            margin: 0;
          }
          .thumbnail-chip {
            height: 40px;
            min-height: 40px;
            padding: 3px;
          }
        }
      `}</style>
    </div>
  );
};
