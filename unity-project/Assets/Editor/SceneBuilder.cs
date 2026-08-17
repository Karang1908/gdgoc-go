using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using TMPro;

namespace GDGGo.EditorTools
{
    /// <summary>
    /// Builds Game.unity end to end: camera rig, lighting, the session objects, the
    /// player and police, all six streaming spawners, and the HUD.
    ///
    /// Destructive by design — it wipes the scene's roots and rebuilds. That is what
    /// makes it safe to re-run after changing a prefab, and it is why nothing in the
    /// Game scene should be hand-edited and expected to survive.
    /// </summary>
    public static class SceneBuilder
    {
        private const string GameScenePath = "Assets/Scenes/Game.unity";
        private const string Prefabs = "Assets/Prefabs";

        [MenuItem("GDG Go/3. Build Game Scene", priority = 20)]
        public static void BuildGameScene()
        {
            if (!File.Exists(GameScenePath))
            {
                Debug.LogError("[SceneBuilder] Assets/Scenes/Game.unity missing — run \"GDG Go > 1. Project Setup\" first.");
                return;
            }

            Scene scene = EditorSceneManager.OpenScene(GameScenePath, OpenSceneMode.Single);

            // Clear everything; we own this scene completely.
            foreach (GameObject root in scene.GetRootGameObjects())
                Object.DestroyImmediate(root);

            GameObject player = BuildPlayer();
            if (player == null)
            {
                Debug.LogError("[SceneBuilder] PlayerCar.prefab missing — run \"GDG Go > 2. Build All Prefabs\" first.");
                EditorSceneManager.SaveScene(scene);
                return;
            }

            BuildCamera(player);
            BuildLighting();
            AssignSkybox();
            BuildSessionObjects();
            BuildPolice();
            BuildSpawners();
            BuildHUD();

            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);

            Debug.Log("[SceneBuilder] Game scene built. Open it and press Play.");
        }

        // ==================================================================
        // Scene pieces
        // ==================================================================

        private static GameObject BuildPlayer()
        {
            var prefab = Load<GameObject>($"{Prefabs}/PlayerCar.prefab");
            if (prefab == null) return null;

            var player = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
            player.transform.position = Vector3.zero;
            return player;
        }

        private static void BuildCamera(GameObject player)
        {
            var go = new GameObject("Main Camera");
            go.tag = "MainCamera";   // built-in tag; always registered

            var camera = go.AddComponent<Camera>();
            camera.clearFlags = CameraClearFlags.Skybox;
            camera.nearClipPlane = 0.3f;
            // Far plane kept tight: nothing is streamed beyond ~200 units, and a shorter
            // range meaningfully helps WebGL fill rate.
            camera.farClipPlane = 320f;
            camera.fieldOfView = 62f;

            go.AddComponent<AudioListener>();

            var rig = go.AddComponent<Gameplay.CameraRig>();
            rig.target = player.transform;

            // Subway-Surfers framing, retuned so the horizon reads lower in frame.
            //
            // The previous (0, 7.4, -11.5) at 18 degrees lifted the camera high enough
            // that the sky dominated the top two-thirds of the view and the run read as
            // "floating above the city" rather than driving through it. Dropping to 4.8
            // and pitching to 26 keeps all three lanes readable while raising the
            // horizon line so the skyline — not the sky — fills the upper half of frame.
            rig.offset = new Vector3(0f, 4.8f, -10.5f);
            rig.pitchDegrees = 26f;
        }

