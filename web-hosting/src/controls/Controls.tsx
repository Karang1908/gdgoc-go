import React from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUp,
  CircleGauge,
  Coins,
  Fuel,
  Gamepad2,
  Keyboard,
  Magnet,
  MousePointer2,
  Play,
  Shield,
  Smartphone,
  Snowflake,
  Timer,
  TriangleAlert,
  Trophy,
  Zap,
} from 'lucide-react';

interface ControlsProps {
  onStartPlaying: () => void;
}

export const Controls: React.FC<ControlsProps> = ({ onStartPlaying }) => (
  <main className="controls-page animate-fade-in">
    <div className="controls-shell">
      <header className="controls-intro">
        <button type="button" className="controls-back" onClick={onStartPlaying}>
          <ArrowLeft size={16} />
          <span>Back to garage</span>
        </button>

        <div className="controls-intro-row">
          <div>
            <h1>How to play</h1>
            <p>
              Switch lanes, read the road, and keep your getaway alive as the chase gets faster.
            </p>
          </div>
          <button type="button" className="btn btn-filled controls-start" onClick={onStartPlaying}>
            <Play size={17} fill="currentColor" />
            <span>Start playing</span>
          </button>
        </div>
      </header>

      <section className="mission-panel" aria-labelledby="mission-title">
        <div className="mission-copy">
          <h2 id="mission-title">Outrun the police. Protect the run.</h2>
          <p>
            The road accelerates and fills with traffic, obstacles, coins, fuel, and power-ups.
            Stay ahead for as long as possible, build your score, and bank the run on the leaderboard.
          </p>
        </div>
        <div className="mission-rules">
          <div className="mission-rule">
            <CircleGauge size={20} />
            <span><strong>Keep Heat above zero.</strong> Boosting gains ground; braking and crashes let the police close in.</span>
          </div>
          <div className="mission-rule">
            <Fuel size={20} />
            <span><strong>Watch the fuel gauge.</strong> Collect fuel cans before the tank reaches zero.</span>
          </div>
          <div className="mission-rule">
            <TriangleAlert size={20} />
            <span><strong>Choose the safe lane.</strong> Jumpable debris can be cleared, but traffic and tall hazards cannot.</span>
          </div>
        </div>
      </section>

      <section className="guide-section" aria-labelledby="controls-title">
        <div className="section-heading">
          <h2 id="controls-title">Controls</h2>
          <p>Each action moves one lane or triggers one immediate driving response.</p>
        </div>

        <div className="control-deck">
          <div className="control-surface">
            <div className="control-surface-title">
              <Smartphone size={21} />
              <div>
                <h3>Phone and tablet</h3>
                <p>Use quick, deliberate gestures anywhere on the game.</p>
              </div>
            </div>
            <div className="control-list">
              <div className="control-row">
                <span className="control-icon blue"><ArrowLeftRight size={18} /></span>
                <span><strong>Swipe left or right</strong><small>Change one lane</small></span>
              </div>
              <div className="control-row">
                <span className="control-icon red"><ArrowUp size={18} /></span>
                <span><strong>Swipe up</strong><small>Jump over low obstacles and reach coin arcs</small></span>
              </div>
              <div className="control-row">
                <span className="control-icon yellow"><ArrowDown size={18} /></span>
                <span><strong>Swipe down</strong><small>Brake on the road or fast-drop while airborne</small></span>
              </div>
              <div className="control-row">
                <span className="control-icon green"><Zap size={18} /></span>
                <span><strong>Double-tap</strong><small>Trigger a 1.2-second boost</small></span>
              </div>
            </div>
          </div>

          <div className="control-surface">
            <div className="control-surface-title">
              <Keyboard size={21} />
              <div>
                <h3>Keyboard and mouse</h3>
                <p>Arrow keys and WASD use the same lane-based controls.</p>
              </div>
            </div>
            <div className="key-list">
              <div className="key-row"><span><kbd>A</kbd><kbd>←</kbd></span><strong>Move left</strong></div>
              <div className="key-row"><span><kbd>D</kbd><kbd>→</kbd></span><strong>Move right</strong></div>
              <div className="key-row"><span><kbd>W</kbd><kbd>↑</kbd><kbd>Space</kbd></span><strong>Jump</strong></div>
              <div className="key-row"><span><kbd>S</kbd><kbd>↓</kbd></span><strong>Brake / fast-drop</strong></div>
              <div className="key-row"><span><kbd>Shift</kbd></span><strong>Hold to boost</strong></div>
              <div className="mouse-note"><MousePointer2 size={16} /><span>Mouse drags mirror phone swipes; two quick clicks boost.</span></div>
            </div>
          </div>

          <div className="control-surface controller-surface">
            <div className="control-surface-title">
              <Gamepad2 size={21} />
              <div>
                <h3>Xbox controller</h3>
                <p>Press any controller button once after the game opens to activate it in the browser.</p>
              </div>
            </div>
            <div className="key-list controller-key-list">
              <div className="key-row"><span><kbd>Left stick</kbd><kbd>D-Pad</kbd></span><strong>Move left or right</strong></div>
              <div className="key-row"><span><kbd>A</kbd></span><strong>Jump</strong></div>
              <div className="key-row"><span><kbd>B</kbd><kbd>↓</kbd></span><strong>Brake / fast-drop</strong></div>
              <div className="key-row"><span><kbd>RT</kbd></span><strong>Hold to boost</strong></div>
              <div className="mouse-note"><Gamepad2 size={16} /><span>You can connect or reconnect the controller while the game is running.</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="guide-section" aria-labelledby="hud-title">
        <div className="section-heading">
          <h2 id="hud-title">Read the HUD</h2>
          <p>The three values that decide whether your run continues.</p>
        </div>
        <div className="hud-strip">
          <div className="hud-item">
            <CircleGauge size={22} className="blue-text" />
            <div><strong>Heat</strong><span>Your gap from the police. A crash removes 28%; reaching zero ends the chase.</span></div>
          </div>
          <div className="hud-item">
            <Fuel size={22} className="red-text" />
            <div><strong>Fuel</strong><span>Drains with distance. Boosting burns 45% more; one can restores 35%.</span></div>
          </div>
          <div className="hud-item">
            <Trophy size={22} className="yellow-text" />
            <div><strong>Score and combo</strong><span>Distance, pickups, and near misses build the score shown during the run.</span></div>
          </div>
        </div>
      </section>

      <section className="guide-section pickup-section" aria-labelledby="pickup-title">
        <div className="section-heading">
          <h2 id="pickup-title">Pickups and power-ups</h2>
          <p>Follow valuable lines, but do not trade a safe lane for a pickup you cannot reach.</p>
        </div>

        <div className="pickup-layout">
          <div className="pickup-list">
            <h3>Road pickups</h3>
            <div className="pickup-row">
              <span className="pickup-mark coin-mark"><Coins size={18} /></span>
              <div><strong>Google-colour coins</strong><p>Base value 1. Fast consecutive collections grow your combo multiplier.</p></div>
            </div>
            <div className="pickup-row">
              <span className="pickup-mark gdg-coin-mark">
                <img src="/branding/gdg-pill.png" alt="GDG Coin" />
              </span>
              <div><strong>GDG Coin</strong><p>Base value 25</p></div>
            </div>
            <div className="pickup-row">
              <span className="pickup-mark fuel-mark"><Fuel size={18} /></span>
              <div><strong>Fuel cans</strong><p>Restore 35% of the tank. They award no points and do not extend the coin combo.</p></div>
            </div>
          </div>

          <div className="pickup-list">
            <h3>Power-ups</h3>
            <div className="power-grid">
              <div className="power-row"><Magnet size={18} /><span><strong>Magnet</strong><small>Pulls nearby coins for 8 seconds</small></span></div>
              <div className="power-row"><Zap size={18} /><span><strong>Nitro</strong><small>Automatic boost for 5 seconds</small></span></div>
              <div className="power-row"><Shield size={18} /><span><strong>Shield</strong><small>Absorbs one complete crash</small></span></div>
              <div className="power-row"><Timer size={18} /><span><strong>2×</strong><small>Doubles coin awards for 10 seconds</small></span></div>
              <div className="power-row"><Snowflake size={18} /><span><strong>Police Freeze</strong><small>Stops Heat loss for 6 seconds</small></span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="survival-notes" aria-labelledby="tips-title">
        <div className="section-heading">
          <h2 id="tips-title">Drive longer</h2>
        </div>
        <ul>
          <li>Look beyond the player car. Choose your next open lane before the obstacle reaches you.</li>
          <li>Use braking briefly. Holding it makes the police close the gap quickly.</li>
          <li>Boost to recover Heat, but leave enough fuel to reach the next can.</li>
          <li>A crash resets the coin combo. A shield protects both your Heat and the combo for one hit.</li>
          <li>Swipe down near the top of a jump to land early and prepare for the next hazard.</li>
        </ul>
      </section>

      <div className="controls-finish">
        <Gamepad2 size={25} />
        <div><strong>Ready for the chase?</strong><span>Pick any vehicle and put the route together.</span></div>
        <button type="button" className="btn btn-filled" onClick={onStartPlaying}>Go to garage</button>
      </div>
    </div>

    <style>{`
      .controls-page {
        width: 100%;
        height: 100%;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }

      .controls-shell {
        width: min(100%, 1100px);
        margin: 0 auto;
        padding: 24px clamp(16px, 4vw, 36px) max(40px, env(safe-area-inset-bottom));
      }

      .controls-intro {
        margin-bottom: 28px;
      }

      .controls-back {
        display: inline-flex;
        min-height: 40px;
        align-items: center;
        gap: 7px;
        margin-bottom: 20px;
        padding: 0 14px;
        border-radius: var(--pill);
        background: var(--surface-2);
        color: var(--text-2);
        font-weight: 500;
      }

      .controls-back:hover { color: var(--text); background: var(--surface-3); }

      /* Touch size follows the pointer, not the width: a landscape phone is
         844px wide and still needs a 44px target. */
      @media (pointer: coarse) {
        .controls-back { min-height: 44px; }
      }

      .controls-intro-row {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 28px;
      }

      .controls-intro h1 {
        margin-bottom: 10px;
        font-size: clamp(2rem, 5vw, 3.35rem);
        letter-spacing: -0.035em;
      }

      .controls-intro p {
        max-width: 68ch;
        color: var(--text-2);
        font-size: 1rem;
        line-height: 1.6;
      }

      .controls-start { flex: 0 0 auto; }

      .mission-panel {
        display: grid;
        grid-template-columns: minmax(0, 0.8fr) minmax(360px, 1.2fr);
        gap: clamp(24px, 5vw, 56px);
        align-items: center;
        margin-bottom: 52px;
        padding: clamp(22px, 4vw, 36px);
        border: 1px solid rgba(66, 133, 244, 0.45);
        border-radius: var(--r-lg);
        background: var(--accent-soft);
      }

      .mission-copy h2,
      .guide-section h2 {
        margin-bottom: 8px;
        font-size: clamp(1.35rem, 2.6vw, 1.8rem);
        font-weight: 500;
      }

      .mission-copy p,
      .section-heading p {
        color: var(--text-2);
        line-height: 1.55;
      }

      .mission-rules { display: grid; gap: 14px; }

      .mission-rule {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        gap: 10px;
        align-items: start;
        color: var(--text-2);
        font-size: 0.9rem;
        line-height: 1.45;
      }

      .mission-rule svg { margin-top: 1px; color: var(--accent); }
      .mission-rule strong { color: var(--text); }

      .guide-section { margin-bottom: 52px; }
      .section-heading { margin-bottom: 18px; }
      .section-heading h2 { margin-bottom: 5px; }

      .control-deck {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
      }

      .control-surface {
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: var(--r-lg);
        background: var(--surface);
      }

      .control-surface-title {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        padding: 18px;
        border-bottom: 1px solid var(--border);
        background: var(--surface-2);
      }

      .control-surface-title > svg { flex: 0 0 auto; color: var(--accent); }
      .control-surface-title h3 { margin-bottom: 2px; font-size: 1rem; font-weight: 500; }
      .control-surface-title p { color: var(--text-2); font-size: 0.78rem; line-height: 1.4; }
      .control-list, .key-list { padding: 8px 18px 12px; }

      .controller-key-list .key-row > span:first-child {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }

      .control-row {
        display: grid;
        grid-template-columns: 36px minmax(0, 1fr);
        gap: 11px;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid var(--border-subtle);
      }

      .control-row:last-child { border-bottom: 0; }
      .control-row > span:last-child { display: flex; min-width: 0; flex-direction: column; }
      .control-row strong { font-size: 0.85rem; }
      .control-row small { color: var(--text-2); font-size: 0.75rem; line-height: 1.35; }

      .control-icon {
        display: grid;
        width: 34px;
        height: 34px;
        place-items: center;
        border-radius: 11px;
      }

      .control-icon.blue { color: var(--g-blue); background: rgba(66, 133, 244, 0.13); }
      .control-icon.red { color: var(--g-red); background: rgba(234, 67, 53, 0.13); }
      .control-icon.yellow { color: #9a6b00; background: rgba(251, 188, 4, 0.16); }
      .control-icon.green { color: var(--g-green); background: rgba(52, 168, 83, 0.13); }
      :root[data-theme='dark'] .control-icon.yellow { color: #fdd663; }

      .key-row {
        display: flex;
        min-height: 47px;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border-bottom: 1px solid var(--border-subtle);
      }

      .key-row > span { display: flex; align-items: center; gap: 5px; }
      .key-row strong { font-size: 0.82rem; text-align: right; }

      kbd {
        display: inline-grid;
        min-width: 30px;
        height: 28px;
        padding: 0 8px;
        place-items: center;
        border: 1px solid var(--border-strong);
        border-radius: 7px;
        background: var(--surface-2);
        color: var(--text);
        font-family: var(--font-ui);
        font-size: 0.75rem;
        font-weight: 500;
        box-shadow: 0 2px 0 var(--border);
      }

      .mouse-note {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-top: 12px;
        color: var(--text-2);
        font-size: 0.75rem;
      }

      .hud-strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: var(--r-lg);
        background: var(--surface);
      }

      .hud-item {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        gap: 10px;
        padding: 20px;
      }

      .hud-item + .hud-item { border-left: 1px solid var(--border); }
      .hud-item strong, .hud-item span { display: block; }
      .hud-item strong { margin-bottom: 3px; font-size: 0.9rem; }
      .hud-item span { color: var(--text-2); font-size: 0.75rem; line-height: 1.45; }
      .blue-text { color: var(--g-blue); }
      .red-text { color: var(--g-red); }
      .yellow-text { color: var(--g-yellow); }

      .pickup-layout {
        display: grid;
        grid-template-columns: 0.95fr 1.05fr;
        gap: 16px;
      }

      .pickup-list {
        padding: 20px;
        border: 1px solid var(--border);
        border-radius: var(--r-lg);
        background: var(--surface);
      }

      .pickup-list h3 { margin-bottom: 14px; font-size: 1rem; font-weight: 500; }

      .pickup-row {
        display: grid;
        grid-template-columns: 38px minmax(0, 1fr);
        gap: 11px;
        padding: 11px 0;
        border-bottom: 1px solid var(--border-subtle);
      }

      .pickup-row:last-child { border-bottom: 0; }
      .pickup-row strong { font-size: 0.84rem; }
      .pickup-row p { color: var(--text-2); font-size: 0.75rem; line-height: 1.45; }

      .pickup-mark {
        display: grid;
        width: 36px;
        height: 36px;
        place-items: center;
        border-radius: 11px;
      }

      .coin-mark { color: #9a6b00; background: rgba(251, 188, 4, 0.16); }
      .gdg-coin-mark { background: rgba(66, 133, 244, 0.13); }
      .gdg-coin-mark img { width: 22px; height: 22px; object-fit: contain; }
      .fuel-mark { color: var(--g-red); background: rgba(234, 67, 53, 0.13); }
      :root[data-theme='dark'] .coin-mark { color: #fdd663; }

      .power-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; }
      .power-row { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 8px; align-items: start; padding: 9px 0; }
      .power-row svg { color: var(--accent); margin-top: 1px; }
      .power-row span { display: flex; flex-direction: column; }
      .power-row strong { font-size: 0.82rem; }
      .power-row small { color: var(--text-2); font-size: 0.75rem; line-height: 1.35; }

      .survival-notes { margin-bottom: 52px; }
      .survival-notes ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 36px; padding-left: 20px; }
      .survival-notes li { padding-left: 4px; color: var(--text-2); font-size: 0.84rem; line-height: 1.5; }
      .survival-notes li::marker { color: var(--accent); }

      .controls-finish {
        display: grid;
        grid-template-columns: 34px minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
        padding: 18px 20px;
        border: 1px solid var(--border);
        border-radius: var(--r-lg);
        background: var(--surface);
      }

      .controls-finish > svg { color: var(--accent); }
      .controls-finish div { display: flex; flex-direction: column; }
      .controls-finish strong { font-size: 0.95rem; }
      .controls-finish span { color: var(--text-2); font-size: 0.76rem; }

      @media (max-width: 760px) {
        .controls-shell { padding: 14px 10px max(28px, env(safe-area-inset-bottom)); }
        .controls-intro { margin-bottom: 18px; }
        .controls-back { min-height: 44px; margin-bottom: 12px; }
        .controls-intro-row { display: grid; gap: 16px; align-items: start; }
        .controls-intro h1 { margin-bottom: 6px; font-size: 2rem; }
        .controls-intro p { font-size: 0.86rem; line-height: 1.5; }
        .controls-start { min-height: 48px; justify-self: start; }
        .mission-panel { grid-template-columns: 1fr; gap: 20px; margin-bottom: 36px; padding: 18px; }
        .guide-section { margin-bottom: 36px; }
        .control-deck,
        .pickup-layout { grid-template-columns: 1fr; }
        .hud-strip { grid-template-columns: 1fr; }
        .hud-item { padding: 15px; }
        .hud-item + .hud-item { border-top: 1px solid var(--border); border-left: 0; }
        .survival-notes { margin-bottom: 36px; }
        .survival-notes ul { grid-template-columns: 1fr; gap: 9px; }
      }

      @media (min-width: 761px) and (max-width: 980px) {
        .control-deck { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .controller-surface { grid-column: 1 / -1; }
        .controller-key-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          column-gap: 24px;
        }
        .controller-key-list .mouse-note { grid-column: 1 / -1; }
      }

      @media (max-width: 440px) {
        .power-grid { grid-template-columns: 1fr; gap: 2px; }
        .controls-finish { grid-template-columns: 30px minmax(0, 1fr); }
        .controls-finish .btn { grid-column: 1 / -1; width: 100%; min-height: 48px; }
        .key-row { align-items: flex-start; flex-direction: column; justify-content: center; gap: 5px; padding: 8px 0; }
        .key-row strong { text-align: left; }
      }
    `}</style>
  </main>
);

export default Controls;
