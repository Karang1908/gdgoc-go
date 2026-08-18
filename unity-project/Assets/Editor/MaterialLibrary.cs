using System.IO;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace GDGGo.EditorTools
{
    /// <summary>
    /// Creates materials that work whether or not URP is actually active.
    ///
    /// This matters because the project lists the URP package but has no URP asset
    /// assigned, and the Quaternius packs ship <b>no textures and no vertex colours</b>
    /// (verified against the source zips) — so every Quaternius mesh renders flat white
    /// unless we build materials for it. Meanwhile the Kenney kits do ship a
    /// <c>colormap.png</c> atlas and import fine on their own.
    ///
    /// Rather than hard-coding "Universal Render Pipeline/Lit" and producing magenta
    /// error-shader materials on a Built-in project, every lookup here falls back down a
    /// chain and every property is set under both the URP and Built-in names. Setting a
    /// property a shader does not have is a no-op in Unity, so writing both is safe.
    /// </summary>
    public static class MaterialLibrary
    {
        public const string CoinsFolder = "Assets/Materials/Coins";
        public const string WorldFolder = "Assets/Materials/World";

        /// <summary>Best available lit shader for the ACTIVE render pipeline.</summary>
        public static Shader LitShader()
        {
            // Detect the active pipeline, not shader availability. Shader.Find(
            // "Universal Render Pipeline/Lit") returns non-null whenever the URP
            // PACKAGE is installed — even when no URP render-pipeline asset is
            // assigned and the project renders with Built-in — so the old
            // find-then-fallback ladder quietly minted URP/Lit materials that render
            // magenta under Built-in. Only pick URP/Lit when URP is actually active.
            bool urpActive = GraphicsSettings.currentRenderPipeline != null;
            if (urpActive)
            {
                Shader urp = Shader.Find("Universal Render Pipeline/Lit");
                if (urp != null) return urp;
            }
            Shader std = Shader.Find("Standard");
            if (std != null) return std;
            return Shader.Find("Legacy Shaders/Diffuse");
        }

        /// <summary>
        /// Re-stamps every material this library manages so its shader matches the
        /// currently active render pipeline. Existing .mat files cache whichever shader
        /// <see cref="LitShader"/> resolved at creation time; switching pipelines (or
        // fixing a stale detection) leaves them on the wrong shader and they go magenta.
        // This re-syncs the shader ONLY — it touches nothing about colour or other
        // hand-tuned values — so it is safe to re-run.
        /// </summary>
        public static int RefreshShaders()
        {
            Shader want = LitShader();
            if (want == null) return 0;

            int changed = 0;
            string[] guids = AssetDatabase.FindAssets("t:Material", new[] { "Assets/Materials" });
            foreach (string guid in guids)
            {
                var mat = AssetDatabase.LoadAssetAtPath<Material>(AssetDatabase.GUIDToAssetPath(guid));
                if (mat == null) continue;

                // Only re-stamp lit-family materials this library owns. Materials on a
                // non-lit shader (the Skybox/Panoramic skybox, unlit UI/particle mats)
                // belong to a different family and must be left alone — blanket-swapping
                // them to a lit shader would break them.
                if (!IsLitShader(mat.shader)) continue;

                if (mat.shader != want)
                {
                    mat.shader = want;
                    EditorUtility.SetDirty(mat);
                    changed++;
                }
            }
            return changed;
        }

        private static bool IsLitShader(Shader shader)
        {
            if (shader == null) return false;
            string n = shader.name;
            return n == "Universal Render Pipeline/Lit"
                || n == "Standard"
                || n == "Standard (Specular setup)"
                || n == "Legacy Shaders/Diffuse";
        }

        /// <summary>Sets albedo colour under both URP (_BaseColor) and Built-in (_Color).</summary>
        public static void SetBaseColor(Material material, Color color)
        {
            if (material == null) return;
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
            if (material.HasProperty("_Color")) material.SetColor("_Color", color);
        }

        /// <summary>Sets albedo texture under both URP (_BaseMap) and Built-in (_MainTex).</summary>
        public static void SetBaseMap(Material material, Texture texture)
        {
            if (material == null || texture == null) return;
            if (material.HasProperty("_BaseMap")) material.SetTexture("_BaseMap", texture);
            if (material.HasProperty("_MainTex")) material.SetTexture("_MainTex", texture);
        }

        /// <summary>Sets smoothness/metallic under whichever names the shader exposes.</summary>
        public static void SetSurface(Material material, float smoothness, float metallic)
        {
            if (material == null) return;
            if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", smoothness);
            if (material.HasProperty("_Glossiness")) material.SetFloat("_Glossiness", smoothness);
            if (material.HasProperty("_Metallic")) material.SetFloat("_Metallic", metallic);
        }

        /// <summary>Turns on emission with the given colour.</summary>
        public static void SetEmission(Material material, Color emission)
        {
            if (material == null) return;
            material.EnableKeyword("_EMISSION");
            if (material.HasProperty("_EmissionColor")) material.SetColor("_EmissionColor", emission);
            material.globalIlluminationFlags = MaterialGlobalIlluminationFlags.RealtimeEmissive;
        }

        /// <summary>
        /// Creates (or returns an existing) additive-blended unlit material used as a
        /// "glow halo" — a flat quad placed as a child of a power-up so it reads as
        /// *emitting* light even under the Built-in pipeline, which has no Bloom
        /// post-process pass. Switching to URP+Bloom was rejected because the project
        /// ships under Built-in (CLAUDE.md §4) and re-tuning every material for URP is
        /// a wide-reaching regression risk for a one-pixel-detail gain.
        ///
        /// Uses <c>Particles/Additive</c>, a built-in shader that ships with every Unity
        /// install (no package dependency), supports per-vertex colour, and renders
        /// transparently with additive blending — exactly the "white core, coloured
        /// fringe" look that reads as a power-up glow at game speed.
        /// </summary>
        public static Material GetOrCreateGlow(string path, Color color)
        {
            var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (existing != null) return existing;

            Shader add = Shader.Find("Particles/Additive");
            if (add == null) { add = Shader.Find("Mobile/Particles/Additive"); }
            if (add == null)
            {
                Debug.LogWarning("[MaterialLibrary] No additive shader found — glow materials will fall back to Standard.");
                return GetOrCreate(path, color, 0.0f, 0f);
            }

            EnsureFolder(Path.GetDirectoryName(path).Replace('\\', '/'));
            var material = new Material(add) { name = Path.GetFileNameWithoutExtension(path) };
            // Additive shaders use _TintColor for the multiplied colour.
            if (material.HasProperty("_TintColor")) material.SetColor("_TintColor", color);
            else if (material.HasProperty("_Color")) material.SetColor("_Color", color);
            AssetDatabase.CreateAsset(material, path);
            return material;
        }

        /// <summary>
        /// Procedurally creates and persists a 64×64 radial-gradient texture used
        /// by the billboarded power-up glow halos. The texture is white in the
        /// centre and transparent at the edge with a smooth falloff, so when an
        /// additive material tints it by the power-up's hue the result reads as a
        /// true "soft glow sphere" rather than a flat disc — exactly the look
        /// Subway Surfers uses for its pickup glows.
        ///
        /// Setting the texture's wrap mode to <c>Clamp</c> is essential: a bilinear
        /// sample at uv = 0.5 / 0.5 returns the centre value, but a Repeat wrap
        /// would let uv 0 and 1 (the texture's edge) average into a brighter-than-
        /// expected ring at the quad boundary.
        ///
        /// Returns the existing asset untouched on subsequent runs, so re-running
        /// setup never regenerates the texture (it's pixel-identical each time —
        /// skip the cost).
        /// </summary>
        public static Texture2D GetOrCreateGlowTexture(string path)
        {
            var existing = AssetDatabase.LoadAssetAtPath<Texture2D>(path);
            if (existing != null) return existing;

            EnsureFolder(Path.GetDirectoryName(path).Replace('\\', '/'));

            const int size = 128;
            var tex = new Texture2D(size, size, TextureFormat.RGBA32, mipChain: false);
            tex.wrapMode = TextureWrapMode.Clamp;
            tex.filterMode = FilterMode.Bilinear;
            tex.name = Path.GetFileNameWithoutExtension(path);

            float centre = (size - 1) * 0.5f;
            float maxR = centre;
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float dx = (x - centre) / maxR;
                    float dy = (y - centre) / maxR;
                    float r = Mathf.Sqrt(dx * dx + dy * dy);
                    float clamped = Mathf.Clamp01(r);
                    float falloff = 1f - clamped;
                    float intensity = falloff * falloff * (3f - 2f * falloff);
                    intensity = Mathf.Pow(intensity, 1.6f);

                    float alpha = intensity * 0.85f;
                    tex.SetPixel(x, y, new Color(intensity, intensity, intensity, alpha));
                }
            }
            tex.Apply();

            byte[] png = tex.EncodeToPNG();
            File.WriteAllBytes(path, png);
            AssetDatabase.ImportAsset(path, ImportAssetOptions.ForceUpdate);

            Object.DestroyImmediate(tex);
            return AssetDatabase.LoadAssetAtPath<Texture2D>(path);
        }

        /// <summary>
        /// Creates (or returns existing) a native URP additive-blended material textured by
        /// the radial glow texture.
        /// </summary>
        public static Material GetOrCreateTexturedGlow(string materialPath, string texturePath, Color tintColor)
        {
            var existing = AssetDatabase.LoadAssetAtPath<Material>(materialPath);
            if (existing != null)
            {
                ConfigureGlowMaterial(existing, tintColor);
                return existing;
            }

            Shader urpShader = Shader.Find("Universal Render Pipeline/Particles/Unlit");
            if (urpShader == null) urpShader = Shader.Find("Universal Render Pipeline/Unlit");
            if (urpShader == null) urpShader = Shader.Find("Mobile/Particles/Additive");

            EnsureFolder(Path.GetDirectoryName(materialPath).Replace('\\', '/'));
            Texture2D tex = GetOrCreateGlowTexture(texturePath);

            var material = new Material(urpShader) { name = Path.GetFileNameWithoutExtension(materialPath) };
            if (material.HasProperty("_BaseMap")) material.SetTexture("_BaseMap", tex);
            if (material.HasProperty("_MainTex")) material.SetTexture("_MainTex", tex);
            ConfigureGlowMaterial(material, tintColor);

            AssetDatabase.CreateAsset(material, materialPath);
            return material;
        }

        private static void ConfigureGlowMaterial(Material material, Color tintColor)
        {
            if (material == null) return;
            if (material.HasProperty("_Surface")) material.SetFloat("_Surface", 1f);
            if (material.HasProperty("_Blend")) material.SetFloat("_Blend", 1f);
            if (material.HasProperty("_SrcBlend")) material.SetFloat("_SrcBlend", (float)UnityEngine.Rendering.BlendMode.SrcAlpha);
            if (material.HasProperty("_DstBlend")) material.SetFloat("_DstBlend", (float)UnityEngine.Rendering.BlendMode.One);
            if (material.HasProperty("_ZWrite")) material.SetFloat("_ZWrite", 0f);

            material.renderQueue = (int)UnityEngine.Rendering.RenderQueue.Transparent + 100;

            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", tintColor);
            if (material.HasProperty("_TintColor")) material.SetColor("_TintColor", tintColor);
            if (material.HasProperty("_Color")) material.SetColor("_Color", tintColor);
            if (material.HasProperty("_EmissionColor")) material.SetColor("_EmissionColor", tintColor);
        }

        /// <summary>
        /// Creates a transparent material with alpha blending and emission for shields and crystal orbs.
        /// </summary>
        public static Material GetOrCreateTransparent(string path, Color color, Color emission)
        {
            var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (existing != null) return existing;

            bool urpActive = GraphicsSettings.currentRenderPipeline != null;
            Shader shader = urpActive ? (Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Universal Render Pipeline/Lit"))
                                      : (Shader.Find("Standard") ?? Shader.Find("Unlit/Transparent"));

            EnsureFolder(Path.GetDirectoryName(path).Replace('\\', '/'));

            var material = new Material(shader) { name = Path.GetFileNameWithoutExtension(path) };
            if (material.HasProperty("_Surface")) material.SetFloat("_Surface", 1f);
            if (material.HasProperty("_Blend")) material.SetFloat("_Blend", 0f);

            if (material.HasProperty("_Mode")) material.SetFloat("_Mode", 3f);
            if (material.HasProperty("_SrcBlend")) material.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.One);
            if (material.HasProperty("_DstBlend")) material.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            if (material.HasProperty("_ZWrite")) material.SetInt("_ZWrite", 0);
            material.DisableKeyword("_ALPHATEST_ON");
            material.DisableKeyword("_ALPHABLEND_ON");
            material.EnableKeyword("_ALPHAPREMULTIPLY_ON");
            material.renderQueue = (int)UnityEngine.Rendering.RenderQueue.Transparent;

            SetBaseColor(material, color);
            if (material.HasProperty("_EmissionColor"))
            {
                material.EnableKeyword("_EMISSION");
                material.SetColor("_EmissionColor", emission);
            }

            AssetDatabase.CreateAsset(material, path);
            return material;
        }

        /// <summary>
        /// Loads the material at <paramref name="path"/>, creating it if absent.
        /// Returns the existing asset untouched when one is already there, so re-running
        /// setup never overwrites hand-tuned values.
        /// </summary>
        public static Material GetOrCreate(string path, Color color, float smoothness = 0.35f, float metallic = 0.1f)
        {
            var existing = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (existing != null) return existing;

            Shader shader = LitShader();
            if (shader == null)
            {
                Debug.LogError("[MaterialLibrary] No usable lit shader found. Is the render pipeline package installed?");
                return null;
            }

            EnsureFolder(Path.GetDirectoryName(path).Replace('\\', '/'));

            var material = new Material(shader) { name = Path.GetFileNameWithoutExtension(path) };
            SetBaseColor(material, color);
            SetSurface(material, smoothness, metallic);

            AssetDatabase.CreateAsset(material, path);
            return material;
        }

        /// <summary>Creates every Assets/Materials folder path component that is missing.</summary>
        public static void EnsureFolder(string path)
        {
            if (string.IsNullOrEmpty(path) || AssetDatabase.IsValidFolder(path)) return;

            string parent = Path.GetDirectoryName(path).Replace('\\', '/');
            string leaf = Path.GetFileName(path);
            if (string.IsNullOrEmpty(parent) || string.IsNullOrEmpty(leaf)) return;

            EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent, leaf);
        }

        // ------------------------------------------------------------------
        // Shared world palette. Quaternius meshes have material slots but no
        // materials, so these are what make the road and props look like anything.
        // ------------------------------------------------------------------

        // Asphalt is near-black with a slight blue cast, the way real tarmac reads under
        // daylight. The previous 0.22 grey looked like wet concrete and washed the lane
        // markings out; against 0.08 the white lines actually read as markings.
        // Smoothness bumped 0.22 -> 0.42 for a sharper sunlight hot-spot on the road:
        // under Built-in with Soft shadows + the warm sun angle, this makes the
        // near-kilometre of visible road subtly glint as it scrolls rather than reading
        // as a flat matte plane.
        public static Material Asphalt() => GetOrCreate($"{WorldFolder}/Asphalt.mat", new Color(0.068f, 0.062f, 0.054f), 0.42f, 0f);
        public static Material Pavement() => GetOrCreate($"{WorldFolder}/Pavement.mat", new Color(0.62f, 0.585f, 0.535f), 0.08f, 0f);
        public static Material RoadLine() => GetOrCreate($"{WorldFolder}/RoadLine.mat", new Color(0.97f, 0.96f, 0.92f), 0.15f, 0f);
        // Metal smoothness 0.70 -> 0.82 — the warm directional sun now bounces hard off
        // lampposts / street furniture / industrial facings, which adds a per-frame
        // highlight that reads as "polished city" instead of "Cardboard grey metal".
        public static Material Metal() => GetOrCreate($"{WorldFolder}/Metal.mat", new Color(0.60f, 0.575f, 0.535f), 0.82f, 0.85f);
        public static Material Foliage() => GetOrCreate($"{WorldFolder}/Foliage.mat", new Color(0.29f, 0.55f, 0.20f), 0.1f, 0f);

        /// <summary>
        /// Ground cover beside the road. Deliberately a shade darker and less saturated
        /// than <see cref="Foliage"/> so tree canopies still read against it instead of
        /// dissolving into one green mass at speed.
        /// </summary>
        public static Material Grass() => GetOrCreate($"{WorldFolder}/Grass.mat", new Color(0.36f, 0.52f, 0.22f), 0.05f, 0f);
        public static Material Skin() => GetOrCreate($"{WorldFolder}/Skin.mat", new Color(0.85f, 0.68f, 0.55f), 0.1f, 0f);
        public static Material Clothing() => GetOrCreate($"{WorldFolder}/Clothing.mat", new Color(0.30f, 0.38f, 0.58f), 0.1f, 0f);

        /// <summary>
        /// Re-applies the world palette's colours to existing .mat assets.
        ///
        /// <see cref="GetOrCreate"/> deliberately returns an existing material untouched
        /// so re-running setup never clobbers hand-tuning — which also means retuning a
        /// colour in code has no effect on a project that already ran setup once. This is
        /// the explicit opt-in for "I changed the palette, push it through".
        /// </summary>
        public static void RestampWorldPalette()
        {
            Restamp($"{WorldFolder}/Asphalt.mat", new Color(0.068f, 0.062f, 0.054f), 0.42f, 0f);
            Restamp($"{WorldFolder}/Pavement.mat", new Color(0.62f, 0.585f, 0.535f), 0.08f, 0f);
            Restamp($"{WorldFolder}/RoadLine.mat", new Color(0.97f, 0.96f, 0.92f), 0.15f, 0f);
            Restamp($"{WorldFolder}/Metal.mat", new Color(0.60f, 0.575f, 0.535f), 0.82f, 0.85f);
            Restamp($"{WorldFolder}/Foliage.mat", new Color(0.29f, 0.55f, 0.20f), 0.1f, 0f);
            Restamp($"{WorldFolder}/Grass.mat", new Color(0.36f, 0.52f, 0.22f), 0.05f, 0f);
        }

        private static void Restamp(string path, Color color, float smoothness, float metallic)
        {
            var mat = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (mat == null) return;
            SetBaseColor(mat, color);
            SetSurface(mat, smoothness, metallic);
            EditorUtility.SetDirty(mat);
        }

        /// <summary>
        /// Assigns materials to a renderer's slots <b>by the slot's own name</b>, which is
        /// what makes a Quaternius mesh look deliberate rather than randomly painted.
        ///
        /// These meshes name their slots after the colour they expect — the road tile
        /// carries <c>Black</c> / <c>Grey</c> / <c>White</c> (asphalt, kerb, lane
        /// markings), a tree carries <c>Leaves</c> / <c>Tree</c>, a streetlight carries
        /// <c>Glass</c> / <c>Green</c> / <c>Light</c>. Assigning by index instead — which
        /// is what the positional overload does — paints the lane markings with the kerb
        /// colour whenever the slot order differs from the palette order.
        ///
        /// Slots with no entry in <paramref name="byName"/> fall back to
        /// <paramref name="fallback"/>, so a mesh with an unexpected slot still renders.
        /// Matching is case-insensitive.
        /// </summary>
        public static void AssignNamedPalette(GameObject root,
                                              System.Collections.Generic.Dictionary<string, Material> byName,
                                              Material fallback)
        {
            if (root == null || byName == null) return;

            var renderers = root.GetComponentsInChildren<MeshRenderer>(true);
            foreach (MeshRenderer renderer in renderers)
            {
                if (renderer == null) continue;

                Material[] slots = renderer.sharedMaterials;
                if (slots.Length == 0) continue;

                var assigned = new Material[slots.Length];
                for (int s = 0; s < slots.Length; s++)
                {
                    // The slot keeps the FBX's material name even when the material
                    // itself is null, which is exactly the case for these packs.
                    string slotName = slots[s] != null ? slots[s].name : null;

                    Material chosen = null;
                    if (!string.IsNullOrEmpty(slotName))
                    {
                        foreach (var pair in byName)
                        {
                            if (string.Equals(pair.Key, slotName, System.StringComparison.OrdinalIgnoreCase))
                            {
                                chosen = pair.Value;
                                break;
                            }
                        }
                    }

                    assigned[s] = chosen ?? fallback;
                }
                renderer.sharedMaterials = assigned;
            }
        }

        /// <summary>
        /// Assigns a palette across a renderer's material slots, cycling if the mesh has
        /// more slots than the palette has entries. Quaternius meshes carry several slots
        /// (body / glass / trim) with nothing in them.
        ///
        /// Prefer <see cref="AssignNamedPalette"/> when the mesh names its slots.
        /// </summary>
        public static void AssignPalette(GameObject root, params Material[] palette)
        {
            if (root == null || palette == null || palette.Length == 0) return;

            var renderers = root.GetComponentsInChildren<MeshRenderer>(true);
            for (int r = 0; r < renderers.Length; r++)
            {
                MeshRenderer renderer = renderers[r];
                if (renderer == null) continue;

                int slots = renderer.sharedMaterials.Length;
                if (slots == 0) continue;

                var assigned = new Material[slots];
                for (int s = 0; s < slots; s++) assigned[s] = palette[s % palette.Length];
                renderer.sharedMaterials = assigned;
            }
        }
    }
}
