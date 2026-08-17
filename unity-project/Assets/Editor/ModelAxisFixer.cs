using UnityEditor;
using UnityEngine;

namespace GDGGo.EditorTools
{
    /// <summary>
    /// Turns <b>off</b> Unity's axis-conversion bake for every Quaternius FBX.
    ///
    /// <b>This class previously did the opposite, and that was a bug.</b> Recording why,
    /// because the evidence for the wrong conclusion looked convincing.
    ///
    /// Reading the raw vertex arrays out of the FBX shows the long axis in Z, which looks
    /// exactly like a Z-up Blender export:
    ///
    /// <code>
    ///   Street_Straight.fbx   raw verts:  X 2.000   Y 2.000   Z 0.250
    /// </code>
    ///
    /// But raw vertices are not the imported mesh. The FBX's own Model node carries a
    /// correction that Unity applies on import:
    ///
    /// <code>
    ///   Lcl Rotation = [-90, 0, 0]      <- stands the geometry upright
    ///   Lcl Scaling  = [100, 100, 100]  <- centimetre source -> metre scene
    /// </code>
    ///
    /// So the delivered mesh is already Y-up and 200 x 25 x 200 units. Setting
    /// <c>bakeAxisConversion = true</c> applied a <i>second</i> -90 deg rotation, tipping
    /// upright meshes onto their sides — the road tile's measured depth collapsed from
    /// 12 units to 0.015, so RoadScroller spawned tiles 1.5 cm apart, hit its
    /// 32-per-frame cap, and the road vanished entirely.
    ///
    /// The lesson: measure the <i>imported</i> mesh (Renderer.bounds), never the raw
    /// vertex array. This menu item now exists to undo the damage.
    ///
    /// Kenney packs are already Y-up and are deliberately not touched.
    ///
    /// The character packs (AnimatedMen / AnimatedWomen) get an additional treatment:
    /// they ship with <c>animationType = Generic</c> and <c>avatarSetup = NoAvatar</c>,
    /// so an attached Animator has no Avatar to drive and the embedded clips won't play.
    /// Each FBX carries 11 embedded clips (Man/Female_Walk, Man/Female_Idle, etc.) as
    /// sub-assets, and we now set <c>avatarSetup = CreateFromThisModel</c> so Unity
    /// auto-emits a <b>Generic Avatar</b> per FBX (verified: each FBX produces a
    /// <c>{Name}Avatar</c> sub-asset AND keeps all 22 clip sub-assets).
    ///
    /// Humanoid was attempted first and rejected: setting <c>animationType = Human</c>
    /// on these FBXs SILENTLY DROP the embedded clips (verified: <c>LoadAllAssetsAtPath</c>
    /// returned zero AnimationClip sub-assets and editor reflection showed empty
    /// <c>importedTakeInfos</c>). Generic is the right choice for this pack because we
    /// only ever play each FBX's own walk clip on its own rig — no cross-FBX retargeting
    /// needed, and Generic preserves the embedded clips without any per-take config.
    /// </summary>
    public static class ModelAxisFixer
    {
        private const string QuaterniusRoot = "Assets/Models/Quaternius";

        /// <summary>
        /// Import multiplier for the Quaternius prop/street/RPG packs.
        ///
        /// Their mesh data is authored in a tiny unit scale — <c>Street_Straight</c>'s
        /// <c>Mesh.bounds</c> is 0.02 x 0.02 x 0.0025 — and <c>useFileScale</c> honours
        /// it, so at default settings every prop arrives at roughly 1/100th of a usable
        /// size and any prefab built from one collapses to a zero-size sliver. Measured
        /// in the editor, not inferred: at globalScale 100 the road tile delivers
        /// 200 x 200 x 25, which the prefab scales down to a 12-unit tile.
        /// </summary>
        private const float PropImportScale = 100f;

