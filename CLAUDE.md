# CLAUDE.md — per-repo facts for `gdg-go`

Unity 6 LTS WebGL endless car-chase game for **GDG on Campus (GDGoC)**. It is a
**public web game** — players visit the site, self-register, and compete on a live
online leaderboard. It is *not* a kiosk/booth build, which drives three requirements
that a local build would not have: touch input, small download, and score integrity.

## Stack

- **Unity 6 LTS**, `6000.0.x` line → WebGL → **Netlify** (`web-hosting/`). Any patch in
  that line works; Unity rewrites `ProjectSettings/ProjectVersion.txt` to whatever opened
  it, so don't treat that file's exact value as the target. Avoid jumping to `6000.3.x` —
  that's a minor-version change, not a patch upgrade.
- **Supabase** for auth + leaderboard. **No backend JS bridge**; C# hits Supabase REST
  directly via `UnityWebRequest`. The Firebase Unity SDK was rejected because it does
  **not** support WebGL (verified 2026-08-16).
- All HTTP via `UnityWebRequest`. No native plugins, no `.jslib`. Coroutines return to
  `Action<bool, string>` callbacks.

## Verify before you claim it compiles

```bash
dotnet build tools/compile-check/GDGGo.CompileCheck.csproj
```

Type-checks every script in `Assets/Scripts` **and** `Assets/Editor` against hand-written
Unity stubs, in ~20s, with no Unity install. Use it after every edit.

