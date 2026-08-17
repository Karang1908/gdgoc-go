# GDG Go — 3D Endless Car Chase ("Subway Surfers for cars")

A browser-based 3D endless car-chasing game built for the **Google Developer Group event**.
Lane-switch, ramp-jump, and brake through moving traffic and obstacles; grab spinning
colored coins (4 colors + a rare **GDG Pill** coin); get chased by a police car.
Login with username + password + display name; top scores go to a live leaderboard.

**Design north-star:** *"Subway Surfers, but you're a car on a road."*
Lane-switch ↔ swipe. Ramp-jump ↔ swipe-up. Brake ↔ swipe-down. Traffic ↔ trains.
Power-ups ↔ magnet / 2× / shield / hoverboard-equivalent. Police car ↔ the guard+dog.

---

## 1. Tech stack (decided, revised)

| Layer         | Choice                                              | Why                                                       |
| ------------- | --------------------------------------------------- | --------------------------------------------------------- |
| Game engine   | **Unity 6 LTS** (URP), **WebGL build**              | 3D polish, physics, scene editor                          |
| Auth + DB     | **Supabase** (Postgres + Auth + REST)               | **Plain REST works from Unity WebGL natively** — no bridge |
| Static host   | **Netlify** (drag-and-drop `web-hosting/` folder)    | Easiest jam-day deploy; Supabase has no static hosting     |

> Why this beats the earlier Unity+Firebase plan: Firebase's Unity SDK does **not**
> support the WebGL target (verified — see §2). Supabase exposes a pure REST API
> (PostgREST for the DB, `/auth/v1/*` for auth), which Unity C# hits directly with
> `UnityWebRequest`. **No JS bridge. No `.jslib`. No hybrid host page.**
> One binary builds, one folder uploads. That's the whole pipeline.

---

## 2. The WebGL+auth issue, and how Supabase kills it

