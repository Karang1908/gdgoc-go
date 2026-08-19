# GDG Go — 3D Endless Car Chase

A browser game for **GDG on Campus**. Players visit the site, sign up, and drive an
endless police chase through city traffic — swapping lanes, jumping debris, and
collecting Google-coloured coins — competing on a live online leaderboard.

Think Subway Surfers, but you're the getaway car.

## The game

- **Three lanes.** Swap with arrows/WASD, swipe on mobile, or on-screen buttons.
- **Jump** low hazards (cones, tyres, debris). Tall ones — traffic, stop signs,
  traffic lights — must be dodged, so lane changes never stop mattering.
- **Coins** in four Google colours (1 pt each) plus a rare **GDG Coin** (25 pts).
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
3. Open `Assets/Scenes/Game.unity` and run **GDG Go → Validate Setup**. Do not run a
   scene/prefab generator casually: generated assets can be rewritten.
4. Run `npm ci` in `web-hosting/`, create `.env.local` from `.env.example`, and set the
   public Supabase URL and anon key there. Unity receives no Supabase credential.
5. Apply every file in `supabase/migrations/` in numeric order through
   `0007_competitive_run_integrity.sql`.
6. Open `Assets/Scenes/Game.unity` and press **Play**.
7. Build with **GDG Go → Build WebGL**, then run `npm run build` from `web-hosting/`.
8. Follow the coordinated database/Unity/React release sequence in `HANDOFF.md`.

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

If you retune scoring, acceleration, maximum/boost speed, pickup values or density, combo/2×,
or near misses, **also update the derived validation in
`0007_competitive_run_integrity.sql`** and its integration test. Honest scores will be
rejected if the serialized scene and database contract disagree.

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

Migration `0007` issues every ranked run on the server, keeps its ledger/checkpoints private,
checks progress against server time and gameplay-derived ceilings, requires exact score
arithmetic, and finalizes one immutable score row. Browser roles cannot insert, update, or
delete score/leaderboard rows, and the old one-shot score RPC is removed.

This blocks direct score edits and fabricated instant totals. WebGL still executes on the
player's device, so a determined bot can automate or imitate plausible real-time play. Only a
server-owned simulation or deterministic replay verifier can eliminate that remaining class.
See `HANDOFF.md` for the exact contract and release procedure.
