using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEditor.SceneManagement;

namespace GDGGo.EditorTools
{
    /// <summary>
    /// One-click project setup: tags, config asset, scenes, coin materials, WebGL settings.
    ///
    /// Idempotent — every step checks for an existing artefact and leaves it alone, so
    /// re-running never clobbers hand-tuned values.
    ///
    /// The tag step is the one that used to break everything downstream. "Obstacle" is
    /// not a Unity built-in tag, and <c>PrefabsBuilder</c> assigns it to every traffic
    /// and obstacle prefab. Assigning an unregistered tag throws
    /// <c>UnityException: Tag is not defined</c>, which aborted the prefab build partway
    /// through and left the project in a half-built state.
    /// </summary>
    public static class ProjectSetup
    {
        private const string ScenesFolder = "Assets/Scenes";

        private static readonly string[] SceneNames = { "Game" };

        // ==================================================================
        // Entry points
        // ==================================================================

        /// <summary>Runs the entire pipeline in dependency order.</summary>
        [MenuItem("GDG Go/Run Full Project Setup", priority = -1)]
        public static void RunFullSetup()
        {
            Debug.Log("[GDG Go] ===== Full setup starting =====");

            Run();                        // tags, scenes, materials

            // Import settings first: prefabs bake in whatever the mesh looks like at build
            // time, and UI Images resolve their sprite once. Fixing either afterwards
            // leaves already-built assets wrong.
            ModelAxisFixer.FixQuaterniusAxes();        // clears a bake these meshes must NOT have
            ModelAxisFixer.FixDowntownCityNormals();   // 153 unused meshes spamming the console
            UIAssetImporter.FixAll();                  // 500+ UI PNGs import as plain textures otherwise
            FontSetup.Build();                         // display face; body text stays LiberationSans

            // GetOrCreate returns existing materials untouched, so a palette change in
            // code is invisible on a project that already ran setup. Push it through.
            MaterialLibrary.RestampWorldPalette();

            // Every Build* skips a prefab that already exists, so prefabs baked at the
            // wrong scale would survive untouched. Drop them.
            PrefabsBuilder.DeleteQuaterniusDerivedPrefabs();

            PrefabsBuilder.BuildAll();    // needs tags + coin materials + correct axes
            SceneBuilder.BuildGameScene();// needs prefabs
            AudioSetup.AssignAll();       // needs the Game scene's AudioManager

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log("[GDG Go] ===== Full setup complete. =====\n" +
                      "  1. Run both SQL files in supabase/migrations/ in the Supabase SQL editor\n" +
                      "  2. Open Assets/Scenes/Game.unity and press Play\n" +
                      "  3. Build WebGL to unity-project/Build");
        }

        [MenuItem("GDG Go/1. Project Setup", priority = 0)]
        public static void Run()
        {
            Debug.Log("[GDG Go Setup] Starting.");

            EnsureTags();
            EnsureScenes();
            EnsureCoinMaterials();
            EnsureSkyboxMaterial();

            int shaderFixed = MaterialLibrary.RefreshShaders();
            if (shaderFixed > 0)
                Debug.Log($"[GDG Go Setup] Re-stamped {shaderFixed} material(s) to the active render pipeline.");

            ConfigureWebGL();

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            Debug.Log("[GDG Go Setup] Done.");
        }

        // ==================================================================
        // Steps
        // ==================================================================

        /// <summary>
        /// Registers every custom tag the runtime uses. Without this, the first
        /// <c>gameObject.tag = "Obstacle"</c> throws and takes the build with it.
        /// </summary>
        public static void EnsureTags()
        {
            UnityEngine.Object[] assets = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/TagManager.asset");
            if (assets == null || assets.Length == 0)
            {
                Debug.LogError("[GDG Go Setup] Could not open ProjectSettings/TagManager.asset. " +
                               "Add the tag \"Obstacle\" by hand under Edit > Project Settings > Tags and Layers.");
                return;
            }

            var tagManager = new SerializedObject(assets[0]);
            SerializedProperty tags = tagManager.FindProperty("tags");
            if (tags == null)
            {
                Debug.LogError("[GDG Go Setup] TagManager has no 'tags' property — Unity version mismatch?");
                return;
            }

            foreach (string wanted in Tags.Custom)
            {
                if (HasTag(tags, wanted)) continue;

                tags.InsertArrayElementAtIndex(tags.arraySize);
                tags.GetArrayElementAtIndex(tags.arraySize - 1).stringValue = wanted;
                Debug.Log($"[GDG Go Setup] Registered tag \"{wanted}\".");
            }

            tagManager.ApplyModifiedProperties();
        }