        private static void BuildLighting()
        {
            var go = new GameObject("Directional Light");
            go.transform.rotation = Quaternion.Euler(48f, -28f, 0f);

            var light = go.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.15f;
            light.color = new Color(1f, 0.97f, 0.91f);
            light.shadows = LightShadows.Soft;

            // Shadow resolution boosted to 2048 (was project default, ~512 in WebGL Tier).
            // At ~512 the road's sun-shadow edge shimmers as the camera scrolls, which
            // reads as a low-quality WebGL demo rather than a polished game. The bias
            // values keep the boosted shadow from acne-ing on the flat asphalt plane,
            // which is the one surface that fights any shadow bias problem.
            light.shadowCustomResolution = 2048;
            light.shadowBias = 0.0005f;
            light.shadowNormalBias = 0.02f;
            light.shadowNearPlane = 0.5f;

            // Anti-aliasing at 4x. WebGL Tier 2 in Built-in defaults to disabled, which
            // leaves every tilted roofline and kerb shimmering at the pixel boundary
            // — a single nasty cue in a fast-moving game. 4x MSAA is free on the WebGL
            // pipeline (rendered into an MSAA frame buffer) and removes the shimmer
            // entirely. Anisotropic-on globally makes the road texture hold up at
            // glancing angles; softVegetation was never the bottleneck it warns about.
            QualitySettings.antiAliasing = 4;
            QualitySettings.anisotropicFiltering = UnityEngine.AnisotropicFiltering.Enable;
            QualitySettings.softVegetation = true;

            // Ambient: a flat single colour makes every unlit face the same shade and
            // reads as cardboard. A sky/ground gradient gives roofs a cool cast and
            // undersides a warm bounce for free — no extra lights, no cost on WebGL.
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(0.76f, 0.70f, 0.56f);
            RenderSettings.ambientEquatorColor = new Color(0.52f, 0.46f, 0.36f);
            RenderSettings.ambientGroundColor = new Color(0.20f, 0.16f, 0.13f);
            RenderSettings.ambientIntensity = 0.92f;

            // Fog hides the streaming boundary — without it, buildings pop into existence
            // at the spawn distance against bare ground.
            //
            // It starts late (200) on purpose. The road is a near-horizontal surface
            // running straight away from the camera, so it crosses the whole fog ramp
            // within the visible frame and washes out from about the third tile onward.
            // At 110 that turned near-black asphalt into pale grey and made the kerbs look
            // darker than the road. Starting at 200 keeps the driving surface reading as
            // asphalt while still dissolving the horizon before the 320-unit far plane.
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogColor = new Color(0.86f, 0.80f, 0.66f);
            RenderSettings.fogStartDistance = 200f;
            RenderSettings.fogEndDistance = 315f;
        }

        /// <summary>
        /// Binds the project's image-based skybox material onto the active Game scene's
        /// RenderSettings. SceneBuilder owns the Game scene end-to-end (it wipes and
        /// rebuilds every root), so any RenderSettings written by an earlier step would
        /// be lost — the skybox must be assigned here, just before the scene is saved.
        /// A missing material degrades to Unity's default procedural skybox with a warning.
        /// </summary>
        private static void AssignSkybox()
        {
            var skybox = AssetDatabase.LoadAssetAtPath<Material>("Assets/Materials/World/Skybox.mat");
            if (skybox == null)
            {
                Debug.LogWarning("[SceneBuilder] Assets/Materials/World/Skybox.mat missing — run \"GDG Go > 1. Project Setup\" first. " +
                                 "Falling back to Unity's default procedural skybox.");
                return;
            }
            RenderSettings.skybox = skybox;
        }

        private static void BuildSessionObjects()
        {
            // WorldScroller must exist before any spawner ticks; its own
            // [DefaultExecutionOrder(-100)] guarantees ordering at runtime.
            var world = new GameObject("WorldScroller");
            world.AddComponent<Gameplay.WorldScroller>();

            var session = new GameObject("GameSession");
            session.AddComponent<Core.GameSession>();

            var audio = new GameObject("AudioManager");
            audio.AddComponent<Audio.AudioManager>();
        }

        private static void BuildPolice()
        {
            var prefab = Load<GameObject>($"{Prefabs}/PoliceCar.prefab");
            if (prefab == null)
            {
                Debug.LogWarning("[SceneBuilder] PoliceCar.prefab missing — the chase will be invisible.");
                return;
            }

            var police = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
            police.transform.position = new Vector3(0f, 0f, -22f);
        }

        private static void BuildSpawners()
        {
            var parent = new GameObject("Spawners").transform;

            BuildRoad(parent);
            BuildScenery(parent);
            BuildTraffic(parent);
            BuildObstacles(parent);
            BuildCoins(parent);
            BuildPowerUps(parent);
            BuildPedestrians(parent);
        }

