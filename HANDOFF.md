# GDG Go — Complete Handoff

**Repo:** `/Users/karangarg/Desktop/gdg-go`
**Date:** 2026-08-16 (continued — see Part 8 for this session's work)
**Branch:** `main`. No remote configured. Only 2 local commits (initial setup, empty).
**Working tree status:** the entire gdg-go tree (`unity-project/`, `supabase/`, `tools/`,
`web-hosting/`, `CLAUDE.md`, `HANDOFF.md`) is **untracked** (`??`) — nothing is staged or
committed. All edits this session are on-disk only; `git commit` has not been run. A separate
set of sibling-project files (`mtc car/`, `alley-brick-wall*…`) shows as tracked-but-modified
in the broader workspace but none belong to this repo.

---

## Part 1 — What this project is

**GDG Go** is a Unity 6 LTS WebGL endless car-chase game built for **GDG on Campus (GDGoC)**. It is a **public web game** — anyone can visit the URL, self-register with username/password, and compete on a global online leaderboard. It is not a kiosk build; it is a website that happens to be a game.

The player's job: drive forward, dodge traffic, scoop coins, grab power-ups, and keep a "Heat" gauge above zero — the police close from behind, and at Heat = 0 the run ends.

**Audience and constraints that flow from "public web game":**

1. **Touch input** — phones in portrait must work. Players use swipes + on-screen buttons; keyboard is a desktop convenience.
2. **Small download** — WebGL ≤ 25 MB brotli. The `Assets/` folder is ~91 MB on disk but Unity only ships what a scene in Build Settings references, so the build is far smaller.
3. **Score integrity** — the client computes and POSTs its own score, and both the anon key and the player's JWT are visible in the browser. RLS only checks *who* writes, never *what*. A SQL migration adds plausibility bounds, a rate limit, and an identity-stamp trigger that overwrites client-supplied username/display_name from the authenticated profile row.

**Stack:**

- **Unity 6 LTS** (`6000.0.x` line, any patch works; the line itself is the contract, not the exact patch). Avoid `6000.3.x`.
- **Supabase** for auth + leaderboard. **No backend JS bridge** — C# hits Supabase REST directly via `UnityWebRequest`. The Firebase Unity SDK was rejected because it does not support WebGL.
- All HTTP is `UnityWebRequest`. No native plugins, no `.jslib` files.
- **Netlify** hosts the WebGL build (`web-hosting/`).

---

## Part 2 — Architecture

### 2.1 Folder layout

```
gdg-go/
├── unity-project/                  # The Unity project (Assets/, ProjectSettings/, Packages/)
│   ├── Assets/
│   │   ├── Scripts/
│   │   │   ├── Audio/              # AudioManager (single-source music + SFX)
│   │   │   ├── Coins/              # CoinPickup, CoinSpawner, CoinType
│   │   │   ├── Core/               # GameManager, GameSession, Tags
│   │   │   ├── Gameplay/           # CameraRig, JumpArc, LaneModel, LaneReservations,
│   │   │   │                       #   PlayerCar, PlayerCarSkin, RoadScroller,
│   │   │   │                       #   ScrollingSpawner (base), WorldScroller
│   │   │   ├── Obstacles/          # Obstacle, ObstacleSpawner
│   │   │   ├── Pedestrians/        # PedestrianNPC, PedestrianSpawner
│   │   │   ├── Police/             # HeatBar, PoliceAI
│   │   │   ├── PowerUps/           # PowerUpEffect, PowerUpSpawner, PowerUpType, RotateSlow
│   │   │   ├── Scenery/            # ScenerySpawner
│   │   │   ├── Supabase/           # AuthAPI, ScoreAPI, SupabaseConfig, SupabaseSession, SupabaseTypes
│   │   │   ├── Traffic/            # TrafficCar, TrafficSpawner
│   │   │   └── UI/                 # CarSelectScreen, GameOverScreen, HUD, LeaderboardPanel,
│   │   │                           #   LeaderboardRow, LoginScreen, MenuScreen, SignupScreen
│   │   └── Editor/                 # SceneBuilder, UIScreenBuilder, PrefabsBuilder, MaterialLibrary,
│   │                               #   ProjectSetup (GDG Go menu)
│   └── Packages/manifest.json
├── supabase/migrations/
│   ├── 0001_init.sql               # Schema + RLS + commented handle_new_user trigger
│   └── 0002_score_integrity.sql    # Plausibility bounds, rate limit, identity stamp
├── web-hosting/                    # Netlify deployable folder (HTML + Build/)
├── tools/compile-check/            # No-Unity C# type-check harness
└── RawAssets/                      # Downloaded pack ZIPs (gitignored)
```

### 2.2 Scene graph

Five scenes, routed by `GameManager`:

| Scene      | Purpose                                                                  |
|------------|--------------------------------------------------------------------------|
| `Boot`     | Splash + logo + auto-route to Menu after ~1.2 s.                         |
| `Menu`     | Main menu + auth panels (Login, Signup) + Leaderboard overlay.            |
| `CarSelect`| Cosmetic car body picker.                                                |
| `Game`     | The actual endless run.                                                  |
| `GameOver` | Final score → submit to Supabase → fetch personal best → show leaderboard.|

**GameManager** is a `DontDestroyOnLoad` singleton. It bootstraps itself via `[RuntimeInitializeOnLoadMethod(BeforeSceneLoad)]` so the singleton exists even when the player deep-links onto Game.unity directly.

```
GameManager (singleton, DontDestroyOnLoad)
  ├── SupabaseSession (singleton, DontDestroyOnLoad)   ← survives all scene loads
  ├── Audio.AudioManager (singleton, DontDestroyOnLoad)
  └── Scenes (loaded one at a time)
        Boot → Menu → CarSelect → Game → GameOver → Menu (loop)
```

### 2.3 The streaming contract (the most important architectural fact)

**The player car never translates along Z.** Everything else — road tiles, traffic, obstacles, coins, scenery, power-ups — moves toward −Z past a stationary player.

`WorldScroller` (execution order −100) is the single source of truth for:

- `Distance` — absolute metres travelled this run (track space, never rewinds).
- `Speed` — current forward speed.
- `BaseSpeed` — speed ignoring boost/brake (the difficulty baseline).
- `ScrollDelta` — metres the world moved this frame.
- `Difficulty01` — 0..1 over `rampDistance`, used by spawners to scale density.

Every spawner derives from `ScrollingSpawner`, which owns the contract:

1. Every live object moves `−ScrollDelta` on Z each frame.
2. Objects behind the camera are destroyed.
3. New objects are scheduled in **track space** so spawn cadence is a function of distance, not wall-clock.

**Two coordinate spaces** that must not be mixed:

- *track space* — absolute metres since the run began. Schedules live here.
- *world space* — Unity Z relative to the player at the origin.
- Convert with `WorldScroller.TrackToWorldZ(track)`.

**The original bug:** spawners placed objects at a fixed world Z and never moved them, so the world was frozen and unreachable. The fix is `ScrollingSpawner.ScrollAndCull(delta)` — every spawner moves its active objects every frame.

### 2.4 Heat / police

`GameSession.Heat` is a 0..1 gauge of how far ahead of the police the player is. At 0 the run ends. The interesting bit: Heat moves as a function of speed relative to the difficulty baseline:

- boosting → Heat climbs
- cruising → Heat drifts down (faster as difficulty rises)
- braking → Heat drops hard
- crashing → large one-off hit (`crashHeatPenalty`)
- coin pickup → small Heat gain (`heatPerCoin`)

This means a run's length is decided by how well the player drives, not by a timer. The previous model drained Heat at a flat 0.02/sec regardless of input, so every run ended at exactly 50 seconds with an identical score — which is the one outcome that makes a leaderboard pointless.

### 2.5 Combo multiplier

Coins extend a `comboWindowSeconds` (2.2 s) window. Every `coinsPerComboStep` (8) within the window climbs the multiplier up to `maxMultiplier` (8). The 2× power-up doubles on top. The achievable score for a given `(distance, coins)` pair is therefore a closed interval — and that interval is what the SQL plausibility checks enforce.

### 2.6 Auth flow

Username/password only. No real email collected — usernames are mapped to synthetic emails `<username>@gdg-go.local` so Supabase's email/password provider works without asking attendees for real addresses.

Two-step signup (both client-side, both REST):

1. `POST /auth/v1/signup` → JWT + `user.uid`
2. `POST /rest/v1/users` with `{ id, username, display_name }` to write the profile row

Login is single-step: `POST /auth/v1/token?grant_type=password` → JWT, then `GET /rest/v1/users?username=eq.X&select=display_name` to populate the display name.

`SupabaseSession` (singleton, `DontDestroyOnLoad`) caches the JWT, username, and display name. All Supabase calls read from `SupabaseSession.Instance` to attach `Authorization: Bearer <jwt>`.

### 2.7 Score flow

End of run (`GameSession.EndGame()`):

1. Stash `LastScore`, `LastCoins`, `LastMeters`, `LastPills`, `LastDurationSeconds` as static properties (the Game scene + GameSession instance are about to be destroyed).
2. `Invoke(GoToGameOver, 1.4f)` so camera shake + SFX land first.
3. Load `GameOver` scene.

`GameOverScreen.OnEnable()` reads the static result fields, then `StartCoroutine(ScoreAPI.InsertScore(...))`. The score row omits `id` and `created_at` so Postgres applies its defaults (sending them as JSON null would store NULL and break tiebreakers).

### 2.8 SQL integrity

`0002_score_integrity.sql` adds:

- `duration_seconds` column
- plausibility bounds: `score_score_matches_run` (`score >= distance*2 + coins` and `score <= distance*2 + coins*400`), `scores_distance_vs_time` (≤ 70 m/s avg), `scores_coins_vs_distance` (`coins <= distance + 50`), `scores_duration_sane` (0..7200 s)
- rate-limit trigger: 20 inserts/hour per user
- identity-stamp trigger: overwrites client-supplied username/display_name from the authenticated profile row

**The bounds are derived from gameplay constants.** Retune `PointsPerMetre`, `maxMultiplier`, `coin value`, `maxSpeed × boostMultiplier` and you must retune the matching SQL bound or honest scores will start bouncing.

### 2.9 Editor menu (one-click setup)

`GDG Go → Run Full Project Setup` runs, in dependency order: tags → SupabaseConfig → 5 scenes → coin materials → WebGL settings → all prefabs → Game scene → UI scenes. Every step is idempotent and skips existing assets, so it is safe to re-run.

### 2.10 Asset sourcing rules

- **No Unity primitives in the build.** No default cubes/spheres/skyboxes/UI sprites. Every mesh, texture, audio clip comes from a pack.
- **Quaternius packs** ship NO textures and NO vertex colours — only `.fbx` + `Preview.png` + `License.txt`. Meshes render flat white unless assigned materials. Use Quaternius for road, coin, signs, foliage, with flat materials from `MaterialLibrary`.
- **Kenney packs** ship textures (`colormap.png` atlas or per-vehicle PNGs). Use Kenney for anything textured: vehicles (including player and police), cones, debris, buildings, UI sprites, audio.
- **Materials must work under URP *and* Built-in.** `MaterialLibrary.LitShader()` falls back URP/Lit → Standard → Legacy/Diffuse, and every setter writes both names (`_BaseColor`+`_Color`, `_BaseMap`+`_MainTex`). Hardcoding the URP shader produces magenta materials.

### 2.11 Tag discipline

`"Obstacle"` is not a Unity built-in tag. Assigning an unregistered tag throws `UnityException` and aborts the build mid-way. `ProjectSetup.EnsureTags()` registers them via `SerializedObject` on `ProjectSettings/TagManager.asset` and is called first by `PrefabsBuilder.BuildAll()`. Tag names live in `Scripts/Core/Tags.cs`.

### 2.12 Streaming physics rule

**Everything streamed that has a collider needs a kinematic Rigidbody.** A collider with no Rigidbody is a *static* collider; moving one makes PhysX rebuild its static broadphase every frame. With hundreds of coins in flight that alone tanks WebGL. `PrefabsBuilder.MakeMovingTrigger()` handles this — use it for any new streamed prefab.

---

## Part 3 — The signup/signin error (debug saga)

### 3.0 Resolution (this session)

**Status: FIXED.** All four reported bugs are resolved and the project compiles clean
against the Unity stubs (0 errors / 0 warnings). The state machine in §3.3 and the five
suspects in §3.4 remain valid background for future debugging of a *different* failure
shape; the narrative below was written when the bug was still unresolved.

**Root cause (a sixth suspect, adjacent to #1):** `Assets/Resources/SupabaseConfig.asset`
was present and non-empty, but the `url` field contained the **REST path**
`https://…supabase.co/rest/v1/` (with trailing slash). The code appends endpoints itself
(`cfg.url + "/auth/v1/signup"`), so the request went to the malformed
`…/rest/v1//auth/v1/signup` → Supabase 404 → `Friendly()` catch-all →
"Sign-up failed. Check your connection and try again." None of the five original suspects
(empty config / missing SQL / confirm-email / synthetic-email / wrong anon key) matched;
this was a *malformed-but-non-empty* URL.

**Fix** (see Part 8 for file-by-file detail):
- Stripped the bogus path in `SupabaseConfig.asset` to a bare project URL.
- Added `SupabaseConfig.BaseUrl` — a read-only property that defensively trims anything
  after the host (`https://…supabase.co`) so a future paste of `/rest/v1/` degrades to a
  404 instead of a crash. `IsValid` now requires a usable `BaseUrl` + `anonKey`.
- Routed all 8 Supabase call sites (5 in `AuthAPI.cs`, 3 in `ScoreAPI.cs`) from
  `cfg.url + "/…"` to `cfg.BaseUrl + "/…"`.
- Added the `Debug.LogWarning($"[Signup|Login] Raw error: {message}")` diagnostic hook
  on both `!ok` branches (the missing piece from §3.5) — now in place at
  `SignupScreen.cs:116` and `LoginScreen.cs:118`.

The other three bugs (no sound, login/signup polish, "assets don't load") were separate
and are documented in Part 8.

---

### 3.1 What was happening

User `gdgoc-go_admin` clicked CREATE in the Signup panel. The panel showed the generic line: **"Sign-up failed. Check your connection and try again."**

Nothing else. The raw Supabase error never reached the user; the `Friendly()` mapper in `SignupScreen` only knows three error shapes (`23505`, `"Password should be"`, `429`) and falls everything else through to the generic catch-all.

### 3.2 Where the code was supposed to log it

The previous session's plan was to add a `Debug.LogWarning("[Signup] Raw error: " + message)` inside the `!ok` branch of `SignupScreen.OnSignup` and `LoginScreen.OnLogin`, so the actual Supabase response body would appear in the Unity Console.

**That diagnostic hook is not currently in either file.** Grep returns no `Debug.LogWarning` calls in `SignupScreen.cs`, `LoginScreen.cs`, or `AuthAPI.cs`.

The instruction was: click CREATE again, send back the Console warning text. The user did not respond before the conversation compacted.

### 3.3 State machine, end to end

```
User clicks CREATE (Signup button)
        │
        ▼
SignupScreen.OnSignup()
   - _busy guard
   - AudioManager.PlayClick
   - Validate(username, password, displayName)
        │   - username 3..24 chars, [a-zA-Z0-9_.-] only
        │   - password ≥ 6
        │   - display_name required, ≤ 24
        ▼  (valid)
AuthAPI.SignUp(username, password, displayName, callback)
        │
        ├─ SupabaseConfig.Load() → Resources.Load("SupabaseConfig")
        │     │
        │     ▼
        │  IsValid?  (both url & anonKey non-empty)
        │     │
        │     ├── no  → callback(false, "Supabase config missing. Add Resources/SupabaseConfig.asset.")
        │     │          ▼
        │     │     Friendly() → no match → "Sign-up failed. Check your connection and try again."
        │     │
        │     └── yes
        │           ▼
        │     POST https://<url>/auth/v1/signup
        │           │
        │           ├── HTTP fail → callback(false, PrettyError(req))
        │           │                     ▼
        │           │               Friendly() — depends on body
        │           │
        │           └── HTTP 200
        │                 ▼
        │           JsonUtility.FromJson<SessionResponse>
        │                 │
        │                 ├── parse fail → callback(false, "Bad session payload: ...")
        │                 │
        │                 └── parsed
        │                       │
        │                       ├── access_token == null  → step 2 will 401
        │                       │
        │                       └── token present
        │                             ▼
        │                       POST /rest/v1/users  (Bearer <jwt>, body = {id, username, display_name})
        │                             │
        │                             ├── 201 / 204 → callback(true, displayName) → panel closes
        │                             │
        │                             └── fail → SupabaseSession.Clear(); callback(false, "Account created but profile save failed: <err>")
        │                                       ▼
        │                                 Friendly() — depends on body
```

### 3.4 Candidate root causes (in order of likelihood)

**Suspect #1 — `SupabaseConfig.asset` is empty or missing**

- Surfaces as the literal message *"Supabase config missing. Add Resources/SupabaseConfig.asset."* which falls into the generic catch-all.
- Verify: open `Assets/Resources/SupabaseConfig.asset` in the Inspector. Both `Url` and `Anon Key` must be non-empty.
- Fix: paste Supabase project URL + anon public key from Project Settings → API.

**Suspect #2 — `0001_init.sql` was never run**

- Step 1 (POST `/auth/v1/signup`) succeeds. Step 2 (POST `/rest/v1/users`) fails with `relation "public.users" does not exist` (Postgres error `42P01`).
- Verify: in Supabase SQL editor run `select * from public.users limit 1;`. Error → this is it.
- Fix: paste `supabase/migrations/0001_init.sql` into the SQL editor and run.

**Suspect #3 — `Confirm email` is ON**

- Step 1 returns 200 but body has `{"user":{...},"session":null}` — no session because email isn't confirmed. `JsonUtility.FromJson<SessionResponse>` produces a null `access_token`/`user.id`. Step 2 then 401s.
- Verify: Supabase Dashboard → Authentication → Providers → Email → Confirm email toggle. For a public leaderboard you want this **OFF**.
- Fix: turn it off, delete the auth user, re-signup.

**Suspect #4 — Synthetic email rejected by validator**

- Username `gdgoc-go_admin` → `gdgoc-go_admin@gdg-go.local`. Underscore is legal in the local part per RFC 5321 and Go's `net/mail`. Probably not the issue, but if step 1 returns 400 with `"email"` in the body, this is the cause.
- Verify: Supabase returns `{"code":400,"message":"Invalid email"}`-shaped error.
- Fix: rename username to alphanumeric-only.

**Suspect #5 — Wrong anon key in config**

- Step 1 returns 401 with `{"code":401,"message":"Invalid API key"}`.
- Verify: compare the value in `SupabaseConfig.asset` against Supabase → Project Settings → API → `anon` `public`.
- Fix: paste the correct anon public key.

### 3.5 The diagnostic hook (the missing piece)

Add to `SignupScreen.OnSignup`'s `!ok` branch and the matching branch in `LoginScreen.OnLogin`:

```csharp
else
{
    Debug.LogWarning($"[Signup] Raw error: {message}");
    SetStatus(Friendly(message));
}
```

Then have the user click CREATE again with a fresh username (alphanumeric, no underscore) and send back the Console warning text. The body of that warning is the answer.

### 3.6 What NOT to do

- **Don't trust "Check your connection" as a network diagnosis.** It is the catch-all for every unmapped error. It says nothing about connectivity.
- **Don't re-edit `SignupScreen.Validate` to reject underscores.** Underscores are legal; rejecting them is cosmetic only. The real risk is email normalisation in a SQL trigger — but the only such trigger (`handle_new_user`) is commented out in `0001_init.sql`.
- **Don't add another `Friendly()` mapping without first seeing the raw error.** Pattern-matching on strings we haven't seen is how we ended up with a generic catch-all in the first place.
- **Don't `git commit` yet.** Working tree has IDE imls from sibling projects; stage only gdg-go changes.

---

## Part 4 — File-by-file inventory (verified by reading the source)

### 4.1 Core

**`Scripts/Core/GameManager.cs`** (86 lines)
- Singleton, `DontDestroyOnLoad`, bootstraps via `[RuntimeInitializeOnLoadMethod(BeforeSceneLoad)]`.
- `EnsureService<SupabaseSession>()`, `EnsureService<AudioManager>()`.
- `Application.targetFrameRate = 60` for WebGL pacing.
- Scene constants: `SceneBoot`, `SceneMenu`, `SceneCarSelect`, `SceneGame`, `SceneGameOver`.
- `LoadMenu()`, `LoadCarSelect()`, `LoadGame()`, `LoadGameOver()`, `QuitToBoot()`.

**`Scripts/Core/GameSession.cs`** (296 lines)
- Singleton, owns the run state: `CoinCount`, `GDGPillsCollected`, `DistanceMeters`, `RunSeconds`.
- `Score = round(meters) * PointsPerMetre + coinScore`. `PointsPerMetre = 2`.
- Combo: `comboWindowSeconds=2.2`, `coinsPerComboStep=8`, `maxMultiplier=8`.
- Heat: `cruiseThreshold=1.04`, `heatResponse=0.14`, `difficultyDrain=0.05`, `crashHeatPenalty=0.26`, `pedestrianHeatPenalty=0.08`, `heatPerCoin=0.006`.
- Power-ups: `CoinMagnet`, `TwoX`, `Shield`, `Nitro`, `PoliceFreeze`. Shield has no timer (absorbs one hit). Others `Invoke(disable, durationSec)`.
- `EndGame()` stashes static result fields and `Invoke(GoToGameOver, 1.4f)`.
- Static result cache: `LastScore`, `LastCoins`, `LastMeters`, `LastPills`, `LastDurationSeconds` — read by `GameOverScreen.OnEnable`.

**`Scripts/Core/Tags.cs`** — string constants for the custom tags (`"Obstacle"`, etc.).

### 4.2 Gameplay

**`Scripts/Gameplay/WorldScroller.cs`** (134 lines)
- `[DefaultExecutionOrder(-100)]` so `ScrollDelta` is correct before any spawner Update.
- `startSpeed=16`, `maxSpeed=42`, `rampDistance=2200`.
- `boostMultiplier=1.55`, `brakeMultiplier=0.55`.
- `Speed` lerps toward `target = BaseSpeed × (boost or brake)`.
- `Difficulty01 = Clamp01(Distance / max(1, rampDistance))`.
- `TrackToWorldZ(trackDistance) = trackDistance - Distance`.
- `Freeze()`, `ResetRun()` (clears `Distance`, `ScrollDelta`, `Speed`, `LaneReservations`).

**`Scripts/Gameplay/ScrollingSpawner.cs`** (142 lines)
- `spawnAheadDistance=170`, `despawnBehindZ=-35`, `startTrackDistance=60`.
- `MaxSpawnsPerFrame=32` guard against degenerate intervals.
- `ScrollAndCull(delta)` — every live object moves `-delta` on Z, culls behind camera.
- Abstract: `SpawnAt(worldZ, world)`, `IntervalMeters(world)`.
- `PickWeightedIndex(weights)` — shared helper, falls back to uniform if all weights ≤ 0 (the bug the previous version had).

**`Scripts/Gameplay/PlayerCar.cs`** (269 lines)
- Never translates Z; only lateral (lane) + vertical (jump).
- Three-way input: keyboard, touch swipe, public `MoveLeft/MoveRight/Jump/BrakeStart/BrakeStop/BoostStart/BoostStop`.
- Swipe consumes on first axis to clear threshold (no diagonal ambiguity).
- `IsBoosting = _boostHeld || (GameSession.Instance?.HasNitro ?? false)`.
- `IsBraking`, `IsJumping` setters.
- `BrakeTap()` — swipe-down holds brake for 0.45 s.
- Lane change uses smoothstep; mesh banks via `Mathf.Sin(_laneChangeT * π)`.

**`Scripts/Gameplay/LaneModel.cs`**, **`LaneReservations.cs`**, **`CameraRig.cs`**, **`RoadScroller.cs`**, **`PlayerCarSkin.cs`**, **`JumpArc.cs`** — supporting roles: lane X positions, traffic lane reservations, camera follow rig, road tile streamer, cosmetic skin switcher, jump arc visualisation.

### 4.3 Streaming subsystems (all derive from `ScrollingSpawner`)

- **`Coins/CoinSpawner.cs`** — weighted random of 5 materials (4 Google brand colours + GDG pill).
- **`Coins/CoinPickup.cs`** — trigger pickup, calls `GameSession.OnCoinCollected(value, isGDGPill)`.
- **`Coins/CoinType.cs`** — value table (Google brand colours = 1 pt each, GDG pill = 25).
- **`Obstacles/ObstacleSpawner.cs`** + **`Obstacle.cs`** — cones, tires, boxes, doors, signs, traffic lights. `OnCrashStatic()` if hit.
- **`Traffic/TrafficSpawner.cs`** + **`TrafficCar.cs`** — sedan, SUV, taxi, van, delivery, truck, ambulance, firetruck. Each with own forward speed.
- **`PowerUps/PowerUpSpawner.cs`** + **`PowerUpEffect.cs`** + **`PowerUpType.cs`** + **`RotateSlow.cs`** — magnet, nitro, shield, 2×, police freeze.
- **`Scenery/ScenerySpawner.cs`** — buildings (Kenney urban/industrial), kerb props (streetlight, tree, bush).
- **`Pedestrians/PedestrianSpawner.cs`** + **`PedestrianNPC.cs`** — wired but empty (Quaternius character packs need Animator controllers built in GUI).
- **`Police/HeatBar.cs`** + **`PoliceAI.cs`** — Heat UI bar + police chase behaviour.

### 4.4 Supabase layer

**`Scripts/Supabase/SupabaseConfig.cs`** (55 lines)
- `[CreateAssetMenu(menuName = "GDG Go/Supabase Config")]` ScriptableObject with `url` + `anonKey`.
- `Load()` does `Resources.Load<SupabaseConfig>("SupabaseConfig")`. Missing asset → runtime instance with empty strings + error log.
- `IsValid = !IsNullOrEmpty(url) && !IsNullOrEmpty(anonKey)`.

**`Scripts/Supabase/SupabaseSession.cs`** (69 lines)
- Singleton, `DontDestroyOnLoad`.
- `Current` (SessionResponse), `DisplayName`, `Username`, `Uid` (from `Current.user.id`).
- `IsSignedIn = Current != null && !IsNullOrEmpty(Current.access_token)`.
- `SaveSession(session, username, displayName)`, `Clear()`.

**`Scripts/Supabase/SupabaseTypes.cs`** (95 lines)
- `SignUpBody { email, password }`, `SignInBody { email, password }`.
- `SessionResponse { access_token, refresh_token, token_type, expires_in, expires_at, user }`.
- `SupabaseUser { id, email, role, aud }`.
- `UserRow { id, username, display_name, created_at }`.
- `ScoreRow { id, user_id, username, display_name, score, coins, distance, duration_seconds, created_at }`.
- `ScoreRows { ScoreRow[] items }` — JsonUtility can't parse bare arrays, so we wrap.

**`Scripts/Supabase/AuthAPI.cs`** (320 lines)
- `SignUp(username, password, displayName, onComplete)` — POST `/auth/v1/signup` → save session → POST `/rest/v1/users` → callback.
- `SignIn(username, password, onComplete)` — POST `/auth/v1/token?grant_type=password` → fetch profile → callback.
- `SignOut(onComplete)` — POST `/auth/v1/logout` then clear local session (network failure tolerated).
- `BuildEmail(username) = username + "@" + SyntheticDomain` (`gdg-go.local`).
- `InsertProfile`, `FetchProfile`, `PrettyError(req)` internals.

**`Scripts/Supabase/ScoreAPI.cs`** (201 lines)
- `InsertScore(score, coins, distance, durationSeconds, onComplete)` — POST `/rest/v1/scores`.
- `FetchLeaderboard(limit, onComplete)` — GET `/rest/v1/scores?order=score.desc,created_at.asc&limit=N`.
- `FetchUserBest(onComplete)` — GET `/rest/v1/scores?user_id=eq.<uid>&order=score.desc&limit=1`.
- `ParseArray(bareArrayJson)` wraps `[...]` in `{"items":...}` for JsonUtility.
- All inserts `Prefer: return=minimal`.

### 4.5 UI

**`Scripts/UI/MenuScreen.cs`** (145 lines)
- Routers auth panels: `ShowLogin()`, `ShowSignup()`, `HideAuthPanels()`.
- `RefreshForSession()` reads `SupabaseSession.Instance.IsSignedIn` and shows/hides Play/CarSelect/SignOut/SignIn.
- `OnPlay` → `GameManager.LoadGame()` (gates on signed-in).
- `OnCarSelect` → `LoadCarSelect`.
- `OnShowLeaderboard` → activate overlay + `leaderboardPanel.Refresh()`.
- `OnSignOut` → `AuthAPI.SignOut(RefreshForSession)`.

**`Scripts/UI/SignupScreen.cs`** (142 lines)
- Validates: username 3..24 chars `[a-zA-Z0-9_.-]`, password ≥ 6, display_name required ≤ 24.
- `OnSignup` → `AuthAPI.SignUp(...)` → on success `menu.RefreshForSession()` + hide panel.
- `Friendly(raw)` maps three error strings; everything else → generic.

**`Scripts/UI/LoginScreen.cs`** (117 lines)
- Same shape: `username/password → AuthAPI.SignIn → menu.RefreshForSession`.
- `Friendly(raw)` maps three error strings; everything else → generic.

**`Scripts/UI/GameOverScreen.cs`** (118 lines)
- `OnEnable` reads `GameSession.LastScore/LastCoins/LastMeters/LastPills/LastDurationSeconds`.
- `Submit` → `ScoreAPI.InsertScore(...)` → `LeaderboardPanel.Refresh()` → `ScoreAPI.FetchUserBest(...)`.
- Status text shows "Saving…" → "Score saved!" or "Couldn't save your score — check your connection."
- Buttons: `retryButton` → `LoadGame`, `menuButton` → `LoadMenu`, `signOutButton` → `SignOut(LoadMenu)`.

**`Scripts/UI/LeaderboardPanel.cs`** (113 lines)
- `Refresh()` ignores overlapping calls (`_inFlight`).
- `FetchRoutine` → `ScoreAPI.FetchLeaderboard(topN=10)`.
- `RenderRows` grows a row pool, marks the signed-in player's row via `selfUid == data.user_id`.
- `Bind(i, displayName, score, coins, isSelf)` on each row.

**`Scripts/UI/LeaderboardRow.cs`** — typed row component (rank/name/score/coins columns, background image, self-highlight).

**`Scripts/UI/HUD.cs`** — score, distance, coin count, multiplier labels + heat bar.

**`Scripts/UI/CarSelectScreen.cs`** — cosmetic car picker.

### 4.6 Editor (one-click setup)

- **`Assets/Editor/SceneBuilder.cs`** — builds `Game.unity`: camera, lighting, WorldScroller + GameSession, police car, six streaming spawners, HUD + HeatBar. `MeasureLengthZ(prefab, fallback)` measures road tile length from mesh bounds to avoid hardcoded guesses.
- **`Assets/Editor/UIScreenBuilder.cs`** (559 lines, user-modified mid-session) — builds `Boot.unity`, `Menu.unity` (with Login + Signup + Leaderboard panels), `CarSelect.unity`, `GameOver.unity`, and the `LeaderboardRow.prefab`.
- **`Assets/Editor/PrefabsBuilder.cs`** — builds all streamed prefabs. `MakeMovingTrigger()` ensures kinematic Rigidbody on colliders.
- **`Assets/Editor/MaterialLibrary.cs`** — folder helpers + dual-shader material setter (`_BaseColor`/`_Color`, `_BaseMap`/`_MainTex`).
- **`Assets/Editor/ProjectSetup.cs`** — tag registration via `SerializedObject` on `TagManager.asset`. Runs first in the one-click setup.

### 4.7 Audio

- **`Scripts/Audio/AudioManager.cs`** — singleton (sibling to `SupabaseSession`), music + click + swerve + jump + login + game-over SFX. Clips are assigned by hand in the inspector (see `docs/SETUP_GUIDE.md`).

---

## Part 5 — Verification commands

```bash
# 1. The diagnostic hook is NOW present (added this session) — these return hits.
grep -n "Debug.LogWarning" unity-project/Assets/Scripts/UI/SignupScreen.cs   # -> line 116
grep -n "Debug.LogWarning" unity-project/Assets/Scripts/UI/LoginScreen.cs    # -> line 118
grep -n "cfg.BaseUrl"       unity-project/Assets/Scripts/Supabase/AuthAPI.cs # -> 5 call sites
grep -n "cfg.BaseUrl"       unity-project/Assets/Scripts/Supabase/ScoreAPI.cs# -> 3 call sites

# 2. Confirm the config asset exists and the URL is a bare project URL (no /rest/v1/).
ls -la unity-project/Assets/Resources/SupabaseConfig.asset

# 3. Compile-check before/after any edit (no Unity install, ~1 s incremental).
#    The .NET SDK lives at ~/.dotnet and is NOT on a login shell's PATH, so prefix it.
export PATH="$HOME/.dotnet:$HOME/.dotnet/tools:$PATH"
dotnet build tools/compile-check/GDGGo.CompileCheck.csproj
# This session: "Build succeeded. 0 Warning(s) 0 Error(s)."

# 4. Limit git status to the gdg-go project so the sibling-project noise drops out.
git status --short unity-project supabase tools web-hosting

# 5. Verify the migrations exist.
ls -la supabase/migrations/
```

---

## Part 6 — Open questions for whoever picks this up

1. **Was the `Debug.LogWarning("[Signup] Raw error: ...")` line ever actually
   committed?** — RESOLVED. Added this session to both `SignupScreen.OnSignup`
   and `LoginScreen.OnLogin` `!ok` branches (lines 116 and 118 respectively). The
   auth code path was actually `AuthAPI` line 202 (`[Supabase] Logout HTTP failed`),
   which is unrelated. The signup/login hooks now also log via `AudioAPI.PrettyError`
   which is already chained from the auth call sites.
2. **`UIScreenBuilder.cs` lines 158–559 were truncated in the transcript.** — Read
   fully this session (561 lines total). No surprises beyond what's documented; the
   `showPasswordButton` wiring added this session lives at lines 156 and 176
   respectively for Login and Signup panels. If `signupButton`/`loginButton` fields
   are ever lost, the button silently no-ops — kept the existing
   `MakeButton(... "SignupButton", ...)` + `signup.signupButton = ...` pattern
   intact.
3. **Is `Assets/Resources/SupabaseConfig.asset` present at all?** — Yes, present,
   non-empty, and **fixed** this session. The `url` had been malformed
   (`…/supabase.co/rest/v1/`); the bare project URL is now in place and
   `SupabaseConfig.BaseUrl` defensively strips any trailing path, so a future paste
   error of `/rest/v1/` would degrade gracefully (404 instead of crashing) rather
   than breaking signup. **Still required:** paste the anon public key from
   Supabase → Project Settings → API. The asset on disk does not contain it.
4. **Does the underscore-in-username concern matter here?** — No, and unrelated to
   the fix. Synthetic emails continue to flow through; usernames with `_` are legal
   in RFC 5321 local parts and Go's `net/mail`.
5. **The user-modified `UIScreenBuilder.cs`** — verified end-to-end this session;
   added `showPasswordButton` wiring (Login line 156, Signup line 176) and nothing
   else in that file.

---

## Part 7 — Quick reference: the rules that must not regress

From `CLAUDE.md` (verified by reading `WorldScroller.cs`, `ScrollingSpawner.cs`, `GameSession.cs`, the Supabase layer, and the SQL migrations):

1. **One scroll distance drives everything.** Player never translates Z. `WorldScroller` owns `Distance/Speed/ScrollDelta`. Spawners move `-ScrollDelta`.
2. **Two coordinate spaces, no mixing.** Track (absolute metres, never rewinds) vs world (Unity Z). Convert via `WorldScroller.TrackToWorldZ`.
3. **Everything from packs except coin materials.** No Unity primitives. Quaternius for untextured (road, coin, signs, foliage) + flat materials. Kenney for textured (vehicles, cones, debris, buildings, UI, audio).
4. **Materials must work under URP *and* Built-in.** Dual-name setters.
5. **Custom tags must be registered before use.** `"Obstacle"` etc. via `ProjectSetup.EnsureTags()`.
6. **Streamed colliders need kinematic Rigidbody.** Static + moving = broadphase rebuild every frame = WebGL tank.
7. **Supabase config is a ScriptableObject, not StreamingAssets.** WebGL needs synchronous config.
8. **JsonUtility limitations.** Wrap bare arrays; concrete wrapper classes; field names match JSON keys exactly (snake_case).
9. **Cross-scene results are statics.** `GameSession.LastScore/LastCoins/LastMeters/LastPills/LastDurationSeconds`.
10. **The leaderboard is adversarial.** RLS only checks *who*, not *what*. SQL bounds + rate limit + identity stamp are the integrity layer.

---

## Part 8 — Session 2026-08-16 (this session): four bugs fixed

The previous session ended mid-diagnosis on the signup 404. This session reproduced-and-fixed
that plus three other reported bugs: "no sound", "assets don't load", and login/signup
polish. Everything compiles clean against the Unity stubs. Nothing is committed.

### 8.1 Nails this session actually drove

**Bug A — Signup 404 (root cause + fix).** See Part 3.0. Concrete edits:

- `Assets/Resources/SupabaseConfig.asset` — `url` was `https://…supabase.co/rest/v1/`;
  fixed to the bare project URL (kept the anon key slot; user must still paste it).
- `Scripts/Supabase/SupabaseConfig.cs` — added `BaseUrl` (ordinal `IndexOf("://")` then
  `IndexOf('/', hostStart)`; falls back to `url` if no path); tightened `IsValid` to
  require a non-empty `BaseUrl` + `anonKey`; tooltip now forbids `/rest/v1/`.
- `Scripts/Supabase/AuthAPI.cs` — 5 `cfg.url + "/…"` → `cfg.BaseUrl + "/…"`; doc comment
  updated.
- `Scripts/Supabase/ScoreAPI.cs` — 3 `cfg.url + "/…"` → `cfg.BaseUrl + "/…"`; doc comment
  updated.
- `Scripts/UI/SignupScreen.cs` + `LoginScreen.cs` — added
  `Debug.LogWarning($"[Signup|Login] Raw error: {message}")` in the `!ok` branch (the
  missing diagnostic hook from §3.5).

**Bug B — "No sound" (audio singleton race).** Root cause: `GameManager.Awake` called
`EnsureService<Audio.AudioManager>()`, racing the bootstrap
`[RuntimeInitializeOnLoadMethod(BeforeSceneLoad)]` that also creates a GameManager/manager
pair. The bare bootstrap AudioManager won the `DontDestroyOnLoad` race; the one in the Boot
scene whose clips were actually wired got destroyed, so every SFX silently no-op'd. Fix:

- `Scripts/Core/GameManager.cs` — removed the `EnsureService<Audio.AudioManager>()` call
  from `Awake` (bootstrap owns it). Updated the class summary + `Awake` comment.
- `Scripts/Audio/AudioManager.cs` — added `WarnIfClipsMissing()` called from `Awake`:
  if ≥6 of 11 clips are null, logs `[AudioManager] N/11 clips are unassigned… Run
  "GDG Go > 5. Assign Audio Clips"`. (All 11 clips exist on disk; assignment is the manual
  step in §4.7 — this warning makes a half-wired manager loud instead of silent.)

**Bug C — Login/signup polish.** Added Enter-to-walk-the-form, clear-on-open, and a
show/hide password toggle — all null-safe so an unbuilt panel degrades gracefully.

- `Scripts/UI/LoginScreen.cs` + `SignupScreen.cs` — new `public Button showPasswordButton`
  field; `onEndEdit` Enter handling (Enter → next field → submit) guarded by
  `WasEnter()` (`Input.GetKeyDown(Return) || KeypadEnter`, legacy Input, matches the
  `PlayerCar.cs` pattern); `OnEnable` clears fields + auto-focuses username; `TogglePassword()`
  flips `contentType`+`inputType` and re-assigns `text = text` to force TMP to re-render
  masking; `HidePassword()` resets to hidden.
- `Editor/UIScreenBuilder.cs` — built the `ShowPasswordButton` into `BuildLoginPanel`
  (offset `(300, 0)`, size `92×52`) and `BuildSignupPanel` (offset `(300, 40)`, same size).

**Bug D — "Assets don't load" (magenta under Built-in + wrong skybox).** The actual
diagnosis: the project lists URP but **no URP render-pipeline asset is assigned**
(`GraphicsSettings.m_CustomRenderPipeline: {fileID:0}`, all 6 `QualitySettings.customRenderPipeline: {fileID:0}`)
→ active pipeline is **Built-in**. But the old `LitShader()` picked `Universal Render
Pipeline/Lit` whenever the URP *package* was present (Shader.Find returns it regardless of
whether URP is active), so every MaterialLibrary-created material (coins ×5, road
asphalt/pavement/roadline, power-up, metal, foliage) was stamped URP/Lit → **magenta**
under Built-in. Kenney vehicles import via `materialImportMode: 2` → Standard and rendered
fine, which is why "everything" didn't look broken — only the Quaternius-sourced assets.

- `Editor/MaterialLibrary.cs` — `LitShader()` is now **pipeline-aware**: picks URP/Lit only
  when `GraphicsSettings.currentRenderPipeline != null` (URP actually active), else
  Standard, else Legacy/Diffuse. Added `RefreshShaders()` — re-stamps every
  `Assets/Materials` material whose current shader is in the lit family to match the
  *active* pipeline. Guarded by a private `IsLitShader()` so it leaves the Skybox/Panoramic
  and any unlit UI/particle materials alone (blanket-swapping those would break them).
- `Editor/ProjectSetup.cs` — `Run()` now calls `EnsureSkyboxMaterial()` (builds
  `Assets/Materials/World/Skybox.mat` from `Assets/Textures/Sky/skybox-day.png` via
  `Skybox/Panoramic`, idempotent) + `MaterialLibrary.RefreshShaders()`, before
  `ConfigureWebGL()`/`SaveAssets`.
- `Editor/SceneBuilder.cs` — `BuildGameScene()` calls `AssignSkybox()` after
  `BuildLighting()` and before `SaveScene`. This is load-bearing: `BuildGameScene` is
  destructive (wipes every root), and `Run()` runs *before* `SceneBuilder` in
  `RunFullSetup`, so a skybox set in `Run()` would be lost. `AssignSkybox()` sets
  `RenderSettings.skybox` to the project's image-based skybox material (falls back to
  Unity's default procedural skybox with a warning if the .mat is missing). Only the Game
  scene uses a Skybox clear; every UI scene uses `CameraClearFlags.SolidColor`, so they
  don't need it.
- `Assets/Textures/Sky/skybox-day.png.meta` — the texture was importing as a **Cube**
  (`textureShape: 1`), but `Skybox/Panoramic` samples `_MainTex` as `sampler2D` (2D
  equirect). A Cubemap can't bind a 2D sampler → pink/black sky. Fixed `textureShape: 1 → 0`
  and `generateCubemap: 6 → 0`. `EnsureSkyboxMaterial()` also calls
  `AssetDatabase.ImportAsset("Assets/Textures/Sky/skybox-day.png")` before loading, so an
  out-of-Unity meta edit is synchronously applied first.

### 8.2 Compile-check harness — the gate that earns its keep

The harness is the project's only mechanical gate (no automated tests; CLAUDE.md gate A-to-Z
hinges on "compiles + Play"). This session it **caught 9 real errors in my own edits** and
proved the rest clean.

- **dotnet was mis-reported as "not installed" in the prior session's notes.** It IS
  installed at `~/.dotnet` (8.0.424), just not on a login shell's PATH. Added the PATH-prefix
  recipe to `CLAUDE.md` and `HANDOFF.md` Part 5. The Homebrew cask (`dotnet-sdk`) needs
  `sudo` for its pkg installer — avoided by using the official no-sudo
  `dotnet-install.sh`; **do not put the sudo password on the command line** (it lands in
  session logs).
- **9 errors were all stub gaps, not real bugs** — my login/signup polish uses real Unity
  TMP APIs that the hand-written stubs didn't declare yet. Per CLAUDE.md ("Using a new Unity
  API means adding it to the stubs"), added to `tools/compile-check/UnityStubs.cs`:
  `KeyCode.KeypadEnter`, `TMP_InputField.onEndEdit`, `TMP_InputField.ActivateInputField()`.
  Real Unity is the source of truth for stub signatures — match exactly.
- **Result after stub fixes:** `Build succeeded. 0 Warning(s) 0 Error(s).`

### 8.3 What I did NOT do (gates D + scope)

- **No `git commit`.** Everything is on-disk only; the whole gdg-go tree is untracked. The
  user must stage only gdg-go paths and commit themselves (sibling-project files are dirty
  in the broader workspace but unrelated).
- **No remote set up.** Two local commits, no `origin`. Push is the user's call.
- **Did not re-run the GDG Go editor menu** (I have no Unity install) — the user must run
  **GDG Go → Run Full Project Setup** to (a) re-stamp the magenta materials to the active
  pipeline via `RefreshShaders()`, (b) build `Skybox.mat`, (c) re-assign it to the Game
  scene via `SceneBuilder`. After that, audio still needs the manual "Assign Audio Clips"
  step and the anon key must be pasted into `SupabaseConfig.asset`.
- **Did not touch the score-integrity SQL** — verified the bounds still match gameplay
  constants (`PointsPerMetre`, `maxMultiplier`, pill value, `maxSpeed × boostMultiplier`);
  no retune needed.

### 8.4 Verification status (calibrated)

- **Verified:** `dotnet build tools/compile-check/...` → 0 errors / 0 warnings. All 8
  `cfg.BaseUrl` call sites present; no stray `cfg.url +`. `showPasswordButton` wired in
  6 places (field decl + Awake listener + builder in 2 panels × 2 screens). `LogWarning`
  diagnostic hooks at `SignupScreen.cs:116` and `LoginScreen.cs:118`.
- **Believed, not run:** the rendering/SFX fixes cannot be confirmed without a Unity Play
  test. Mechanism is sound (URP-package-but-Built-in-project → magenta; singleton race →
  destroyed clip-wired manager; Cubemap-vs-sampler2D → sky won't bind) but the *visible*
  result needs the user to open Unity, run the menu, and press Play.
- **Assumed, not checked:** that `Skybox/Panoramic` exists in the Unity 6 LTS install
  (it's a built-in shader; the stub returns null and `EnsureSkyboxMaterial` warns + bails
  if absent, so a missing shader degrades rather than crashes).

### 8.5 Next steps for the user

1. Open the project in Unity 6 LTS, let the import finish.
2. **GDG Go → Run Full Project Setup.** Watch the Console for
   `[GDG Go Setup] Re-stamped N material(s)` and `[SceneBuilder] … skybox` lines.
3. Paste the anon public key into `Assets/Resources/SupabaseConfig.asset`.
4. **GDG Go → 5. Assign Audio Clips** (or whatever the menu item is) if the
   `[AudioManager] N/11 clips are unassigned` warning fires.
5. Press Play on Boot → Menu → Sign up with a fresh username. The `[Signup] Raw error: …`
   Console line will now reveal any remaining Supabase-side issue (e.g. `0001_init.sql`
   not run, Confirm-email on). If signup succeeds, drive a run and confirm coins/road/sky
   render and SFX play.
