# GDG Go — Setup Guide

Everything **you** have to do, in order, from an empty machine to a live game at a URL.

Anything marked **YOU MUST** is blocking — skip it and the game will not work.
Anything marked *Optional* can wait until after launch.

**Time estimate:** ~90 minutes, most of it Unity installing and importing in the background.

---

## What you need before you start

| Thing | Cost | Notes |
| --- | --- | --- |
| Unity account | Free | For Unity Hub |
| Supabase account | Free | Auth + leaderboard |
| Netlify account | Free | Hosting |
| ~15 GB disk | — | Unity + WebGL module + build artifacts |

---

## Phase 1 — Install Unity

### 1.1 Unity Hub
Download from https://unity.com/download, install, sign in with a free Unity ID.

### 1.2 Unity 6 LTS
In Hub → **Installs** → **Install Editor** → pick a **Unity 6 LTS** version (`6000.0.x`).

**YOU MUST tick "WebGL Build Support"** in the module list. Without it you cannot ship
this game at all, and adding it later means a second long install.

iOS / Android / Linux modules are not needed.

### 1.3 Confirm
Under **Installs** you should see `6000.0.x` with a WebGL icon next to it. If the WebGL
icon is missing, click the gear on that version → **Add modules** → tick it.

---

## Phase 2 — Open the project

### 2.1 Add it
Hub → **Projects** → **Add** → **Add project from disk** → select
`/Users/karangarg/Desktop/gdg-go/unity-project` → **Open**.

### 2.2 The "Missing Editor Version" dialog

The repo records the exact editor that last opened it, which almost certainly isn't the
one you installed. Hub shows a **Missing Editor Version** warning with three groups:

- **MISSING VERSION** — the version the repo recorded. Usually not installed, and may
  carry a Security Alert. Ignore it.
- **LATEST LTS VERSION** — a newer minor line (e.g. `6000.3.x`). **Don't pick this.**
  It's a minor-version jump rather than a patch upgrade, and it means another long
  download for no benefit.
- **INSTALLS** — what you already have.

**Pick your installed `6000.0.x` version under INSTALLS and click "Open with …".**
Patch upgrades inside the same `6000.0.x` line are safe.

Check the module dropdown on that row says **WebGL** before opening. If it doesn't:
Hub → gear icon on that version → **Add modules** → tick **WebGL Build Support**.

Unity rewrites `ProjectSettings/ProjectVersion.txt` to the version you opened with.
That's expected — leave it.

### 2.3 The second dialog — "Opening Project in Non-Matching Editor Installation"

Unity asks again, this time from the editor itself:

```
The saved project (6000.0.1f1) does not match the launched editor (6000.0.81f1).
This may require re-import. Please be aware that opening in an older version
is unsupported.
```

**Click Continue.**

The scary line is about opening in an **older** editor. You're going *forward*
(`.1f1 → .81f1`) inside the same `6000.0.x` line, which is the supported direction. If
the number you launched is ever *lower* than the saved one, stop and install a newer
patch instead.

"Some packages may be updated" is also expected — Unity may bump the pinned packages in
`Packages/manifest.json` to patch releases matching your editor. Nothing in the game
code depends on those exact patch numbers. If you want the details afterwards, Unity
writes them to `Logs/Packages-Upgrade.log` inside the project folder.

### 2.4 Wait for the import — this takes a while
There are ~1,200 asset files. First open takes **5–15 minutes**.

**Wait until the bottom-right progress bar is completely gone before doing anything
else.** Running the setup mid-import is the single most common way to get a half-built
project, because the script asks for meshes the importer hasn't produced yet.

### 2.5 Console check
Open **Window → General → Console**. You want **zero red errors**.

Yellow warnings about shaders or deprecated APIs are fine. Red compile errors are not —
if you see any, run this from a terminal to get a clearer report:

```bash
cd /Users/karangarg/Desktop/gdg-go
dotnet build tools/compile-check/GDGGo.CompileCheck.csproj
```

That type-checks every script in ~20 seconds without Unity. If it passes but Unity shows
errors, the difference is a real Unity API the stub file doesn't model — send me the
error text.

---

## Phase 3 — Supabase

### 3.1 Create the project
https://supabase.com → **New project**. Save the database password somewhere. Pick the
region closest to your players. Free plan. Wait ~2 minutes for provisioning.

### 3.2 Run BOTH migrations — YOU MUST run both

Dashboard → **SQL Editor** → **New query**.