        private static void BuildRoad(Transform parent)
        {
            var go = NewChild("RoadScroller", parent);
            var road = go.AddComponent<Gameplay.RoadScroller>();

            var straight = Load<GameObject>($"{Prefabs}/Road/Street_Straight.prefab");
            road.tilePrefabs = straight != null ? new[] { straight } : new GameObject[0];

            // Measure the real mesh rather than hardcoding a length. Guessing this wrong
            // is the difference between a seamless road and either visible gaps or
            // z-fighting overlaps, and the value depends on the pack's export scale.
            float measured = MeasureLengthZ(straight, fallback: PrefabsBuilder.RoadTileWidth);

            // Then sanity-check it, and REJECT a bad measurement rather than shipping it.
            //
            // A tile is square by construction, so its Z length must be within a hair of
            // PrefabsBuilder.RoadTileWidth. A wildly different number means the prefab's
            // scale or rotation is wrong, and trusting it is catastrophic rather than
            // merely ugly: a 0.015-unit tileLength makes RoadScroller spawn tiles 1.5 cm
            // apart, hit its 32-per-frame cap, and cover no ground at all — the road
            // silently disappears. That exact failure shipped once.
            float expected = PrefabsBuilder.RoadTileWidth;
            bool plausible = measured > expected * 0.5f && measured < expected * 2f;

            road.tileLength = plausible ? measured : expected;

            if (plausible)
            {
                Debug.Log($"[SceneBuilder] Road tile length measured as {road.tileLength:0.###} units.");
            }
            else
            {
                Debug.LogError(
                    $"[SceneBuilder] Road tile measured {measured:0.####} units on Z but should be ~{expected}. " +
                    $"Ignoring the measurement and using {expected}. The tile prefab's scale or rotation is wrong — " +
                    "delete Assets/Prefabs/Road and re-run \"GDG Go > 2. Build All Prefabs\".");
            }

            road.startTrackDistance = -48f;
            road.spawnAheadDistance = 220f;
            road.despawnBehindZ = -60f;
        }

