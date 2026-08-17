# Plan — Pedestrians, Sky-in-view, Warm colour palette, Real power-up assets

Four independent fixes the user asked for in one turn:

1. **More pedestrians actually walking** — sidewalk density up + both sides per slot
2. **Sky bleeding into FOV** — lower camera + raise pitch (chosen lever)
3. **Whitish colours** — saturated warm world palette / ambient / skybox push
4. **Power-ups & fuel are "ass"** — replace the 5 proc-gen meshes + fuel can with
   real Quaternius RPG assets already downloaded in `RawAssets/`

All four ship together in one rebuild cycle (`GDG Go > 2b. Rebuild Quaternius Prefabs`
then `Run Full Project Setup`). Nothing here touches tuning knobs that the SQL score
integrity bounds derive from (`PointsPerMetre`, `maxMultiplier`, pill value,
`maxSpeed × boostMultiplier`) so the leaderboard stays valid.

---

## Verification gate

Stop and inspect when each of these is true. None of these claim "fixed" without
running them in-editor.

- `export PATH="$HOME/.dotnet:$HOME/.dotnet/tools:$PATH" && dotnet build
  tools/compile-check/GDGGo.CompileCheck.csproj` → 0 errors / 0 warnings.
- `mcpforunity://editor/state` shows `data.advice.ready_for_tools == true` after
  rebuild.
- Inditor reflection (via `unityMCP_execute_code`) confirms:
  - `PedestrianSpawner.intervalMeters` matches the lower tuned value.
  - `CameraRig.offset.y` and `pitchDegrees` match the tuned camera values.
  - `Assets/Materials/World/*.mat` colours match the new palette via
    `MaterialLibrary.GetColor` on each.
  - The 5 PowerUp prefabs + fuel prefab reference real RPG-pack FBX meshes
    (not the `_*_Meshes.asset` generated files).
- `gdg-go > 6. Play` enters Play mode without console errors; in Play, the
  spawners visibly emit pedestrians on both sides, the sky is a small strip at
  the top of frame (not a vast expanse), buildings read warm, and the first
  power-up spawned is the RPG Star / Arrow / Armor / etc., not a flat slab.
- Capture a screenshot at `Assets/Screenshots/city_warmup_preview.png` *and*
  ask the user to describe it (the assistant has no image input).

---

## Concrete values

### 1. Pedestrian density (SceneBuilder.BuildPedestrians)

Current: `intervalMeters = 18f`, one side per slot (50/50 in
`PedestrianSpawner.SpawnAt`).

Change **both** levers:

