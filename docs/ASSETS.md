# ASSETS.md — GDG Go asset shopping list

Exact list of assets to download and hand over. Each entry has:

- **Source URL** (verified live on Quaternius / Kenney homepages 2026-08-16; Mixamo is a workflow)
- **What we use** and **where it goes** in the Unity project
- **License** (all CC0 or free-event-grade)
- **Priority**: 🔴 Must-have for MVP · 🟡 Nice-to-have for stretch

> **Hard rule (PROJECT.md §3):** every visual + audio element in the shipped build
> must come from a downloaded pack — **no Unity primitive placeholders**. The *only*
> original art is the **coins** (5 variants on a pack-sourced coin mesh), and even
> those use a pack coin mesh + 4 solid-color emissive materials + the supplied
> `Branding/gdg pill.png` texture.

---

## 0. Already provided (do not source again)

| File                          | Used for                                       | Where it goes                              |
| ----------------------------- | ---------------------------------------------- | ------------------------------------------ |
| `Branding/GDG LOGO.png`       | Boot splash, menu backdrop, favicon            | `Assets/UI/GDG/`                           |
| `Branding/gdg pill.png`       | Albedo texture on the rare **GDG Pill** coin   | `Assets/Textures/Coins/gdg_pill_coin.png` |

> I will pad/crop `gdg pill.png` to a clean square (512×512, transparent background)
> during the scaffolding pass. No action needed from you.

---

## 1. Quaternius — https://quaternius.com/  (CC0, no attribution required)

Verified live on the Quaternius homepage 2026-08-16. Click URL → scroll to
**Download** → grab the ZIP → unzip under `Assets/Models/Quaternius/<PackName>/`.

### 🔴 Cars Pack
- **URL:** https://quaternius.com/packs/cars.html
- **Tags:** *transport vehicles cars police taxi traffic sports*
- **Use:** **Player car** + **police car** (chaser) + 2–3 civilian traffic cars.
- **Where:** `Assets/Models/Quaternius/Cars/`

### 🔴 Public Transport Pack
- **URL:** https://quaternius.com/packs/publictransport.html
- **Tags:** *publictransport vehicles cars bus ambulance taxi bike bicycle traffic*
- **Use:** **Buses** (long lane-blockers, the SS "train" analog), **taxis**,
  **ambulances** for moving-traffic variety.
- **Where:** `Assets/Models/Quaternius/PublicTransport/`

### 🔴 Downtown City MegaKit
- **URL:** https://quaternius.com/packs/downtowncitymegakit.html
- **Tags:** *modular city urban street downtown building facade sidewalk*
- **Use:** Modular **road pieces** (straight, intersection), sidewalk tiles, building
  facades as scenery. **This is the road system.**
- **Where:** `Assets/Models/Quaternius/DowntownCity/`

### 🔴 Modular Streets Pack
- **URL:** https://quaternius.com/packs/modularstreets.html
- **Tags:** *modular streets ramps bridges signs lights*
- **Use:** **Ramps** (for the jump mechanic), **tunnels / bridges**, **overhead
  signs**, **traffic lights**, **guardrails**, **barriers**. Core level geometry.
- **Where:** `Assets/Models/Quaternius/ModularStreets/`

### 🔴 Animated Men Pack + 🔴 Animated Women Pack
- **URLs:**
  - https://quaternius.com/packs/animatedmen.html
  - https://quaternius.com/packs/animatedwomen.html
- **Use:** 3–4 rigged humanoid meshes that we skin to Mixamo Walk/Idle clips for
  **pedestrian NPCs** (the crosswalk humans the player must avoid).
- **Where:**
  - `Assets/Models/Quaternius/AnimatedMen/`
  - `Assets/Models/Quaternius/AnimatedWomen/`

### 🔴 Ultimate RPG Pack
- **URL:** https://quaternius.com/packs/ultimaterpg.html
- **Tags:** *rpg medieval coins stars keys*
- **Use:** The **coin mesh** for all 5 coin variants. We do not make original coin
  geometry; we only make 4 solid-color emissive materials + 1 GDG-pill material.
- **Where:** `Assets/Models/Quaternius/RPG/`