**First**, paste and run all of:
```
supabase/migrations/0001_init.sql
```
Expected: `Success. No rows returned.` This creates `users` + `scores`, indexes, and RLS.

**Then**, in a new query, paste and run all of:
```
supabase/migrations/0002_score_integrity.sql
```

**Do not skip the second one.** This game is a public website. The browser calculates
its own score and posts it, and both the API key and the player's login token are
visible to anyone who opens devtools. The policies in `0001` only check *who* is
writing, never *what* — so without `0002`, putting `score = 999999999` on your
leaderboard takes about a minute and no special skill. `0002` adds value bounds, a rate
limit, and a rule stopping people submitting under someone else's name.

### 3.3 Turn OFF email confirmation — YOU MUST do this

Dashboard → **Authentication** → **Providers** → **Email**.

Make sure **Email** is enabled, then **turn "Confirm email" OFF**.

Players never give a real email — accounts use a synthetic address
(`yourname@gdg-go.local`) so nobody has to hand over personal data. That domain does not
exist and cannot receive mail. **If confirmation is left on, every signup will be
created but never confirmed, and nobody will ever be able to log in.**

Symptom if you forget: signup looks like it worked, then login says
`Email not confirmed`. Check this setting first.

### 3.4 Copy your keys
Dashboard → gear icon (**Project Settings**) → **API**. Copy both:

- **Project URL** — like `https://abcd1234.supabase.co`
- **anon public** key — long string starting `eyJ...`

The anon key is safe to ship in a browser build. That's what it's for. Row-Level
Security is what actually protects your data. **Never** put the `service_role` key in
the game — that one bypasses all security.

---

## Phase 4 — Run the one-click setup

With the import fully finished (Phase 2.4), go to the Unity menu bar:

**GDG Go → Run Full Project Setup**

It runs five steps in dependency order and logs each one:

1. **Project Setup** — registers the `Obstacle` tag, creates the Supabase config asset,
   the 5 scenes, the 5 coin materials, and WebGL player settings
2. **Build All Prefabs** — player (4 selectable bodies), police, 8 traffic vehicles,
   6 obstacles, coin, power-up, road tile, scenery
3. **Build Game Scene** — camera rig, lighting, session objects, all 7 spawners, HUD
4. **Build UI Scenes** — Boot, Menu (with login/signup/leaderboard panels), CarSelect,
   GameOver
5. **Assign Audio Clips** — wires the Kenney sound effects

It is **idempotent** — existing assets are skipped, never overwritten. Safe to re-run
any time. Individual steps are also on the menu (`1.` … `5.`) if you only need one.

**Read the Console afterwards.** Warnings starting `[PrefabsBuilder] Missing model:` or
`[SceneBuilder] Missing asset:` tell you exactly what didn't build. One useful line to
look for:

```
[SceneBuilder] Road tile length measured as 12.0 units.
```

That's the builder measuring the actual road mesh rather than guessing — note the number
in case you get seams later.

---

## Phase 5 — Paste your Supabase keys

The setup step selects the config asset for you. If not, find it at:

```
Assets/Resources/SupabaseConfig.asset
```

In the Inspector, fill in:

- **Url** — your Project URL, **no trailing slash**
- **Anon Key** — the long `eyJ...` string

Then **File → Save Project**.

Sanity check: **GDG Go → Validate Setup**. You want `Supabase filled : True`.

---

## Phase 6 — Press Play

Open `Assets/Scenes/Boot.unity` and press **Play**.

Boot holds for about a second, then routes to the Menu.

### What should happen
- Menu shows the GDG logo and a **SIGN IN** button
- Create an account (Phase 7), then **PLAY**
- Road streams toward you, buildings rush past on both sides
- Coins appear in lines, weaves and arcs
- Traffic and cones appear ahead and you close on them
- A police car sits behind you; the bar at the bottom is your gap

### Controls
| Action | Keyboard | Mobile |
| --- | --- | --- |
| Change lane | `A` / `D` or `←` / `→` | swipe left/right |
| Jump | `W` / `↑` / `Space` | swipe up |
| Brake | `S` / `↓` | swipe down |
| Boost | `Shift` | — |

### How the game actually works
The bar at the bottom is **Heat** — your lead on the police. Boosting extends it,
cruising slowly loses ground, braking loses it fast, crashing costs a chunk. At zero
you're caught. So how long a run lasts is decided by how you drive, not by a timer.

Coins collected in quick succession build a **combo multiplier up to ×8**, which resets
on a crash. That's the main gap between a casual score and a good one.

