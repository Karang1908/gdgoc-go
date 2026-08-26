# GDGoC Go! — Complete Engineering Handoff

Last repository and live-host review: **21 August 2026**

Repository: `https://github.com/Karang1908/gdgoc-go.git`

Primary branch: `main`

Reviewed commit: `55d703e`

Live branded Vercel URL: **https://go.gdgocbpdc.tech**

Live FreeDNS/Netlify URL: **https://go-gdg.oc.com.ar**

Netlify project URL: **https://gdgoc-go.netlify.app**

Unity editor version: **6000.0.81f1**

This is the operational source of truth for an AI or engineer taking over the repository. It
covers the React host, Unity WebGL game, Supabase integrity system, PWA/mobile behavior,
generated assets, both hosting targets, live domains, testing, and safe release procedure.
Read it before changing code.

When this file conflicts with older planning documents, inspect the current source and
serialized Unity scene before following the older document. `PLAN.md`, `PLAN-website.md`,
`docs/PROJECT.md`, `docs/SETUP_GUIDE.md`, `docs/WEBSITE.md`, parts of `README.md`, and parts of
`CLAUDE.md` preserve useful history but contain stale architecture or gameplay tuning. Examples
of stale ideas include sending a Supabase JWT to Unity, building multiple Unity UI scenes,
older fuel intervals, and older GDG Coin unlock distances. None of those overrides the current
implementation.

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
17. [Known limitations and deliberate technical debt](#17-known-limitations-and-deliberate-technical-debt)
18. [AI takeover checklist](#18-ai-takeover-checklist)

---

## 1. Current state and deployment-critical notes

### Git and generated-build snapshot

At this review, local `main` and `origin/main` both point to `55d703e`. The relevant recent
commits are:

| Commit | Change |
|---|---|
| `55d703e` | Updated the FreeDNS guide with Vercel A-record fallback instructions. |
| `420da75` | Added Vercel Vite settings and the SPA rewrite. |
| `d3fd596`, `89645a9` | Updated the compiled Unity WebGL artifacts with the final pickup mix. |
| `9394892` | Set standard coin, GDG Coin, and power-up pickup SFX scales to `0.23`. |
| `de45462` | Set the React Web Audio background-music master gain to `0.28`. |
| `6f3fae9` | Finalized registration labels, placeholders, and contact guidance. |

The working tree was clean before this handoff rewrite. After the rewrite, `HANDOFF.md` should
be the only expected local change. Always run `git status --short` yourself: the user may have
made new work since this snapshot, and existing changes must not be overwritten, discarded,
or bundled into an unrelated commit.

`unity-project/Build/` exists locally and is gitignored. The SHA-1 hashes of its current data,
framework, loader, and WASM outputs match the corresponding tracked files under
`web-hosting/public/Build/Build/`. The tracked WebGL data file is about 5.4 MB and WASM is
about 8.5 MB. `web-hosting/public/Build/index.html` is intentionally different from Unity's
stock output because `copy-unity.js` replaces it with the full-bleed iframe host template.

### Live deployment snapshot

Two independent deployments are currently live:

| URL | Host | DNS state verified 21 Aug 2026 | Purpose |
|---|---|---|---|
| `https://go.gdgocbpdc.tech` | Vercel | CNAME to the project-specific `vercel-dns-017.com` target; HTTPS 200 | New branded domain and preferred long-term origin. |
| `https://go-gdg.oc.com.ar` | Netlify | A record to Netlify; HTTPS 200 | Existing FreeDNS deployment/fallback origin. |
| `https://gdgoc-go.netlify.app` | Netlify | Provider hostname | Netlify project URL and troubleshooting fallback. |

`gdgocbpdc.tech` was registered through get.tech. Its authoritative nameservers are currently
the four `tech-domains.*.orderbox-dns.com` nameservers. The `go` record is managed in that DNS
panel, not FreeDNS. The Vercel project-specific target currently resolves and Vercel returns
the SPA shell for `/leaderboard` plus `application/vnd.unity` responses for `.unityweb`
artifacts. Do not hard-code provider IPs or the current CNAME target in application source;
use the exact values displayed by the host when DNS is recreated.

The two origins do not share browser-local state. Supabase sessions, the retry queue, PWA
installation, service-worker caches, theme, and mute preferences are all origin-scoped. A
player moving from one hostname to the other may need to sign in and install the PWA again.
Pick one public URL for event communication rather than alternating links.

### Validation performed for this review

| Check | Result |
|---|---|
| `npm run build:spa` | Passed with Vite's informational large Three.js chunk warning. |
| `git diff --check` | Passed. |
| Local Unity output vs tracked public build | Core data/framework/loader/WASM SHA-1 hashes match. |
| `go.gdgocbpdc.tech` DNS/TLS/root/SPA/Unity assets | HTTPS 200; Vercel serves the Unity files and direct `/leaderboard` route. |
| `go-gdg.oc.com.ar` DNS/TLS/root/SPA route | HTTPS 200 from Netlify. |
| No-Unity C# compile harness | Fails with 116 missing-stub errors; see Sections 13 and 17. |
| SQL integrity test | Not run; no isolated migrated test database was supplied. |
| Live Supabase grants/migration ledger | Not inspected during this review. |

This review verified repository state, DNS, TLS, and HTTP responses. It did **not** query the
live Supabase migration ledger or private run tables. The user previously confirmed Migration
`0005` was applied, and the current client requires Migration `0007`, but a future maintainer
must verify the actual production RPC signatures and grants before a competitive release.
Never infer database state solely from a deployed frontend bundle.

The application is a React/Vite single-page app that embeds a one-scene Unity WebGL build
in a same-origin iframe. React owns authentication, profiles, routing, score persistence,
leaderboard rendering, PWA installation, theme, and the game-over overlay. Unity owns the
actual run: movement, obstacles, police Heat, fuel, pickups, power-ups, score calculation,
and the final run telemetry.

The following pieces must be deployed together:

1. The current Unity WebGL build in `web-hosting/public/Build/` (tracked for cloud CI).
2. The current React host in `web-hosting/`.
3. Supabase migrations through
   [`0007_competitive_run_integrity.sql`](supabase/migrations/0007_competitive_run_integrity.sql).

Migration `0007` is mandatory for the current frontend and Unity source. It replaces the
one-shot Migration `0005` score RPC with server-issued run tickets, server-timed checkpoints,
exact pickup-score validation, and a one-time finalizer. It also removes the old seven-argument
`submit_game_score` RPC. The Migration `0007` database, React host, and freshly rebuilt Unity
WebGL output are one release unit. Any mixed deployment will prevent ranked runs from starting
or saving; do not apply or deploy only one part.

Migration `0005` remains a prerequisite and is the layer that made score/leaderboard rows
client-immutable and run submission idempotent. Migration `0007` closes its central weakness:
the old RPC accepted a client-created run UUID and trusted a single plausible-looking final
payload. The browser can now create score rows only after a matching server-issued run has
advanced through the checkpoint state machine.

Migration `0006` adds the `email` column/index to `public.users` and backfills from
`auth.users`. Its current grants accidentally make that email publicly selectable as part of
the profile row; treat the privacy repair in Section 17 as high priority.

Important current product behavior:

- Routes are `/`, `/leaderboard`, and `/controls`.
- The header contains Play, Leaderboard, How to Play, wallet, theme, and account controls on
  desktop. On narrow phones, the layout compresses to the GDG mark, How to Play, wallet,
  theme, and account controls.
- The desktop navbar logo is rendered at **44 px** height with balanced brand lockup and
  a 32 px compact mark on mobile.
- In the registration modal (`AuthModal.tsx`), **nothing is optional**: username, name,
  validated email address, and password are all mandatory. The database field remains
  `display_name`, but the player-facing label is intentionally just “Name”.
- Registration placeholders do not suggest fake example identities. A visible notice asks
  players to use their real name and email address for score verification and contact.
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
- The guest landing page uses `web-hosting/public/branding/gdgoc-go-logo.png`, a 1536 × 1024
  transparent PNG containing the exact tagline “BUILD. CONNECT. RACE.”. It is intentionally
  large: up to 520 px wide on desktop and 230–280 px wide on phones.

The working tree may contain uncommitted Unity, React, migration, PWA, and documentation
changes. Always run `git status --short` before editing or committing, and do not discard
changes that are unrelated to the current task.

The current Unity WebGL player was built with Unity 6000.0.81f1 and includes the Migration
`0007` checkpoint/final-score contract, the final `0.23` pickup SFX mix, and Xbox/PS5
controller support through Unity Input System 1.19. `npm run build` copied it into
`web-hosting/public/Build/`, and the four core build artifacts match the local Unity output
byte-for-byte. Deploy these WebGL artifacts, the React host, and Migration `0007` together.
A green `build:spa` alone does not rebuild or refresh Unity.

---

## 2. Repository map and sources of truth

| Path | Responsibility |
|---|---|
| [`web-hosting/`](web-hosting/) | React 18, TypeScript, Vite, Supabase client, PWA shell, and deployment root for both Netlify and Vercel. |
| [`unity-project/`](unity-project/) | Unity 6 project and the single `Game` scene used by the WebGL build. |
| [`supabase/migrations/`](supabase/migrations/) | Ordered database schema, integrity rules, leaderboard aggregation, score RPC, and email visibility. |
| [`web-hosting/public/branding/`](web-hosting/public/branding/) | Existing web-facing GDG, vehicle, and game artwork. |
| [`web-hosting/public/Build/`](web-hosting/public/Build/) | Generated copy of the Unity WebGL build, tracked in Git so cloud builds do not require Unity. |
| [`unity-project/Build/`](unity-project/Build/) | Generated Unity WebGL output. It is gitignored. |
| [`web-hosting/dist/`](web-hosting/dist/) | Generated production site. Never edit it manually. |
| [`web-hosting/scripts/copy-unity.js`](web-hosting/scripts/copy-unity.js) | Copies Unity output into the Vite public tree and replaces Unity's stock page with the full-bleed host template. |
| [`web-hosting/netlify.toml`](web-hosting/netlify.toml) | Netlify build, SPA fallback, and legacy compressed-asset headers. |
| [`web-hosting/vercel.json`](web-hosting/vercel.json) | Vercel Vite build/output settings and SPA rewrite. |
| [`docs/FREEDNS_CUSTOM_DOMAINS.md`](docs/FREEDNS_CUSTOM_DOMAINS.md) | Step-by-step FreeDNS custom-domain setup for Netlify and Vercel, including shared-domain restrictions and troubleshooting. |
| [`HANDOFF.md`](HANDOFF.md) | Current cross-system handoff and deployment contract. |

### Files that control the live React behavior

| File | What it owns |
|---|---|
| [`web-hosting/src/App.tsx`](web-hosting/src/App.tsx) | Providers, route selection, dynamic viewport height, header/footer shell, and game-active global layout. |
| [`web-hosting/src/lib/routes.ts`](web-hosting/src/lib/routes.ts) | Mapping between browser paths and the three application routes. |
| [`web-hosting/src/components/Navbar.tsx`](web-hosting/src/components/Navbar.tsx) | Responsive header, 44 px logo branding, route controls, wallet, theme, profile, and sign-out. |
| [`web-hosting/src/home/Home.tsx`](web-hosting/src/home/Home.tsx) | Guest landing page, responsive hero-brand sizing, authenticated garage, game launch, and game exit. |
| [`web-hosting/src/home/CarPicker.tsx`](web-hosting/src/home/CarPicker.tsx) | Vehicle carousel, stat bars, swipe/arrow selection, and start button. |
| [`web-hosting/src/components/CarShowcase3D.tsx`](web-hosting/src/components/CarShowcase3D.tsx) | Lazy Three.js vehicle preview for capable desktop devices. |
| [`web-hosting/src/home/GameView.tsx`](web-hosting/src/home/GameView.tsx) | Full-screen game shell, server run tickets, ordered checkpoints, trusted Unity messages, final submission, retry state, audio, and result overlay. |
| [`web-hosting/src/components/UnityEmbed.tsx`](web-hosting/src/components/UnityEmbed.tsx) | Same-origin Unity iframe, query parameters, focus, and fullscreen messages. |
| [`web-hosting/src/home/ResultOverlay.tsx`](web-hosting/src/home/ResultOverlay.tsx) | Final run metrics, banked totals, save state, replay, and leaderboard action. |
| [`web-hosting/src/home/AuthModal.tsx`](web-hosting/src/home/AuthModal.tsx) | Registration and sign-in modal with validated email address, required real-name guidance, concise placeholders, and password toggle. |
| [`web-hosting/src/leaderboard/Leaderboard.tsx`](web-hosting/src/leaderboard/Leaderboard.tsx) | Podium, current-driver card, search, refresh, desktop table, and mobile cards. |
| [`web-hosting/src/controls/Controls.tsx`](web-hosting/src/controls/Controls.tsx) | `/controls` instructions for gestures, keyboard controls, HUD, pickups, power-ups, and survival tips. |
| [`web-hosting/src/context/AuthContext.tsx`](web-hosting/src/context/AuthContext.tsx) | Supabase session, validated email registration, public profile persistence, and wallet refresh. |
| [`web-hosting/src/lib/api.ts`](web-hosting/src/lib/api.ts) | Run-ticket/checkpoint/finalize RPCs, score payload validation, short-interruption retry queue, leaderboard queries, and fallback aggregation. |
| [`web-hosting/src/lib/bgm.ts`](web-hosting/src/lib/bgm.ts) | Synthesized Web Audio soundtrack, mute persistence, and the `0.28` master gain. |
| [`web-hosting/src/components/ScoreQueueSync.tsx`](web-hosting/src/components/ScoreQueueSync.tsx) | Background flush of queued runs after sign-in or reconnect. |
| [`web-hosting/src/lib/gameDisplay.ts`](web-hosting/src/lib/gameDisplay.ts) | Standalone-mode detection, Fullscreen API wrappers, and best-effort landscape lock. |
| [`web-hosting/src/components/InstallPrompt.tsx`](web-hosting/src/components/InstallPrompt.tsx) | Android install prompt and iOS Safari Add to Home Screen guidance. |
| [`web-hosting/src/styles/globals.css`](web-hosting/src/styles/globals.css) | Fonts, Google theme tokens, reset, root viewport lock, controls, and shared responsive styles. |

### Files that control the live Unity behavior

| File | What it owns |
|---|---|
| [`unity-project/Assets/Scenes/Game.unity`](unity-project/Assets/Scenes/Game.unity) | Serialized runtime values and references. Scene values override C# field defaults. |
| [`unity-project/Assets/Scripts/Core/GameSession.cs`](unity-project/Assets/Scripts/Core/GameSession.cs) | In-run score, exact pickup-score accumulator, combo, Heat, fuel, power-up flags, crashes, five-second integrity checkpoints, and final telemetry. |
| [`unity-project/Assets/Scripts/Audio/AudioManager.cs`](unity-project/Assets/Scripts/Audio/AudioManager.cs) | Unity one-shot SFX pool and per-event pickup gain scales. The scene has no Unity music clip. |
| [`unity-project/Assets/Scripts/Gameplay/WorldScroller.cs`](unity-project/Assets/Scripts/Gameplay/WorldScroller.cs) | Distance, difficulty, cruising speed, boost speed, and braking speed. |
| [`unity-project/Assets/Scripts/Gameplay/PlayerCar.cs`](unity-project/Assets/Scripts/Gameplay/PlayerCar.cs) | Lane movement, jump/fast-fall, keyboard, swipe, Xbox/PS5 gamepad input, braking, and boost. |
| [`unity-project/Assets/Scripts/Gameplay/PlayerCollision.cs`](unity-project/Assets/Scripts/Gameplay/PlayerCollision.cs) | Crash handling, shields, and temporary invulnerability. |
| [`unity-project/Assets/Scripts/Gameplay/NearMissDetector.cs`](unity-project/Assets/Scripts/Gameplay/NearMissDetector.cs) | Fixed +50 near-miss awards with cooldown. |
| [`unity-project/Assets/Scripts/Coins/CoinSpawner.cs`](unity-project/Assets/Scripts/Coins/CoinSpawner.cs) | Standard coin patterns, GDG Coin frequency/milestones, and fuel scheduling. |
| [`unity-project/Assets/Scripts/Coins/CoinPickup.cs`](unity-project/Assets/Scripts/Coins/CoinPickup.cs) | Collection, magnet behavior, fuel routing, value reporting, and pickup effects. |
| [`unity-project/Assets/Scripts/PowerUps/PowerUpSpawner.cs`](unity-project/Assets/Scripts/PowerUps/PowerUpSpawner.cs) | Power-up timing, weights, lane selection, and color coding. |
| [`unity-project/Assets/Scripts/UI/HUD.cs`](unity-project/Assets/Scripts/UI/HUD.cs) | Score animation, combo, fuel, alerts, power-up icons, and portrait scaling. |
| [`unity-project/Assets/Scripts/Supabase/SupabaseSession.cs`](unity-project/Assets/Scripts/Supabase/SupabaseSession.cs) | Reads non-secret run/player/car metadata from the iframe URL. It does not connect to Supabase. |
| [`unity-project/Assets/Plugins/WebGL/PostMessageBridge.jslib`](unity-project/Assets/Plugins/WebGL/PostMessageBridge.jslib) | Sends checkpoint and final Unity telemetry to the same-origin React parent. |
| [`unity-project/Assets/Editor/ProjectSetup.cs`](unity-project/Assets/Editor/ProjectSetup.cs) | Project setup, WebGL settings, validation, and the `GDG Go/Build WebGL` menu command. |
| [`unity-project/Assets/Editor/SceneBuilder.cs`](unity-project/Assets/Editor/SceneBuilder.cs) | Rebuilds the Game scene and its runtime object graph. |
| [`unity-project/Assets/Editor/PrefabsBuilder.cs`](unity-project/Assets/Editor/PrefabsBuilder.cs) | Generates the prefabs used by the scene. |

### Source-of-truth precedence

Use this order when values disagree:

1. Deployed Supabase schema and grants for database behavior.
2. `supabase/migrations/0007_competitive_run_integrity.sql` plus its test for the intended
   integrity contract.
3. `Assets/Scenes/Game.unity` for serialized runtime tuning and object references.
4. C# and TypeScript source for runtime algorithms and field defaults.
5. `HANDOFF.md` for cross-system intent and operational procedure.
6. `README.md`, `CLAUDE.md`, and `docs/` for background only.

Scene serialization matters: a public Unity field initializer is only the value assigned to a
new component. Existing scene components retain their serialized values. For example,
`WorldScroller.cs` currently declares defaults of 38 maximum speed and a 3,000 m ramp, while
the actual Game scene uses 46 and 1,000 m. The scene is the shipped runtime truth.

---

## 3. Runtime architecture

The browser runtime is deliberately split at the iframe boundary:

```text
React SPA
  ├─ Supabase Auth session and public profile (with email)
  ├─ garage, /controls, /leaderboard, result overlay
  ├─ requests a single-use run ID + secret from Supabase
  ├─ keeps the secret in React (never passes it to Unity)
  ├─ embeds /Build/index.html?run=...&u=...&dn=...&car=...
  └─ receives and validates checkpoints plus one gameover message
        ↓ same-origin window.postMessage
Unity WebGL iframe
  ├─ parses non-secret query metadata
  ├─ runs the chase and calculates the score
  ├─ reports exact cumulative telemetry every five seconds
  └─ reports final telemetry once
        ↓ authenticated Supabase RPC from React only
Supabase
  ├─ owns private run/checkpoint state and server timing
  ├─ rejects backward, impossible, unissued, expired, or mismatched telemetry
  ├─ inserts one integrity-version-1 score row once per issued run
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

### Unity world/streaming contract

The player car never advances along Z. `WorldScroller` runs at execution order `-100` and owns
the single forward simulation:

- `Distance`: absolute track-space metres completed in the run;
- `ScrollDelta`: metres advanced in the current frame;
- `Speed`: current forward speed after brake/boost smoothing;
- `BaseSpeed`: the unmodified difficulty-ramp speed.

Road, traffic, obstacles, pedestrians, coins, power-ups, and scenery stream toward the fixed
player. The streaming spawners share the `ScrollingSpawner` base contract: schedule in absolute
track space, convert with `WorldScroller.TrackToWorldZ`, move every tracked instance by
`-ScrollDelta`, and cull behind the camera. Mixing track-space schedule values with current
world-space Z causes frozen, duplicate, or unreachable content. `LaneReservations` coordinates
hazard lanes and is cleared when the world resets.

The WebGL player contains one scene only: `Assets/Scenes/Game.unity`. React is the menu,
authentication, garage, result screen, and leaderboard; do not reintroduce Unity menu/login/
leaderboard scenes without deliberately replacing the current architecture.

### Unity asset-generation contract

Most art/audio comes from the imported Kenney, Quaternius, and Mixamo assets documented in
`docs/ASSETS.md`. `RawAssets/` is a multi-gigabyte local source cache and is intentionally
gitignored. Unity-imported assets and their `.meta` files under `unity-project/Assets/` are
tracked; preserve GUID pairs.

The road and some runtime assets are generated from code. `PrefabsBuilder` and `SceneBuilder`
are ownership tools, not harmless validators: running them can rewrite prefabs, meshes, scene
serialization, references, and tuning. `ProjectSetup.ValidateSetup` is the safer first check.
Review the full generated diff after invoking a builder and do not accept broad rewrites merely
to satisfy a small requested change.

---

## 4. Authentication and player identity

Player registration collects:

- **Username**: 3–24 characters (letters, numbers, `_`, `-`), unique across drivers.
- **Name**: 2–24 characters (mandatory), shown publicly on the leaderboard. It is persisted
  under the existing `display_name` database column and API property.
- **Email Address**: Validated email address format (`name@example.com`), stored in `auth.users`
  and persisted in `public.users.email` for score verification/contact. The current public
  table grants expose it more broadly than intended.
- **Password**: At least 6 characters.

The registration form intentionally uses the neutral placeholders “Your username”, “Your
name”, and “Your email address”. It also asks entrants to use real contact details so score
verification does not become an event-day support problem. Do not restore fake-looking
examples such as `Speedster99`, `Alex Rivera`, or `alex@example.com`.

The public identity is stored in `public.users`:

- `id`: matching `auth.users.id` UUID.
- `username`: unique login handle.
- `display_name`: public name shown on the leaderboard.
- `email`: player's submitted email address (added in Migration `0006`). Format validation
  does not prove ownership while confirmation is disabled. Despite the migration comment
  describing admin visibility, the current grants/policy expose this column to public SELECT;
  see the security and known-limitations sections.

Sign In reliably supports the registered **Email Address**. The UI also says “Username or
Email”, but the present username branch converts a username to
`<username>@gdg-go.local`. That works only for older synthetic-email accounts; it does not
look up the real email belonging to a new real-email account. Therefore do not promise new
players that username-only login works until the implementation is corrected with a safe
server-side username-to-auth flow. This is documented again in the known-limitations section.

`AuthContext` restores the Supabase session on load, fetches the public profile, creates a
fallback profile when necessary, and refreshes wallet/driver totals from the leaderboard
aggregate.

The current event flow assumes Supabase email confirmation is disabled so `signUp` immediately
establishes an active session. If confirmation is enabled later, rewrite the signup success
state and add every live origin to Supabase Auth's Site URL/allowed redirect configuration;
the current automatic sign-in attempt is not a complete confirmation-email UX.

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

### Xbox and PS5 controllers

- Left stick or D-pad left/right: move one lane. The stick must return near centre before
  another lane change can trigger, preventing drift or a held direction from skipping lanes.
- Xbox `A` or PS5 `Cross`: jump.
- Xbox `B`, PS5 `Circle`, left-stick down, or D-pad down: brake; while airborne, fast-fall.
- Hold Xbox `RT` or PS5 `R2`: boost.
- Unity reads the controller through Input System `Gamepad.current`. Controllers may be
  connected or reconnected during a run. In a browser, the player may need to press any
  controller button once after the game opens before the Gamepad API exposes input.
- Input System 1.19 includes `DualSenseGamepadHID`; on WebGL, browser controllers arrive as
  `WebGLGamepad`. Both inherit the generic `Gamepad` controls used by `PlayerCar`, so the
  gameplay path does not need platform-specific branches.
- The project uses `activeInputHandler: 2` (`Both`) so legacy keyboard/touch input and the
  Input System gamepad path can coexist. Do not switch the project to old input only.

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
`46 × 1.55 = 71.3` units/s. Migration `0007` validates the full-run distance against the
serialized acceleration curve and also caps checkpoint-to-checkpoint movement at the boosted
peak with small frame/rounding headroom.

### Power-up durations in the current scene

| Power-up | Behavior | Duration |
|---|---|---:|
| Magnet | Pulls non-fuel pickups within the configured radius | 8 s |
| Nitro | Forces boost | 5 s |
| Shield | Absorbs one whole crash, including its combo reset | Until hit |
| 2× | Doubles the pickup score after the normal combo multiplier | 10 s |
| Police Freeze | Stops Heat loss | 6 s |

### Current audio mix

There are two separate audio systems:

- React synthesizes the background music in `web-hosting/src/lib/bgm.ts`. Its unmuted master
  gain is `0.28` in both initial context setup and unmute transitions.
- Unity plays gameplay SFX through `AudioManager.cs`. `PlayCoin`, `PlayPill`, and
  `PlayPowerUp` each use a `0.23` per-event volume scale. The Game scene serializes the global
  SFX gain as `1`, so the effective scale for those three events is currently `0.23`.

The scene's Unity `musicLoop` reference is null, and no runtime code calls `PlayMusic`; the
React Web Audio engine is the audible music bed. Do not change `musicVolume` in the Unity
scene expecting it to tune the current soundtrack.

Other Unity SFX intentionally retain their own levels: fuel `0.9`, jump `0.85`, swerve `0.5`,
hover `0.6`, and crash/police/game-over at their wrapper defaults. The user's final requested
balance is pickup SFX below the background music: keep the three pickup scales at `0.23` and
the React master at `0.28` unless a new request explicitly supersedes it.

Changing `AudioManager.cs` is not enough to change the deployed game. Rebuild Unity WebGL,
copy the build into `web-hosting/public/Build`, confirm the generated data/WASM diff, then
deploy. A TypeScript-only build will keep the old compiled C# behavior.

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
count. `coin_score` is the exact accumulated pickup score after combo and 2× modifiers.
`bonus` in the iframe message becomes `bonus_score` in PostgreSQL. Migration `0007` requires
the exact identity `score = distance × 2 + coin_score + bonus_score`; it no longer accepts a
broad estimated score envelope.

Do not derive GDG Coins from standard coins. The old `floor(coins / 15)` behavior exists only
as a fallback estimate for legacy rows that predate exact counters.

---

## 7. Unity-to-React message contract

React calls `start_game_run` before mounting each Unity iframe. Supabase creates the run UUID,
an unguessable run secret, its issue time, and its expiry time. React retains the secret and
passes only the run UUID plus non-secret display metadata to Unity:

```text
/Build/index.html?run=<uuid>&u=<username>&dn=<display-name>&car=<vehicle-id>
```

While the game is running, Unity sends cumulative telemetry every five seconds with
`"type": "runcheckpoint"`. At game over, it sends the same totals with
`"type": "gameover"`:

```json
{
  "type": "gameover",
  "run_id": "e84c2b9d-14e0-4d45-9f2f-9db83cd8c71d",
  "score": 965,
  "coins": 20,
  "pills": 1,
  "coin_score": 67,
  "bonus": 100,
  "distance": 399,
  "duration": 17,
  "reason": "police"
}
```

`GameView.tsx` rejects the message unless all of the following are true:

1. `event.origin === window.location.origin`.
2. `event.source` is the mounted Unity iframe window.
3. `type` is `runcheckpoint` or `gameover`.
4. `run_id` equals the server-issued UUID assigned to the current iframe.
5. A final `gameover` for that run UUID has not already been handled by this `GameView`.
6. All numeric fields are finite and non-negative.

React serializes checkpoint RPC calls so an earlier checkpoint cannot arrive after a later one.
The bridge uses `window.location.origin` as its `postMessage` target, not `*`. Keep the origin
and source checks even though the iframe is same-origin; they prevent unrelated page scripts
or nested frames from injecting telemetry into the normal UI path. These browser checks are
defense in depth; the database remains the competitive-integrity boundary.

The browser-to-Unity messages `unityFullscreen` and `unityExitFullscreen` are also accepted
only from the same-origin parent by the generated Unity host template.

---

## 8. Score persistence, retries, and leaderboard aggregation

### Normal submission path

1. React calls `start_game_run(build_version, car_id)` and receives one active run ticket.
2. Unity reports cumulative checkpoint telemetry every five seconds.
3. React validates, normalizes, serializes, and forwards it to `checkpoint_game_run` together
   with the retained run secret and a unique checkpoint ID.
4. PostgreSQL locks the run, verifies ownership/secret/status/server timing, exact score
   arithmetic, monotonic counters, gameplay-derived speed/pickup/value/bonus ceilings, and
   stores the checkpoint in a private append-only table.
5. At game over, React queues the final payload locally, records one final checkpoint, and
   calls the nine-argument `submit_game_score` finalizer.
6. The finalizer requires an exact match with the latest accepted checkpoint, marks the run
   submitted once, and inserts one immutable `integrity_version = 1` score row.
7. The score trigger recomputes the player's totals and deterministic global ranks.
8. The RPC returns the authoritative wallet, personal best, distance, game count, and rank.
9. React removes the local queue item and refreshes the wallet.

If a submit committed but its HTTP response was lost, the exact final checkpoint retry is
accepted and the finalizer returns `duplicate` with the original score ID. It cannot insert or
double-count the run. Run starts and submissions use per-player transaction advisory locks so
parallel requests cannot race the rate limits or create two final rows.

### Offline and interrupted submissions

Pending runs are stored under:

```text
localStorage['gdg-go:pending-scores:v2']
```

Each queue record contains the user ID, final payload, and that run's server secret. The queue
retains at most 20 entries and de-duplicates by `userId + run_id`. It is flushed:

- when `ScoreQueueSync` mounts for a signed-in user;
- when the browser emits `online`;
- when `GameView` mounts for a signed-in user.

Permanent payload/check errors are removed from the queue. Network errors remain retryable.
The server clock may trail client run time by at most five minutes, so this queue recovers short
network interruptions and lost responses; it is not offline gameplay or durable server storage.
Clearing site data discards it. Migration `0007` intentionally invalidates the old v1 queue,
whose entries have no server-issued secret and therefore cannot be proven.

### Database validation envelope

Migration `0007` enforces, among other constraints:

- valid authenticated user and existing public profile;
- a random server-issued run ID/secret owned by `auth.uid()`, with only one active run;
- a 2-hour-15-minute run expiry, at most 30 starts/hour, and at most 20 saved scores/hour;
- append-only, sequential checkpoints whose reported duration follows server elapsed time,
  with the first and every subsequent client-time gap capped at 15 seconds;
- monotonic score, distance, counters, and duration;
- the exact score identity, combo-ramp maximum pickup score, and separate standard/GDG values;
- a conservative GDG Coin rarity ceiling derived from the 5.5% roll, 100 m milestones, and
  extra streaming/randomness slack;
- the current acceleration/boost distance ceiling;
- current coin-pattern spawn-density and near-miss cadence ceilings;
- a fresh final checkpoint that exactly matches the final submission;
- one-time finalization and immutable score/leaderboard rows for browser roles.

This is tamper-resistant competitive validation, not a mathematically server-authoritative
game. Because WebGL code executes on the player's device, a determined bot can still automate
play or manufacture a real-time stream that remains inside every legitimate bound. Preventing
that final class requires the server to simulate/replay the run (or verify a deterministic
input replay). Never describe client-side WebGL scoring as impossible to cheat.

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
   adds `email` and its index to `public.users`, backfills from `auth.users`, and currently
   leaves whole-table SELECT available to `anon`/`authenticated` (privacy debt).
7. [`0007_competitive_run_integrity.sql`](supabase/migrations/0007_competitive_run_integrity.sql):
   private run/checkpoint ledger, server-issued run secrets, exact score arithmetic and
   gameplay-derived validation, single-use finalization, verified score markers, reduced RPC
   privileges, and removal of the vulnerable Migration `0005` one-shot RPC signature.

For an existing environment on `0005`, apply `0006` (if it is not already present), then
`0007`. The migrations use `if not exists`, policy drops, and function replacement where
practical, but they are still schema migrations—not scripts to run on every deploy.

Public browser roles can read profiles, scores, and leaderboard data. **Migration `0006`
currently grants whole-row SELECT on `public.users`, and the original public-read RLS policy
uses `true`; therefore `public.users.email` is also publicly readable through the data API.**
That is an unresolved privacy problem, not admin-only visibility. Fix it with a public view or
column-level privilege/policy design before collecting contact data at scale; do not break the
profile reads required by the UI while doing so.

Browser roles cannot insert/update/delete score or leaderboard rows, use the `private` schema,
or execute trigger helpers. The only competitive write surface is the authenticated trio
`start_game_run`, `checkpoint_game_run`, and the new nine-argument `submit_game_score`; all
three derive player identity from `auth.uid()`. Never expose the Supabase `service_role` key to
Vite, Unity, Git, or the browser.

`private.game_runs` and `private.game_run_checkpoints` are operational audit state. They have
RLS enabled and no browser table grants. `public.scores.coin_score` records exact pickup points,
and `public.scores.integrity_version = 1` identifies rows finalized by Migration `0007`.
Pre-`0007` rows remain at version `0` because their old one-shot telemetry cannot be proven
retroactively; do not silently relabel them as verified.

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

Every hostname creates an independent PWA origin. Installing from `go-gdg.oc.com.ar` and later
opening `go.gdgocbpdc.tech` creates a second service worker/cache/session context; the first
installed icon does not migrate. Use the intended long-term hostname in QR codes and event
instructions before asking players to Add to Home Screen.

---

## 11. Responsive UI details that must be preserved

### Guest landing page

- The right-side desktop hero artwork is the transparent high-resolution asset at
  `public/branding/gdgoc-go-logo.png`.
- The logo text and tagline are part of one raster asset; do not recreate the tagline in CSS
  or add a second text row beneath it.
- The visible text is exactly `GDGoC GO!` and `BUILD. CONNECT. RACE.`.
- Desktop uses a balanced two-column hero, a logo frame up to 560 px, and artwork up to
  520 px wide/420 px tall.
- Below 820 px the hero stacks vertically and the artwork uses
  `clamp(230px, 70vw, 280px)` with a 190 px height cap.
- Keep `object-fit: contain`, transparent edges, and the soft drop shadow. Do not crop or
  stretch the logo.
- The asset was deliberately regenerated at 1536 × 1024 to remove the prior blur. Avoid
  replacing it with the old low-resolution version.

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
4. Apply Supabase migrations `0001` through `0007` in order.
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
`web-hosting/public/Build` is tracked in git, cloud builds do not require Unity. When the
gitignored local source build is absent, `unity:copy` logs that fact and leaves the tracked
public copy intact. Vercel deliberately runs `build:spa` so its build never attempts the
sibling Unity-copy step.

### Netlify

Deploy `web-hosting/` as the site root. [`web-hosting/netlify.toml`](web-hosting/netlify.toml)
defines:

- build command: `npm run build`;
- publish directory: `dist`;
- SPA fallback to `/index.html`;
- optional content-encoding/cache rules for `.br`/`.gz` Unity outputs;
- no-cache behavior for the root `index.html`.

The build machine must receive `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The currently tracked Unity filenames end in `.unityweb` and use Unity's decompression
fallback. Do not rename them to `.br` or add `Content-Encoding: br` blindly; serve the exact
output produced by the configured Unity build and test it in the browser.

### Vercel

Deploy with `web-hosting/` as the project Root Directory. `web-hosting/vercel.json` defines:

- framework: Vite;
- build command: `npm run build:spa`;
- output directory: `dist`;
- catch-all rewrite to `/index.html` for the History API router.

The Vercel project needs the same two `VITE_SUPABASE_*` environment variables in every
environment that should talk to the production database. Redeploy after adding or changing a
Vite environment variable because values are compiled into the browser bundle.

`build:spa` is intentional on Vercel: the committed `public/Build` directory is already the
deployment input, while `unity-project/Build` is gitignored and unavailable in the cloud. If
Unity changes, rebuild and copy locally, commit the changed `public/Build` artifacts, then let
Vercel run `build:spa`.

### Current custom domains

The preferred branded Vercel origin is `https://go.gdgocbpdc.tech`. The domain is registered
through get.tech and currently uses OrderBox nameservers. In the registrar DNS panel, the
`go` CNAME points to the exact project-specific target Vercel displayed. The domain must also
remain attached to the correct Vercel project under **Settings > Domains** so Vercel can route
the Host header and renew TLS.

The existing FreeDNS/Netlify origin is `https://go-gdg.oc.com.ar`; the Netlify provider URL
remains `https://gdgoc-go.netlify.app`.

The important distinction is DNS mapping versus forwarding:

- `go-gdg.oc.com.ar` must resolve to the Netlify endpoint through the FreeDNS DNS record
  accepted for this dynamic DNS zone. A FreeDNS `URL` record is only an HTTP redirect and
  leaves visitors on the Netlify hostname; it is not a custom-domain configuration.
- FreeDNS currently restricts adding a CNAME on this dynamic DNS domain. The working setup
  therefore uses the Netlify-recommended load-balancer address for the `go-gdg` hostname.
  Re-check the value shown by Netlify before recreating the record rather than copying an IP
  from old documentation.
- Netlify may require a root-level TXT record whose host is
  `subdomain-owner-verification`. Use the exact value Netlify displays for this site. The
  verification value is proof of control and should not be copied into this repository.
- The TXT record belongs at `subdomain-owner-verification.oc.com.ar`; the application host
  remains `go-gdg.oc.com.ar`.
- “Pending DNS verification” or “Netlify DNS propagating” can persist while recursive DNS
  caches expire. Do not replace the working DNS record with URL forwarding during that wait.
- Netlify provisions HTTPS only after it sees the correct DNS/ownership records. Verify both
  the certificate and the final browser address after propagation.

The complete provider-neutral FreeDNS procedure is in
`docs/FREEDNS_CUSTOM_DOMAINS.md`. It includes Vercel's project-specific CNAME route and the A
record fallback used when a shared FreeDNS domain rejects CNAME. That guide is for FreeDNS;
the new `gdgocbpdc.tech` domain is controlled in the get.tech/OrderBox DNS panel.

If GitHub automatic deployments are enabled, a push to `main` can publish on both providers.
Treat a push as a production action: inspect the provider project/branch configuration first.
Before pushing, run the appropriate local build and remember that neither provider's
TypeScript build rebuilds the Unity C# project.

### Hosting and Supabase environment checklist

Configure each host independently:

```text
Root directory: web-hosting
Node install: npm ci (provider default is acceptable when lockfile is honored)
Netlify build: npm run build
Vercel build: npm run build:spa
Output/publish directory: dist
Required env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
Required SPA fallback: every app path returns /index.html
```

Only the public anon key belongs in Vite. Never add `service_role`, database passwords, run
secrets, or private Supabase keys to provider variables prefixed with `VITE_`.

---

## 13. Verification checklist

### Static checks

```bash
cd web-hosting
npx tsc --noEmit
npm run build:spa
cd ..
git diff --check
```

The repository includes a no-Unity compile harness:

```bash
dotnet build tools/compile-check/GDGGo.CompileCheck.csproj
```

On this Mac, the SDK may exist under `$HOME/.dotnet` without being on `PATH`. Do not modify
global shell configuration merely to run a check; invoke the known executable or use a
task-scoped PATH.

**Current limitation:** at the 21 August review, this harness fails with 116 errors because
`UnityStubs.cs`/`UnityEditorStubs.cs` do not cover APIs already used by the project, including
`AudioClip.Create`, expanded particle-system modules, render textures, camera dimensions, and
editor build-pipeline types. The recently produced real Unity WebGL build is stronger evidence
that those APIs compile in Unity. Until stub coverage is repaired, report the harness failure
accurately and use a real Unity compile/build as the C# gate; do not mislabel all 116 errors as
game-source regressions.

The database integration test is:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/0007_competitive_run_integrity_test.sql
```

Run it only against an isolated local/test database that already has migrations `0001`–`0007`;
it opens a transaction and rolls back its fixtures. It checks the known fabricated million-
point payload, the standard-coin-as-400 and all-GDG-Coin exploits, table/schema privileges,
old RPC removal, cross-driver run ownership, required checkpoint cadence, normal
start/checkpoint/finalize flow, and lost-response idempotency.

Use `npm run build` before release to verify the Unity copy path as well. A Vite warning about
the large lazy Three.js chunk is currently informational; an actual TypeScript or build error
is not.

### Desktop browser

- `/`, `/leaderboard`, and `/controls` work by direct URL and browser back/forward.
- Sign-up (with mandatory username, name, validated email, password), email sign-in,
  sign-out, and theme persistence work.
- Treat username-only sign-in for newly created real-email accounts as a known bug until it
  has an implemented and tested server-side mapping.
- The registration form says Username, Name, Email Address, and Password; its placeholders
  are neutral, and the real-name/email verification notice is readable without overflow.
- The guest hero uses the sharp transparent logo, the tagline reads exactly
  “BUILD. CONNECT. RACE.”, and the artwork is neither cropped nor blurry.
- Garage arrows, thumbnails, stat bars, and launch button work.
- Unity receives keyboard focus and all keyboard controls work.
- Game mode hides the application header/footer.
- Result overlay reports score, standard coins, exact GDG Coins, bonus, distance, and time.
- Network activity shows one `start_game_run`, periodic ordered `checkpoint_game_run` calls,
  and one final nine-argument `submit_game_score` call.
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

### Deployed-host smoke checks

Run these checks against every origin being advertised:

- `https://<origin>/`, `/leaderboard`, and `/controls` all return the SPA, keep the custom
  hostname in the address bar, and have a valid certificate.
- `/Build/index.html` and all four `/Build/Build/Build.*.unityweb` files return 200.
- A real authenticated run starts, checkpoints, finalizes, and refreshes the leaderboard.
- The Supabase browser requests come from the expected domain and are not blocked by any new
  Auth redirect/CORS configuration.
- If the new Vercel origin becomes canonical, install the PWA fresh from that origin and do
  not assume an old Netlify-origin installation updates across domains.

### Supabase checks

After a real test run, inspect tables:

```sql
select run_id, score, coins, pills, gdg_coins, coin_score, bonus_score,
       distance, duration_seconds, integrity_version, created_at
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

For every new run, `run_id` and `coin_score` must be non-null, `pills = gdg_coins`,
`integrity_version = 1`, and `score = distance * 2 + coin_score + bonus_score`. Re-submitting
the same user/run UUID must return `duplicate` with the same score ID and without changing
`total_games`, `total_coins`, or `total_gdg_coins`.

---

## 14. Common failures and their actual causes

### Completed runs remain “queued”

Check, in order:

1. The user still has an authenticated Supabase session.
2. Migration `0007` exists in the target database.
3. `start_game_run`, `checkpoint_game_run`, and the nine-argument `submit_game_score` are
   executable by `authenticated`; the old seven-argument function must not exist.
4. The public profile row exists for `auth.uid()`.
5. The browser, Unity build, and database were deployed from the same integrity contract.
6. The final checkpoint is present, less than 30 seconds old, and exactly matches the submit.
7. The payload satisfies duration, acceleration, delta movement, pickup, exact pickup-score,
   score-formula, and bonus constraints.
8. The player has not exceeded 30 starts or 20 saved scores in one hour.
9. Browser network and Supabase project status are healthy.

The browser queue is intentionally retained for short retryable interruptions. Runs cannot be
banked indefinitely offline because server timing is part of the integrity proof. Do not “fix”
the symptom by deleting the queue before finding the server failure.

### GDG totals do not match the result overlay

New rows must carry the exact count in both `pills` and `gdg_coins`. If leaderboard totals use
a standard-coin formula, the database is still running an older aggregate function. Apply
`0005`, then allow its repair query to rebuild the aggregate. Legacy rows remain estimates
because their exact count cannot be reconstructed after the fact.

### A run is saved twice

Verify the iframe receives the server-issued UUID under `run`, Unity returns it unchanged, the
server run reaches `submitted`, and `scores_user_run_unique` exists. The same run secret and
UUID must be retained for a retry. Only Play Again/restart should call `start_game_run` for a
new identity; that call deliberately abandons the previous active run.

### Honest runs fail the database plausibility checks

Compare gameplay tuning against migration `0007`. Changes to acceleration, maximum speed,
boost, coin-pattern interval/size, pickup values, maximum multiplier, 2× behavior, near-miss
size/cooldown, or run duration may require a coordinated SQL function/constraint update.
Never loosen a bound without deriving and documenting the new legitimate maximum and adding a
positive and negative integration fixture.

### Ranked run is unavailable before Unity appears

The host could not obtain a server ticket. Confirm Migration `0007` is deployed, the current
session can execute `start_game_run`, and the player is below the 30-start hourly limit. This
fail-closed loader is intentional: Unity must not start a ranked run with a client-created ID.

### All checkpoints are rejected after a Unity source update

Confirm a fresh WebGL build was copied into `web-hosting/public/Build`. The pre-`0007` build
does not emit `coin_score` or `runcheckpoint`. Also compare all serialized Game scene tuning
against the ceilings documented in Migration `0007`; C# field defaults alone are not enough
because scene values override them.

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
On Vercel, confirm the generated files were committed before redeploying: its `build:spa`
command intentionally consumes the tracked copy and does not run Unity or `unity:copy`.

### Audio is silent on iOS

Both the React BGM engine and generated Unity page attempt to resume audio after a touch,
click, or key gesture. Verify the player has interacted, the game is not muted, the iframe is
same-origin, and the device is not in a browser/device mute state. Autoplay before a gesture
should not be relied upon.

### Direct `/controls` or `/leaderboard` gives a 404

The host is missing the SPA fallback. On Netlify, keep the `/* -> /index.html 200` redirect.
On Vercel, keep the catch-all rewrite in `vercel.json`.

### The custom domain redirects to or displays a provider hostname

The DNS provider is using URL forwarding instead of a real A/CNAME mapping. Delete only that
incorrect host record and recreate the custom hostname with the target currently displayed by
Netlify or Vercel. Keep any still-required ownership TXT record. Once DNS and TLS finish
propagating, navigation should keep the custom hostname in the address bar.

### Netlify remains on “Pending DNS verification”

Confirm the ownership TXT record is quoted as required by the FreeDNS form, is attached to
`subdomain-owner-verification.oc.com.ar`, and exactly matches the value currently displayed
by Netlify. Then confirm `go-gdg.oc.com.ar` resolves to Netlify rather than a FreeDNS URL
redirect. DNS caches can delay verification; repeatedly changing correct records restarts the
wait and makes diagnosis harder.

### The Vercel domain says “Invalid Configuration”

Confirm `go.gdgocbpdc.tech` is attached to the correct Vercel project and the `go` CNAME in
the get.tech/OrderBox panel exactly matches Vercel's current project-specific target. Remove
conflicting A/AAAA/CNAME data at `go`; do not replace it with a URL redirect. A TXT record is
needed only when Vercel explicitly presents an ownership challenge.

### A new player can sign in by email but not username

This is the current auth implementation, not a Supabase outage. New accounts authenticate
with their real email, while the username branch still tries a legacy synthetic
`@gdg-go.local` address. Use email sign-in. Fixing username sign-in requires a carefully
designed server-side mapping; never expose a directory of private emails to anonymous browser
queries merely to make that label work.

---

## 15. Safe change rules for future work

- Treat `GameSession.cs`, `PostMessageBridge.jslib`, `GameView.tsx`, `api.ts`, and Migration
  `0007` as one score contract. A telemetry field or gameplay-ceiling change must be updated
  end-to-end and released together.
- Never trust username, display name, or user ID from Unity when writing scores. Identity must
  come from the authenticated database session.
- Never send Supabase JWTs or service-role credentials into Unity.
- Never restore the removed seven-argument `submit_game_score` RPC or any endpoint that can
  finalize a client-created/uncheckpointed run.
- Keep run secrets out of iframe URLs, logs, UI, and analytics. They belong in React memory and
  the bounded v2 retry record only.
- Preserve the server-issued run UUID and secret during retries; request a new ticket only for
  a genuinely new run.
- Keep standard-coin and exact GDG Coin counters separate.
- Keep `coin_score` as the exact accumulated pickup points; never reconstruct it from pickup
  count after the fact.
- Update database plausibility limits whenever legitimate gameplay maxima change, and rerun
  `0007_competitive_run_integrity_test.sql`.
- Do not edit `web-hosting/public/Build`, `unity-project/Build`, or `dist` manually.
- Be cautious when running Unity generator menu items: `SceneBuilder` and prefab builders can
  rewrite generated scene/prefab assets.
- Keep the game route free of the application header, footer, and persistent bottom bars.
- Preserve same-origin/source checks on every iframe message.
- Preserve safe-area padding, `visualViewport` height handling, and 44 px coarse-pointer
  targets when changing mobile layouts.
- Use existing branding and vehicle assets unless an asset replacement is explicitly in scope.
- Preserve the current guest-home logo and its exact `BUILD. CONNECT. RACE.` tagline unless
  another explicit asset-change request supersedes it.
- Verify both normal browser mode and installed standalone mode before calling a mobile change
  complete.
- Before committing, inspect the dirty worktree and avoid bundling or reverting unrelated
  user changes.
- Do not commit, push, deploy, change DNS, or mutate production Supabase merely because code
  was edited locally. Those are separate actions and require the user's explicit request.
- Never read, print, or commit `web-hosting/.env`; use `.env.example` to document names only.
- Do not run destructive Git commands or regenerate the Unity scene/prefabs to clean a diff.
  Preserve unknown changes and ask when ownership or intent is unclear.

---

## 16. Recommended release sequence

1. Review `git status` and the diff.
2. Apply migrations through `0007` to an isolated staging database.
3. Run `supabase/tests/0007_competitive_run_integrity_test.sql` in staging/local PostgreSQL.
4. Validate the Unity Game scene and build Unity WebGL into `unity-project/Build`.
5. Run the full web build so `copy-unity.js` refreshes the embedded build in
   `web-hosting/public/Build`.
6. Verify the copied build actually emits `coin_score` checkpoints; the old tracked binary is
   incompatible even if the React build succeeds.
7. Run desktop and phone browser QA.
8. Run an authenticated test race and verify its private run/checkpoints, version-1 raw score,
   user email in `public.users`, and aggregate row.
9. Retry the same final run identity/secret to confirm it returns the same score ID.
10. Test installed PWA launch and service-worker update behavior.
11. If moving an environment from pre-`0007` code, schedule a coordinated cutover. Applying
    `0007` first breaks the old host's save call; deploying the new host first cannot start a
    run against the old database. Use a short maintenance window or atomic process.
12. Smoke-test `/`, `/controls`, `/leaderboard`, game launch, checkpoints, result banking, and refresh in
    production.
13. Open both `https://go.gdgocbpdc.tech` and `https://go-gdg.oc.com.ar`, verify certificates,
    confirm each keeps its custom hostname, and smoke-test the host players will actually use.
14. Publish only one canonical event link. If changing origins, update Supabase Auth URL
    configuration as needed and communicate that existing PWA installs/sessions do not move.

That sequence prevents the most dangerous partial releases: a new frontend calling RPCs that
do not exist yet, an old frontend calling the deliberately removed one-shot RPC, or an old
Unity binary omitting the required exact pickup score/checkpoints.

---

## 17. Known limitations and deliberate technical debt

These are current facts, not requests to silently fix them while doing unrelated work.

### High priority

1. **Player emails are publicly selectable.** Migration `0006` puts email in
   `public.users`, grants SELECT to `anon`, and inherits the `using (true)` profile policy.
   The stated goal was admin contact visibility, but the implemented result exposes email via
   the public data API. A proper repair should keep public leaderboard fields readable while
   moving/restricting contact data. It needs a new tested migration and a frontend query audit.
2. **Username login is misleading for new accounts.** Real-email signup stores the real email
   in Supabase Auth. Username sign-in still synthesizes `<username>@gdg-go.local`, so only
   legacy synthetic-email accounts can use it. Email login works. Do not solve this by making
   the public email exposure an intentional username directory.
3. **Score validation is tamper-resistant, not server-authoritative.** Migration `0007` blocks
   direct row writes, client-created runs, instant fabricated totals, impossible arithmetic,
   stale/backward checkpoints, cross-user tickets, and duplicate finalization. A determined
   client can still automate or imitate plausible real-time play within the accepted envelope.
   Eliminating that class requires a deterministic replay verifier or server-side simulation.

### Medium priority

4. **No automated React browser/unit suite exists.** Current dependable gates are the
   TypeScript/Vite build, a real Unity compile/build, the SQL integrity test, and manual
   desktop/mobile/PWA smoke testing. Responsive/fullscreen regressions require disciplined QA.
5. **The no-Unity C# compile harness is stale.** It currently reports 116 missing-stub errors
   across APIs the real Unity build already uses. `README.md` and `CLAUDE.md` still describe it
   as a green gate. Repair stubs against actual Unity signatures before relying on it again.
6. **Leaderboard fallbacks are bounded and legacy-heavy.** The normal path reads
   `public.leaderboard`. If unavailable, the client aggregates at most 1,000 score rows; this
   can become incomplete at scale and does not reproduce every database tie-break detail.
   Unused exported helpers such as `fetchLeaderboard`, `fetchUserBest`, and
   `recordGdgCoinGain` remain in `api.ts` from earlier iterations.
7. **The retry queue is device/origin local.** It stores up to 20 final payloads and run
   secrets in `localStorage['gdg-go:pending-scores:v2']`. It is useful for brief network loss,
   not durable offline play. Site-data clearing, origin changes, or a delay beyond server-time
   tolerance loses the ability to finalize. Any script executing on the origin can read local
   storage, so preventing XSS remains important.
8. **Stable Unity filenames amplify cache risk.** `Build.data.unityweb` and
   `Build.wasm.unityweb` are not content-hashed. The service worker uses stale-while-revalidate
   and a manual `gdg-go-v2` cache namespace. Increment the namespace or otherwise plan cache
   invalidation for releases where players must receive a new Unity contract immediately.
9. **Two live origins split users and operations.** Netlify and Vercel currently both serve the
   app. That is useful redundancy, but sessions, queues, installs, analytics, and cache state
   split by origin. Decide which URL is canonical before public promotion.
10. **Large generated WebGL binaries are tracked in Git.** This is deliberate so Netlify and
   Vercel can deploy without Unity, but it makes reviews and history heavy. Never hand-edit
   them; associate every binary change with its Unity source commit/build.
11. **Client-side signup has a concurrency edge case.** It checks username availability before
    creating the Auth user, then upserts the profile. The database unique index is the final
    arbiter. Two simultaneous claims can leave one Auth account without a usable public
    profile. `start_game_run` correctly fails closed when the profile is missing.

### Documentation debt

- `CLAUDE.md` contains stale fuel and GDG Coin tuning even though its architectural notes on
  streaming, asset sourcing, generated meshes, and compile checks remain useful.
- `docs/PROJECT.md`, `docs/SETUP_GUIDE.md`, and `docs/WEBSITE.md` predate the final one-scene,
  React-owned auth/score, dual-host deployment in places.
- `README.md` is a useful orientation, but this handoff and the serialized scene win on exact
  current values.

---

## 18. AI takeover checklist

An incoming AI should follow this sequence before touching code:

1. Read this entire file, then `git status --short`, `git branch -vv`, and recent `git log`.
2. Identify whether the user wants inspection, diagnosis, implementation, database mutation,
   deployment, DNS work, or some combination. Do not infer authorization for the others.
3. Inspect the actual source files named in the relevant section. Do not work from screenshots,
   old plans, or conversation memory alone.
4. For Unity tuning, inspect both the C# field and `Assets/Scenes/Game.unity`. For score-related
   tuning, inspect Migration `0007` and its test in the same task.
5. Preserve the dirty worktree. Never reset, discard, regenerate, commit, push, deploy, or edit
   production infrastructure unless the user explicitly asks for that action.
6. Keep secrets out of output and Git. Do not read `web-hosting/.env` to learn variable names;
   use `.env.example`. Never place a service-role key or run secret in a `VITE_` value or Unity.
7. Make source edits with a narrow diff. Generated Unity scene/prefab builders can rewrite
   broad asset graphs, so run them only when the requested change requires regeneration.
8. Verify proportionally:
   - React/docs-only: `npx tsc --noEmit`, `npm run build:spa`, `git diff --check`.
   - Unity C#: attempt the harness but expect its documented stub failures; require a real
     Unity compile, WebGL build, `unity:copy`, and web build.
   - Integrity/schema: isolated migrations and the SQL test, then inspect grants/signatures.
   - Mobile UI: real narrow portrait and short landscape plus installed-PWA behavior.
9. Before release, inspect `git diff --stat`, generated artifacts, environment variables, and
   provider root/build/output settings. A successful SPA build does not prove Unity changed.
10. Hand back a concise report naming files changed, checks run, checks not run, and any
    remaining risk. State clearly whether anything was committed, pushed, deployed, or applied
    to Supabase.

### Fast command reference

```bash
# Repository state
git status --short
git branch -vv
git log -8 --oneline

# React/Vite
cd web-hosting
npm ci
npx tsc --noEmit
npm run build:spa       # consumes the tracked public Unity build
npm run build           # copies local unity-project/Build first, if present
npm run dev             # Vite on port 3000

# Unity script compile harness, from repository root (currently stale; see Section 17)
dotnet build tools/compile-check/GDGGo.CompileCheck.csproj

# Database integrity test — isolated migrated test DB only
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/0007_competitive_run_integrity_test.sql

# Final hygiene
git diff --check
git status --short
```

This document should be updated whenever architecture, serialized tuning, the score/RPC
contract, live domains, build commands, environment variables, or deployment ownership
changes. Do not let it become another historical plan.