### 🟡 Simple Nature Pack
- **URL:** https://quaternius.com/packs/simplenature.html
- **Use:** Roadside trees / bushes. Skip if build size is tight.
- **Where:** `Assets/Models/Quaternius/SimpleNature/`

---

## 2. Kenney — https://kenney.nl/  (CC0)

URLs below are direct asset pages, verified reachable 2026-08-16.

### 🔴 Car Kit  *(3D)*
- **URL:** https://kenney.nl/assets/car-kit
- **Tag:** *transport*
- **Use:** **Trucks** + backup cars. Truck meshes block lanes (the SS "long train"
  feel). If Quaternius cars cover car variety, this pack is mainly for truck variety.
- **Where:** `Assets/Models/Kenney/CarKit/`

### 🔴 City Kit (Commercial)  *(3D)*
- **URL:** https://kenney.nl/assets/city-kit-commercial
- **Tag:** *city*
- **Use:** Background low-detail buildings past the sidewalk (the distant skyline).
- **Where:** `Assets/Models/Kenney/CityKitCommercial/`

### 🔴 Skyboxes  *(Textures)*
- **URL:** https://kenney.nl/assets/skyboxes
- **Use:** One clear-day skybox for the road scene. Pick the lightest file.
- **Where:** `Assets/Textures/Sky/`

### 🔴 UI Pack - Sci-Fi  *(2D)*
- **URL:** https://kenney.nl/assets/ui-pack-sci-fi
- **Tag:** *UI Pack / interface*
- **Use:** All menu + HUD chrome: buttons, panels, bars (Heat bar, score backdrop),
  power-up icons. Clean techy feel suits a Google event.
- **Where:** `Assets/UI/KenneyUI/`

### 🔴 UI Audio  *(Audio)*
- **URL:** https://kenney.nl/assets/ui-audio
- **Use:** Button click / hover sounds on menus and login.
- **Where:** `Assets/Audio/UI/`

### 🔴 Impact Sounds  *(Audio)*
- **URL:** https://kenney.nl/assets/impact-sounds
- **Use:** Crash SFX (obstacle collision, traffic bump, pedestrian nudge).
- **Where:** `Assets/Audio/Impacts/`

### 🟡 Music Jingles  *(Audio)*
- **URL:** https://kenney.nl/assets/music-jingles
- **Use:** Short stingers — coin pickup, police siren, login success, game over.
- **Where:** `Assets/Audio/Jingles/`

### 🟡 Mobile Controls  *(2D)*
- **URL:** https://kenney.nl/assets/mobile-controls
- **Use:** Touch-control hint sprites if we wire on-screen swipe buttons for mobile.
- **Where:** `Assets/UI/MobileControls/`

### 🟡 Input Prompts  *(2D)*
- **URL:** https://kenney.nl/assets/input-prompts
- **Use:** Keyboard / swipe onboarding arrows shown on first play.
- **Where:** `Assets/UI/InputPrompts/`

### 🟡 City Kit (Industrial)  *(3D)*
- **URL:** https://kenney.nl/assets/city-kit-industrial
- **Use:** Optional distant-scenery variety; skip if build size is tight.
- **Where:** `Assets/Models/Kenney/CityKitIndustrial/`

---

## 3. Mixamo — https://www.mixamo.com/  (free with an Adobe ID)

Mixamo requires a free Adobe login and has no direct deep-links to "download this
clip"; it's a workflow.

### What we need (pedestrian NPCs only — the player is a car)

| Asset                       | Find by (search bar)        | Download as                                  | Where                                       |
| --------------------------- | --------------------------- | -------------------------------------------- | ------------------------------------------- |
| **1 human character mesh**   | "X Bot" or "Remy"           | FBX for Unity, **with skin** (once)           | `Assets/Models/Mixamo/<Character>/`         |
| **Walk** animation          | "Walk"                      | FBX, **Without Skin**                         | `Assets/Animations/Mixamo/Walk.fbx`         |
| **Idle** animation          | "Idle" / "Standing Idle"    | FBX, Without Skin                            | `Assets/Animations/Mixamo/Idle.fbx`         |

### Stretch clips (skip for MVP)

