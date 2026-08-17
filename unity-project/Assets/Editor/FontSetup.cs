using System.IO;
using UnityEditor;
using UnityEngine;
using TMPro;

namespace GDGGo.EditorTools
{
    /// <summary>
    /// Builds a TextMeshPro font asset from the Kenney Future TTF that ships with the UI
    /// pack, for use as the game's <b>display</b> face.
    ///
    /// It is deliberately <b>not</b> made the project-wide default. Kenney Future draws
    /// its lowercase letters as small-caps forms, so body text and — worse — anything the
    /// player types into an input field comes out looking uppercase. That is right for a
    /// score readout or a title and wrong for a username field.
    ///
    /// So: Kenney for headings, numbers and buttons (<see cref="Display"/>), and TMP's
    /// LiberationSans for fields, status lines and anything the player reads as prose
    /// (<see cref="Body"/>). Callers pick per label rather than relying on a global.
    ///
    /// The font asset is generated at 90px with 9px padding into a 1024² atlas: large
    /// enough that the 76px game-over score stays crisp, small enough that the whole
    /// ASCII range fits one page, which keeps it to a single draw call.
    /// </summary>
    public static class FontSetup
    {
        private const string SourceTtf = "Assets/UI/KenneyUI/Kenney Future.ttf";
        private const string OutputFolder = "Assets/UI/Fonts";
        private const string OutputAsset = OutputFolder + "/KenneyFuture SDF.asset";

