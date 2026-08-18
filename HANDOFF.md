# GDG Go — Comprehensive Handoff Document

> **Generated:** 2026-08-18  
> **Branch:** `main` — Latest commit: `57242fc`  
> **Repo:** `https://github.com/Karang1908/gdgoc-go.git`

---

## Table of Contents

1. [What Is This Project](#1-what-is-this-project)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Repository Structure](#3-repository-structure)
4. [Unity Game Engine — Full Breakdown](#4-unity-game-engine--full-breakdown)
5. [React Website — Full Breakdown](#5-react-website--full-breakdown)
6. [Fullscreen Architecture — The Hard Problem](#6-fullscreen-architecture--the-hard-problem)
7. [Build & Deployment Pipeline](#7-build--deployment-pipeline)
8. [Supabase Database](#8-supabase-database)
9. [Design Decisions & Why They Were Made](#9-design-decisions--why-they-were-made)
10. [Known Landmines & Gotchas](#10-known-landmines--gotchas)
11. [All Tuning Parameters — Master Reference](#11-all-tuning-parameters--master-reference)
12. [Git Commit History](#12-git-commit-history)
13. [Current State & Open Items](#13-current-state--open-items)

---

## 1. What Is This Project

**GDG Go** is a 3D endless runner game built for a Google Developer Group (GDG) community event. The design pitch is:

> *"Subway Surfers, but you're the getaway car."*

The player picks a car from a garage, starts a police chase, dodges traffic and obstacles, collects Google-colored coins, manages fuel, and tries to outrun the police for as long as possible. Scores are submitted to a live Supabase leaderboard.

The game is a **Unity 6 LTS WebGL build** embedded inside a **React + TypeScript + Vite** website, deployed on **Netlify**. The Unity game runs inside an `<iframe>` and communicates with the React shell via `postMessage`.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Netlify CDN (static)                    │
│                                                         │
│   ┌───────────────────────────────────────────────┐     │
│   │         React SPA (Vite + TypeScript)         │     │
│   │                                               │     │
│   │   Home.tsx ─┬─ CarPicker.tsx (Garage)         │     │
│   │             └─ GameView.tsx (Active Race)     │     │
│   │                  │                             │     │
│   │                  ├── UnityEmbed.tsx (iframe)   │     │
│   │                  ├── ResultOverlay.tsx          │     │
│   │                  └── bgm.ts (Web Audio)        │     │
│   │                                               │     │
│   │   AuthContext.tsx ──── Supabase Auth           │     │
│   │   api.ts ──────────── Supabase Database       │     │
│   │   Leaderboard.tsx ─── Live Rankings           │     │
│   └──────────────────────┬────────────────────────┘     │
│                          │ postMessage                   │
│   ┌──────────────────────▼────────────────────────┐     │
│   │         Unity WebGL Build (iframe)             │     │
│   │                                               │     │
│   │   GameSession ─── WorldScroller ─── PlayerCar │     │
│   │   CoinSpawner  ── ObstacleSpawner ── PoliceAI │     │
│   │   TrafficSpawner ─ PedestrianSpawner          │     │
│   │   AudioManager  ── HUD ── EnvironmentDirector │     │
│   │                                               │     │
│   │   PostMessageBridge.jslib ──► parent.postMsg   │     │
│   └───────────────────────────────────────────────┘     │
│                                                         │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
                ┌──────────▼──────────┐
                │     Supabase        │
                │  (Postgres + Auth)  │
                │                     │
                │  users, scores,     │
                │  leaderboard tables │
                └─────────────────────┘
```

**Data flow for a single game:**
1. User signs in (username/password → Supabase Auth)
2. User picks a car in CarPicker → clicks "START POLICE CHASE"
3. `Home.tsx` calls `requestFullscreen()` on `#game-fullscreen-root`, then `setIsPlaying(true)`
4. React swaps CarPicker for GameView → Unity iframe loads with JWT + car ID in URL params
5. Unity game runs. On death → `PostMessageBridge.jslib` sends `{ type: 'gameover', score, coins, pills, distance, duration, reason }` to parent window
6. GameView receives the message, submits score to Supabase, waits 2 seconds, exits fullscreen, shows ResultOverlay
7. User can Play Again (remounts iframe with new `key`) or navigate to Leaderboard

---

## 3. Repository Structure

```
gdg-go/
├── .gitignore
├── CLAUDE.md                   # Core architecture invariants (legacy reference)
├── HANDOFF.md                  # ← This file
├── PLAN.md                     # Original game implementation plan
├── PLAN-website.md             # Website integration architecture plan
├── README.md                   # Quick start & tuning table
├── Branding/                   # GDG logo & pill coin source art
├── docs/
│   ├── ASSETS.md               # CC0 asset pack sourcing & licenses
│   ├── PROJECT.md              # Original game design document
│   ├── SETUP_GUIDE.md          # Step-by-step Unity + Supabase setup
│   └── WEBSITE.md              # Web hosting specification
├── supabase/
│   └── migrations/             # 4 SQL migration files (see §8)
├── tools/
│   └── compile-check/          # Offline C# compile validator (.NET 8)
├── unity-project/              # Unity 6 LTS WebGL project
│   ├── Assets/
│   │   ├── Scripts/            # 24 C# scripts across 11 modules (see §4)
│   │   ├── Plugins/WebGL/      # PostMessageBridge.jslib
│   │   ├── Scenes/Game.unity   # Single game scene
│   │   ├── Prefabs/            # Player, Police, Traffic, Coins, etc.
│   │   ├── Models/             # Kenney + Quaternius 3D models
│   │   ├── Materials/          # Coin, road, glow materials
│   │   ├── FastMesh/           # Low-poly cone & barrier obstacles
│   │   ├── Audio/              # SFX clips
│   │   └── Editor/             # 11 editor-only tools
│   ├── Packages/
│   └── ProjectSettings/
└── web-hosting/                # React + Vite SPA
    ├── .env                    # Supabase URL + anon key
    ├── netlify.toml            # Build command, redirects, Brotli headers
    ├── package.json
    ├── scripts/
    │   └── copy-unity.js       # Copies + patches Unity build (see §7.2)
    ├── public/
    │   ├── Build/              # Unity WebGL build output (gitignored, copied at build)
    │   └── branding/           # Hero images and pill icons
    └── src/
        ├── App.tsx             # Root router (Home | Leaderboard)
        ├── main.tsx            # React DOM 18 bootstrap
        ├── components/
        │   ├── Navbar.tsx      # Sticky top bar with driver info
        │   └── UnityEmbed.tsx  # Responsive iframe wrapper
        ├── context/
        │   └── AuthContext.tsx # Supabase auth, session, cumulative coins
        ├── data/
        │   └── cars.ts        # 4 vehicle definitions with stats
        ├── home/
        │   ├── Home.tsx        # Hero (unauth) + game wrapper (auth)
        │   ├── AuthModal.tsx   # Sign in / sign up modal
        │   ├── CarPicker.tsx   # Garage car selector carousel
        │   ├── GameView.tsx    # Active race container, score submitter
        │   └── ResultOverlay.tsx # Post-race game-over stats card
        ├── leaderboard/
        │   └── Leaderboard.tsx # 3D podium, rankings table, search
        ├── lib/
        │   ├── api.ts          # Supabase queries, score submission
        │   ├── bgm.ts          # Web Audio procedural background music
        │   └── supabase.ts     # Supabase client instantiation
        └── styles/
            └── globals.css     # Google palette, glassmorphism, resets
```

---

## 4. Unity Game Engine — Full Breakdown

All runtime scripts live in `unity-project/Assets/Scripts/` under `GDGGo.*` namespaces. There is a single scene: `Game.unity`.

### 4.1 Core Loop & GameSession

**File:** `Scripts/Core/GameSession.cs` (403 lines)  
**Singleton:** `GameSession.Instance`

GameSession is the central state machine for every run. It owns:
- Score computation (distance × 2 + coin points)
- Combo multiplier tracking
- Heat (police gap) — the primary game-ending mechanic
- Fuel — the secondary game-ending mechanic
- Active power-up flags
- Game-over reporting to the website via PostMessageBridge

**Update loop** (every frame while `IsRunning`):
```
Update()
  ├── RunSeconds += Time.deltaTime
  ├── TickCombo()    — decrement combo timer, reset multiplier if expired
  ├── TickHeat()     — compute speed-relative Heat drain/gain
  └── TickFuel()     — drain fuel by distance, end game if empty
```

**Events emitted:**
| Event | Signature | When |
|-------|-----------|------|
| `OnGameOver` | `Action<int, int, int>` (score, coins, metres) | Run ends |
| `OnCrash` | `Action` | Player hits obstacle/traffic/pedestrian |
| `OnCoin` | `Action<int>` (awarded value) | Coin collected |
| `OnLowFuel` | `Action` | Fuel drops below 25% |

**Static cross-scene cache:** `LastScore`, `LastCoins`, `LastMeters`, `LastPills`, `LastDurationSeconds` — persisted across iframe reloads.

### 4.2 World & Speed Progression

**File:** `Scripts/Gameplay/WorldScroller.cs`  
**Execution order:** `[DefaultExecutionOrder(-100)]` — runs before everything else.  
**Singleton:** `WorldScroller.Instance`

This is the single source of truth for all forward motion. Nothing moves itself — everything reads `ScrollDelta` from this.

| Parameter | Value | Description |
|-----------|-------|-------------|
| `startSpeed` | `19` units/sec | Initial speed |
| `maxSpeed` | `38` units/sec | Terminal velocity |
| `rampDistance` | `3000` metres | Distance over which difficulty linearly ramps from 0→1 |
| `boostMultiplier` | `1.55` | +55% speed during Nitro boost |
| `brakeMultiplier` | `0.55` | -45% speed during brake |
| `speedLerp` | `3.5` | Smoothing factor for speed transitions |

**Key properties:**
- `Distance` — cumulative metres in track space
- `ScrollDelta` — `Speed * Time.deltaTime` — how far the world moved this frame
- `BaseSpeed` — `Lerp(startSpeed, maxSpeed, Difficulty01)` — baseline for Heat calculations
- `Difficulty01` — `Clamp01(Distance / rampDistance)` — 0.0 at start, 1.0 at 3000m

### 4.3 Player Car & Controls

**File:** `Scripts/Gameplay/PlayerCar.cs`  
**Singleton:** `PlayerCar.Current`

3-lane model with keyboard (WASD/Arrow), touch/swipe, and on-screen button input.

| Parameter | Value | Description |
|-----------|-------|-------------|
| `laneChangeTime` | `0.12s` | Cubic smooth-step lane transition duration |
| `bankAngle` | `20°` | Body roll during lane switch |
| `jumpHeight` | `2.8` units | Arc apex height |
| `jumpDuration` | `0.60s` | Total jump time |
| `swipeThresholdPixels` | `40px` | Minimum swipe distance for touch input |

**Controls:**
- `MoveLeft()` / `MoveRight()` — smooth cubic easing between lane centres
- `Jump()` — high arc clearing low obstacles (cones/barriers), dust VFX on launch
- `FastFall()` — Subway Surfers mechanic: swipe down mid-air drops you immediately (`_jumpTimer = max(_jumpTimer, jumpDuration * 0.72f)`)
- `IsBoosting` — true when holding boost key OR `HasNitro` power-up active

### 4.4 Heat / Police System

Heat is the **primary game mechanic**. It's a 0→1 gauge of how far ahead of the police you are. At 0, you're caught — game over.

**How Heat changes** (from `TickHeat()`):
```
baseline = max(1, WorldScroller.BaseSpeed)
speedRatio = WorldScroller.Speed / baseline

rate = (speedRatio - cruiseThreshold) * heatResponse
rate -= difficultyDrain × Difficulty01

Heat += rate × deltaTime
```

This means:
- **Boosting** (speedRatio ≈ 1.55) → Heat climbs, you pull away
- **Cruising** (speedRatio ≈ 1.0) → Heat slowly drifts down
- **Braking** (speedRatio ≈ 0.55) → Heat drops fast
- **Crashing** → `crashHeatPenalty` (0.28) one-off hit

| Parameter | Value | Why |
|-----------|-------|-----|
| `cruiseThreshold` | `0.97` | Speed ratio above which Heat climbs. Set so normal driving barely maintains |
| `heatResponse` | `0.08` | How strongly speed ratio drives Heat. Higher = more volatile runs |
| `difficultyDrain` | `0.009` | Extra drain at max difficulty. Forces experienced players to boost more |
| `crashHeatPenalty` | `0.28` | One hit costs 28% of your gap. 3–4 crashes = game over |
| `pedestrianHeatPenalty` | `0.08` | Clipping a pedestrian costs 8%. Never instant death |
| `heatPerCoin` | `0.009` | Each coin restores 0.9% gap. Rewards risky lines through traffic |

**Police Freeze power-up:** Sets `PoliceFreezeActive = true`, which skips `TickHeat()` entirely for the duration.

### 4.5 Fuel System

Fuel is the **secondary game-ending mechanic**. It's a 0→1 gauge tied to **distance**, not time.

From `TickFuel()`:
```
rangeMetres = max(1, startSpeed × fuelSecondsAtCruise)
             = 19 × 45 = 855 metres per full tank

metres = ScrollDelta  (boosted × boostFuelMultiplier if boosting)
Fuel -= metres / rangeMetres
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| `fuelSecondsAtCruise` | `45s` | How long a full tank lasts at start speed (= 855m range) |
| `fuelPerCan` | `0.35` | +35% tank per fuel can pickup |
| `boostFuelMultiplier` | `1.45` | Boosting drains fuel 45% faster |
| `LowFuelThreshold` | `0.25` | Below this, `OnLowFuel` fires, HUD pulses red |

**Design rationale:** Fuel drains by distance, not time, so boosting doesn't secretly shorten runs — it gets you to the next fuel can faster but costs more fuel per metre. This makes "boost now or save fuel" an actual decision.

**When fuel hits 0:** `EndGame("fuel")` — same as being caught, but the website shows "OUT OF FUEL!" instead of "POLICE CAUGHT UP!".

### 4.6 Combo & Scoring

**Score formula:** `Score = (DistanceMetres × 2) + coinScore`

Combo system:
| Parameter | Value | Description |
|-----------|-------|-------------|
| `comboWindowSeconds` | `2.2s` | Time after a coin to extend the combo |
| `coinsPerComboStep` | `8` | Coins needed per multiplier step |
| `maxMultiplier` | `8` | Maximum combo multiplier |

Each coin awards: `coinValue × Multiplier × (Has2x ? 2 : 1)`

Combo resets on:
- Window expiry (no coin in 2.2s)
- Crash into obstacle/traffic (unless shielded)

### 4.7 Coins & Spawning

**File:** `Scripts/Coins/CoinSpawner.cs` (306 lines)

| Parameter | Value | Description |
|-----------|-------|-------------|
| `coinSpacing` | `2.4m` | Gap between coins in a pattern |
| `hoverHeight` | `1.2` | Height above road |
| `archPeakHeight` | `2.4` | Peak of arc pattern (for jump collection) |
| `patternInterval` | `30m` | Gap between coin patterns |
| `gdgPillChance` | `5.5%` | Random chance for a coin to be a GDG Pill (worth 25) |
| `gdgPillUnlockDistance` | `25m` | Minimum distance before GDG Pills can spawn |
| `pillMilestoneInterval` | `100m` | Guaranteed GDG Pill every 100 metres |
| `fuelIntervalMetres` | `85m` | Fuel can spacing when tank is healthy |
| `fuelIntervalWhenLow` | `45m` | Fuel can spacing when fuel ≤ 25% |
| `_nextFuelTrack` | `35m` | First fuel can appears at 35 metres |

**Coin patterns (random selection):**
| Pattern | Weight | Description |
|---------|--------|-------------|
| `Line` | 42% | 6 coins in a straight line |
| `Weave` | 30% | 2 steps of 3 coins stepping across lanes |
| `Arc` | 18% | 7 coins in a parabolic arc (jump to collect) |
| `Row` | 10% | 1 coin per lane (3 simultaneous) |

**Coin types** (from `CoinType.cs`):
| Type | Value | Visual |
|------|-------|--------|
| `Standard` | 1 | Google-colored coin |
| `GDGPill` | 25 | Golden GDG pill (jackpot) |
| `Fuel` | 0 (refills tank) | Fuel can |

### 4.8 Obstacles

**File:** `Scripts/Obstacles/ObstacleSpawner.cs` (inherits `ScrollingSpawner`)

Only **cones** and **barriers** (FastMesh prefabs). Both are jumpable.

| Parameter | Value | Description |
|-----------|-------|-------------|
| `intervalAtStart` | `45m` | Gap between hazard clusters at low difficulty |
| `intervalAtMaxDifficulty` | `30m` | Gap at max difficulty |
| `twoLaneBlockThreshold` | `0.95` | Difficulty level before 2-lane blocks can appear |
| `twoLaneBlockChance` | `0.0` | **Hard-disabled**: never blocks 2 lanes simultaneously |

**Safety invariant:** Uses `LaneReservations.TryReserve(trackDistance, lane)` to guarantee at least 1 lane is always open.

### 4.9 Traffic

**Files:** `Scripts/Traffic/TrafficCar.cs`, `Scripts/Traffic/TrafficSpawner.cs`

Civilian vehicles travelling forward at `forwardSpeed = 9` units/sec. 60% chance to switch lanes ahead of the player (`minLaneChangeZ = 35m`), creating dynamic obstacles.

Crashing into traffic triggers `OnCrashStatic()` → same Heat penalty as obstacle crash (0.28).

### 4.10 Pedestrians

**Files:** `Scripts/Pedestrians/PedestrianNPC.cs`, `Scripts/Pedestrians/PedestrianSpawner.cs`

Mixamo-animated civilians walking along the sidewalk.

| Parameter | Value |
|-----------|-------|
| `pavementOffset` | `6.0` units from centre |
| `pavementY` | `0.18` |
| `walkSpeed` | `1.5` units/sec |

Clipping a pedestrian costs `pedestrianHeatPenalty = 0.08` — annoying but never instant death.

### 4.11 Power-Ups

**Files:** `Scripts/PowerUps/PowerUpType.cs`, `PowerUpEffect.cs`, `PowerUpSpawner.cs`

Spawn interval: `intervalMeters = 240m`, hover height: `1.5`

| Power-Up | Effect | Duration | Visual |
|----------|--------|----------|--------|
| `CoinMagnet` | Pulls coins within 24m toward player at 32m/s | 8s | Material tint |
| `TwoX` | Doubles all coin and distance points | 8s | Material tint |
| `Shield` | Absorbs 1 crash without combo loss or Heat penalty | Until hit | 3 orbiting drones |
| `Nitro` | +55% top speed, invulnerability, widens police gap | 8s | Neon underglow |
| `PoliceFreeze` | Heat freeze (police stop closing in) | 8s | Material tint |

Shield is special: no timer, lasts until it absorbs a hit. `HasShield` flag checked in `OnCrashStatic()`.

### 4.12 Police AI

**File:** `Scripts/Police/PoliceAI.cs`

The police cruiser visually tracks the player. Its gap dynamically reflects Heat:
- At Heat 1.0 (max gap): `maxGap = 22` units behind
- At Heat 0.0 (caught): `minGap = 2.4` units behind

Siren lights flash at `barCycleHzCalm = 1.6` to `barCycleHzPanic = 6.0` based on proximity.

**File:** `Scripts/Police/HeatBar.cs` — HUD bar visualization with warning sirens.

### 4.13 Environment & Time-of-Day

**File:** `Scripts/Scenery/EnvironmentDirector.cs`

Dynamic 4-phase time-of-day cycle every 800m:
1. **SunnyDay** — bright, clear
2. **GoldenSunset** — warm tones
3. **CyberpunkNight** — neon, dark
4. **RainyStorm** — thunder, lightning, particle rain

**File:** `Scripts/Scenery/ScenerySpawner.cs` — Kenney city buildings (`buildingScale = 4`, `sideOffset = 13`) with distant backdrop skyline (`backRowOffset = 24`, `backRowScale = 7`).

### 4.14 HUD (In-Game UI)

**File:** `Scripts/UI/HUD.cs`  
**Singleton:** `HUD.Instance`

| Element | Description |
|---------|-------------|
| `scoreText` | Exponential ease catch-up counter (`scoreCatchUpPerSecond = 6f`) |
| `distanceText` | Track distance in metres |
| `coinText` | Coin count |
| `multiplierText` | Combo chip (`x2`..`x8`), hidden at 1×, pops on increase (`multiplierPopScale = 1.45`, `multiplierPopDecay = 5`) |
| `alertText` | Dynamic alert banners: `"+25 GDG COIN!"`, `"SHIELD BROKEN!"`, `"NEAR MISS! +50"` |
| `fuelFillImage` + `fuelText` | Dynamic fill bar: green (`#34A853`) → red (`#EA4335`), pulses at `fuelPulseHz = 2.6` when ≤ 25% |
| Power-up icons | `magnetIcon`, `boostIcon`, `shieldIcon`, `twoXIcon`, `freezeIcon` — `activeAlpha = 1.0`, `idleAlpha = 0.22` |

### 4.15 Audio

**File:** `Scripts/Audio/AudioManager.cs`  
**Singleton:** `AudioManager.Instance`

**Clip inventory:**
| Category | Clips |
|----------|-------|
| UI | `uiClick`, `uiHover`, `loginSuccess` |
| Gameplay | `coinPickup`, `pillPickup`, `crash`, `jump`, `swerve`, `powerUpPick`, `policeWarning`, `gameOver`, `fuelPickup`, `lowFuelWarning` |
| Music | `musicLoop` (`musicVolume = 0.35`) |

**Procedural synthesizers (WebGL fallbacks):**
| Synth | Frequencies |
|-------|-------------|
| `GenerateSubwayCoin()` | Dual sine 1760Hz + 3520Hz, exponential decay |
| `GenerateGoldenJackpot()` | C6→E6→G6→C7 major arpeggio (1046.5→2093.0Hz) |
| `GeneratePowerUpSurge()` | Frequency sweep 300→1800Hz |
| `GenerateRocketJump()` | Noise + low freq sweep 120→650Hz |

Coin pickup pitch scales with combo: `pitch = 1f + (multiplier - 1) × 0.08f` (range 1.0→1.8×).

### 4.16 Lane System & Safety Invariants

**File:** `Scripts/Gameplay/LaneModel.cs`
- 3 lanes: `LaneCount = 3`, `CentreLane = 1`, `LaneWidth = 3.0`
- X coordinates: Left = `-3.0`, Centre = `0.0`, Right = `+3.0`

**File:** `Scripts/Gameplay/LaneReservations.cs`
- Fixed ring buffer: `Capacity = 64`, `BlockingWindowMetres = 20`
- Prevents obstacles + traffic from blocking all 3 lanes at the same track Z
- **Invariant:** At least 1 lane is always navigable

### 4.17 WebGL Bridge — PostMessageBridge.jslib

**File:** `unity-project/Assets/Plugins/WebGL/PostMessageBridge.jslib`

```javascript
mergeInto(LibraryManager.library, {
    ReportGameOverToHost: function(jsonStrPtr) {
        var jsonStr = UTF8ToString(jsonStrPtr);
        var payload = JSON.parse(jsonStr);
        // Send to parent (React website)
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(payload, '*');
        } else {
            window.postMessage(payload, '*');
        }
        // Also call global callback if present
        if (typeof window.onUnityGameOver === 'function') {
            window.onUnityGameOver(payload);
        }
    }
});
```

**Important:** This bridge does NOT handle fullscreen exit. The website controls the 2-second delay and fullscreen exit. Earlier versions had `SetFullscreen(0)` and `exitFullscreen()` calls here — they were removed to prevent race conditions with the website timer.

### 4.18 Car Skins

**File:** `Scripts/Gameplay/PlayerCarSkin.cs`

Reads car ID from URL query parameter `?car=sports|race|suv|taxi` and activates the corresponding mesh prefab.

---

## 5. React Website — Full Breakdown

### 5.1 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.7.3 | Type safety |
| Vite | 6.1.0 | Dev server + bundler |
| @supabase/supabase-js | 2.48.1 | Auth + database client |
| lucide-react | 0.475.0 | Icon library |
| canvas-confetti | 1.9.4 | Celebration particles |

### 5.2 Component Architecture

```
App.tsx (router: 'home' | 'leaderboard')
├── Navbar.tsx (sticky top bar, driver info, wallet)
├── Home.tsx
│   ├── [Unauthenticated] Hero + AuthModal
│   └── [Authenticated] #game-fullscreen-root
│       ├── CarPicker.tsx (when !isPlaying)
│       └── GameView.tsx (when isPlaying)
│           ├── UnityEmbed.tsx (iframe)
│           └── ResultOverlay.tsx (after game over)
└── Leaderboard.tsx (3D podium, rankings)
```

### 5.3 Home.tsx — Root Game Wrapper

**File:** `web-hosting/src/home/Home.tsx` (280 lines)

**State:**
- `selectedCarId: string` — default `'sports'`
- `isPlaying: boolean` — controls whether CarPicker or GameView is rendered

**The critical `handleStartGame()` function:**
```typescript
const handleStartGame = () => {
  // 1. Synchronous fullscreen request on the wrapper div
  const root = document.getElementById('game-fullscreen-root');
  root.requestFullscreen();  // Must happen in user gesture context!
  
  // 2. Launch game (React swaps CarPicker → GameView)
  setIsPlaying(true);
};
```

**`#game-fullscreen-root` CSS overrides when fullscreened:**
- Fills `100vw × 100vh`
- Hides `.game-top-bar` (Change Car, Full Screen buttons)
- Removes border-radius, box-shadow from Unity embed
- Overrides aspect-ratio to fill screen

### 5.4 GameView.tsx — Active Race Container

**File:** `web-hosting/src/home/GameView.tsx` (402 lines)

**Responsibilities:**
1. Mount UnityEmbed iframe with auth credentials as URL params
2. Start/stop Web Audio background music (`bgmEngine`)
3. Listen for `postMessage` gameover events from Unity iframe
4. Submit score to Supabase
5. Manage 2-second delay before fullscreen exit
6. Render ResultOverlay when game is over
7. Handle Play Again (increment `runKey` to force iframe remount)

**Top HUD bar contains:**
- Back to garage button
- Active car pill (emoji + name)
- "For best experience, play in full screen" recommendation pill
- Full Screen button
- Music ON/OFF toggle
- Restart button

**Game-over flow:**
```
Unity postMessage → handleMessage() → processGameOver()
  ├── hasSubmittedRef prevents duplicate processing
  ├── bgmEngine.stop()
  ├── Build GameOverPayload (with reason: 'fuel' | 'police')
  ├── submitScore(payload)
  ├── refreshCoins()
  └── setTimeout(2000ms) → handleExitFullscreen() + setGameOverPayload(payload)
```

### 5.5 ResultOverlay.tsx — Game Over Screen

**File:** `web-hosting/src/home/ResultOverlay.tsx` (474 lines)

Glassmorphic card overlaid on the game canvas after death.

**Dynamic content based on `payload.reason`:**
| Reason | Badge | Title | Subtitle |
|--------|-------|-------|----------|
| `'fuel'` | `⛽ TANK EMPTY` (amber) | OUT OF FUEL! | "Your tank ran dry on the highway" |
| `'police'` | `🚨 INTERCEPTED` (red/blue) | POLICE CAUGHT UP! | "Heat level peaked & patrol intercepted" |

**Stats grid:** Distance (m), Coins Earned, GDG Coins Earned (`+max(1, floor(coins/15))`), Duration (s)

**Features:**
- Google-colored confetti burst (`canvas-confetti`)
- NEW PERSONAL BEST badge if score ≥ previous best
- Cumulative bank balance display (from Supabase)
- Play Again / Leaderboard / Sign Out buttons

### 5.6 CarPicker.tsx — Garage & Car Selection

**File:** `web-hosting/src/home/CarPicker.tsx`

4-car horizontal grid with:
- Real-time wallet badges (🟡 Standard Coins, GDG Pill Coins)
- Stat bars for Speed, Handling, Durability
- "START POLICE CHASE" action button → calls `onStartGame()`

### 5.7 UnityEmbed.tsx — Iframe Wrapper

**File:** `web-hosting/src/components/UnityEmbed.tsx` (149 lines)

Responsive iframe wrapper:
- Aspect ratio: `16/9`
- Min height: `480px` (380px on mobile)
- Max height: `calc(100vh - 140px)`
- Background: `#080B12`

**Iframe URL:** `/Build/index.html?token=${jwt}&u=${username}&dn=${displayName}&car=${carId}`

**`useImperativeHandle` exposes:**
- `triggerFullscreen()` — fullscreens the container div + sends `unityFullscreen` postMessage
- `exitFullscreen()` — calls `document.exitFullscreen()` + sends `unityExitFullscreen` postMessage

**Auto-focus:** 300ms after mount, focuses the iframe so WASD/Arrow/Space keys work without clicking.

### 5.8 AuthContext.tsx — Authentication & Session

**File:** `web-hosting/src/context/AuthContext.tsx`

- Maps usernames to synthetic emails: `${username}@gdg-go.local`
- Manages: `session`, `user`, `profile`, `userCoins`, `userGdgCoins`, `userStats`
- Provides: `signUp()`, `signIn()`, `signOut()`, `refreshCoins()`
- `persistSession: true`, `autoRefreshToken: true`

### 5.9 api.ts — Score Submission & Leaderboard

**File:** `web-hosting/src/lib/api.ts` (412 lines)

**`GameOverPayload` interface:**
```typescript
interface GameOverPayload {
  type: 'gameover';
  score: number;
  coins: number;
  pills: number;
  distance: number;
  duration: number;
  reason?: 'police' | 'fuel' | string;
}
```

**`submitScore(payload)`:**
- Sanitizes values to match Postgres check constraints
- Minimum score: `distance × 2 + coins`
- Duration floor: `max(ceil(distance / 65), duration)`
- Primary: Supabase client `insert()`
- Fallback: Direct REST `POST /rest/v1/scores`

**`fetchLeaderboard(limit)`:** Deduplicates per user, returns personal best only.

**`fetchLeaderboardDrivers(limit)`:** Aggregates `bestScore`, `totalCoins`, `totalGdgCoins`, `bestDistance`, `totalGames`.

**`fetchUserCumulativeStats(userId, username)`:** Computes cumulative wallet directly from history.

### 5.10 bgm.ts — Web Audio Background Music

**File:** `web-hosting/src/lib/bgm.ts`

Procedural synthwave/chiptune background music using the Web Audio API. Generates audio programmatically — no MP3 files.

### 5.11 cars.ts — Vehicle Definitions

**File:** `web-hosting/src/data/cars.ts`

| ID | Name | Speed | Handling | Durability | Badge Color | Icon |
|----|------|-------|----------|------------|-------------|------|
| `sports` | Velocity GT | 95 | 85 | 60 | `#4285F4` (Blue) | 🏎️ |
| `race` | Apex Racer | 98 | 90 | 50 | `#EA4335` (Red) | 🏁 |
| `suv` | Titan Enforcer | 72 | 65 | 95 | `#34A853` (Green) | 🚙 |
| `taxi` | Metro Sprinter | 82 | 94 | 70 | `#FBBC05` (Yellow) | 🚕 |

These IDs match Unity's `PlayerCarSkin.cs` URL param parsing.

> **Note:** Currently these stats are cosmetic/display-only in the web UI. The Unity game reads the `car` URL param to activate the correct mesh but does not alter physics based on the stat values.

### 5.12 Leaderboard.tsx

**File:** `web-hosting/src/leaderboard/Leaderboard.tsx`

- 3D podium visualization for top 3 players
- User standing card showing your rank and personal best
- Search functionality
- Full scrollable rankings table with driver stats

---

## 6. Fullscreen Architecture — The Hard Problem

This was the single hardest integration problem, requiring ~10 iterations to resolve. Here is the full story:

### The Tension

Two user requirements are fundamentally at odds:

1. **The game must NOT run in the background** — GameView (and therefore the Unity iframe) must not exist in the DOM while the user is in the garage. Otherwise the game starts burning fuel, playing music, and ticking Heat before the user clicks Start.

2. **Fullscreen must trigger synchronously on the Start button click** — The browser's Fullscreen API requires:
   - The target element to **exist in the DOM** at the moment of the call
   - The call to happen within a **user gesture context** (click/tap handler)
   - The user gesture has a **very short expiration** — any async operation (setState, setTimeout, React render) can expire it

### What Failed (and Why)

| Approach | Why It Failed |
|----------|--------------|
| Pre-mount GameView with `visibility: hidden` | Game ran in background, burning fuel and playing music while in garage |
| Pre-mount with `position: fixed; top: -9999px` | Same problem — Unity iframe was alive and running |
| Conditional render → then `requestFullscreen()` on iframe | The iframe didn't exist yet at click time. React render is async — by the time the iframe was in DOM, the user gesture had expired |
| `document.documentElement.requestFullscreen()` | Fullscreened the entire website including header/footer — user explicitly rejected: *"thats just the website fullscreen"* |
| `unityInstance.SetFullscreen(1)` via postMessage to iframe | Cross-iframe user gesture doesn't propagate. The iframe's browsing context doesn't inherit the parent's user activation |

### What Works (Current Solution — Commit `57242fc`)

```
#game-fullscreen-root (always in DOM)
├── [isPlaying=false] → CarPicker.tsx
└── [isPlaying=true]  → GameView.tsx (with Unity iframe)
```

The trick: **wrap both views in a persistent `#game-fullscreen-root` div.** This div always exists (it contains CarPicker while in garage). On click:

1. Call `root.requestFullscreen()` **synchronously** on `#game-fullscreen-root` — succeeds because the div is in DOM and we're in a user gesture
2. Call `setIsPlaying(true)` — React swaps CarPicker for GameView inside the already-fullscreened div
3. GameView mounts with the Unity iframe, which starts the game

CSS rules for `#game-fullscreen-root:fullscreen` hide the top bar and expand everything to `100vw × 100vh`.

### Fullscreen Exit Flow

After game over:
1. Unity sends `gameover` postMessage
2. GameView processes it, submits score
3. `setTimeout(2000ms)` — 2-second delay (user sees the crash scene)
4. `document.exitFullscreen()` called
5. `setGameOverPayload(payload)` — ResultOverlay appears

The Unity-side `PostMessageBridge.jslib` does NOT exit fullscreen. Only the website controls exit timing.

---

## 7. Build & Deployment Pipeline

### 7.1 Unity Build

- **Engine:** Unity 6 LTS (6000.0.x)
- **Platform:** WebGL
- **Build time:** 2–4 minutes (IL2CPP → WASM linking ~90-120s, Brotli compression ~30-60s)
- **Output:** `unity-project/Build/` (gitignored)
- **Size budget:** ≤ 25 MB Brotli compressed

Build output files:
- `Build.loader.js` — Unity's JavaScript bootstrapper
- `Build.data.unityweb` — Asset data
- `Build.framework.js.unityweb` — Runtime framework
- `Build.wasm.unityweb` — WASM binary
- `TemplateData/` — Template CSS, loading bar assets

### 7.2 copy-unity.js — Template Overwrite

**File:** `web-hosting/scripts/copy-unity.js` (152 lines)

Runs as part of `npm run build` (via `unity:copy` script). Does three things:

1. **Copies** `unity-project/Build/` → `web-hosting/public/Build/`
2. **Overwrites `index.html`** with a clean template that:
   - Has NO `#unity-footer`, NO `#unity-fullscreen-button`
   - Sets `100%` width/height responsive canvas
   - Exposes `window.unityInstance` for external access
   - Listens for `postMessage` events: `unityFullscreen` → `SetFullscreen(1)`, `unityExitFullscreen` → `SetFullscreen(0)` + `exitFullscreen()`
3. **Patches `TemplateData/style.css`** to permanently hide footer elements

**Why this matters:** Unity regenerates its default HTML template with footer/fullscreen button on every build. Without this script, the default template would appear in production.

### 7.3 Vite Build & Netlify Deploy

**Build command:** `npm run build` → `npm run unity:copy && tsc && vite build`
**Publish directory:** `dist/`

**`netlify.toml` key config:**
- SPA redirects: `/* → /index.html` (status 200)
- Brotli headers for `.br` files (Unity WASM/framework/data)
- WASM content type: `application/wasm`
- Immutable caching for Unity build files (1 year)
- No-cache for `index.html`

---

## 8. Supabase Database

### 8.1 Connection

```
URL:  https://oijrhshrhccsbntpcnpq.supabase.co
Key:  (anon key in web-hosting/.env)
```

### 8.2 Schema & Migrations

**4 migration files in `supabase/migrations/`:**

#### `0001_init.sql` — Base tables
```sql
public.users (id, username, display_name, created_at)
public.scores (id, user_id, username, display_name, score, coins, distance, created_at)
```
RLS: public read, authenticated insert, no updates/deletes.

#### `0002_score_integrity.sql` — Anti-cheat
- Adds `duration_seconds` to scores
- Check constraints (see §8.3)
- `enforce_score_rate_limit()` trigger: max 20 submissions/hour/user
- `stamp_score_identity()` trigger: overwrites client name with authenticated profile

#### `0003_relational_leaderboard.sql` — Live rankings
```sql
public.leaderboard (
  user_id, username, display_name,
  best_score, total_coins, total_gdg_coins,
  best_distance, total_games, rank,
  last_played, updated_at
)
```
- Foreign key cascades between `scores` and `users`
- `recompute_leaderboard()` trigger maintains live ranks on every score insert/update/delete

#### `0004_exact_gdg_coins.sql` — Pill tracking
- Adds `gdg_coins` and `pills` columns to `scores`
- Updates leaderboard trigger to sum exact GDG pill counts

### 8.3 Anti-Cheat Constraints

```sql
-- Duration sanity
duration_seconds BETWEEN 0 AND 7200

-- Speed cap: max ~70 m/s (252 km/h)
distance <= duration_seconds * 70

-- Coin density cap
coins <= distance + 50

-- Score bounds (prevents impossible scores)
score >= distance * 2 + coins
score <= distance * 2 + coins * 400

-- Rate limit
max 20 score submissions per hour per user
```

---

## 9. Design Decisions & Why They Were Made

| Decision | Why |
|----------|-----|
| **Heat tied to speed ratio, not flat timer** | A flat drain made every run end at exactly 50 seconds with identical scores — defeats the purpose of a leaderboard. Speed-relative Heat means skilled driving directly extends runs. |
| **Fuel drains by distance, not time** | If fuel drained by time, boosting would shorten runs. By tying it to distance, a tank is always ~855m. Boost gets you there faster but costs more fuel/m — making it an actual decision. |
| **`crashHeatPenalty = 0.28`** | Calibrated so 3–4 crashes = game over from full Heat. High enough to punish sloppy driving, low enough that one mistake isn't death. |
| **`twoLaneBlockChance = 0.0`** | Hard-disabled after playtesting. When 2 of 3 lanes were blocked, the game felt unfair — especially at high speed where the player couldn't react fast enough. |
| **Obstacles are jumpable** | User explicitly requested this. Adds vertical gameplay layer beyond lane switching. |
| **No Unity footer/fullscreen button** | User explicitly rejected Unity's built-in footer bar. All controls must be on the website HUD, not inside the game canvas. |
| **`#game-fullscreen-root` wrapper approach** | Only approach that satisfies both "no background game execution" and "synchronous fullscreen on click". See §6 for the full failure history. |
| **2-second delay before fullscreen exit** | User requested: *"as soon as the game ends, wait for 2 seconds, then exit fullscreen"*. Gives the player time to see the crash scene before the result card appears. |
| **Manual JSON construction in GameSession** | Adding a `string reason` field to the `[Serializable] GameOverReport` struct caused Unity build errors ("script class layout is incompatible"). Manual JSON string construction avoids the serialization issue. |
| **Dual postMessage + onUnityGameOver callback** | Belt-and-suspenders. Some browsers/iframes handle postMessage differently. The global `window.onUnityGameOver` callback is a fallback. |
| **Synthetic email auth** | `${username}@gdg-go.local` — Supabase requires email for auth. This lets users sign up with just a username + password while still using Supabase Auth under the hood. |

---

## 10. Known Landmines & Gotchas

### Unity Build

| Gotcha | Impact | Mitigation |
|--------|--------|------------|
| Adding fields to `[Serializable]` structs | "script class layout is incompatible" build error | Use manual JSON construction instead of modifying `GameOverReport` |
| Unity's default template regenerates on every build | Footer and fullscreen button reappear | `copy-unity.js` overwrites `index.html` after copy |
| PlayMode blocks `EditorSceneManager.OpenScene` | MCP scene manipulation fails during play | Call `EditorApplication.isPlaying = false` first |
| WebGL builds take 2-4 minutes | Can't iterate fast | Use editor Play Mode for logic testing, WebGL build only for final verification |

### Fullscreen API

| Gotcha | Impact | Mitigation |
|--------|--------|------------|
| User gesture expires after any async operation | `requestFullscreen()` silently fails | Must call synchronously in click handler, before any `setState` |
| Cross-iframe gesture doesn't propagate | `SetFullscreen(1)` via postMessage fails | Fullscreen the parent wrapper div, not the iframe |
| Safari uses `webkitRequestFullscreen` | Fullscreen fails on Safari without prefix | All fullscreen calls have webkit fallback branches |

### React / Website

| Gotcha | Impact | Mitigation |
|--------|--------|------------|
| Unity iframe runs as soon as it mounts | Game starts "in background" if pre-mounted | Conditional render: GameView only exists when `isPlaying === true` |
| Duplicate gameover events | Score submitted twice | `hasSubmittedRef` guard in processGameOver |
| Iframe keyboard focus | WASD/Arrow/Space don't work until iframe is focused | Auto-focus after 300ms + focus-on-click handler |

### Supabase

| Gotcha | Impact | Mitigation |
|--------|--------|------------|
| Check constraints reject modified scores | Legitimate scores can be rejected if sanitization is wrong | `api.ts` pre-sanitizes: floor values to match constraint math |
| Rate limit: 20/hour | Rapid Play Again testing can hit the limit | Constraint exists in database trigger |

---

## 11. All Tuning Parameters — Master Reference

### Speed & Difficulty

| Parameter | File | Value |
|-----------|------|-------|
| `startSpeed` | WorldScroller.cs | 19 units/sec |
| `maxSpeed` | WorldScroller.cs | 38 units/sec |
| `rampDistance` | WorldScroller.cs | 3000m |
| `boostMultiplier` | WorldScroller.cs | 1.55 |
| `brakeMultiplier` | WorldScroller.cs | 0.55 |

### Heat / Police

| Parameter | File | Value |
|-----------|------|-------|
| `cruiseThreshold` | GameSession.cs | 0.97 |
| `heatResponse` | GameSession.cs | 0.08 |
| `difficultyDrain` | GameSession.cs | 0.009 |
| `crashHeatPenalty` | GameSession.cs | 0.28 |
| `pedestrianHeatPenalty` | GameSession.cs | 0.08 |
| `heatPerCoin` | GameSession.cs | 0.009 |

### Fuel

| Parameter | File | Value |
|-----------|------|-------|
| `fuelSecondsAtCruise` | GameSession.cs | 45s (= 855m range) |
| `fuelPerCan` | GameSession.cs | 0.35 (+35% per pickup) |
| `boostFuelMultiplier` | GameSession.cs | 1.45 |
| `LowFuelThreshold` | GameSession.cs | 0.25 |

### Combo

| Parameter | File | Value |
|-----------|------|-------|
| `comboWindowSeconds` | GameSession.cs | 2.2s |
| `coinsPerComboStep` | GameSession.cs | 8 |
| `maxMultiplier` | GameSession.cs | 8 |

### Coin Spawning

| Parameter | File | Value |
|-----------|------|-------|
| `coinSpacing` | CoinSpawner.cs | 2.4m |
| `patternInterval` | CoinSpawner.cs | 30m |
| `gdgPillChance` | CoinSpawner.cs | 5.5% |
| `pillMilestoneInterval` | CoinSpawner.cs | 100m |
| `fuelIntervalMetres` | CoinSpawner.cs | 85m |
| `fuelIntervalWhenLow` | CoinSpawner.cs | 45m |
| `_nextFuelTrack` | CoinSpawner.cs | 35m (first fuel can) |

### Obstacles

| Parameter | File | Value |
|-----------|------|-------|
| `intervalAtStart` | ObstacleSpawner.cs | 45m |
| `intervalAtMaxDifficulty` | ObstacleSpawner.cs | 30m |
| `twoLaneBlockChance` | ObstacleSpawner.cs | 0.0 (disabled) |

### Player

| Parameter | File | Value |
|-----------|------|-------|
| `laneChangeTime` | PlayerCar.cs | 0.12s |
| `bankAngle` | PlayerCar.cs | 20° |
| `jumpHeight` | PlayerCar.cs | 2.8 |
| `jumpDuration` | PlayerCar.cs | 0.60s |

### Power-Ups

| Parameter | File | Value |
|-----------|------|-------|
| `intervalMeters` | PowerUpSpawner.cs | 240m |
| `durationSec` | PowerUpEffect.cs | 8s |

### Police Visual

| Parameter | File | Value |
|-----------|------|-------|
| `minGap` | PoliceAI.cs | 2.4 units |
| `maxGap` | PoliceAI.cs | 22 units |
| `barCycleHzCalm` | PoliceAI.cs | 1.6 Hz |
| `barCycleHzPanic` | PoliceAI.cs | 6.0 Hz |

---

## 12. Git Commit History

```
57242fc feat(fullscreen): launch synchronous game-fullscreen-root immediately on Start Police Chase without running game in background
e3745af fix(lifecycle): only mount and start Unity game when the player clicks Start Police Chase
0623a4d balance(fuel): delicately tune fuel duration to 45s, +35% per pickup, and 85m/45m spawn cadence
75500bf feat(gameover): add 2-second delay after game ends before exiting fullscreen and presenting result overlay
7b00242 fix(fullscreen): permanently strip Unity footer from build template and warm-mount GameView for instant fullscreen
e7a79f9 fix(fullscreen): clean up embed container and restore clean conditional view rendering
ea7dfea feat(telemetry): distinguish between Out of Fuel and Police Caught Up game-over causes with dedicated UI badges
5d53de5 feat(fullscreen): pre-mount Unity embed so Start Police Chase triggers pure game fullscreen instantly
3cc248d feat(fullscreen): direct iframe fullscreen trigger for pure Unity game fullscreen display
2033a46 feat(fullscreen): revert HTML5 document fullscreen and connect controls to Unity native WebGL SetFullscreen
6277cdc feat(fullscreen): launch fullscreen synchronously on Start Race click and exit automatically on game over
4729318 feat(fullscreen): robust auto fullscreen trigger on play and auto exit on game over
42e06fd feat(fullscreen): auto-enter fullscreen on play and automatically exit fullscreen on game over
13c89f4 feat(ui): remove on-canvas overlay button and keep fullscreen controls on website page
811ee36 feat(ui): hide Unity default footer bar, hook custom fullscreen button to Unity SetFullscreen
91557ae revert: restore classic game view layout & recalibrate obstacle spawn pacing
bb7e4e9 feat(scene): save calibrated ObstacleSpawner and GameSession parameters in Game scene
23d88fd feat(police): harden collision heat penalty to 0.28 while preserving coin and cruising heat gain
c67d0b8 feat(obstacles): add smart speed-proportional distance scaling and wider spawn intervals
2e002e4 feat(ui): add Unity Fullscreen trigger button with best experience recommendation banner
dce89a3 feat(ui): frame game view between header and footer with expansive responsive sizing
b2eccb3 feat(ui): make GameView full viewport overlay with floating glassmorphism HUD
2d86a12 feat(ui): scale UnityEmbed to 100% full viewport and remove custom fullscreen button
bfa1104 docs(screenshots): add visual documentation and action capture screenshots
91d2f0b feat(scene): update Game scene hierarchy, lighting, and spawner configuration
10a6be4 feat(fonts): update TextMesh Pro font assets and fallback tables
2e6fb1d feat(prefabs): update environment road, scenery, coin, and obstacle prefabs
3a6aaf4 feat(pedestrians): update animated pedestrian prefabs
02ec5af feat(models): update Quaternius character model import settings and animation rigs
d98d8b2 refactor(materials): cleanup legacy glow materials and update coin materials
58eb192 feat(editor): update editor builders, materials, and scene generation scripts
dcb7a66 feat(editor): add in-editor screenshot tool utility
282ee9b feat(scenery): add EnvironmentDirector for dynamic time-of-day lighting and skyboxes
aedce8d feat(ui): update in-game HUD with powerup timers, GDG pill counters, and styling
0d5b383 feat(core): update GameSession stats, cumulative tracking, and powerup states
06513a4 feat(audio): update AudioManager with procedural SFX, powerup audio, and WebGL JS bridge
92fd46b feat(police): refine PoliceAI pursuit physics and siren triggers
e3a8ea2 feat(police): update HeatBar HUD animations and warning sirens
6816ab1 feat(traffic): calibrate TrafficSpawner density and pacing
a273e68 feat(traffic): update TrafficCar collision and lane behaviors
7fcef04 feat(gameplay): calibrate speed progression curve in WorldScroller
```

All commits authored by `Karang1908 <Karang1908@users.noreply.github.com>`.

---

## 13. Current State & Open Items

### What Works (Verified)
- Full game loop: start → play → game over → score submission → leaderboard
- Authentication (username/password via Supabase)
- Score submission with anti-cheat constraints
- Dynamic game-over screens (fuel vs police)
- 2-second delay after game over before fullscreen exit
- Fuel system with tuned difficulty
- Heat/police system with speed-relative mechanics
- 5 power-ups (Magnet, 2x, Shield, Nitro, Freeze)
- Dynamic time-of-day cycle
- Web Audio background music
- Unity footer permanently stripped

### Needs User Verification
- The `#game-fullscreen-root` fullscreen approach (commit `57242fc`) — the latest iteration. The user had not yet confirmed whether this works at the time of this handoff.

### Untracked Files
- `web-hosting/public/branding/gdggo-hero.png` — untracked in git

### Potential Future Work (Not Started)
- Car stats (Speed/Handling/Durability) could actually affect Unity physics — currently cosmetic only
- Mobile-specific touch controls tuning
- More obstacle types beyond cones and barriers
- Social features (friends, challenges)