        [MenuItem("GDG Go/5c. Clear Quaternius Axis Bake", priority = 42)]
        public static void FixQuaterniusAxes()
        {
            if (!AssetDatabase.IsValidFolder(QuaterniusRoot))
            {
                Debug.LogError($"[ModelAxisFixer] {QuaterniusRoot} does not exist.");
                return;
            }

            string[] guids = AssetDatabase.FindAssets("t:Model", new[] { QuaterniusRoot });
            int changed = 0;

            try
            {
                AssetDatabase.StartAssetEditing();

                foreach (string guid in guids)
                {
                    string path = AssetDatabase.GUIDToAssetPath(guid);
                    var importer = AssetImporter.GetAtPath(path) as ModelImporter;
                    if (importer == null) continue;

                    // The character packs are already authored at metre scale — a walking
                    // man measures 1.96 x 4.93 x 1.13 straight out of the file. Applying
                    // the x100 the prop packs need would deliver a 49,000-unit pedestrian.
                    bool isCharacter = path.Contains("/AnimatedMen/") || path.Contains("/AnimatedWomen/");

                    float wantScale = isCharacter ? 1f : PropImportScale;
                    bool wantFileScale = isCharacter;

                    bool dirty = false;
                    if (importer.bakeAxisConversion) { importer.bakeAxisConversion = false; dirty = true; }
                    if (importer.useFileScale != wantFileScale) { importer.useFileScale = wantFileScale; dirty = true; }
                    if (!Mathf.Approximately(importer.globalScale, wantScale)) { importer.globalScale = wantScale; dirty = true; }

                    // Characters need a Generic rig + per-FBX Avatar so an Animator can
                    // play this FBX's own Man_Walk / Female_Walk clip on its own rig.
                    // Generic (rather than Human) is the right choice here: these FBX
                    // ship clips keyed to their rig's bone hierarchy (Hips/Shoulder/etc.),
                    // and attempting Humanoid retargeting on them SILENTLY DROPS the
                    // embedded clips — verified via AssetDatabase.LoadAllAssetsAtPath
                    // (zero AnimationClips after a Humanoid re-import). Under Generic
                    // the FBX keeps all 22 embedded clip sub-assets AND a Generic Avatar
                    // is auto-generated. We can play a clip back on the prefab's Animator
                    // using a per-FBX controller that references that FBX's own walk clip.
                    if (isCharacter && importer.animationType != ModelImporterAnimationType.Generic)
                    {
                        importer.animationType = ModelImporterAnimationType.Generic;
                        dirty = true;
                    }
                    if (isCharacter && importer.avatarSetup != ModelImporterAvatarSetup.CreateFromThisModel)
                    {
                        importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
                        dirty = true;
                    }

                    if (!dirty) continue;

                    EditorUtility.SetDirty(importer);
                    importer.SaveAndReimport();
                    changed++;
                }
            }
            finally
            {
                // Must run even if an importer throws, or the AssetDatabase stays locked.
                AssetDatabase.StopAssetEditing();
            }

            AssetDatabase.Refresh();
            Debug.Log($"[ModelAxisFixer] Re-imported {changed} of {guids.Length} Quaternius models " +
                      $"(props at globalScale={PropImportScale}, characters at file scale + Generic rig + per-FBX Avatar, " +
                      "axis bake cleared).");
        }

        /// <summary>
        /// Silences the <c>ImportFBX Errors: The mesh ... has invalid normals</c> spam from
        /// the DowntownCity pack.
        ///
        /// That pack ships 153 FBX files whose exporter wrote broken normals. Unity logs a
        /// warning for each one on every reimport, which is the bulk of the console noise
        /// and buries the warnings that actually matter. <b>Nothing in the game references
        /// a single one of them</b> — verified against every scene and prefab — and at
        /// 6.5 MB they are pure weight against a 25 MB WebGL budget.
        ///
        /// Rather than delete the user's files, this sets each importer to recalculate
        /// normals, which both fixes the meshes and stops the warning. Deleting the folder
        /// by hand is also fine, and would reclaim the 6.5 MB.
        /// </summary>
        [MenuItem("GDG Go/5d. Silence DowntownCity Import Warnings", priority = 43)]
        public static void FixDowntownCityNormals()
        {
            const string Folder = "Assets/Models/Quaternius/DowntownCity";
            if (!AssetDatabase.IsValidFolder(Folder))
            {
                Debug.Log($"[ModelAxisFixer] {Folder} not present — nothing to do.");
                return;
            }

            string[] guids = AssetDatabase.FindAssets("t:Model", new[] { Folder });
            int changed = 0;

            try
            {
                AssetDatabase.StartAssetEditing();
                foreach (string guid in guids)
                {
                    string path = AssetDatabase.GUIDToAssetPath(guid);
                    var importer = AssetImporter.GetAtPath(path) as ModelImporter;
                    if (importer == null) continue;
                    if (importer.importNormals == ModelImporterNormals.Calculate) continue;

                    // Ignore the broken normals in the file and derive them from geometry.
                    importer.importNormals = ModelImporterNormals.Calculate;
                    EditorUtility.SetDirty(importer);
                    importer.SaveAndReimport();
                    changed++;
                }
            }
            finally
            {
                AssetDatabase.StopAssetEditing();
            }

            AssetDatabase.Refresh();
            Debug.Log($"[ModelAxisFixer] Set {changed} of {guids.Length} DowntownCity models to recalculate normals. " +
                      "Nothing in the game uses this pack — deleting the folder would also reclaim ~6.5 MB.");
        }
    }
}
