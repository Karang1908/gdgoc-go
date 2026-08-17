# GDG Go — 3D Endless Car Chase

A browser game for **GDG on Campus**. Players visit the site, sign up, and drive an
endless police chase through city traffic — swapping lanes, jumping debris, and
collecting Google-coloured coins — competing on a live online leaderboard.

Think Subway Surfers, but you're the getaway car.

## The game

- **Three lanes.** Swap with arrows/WASD, swipe on mobile, or on-screen buttons.
- **Jump** low hazards (cones, tyres, debris). Tall ones — traffic, stop signs,
  traffic lights — must be dodged, so lane changes never stop mattering.
- **Coins** in four Google colours (1 pt each) plus a rare **GDG pill** (25 pts).
  They arrive in authored patterns — lines, weaves, jump arcs, full rows.
- **Combo multiplier** up to ×8 for collecting coins in quick succession. Resets on
  a crash. This is the main gap between a casual score and a good one.
- **Heat** is the police gap and the whole game. Boosting outruns them, cruising
  slowly loses ground, braking loses it fast, and crashing costs a chunk. A run ends
  when Heat hits zero — so run length is decided by driving, not by a timer.
- **Power-ups:** magnet, nitro, shield, 2×, police freeze.
- **Difficulty ramps** with distance: faster world, denser obstacles, faster Heat drain.

## Quick start

1. Install **Unity 6 LTS** (`6000.0.x`) with the **WebGL Build Support** module.
2. Unity Hub → **Add project from disk** → `gdg-go/unity-project/`.
   First import takes several minutes — wait for the progress bar to clear.
3. Unity menu → **GDG Go → Run Full Project Setup**. One click does everything:
   registers tags, creates the Supabase config asset, the 5 scenes, the 5 coin
   materials, WebGL player settings, every prefab, the Game scene, the UI scenes,
   and the audio wiring. Idempotent — safe to re-run.
4. Paste your Supabase **URL** and **anon public key** into
   `Assets/Resources/SupabaseConfig.asset` (the setup step selects it for you).
5. In the Supabase SQL editor, run **both** migrations in order:
   - `supabase/migrations/0001_init.sql` — tables + RLS
   - `supabase/migrations/0002_score_integrity.sql` — anti-cheat bounds + rate limit
6. Open `Assets/Scenes/Boot.unity` and press **Play**.
7. Build: **File → Build Settings → WebGL → Build**, output to `web-hosting/`.
8. Deploy: from `web-hosting/`, `netlify deploy --prod`.

## Verify the code compiles without opening Unity

```bash
dotnet build tools/compile-check/GDGGo.CompileCheck.csproj
```

~20 seconds, no Unity needed. It type-checks every runtime and editor script against
hand-written Unity stubs. Worth running after any edit: because the project has no
`.asmdef` files, a single syntax error anywhere makes the whole assembly fail, which
makes the **GDG Go** menu vanish and looks like an entirely different problem.

## Tuning — the values most likely to need a nudge

Everything below is a serialized field, adjustable in the Inspector without touching
code. These are the ones that depend on how the packs actually imported, which cannot
be verified without running Unity:

| Symptom | Fix |
| --- | --- |
| Gaps or overlaps between road tiles | `RoadScroller.tileLength`. The scene builder measures the mesh automatically and logs the value — check the Console first. |
| Cars face backwards | Rotate the `Mesh_*` child inside `Assets/Prefabs/PlayerCar.prefab` (or the traffic prefabs) by 180° on Y. Colliders live on the root, so this is visual-only. |
| Buildings look like doll houses / skyscrapers | `ScenerySpawner.buildingScale` (default 4). |
| Game too hard or too easy | `WorldScroller.startSpeed` / `maxSpeed` / `rampDistance`, and `ObstacleSpawner.intervalAtStart` / `intervalAtMaxDifficulty`. |
| Runs end too quickly | `GameSession.difficultyDrain` (lower = longer runs) and `crashHeatPenalty`. |
| Coins hard to collect | `CoinPickup.magnetRadius`, `CoinSpawner.hoverHeight`. |

If you retune scoring (`PointsPerMetre`, `maxMultiplier`, pill value, `maxSpeed`),
**also update the bounds in `0002_score_integrity.sql`** — they are derived from those
constants, and honest scores will start being rejected otherwise.

## What lives where

| Path | Purpose |
| --- | --- |
| `unity-project/Assets/Scripts/` | Runtime game code |
| `unity-project/Assets/Editor/` | One-click setup: tags, prefabs, scenes, UI, audio |
| `tools/compile-check/` | No-Unity type-check harness |
| `supabase/migrations/` | Schema + RLS, then score-integrity constraints |
| `web-hosting/` | Netlify config; Unity build output goes here |
| `Branding/` | GDG logo + pill source art |
| `RawAssets/` | Downloaded pack ZIPs (gitignored) |
| `docs/` | Design doc, asset checklist, long-form setup guide |
| `CLAUDE.md` | Architecture invariants — read before changing gameplay code |

## Art

Everything is from CC0 packs. The only original assets are the five coin **materials**;
even the coin mesh is pack-sourced.

Sourcing is not arbitrary — it follows what the packs actually contain:

- **Kenney** kits ship a `colormap.png` atlas, so their meshes import textured. They
  supply every vehicle (player, police, traffic), cones, debris and buildings.
- **Quaternius** packs ship **no textures and no vertex colours** at all — verified
  against the source zips. Their meshes carry material *slots* meant to be filled with
  flat colours, so `MaterialLibrary` generates those. They supply the road, the coin
  mesh, signs and foliage.

## Leaderboard integrity

The client computes and posts its own score, and both the anon key and the player's JWT
are visible in any browser. `0002_score_integrity.sql` therefore adds server-side
plausibility bounds (score must be reachable from the submitted distance and coins;
distance must be reachable in the submitted time), a per-user rate limit, and a trigger
that overwrites the client-supplied name with the authenticated profile's.

These are bounds, not proof. They defeat the realistic attack — posting an absurd number
— and force anything more determined to stay inside the envelope a real run could
produce. Genuine anti-cheat would need server-side simulation or signed replays, which
is well beyond this game's scope.