- `intervalMeters: 18 → 12` (50% denser sched
- `PedestrianSpawner.SpawnAt`: spawn on **both sides every slot**, each side
  independently 50/50 facing. Currently it picks one side per call; change it
  to a loop over `{ -1, +1 }` and emit two pedestrians per scheduled slot.
- This is parameterised by a new field `bool spawnBothSides = true` so a
  future tuning pass can drop it back to one side without re-edit from me.
  Default ON so the new behaviour is what ships.

Keep `startTrackDistance = 60` — they should appear already walking when the
run starts. Keep `pavementOffset = 5.25` and `pavementJitter = 0.35` — those
were tuned to keep feet on the slab, not in the road.

Excluded (out of scope this turn): adding new character variants. We have
eight pedestrian models already built. Density, not variety, is the ask.

### 2. Camera (CameraRig default fields)

Current: `offset.y = 5.2f`, `pitchDegrees = 12f`, `baseFieldOfView = 62f`.

Change only the two the user picked:

- `offset.y: 5.2 → 4.3`  (lower the camera by 0.9 u — still above the car
  roofline at y≈0.55 wing mirror, so the bonnet is in frame, not the roof)
- `pitchDegrees: 12 → 18` (down-tilt 6° more so the road eats the bottom
  third of frame rather than a vanishing point mid-screen)

Leave `baseFieldOfView = 62`. Narrowing FOV kills the speed-rush feel (the
chosen option was explicit about that), so don't.

These are public fields on a scene-placed `CameraRig` component on `Main
Camera`. Editing the defaults in code only applies to fresh scenes; to push
onto the *existing* `Game.unity`, `SceneBuilder.BuildCamera` needs to write
these into the component explicitly (it already sets offsets when wiring —
read 600-700 of SceneBuilder to confirm the pattern, match it).

### 3. Warm saturated palette (MaterialLibrary + SceneBuilder ambient + skybx)

Three coordinated changes. The "whitish" is over-bright ambient + grey
materials + a cool blue sky tint all multiplying. Punch through all three.

a. **MaterialLibrary palette** (lines 175–206):

| material   | current RGB                | new RGB                | why |
|------------|----------------------------|------------------------|-----|
| Asphalt    | (0.075, 0.078, 0.088)     | (0.068, 0.062, 0.054)  | warm tar, less blue cast |
| Pavement   | (0.58, 0.57, 0.55)        | (0.62, 0.585, 0.535)   | warm sun-baked concrete, not grey |
| Foliage    | (0.24, 0.52, 0.26)         | (0.29, 0.55, 0.20)     | richer green, slightly yellow shift |
| Grass      | (0.31, 0.47, 0.24)        | (0.36, 0.52, 0.22)     | match the warmer foliage drift |
| RoadLine   | (0.97, 0.96, 0.92)        | (unchanged)            | paint markings stay near-white |

Sync the paired constants in `RestampWorldPalette` (lines 200-205) so re-
running "push palette" undoes any hand-tuning with the same colours.

b. **Building exterior materials.** There aren't any in `MaterialLibrary`
yet — all Quaternius buildings are painted by their own slot names
through `MaterialLibrary.AssignNamedPalette`. We currently map building
slots to a small palette inside `BuildSceneryBatch`; introduce three warm
tints (+ one darker "north face") so a row of buildings isn't a row of
identical-colour walls. Add `MaterialLibrary.BuildingWarm`,
`BuildingMid`, `BuildingCool`, `BuildingTrim`, `BuildingGlass` and map
scenery slot names to them.

c. **Ambient (SceneBuilder lines 118-122).** Warm trilight currently:

```
ambientSky     (0.52, 0.60, 0.72)   ->  (0.76, 0.70, 0.56)   warm gold sky bounce
ambientEquator (0.40, 0.41, 0.44)   ->  (0.52, 0.46, 0.36)   warm equator fill
ambientGround  (0.22, 0.20, 0.18)   ->  (0.20, 0.16, 0.13)   warm occlusion
ambientIntensity 1f                ->  0.92f                slight over-brightness cut
```

d. **Skybox.** `ProjectSetup.EnsureSkyboxMaterial` builds the skybox from
`Assets/Textures/Sky/skybox-day.png` with `Skybox/Panoramic`. The PNG is
fixed art; nothing to retune there. But confirm in-editor that the skybox
still renders after the ambient push — if the warm sky bounce now fights
the PNG, we drop `ambientIntensity` further, not repaint the skybox.

Buildings should now read warm-toned; the road stays dark and the lane
markings pop; the sky occupies less of the frame (fixed by the camera
+ pitch in §2 anyway).

### 4. Power-ups + fuel → real Quaternius RPG assets

The Quaternius RPG Items Pack zip is already in `RawAssets/`. It has real
FBX meshes with PNG icon textures. Mapping per power-up type:

| PowerUpType    | proc-gen mesh (current) | new RPG asset   | literal reason      |
|----------------|--------------------------|------------------|--------------------|
| CoinMagnet     | horseshoe bars          | `Heart.fbx`     | heart = pulls toward you, recognisable at speed |
| TwoX           | two crossed bars         | `Star.fbx`      | star = "bonus", golden = reward |
| Shield         | hexagon disc             | `Armor_Metal.fbx` | chest plate, reads "protection" |
| Nitro          | lightning-bolt polygon   | `Arrow_Golden.fbx` | arrow = forward/speed, golden = high value |
| PoliceFreeze   | snowflake (3 slabs)      | `Snowflake3.fbx`| literal snowflake |

Fuel: switch the `CoinType.Fuel` prefab from whatever coin reuse it's on
to `Potion6_Filled.fbx` (a filled potion bottle — read as a fuel canister,
not another coin, which is the exact concern CLAUDE.md §Fuel calls out:
"reads as another coin defeats the mechanic"). The existing orange
`#FF6B0D` fuel material stays (it's deliberately outside the Google
palette).

**Import step (editor batch, idempotent).** Extend the `ResetRPG` portion
of `ModelAxisFixer` or add a new `RPGPowerUpFixer` that imports the 6
FBXes into `Assets/Models/Quaternius/PowerUps/`, similar to how the
AnimatedMen packs are at `Assets/Models/Quaternius/AnimatedMen/`. Apply
`globalScale = 100`, `useFileScale = false`, no bake. PNG icons aren't
needed — FBX carry no UVs/textures, which is the same shape as every
other Quaternius mesh in this project. We'll *colour them via their
existing material slots* using `MaterialLibrary.AssignNamedPalette`,
matching the conventions in CLAUDE.md §3c.

**Prefab step.** Replace the bodies of `BuildMagnetMesh / Build TwoMesh /
BuildShieldMesh / BuildNitroMesh / BuildFreezeMesh` in `PrefabsBuilder.cs`
with a single `BuildPowerUpFromRpg` that:

- loads `<mesh>.fbx` as a prefab,
- fixes axis (Quaternius RPG is Z-up at file scale ~1cm; reuse
  `QuaterniusUprightRotation` + `globalScale=100`),
- reads `Renderer.bounds` on an **instantiated** copy (never trust raw
  vertex arrays; CLAUDE.md §3z),
- computes scale for target size 1.7u tall (matches the
  `PowerUp` `1.7` in the table at PrefabsBuilder.cs:468),
- assigns `MaterialLibrary`-defined colours keyed **by material slot name**
  in the FBX (fall back to the existing `PowerUpType` tint colour if the
  slot name doesn't resolve),
- keeps the existing `MeshCollider`/`Rigidbody` + `PowerUpEffect`
  component + tag wiring unchanged.

`BuildPowerUps` continues to emit 5 prefabs named the same way
(`PowerUp_Magnet` etc.) so `SceneBuilder.BuildPowerUps` and
`PowerUpSpawner` need **zero** changes — prefab paths are stable.

**Fuel prefab.** The fuel pickup lives in `CoinSpawner` via the `Fuel`
coin type. `BuildPowerUp` already had a separate path for fuel when it
existed; route the new `Potion6_Filled`-based prefab through the same
slot, keeping the existing orange material assignment in place.

**Delete the generated mesh assets.** Each `PowerUp_*_Meshes.asset` gets
dropped when its `Build*Mesh` proc-gen function is removed; the new FBX
flow doesn't write proc-gen meshes, so no sibling `.asset` is created.
`DeleteQuaterniusDerivedPrefabs` should also delete any stale
`_*_Meshes.asset` siblings of `PowerUp_*` — verify it already does
(per CLAUDE.md it does for `_Meshes.asset` siblings generally).

---

## Implementation order (one rebuild at the end, not per edit)

1. MaterialLibrary.cs — new palette + 5 building exterior materials
2. SceneBuilder.cs — pedestrian density (BuildPedestrians) + ambient colours
3. SceneBuilder.cs — push the new CameraRig offset.y + pitchDegrees into
   the existing Game scene's Main Camera component (not just the code
   default, since the scene is already saved).
4. PrefabsBuilder.cs — replace proc-gen power-up mesh builders with
   `BuildPowerUpFromRpg`; add RPG fuel prefab builder.
5. PrefabsBuilder.cs — import step extension (or new `RPGPowerUpFixer`) to
   pull the 6 FBXes into `Assets/Models/Quaternius/PowerUps/`.
6. Run `dotnet build tools/compile-check/GDGGo.CompileCheck.csproj` → must
   be 0/0.
7. In Unity: run `GDG Go > 2b. Rebuild Quaternius Prefabs` (this also
   deletes the now-stale generated `_*_Meshes.asset` siblings).
8. In Unity: run `GDG Go > Run Full Project Setup` so SceneBuilder rewrites
   the camera, pedestrian, ambient, and power-up wiring onto `Game.unity`.
9. Verification gate from the top of this plan.
10. Screenshot to `Assets/Screenshots/city_warmup_preview.png`, ask user
    to describe.

---

## Risk register

- **RPG meshes ship no textures** (verified — the zip only has FBX +
  Icons + Blends, no PNG tied to meshes). Same situation as every other
  Quaternius mesh here. Their `material slots` carry names we map to
  the palette. First import, run
  `manage_asset action=get_info` on one of them to read the slot names,
  then build the `AssignNamedPalette` dictionary from real slots —
  never guess (CLAUDE.md §3c). If a slot name doesn't match a known
  palette entry, material falls back to the `PowerUpType.TintFor` hue
  we already use.
- **Fuel prefab is special-cased.** `CoinPickup.Collect` short-
  circuits for `CoinType.Fuel` before scoring. The mesh swap doesn't
  touch that path — it only swaps the visual prefab. Verify by reading
  `CoinPickup.Collect` once before the swap; if it keys on prefab
  identity (it shouldn't — it keys on the enum field), adjust.
- **Camera field defaults vs the saved scene.** SceneBuilder is run at
  setup time and serialises its writes into `Game.unity`. If
  SceneBuilder.BuildCamera already sets `offset` and `pitchDegrees`
  on the component (it sets `clearFlags` and the like), matching that
  pattern is safe. If it only sets them as code defaults, the saved
  scene won't update. Read `SceneBuilder.BuildCamera` (lines ~75-85)
  before editing to confirm which pattern is in use.
- **Colour push vs build budget.** All five new building materials are
  flat colour (no textures). They add near-zero bytes to the brotli
  budget. The RPG FBX meshes are 12-47KB each raw, much smaller after
  compression. No build-budget concern.
- **Compile-check stubs.** Using a new Unity API here? No — all the calls
  are `AssetDatabase`, `PrefabUtility`, `MeshRenderer.bounds`,
  `MaterialLibrary` (project code). Stubs already cover these. If
  `ensureAssetImporter` is new, check it's in `UnityEditorStubs.cs`.