Low obstacles (cones, tyres, boxes, debris) can be **jumped**. Tall ones (traffic, stop
signs, traffic lights) cannot — you have to change lane.

---

## Phase 7 — Test the account flow

Still in Play mode, on the Menu:

1. **SIGN IN** → **CREATE ACCOUNT**
2. Username `testplayer`, password `test123`, display name `Test Player`
3. **CREATE** → you should land back on the Menu greeting you by name
4. Play a run, crash on purpose
5. Game Over should say **"Score saved!"** and show you on the leaderboard

Verify in Supabase → **Table Editor** → `scores`. You should see one row with your
display name, and `duration_seconds` filled in.

If it says "Couldn't save your score", check Phase 3.3 (email confirmation) and Phase 5
(keys pasted correctly).

---

## Phase 8 — Tuning

**Nothing here is a bug — these are values that depend on how the art packs imported,
and I could not check them without running the game.** All are Inspector fields; no code
editing needed. Play, see what looks off, adjust, play again.

| What you see | Where to fix it |
| --- | --- |
| **Cars face backwards** | Open `Assets/Prefabs/PlayerCar.prefab`, select the `Mesh_sports` child, set Rotation Y to `180`. Repeat for the other `Mesh_*` children and the traffic prefabs. Colliders are on the root, so this is visual only and can't break anything. |
| **Gaps or overlap between road tiles** | `RoadScroller.tileLength` in the Game scene. Compare against the measured value the Console logged in Phase 4. |
| **Buildings are tiny / enormous** | `ScenerySpawner.buildingScale` (default `4`). |
| **Buildings too close or too far** | `ScenerySpawner.sideOffset` (default `13`). |
| **Car sits in / floats above the road** | Move the `Mesh_*` child up or down on Y. |
| **Coins hard to grab** | `CoinSpawner.hoverHeight`, `CoinPickup.magnetRadius`. |
| **Too hard / too easy** | `WorldScroller.startSpeed` (`16`), `maxSpeed` (`42`), `rampDistance` (`2200`). |
| **Runs end too fast** | `GameSession.difficultyDrain` — lower means longer runs. Also `crashHeatPenalty`. |
| **Too many / few obstacles** | `ObstacleSpawner.intervalAtStart` (`34`), `intervalAtMaxDifficulty` (`15`). |
| **Lanes too tight/wide** | `LaneModel.LaneWidth` in `Scripts/Gameplay/LaneModel.cs` — this one *is* code, and everything reads it, so change it in one place only. |

> **If you change scoring** — `PointsPerMetre`, `maxMultiplier`, the pill's 25 points, or
> `maxSpeed` — **you must also update the matching bounds in
> `supabase/migrations/0002_score_integrity.sql`.** Those bounds are derived from these
> constants, and if they disagree, real players' scores start getting rejected.

---

## Phase 9 — Optional polish

Neither of these blocks launch.

### 9.1 Pedestrians
The spawner is wired and working but ships with an empty list, so no pedestrians appear.
To enable them you need to build prefabs in the GUI:

1. Drag a mesh from `Assets/Models/Quaternius/AnimatedMen/` into a scene
2. Create an Animator Controller with a float parameter named `speed`, blending
   `Assets/Animations/Mixamo/Idle.fbx` → `Walking.fbx`
3. Add the `PedestrianNPC` component and a trigger collider
4. Assign flat materials — these Quaternius meshes ship untextured
5. Save as a prefab, then add it to `PedestrianSpawner.pedestrians` in the Game scene

### 9.2 Music
`AudioManager.musicLoop` is empty — sound effects work, but there's no music bed. The
Kenney jingles in the project are short stings, not loops. Drop any CC0 loop into
`Assets/Audio/` and assign it on the AudioManager in the Boot scene.

---

## Phase 10 — Build for the web

### 10.1 Switch platform
**File → Build Settings** → select **WebGL** → **Switch Platform**. First switch
re-imports every texture for WebGL — expect another 5–15 minutes.

### 10.2 Player settings
The setup step already applied these. To verify: **Player Settings → Publishing Settings**

- Compression Format: **Brotli**
- Decompression Fallback: **ticked**
- Exception Support: **None** (stack traces roughly double the download for no player benefit)

### 10.3 Scene list
Build Settings should list, in this order, all ticked:
`Boot, Menu, CarSelect, Game, GameOver` — **Boot must be index 0.**

### 10.4 Build
**Build** → output folder `gdg-go/web-hosting/`.