        private static bool HasTag(SerializedProperty tags, string wanted)
        {
            for (int i = 0; i < tags.arraySize; i++)
            {
                SerializedProperty element = tags.GetArrayElementAtIndex(i);
                if (element != null && element.stringValue == wanted) return true;
            }
            return false;
        }

        private static void EnsureScenes()
        {
            MaterialLibrary.EnsureFolder(ScenesFolder);

            var buildScenes = new EditorBuildSettingsScene[SceneNames.Length];
            for (int i = 0; i < SceneNames.Length; i++)
            {
                string path = $"{ScenesFolder}/{SceneNames[i]}.unity";
                if (!File.Exists(path))
                {
                    var scene = EditorSceneManager.NewScene(NewSceneSetup.DefaultGameObjects, NewSceneMode.Single);
                    EditorSceneManager.SaveScene(scene, path);
                    Debug.Log($"[GDG Go Setup] Created {path}");
                }
                buildScenes[i] = new EditorBuildSettingsScene(path, true);
            }

            EditorBuildSettings.scenes = buildScenes;
            Debug.Log("[GDG Go Setup] Build Settings scene: Game.");
        }

        /// <summary>
        /// The five coin materials. Four Google brand colours plus the rare GDG pill,
        /// which uses the processed logo from Branding/ as its albedo.
        /// </summary>
        private static void EnsureCoinMaterials()
        {
            MaterialLibrary.EnsureFolder(MaterialLibrary.CoinsFolder);

            // Google brand palette.
            MakeCoin("CoinRed", new Color(0.918f, 0.263f, 0.208f));   // #EA4335
            MakeCoin("CoinBlue", new Color(0.259f, 0.522f, 0.957f));  // #4285F4
            MakeCoin("CoinYellow", new Color(0.984f, 0.737f, 0.020f));// #FBBC05
            MakeCoin("CoinGreen", new Color(0.204f, 0.659f, 0.325f)); // #34A853

            // Fuel is deliberately OUTSIDE the Google palette — a hot orange nothing else
            // in the game uses. A fuel can that reads as "another coin" defeats the point
            // of the mechanic, so it must be instantly separable at speed.
            MakeCoin("CoinFuel", new Color(1f, 0.42f, 0.05f));

            MakePillCoin();
        }

        private static void MakeCoin(string name, Color color)
        {
            string path = $"{MaterialLibrary.CoinsFolder}/{name}.mat";
            if (AssetDatabase.LoadAssetAtPath<Material>(path) != null) return;

            Material material = MaterialLibrary.GetOrCreate(path, color, 0.7f, 0.35f);
            if (material == null) return;

            // A gentle emissive lift so coins stay readable against dark asphalt.
            MaterialLibrary.SetEmission(material, color * 0.55f);
            EditorUtility.SetDirty(material);
        }

        private static void MakePillCoin()
        {
            string path = $"{MaterialLibrary.CoinsFolder}/CoinGDGPill.mat";
            if (AssetDatabase.LoadAssetAtPath<Material>(path) != null) return;

            Material material = MaterialLibrary.GetOrCreate(path, Color.white, 0.8f, 0.2f);
            if (material == null) return;

            var texture = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Textures/Coins/gdg_pill_coin.png");
            if (texture != null)
            {
                MaterialLibrary.SetBaseMap(material, texture);
            }
            else
            {
                Debug.LogWarning("[GDG Go Setup] Assets/Textures/Coins/gdg_pill_coin.png not found — " +
                                 "the GDG pill coin will be plain white.");
            }

            MaterialLibrary.SetEmission(material, Color.white * 0.5f);
            EditorUtility.SetDirty(material);
        }