| Asset                | Find by                | Where                                |
| -------------------- | ---------------------- | ------------------------------------ |
| Run                  | "Run"                  | `Assets/Animations/Mixamo/Run.fbx`   |
| Knockdown / Death    | "Knockdown" or "Death From Right" | `Assets/Animations/Mixamo/Death.fbx` |

### Importing
1. Import the **character** FBX first. Inspector → **Rig → Animation Type = Humanoid** → Apply.
2. Import **Walk**. Inspector → **Animations** tab → tick **Loop Time** → Apply. Repeat for Idle (and Run/Death if used).
3. On the NPC prefab, add an **Animator** with a state machine: `Idle ↔ Walk`,
   driven by a `speed` float parameter set from C# movement.
4. **One** shared Mixamo rig + Walk + Idle covers MVP pedestrian behavior.

> The Quaternius Animated Men/Women meshes are Humanoid-compatible: retarget
> Mixamo clips onto them in the Animator window. Verify T-pose alignment before
> importing more than 2 NPC meshes.

---

## 4. Build-size rules for Unity WebGL

| Asset type              | Setting                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| Textures (UI / coin)    | Max **512×512**; no mipmaps for UI sprites; **ASTC 6×6** for in-world textures. |
| Models (cars / city)    | Mesh compression **On**; Humanoid rigs only where needed.                        |
| Audio (SFX)             | **Vorbis** 70% quality, **mono**, load-on-load.                                  |
| Audio (jingles)          | Force To Mono **On**, Preload Audio Data **Off**, Load In Background **On**.     |
| Skybox                  | Single-texture skybox (Kenney) rather than 6-face if memory bound.               |
| Animations              | Keyframe reduction **On**; **sample at 30 Hz**.                                  |
| Trains / buses (long meshes) | 1 shared mesh, multiple materials; never duplicate.                         |

After the first build, read the **Console build report**. Target initial download
**≤ 25 MB** brotli-compressed.

---

## 5. Licenses

| Source     | License                                  | Attribution required? |
| ---------- | ---------------------------------------- | --------------------- |
| Quaternius | CC0 (public domain)                      | No                    |
| Kenney     | CC0 (public domain)                      | No                    |
| Mixamo     | Adobe free-tier license for use in your app | No (Adobe account required on download) |
| Branding   | Your GDG images (provided)               | N/A                   |

A courtesy credit line ("Assets by Quaternius, Kenney, Mixamo") in the menu footer
is recommended for an event context and costs nothing. I'll add it during scaffolding.

---

## 6. Checklist (hand back to me when done)

Drop all ZIPs (or extracted folders) into `gdg-go/assets-mailbox/` and tell me —
I'll sort and import them. Tick each as you go:

- [ ] Quaternius — **Cars Pack** (ZIP)
- [ ] Quaternius — **Public Transport Pack** (ZIP)
- [ ] Quaternius — **Downtown City MegaKit** (ZIP)
- [ ] Quaternius — **Modular Streets Pack** (ZIP)
- [ ] Quaternius — **Animated Men Pack** (ZIP)
- [ ] Quaternius — **Animated Women Pack** (ZIP)
- [ ] Quaternius — **Ultimate RPG Pack** (ZIP) *(for the coin mesh)*
- [ ] Kenney — **Car Kit** (ZIP)
- [ ] Kenney — **City Kit (Commercial)** (ZIP)
- [ ] Kenney — **Skyboxes** (ZIP)
- [ ] Kenney — **UI Pack - Sci-Fi** (ZIP)
- [ ] Kenney — **UI Audio** (ZIP)
- [ ] Kenney — **Impact Sounds** (ZIP)
- [ ] Kenney — **Music Jingles** (ZIP)
- [ ] Kenney — **Mobile Controls** (ZIP)
- [ ] Kenney — **Input Prompts** (ZIP)
- [ ] Mixamo — Character FBX ("X Bot" or "Remy", **with skin**)
- [ ] Mixamo — **Walk.fbx** (without skin)
- [ ] Mixamo — **Idle.fbx** (without skin)
- [ ] ✅ Already provided: `Branding/gdg pill.png`, `Branding/GDG LOGO.png`

I can start scaffolding the Unity project as soon as the 🔴 items are ticked.
The 🟡 items can arrive on a later turn without blocking MVP.