The `.NET SDK` lives at `~/.dotnet` (installed via the official `dotnet-install.sh`,
not the Homebrew cask — the cask's package installer needs `sudo`). It is **not** on a
login shell's PATH, so prefix the command:

```bash
export PATH="$HOME/.dotnet:$HOME/.dotnet/tools:$PATH"
dotnet build tools/compile-check/GDGGo.CompileCheck.csproj
```

If `dotnet` is missing, re-run the official no-sudo installer:

```bash
curl -fsSL https://dot.net/v1/dotnet-install.sh | bash -s -- --channel 8.0 --install-dir "$HOME/.dotnet" --no-path
```

A green build proves syntax + internal consistency + stub coverage, not that a stub
matches real Unity. Using a new Unity API means adding it to `tools/compile-check/UnityStubs.cs`
(or `UnityEditorStubs.cs`). Real Unity is the source of truth for a stub's signature —
match it exactly (method name, capitalisation, arity) so the check stays meaningful.

This exists because the project once shipped two C# syntax errors. There are **no
`.asmdef` files**, so everything is in `Assembly-CSharp` and `Assembly-CSharp-Editor`
depends on it: one syntax error anywhere removes the entire "GDG Go" editor menu, which
makes the one-click setup unreachable and looks like a completely different problem.

Limitation: a green build proves syntax + internal consistency, not that a stub matches
real Unity. Using a new Unity API means adding it to `tools/compile-check/UnityStubs.cs`.

## Architecture facts that must not regress

1. **One scroll distance drives everything.** The player never translates on Z.
   `WorldScroller` (execution order −100) owns `Distance`, `Speed` and `ScrollDelta`;
   every streamed object moves `-ScrollDelta` on Z. All seven streamers derive from
   `ScrollingSpawner`, which owns that contract — move, cull, schedule-in-track-space.
   **Do not let a spawner position objects itself.** The original bug was exactly that:
   spawners placed objects at a fixed world Z and never moved them, so the world was
   frozen and unreachable.

   Two coordinate spaces, and mixing them silently breaks streaming:
   - *track space* — absolute metres since the run began, never rewinds. Schedules live here.
   - *world space* — Unity Z relative to the player at the origin.
   - convert with `WorldScroller.TrackToWorldZ(track)`.

2. **"Everything from packs except coin materials."** No Unity primitives in the build —
   no default cubes/spheres/skyboxes/UI sprites. Every *mesh, texture and audio clip*
   comes from a pack. The only original assets are the 5 coin **materials**; even the
   coin mesh is pack-sourced (Quaternius RPG `Coin.fbx`, single `Gold` slot).

3. **Pack texture reality — this decides art sourcing.** Verified against the source zips:
   - **Quaternius packs ship NO textures and NO vertex colours.** Only `.fbx` +
     `Preview.png` + `License.txt`. Their meshes render flat white unless you assign
     materials. They carry multiple material *slots* and are meant to be flat-shaded.
   - **Kenney packs ship textures** (`colormap.png` atlas, or per-vehicle PNGs) and
     import looking correct with zero work.

   So: **Kenney for anything that should look textured** (all vehicles incl. the player
   and police, cones, debris, buildings). **Quaternius for road, coin, signs, foliage**,
   with flat materials from `MaterialLibrary`.

## Fuel — the second way to lose

`GameSession.Fuel` (0..1) drains with **distance, not time**, so a tank is always worth the
same number of metres and boosting costs fuel rather than secretly shortening the run.
Reaching 0 calls `EndGame()` exactly like Heat does.

- Range = `WorldScroller.startSpeed × fuelSecondsAtCruise` = **672 m** at current tuning.
- One can restores `fuelPerCan` (0.28) = **188 m**.
- `CoinSpawner` schedules cans every **190 m**, tightening to **85 m** once below
  `LowFuelThreshold` (0.25) — a run should end from bad driving, never from bad luck.
- Boosting drains `boostFuelMultiplier` (2.1×) faster.
- Fuel is `CoinType.Fuel` so it reuses coin streaming and the magnet, but
  `CoinPickup.Collect` short-circuits **before** `OnCoinCollected` — routing it through
  scoring would inflate the coin counter and extend the combo.
- Its material is deliberately outside the Google palette (hot orange `#FF6B0D`): a fuel
  can that reads as "another coin" defeats the mechanic.

The GDG pill is gated behind `gdgPillUnlockDistance` (500 m) so the signature pickup is a
milestone rather than something tripped over in the first seconds, and it spawns a
`PickupBurst` on collect.

## The road tile is generated, not imported

`BuildRoadTile` builds the tile from quads instead of using `Street_Straight.fbx`. The
pack mesh was measured and rejected: it is a coarse strip with vertices only at
x = −6, −2, 0, +2, +6, and **its centre band sits 0.18 units lower than the rest** — on a
3-lane road that dip runs down the middle lane, so the centre lane visibly sinks and the
outer lanes read as raised kerbs. It also has no markings at the lane boundaries.

Generated geometry: a flat asphalt quad across x ±4.5 at **y = 0**, raised pavements
(`PavementHeight` = 0.18) from 4.5 to 6 with a vertical inner face, dashes at ±1.5, solid
edge lines at ±4.5. "Everything from packs" is about *art*; a flat quad is geometry, and
the pack mesh actively cannot express a correct 3-lane road.

**Everything that stands beside the road seats on `PavementHeight`, not 0.** `ScenerySpawner`
and `PedestrianSpawner` both re-seat instances by measured `Renderer.bounds` *after*
scaling — a prefab whose lowest vertex sits slightly below its pivot gets that gap
multiplied by its scale, so at 4–5× a millimetre of slop becomes a visibly floating
building.

## Procedural meshes must be saved BEFORE the prefab

`AddObjectToAsset` **after** `SaveAsPrefabAsset` does not work: the prefab has already
serialised its `MeshFilter` references, so the meshes end up stored in the file while every
filter points at nothing. Verified — the asset held all 13 meshes and every renderer
measured zero size.

`PrefabsBuilder.Save` writes generated meshes to a sibling `<prefab>_Meshes.asset` **first**,
so they have a real asset path before the prefab is serialised. `DeleteQuaterniusDerivedPrefabs`
deletes that sibling too, or a rebuilt prefab binds to the previous run's geometry.

## Power-up icons are imported pack meshes, not procedural silhouettes

The 6 power-up meshes (Magnet, TwoX, Shield, Nitro, Freeze, Fuel) come from a
mix of Kenney and Quaternius packs so the silhouette that streams at you is
literally the gameplay effect the pickup performs — a Subway-Surfers-style
crane-magnet for CoinMagnet, a star for TwoX, a warrior shield for Shield,
a propane cylinder for Nitro, a 6-arm snowflake for Freeze, a jerry can for
Fuel. Verified sources (2026-08-17):

| Power-up | Mesh | Source pack |
|---|---|---|
| Magnet  | `crane-magnet.fbx`   | Kenney Factory Kit |
| TwoX    | `star.fbx`           | Kenney Platformer Kit |
| Shield  | `shield-round.fbx`   | Kenney Mini Dungeon |
| Nitro   | `PropaneTank.blend`  | Quaternius Survival |
| Freeze  | `snowflake-a.fbx`    | Kenney Holiday Kit |
| Fuel    | `GasCan.blend`       | Quaternius Survival |

Downloaded raw packs live in `RawAssets/` (gitignored). Each imported mesh is
copied into `Assets/Models/Kenney/<Pack>/` or `Assets/Models/Quaternius/<Pack>/`
alongside a sibling `colormap.png` (Kenney packs) so textures resolve.

The earlier `Assets/Editor/PowerUpMeshBuilder.cs` that authored 6 silhouettes
via raw `Mesh` API (U-magnet, 5-pointed star, kite shield, lightning bolt,
6-arm snowflake, jerry can) is **orphaned** — left on disk but no longer called
by `PrefabsBuilder.BuildPowerUps` / `BuildFuelPrefab`. The user rejected the
procedural icons in favour of imported pack meshes.

### Scale per mesh — measured in Unity MCP

Each icon is normalised to **1 world unit tall** with its lowest vertex at y = 0.
`PowerUpVariants` carries per-entry `ImportScale` + `Upright` (2026-08-17,
verified via `Renderer.bounds` measurement in Unity MCP):

| Power-up | upright | ImportScale | Notes |
|---|---|---|---|
| Magnet  | false | 1.11f    | Kenney FBX already Y-up; bounds 0.72 × 0.90 × 0.72 |
| TwoX    | false | 2.75f    | Kenney star authored 0.36 tall; scale ×2.75 → 1 unit |
| Shield  | false | 2.63f    | Kenney shield centred at origin; re-seat aligns base to y = 0 |
| Nitro   | true  | 0.0069f  | Quaternius blend ×100-pre-scaled to ~145 world units; ×0.0069 → 1 |
| Freeze  | false | 2.50f    | Kenney snowflake 0.40 tall |
| Fuel    | true  | 0.0080f  | Quaternius blend ×100 → 124 world units post-upright |

`-90 X` (the `QuaterniusUprightRotation`) is applied only on Z-up Quaternius
sources; Kenney FBXs are already Y-up, so passing `upright: true` would tip
those onto their sides. `AttachMesh` re-seats the mesh so its lowest point
hits y = 0 whenever `bounds.min.y < 0` (catches centred-pivot Kenney props
without disturbing known-bottom-aligned imports like the Kenney car bodies).
`CoinScale` continues to drive `BuildCoin` — `Quaternius/RPG/Coin.fbx`
unchanged; the user did not ask for a coin swap.

### Material assignment on imported meshes

Imported FBX/blend ship their own material slots (named `colormap`, `White`,
`Red`, etc.). `BuildPowerUps` overrides every non-glow MeshRenderer on the
mesh child with the icon's tint + secondary materials so each pickup reads
at game-speed as the identity colour the player has been trained to expect.
The first renderer carries the primary tint; subsequent renderers (only the
two-material icons — magnet has renderer pair, shield has renderer pair)
carry the secondary (`_Pole.mat` Google Red, `_Stripe.mat` near-white). The
earlier "_A"/"_B" child naming convention is gone — imported packs don't
follow it, so we use renderer-index order instead (which matches the FBX's
child export order, same order the pack's own colours use).

`DeleteQuaterniusDerivedPrefabs` clears the per-power-up `_Pole.mat` /
`_Stripe.mat` / `_Secondary.mat` fallbacks plus the glow mats and
`_Meshes.asset` siblings on every rebuild, so hand-tuned tunings should go
through the code, not the asset — `MaterialLibrary.GetOrCreate` returns an
existing asset untouched. The `_Meshes.asset` siblings are now empty for
imported-mesh prefabs (the imported mesh already has an asset path, so the
`Save()` mesh-sweep skips it) and exist only as historical residue.

### The glow halo auto-adapts to whatever icon

`AttachMesh` parents the imported icon at `localPosition = (0,0,0)` (with
post-rotation re-seat to y = 0), and `AddGlowHalo` reads the icon's
`Renderer.bounds` directly to size the halo — so the glow auto-scales to
whatever silhouette is loaded. No rainbow-scale retune needed when icons
change. The halo is a two-layer billboarded radial-gradient sprite
(`BrightCore` 1.3× mesh bounds, `SoftHalo` 2.8× mesh bounds) that stays
camera-facing while the icon spins on Y, sibling of the Mesh under a
`GlowHalo` empty GameObject.

## Lane markings are generated, not modelled

`Street_Straight` carries a single marking down its centre, which on a 3-lane road sits in
the middle of the *centre lane*. `PrefabsBuilder.BuildLaneMarkings` generates dashes at the
real lane boundaries (x = ±1.5) plus solid edge lines (x = ±4.5) as flat quads.

Two traps:
- The dash stride is recomputed from a rounded count so dashes **meet across the tile
  seam** instead of drifting out of phase every 12 m.
- Procedural meshes exist only in memory. `PrefabsBuilder.Save` calls
  `AssetDatabase.AddObjectToAsset` for every unsaved mesh before saving the prefab —
  without it the prefab serialises a reference to an asset that was never written and
  loads with nothing to draw.

## Audio is wired but has no music

`GDG Go > 5. Assign Audio Clips` wires 13 clips onto the Boot scene's `AudioManager`.
**`musicLoop` is deliberately left null** — every clip in the Kenney pack is a *jingle*
(longest 1.76 s) and looping a one-second sting under continuous gameplay is worse than
silence. `PlayMusic()` no-ops on null. Drop a real loop into `Assets/Audio/Music/` and
assign it in `AudioSetup` to enable it.

Note `AudioManager` lives only in **Boot** and survives via `DontDestroyOnLoad`, so
pressing Play directly on `Game.unity` gives a silent game — that is expected, not a bug.

3z. **Measure inside Unity. Never infer geometry from the FBX bytes.**
   Everything in 3a below was worked out by decoding FBX files on disk, and most of it was
   wrong — raw vertex arrays, node transforms and `Mesh.bounds` each tell a different
   story, and none of them is what the engine delivers. The authoritative measurement is
   `Renderer.bounds` on an *instantiated prefab*, read through the Unity MCP connection:

   ```csharp
   var inst = (GameObject)PrefabUtility.InstantiatePrefab(model);
   var r = inst.GetComponentsInChildren<Renderer>(true);
   var b = r[0].bounds; for (int i=1;i<r.Length;i++) b.Encapsulate(r[i].bounds);
   ```

   Verified values (2026-08-16, via MCP, at `globalScale = 100`):

   | mesh | delivered X × Y × Z | orientation |
   |---|---|---|
   | `Street_Straight` | 200 × 200 × 25 | needs `(-90, 90, 0)` |
   | `Coin` | 73.67 × 18.12 × 73.77 | needs `-90` X |
   | `Sign_Stop` | 2.33 × 13.84 × 53.77 | needs `-90` X |
   | `Streetlight_Single` | 13.17 × 13.17 × 109.04 | needs `-90` X |
   | `Tree1` | 206.73 × 298.78 × 409.91 | needs `-90` X |
   | `Male_Casual` | 1.96 × 4.93 × 1.13 | already upright |

3y. **Import scale differs per Quaternius pack.** The mesh data is authored tiny —
   `Street_Straight`'s `Mesh.bounds` is 0.02 × 0.02 × 0.0025 — and `useFileScale` honours
   it, so props arrive ~1/100th of usable size and any prefab built from one collapses to
   nothing. `ModelAxisFixer` sets **props/streets/RPG to `globalScale = 100`,
   `useFileScale = false`** and leaves **`AnimatedMen`/`AnimatedWomen` at file scale** —
   the character packs are already metre-scale, and ×100 gives a 49,000-unit pedestrian.

3x. **The road tile needs `(-90, 90, 0)`, and its top surface must sit at y = 0.**
   The street mesh runs along X, so `-90` X alone leaves the lane markings running
   *across* the player's path like a zebra crossing; the extra 90 on Y turns the marking
   submesh from 200 × 2 × 6 to 6 × 2 × 200. And unlike every prop — which is aligned by
   its underside so it stands *on* the ground — the road **is** the ground:
   `AlignTopSurfaceToGround` sinks it so the driving surface is y = 0. Aligning its bottom
   instead puts the surface 1.5 units up, buries the car inside the tarmac, and the camera
   looks along the inside of the slab (the whole screen goes pale).

3w. **`Street_Straight`'s material slot names do not describe road parts.** Measured in
   world space: `Grey` spans x −6..+6 (the driving surface), `White` spans x −0.18..+0.18
   (the centre marking), and **`Black` spans x −2..+2 — a median strip down the middle of
   the road, not the kerbs.** Mapping `Black` → asphalt reads naturally and is wrong;
   painting it Pavement grey lays a pale band over the centre lane and buries the marking.
   Both `Grey` and `Black` get `Asphalt`.

3a. **Quaternius FBXs carry a ×100 node transform. NEVER set `bakeAxisConversion`.**

   Reading raw vertex arrays makes these meshes look Z-up — `Street_Straight.fbx` spans
   X 2.0, Y 2.0, Z 0.25, so the long axis appears to be anything but Y. **That reading is
   a trap.** The FBX's own Model node carries the correction:

   ```
   Lcl Rotation = [-90, 0, 0]        <- stands the geometry upright
   Lcl Scaling  = [100, 100, 100]    <- centimetre source -> metre scene
   ```

   Unity applies both at import, so the *delivered* mesh is already Y-up and 100× the raw
   size. `Street_Straight` imports as **200 × 25 × 200 world units**.

   Setting `bakeAxisConversion = true` applies a **second** −90° rotation and tips upright
   meshes onto their sides. That shipped once: the road tile's measured depth collapsed to
   0.015, `RoadScroller` spawned tiles 1.5 cm apart, hit its 32-per-frame cap, and the road
   vanished entirely while coins still scored. `ModelAxisFixer` now exists to *clear* the
   bake, not set it.

   **Measure `Renderer.bounds` on the imported prefab, never the raw vertex array.**

   Consequences:
   - Quaternius prefab scales are therefore *small*: coin 0.019, power-up 0.0244, stop
     sign 0.0558, traffic light 0.0517, streetlight 0.0642, tree 0.0171, bush 0.0107,
     pedestrian 0.0037, road tile 12/200 = 0.06. Each is target-size ÷ measured-imported-size.
   - Kenney FBXs carry **no** node transform and import 1:1 — that is why only Quaternius
     props need a scale.
   - Prefabs bake in scale at build time and every `Build*` skips an existing prefab, so
     changing a scale alone does nothing. `ProjectSetup` calls
     `PrefabsBuilder.DeleteQuaterniusDerivedPrefabs()` first; `GDG Go > 2b. Rebuild
     Quaternius Prefabs` does the same on demand.

3c. **Quaternius meshes name their material slots — assign by name, not index.**
   `Street_Straight` carries `Black` / `Grey` / `White` (asphalt, kerb, lane markings);
   `Coin` carries `Gold`; `Tree1` carries `Leaves` / `Tree`; the character packs carry
   `Skin` / `Hair` / `Eyes` / `Shirt` / `Pants` / `Shoes` / `Socks`. Positional assignment
   paints lane markings with the kerb colour whenever slot order differs from palette
   order. Use `MaterialLibrary.AssignNamedPalette`.

   `MaterialLibrary.GetOrCreate` deliberately returns an **existing** `.mat` untouched, so
   retuning a colour in code is invisible on a project that already ran setup. Push
   changes through with `MaterialLibrary.RestampWorldPalette()`.

3b. **Every PNG under `Assets/UI` must import as a Sprite.** A PNG defaults to
   `TextureImporterType.Default`, so `LoadAssetAtPath<Sprite>` returns **null** — and a
   uGUI `Image` with a null sprite silently draws a plain white quad instead of erroring.
   All 527 UI PNGs were importing as plain textures, which is why every panel, button,
   logo and bar rendered as a flat rectangle. `UIAssetImporter.FixAll()` forces
   `Sprite` + `Single` + `alphaIsTransparency` and derives a nine-slice border.
   Note `Image.Type.Sliced` with a zero `spriteBorder` **silently degrades to Simple**,
   so setting the type without the border still stretches corners.

   Kenney bar sprites come in `_l` / `_m` / `_r` / `_square` pieces. `_m` is the straight
   mid-section; the plain and `_square` names have rounded caps baked in, and stretching
   one across a 420 px bar turns a progress bar into an ellipse.

3e. **Read `~/Library/Logs/Unity/Editor.log` before theorising about "assets not loading".**
   `Editor.log` is the current session, `Editor-prev.log` the previous one — and the
   *previous* log is usually the one holding the import errors, since importing happens
   at project open. Grep it for `ImportFBX Errors`, `Could not create asset`, `warning CS`.
   Three real problems were found there after several rounds of guessing from file
   listings alone:
   - `Could not create asset from Assets/Textures/Sky/skybox-day.png: Texture could not
     be created.` — the shipped `.meta` has `textureShape: 0`, which is not a legal
     `TextureImporterShape` (1 = 2D, 2 = Cube). Unity rejects the asset, `Skybox.mat` is
     never created, and `SceneBuilder` silently falls back to the default procedural sky.
     `ProjectSetup.EnsureSkyboxMaterial()` now repairs the importer before loading.
   - `ImportFBX Errors: The mesh ... has invalid normals` × 153, all from
     `Models/Quaternius/DowntownCity` — a 6.5 MB pack **referenced by nothing** (verified
     against every scene and prefab). `GDG Go > 5d` sets those importers to recalculate
     normals; deleting the folder is also fine and reclaims the space.
   - `warning CS0618: 'TMP_Text.enableWordWrapping' is obsolete` — use
     `textWrappingMode = TextWrappingModes.NoWrap`.

3f. **A generated TMP font asset can be valid-looking and completely empty.**
   `TMP_FontAsset.CreateFontAsset` with `AtlasPopulationMode.Dynamic`, followed by
   `TryAddCharacters` *after* `AssetDatabase.CreateAsset`, writes a `.asset` that has an
   atlas texture, a material, and **zero entries in `characterTable`**. TMP then silently
   falls back to LiberationSans, so the font appears never to change no matter how many
   times setup is re-run. Build the font **Static**, call `TryAddCharacters` **before**
   `CreateAsset`, and assert `characterTable.Count > 0` afterwards — `FontSetup` does all
   three. To check an existing asset: `grep -c "m_ElementType" "UI/Fonts/*.asset"`.

3d. **Kenney Future is a display face, not a body face.** Its lowercase glyphs are drawn
   as small-caps, so anything the player types into an input field renders as if
   uppercase. Use `FontSetup.Display()` for headings, buttons and score readouts, and
   `FontSetup.Body()` (TMP's LiberationSans) for input fields, status lines, leaderboard
   names and anything read as prose. It is deliberately **not** the TMP project default.

4. **Materials must work under URP *and* Built-in.** The manifest lists URP but no URP
   asset is assigned. `MaterialLibrary.LitShader()` falls back URP/Lit → Standard →
   Legacy/Diffuse, and every setter writes both names (`_BaseColor`+`_Color`,
   `_BaseMap`+`_MainTex`). Hardcoding the URP shader produces magenta materials.

5. **Custom tags must be registered before use.** `"Obstacle"` is not a Unity built-in
   (`"Player"` and `"MainCamera"` are). Assigning an unregistered tag throws
   `UnityException` and aborts the batch mid-way. `ProjectSetup.EnsureTags()` registers
   them via `SerializedObject` on `ProjectSettings/TagManager.asset` and is called first
   by `PrefabsBuilder.BuildAll()`. Tag names live in `Scripts/Core/Tags.cs`.

6. **Everything streamed that has a collider needs a kinematic Rigidbody.** A collider
   with no Rigidbody is a *static* collider; moving one makes PhysX rebuild its static
   broadphase every frame. With hundreds of coins in flight that alone tanks WebGL.
   `PrefabsBuilder.MakeMovingTrigger()` handles this — use it for any new streamed prefab.

7. **Supabase config is a ScriptableObject**, not StreamingAssets. `SupabaseConfig.Load()`
   does `Resources.Load<SupabaseConfig>("SupabaseConfig")`. WebGL needs synchronous
   config; StreamingAssets requires an async fetch there.

8. **JsonUtility limitations** (Unity core JSON):
   - **No bare JSON arrays at root.** Supabase returns `[...]`; wrap as `{"items":[...]}`
     and deserialize into a wrapper class. Pattern lives in `ScoreAPI.ParseArray`.
   - **No open generic types** — concrete wrapper classes only.
   - **Field names must match JSON keys exactly.** snake_case for Postgres columns
     (`public string display_name;`). Looks wrong, but it is the only JsonUtility-compatible
     option short of pulling in Newtonsoft.

9. **Cross-scene results are statics.** `GameSession.LastScore` / `LastCoins` /
   `LastMeters` / `LastPills` / `LastDurationSeconds` are set by `EndGame()` before the
   scene unloads; `GameOverScreen` reads them in `OnEnable`. Do not reach into the
   destroyed `GameSession` instance.

10. **The leaderboard is adversarial.** The client computes and POSTs its own score, and
    both the anon key and the player's JWT are visible in the browser. RLS only checks
    *who* writes, never *what*. `supabase/migrations/0002_score_integrity.sql` adds
    plausibility bounds, a rate limit, and a trigger that overwrites client-supplied
    username/display_name from the authenticated profile.
    **The bounds are derived from gameplay constants** (`PointsPerMetre`, `maxMultiplier`,
    pill value, `maxSpeed × boostMultiplier`). Retune any of those and you must retune the
    SQL or honest scores start bouncing.

## Folder discipline

- `RawAssets/` — downloaded ZIPs. Stays **outside** `unity-project/Assets/`. Gitignored.
- `tools/compile-check/` — the no-Unity type-check harness. Outside `unity-project/` so
  Unity never imports it.
- Asset targets inside Unity:
  - Quaternius meshes → `Assets/Models/Quaternius/<PackName>/`
  - Kenney meshes → `Assets/Models/Kenney/<PackName>/`
  - Kenney audio → `Assets/Audio/<UI|Impacts|Jingles>/`
  - Kenney UI sprites → `Assets/UI/KenneyUI/`
  - Mixamo → `Assets/Models/Mixamo/` + `Assets/Animations/Mixamo/`

## User-confirmed choices

- Unity **6 LTS**; Hub's forward upgrade within `6000.0.x` is safe.
- **Public web game**, self-registration, no event gate code.
- Auth: username + password + display name. Username maps to a synthetic email
  `<username>@gdg-go.local` so Supabase's email/password provider works without
  collecting real emails.
- Coins: 4 Google brand colours (red `#EA4335`, blue `#4285F4`, yellow `#FBBC05`,
  green `#34A853`) at 1 pt each, plus the rare GDG pill at 25 pts using
  `Branding/gdg pill.png`.

## Build-size budget

WebGL ≤ 25 MB brotli. `Assets/` is ~91 MB on disk but Unity only ships what a scene in
Build Settings references, so that number is not the build size. If the build report
exceeds budget, strip unused FBX from imported packs before touching anything else.

## Setup — one click

Open the project, wait for the import to finish, then **GDG Go → Run Full Project Setup**.
It runs, in dependency order: tags → SupabaseConfig → 5 scenes → coin materials → WebGL
settings → **Quaternius axis bake → UI sprite import → Kenney font asset → delete stale
Quaternius prefabs** → all prefabs → Game scene → UI scenes. Every step is idempotent, so
it is safe to re-run.

The three import steps must come **before** `PrefabsBuilder`: prefabs bake in the mesh
orientation, and UI `Image`s resolve their sprite once. Fixing either afterwards leaves
already-built assets wrong (see facts 3a and 3b).

Then paste the Supabase URL + anon key into `Assets/Resources/SupabaseConfig.asset` and
apply both SQL migrations in the Supabase SQL editor.

## Tests

No automated tests. `tools/compile-check` is the only mechanical gate. Gameplay tuning
(tile seams, mesh orientation, scale) can only be checked by pressing Play — the values
most likely to need adjustment are listed in README under "Tuning".

## Repo hygiene

- Repo root `/Users/karangarg/Desktop/gdg-go`; Unity project in `unity-project/`.
- `RawAssets/`, `web-hosting/Build/` are gitignored — huge / regenerated.
- Don't commit `Library/`, `Temp/`, `obj/`, `Builds/`.