        private static void BuildScenery(Transform parent)
        {
            var go = NewChild("ScenerySpawner", parent);
            var scenery = go.AddComponent<Scenery.ScenerySpawner>();

            scenery.buildingPrefabs = LoadAll(
                // Front row — full commercial roster for variety.
                $"{Prefabs}/Scenery/Scenery_building-a.prefab",
                $"{Prefabs}/Scenery/Scenery_building-b.prefab",
                $"{Prefabs}/Scenery/Scenery_building-c.prefab",
                $"{Prefabs}/Scenery/Scenery_building-d.prefab",
                $"{Prefabs}/Scenery/Scenery_building-e.prefab",
                $"{Prefabs}/Scenery/Scenery_building-f.prefab",
                $"{Prefabs}/Scenery/Scenery_building-g.prefab",
                $"{Prefabs}/Scenery/Scenery_building-h.prefab",
                $"{Prefabs}/Scenery/Scenery_building-i.prefab",
                $"{Prefabs}/Scenery/Scenery_building-j.prefab",
                $"{Prefabs}/Scenery/Scenery_building-k.prefab",
                $"{Prefabs}/Scenery/Scenery_building-l.prefab",
                $"{Prefabs}/Scenery/Scenery_building-m.prefab",
                $"{Prefabs}/Scenery/Scenery_building-n.prefab",
                // Industrial mixed in for silhouette variety.
                $"{Prefabs}/Scenery/Scenery_ind-building-a.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-b.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-c.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-d.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-e.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-f.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-g.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-h.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-i.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-j.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-k.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-l.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-m.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-n.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-o.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-p.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-q.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-r.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-s.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-building-t.prefab");

            // Back row — skyscrapers + thin low-detail towers, large scale, sparser schedule.
            // Sits at backRowOffset ≈ 24 so it fills the horizon behind the front row without
            // fronting it (back spawn is every 2nd slot — see backRowEveryNth in the spawner).
            scenery.backRowPrefabs = LoadAll(
                $"{Prefabs}/Scenery/Scenery_skyscraper-skyscraper-a.prefab",
                $"{Prefabs}/Scenery/Scenery_skyscraper-skyscraper-b.prefab",
                $"{Prefabs}/Scenery/Scenery_skyscraper-skyscraper-c.prefab",
                $"{Prefabs}/Scenery/Scenery_skyscraper-skyscraper-d.prefab",
                $"{Prefabs}/Scenery/Scenery_skyscraper-skyscraper-e.prefab",
                $"{Prefabs}/Scenery/Scenery_low-detail-building-a.prefab",
                $"{Prefabs}/Scenery/Scenery_low-detail-building-b.prefab",
                $"{Prefabs}/Scenery/Scenery_low-detail-building-c.prefab",
                $"{Prefabs}/Scenery/Scenery_low-detail-building-d.prefab",
                $"{Prefabs}/Scenery/Scenery_low-detail-building-e.prefab",
                $"{Prefabs}/Scenery/Scenery_low-detail-building-f.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-chimney-large.prefab",
                $"{Prefabs}/Scenery/Scenery_ind-chimney-medium.prefab");
            scenery.backRowOffset = 22f;
            scenery.backRowOffsetJitter = 5f;
            scenery.backRowScale = 7f;
            scenery.backRowScaleJitter = 3f;
            // Was 2: back row spawned only every other slot, which from inside the car
            // read as gaps in the horizon. Now every slot emits a back-row building on
            // both sides, so the skyline forms a continuous wall behind the front row
            // and the sky stops bleeding through the upper third of the frame on long
            // straights. Front-row density (slotInterval 11) is unchanged, so the front
            // still sells the speed cue and the back just hides the spawn boundary.
            scenery.backRowEveryNth = 1;

            scenery.kerbPropPrefabs = LoadAll(
                $"{Prefabs}/Scenery/Prop_Streetlight.prefab",
                $"{Prefabs}/Scenery/Prop_Tree.prefab",
                $"{Prefabs}/Scenery/Prop_Bush.prefab");

            // Greenery for the grass verge — bushes and trees only, no streetlights:
            // a lamp post in the middle of a lawn reads as a mistake.
            scenery.vergePrefabs = LoadAll(
                $"{Prefabs}/Scenery/Prop_Bush.prefab",
                $"{Prefabs}/Scenery/Prop_Tree.prefab");
            scenery.vergeInnerX = 6.5f;
            scenery.vergeChance = 0.75f;

            // Extended from 240 -> 320 so the city reads further ahead and the streaming
            // boundary isn't visible from the start line. Combined with the denser back
            // row above, the horizon is now well populated rather than popping in late.
            scenery.startTrackDistance = -40f;
            scenery.spawnAheadDistance = 320f;
            scenery.despawnBehindZ = -60f;

            // Road geometry: drivable lanes span x +-4.5, pavements run 4.5..6.
            // Kerb props sit on the pavement; buildings start beyond the tile edge.
            scenery.kerbOffset = 5.3f;
            // Front-row offset reduced from 9.5 -> 8.5 so the front row reads denser
            // without crowding the pavement edge. The buildings sit closer to the kerb
            // — so each slot appears bigger against the same lane width, which is the
            // "expand the city" cue without extra draw calls or new prefabs.
            scenery.sideOffset = 8.5f;
            scenery.sideOffsetJitter = 3.0f;
            scenery.groundY = PrefabsBuilder.PavementHeight;

            // Front-row scale bumped 4 -> 4.4 so each block reads as 10% larger, which
            // against the now-tighter sideOffset reads as a denser city wall rather
            // than the same wall slightly closer — pushing buildings apart visually
            // because each one is bigger. The jitter (3.5 -> 3.0) compensates so they
            // don't clip.
            scenery.buildingScale = 4.4f;
            scenery.buildingScaleJitter = 1.2f;

            // Prop prefabs are already built at their correct size (see the Quaternius
            // scale constants in PrefabsBuilder), so the spawner must not rescale them.
            scenery.propScale = 1f;

            // Denser than the old 16m: at 40+ m/s a 16m gap still reads as sparse, and
            // roadside geometry rushing past is the main thing selling speed.
            scenery.slotInterval = 11f;
            scenery.kerbPropChance = 0.8f;
        }

        private static void BuildTraffic(Transform parent)
        {
            var go = NewChild("TrafficSpawner", parent);
            var traffic = go.AddComponent<Traffic.TrafficSpawner>();

            var entries = new List<Traffic.TrafficSpawner.TrafficEntry>();
            AddTraffic(entries, "Traffic_Sedan", 1.0f, 11f);
            AddTraffic(entries, "Traffic_SUV", 0.9f, 10f);
            AddTraffic(entries, "Traffic_Taxi", 0.9f, 11f);
            AddTraffic(entries, "Traffic_Van", 0.7f, 9f);
            AddTraffic(entries, "Traffic_Delivery", 0.6f, 8f);
            AddTraffic(entries, "Traffic_Truck", 0.45f, 7f);
            AddTraffic(entries, "Traffic_Ambulance", 0.3f, 12f);
            AddTraffic(entries, "Traffic_Firetruck", 0.25f, 7f);
            traffic.trafficPrefabs = entries.ToArray();

            traffic.startTrackDistance = 120f;   // let the player settle before traffic starts
        }

