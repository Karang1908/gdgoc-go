using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace GDGGo.EditorTools
{
    /// <summary>
    /// Forces every texture under Assets/UI to import as a Sprite, and gives the
    /// nine-slice panels and buttons a real border.
    ///
    /// This exists because a PNG dropped into a Unity project defaults to
    /// <c>TextureImporterType.Default</c> — a 3D texture. <c>LoadAssetAtPath&lt;Sprite&gt;</c>
    /// then returns <b>null</b>, and a UI <c>Image</c> with a null sprite silently draws a
    /// plain white quad instead of erroring. Every panel, button, logo and bar in the UI
    /// was rendering as a flat rectangle for exactly that reason: 527 PNGs under
    /// Assets/UI, none of them a Sprite.
    ///
    /// The border matters just as much. <c>Image.Type.Sliced</c> with a zero
    /// <c>spriteBorder</c> silently degrades to <c>Simple</c>, so a rounded panel would
    /// still stretch its corners into smears. Kenney's UI pack draws its corner radius
    /// inside roughly the outer sixth of each sprite, so the border is derived from the
    /// image's own size rather than hardcoded — the pack ships panels at several
    /// resolutions.
    /// </summary>
    public static class UIAssetImporter
    {
        private const string UIRoot = "Assets/UI";

        /// <summary>
        /// Sprites that get a nine-slice border. Anything whose filename starts with one
        /// of these is stretched by the UI rather than drawn at its native size, so its
        /// corners must be protected.
        /// </summary>
        private static readonly string[] NineSlicePrefixes =
        {
            "panel_", "button_", "bar_", "input_", "checkbox_", "slide_", "progress_",
        };

        [MenuItem("GDG Go/5. Fix Asset Imports (UI sprites + model axes)", priority = 40)]
        public static void FixEverything()
        {
            FixAll();
            ModelAxisFixer.FixQuaterniusAxes();
        }

        [MenuItem("GDG Go/5b. Fix UI Sprite Imports Only", priority = 41)]
        public static void FixAll()
        {
            if (!AssetDatabase.IsValidFolder(UIRoot))
            {
                Debug.LogError($"[UIAssetImporter] {UIRoot} does not exist.");
                return;
            }

            string[] guids = AssetDatabase.FindAssets("t:Texture2D", new[] { UIRoot });
            var changed = new List<string>();

            try
            {
                AssetDatabase.StartAssetEditing();

                foreach (string guid in guids)
                {
                    string path = AssetDatabase.GUIDToAssetPath(guid);
                    if (Apply(path)) changed.Add(path);
                }
            }
            finally
            {
                // Must run even if one importer throws, or the AssetDatabase stays
                // locked for the rest of the editor session.
                AssetDatabase.StopAssetEditing();
            }

            AssetDatabase.Refresh();
            Debug.Log($"[UIAssetImporter] Re-imported {changed.Count} of {guids.Length} textures under {UIRoot} as sprites.");
        }

        /// <summary>Applies sprite settings to one texture. Returns true if anything changed.</summary>
        private static bool Apply(string path)
        {
            var importer = AssetImporter.GetAtPath(path) as TextureImporter;
            if (importer == null) return false;

            bool dirty = false;

            if (importer.textureType != TextureImporterType.Sprite)
            {
                importer.textureType = TextureImporterType.Sprite;
                dirty = true;
            }

            if (importer.spriteImportMode != SpriteImportMode.Single)
            {
                importer.spriteImportMode = SpriteImportMode.Single;
                dirty = true;
            }

            // Kenney's UI PNGs have real alpha; without this the transparent corners of a
            // rounded panel composite against black instead of the scene behind them.
            if (!importer.alphaIsTransparency)
            {
                importer.alphaIsTransparency = true;
                dirty = true;
            }

            // UI is drawn 1:1 at reference resolution; mip maps only blur it and cost memory.
            if (importer.mipmapEnabled)
            {
                importer.mipmapEnabled = false;
                dirty = true;
            }

            if (importer.wrapMode != TextureWrapMode.Clamp)
            {
                importer.wrapMode = TextureWrapMode.Clamp;
                dirty = true;
            }

            Vector4 border = BorderFor(path, importer);
            if (importer.spriteBorder != border)
            {
                importer.spriteBorder = border;
                dirty = true;
            }

            if (dirty)
            {
                EditorUtility.SetDirty(importer);
                importer.SaveAndReimport();
            }
            return dirty;
        }

        /// <summary>
        /// Nine-slice border in pixels, or zero for sprites drawn at native size.
        /// Derived from the source image so it holds across the pack's several sizes;
        /// clamped so the border can never exceed half the image and collapse the centre.
        /// </summary>
        private static Vector4 BorderFor(string path, TextureImporter importer)
        {
            string file = Path.GetFileName(path).ToLowerInvariant();

            bool nineSlice = false;
            foreach (string prefix in NineSlicePrefixes)
            {
                if (file.StartsWith(prefix)) { nineSlice = true; break; }
            }
            if (!nineSlice) return Vector4.zero;

            importer.GetSourceTextureWidthAndHeight(out int width, out int height);
            if (width <= 0 || height <= 0) return Vector4.zero;

            // Kenney's corner radius sits inside roughly the outer sixth.
            float inset = Mathf.Min(width, height) / 6f;
            // Half the smaller axis is the hard ceiling; back off to 40% for margin.
            float maxInset = Mathf.Min(width, height) * 0.4f;
            float b = Mathf.Floor(Mathf.Clamp(inset, 2f, maxInset));

            return new Vector4(b, b, b, b);
        }
    }
}