        /// <summary>
        /// Builds the skybox material used by the Game scene from the equirectangular
        /// sky texture at Assets/Textures/Sky/skybox-day.png. Image-based rather than
        /// procedural: Unity's default procedural skybox counts as a "Unity primitive" the
        /// project's art-directive forbids, and the Kenney packs carry no skybox. Only
        /// the Game scene renders this — every UI scene uses a SolidColor clear.
        /// Idempotent — the material is left untouched if it already exists. The scene
        /// assignment itself happens in SceneBuilder, which owns the Game scene and is
        /// the step that runs after this one in Run Full Project Setup.
        /// </summary>
        private static void EnsureSkyboxMaterial()
        {
            const string SkyboxPath = "Assets/Materials/World/Skybox.mat";
            if (AssetDatabase.LoadAssetAtPath<Material>(SkyboxPath) != null) return;

            Shader skyShader = Shader.Find("Skybox/Panoramic");
            if (skyShader == null)
            {
                Debug.LogWarning("[GDG Go Setup] \"Skybox/Panoramic\" shader not found — skybox material not created.");
                return;
            }

            const string SkyTexPath = "Assets/Textures/Sky/skybox-day.png";

            // Repair the import settings BEFORE loading. The shipped .meta has
            // `textureShape: 0`, which is not a legal TextureImporterShape — the valid
            // values are 1 (2D) and 2 (Cube) — and Unity refuses the asset outright with
            //   "Could not create asset from Assets/Textures/Sky/skybox-day.png:
            //    Texture could not be created."
            // LoadAssetAtPath then returns null, this method bails, Skybox.mat is never
            // written, and SceneBuilder silently falls back to Unity's default procedural
            // sky — which is the flat grey-blue horizon behind the whole game.
            //
            // Skybox/Panoramic samples a 2D lat-long texture, so 2D is what we want; the
            // 4096x2048 source must also not be clamped to the default 2048 or the sky
            // turns to mush.
            var skyImporter = AssetImporter.GetAtPath(SkyTexPath) as TextureImporter;
            if (skyImporter != null)
            {
                skyImporter.textureShape = TextureImporterShape.Texture2D;
                skyImporter.textureType = TextureImporterType.Default;
                skyImporter.wrapMode = TextureWrapMode.Clamp;
                skyImporter.maxTextureSize = 4096;
                skyImporter.mipmapEnabled = false;   // a skybox is never minified
                skyImporter.SaveAndReimport();
            }
            else
            {
                AssetDatabase.ImportAsset(SkyTexPath);
            }

            Texture skyTex = AssetDatabase.LoadAssetAtPath<Texture>(SkyTexPath);
            if (skyTex == null)
            {
                Debug.LogWarning($"[GDG Go Setup] {SkyTexPath} could not be imported — skybox material not created.");
                return;
            }

            MaterialLibrary.EnsureFolder(MaterialLibrary.WorldFolder);

            var mat = new Material(skyShader) { name = "Skybox" };
            mat.SetTexture("_MainTex", skyTex);
            AssetDatabase.CreateAsset(mat, SkyboxPath);
            EditorUtility.SetDirty(mat);
            Debug.Log("[GDG Go Setup] Created skybox material from Assets/Textures/Sky/skybox-day.png.");
        }

        /// <summary>
        /// WebGL settings appropriate for a public web game: Brotli with the JS
        /// decompression fallback so it still loads when the host cannot set
        /// Content-Encoding, and no exception stack traces (they roughly double the
        /// wasm size for no player-visible benefit).
        /// </summary>
        private static void ConfigureWebGL()
        {
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Brotli;
            PlayerSettings.WebGL.decompressionFallback = true;
            PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.runInBackground = false;

            if (string.IsNullOrEmpty(PlayerSettings.productName) || PlayerSettings.productName == "unity-project")
                PlayerSettings.productName = "GDG Go";

            Debug.Log("[GDG Go Setup] WebGL: Brotli + decompression fallback, exceptions off, data caching on.");
        }

        [MenuItem("GDG Go/Build WebGL", priority = 50)]
        public static void BuildWebGL()
        {
            Debug.Log("[GDG Go Build] Starting WebGL Build...");
            ConfigureWebGL();

            string[] scenes = { "Assets/Scenes/Game.unity" };
            string buildPath = Path.Combine(Directory.GetCurrentDirectory(), "Build");

            if (!Directory.Exists(buildPath))
            {
                Directory.CreateDirectory(buildPath);
            }

            BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions
            {
                scenes = scenes,
                locationPathName = buildPath,
                target = BuildTarget.WebGL,
                options = BuildOptions.None
            };

            var report = BuildPipeline.BuildPlayer(buildPlayerOptions);
            var summary = report.summary;

            if (summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
            {
                Debug.Log($"[GDG Go Build] WebGL Build Succeeded! Output size: {summary.totalSize} bytes");
            }
            else
            {
                Debug.LogError($"[GDG Go Build] WebGL Build Failed with result: {summary.result}");
            }
        }

        // ==================================================================
        // Validation
        // ==================================================================

        [MenuItem("GDG Go/Validate Setup", priority = 100)]
        public static void Validate()
        {
            bool shaderOk = MaterialLibrary.LitShader() != null;
            bool coinsOk = AssetDatabase.LoadAssetAtPath<Material>($"{MaterialLibrary.CoinsFolder}/CoinGDGPill.mat") != null;
            bool playerOk = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/PlayerCar.prefab") != null;
            bool scenesOk = EditorBuildSettings.scenes != null && EditorBuildSettings.scenes.Length >= 1;

            Debug.Log($"[GDG Go Validate]\n" +
                      $"  lit shader found : {shaderOk}\n" +
                      $"  coin materials   : {coinsOk}\n" +
                      $"  prefabs built    : {playerOk}\n" +
                      $"  scenes wired     : {scenesOk}");
        }
    }
}