        private static void AddTraffic(List<Traffic.TrafficSpawner.TrafficEntry> into, string name, float weight, float speed)
        {
            var prefab = Load<GameObject>($"{Prefabs}/Traffic/{name}.prefab");
            if (prefab == null) return;
            into.Add(new Traffic.TrafficSpawner.TrafficEntry { prefab = prefab, weight = weight, forwardSpeed = speed });
        }

        private static void BuildObstacles(Transform parent)
        {
            var go = NewChild("ObstacleSpawner", parent);
            var obstacles = go.AddComponent<Obstacles.ObstacleSpawner>();

            var entries = new List<Obstacles.ObstacleSpawner.ObstacleEntry>();
            AddObstacle(entries, "Obstacle_Cone", 1.4f);
            AddObstacle(entries, "Obstacle_Tire", 0.9f);
            AddObstacle(entries, "Obstacle_Box", 0.8f);
            AddObstacle(entries, "Obstacle_Door", 0.5f);
            AddObstacle(entries, "Obstacle_StopSign", 0.6f);
            AddObstacle(entries, "Obstacle_TrafficLight", 0.4f);
            obstacles.obstaclePrefabs = entries.ToArray();

            obstacles.startTrackDistance = 80f;
        }

        private static void AddObstacle(List<Obstacles.ObstacleSpawner.ObstacleEntry> into, string name, float weight)
        {
            var prefab = Load<GameObject>($"{Prefabs}/Obstacles/{name}.prefab");
            if (prefab == null) return;
            into.Add(new Obstacles.ObstacleSpawner.ObstacleEntry { prefab = prefab, weight = weight });
        }

        private static void BuildCoins(Transform parent)
        {
            var go = NewChild("CoinSpawner", parent);
            var coins = go.AddComponent<Coins.CoinSpawner>();

            coins.coinPrefab = Load<Coins.CoinPickup>($"{Prefabs}/Coin.prefab");

            // Dedicated fuel canister prefab (Quaternius RPG Potion6_Filled.fbx).
            // Falls back to the legacy Coin + orange-material path if the prefab is
            // missing (e.g. BuildFuelPrefab hasn't been run yet).
            coins.fuelPrefabOverride = Load<Coins.CoinPickup>($"{Prefabs}/PowerUps/Fuel.prefab");

            string folder = MaterialLibrary.CoinsFolder;
            coins.redMaterial = Load<Material>($"{folder}/CoinRed.mat");
            coins.blueMaterial = Load<Material>($"{folder}/CoinBlue.mat");
            coins.yellowMaterial = Load<Material>($"{folder}/CoinYellow.mat");
            coins.greenMaterial = Load<Material>($"{folder}/CoinGreen.mat");
            coins.gdgPillMaterial = Load<Material>($"{folder}/CoinGDGPill.mat");
            coins.fuelMaterial = Load<Material>($"{folder}/CoinFuel.mat");

            coins.startTrackDistance = 40f;   // coins start early: they teach the controls

            // Hover just above bonnet height on a 1.5-tall car, so a coin reads as
            // something you drive *through* rather than something floating overhead.
            coins.hoverHeight = 0.9f;
            coins.archPeakHeight = 2.2f;      // stays inside PlayerCar.jumpHeight (2.6)
            coins.coinSpacing = 2.2f;
        }