        // ASCII printable range. Enough for scores, names and every label in the game.
        private const string CharacterSet =
            "!\"#$%&'()*+,-./0123456789:;<=>?@" +
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`" +
            "abcdefghijklmnopqrstuvwxyz{|}~ ";

        [MenuItem("GDG Go/6. Build Kenney Font Asset", priority = 50)]
        public static void Build()
        {
            // Always repair the project default first. If a previous run left it pointing
            // at an empty font asset, every label in every scene renders blank until this
            // is undone — and that state survives deleting the offending asset, because
            // the reference lives in TMP Settings.asset.
            RestoreDefaultFont();

            var ttf = AssetDatabase.LoadAssetAtPath<Font>(SourceTtf);
            if (ttf == null)
            {
                Debug.LogError($"[FontSetup] {SourceTtf} not found.");
                return;
            }

            MaterialLibrary.EnsureFolder(OutputFolder);

            // Always rebuild. A previously generated asset may exist but be EMPTY: the
            // first version of this code created the font Dynamic and called
            // TryAddCharacters after CreateAsset, which produced a valid-looking .asset
            // with an atlas, a material, and *zero* characters in its table. TMP then
            // silently fell back to LiberationSans for every label, which is exactly the
            // "the font never changed" symptom.
            if (AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(OutputAsset) != null)
                AssetDatabase.DeleteAsset(OutputAsset);

            // Create DYNAMIC first. TryAddCharacters can only rasterise new glyphs into a
            // dynamic atlas — on a Static asset it is a no-op that returns false, which is
            // why the previous attempt produced an asset with an empty character table.
            // The mode is switched to Static below, after the glyphs are in.
            TMP_FontAsset font = TMP_FontAsset.CreateFontAsset(
                ttf,
                samplingPointSize: 90,
                atlasPadding: 9,
                renderMode: UnityEngine.TextCore.LowLevel.GlyphRenderMode.SDFAA,
                atlasWidth: 1024,
                atlasHeight: 1024,
                atlasPopulationMode: AtlasPopulationMode.Dynamic,
                enableMultiAtlasSupport: true);

            if (font == null)
            {
                Debug.LogError("[FontSetup] TMP_FontAsset.CreateFontAsset returned null.");
                return;
            }

            font.name = Path.GetFileNameWithoutExtension(OutputAsset);

            // Rasterise every glyph we will ever need, while the atlas is still dynamic
            // and while this is all still in memory.
            if (!font.TryAddCharacters(CharacterSet))
                Debug.LogWarning("[FontSetup] Some characters could not be added to the atlas — " +
                                 "raise atlasWidth/atlasHeight if text shows missing glyphs.");

            // Now freeze it. Static means the shipped build reads baked glyphs instead of
            // trying to rasterise from a TTF that may not be present in a WebGL player.
            font.atlasPopulationMode = AtlasPopulationMode.Static;

            AssetDatabase.CreateAsset(font, OutputAsset);

            // The atlas texture and material are sub-assets; without adding them the
            // .asset saves referencing objects that were never written, and renders nothing.
            if (font.atlasTexture != null)
            {
                font.atlasTexture.name = font.name + " Atlas";
                AssetDatabase.AddObjectToAsset(font.atlasTexture, font);
            }
            if (font.material != null)
            {
                font.material.name = font.name + " Material";
                AssetDatabase.AddObjectToAsset(font.material, font);
            }

            EditorUtility.SetDirty(font);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            // Verify rather than assume. An empty character table is the failure mode that
            // shipped once and is invisible at a glance: the asset exists, has an atlas,
            // and renders nothing.
            var written = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(OutputAsset);
            int glyphs = written != null && written.characterTable != null ? written.characterTable.Count : 0;
            if (glyphs == 0)
            {
                // Delete it rather than leave it lying around. An empty font asset that
                // anything still references renders every label blank and floods the
                // console with "Please assign a Font Asset to this <name> gameobject" —
                // which is far worse than simply not having the display face, because
                // Display() falls back to Body() and the UI keeps working.
                AssetDatabase.DeleteAsset(OutputAsset);
                AssetDatabase.Refresh();
                Debug.LogWarning("[FontSetup] The atlas bake produced ZERO characters, so the empty font " +
                                 "asset was deleted. The UI will use LiberationSans throughout — " +
                                 "readable, just not the Kenney display face.");
                return;
            }

            Debug.Log($"[FontSetup] Kenney Future built as the display face with {glyphs} glyphs. " +
                      "Body text stays on LiberationSans — Kenney's lowercase is small-caps, " +
                      "which makes typed input look shouted.");
        }

        /// <summary>
        /// The display face: headings, buttons, score readouts. Falls back to the body
        /// font if the asset has not been generated yet, so a screen still builds.
        /// </summary>
        public static TMP_FontAsset Display()
        {
            var font = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(OutputAsset);
            // Non-null is not enough — a font asset with an empty character table renders
            // nothing at all. Check it actually has glyphs before handing it out.
            bool usable = font != null && font.characterTable != null && font.characterTable.Count > 0;
            return usable ? font : Body();
        }

        /// <summary>
        /// The body face: input fields, status lines, anything read as prose.
        ///
        /// Loads LiberationSans <b>by path</b> rather than trusting
        /// <c>TMP_Settings.defaultFontAsset</c>. An earlier version of this file pointed
        /// that setting at the Kenney asset; the setting persisted in TMP Settings.asset
        /// even after the code that wrote it was removed, so every label in the project
        /// resolved to a font with zero glyphs and Unity logged
        /// "Please assign a Font Asset to this &lt;name&gt; gameobject" a couple of hundred
        /// times. Reading the default is exactly the dependency that broke.
        /// </summary>
        public static TMP_FontAsset Body()
        {
            var liberation = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(LiberationPath);
            if (liberation != null) return liberation;
            return SafeDefaultFont();
        }

        private static TMP_FontAsset SafeDefaultFont()
        {
            var fallback = Resources.Load<TMP_FontAsset>("Fonts & Materials/LiberationSans SDF");
            if (fallback != null) return fallback;
            return TMP_Settings.defaultFontAsset;
        }

        private const string LiberationPath =
            "Assets/TextMesh Pro/Resources/Fonts & Materials/LiberationSans SDF.asset";

        /// <summary>
        /// Points TMP's project-wide default at LiberationSans.
        ///
        /// This is a repair, not a preference: if the default is left pointing at a font
        /// asset with an empty character table, every TMP label in every scene silently
        /// renders nothing. LiberationSans ships with TMP and always has glyphs, so it is
        /// the only safe default. The Kenney face is applied per-label via
        /// <see cref="Display"/>, never globally.
        /// </summary>
        public static void RestoreDefaultFont()
        {
            var liberation = AssetDatabase.LoadAssetAtPath<TMP_FontAsset>(LiberationPath);
            if (liberation == null)
            {
                Debug.LogWarning($"[FontSetup] {LiberationPath} not found — cannot restore the TMP default font. " +
                                 "Import TMP Essential Resources (Window > TextMeshPro).");
                return;
            }

            TMP_Settings settings = TMP_Settings.instance;
            if (settings == null) return;

            var so = new SerializedObject(settings);
            SerializedProperty prop = so.FindProperty("m_defaultFontAsset");
            if (prop == null) return;

            if (prop.objectReferenceValue == liberation) return;

            prop.objectReferenceValue = liberation;
            so.ApplyModifiedProperties();
            EditorUtility.SetDirty(settings);
            AssetDatabase.SaveAssets();
            Debug.Log("[FontSetup] TMP default font restored to LiberationSans.");
        }

    }
}
