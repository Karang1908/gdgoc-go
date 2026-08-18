# GDGoC Go! — Engineering Handoff

Last source review: **18 August 2026**

Repository: `https://github.com/Karang1908/gdgoc-go.git`

Primary branch at review time: `main`

Unity editor version: **6000.0.81f1**

This document is the current operational handoff for the React host, Unity WebGL game,
Supabase score system, mobile/PWA shell, and deployment process. When this file conflicts
with older planning documents, verify the implementation in source before following the
older document. In particular, several older files still describe passing a Supabase JWT
to Unity or building multiple Unity UI scenes; neither is part of the current architecture.

---

## Contents

1. [Current state and deployment-critical notes](#1-current-state-and-deployment-critical-notes)
2. [Repository map and sources of truth](#2-repository-map-and-sources-of-truth)
3. [Runtime architecture](#3-runtime-architecture)
4. [Authentication and player identity](#4-authentication-and-player-identity)
5. [Game controls and run rules](#5-game-controls-and-run-rules)
6. [Score calculation: exact source of truth](#6-score-calculation-exact-source-of-truth)
7. [Unity-to-React message contract](#7-unity-to-react-message-contract)
8. [Score persistence, retries, and leaderboard aggregation](#8-score-persistence-retries-and-leaderboard-aggregation)
9. [Supabase schema and migration order](#9-supabase-schema-and-migration-order)
10. [Mobile, fullscreen, and PWA contracts](#10-mobile-fullscreen-and-pwa-contracts)
11. [Responsive UI details that must be preserved](#11-responsive-ui-details-that-must-be-preserved)
12. [Build and deployment playbook](#12-build-and-deployment-playbook)
13. [Verification checklist](#13-verification-checklist)
14. [Common failures and their actual causes](#14-common-failures-and-their-actual-causes)
15. [Safe change rules for future work](#15-safe-change-rules-for-future-work)
16. [Recommended release sequence](#16-recommended-release-sequence)

---

## 1. Current state and deployment-critical notes

The application is a React/Vite single-page app that embeds a one-scene Unity WebGL build
in a same-origin iframe. React owns authentication, profiles, routing, score persistence,
leaderboard rendering, PWA installation, theme, and the game-over overlay. Unity owns the
actual run: movement, obstacles, police Heat, fuel, pickups, power-ups, score calculation,
and the final run telemetry.

The following pieces must be deployed together:

1. The current Unity WebGL build in `web-hosting/public/Build/` (tracked in git for Netlify CI).
2. The current React host in `web-hosting/`.
3. Supabase migrations through
   [`0005_authoritative_score_submission.sql`](supabase/migrations/0005_authoritative_score_submission.sql) and
   [`0006_users_email.sql`](supabase/migrations/0006_users_email.sql).

Migration `0005` is mandatory for the current frontend. It adds the per-run UUID and
`bonus_score`, makes run submission idempotent, prevents direct browser writes to score and
leaderboard rows, and exposes the authenticated `submit_game_score` RPC. If the frontend is
deployed before this migration, completed runs will be queued locally but cannot be banked.

Migration `0006` adds the `email` column and index to `public.users` so the Supabase project
administrator can view player email addresses directly in the Table Editor, with automated
backfilling from `auth.users`.

Important current UI behavior:

- Routes are `/`, `/leaderboard`, and `/controls`.
- The header contains Play, Leaderboard, How to Play, wallet, theme, and account controls on
  desktop. On narrow phones, the layout compresses to the GDG mark, How to Play, wallet,
  theme, and account controls.
- The desktop navbar logo is rendered at **44 px** height with balanced brand lockup and
  a 32 px compact mark on mobile.
- In the registration modal (`AuthModal.tsx`), **nothing is optional**: username, display name,
  validated email address, and password are all mandatory.
- There is intentionally **no persistent bottom Play/Leaderboard navigation**.
- Entering the game hides both the application header and footer and mounts a fixed,
  edge-to-edge game surface.
- The desktop header is 68 px. The phone header is 60 px plus the top safe-area inset.
- The desktop footer is 52 px and is hidden on phones and while a run is active.
- The leaderboard table becomes a compact card layout below 900 px instead of forcing a
  desktop-width table into the phone viewport.
- The How to Play page uses the existing asset at `web-hosting/public/branding/gdg-pill.png`
  when presenting a GDG Coin. Its visible description is “Base value 25”.
- The vehicle stat bars are intentionally present in the garage.

The working tree may contain uncommitted Unity, React, migration, PWA, and documentation
changes. Always run `git status --short` before editing or committing, and do not discard
changes that are unrelated to the current task.

---

## 2. Repository map and sources of truth

| Path | Responsibility |
|---|---|
| [`web-hosting/`](web-hosting/) | React 18, TypeScript, Vite, Supabase client, PWA shell, and Netlify deployment root. |
| [`unity-project/`](unity-project/) | Unity 6 project and the single `Game` scene used by the WebGL build. |
| [`supabase/migrations/`](supabase/migrations/) | Ordered database schema, integrity rules, leaderboard aggregation, score RPC, and email visibility. |
| [`web-hosting/public/branding/`](web-hosting/public/branding/) | Existing web-facing GDG, vehicle, and game artwork. |
| [`web-hosting/public/Build/`](web-hosting/public/Build/) | Generated copy of the Unity WebGL build, tracked in Git for autonomous Netlify CI deployment. |
| [`unity-project/Build/`](unity-project/Build/) | Generated Unity WebGL output. It is gitignored. |
| [`web-hosting/dist/`](web-hosting/dist/) | Generated production site. Never edit it manually. |
| [`web-hosting/scripts/copy-unity.js`](web-hosting/scripts/copy-unity.js) | Copies Unity output into the Vite public tree and replaces Unity's stock page with the full-bleed host template. |
| [`HANDOFF.md`](HANDOFF.md) | Current cross-system handoff and deployment contract. |

### Files that control the live React behavior

| File | What it owns |
|---|---|
| [`web-hosting/src/App.tsx`](web-hosting/src/App.tsx) | Providers, route selection, dynamic viewport height, header/footer shell, and game-active global layout. |
| [`web-hosting/src/lib/routes.ts`](web-hosting/src/lib/routes.ts) | Mapping between browser paths and the three application routes. |
| [`web-hosting/src/components/Navbar.tsx`](web-hosting/src/components/Navbar.tsx) | Responsive header, 44 px logo branding, route controls, wallet, theme, profile, and sign-out. |
| [`web-hosting/src/home/Home.tsx`](web-hosting/src/home/Home.tsx) | Guest landing page, authenticated garage, game launch, and game exit. |
| [`web-hosting/src/home/CarPicker.tsx`](web-hosting/src/home/CarPicker.tsx) | Vehicle carousel, stat bars, swipe/arrow selection, and start button. |
| [`web-hosting/src/components/CarShowcase3D.tsx`](web-hosting/src/components/CarShowcase3D.tsx) | Lazy Three.js vehicle preview for capable desktop devices. |
| [`web-hosting/src/home/GameView.tsx`](web-hosting/src/home/GameView.tsx) | Full-screen game shell, run IDs, trusted Unity messages, score submission, retry state, audio, and result overlay. |
| [`web-hosting/src/components/UnityEmbed.tsx`](web-hosting/src/components/UnityEmbed.tsx) | Same-origin Unity iframe, query parameters, focus, and fullscreen messages. |
| [`web-hosting/src/home/ResultOverlay.tsx`](web-hosting/src/home/ResultOverlay.tsx) | Final run metrics, banked totals, save state, replay, and leaderboard action. |
| [`web-hosting/src/home/AuthModal.tsx`](web-hosting/src/home/AuthModal.tsx) | Registration and sign-in modal with validated email address, required display name, and password toggle. |
| [`web-hosting/src/leaderboard/Leaderboard.tsx`](web-hosting/src/leaderboard/Leaderboard.tsx) | Podium, current-driver card, search, refresh, desktop table, and mobile cards. |
| [`web-hosting/src/controls/Controls.tsx`](web-hosting/src/controls/Controls.tsx) | `/controls` instructions for gestures, keyboard controls, HUD, pickups, power-ups, and survival tips. |
| [`web-hosting/src/context/AuthContext.tsx`](web-hosting/src/context/AuthContext.tsx) | Supabase session, validated email registration, public profile persistence, and wallet refresh. |
| [`web-hosting/src/lib/api.ts`](web-hosting/src/lib/api.ts) | Score payload validation, offline queue, RPC call, leaderboard queries, and fallback aggregation. |
| [`web-hosting/src/components/ScoreQueueSync.tsx`](web-hosting/src/components/ScoreQueueSync.tsx) | Background flush of queued runs after sign-in or reconnect. |
| [`web-hosting/src/lib/gameDisplay.ts`](web-hosting/src/lib/gameDisplay.ts) | Standalone-mode detection, Fullscreen API wrappers, and best-effort landscape lock. |
| [`web-hosting/src/components/InstallPrompt.tsx`](web-hosting/src/components/InstallPrompt.tsx) | Android install prompt and iOS Safari Add to Home Screen guidance. |
| [`web-hosting/src/styles/globals.css`](web-hosting/src/styles/globals.css) | Fonts, Google theme tokens, reset, root viewport lock, controls, and shared responsive styles. |

### Files that control the live Unity behavior

| File | What it owns |
|---|---|
| [`unity-project/Assets/Scenes/Game.unity`](unity-project/Assets/Scenes/Game.unity) | Serialized runtime values and references. Scene values override C# field defaults. |
| [`unity-project/Assets/Scripts/Core/GameSession.cs`](unity-project/Assets/Scripts/Core/GameSession.cs) | Authoritative in-run score, combo, Heat, fuel, power-up flags, crashes, and final telemetry. |
| [`unity-project/Assets/Scripts/Gameplay/WorldScroller.cs`](unity-project/Assets/Scripts/Gameplay/WorldScroller.cs) | Distance, difficulty, cruising speed, boost speed, and braking speed. |
| [`unity-project/Assets/Scripts/Gameplay/PlayerCar.cs`](unity-project/Assets/Scripts/Gameplay/PlayerCar.cs) | Lane movement, jump/fast-fall, keyboard, swipe, braking, and double-tap boost. |
| [`unity-project/Assets/Scripts/Gameplay/PlayerCollision.cs`](unity-project/Assets/Scripts/Gameplay/PlayerCollision.cs) | Crash handling, shields, and temporary invulnerability. |
| [`unity-project/Assets/Scripts/Gameplay/NearMissDetector.cs`](unity-project/Assets/Scripts/Gameplay/NearMissDetector.cs) | Fixed +50 near-miss awards with cooldown. |
| [`unity-project/Assets/Scripts/Coins/CoinSpawner.cs`](unity-project/Assets/Scripts/Coins/CoinSpawner.cs) | Standard coin patterns, GDG Coin frequency/milestones, and fuel scheduling. |
| [`unity-project/Assets/Scripts/Coins/CoinPickup.cs`](unity-project/Assets/Scripts/Coins/CoinPickup.cs) | Collection, magnet behavior, fuel routing, value reporting, and pickup effects. |
| [`unity-project/Assets/Scripts/PowerUps/PowerUpSpawner.cs`](unity-project/Assets/Scripts/PowerUps/PowerUpSpawner.cs) | Power-up timing, weights, lane selection, and color coding. |
| [`unity-project/Assets/Scripts/UI/HUD.cs`](unity-project/Assets/Scripts/UI/HUD.cs) | Score animation, combo, fuel, alerts, power-up icons, and portrait scaling. |
| [`unity-project/Assets/Scripts/Supabase/SupabaseSession.cs`](unity-project/Assets/Scripts/Supabase/SupabaseSession.cs) | Reads non-secret run/player/car metadata from the iframe URL. It does not connect to Supabase. |
| [`unity-project/Assets/Plugins/WebGL/PostMessageBridge.jslib`](unity-project/Assets/Plugins/WebGL/PostMessageBridge.jslib) | Sends final Unity telemetry to the same-origin React parent. |
| [`unity-project/Assets/Editor/ProjectSetup.cs`](unity-project/Assets/Editor/ProjectSetup.cs) | Project setup, WebGL settings, validation, and the `GDG Go/Build WebGL` menu command. |
| [`unity-project/Assets/Editor/SceneBuilder.cs`](unity-project/Assets/Editor/SceneBuilder.cs) | Rebuilds the Game scene and its runtime object graph. |
| [`unity-project/Assets/Editor/PrefabsBuilder.cs`](unity-project/Assets/Editor/PrefabsBuilder.cs) | Generates the prefabs used by the scene. |

---

## 3. Runtime architecture

The browser runtime is deliberately split at the iframe boundary:

```text
React SPA
  ├─ Supabase Auth session and public profile (with email)
  ├─ garage, /controls, /leaderboard, result overlay
  ├─ creates one UUID for each run
  ├─ embeds /Build/index.html?run=...&u=...&dn=...&car=...
  └─ receives and validates one gameover message
        ↓ same-origin window.postMessage
Unity WebGL iframe
  ├─ parses non-secret query metadata
  ├─ runs the chase and calculates the score
  └─ reports final telemetry once
        ↓ authenticated Supabase RPC from React only
Supabase
  ├─ inserts an immutable score row once per user/run UUID
  ├─ recomputes that driver's cumulative row
  └─ recomputes deterministic global ranks
```

React uses a small History API router rather than React Router. `App.tsx` reads
`window.location.pathname`, calls `history.pushState`, and listens for `popstate`.
Netlify's wildcard redirect to `/index.html` is therefore required for direct visits to
`/controls` and `/leaderboard`.

The Unity iframe is same-origin by design. Do not host `/Build` on another domain without
reworking the message origin checks, iframe permissions, service-worker cache paths, and
deployment headers.

---

## 4. Authentication and player identity

Player registration collects:

- **Username**: 3–24 characters (letters, numbers, `_`, `-`), unique across drivers.
- **Display Name**: 2–24 characters (mandatory), shown publicly on the leaderboard.
- **Email Address**: Validated email address format (`name@example.com`), stored in `auth.users`
  and persisted in `public.users.email` for administrator visibility and account recovery.
- **Password**: At least 6 characters.

The public identity is stored in `public.users`:

- `id`: matching `auth.users.id` UUID.
- `username`: unique login handle.
- `display_name`: public name shown on the leaderboard.
- `email`: player's verified email address (added in Migration `0006`).

Sign In supports either **Username** (with backward compatibility for synthetic `@gdg-go.local`
accounts) or the registered **Email Address**.

`AuthContext` restores the Supabase session on load, fetches the public profile, creates a
fallback profile when necessary, and refreshes wallet/driver totals from the leaderboard
aggregate.

Supabase email confirmation should remain disabled in the Supabase Dashboard for this instant
event sign-up flow so that `signUp` immediately establishes an active session without
requiring email verification delays.

Authentication remains strictly in the parent React application. Never add the Supabase access
token, refresh token, anon secret beyond the normal public anon key, or service-role key to
the Unity iframe query string or Unity StreamingAssets.

---

## 5. Game controls and run rules

### Phone and tablet

- Swipe left/right: move one lane.
- Swipe up: jump.
- Swipe down on the road: apply a short brake tap.
- Swipe down in the air: fast-fall.
- Double-tap: boost for 1.2 seconds.

### Keyboard and mouse

- `A` or Left Arrow: move left.
- `D` or Right Arrow: move right.
- `W`, Up Arrow, or Space: jump.
- `S` or Down Arrow: brake; while airborne, fast-fall.
- Hold either Shift key: boost.
- Mouse drags mirror swipes; two quick clicks trigger the touch boost.

The main loss conditions are Heat reaching zero or fuel reaching zero. Crashes remove Heat
and reset the combo unless a shield absorbs the collision. Boosting helps recover the gap
from the police but consumes more fuel. Fuel drains by distance rather than wall-clock time.

### Serialized runtime values

Use the serialized values in `Assets/Scenes/Game.unity` as the runtime truth when they
differ from field initializers in C#.

| Setting | Current scene value |
|---|---:|
| Starting speed | 19 units/s |
| Maximum base speed | 46 units/s |
| Speed ramp distance | 1,000 m |
| Boost speed multiplier | 1.55× |
| Brake speed multiplier | 0.55× |
| Combo window | 2.2 s |
| Coins per multiplier step | 8 |
| Maximum combo multiplier | 8× |
| Crash Heat penalty | 0.28 |
| Pedestrian Heat penalty | 0.08 |
| Heat gained per scored pickup | 0.012 |
| Full-tank cruise duration basis | 45 s |
| Fuel restored per can | 35% |
| Extra fuel drain while boosting | 1.45× |
| Standard fuel interval | 85 m |
| Low-fuel interval | 45 m |
| GDG Coin guaranteed interval | 100 m |
| GDG Coin random-drop unlock | 25 m |
| Random GDG Coin chance per eligible coin | 5.5% |
| Power-up interval | about 240 m, randomized by 0.75–1.35× |

The theoretical boosted peak from the current serialized speed values is approximately
`46 × 1.55 = 71.3` units/s. The database permits 75 distance units per reported second to
leave frame-rounding headroom.

### Power-up durations in the current scene

| Power-up | Behavior | Duration |
|---|---|---:|
| Magnet | Pulls non-fuel pickups within the configured radius | 8 s |
| Nitro | Forces boost | 5 s |
| Shield | Absorbs one whole crash, including its combo reset | Until hit |
| 2× | Doubles the pickup score after the normal combo multiplier | 10 s |
| Police Freeze | Stops Heat loss | 6 s |

---

## 6. Score calculation: exact source of truth

`GameSession.cs` calculates the live and final score. The submitted score is:

```text
round(distance_metres) × 2 + accumulated_pickup_score + bonus_score
```

Pickup scoring works as follows:

```text
awarded pickup score = base value × current combo multiplier × active 2× factor
```

- A standard Google-color coin has base value `1` and increments `CoinCount`.
- A GDG Coin has base value `25` and increments `GDGPillsCollected` internally.
- Both pickup types extend the same 2.2-second combo and can benefit from combo and 2×.
- The combo becomes `1 + floor(combo_pickups / 8)`, capped at 8×.
- A combo timeout or an unshielded crash resets it to 1×.
- A fuel can restores fuel only. It does not increment either wallet counter, award score,
  or keep the combo alive.
- A valid near miss adds a fixed `50` to `BonusScore`, with a 0.85-second detector cooldown.

The `coins` value submitted to the backend means standard coins only. The Unity and database
field named `pills` is the existing internal compatibility field for the exact GDG Coin
count. `bonus` in the iframe message becomes `bonus_score` in PostgreSQL.

Do not derive GDG Coins from standard coins. The old `floor(coins / 15)` behavior exists only
as a fallback estimate for legacy rows that predate exact counters.

---

## 7. Unity-to-React message contract

React creates a UUID before mounting each Unity iframe. The iframe URL contains only
non-secret metadata:

```text
/Build/index.html?run=<uuid>&u=<username>&dn=<display-name>&car=<vehicle-id>
```

At game over, Unity sends:

```json
{
  "type": "gameover",
  "run_id": "e84c2b9d-14e0-4d45-9f2f-9db83cd8c71d",
  "score": 965,
  "coins": 20,
  "pills": 5,
  "bonus": 100,
  "distance": 399,
  "duration": 17,
  "reason": "police"
}
```

`GameView.tsx` rejects the message unless all of the following are true:

1. `event.origin === window.location.origin`.
2. `event.source` is the mounted Unity iframe window.
3. `type` is `gameover`.
4. `run_id` equals the UUID React assigned to the current iframe.
5. The run UUID has not already been handled by this `GameView` instance.
6. All numeric fields are finite and non-negative.

The bridge uses `window.location.origin` as its `postMessage` target, not `*`. Keep the
origin and source checks even though the iframe is same-origin; they prevent unrelated page
scripts or nested frames from injecting a score event into the normal UI path.

The browser-to-Unity messages `unityFullscreen` and `unityExitFullscreen` are also accepted
only from the same-origin parent by the generated Unity host template.

---

## 8. Score persistence, retries, and leaderboard aggregation

### Normal submission path

1. Unity reports the final run once.
2. React validates and normalizes the payload.
3. React writes the run to the local pending queue before attempting the network request.
4. `submitScore` calls the authenticated Supabase RPC `submit_game_score`.
5. The RPC gets identity from `auth.uid()` rather than trusting the iframe/player labels.
6. PostgreSQL inserts the run once under unique `(user_id, run_id)`.
7. The existing score trigger calls `recompute_leaderboard()`.
8. The trigger recomputes the player's totals and global ranks.
9. The RPC returns authoritative wallet, personal-best, distance, game-count, and rank data.
10. React removes the local queue item and refreshes the wallet.

If the same UUID is retried, the RPC returns `duplicate` and does not insert or double-count
the run. Duplicate detection happens before the hourly rate count.

### Offline and interrupted submissions

Pending runs are stored under:

```text
localStorage['gdg-go:pending-scores:v1']
```

The queue retains at most 20 entries and de-duplicates by `userId + run_id`. It is flushed:

- when `ScoreQueueSync` mounts for a signed-in user;
- when the browser emits `online`;
- when `GameView` mounts for a signed-in user.

Permanent payload/check errors are removed from the queue. Network errors and missing-RPC
errors remain retryable. Clearing site data clears this queue, so it is retry support—not
durable server storage.

### Database validation envelope

Migration `0005` enforces, among other constraints:

- valid authenticated user and existing public profile;
- non-negative score, counters, bonus, and distance;
- duration of at least one second for new RPC submissions;
- at most 20 new score rows per user per hour;
- `gdg_coins = pills` on new run-ID rows;
- distance no greater than `duration_seconds × 75`;
- new-run pickup count no greater than `distance + 50`;
- score inside the possible distance/pickup/bonus envelope;
- near-miss bonus divisible by 50 and bounded against run duration.

These checks reject casual forged values and inconsistent telemetry. They do **not** make the
game simulation server-authoritative: a determined user can still alter a public WebGL
client and submit plausible values. Strong anti-cheat would require signed replays or a
server-owned simulation.

### Leaderboard fields and ordering

`public.leaderboard` has one row per driver:

| Field | Meaning |
|---|---|
| `best_score` | Maximum score across the driver's saved runs. |
| `total_coins` | Sum of standard coins across all saved runs. |
| `total_gdg_coins` | Exact sum for new rows, with a compatibility estimate for old rows. |
| `best_distance` | Maximum distance across saved runs. |
| `total_games` | Number of saved score rows. |
| `rank` | Global rank for drivers with a positive best score. |
| `last_played` | Most recent score timestamp. |

Rank ordering in migration `0005` is deterministic:

```text
best_score DESC,
best_distance DESC,
last_played ASC,
user_id ASC
```

The React leaderboard queries this aggregate first. If it is unavailable or empty, the API
falls back to reading up to 1,000 score rows and aggregating in the browser. That fallback is
for resilience, but it can be incomplete once the score table grows beyond the fetch limit;
the database aggregate is the intended production path.

---

## 9. Supabase schema and migration order

Run migrations in numeric order on a fresh project:

1. [`0001_init.sql`](supabase/migrations/0001_init.sql): `users`, `scores`, indexes, and base RLS.
2. [`0002_score_integrity.sql`](supabase/migrations/0002_score_integrity.sql): duration,
   plausibility checks, rate limiting, and identity stamping.
3. [`0003_relational_leaderboard.sql`](supabase/migrations/0003_relational_leaderboard.sql):
   relational leaderboard table and synchronization trigger.
4. [`0004_exact_gdg_coins.sql`](supabase/migrations/0004_exact_gdg_coins.sql): exact GDG fields
   and transitional aggregate logic.
5. [`0005_authoritative_score_submission.sql`](supabase/migrations/0005_authoritative_score_submission.sql):
   run UUID, bonus, immutable client policies, authenticated RPC, deterministic ranks, and
   repaired aggregates.
6. [`0006_users_email.sql`](supabase/migrations/0006_users_email.sql):
   adds `email` column and index to `public.users` for Table Editor admin visibility and backfills
   from `auth.users`.

For an existing environment already on `0004`, apply `0005` and `0006` in order. The migrations use
`if not exists`, policy drops, and function replacement where practical, but they are still
schema migrations—not scripts to run on every deploy.

Public browser roles can read public profiles, scores, and leaderboard data. After `0005`,
they cannot directly insert/update/delete score or leaderboard rows. Authenticated score
creation happens only through the security-definer RPC. Never expose the Supabase
`service_role` key to Vite, Unity, Git, or the browser.

Required Vite environment variables are documented in
[`web-hosting/.env.example`](web-hosting/.env.example):

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

The anon key is intended to be public and relies on RLS. The service-role key is not.

---

## 10. Mobile, fullscreen, and PWA contracts

### Viewport ownership

`App.tsx` writes `--app-height` from `window.visualViewport.height` when available, falling
back to `window.innerHeight`. It updates on resize, orientation change, and Visual Viewport
resize. The root uses this definite height so Safari browser chrome and keyboard changes do
not leave an oversized `100vh` layout.

The page shell follows these rules:

- `html`, `body`, `#root`, and `.app-root` are viewport-bound and do not body-scroll.
- `.app-main-view` is the scroll owner for normal routes.
- Individual long pages such as `/controls` and `/leaderboard` may scroll internally.
- Safe-area insets protect the Dynamic Island/notch and home indicator.
- Touch targets on coarse pointers are at least 44 px where practical.
- Root containers use `min-height: 0` in flex layouts so content can shrink instead of
  pushing controls below the viewport.

Do not reintroduce a site-wide fixed bottom navigation. It previously consumed game height,
appeared on unrelated routes, and caused the Unity canvas to look embedded rather than like
a game.

### Active game mode

Starting a run calls `requestFullscreenDisplay` from the launch gesture before React changes
the screen. This preserves the user gesture required by the Fullscreen API. `GameView` then
adds `body.game-active`, which:

- hides `.appbar` and `.footer`;
- fixes the app and main view to the viewport;
- mounts `.game-view-container` at `position: fixed; inset: 0`;
- gives the Unity iframe 100% width and height;
- disables page scrolling and browser touch gestures over the game.

The floating in-game controls are Garage, optional Enter Full Screen, audio, and restart.
They respect safe-area insets. A short gesture hint fades after six seconds; portrait mode
also shows a rotate hint.

On iOS, standard browser tabs do not offer the same programmable fullscreen/orientation
behavior as Chromium. Add to Home Screen is the intended app-like path. In standalone mode,
the code treats the app as fullscreen and attempts a best-effort landscape lock; iOS may
ignore programmatic orientation locking.

### Unity rendering on phones

The generated Unity page fills the iframe and removes Unity's stock footer and fullscreen
button. `copy-unity.js` caps coarse-pointer device pixel ratio to reduce WebGL fill cost:

- phone-width coarse pointer: maximum DPR 1;
- coarse pointer at 768 px or wider: maximum DPR 1.25;
- fine pointer desktop: maximum DPR 2.

The garage also avoids loading Three.js on phones. The 3D preview is enabled only when all
of these match: width at least 861 px, hover support, fine pointer, and no reduced-motion
preference. Other devices use the existing static vehicle images.

### PWA files

- [`web-hosting/public/manifest.webmanifest`](web-hosting/public/manifest.webmanifest):
  standalone display, app icons, theme colors, and Play/Leaderboard shortcuts.
- [`web-hosting/public/sw.js`](web-hosting/public/sw.js): network-first navigation and
  stale-while-revalidate caching for same-origin assets and Unity build files.
- [`web-hosting/src/main.tsx`](web-hosting/src/main.tsx): registers the service worker only
  in production.
- [`web-hosting/src/components/InstallPrompt.tsx`](web-hosting/src/components/InstallPrompt.tsx):
  install education on mobile; dismissal lasts seven days.

`sw.js` has an explicit cache version (`gdg-go-v2` at this review). Increment it when cache
behavior or non-fingerprinted public assets require existing installations to discard stale
entries. Vite-hashed SPA assets update naturally, but Unity filenames are stable and deserve
special attention during releases.

---

## 11. Responsive UI details that must be preserved

### Header and footer

- Desktop header: 68 px.
- Desktop logo: **44 px** height (`object-fit: contain`) with `1.22rem` title and 24 px divider.
- Mobile header: 60 px plus `env(safe-area-inset-top)`.
- Mobile mark: **32 px** width/height.
- Desktop footer: 52 px with 4-color Google brand dots (`#4285F4`, `#EA4335`, `#FBBC04`, `#34A853`).
- Footer hidden at 600 px and below, on short coarse-pointer landscapes, and during game mode.
- The dark desktop wordmark rule is scoped to `.logo-desktop.logo-dark`; do not use an
  unscoped `.logo-dark { display: block; }` rule because it can make both brand assets render
  and blow out the mobile width.

### Garage

- Desktop: two-column showcase with a lazy 3D preview.
- Mobile/tablet: one-column compact card with static image, stat bars, CTA, and a four-item
  thumbnail dock that fits the viewport.
- Swipe changes the selected vehicle; arrow buttons and thumbnail buttons remain available.
- At short heights, optional copy and wallet details collapse before essential controls.
- Do not replace or regenerate existing brand/vehicle images unless a task explicitly asks
  for asset changes.

### Leaderboard

- Desktop table uses seven columns: Rank, Driver, High Score, Cumulative Coins, GDG Coins,
  Best Distance, and Races.
- Below 900 px, `<thead>` is hidden and every driver row becomes a two-line CSS grid card.
- The current-driver profile and three wallet stats stack into a profile row plus a
  three-column stats row.
- Below 480 px, Refresh becomes an icon-only 48 px control.
- Long usernames and display names must truncate rather than increase page width.
- The page subtitle is exactly “Live Global Rankings”.

### How to Play

`/controls` documents the actual mobile/desktop input, Heat/fuel HUD, pickup values,
power-ups, and survival advice. It intentionally does not include a separate score-formula
panel. When tuning gameplay constants, update this page in the same change so the player
instructions stay truthful.

---

## 12. Build and deployment playbook

### One-time local setup

1. Install Node.js compatible with the committed lockfile (Node 20 LTS is the safest choice).
2. Install Unity **6000.0.81f1** with WebGL Build Support.
3. Create `web-hosting/.env.local` from `.env.example` and set the Supabase URL/anon key.
4. Apply Supabase migrations `0001` through `0006` in order.
5. Install web dependencies:

```bash
cd web-hosting
npm ci
```

### Web-only development

```bash
cd web-hosting
npm run dev
```

The Vite dev server listens on port 3000 and accepts LAN/tunnel host headers. The Unity game
will use whatever currently exists under `web-hosting/public/Build`.

### Rebuild Unity

1. Open `unity-project/` with Unity 6000.0.81f1.
2. Use `GDG Go > Validate Setup` and resolve missing assets/references.
3. If generated prefab or scene inputs changed, run the relevant setup/build menu commands.
   Be aware that `SceneBuilder` owns and rewrites the Game scene.
4. Run `GDG Go > Build WebGL`.
5. Confirm output exists at `unity-project/Build/`.

The build command includes only `Assets/Scenes/Game.unity`, enables Brotli with decompression
fallback and Unity data caching, disables WebGL exception stack traces, and writes to the
project's `Build` directory.

### Production builds

Web shell only, without refreshing the Unity copy:

```bash
cd web-hosting
npm run build:spa
```

Full production build:

```bash
cd web-hosting
npm run build
```

The full build performs:

1. `npm run unity:copy`
2. TypeScript compilation
3. Vite production build

`unity:copy` copies `unity-project/Build` to `web-hosting/public/Build` if present, writes the
custom edge-to-edge Unity `index.html`, and patches the Unity template CSS. Because
`web-hosting/public/Build` is tracked in git, remote CI environments (like Netlify) build
autonomously without requiring Unity in the cloud runner.

### Netlify

Deploy `web-hosting/` as the site root. [`web-hosting/netlify.toml`](web-hosting/netlify.toml)
defines:

- build command: `npm run build`;
- publish directory: `dist`;
- SPA fallback to `/index.html`;
- content-encoding and immutable caching for compressed Unity artifacts;
- no-cache behavior for the root `index.html`.

The build machine must receive `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## 13. Verification checklist

### Static checks

```bash
cd web-hosting
npx tsc --noEmit
npm run build:spa
git diff --check
```

Use `npm run build` before release to verify the Unity copy path as well. A Vite warning about
the large lazy Three.js chunk is currently informational; an actual TypeScript or build error
is not.

### Desktop browser

- `/`, `/leaderboard`, and `/controls` work by direct URL and browser back/forward.
- Sign-up (with mandatory username, display name, validated email, password), sign-in,
  sign-out, and theme persistence work.
- Garage arrows, thumbnails, stat bars, and launch button work.
- Unity receives keyboard focus and all keyboard controls work.
- Game mode hides the application header/footer.
- Result overlay reports score, standard coins, exact GDG Coins, bonus, distance, and time.
- A saved run updates wallet, current-driver card, race count, personal best, and rank.
- Refreshing or retrying the same run UUID does not double-count it.

### Phone browser and installed PWA

Test at minimum a 390 × 844 viewport plus one short landscape viewport:

- no horizontal page overflow;
- header content fits without the desktop logo appearing;
- no bottom Play/Leaderboard bar appears;
- garage card, vehicle image, stat bars, CTA, and four thumbnails fit;
- leaderboard driver cards and current-driver stats fit without clipping;
- `/controls` scrolls normally and every touch target remains usable;
- launching the game removes the site chrome and fills the visual viewport;
- safe areas protect floating controls and the result overlay;
- swipe, fast-fall, double-tap boost, mute, restart, and Garage work;
- Add to Home Screen launches with standalone styling;
- relaunching after a deployment does not remain stuck on stale Unity files.

### Supabase checks

After a real test run, inspect tables:

```sql
select run_id, score, coins, pills, gdg_coins, bonus_score,
       distance, duration_seconds, created_at
from public.scores
order by created_at desc
limit 10;

select id, username, display_name, email, created_at
from public.users
order by created_at desc
limit 10;

select user_id, username, best_score, total_coins, total_gdg_coins,
       best_distance, total_games, rank, last_played
from public.leaderboard
order by rank asc nulls last;
```

For every new run, `run_id` must be non-null and `pills = gdg_coins`. Re-submitting the same
user/run UUID must return `duplicate` without changing `total_games`, `total_coins`, or
`total_gdg_coins`.

---

## 14. Common failures and their actual causes

### Completed runs remain “queued”

Check, in order:

1. The user still has an authenticated Supabase session.
2. Migration `0005` exists in the target database.
3. `submit_game_score` is executable by `authenticated`.
4. The public profile row exists for `auth.uid()`.
5. The payload satisfies duration, distance, count, score, and bonus constraints.
6. The player has not exceeded 20 new runs in one hour.
7. Browser network and Supabase project status are healthy.

The browser queue is intentionally retained for retryable errors. Do not “fix” the symptom by
deleting the queue before finding the server failure.

### GDG totals do not match the result overlay

New rows must carry the exact count in both `pills` and `gdg_coins`. If leaderboard totals use
a standard-coin formula, the database is still running an older aggregate function. Apply
`0005`, then allow its repair query to rebuild the aggregate. Legacy rows remain estimates
because their exact count cannot be reconstructed after the fact.

### A run is saved twice

Verify the iframe receives a valid UUID under `run`, Unity returns it unchanged, the RPC is
used instead of a direct table insert, and the partial unique index
`scores_user_run_unique` exists. Do not create a new UUID while merely retrying the same run;
only Play Again/restart should create a new run identity.

### Honest runs fail the database plausibility checks

Compare gameplay tuning against migration `0005`. Changes to maximum speed, boost, pickup
values, maximum multiplier, bonus size, or bonus frequency may require a coordinated SQL
constraint update. Never loosen constraints without documenting the new legitimate maximum.

### Unity is not full-bleed on a phone

Confirm the current generated `public/Build/index.html` came from `copy-unity.js`, not Unity's
stock template. Confirm `body.game-active` is present and there is no persistent navigation
or footer consuming height. On iOS browser tabs, verify the installed Home Screen experience
separately because the Fullscreen API is restricted.

### The page is wider than the phone

Inspect desktop-only images and fixed/min widths first. The previous dark-logo regression
rendered both desktop and mobile marks. For leaderboard regressions, verify the below-900 px
card rules are active and that long names truncate. Avoid solving overflow by applying
`overflow-x: hidden` to a broken child; fix the child width so controls remain reachable.

### Unity changes do not appear in the website

There are two generated copies. Rebuild Unity into `unity-project/Build`, then run
`npm run unity:copy` or `npm run build`. Restart the dev server if necessary, unregister or
update the service worker, and clear the `gdg-go-*` caches while diagnosing stale local state.

### Audio is silent on iOS

Both the React BGM engine and generated Unity page attempt to resume audio after a touch,
click, or key gesture. Verify the player has interacted, the game is not muted, the iframe is
same-origin, and the device is not in a browser/device mute state. Autoplay before a gesture
should not be relied upon.

### Direct `/controls` or `/leaderboard` gives a 404

The host is missing the SPA fallback. On Netlify, keep the `/* -> /index.html 200` redirect.
Equivalent rewrite rules are required on any other host.

---

## 15. Safe change rules for future work

- Treat `GameSession.cs`, `GameView.tsx`, `api.ts`, and migration `0005` as one score contract.
  A telemetry field change must be updated end-to-end.
- Never trust username, display name, or user ID from Unity when writing scores. Identity must
  come from the authenticated database session.
- Never send Supabase JWTs or service-role credentials into Unity.
- Preserve the per-run UUID during retries; generate a new one only for a new run.
- Keep standard-coin and exact GDG Coin counters separate.
- Update database plausibility limits whenever legitimate gameplay maxima change.
- Do not edit `web-hosting/public/Build`, `unity-project/Build`, or `dist` manually.
- Be cautious when running Unity generator menu items: `SceneBuilder` and prefab builders can
  rewrite generated scene/prefab assets.
- Keep the game route free of the application header, footer, and persistent bottom bars.
- Preserve same-origin/source checks on every iframe message.
- Preserve safe-area padding, `visualViewport` height handling, and 44 px coarse-pointer
  targets when changing mobile layouts.
- Use existing branding and vehicle assets unless an asset replacement is explicitly in scope.
- Verify both normal browser mode and installed standalone mode before calling a mobile change
  complete.
- Before committing, inspect the dirty worktree and avoid bundling or reverting unrelated
  user changes.

---

## 16. Recommended release sequence

1. Review `git status` and the diff.
2. Apply pending Supabase migrations in staging (`0005`, `0006`).
3. Validate/rebuild the Unity Game scene only when Unity source changed.
4. Build Unity WebGL into `unity-project/Build`.
5. Run the full web build so `copy-unity.js` refreshes the embedded build in `web-hosting/public/Build`.
6. Run desktop and phone browser QA.
7. Run an authenticated test race and verify its raw score row, user email in `public.users`, and aggregate row.
8. Retry the same run identity to confirm idempotency.
9. Test installed PWA launch and service-worker update behavior.
10. Deploy the matching database, Unity, and React versions.
11. Smoke-test `/`, `/controls`, `/leaderboard`, game launch, result banking, and refresh in
    production.

That sequence prevents the most dangerous partial release: a new frontend emitting the new
payload while production still has the old direct-insert database contract.