        private static void BuildPowerUps(Transform parent)
        {
            var go = NewChild("PowerUpSpawner", parent);
            var powerUps = go.AddComponent<PowerUps.PowerUpSpawner>();

            // One prefab per power-up type — each carries a distinct generated low-poly mesh
            // (magnet, X-cross, shield, bolt, snowflake) so the silhouette tells the player
            // what they are grabbing, not just the colour. The old single PowerUp.prefab
            // made every pickup read as "a bigger coin".
            PowerUps.PowerUpEffect magnet = Load<PowerUps.PowerUpEffect>($"{Prefabs}/PowerUps/PowerUp_Magnet.prefab");
            PowerUps.PowerUpEffect twoX   = Load<PowerUps.PowerUpEffect>($"{Prefabs}/PowerUps/PowerUp_TwoX.prefab");
            PowerUps.PowerUpEffect shield = Load<PowerUps.PowerUpEffect>($"{Prefabs}/PowerUps/PowerUp_Shield.prefab");
            PowerUps.PowerUpEffect nitro  = Load<PowerUps.PowerUpEffect>($"{Prefabs}/PowerUps/PowerUp_Nitro.prefab");
            PowerUps.PowerUpEffect freeze = Load<PowerUps.PowerUpEffect>($"{Prefabs}/PowerUps/PowerUp_Freeze.prefab");

            if (magnet == null && twoX == null && shield == null && nitro == null && freeze == null)
            {
                powerUps.entries = new PowerUps.PowerUpSpawner.SpawnEntry[0];
                return;
            }

            powerUps.entries = new[]
            {
                new PowerUps.PowerUpSpawner.SpawnEntry { type = PowerUps.PowerUpType.CoinMagnet,   prefab = magnet, spawnWeight = 1.0f, durationSec = 8f  },
                new PowerUps.PowerUpSpawner.SpawnEntry { type = PowerUps.PowerUpType.Nitro,        prefab = nitro,  spawnWeight = 0.8f, durationSec = 5f  },
                new PowerUps.PowerUpSpawner.SpawnEntry { type = PowerUps.PowerUpType.Shield,       prefab = shield, spawnWeight = 0.7f, durationSec = 0f  },
                new PowerUps.PowerUpSpawner.SpawnEntry { type = PowerUps.PowerUpType.TwoX,         prefab = twoX,   spawnWeight = 0.6f, durationSec = 10f },
                new PowerUps.PowerUpSpawner.SpawnEntry { type = PowerUps.PowerUpType.PoliceFreeze,prefab = freeze, spawnWeight = 0.4f, durationSec = 6f  },
            };

            powerUps.startTrackDistance = 260f;
        }

        private static void BuildPedestrians(Transform parent)
        {
            var go = NewChild("PedestrianSpawner", parent);
            var pedestrians = go.AddComponent<Pedestrians.PedestrianSpawner>();

            // Previously left empty because the packs were assumed to need an Animator
            // controller built by hand. They do not: PedestrianSpawner adds PedestrianNPC
            // itself and drives movement in code, so an un-animated mesh streams fine —
            // it just slides rather than walks. Static pedestrians on the pavement read as
            // a populated city; no pedestrians at all reads as a ghost town.
            var entries = new List<Pedestrians.PedestrianSpawner.PedestrianEntry>();
            foreach (var (name, _) in PrefabsBuilder.PedestrianModels)
            {
                var prefab = Load<GameObject>($"{Prefabs}/Pedestrians/{name}.prefab");
                if (prefab == null) continue;
                entries.Add(new Pedestrians.PedestrianSpawner.PedestrianEntry { prefab = prefab, weight = 1f });
            }
            pedestrians.pedestrians = entries.ToArray();

            // Pavement runs x 4.5..6, so 5.25 is its centre line. Anything beyond 6 is off
            // the tile entirely, which is what made pedestrians appear to walk on air.
            pedestrians.pavementOffset = 5.25f;
            pedestrians.pavementJitter = 0.35f;
            pedestrians.pavementY = PrefabsBuilder.PavementHeight;

            // Denser schedule (12 m vs 18 m) and the spawner now emits on BOTH kerbs per
            // slot, so the streets read populated rather than the previous one-person-
            // every-few-seconds ghost-town. spawnBothSides defaults true on the component.
            pedestrians.intervalMeters = 12f;
            pedestrians.spawnBothSides = true;
            pedestrians.startTrackDistance = 60f;
        }

        // ==================================================================
        // HUD
        // ==================================================================

        private static void BuildHUD()
        {
            var canvasGo = new GameObject("HUD", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));

            var canvas = canvasGo.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;