Unity's WebGL build target has no native plugin support. The Firebase Unity SDK
ships native C++ libraries for iOS/Android/desktop, so its C# APIs are unavailable
in WebGL — calling them silently fails (verified against Firebase's platform
matrix, [firebase.google.com/docs/unity/learn-more](https://firebase.google.com/docs/unity/learn-more)).

Supabase doesn't have this problem because there is **no Supabase Unity SDK in the
critical path**. We use the platform-agnostic HTTP surface only:

```
Unity WebGL build (C#)
   │
   │ UnityWebRequest  (pure managed — works on every Unity target incl. WebGL)
   ▼
Supabase REST  ──►  Auth:  POST /auth/v1/signup
                          POST /auth/v1/token?grant_type=password
                  DB:    POST /rest/v1/scores        (insert score)
                         GET  /rest/v1/scores?order=score.desc&limit=10
```

Config (Project URL + anon key) lives in `Assets/StreamingAssets/supabase-config.json`.
The anon key is a **public** value (safe to ship — same as a Firebase web config);
Supabase RLS is what actually authorizes each request.

---

## 3. Hard art constraint ("everything from packs except coins")

Every visual and audio element in the final build must be a downloaded pack asset.

- **No Unity primitive placeholders** in the shipped build (no default cubes/spheres,
  no built-in skybox, no Unity default UI skin).
- Player car, enemy police car, traffic cars, trucks, buses, obstacles, road tiles,
  ramps, tunnels, buildings, skybox, pedestrian NPCs, NPC rigs + animations, UI
  sprites, fonts, SFX, jingles — **all from packs** (see ASSETS.md).
- The **one** original art is the coins: 5 variants on a pack-sourced coin mesh
  (Quaternius Ultimate RPG Pack "coin"), differentiated by 4 solid-color emissive
  materials + 1 texture-variant that uses `Branding/gdg pill.png` for the rare coin.
- Code, scene scripts, prefabs wiring, and materials are obviously ours — that's
  engineering, not art.

This rule is checked at review time by inspecting every Mesh / Texture / AudioClip /
Sprite reference in the build; any reference to `UnityEngine.Primitives` or default
`Sprite`/`Material` is a fail.

---

## 4. Architecture (single-process, REST-only)

```
gdg-go/
├── Branding/                     # EXISTING — GDG pill + GDG logo (provided)
├── docs/                         # PROJECT.md, ASSETS.md
├── assets-mailbox/               # you drop downloaded ZIPs here; I sort on import
├── unity-project/                # created on next turn
│   └── Assets/
│       ├── Scenes/               Boot, Menu, CarSelect, Game, GameOver
│       ├── Scripts/
│       │   ├── Gameplay/         PlayerCar, RoadScroller, LaneModel, JumpArc
│       │   ├── Traffic/          TrafficSpawner, TrafficCar (cars/trucks/buses)
│       │   ├── Obstacles/        ObstacleSpawner, ObstaclePool (cones/barriers/signs)
│       │   ├── Police/           PoliceAI, HeatBar
│       │   ├── Coins/            CoinSpawner, CoinPickup (5 variants)
│       │   ├── PowerUps/         PowerUpSpawner, PowerUpEffect (magnet/2x/shield/nitro/freeze)
│       │   ├── Pedestrians/      PedestrianSpawner, PedestrianAnimator
│       │   ├── UI/               LoginScreen, SignupScreen, MenuScreen,
│       │   │                     CarSelectScreen, HUD, GameOverScreen, LeaderboardPanel
│       │   ├── Supabase/         SupabaseConfig (ScriptableObject), AuthAPI,
│       │   │                     LeaderboardAPI, ScoreAPI — all UnityWebRequest-based
│       │   └── Audio/            AudioManager
│       ├── Models/              Quaternius / Kenney mesh imports
│       ├── Animations/          Mixamo FBX clips
│       ├── Materials/           # incl. 4 solid-color coin materials + 1 GDG-pill coin material
│       ├── Prefabs/             Cars, Trucks, Buses, Obstacles, Coins, PowerUps, Pedestrians
│       ├── Textures/           # incl. skybox, GDG pill coin texture
│       ├── Audio/               SFX + jingles (Kenney)
│       ├── UI/                  HUD/menu sprites (Kenney UI Pack Sci-Fi)
│       └── StreamingAssets/
│           └── supabase-config.json    # { "url": "...", "anonKey": "..." }
├── web-hosting/                  # Unity WebGL Build output lands here; Netlify deploys this
│   ├── index.html                # Unity-generated, plus a small <script> to load the build
│   ├── Build/
│   ├── TemplateData/
│   └── netlify.toml              # caching headers, SPA fallback, brotli Content-Encoding
└── netlify deploy --prod         # from web-hosting/ — single command to ship
```

No `.jslib`, no JS file in the loop, no Firebase Hosting. Netlify serves the Unity
build folder; the build talks to Supabase over HTTPS.

---

## 5. Game design — "Subway Surfers for cars"

### 5.1 Camera & feel
Third-person chase cam, behind-and-above the player car, slight look-ahead, mild FOV
kick on nitro. Camera follows the player's lane position with a slight lag for weight.

### 5.2 Road & lanes
- **3 lanes**, endless. World scrolls toward the camera; player car stays near the
  bottom third of the screen.
- Road built by pooling modular road tiles (Quaternius **Downtown City MegaKit** +
  Modular Streets ramps/bridges/tunnels).
- **Speed scales up every 200 m** — endlessly.

### 5.3 Controls (Subway Surfers mapping)

| Action        | Desktop             | Mobile     | Subway Surfers analog |
| ------------- | ------------------- | ---------- | --------------------- |
| Lane left     | `←` / `A`           | Swipe ←    | swipe ←               |
| Lane right    | `→` / `D`           | swipe →    | swipe →               |
| Jump (ramp)   | `↑` / `W` / `Space` | swipe ↑    | swipe ↑ (jump)        |
| Brake         | `↓` / `S`           | swipe ↓    | swipe ↓ (roll)        |
| Nitro boost   | `Shift`             | double-tap | (SS jetpack-ish)      |

- **Jump** is a short hop off **ramps** (Modular Streets pack). In the air you can
  change lanes; an arc lets you clear low obstacles (cones, barriers) and reach
  **coin arches**.
- **Brake** briefly slows the car (~70% speed) — useful to time a weave through
  fast-closing gaps and to drop the police gap-on-crash risk.

### 5.4 Obstacles & moving traffic (the SS-trains equivalent)

| Type                  | Behavior                                                                                       | Source pack                                   |
| --------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Cones                 | Low stationary; jump or switch lane.                                                            | Modular Streets / Downtown City               |
| Barriers              | Waist-high stationary; switch lane (or jump if low and you have a ramp).                       | Modular Streets                               |
| Overhead signs        | Visual obstacle + lane hint; sometimes force a lane switch (tunnel mouth).                    | Modular Streets                               |
| **Civilian cars**     | **Moving traffic** — same direction, varied speed. Must weave past.                              | Quaternius Cars, Public Transport              |
| **Trucks**            | Long, slow; block a lane for two segments. Lane-switch mandatory.                              | Kenney Car Kit (has trucks)                   |
| **Buses / taxis**     | Mix of speeds; spawn 1–2 per "chunk" for variety.                                              | Quaternius Public Transport                    |
| Tunnels / bridges     | Occasional scripted segments — narrower lanes, no lane-switch for the tunnel duration.         | Modular Streets                               |

Traffic spawns in waves scaled to current speed. This is the key SS-for-cars
differentiator vs a bare lane-runner.

### 5.5 Coins (the only original art)
- Coins float just above the road, **spinning around Y axis**, collected by proximity.
- Laid in SS-style patterns: straight runs, lane-curves, **arches over ramps**.
- 5 types (weight = spawn probability):

| Type           | Color         | Weight | Value | Notes                              |
| -------------- | ------------- | -----: | ----: | ---------------------------------- |
| Plain          | Red           |   ~28% |    +1 | common                            |
| Plain          | Blue          |   ~28% |    +1 | common                            |
| Plain          | Green         |   ~28% |    +1 | common                            |
| Plain          | Yellow        |   ~14% |    +1 | slightly rarer hue                |
| **GDG Pill**   | pill texture  |    ~2% |  +25 | glowing + distinct chime; the flex |

- Mesh: pack coin from Quaternius **Ultimate RPG Pack** (no original geometry).
- 5 Materials: 4 solid-color emissive + 1 using `Branding/gdg pill.png` as albedo
  with transparent cutout, applied to the same coin mesh.

### 5.6 Power-ups (Subway Surfers-equivalents)
Spawn rarely on the road; picked by proximity; each has an icon from Kenney UI Pack.

| Power-up       | SS analog     | Effect                                                  | Duration |
| -------------- | ------------- | ------------------------------------------------------- | -------- |
| Coin Magnet    | Coin Magnet   | Pulls coins within ~3 lanes toward the car              | 8 s      |
| 2× Multiplier  | 2× Multiplier | Doubles coin & distance score                          | 10 s     |
| Shield         | Hoverboard    | Absorbs one crash (bubble VFX round the car)           | until hit |
| Nitro Boost    | Sneakers / Jetpack | +50% speed, invulnerable, +2 police gap            | 5 s      |
| Police Freeze  | (custom)      | Police car heat frozen (cannot close gap)              | 6 s      |

Magnet + Nitro are MVP; 2×/Shield/Freeze are stretch (see §9).

### 5.7 Police chase (the SS guard + dog)
- Police car spawns behind the player at 500 m and **continuously closes the gap**.
- A Heat bar at the top shows the gap (full = far, empty = caught).
- Crashing into obstacles / traffic shrinks the gap fast. Dodges, coins, nitro, and
  police-freeze grow it.
- When the bar empties → car catches → **game over**.

### 5.8 Pedestrian NPCs
Walk across the road at crosswalks (random intervals). Hitting one = score penalty
+ camera shake, **but not game over** (event-friendly forgiveness). Quaternius
animated human meshes skinned to Mixamo Walk/Idle.

### 5.9 Car selection screen
Pre-game screen showing 3–4 unlockable cars (just visual at MVP — no stat differences).
Cars sourced from Quaternius Cars Pack + Kenney Car Kit. Selection persists in
`PlayerPrefs`.

### 5.10 End state & scoring
- `score = distance * 10 + coins * coinValue + timeBonus - penalties`
- Game-over screen → auto-submit to Supabase if logged in → show Top 10 + your row.
- Buttons: **Retry** · **Menu** · **Sign out**.

---

## 6. Authentication & data model (Supabase)

Username + password + name. We map username → synthetic email so Supabase's built-in
email/password provider works without collecting real emails:
`<username>@gdg-go.local`.

### SQL schema (run in Supabase SQL editor)
```sql
create table users (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text not null,
  created_at timestamptz default now()
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  username text not null,
  display_name text not null,
  score int not null check (score between 0 and 1000000),
  coins int not null check (coins between 0 and 100000),
  distance int not null check (distance between 0 and 1000000),
  created_at timestamptz default now()
);
create index scores_score_desc on scores (score desc);
```

### Row-level security
```sql
alter table users  enable row level security;
alter table scores enable row level security;

create policy "public read users"  on users  for select using (true);
create policy "owner writes user"  on users  for all    using (auth.uid() = id);

create policy "public read scores" on scores for select using (true);
create policy "owner inserts score" on scores for insert
  with check (auth.uid() = user_id);
create policy "no update scores"  on scores for update using (false);
create policy "no delete scores"  on scores for delete using (false);
```

### Endpoints (called from C# via `UnityWebRequest`)

| Action            | Method & path                                            | Body / query                                |
| ----------------- | -------------------------------------------------------- | ------------------------------------------- |
| Sign up           | `POST /auth/v1/signup`                                  | `{ email, password }` → then insert row in `users` |
| Sign in           | `POST /auth/v1/token?grant_type=password`                | `{ email, password }` → JWT                  |
| Sign out          | `POST /auth/v1/logout`                                   | (with bearer)                                |
| Get "me"          | `GET  /auth/v1/user`                                     | (with bearer)                                |
| Insert score      | `POST /rest/v1/scores`                                   | row JSON, bearer                             |
| Leaderboard Top10 | `GET   /rest/v1/scores?order=score.desc&limit=10`       | (public)                                     |
| My rank           | `GET   /rest/v1/scores?user_id=eq.<uid>&order=score.desc&limit=1` | (bearer)                          |

All requests carry header `apikey: <anon key>`; write/ranked requests additionally
carry `Authorization: Bearer <jwt>` from the sign-in response.

---

## 7. Build & deploy

### One-time (project owner)
1. Install **Unity 6 LTS** via Unity Hub with the **WebGL Build Support** module.
2. Create a free project at **supabase.com**. Enable Email/Password auth. Run the
   SQL above in the SQL editor. Copy the **Project URL** and **anon public key** from
   Project Settings → API.
3. Save them to `unity-project/Assets/StreamingAssets/supabase-config.json`:
   `{ "url": "https://<ref>.supabase.co", "anonKey": "..." }`.
4. Create a Netlify site linked to the `web-hosting/` folder (or drag-and-drop later).

### Per-build workflow
1. Open `unity-project` in Unity Hub.
2. **Build Settings → WebGL**. **Player Settings → Publishing Settings**:
   - Compression Format: **Brotli**
   - DecompressionFallback: **Enabled**
3. Build → set output to `web-hosting/`. Unity writes `index.html`, `Build/`, `TemplateData/`.
4. From `web-hosting/`: `netlify deploy --prod` (or drag the folder into Netlify's UI).

### `netlify.toml` (sketch)
```toml
[[headers]]
  for = "/Build/*.br"
  [headers.values]
    Content-Encoding = "br"
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.wasm.br"
  [headers.values]
    Content-Encoding = "br"
```

---

## 8. MVP scope vs stretch

**MVP (ship by event day)**
- Unity WebGL build loaded from Netlify.
- Signup/Login (username+password+name) via Supabase Auth REST.
- 3-lane endless runner: lane-switch, jump (off ramps), brake.
- Moving traffic (cars, trucks, buses) + stationary obstacles (cones, barriers).
- Pedestrian NPCs (Quaternius + Mixamo).
- Coins, all 5 types, spinning, with patterns including arches over ramps.
- Police car chase + Heat bar → game over.
- Car selection screen (visual only, 3 cars).
- HUD: score, distance, coins, Heat bar, active power-up icons.
- Power-ups: **Coin Magnet** + **Nitro Boost** (full set in stretch).
- Game-over → auto-submit score → Top-10 leaderboard + your-rank row.

**Stretch (time permitting)**
- Remaining power-ups: 2×, Shield, Police Freeze.
- Tunnels / bridges scripted segments.
- Sound design pass (Kenney SFX + jingles wired per event).
- "GDG-2026" event gate code (only people with the code can sign up — booth control).
- Persistent personal-best highlight in leaderboard.
- Mobile touch polish + on-screen swipe indicators.

---

## 9. Risks & open questions

| # | Risk                                                                                       | Mitigation                                            |
| - | ------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| R1 | Unity WebGL initial download size on slow event WiFi.                                       | Brotli + pre-compressed headers; budget ≤ 25 MB.      |
| R2 | Supabase rate limits on free tier during the event (signups + leaderboard reads).           | Leaderboard reads cached 15s client-side.             |
| R3 | Username collisions (two players pick the same name).                                       | `users.username` UNIQUE constraint + 409 handling.   |
| R4 | "Everything from packs" rule is broken by a last-minute placeholder.                       | Review-time mesh/texture/sprite audit (§3).           |
| R5 | Mixamo humanoid retarget quirks across Quaternius rigs.                                    | One shared Mixamo rig + retarget; test early.          |
| Q1 | Are event players self-registering on the spot, or should I pre-seed accounts?              | Affects default Login screen and "GDG-2026" gate.     |
| Q2 | Confirm Unity version installed: **6 LTS** (recommended) or 2022 LTS?                       | Affects URP/Input System defaults.                    |

---

## 10. Next steps (after assets arrive — see ASSETS.md §6 checklist)
1. Confirm Unity version (Q2) and answer Q1.
2. Scaffold `unity-project/`: scenes, empty scripts, Supabase config ScriptableObject
   + the three REST API wrappers, AudioManager, input bindings. **No gameplay yet.**
3. Bootstrap a vertical slice: one road tile recycles → player car lanes + jump →
   one obstacle → one coin. Drive end-to-end with keyboard.
4. Add moving traffic + police + Heat bar + game-over → submit score.
5. Add power-ups (magnet + nitro) and the remaining coin colors + GDG pill variant.
6. Add Menu → CarSelect → Game → GameOver → Leaderboard flow.
7. Wire SFX + UI Sprites (Kenney) and the car selection + login screens.
8. Build WebGL → push to Netlify.
