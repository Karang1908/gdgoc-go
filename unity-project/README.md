# Unity 6 LTS project — open with Unity Hub

This folder is a Unity 6 LTS project scaffold. It does not contain scenes or
prefabs yet — those will be created once you open the project in Unity for the
first time and let Unity generate Library/ and metadata.

## How to open

1. Install **Unity 6 LTS** (`6000.0.x`) via Unity Hub.
   - During install, tick **WebGL Build Support**.
2. In Unity Hub: **Open → Add project from disk** → select this `unity-project/` folder.
3. If Unity Hub detects a slightly different patch version (e.g. `6000.0.40f1` vs the
   `6000.0.1f1` pinned in `ProjectSettings/ProjectVersion.txt`), it will show a warning.
   Click **Select version → upgrade / open with installed version**. Project upgrade is
   forward-only within the 6000.0.x line and is safe.
4. On first open, Unity imports all packages listed in `Packages/manifest.json` (URP,
   Input System, TextMeshPro). This takes ~2–3 min.
5. Pay attention to the Console window — there will be compiler errors until the
   scenes described below exist. The scripts are scaffolds; see "Next" below.

## Why no scenes / prefabs yet

Unity scene files (`.unity`) and prefab files (`.prefab`) are YAML that references
meshes, materials and other assets by **GUID**. Those GUIDs don't exist until the
packs are imported (see `../RawAssets/`) and Unity generates `.meta` files for each.
Scaffolding empty scene YAML by hand produces broken scenes the moment Unity opens
them.

Instead, do the following in order, in Unity Editor:
1. Open this project (above).
2. Let me import the packs from `../RawAssets/` into `Assets/Models/`, `Assets/Audio/`,
   `Assets/UI/` (separate step — different turn).
3. Once meshes + textures exist with their `.meta` GUIDs, I create the Boot / Menu /
   Game / GameOver scenes and the prefab wiring that references them.

## Config: Supabase

The file `Assets/StreamingAssets/supabase-config.json` has placeholder values.
Before hosting the build publicly, fill in your Supabase project URL and **anon public key** (both public, safe to ship — Supabase RLS is what enforces security).

## What's implemented vs stubbed

- **Real, working (will compile + run end-to-end):**
  - `Assets/Scripts/Supabase/` — REST wrappers around `UnityWebRequest` for sign-up,
    sign-in, sign-out, score insert, leaderboard fetch. Use as-is. Tested types via
    `JsonUtility` DTOs (no external deps).
- **Stubs (compile, but only logs to console):**
  - All gameplay scripts under `Assets/Scripts/Gameplay/`, `Traffic/`, `Obstacles/`,
    `Police/`, `Coins/`, `PowerUps/`, `Pedestrians/`.
  - All UI screens under `Assets/Scripts/UI/`.
  - `AudioManager` under `Assets/Scripts/Audio/`.
  - `GameManager` under `Assets/Scripts/Core/`.

Each stub marks the integration points with `// TODO:` comments where
pack-imported assets plug in. Treat every script as a contract: methods are named,
signatures are fixed, no logic yet.

## Folder map

```
Assets/
├── Scripts/      ← all C# (real + stubs)
├── StreamingAssets/  ← supabase-config.json
├── Models/       ← pack mesh imports (Quaternius, Kenney, Mixamo)
├── Animations/   ← Mixamo FBX clips
├── Materials/    ← created in-editor
├── Prefabs/      ← created in-editor
├── Textures/     ← skybox + coin textures
├── Audio/        ← Kenney SFX / jingles
├── UI/           ← Kenney UI sprites + GDG branding
├── Plugins/WebGL/  ← reserved (no JS bridge needed with Supabase)
└── Scenes/       ← created next pass
```