            var scaler = canvasGo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280f, 720f);
            // Match height rather than width: phones in portrait are far narrower than
            // 16:9, and matching width would blow the HUD up off-screen.
            scaler.matchWidthOrHeight = 1f;

            var hud = canvasGo.AddComponent<UI.HUD>();
            // HUD is all numbers and short labels — the display face is right here.
            TMP_FontAsset font = FontSetup.Display();

            hud.scoreText = MakeLabel(canvasGo.transform, "ScoreText", font, "0",
                new Vector2(0f, 1f), new Vector2(28f, -28f), 54f, TextAlignmentOptions.TopLeft);
            hud.distanceText = MakeLabel(canvasGo.transform, "DistanceText", font, "0 m",
                new Vector2(0f, 1f), new Vector2(28f, -92f), 30f, TextAlignmentOptions.TopLeft);
            hud.coinText = MakeLabel(canvasGo.transform, "CoinText", font, "0",
                new Vector2(1f, 1f), new Vector2(-28f, -28f), 40f, TextAlignmentOptions.TopRight);
            hud.multiplierText = MakeLabel(canvasGo.transform, "MultiplierText", font, "x2",
                new Vector2(1f, 1f), new Vector2(-28f, -88f), 44f, TextAlignmentOptions.TopRight);

            // HUD text sits over a bright sky and dark asphalt in the same frame, so a
            // flat white glyph loses its edge against one or the other. An outline is the
            // cheapest fix that works against both.
            AddTextOutline(hud.scoreText);
            AddTextOutline(hud.distanceText);
            AddTextOutline(hud.coinText);
            AddTextOutline(hud.multiplierText);

            // Secondary readouts are dimmer so the score reads first.
            hud.distanceText.color = new Color(1f, 1f, 1f, 0.72f);
            hud.multiplierText.color = new Color(0.984f, 0.737f, 0.020f);   // Google yellow

            BuildHeatBar(canvasGo.transform);
            BuildFuelGauge(canvasGo.transform, hud, font);
        }

        /// <summary>
        /// The fuel gauge, top-centre. Deliberately separated from the Heat bar at the
        /// bottom: they are the two ways to lose, and putting them together would make
        /// the player parse one glance for two different threats.
        /// </summary>
        private static void BuildFuelGauge(Transform parent, UI.HUD hud, TMP_FontAsset font)
        {
            var barGo = new GameObject("FuelGauge", typeof(RectTransform));
            barGo.transform.SetParent(parent, false);

            var barRect = (RectTransform)barGo.transform;
            barRect.anchorMin = new Vector2(0.5f, 1f);
            barRect.anchorMax = new Vector2(0.5f, 1f);
            barRect.pivot = new Vector2(0.5f, 1f);
            barRect.anchoredPosition = new Vector2(0f, -26f);
            barRect.sizeDelta = new Vector2(300f, 26f);

            MakeImage(barGo.transform, "Background",
                "Assets/UI/KenneyUI/bar_square_large.png", new Color(0f, 0f, 0f, 0.55f))
                .type = Image.Type.Sliced;

            var fill = MakeImage(barGo.transform, "Fill",
                "Assets/UI/KenneyUI/bar_square_large_m.png", new Color(0.204f, 0.659f, 0.325f));
            fill.type = Image.Type.Filled;
            fill.fillMethod = Image.FillMethod.Horizontal;
            fill.fillAmount = 1f;
            hud.fuelFillImage = fill;

            var caption = MakeLabel(barGo.transform, "Caption", font, "FUEL",
                new Vector2(0f, 1f), new Vector2(6f, 20f), 17f, TextAlignmentOptions.Left);
            caption.color = new Color(1f, 1f, 1f, 0.7f);
            caption.characterSpacing = 8f;
            AddTextOutline(caption);

            var pct = MakeLabel(barGo.transform, "FuelText", font, "100%",
                new Vector2(1f, 1f), new Vector2(-6f, 20f), 17f, TextAlignmentOptions.Right);
            pct.color = new Color(1f, 1f, 1f, 0.7f);
            AddTextOutline(pct);
            hud.fuelText = pct;
        }

        /// <summary>
        /// Adds a dark outline to a TMP label. Written through the shared material's
        /// properties, so it costs no extra draw call.
        /// </summary>
        private static void AddTextOutline(TMP_Text label)
        {
            if (label == null) return;
            label.outlineWidth = 0.22f;
            label.outlineColor = new Color32(0, 0, 0, 190);
        }

        private static void BuildHeatBar(Transform parent)
        {
            var barGo = new GameObject("HeatBar", typeof(RectTransform));
            barGo.transform.SetParent(parent, false);

            var barRect = (RectTransform)barGo.transform;
            barRect.anchorMin = new Vector2(0.5f, 0f);
            barRect.anchorMax = new Vector2(0.5f, 0f);
            barRect.pivot = new Vector2(0.5f, 0f);
            barRect.anchoredPosition = new Vector2(0f, 26f);
            barRect.sizeDelta = new Vector2(420f, 34f);

            // Label the bar. An unlabelled coloured strip tells a new player nothing, and
            // Heat is the one number that decides when the run ends.
            var caption = MakeLabel(barGo.transform, "Caption", FontSetup.Display(), "HEAT",
                new Vector2(0.5f, 1f), new Vector2(0f, 20f), 18f, TextAlignmentOptions.Center);
            caption.color = new Color(1f, 1f, 1f, 0.6f);
            caption.characterSpacing = 8f;

            // "_square" variants are the straight mid-sections of Kenney's bar sprites,
            // meant to be tiled or nine-sliced. The rounded "_l"/"_r" caps are separate
            // files — stretching a round-capped sprite across 420px is what turned the
            // heat bar into an orange ellipse.
            var background = MakeImage(barGo.transform, "Background",
                "Assets/UI/KenneyUI/bar_square_large.png", new Color(0f, 0f, 0f, 0.55f));
            background.type = Image.Type.Sliced;

            var fill = MakeImage(barGo.transform, "Fill",
                "Assets/UI/KenneyUI/bar_square_large_m.png", Color.green);
            fill.type = Image.Type.Filled;
            fill.fillMethod = Image.FillMethod.Horizontal;
            fill.fillAmount = 1f;

            var heat = barGo.AddComponent<Police.HeatBar>();
            heat.fillImage = fill;
            heat.backgroundImage = background;
        }

        private static Image MakeImage(Transform parent, string name, string spritePath, Color color)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);

            var rect = (RectTransform)go.transform;
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;

            var image = go.AddComponent<Image>();
            image.sprite = LoadSprite(spritePath);
            image.color = color;
            return image;
        }

        private static TMP_Text MakeLabel(Transform parent, string name, TMP_FontAsset font, string text,
                                          Vector2 anchor, Vector2 offset, float size, TextAlignmentOptions alignment)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);

            var rect = (RectTransform)go.transform;
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = new Vector2(anchor.x, anchor.y);
            rect.anchoredPosition = offset;
            rect.sizeDelta = new Vector2(460f, 70f);

            var label = go.AddComponent<TextMeshProUGUI>();
            label.text = text;
            label.fontSize = size;
            label.alignment = alignment;
            if (font != null) label.font = font;
            label.color = Color.white;
            return label;
        }

        // ==================================================================
        // Helpers
        // ==================================================================

        private static GameObject NewChild(string name, Transform parent)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            return go;
        }

        /// <summary>
        /// Combined renderer-bounds depth of a prefab, in world units at its own scale.
        /// Falls back to <paramref name="fallback"/> if the prefab or its renderers are
        /// missing, so a bad measurement degrades to the old hardcoded guess rather than
        /// producing a zero-length tile and an infinite spawn loop.
        /// </summary>
        private static float MeasureLengthZ(GameObject prefab, float fallback)
        {
            if (prefab == null) return fallback;

            var probe = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
            if (probe == null) return fallback;

            try
            {
                var renderers = probe.GetComponentsInChildren<Renderer>(true);
                if (renderers.Length == 0) return fallback;

                Bounds bounds = renderers[0].bounds;
                for (int i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);

                float depth = bounds.size.z;
                return depth > 0.01f ? depth : fallback;
            }
            finally
            {
                Object.DestroyImmediate(probe);
            }
        }

        private static T Load<T>(string path) where T : UnityEngine.Object
        {
            var asset = AssetDatabase.LoadAssetAtPath<T>(path);
            if (asset == null) Debug.LogWarning($"[SceneBuilder] Missing asset: {path}");
            return asset;
        }

        /// <summary>Loads several prefabs, silently dropping any that are missing.</summary>
        private static GameObject[] LoadAll(params string[] paths)
        {
            var found = new List<GameObject>(paths.Length);
            foreach (string path in paths)
            {
                var asset = AssetDatabase.LoadAssetAtPath<GameObject>(path);
                if (asset != null) found.Add(asset);
            }
            return found.ToArray();
        }

        private static Sprite LoadSprite(string path)
        {
            var sprite = AssetDatabase.LoadAssetAtPath<Sprite>(path);
            if (sprite == null)
                Debug.LogWarning($"[SceneBuilder] {path} did not import as a Sprite. " +
                                 "Select it and set Texture Type = Sprite (2D and UI).");
            return sprite;
        }
    }
}