First build takes **10–25 minutes**. Later ones are much faster.

### 10.5 Check the size
Target is **≤ 25 MB brotli**. Check `web-hosting/Build/` after the build.

If it's over: the biggest win is deleting unused FBX from
`Assets/Models/Kenney/CityKit*/` and `Assets/Models/Quaternius/DowntownCity/` — the
scenery spawner only references about a dozen buildings, but every file in the folder
gets imported. Delete what nothing references and rebuild.

---

## Phase 11 — Deploy

### Option A — drag and drop (fastest)
1. https://app.netlify.com → **Add new site** → **Deploy manually**
2. Drag the whole `web-hosting/` folder in
3. You get a URL immediately

### Option B — Git-linked (better for updates)
1. Push the repo to GitHub
2. Netlify → **Add new site** → **Import an existing project**
3. Build command: leave **empty** (Unity builds locally, not on Netlify)
4. Publish directory: `web-hosting`

Either way `web-hosting/netlify.toml` is already configured with the Brotli
`Content-Encoding` headers WebGL needs.

### Verify the live site
Open the URL, and check on **a real phone** as well as desktop:

- Loads without a console error about compression
- Signup works
- Swipe controls work on the phone
- A score submitted from the phone shows on the desktop leaderboard

That last one is the real end-to-end test.

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| **No "GDG Go" menu in Unity** | A script failed to compile, which kills the whole assembly including the menu. Check the Console, or run `dotnet build tools/compile-check/GDGGo.CompileCheck.csproj` for a clearer error. |
| **`Tag: Obstacle is not defined`** | Run **GDG Go → 1. Project Setup**. Or add it manually: Edit → Project Settings → Tags and Layers → **+** → `Obstacle`. |
| **Everything is magenta** | Shader/pipeline mismatch. The material helper falls back automatically, so this usually means the setup ran before the import finished — delete `Assets/Materials/` and re-run **GDG Go → 1. Project Setup**. |
| **Nothing moves when I press Play** | No `WorldScroller` in the scene. Re-run **GDG Go → 3. Build Game Scene**. |
| **Road is there but empty — no cars or coins** | Prefabs didn't build. Check the Console for `Missing model:` warnings, then re-run **GDG Go → 2. Build All Prefabs**. |
| **Signup succeeds, login says `Email not confirmed`** | Phase 3.3 — turn off email confirmation. |
| **"Couldn't save your score"** | Keys wrong (Phase 5), or `0002` not run (Phase 3.2). Check the browser console for the actual HTTP error. |
| **Leaderboard is empty but scores exist in the table** | The public read policy from `0001` didn't apply. Re-run `0001_init.sql`. |
| **Score rejected with a check violation** | You retuned gameplay constants without updating the bounds in `0002`. See the note in Phase 8. |
| **Game silent** | Re-run **GDG Go → 5. Assign Audio Clips** (it needs the Boot scene, which it opens itself). |
| **Browser: "incorrect response MIME type"** | Serving the build from a plain file server. Use Netlify, or any host that honours `netlify.toml`'s `Content-Encoding` headers. |

---

## Final checklist

Everything below should be true before you share the link.

**Setup**
- [ ] Unity 6 LTS with WebGL module
- [ ] Project opens with zero red Console errors
- [ ] `dotnet build tools/compile-check/GDGGo.CompileCheck.csproj` passes
- [ ] **GDG Go → Run Full Project Setup** completes with no `Missing` warnings
- [ ] **GDG Go → Validate Setup** shows all `True`

**Supabase**
- [ ] `0001_init.sql` run
- [ ] `0002_score_integrity.sql` run
- [ ] Email confirmation **OFF**
- [ ] URL + anon key pasted into `SupabaseConfig.asset`

**Gameplay**
- [ ] Road, buildings, traffic, coins all visible and moving
- [ ] Cars point the right way
- [ ] Lane change, jump, brake, boost all respond
- [ ] Crashing into a cone hurts; jumping over one doesn't
- [ ] Combo multiplier appears when collecting coins quickly
- [ ] Heat bar drains, and reaching zero ends the run
- [ ] Two different players get clearly different scores

**Online**
- [ ] Signup and login work
- [ ] Score appears in the `scores` table
- [ ] Leaderboard shows real names, your row highlighted
- [ ] Works on a real phone, swipe included

**Ship**
- [ ] WebGL build ≤ 25 MB brotli
- [ ] Deployed, loads over HTTPS
- [ ] Phone score visible on desktop leaderboard
