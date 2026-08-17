// Stub of the UnityEditor subset used by gdg-go's editor tooling.
#pragma warning disable CS0067, CS0649, CS0169, CS0414

using System;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace UnityEditor
{
    [AttributeUsage(AttributeTargets.Method)]
    public class MenuItem : Attribute
    {
        public MenuItem(string path) { }
        public MenuItem(string path, bool validate) { }
        public MenuItem(string path, bool validate, int priority) { }
        public int priority;
    }

    [AttributeUsage(AttributeTargets.Class)] public class InitializeOnLoad : Attribute { }
    [AttributeUsage(AttributeTargets.Method)] public class InitializeOnLoadMethod : Attribute { }
    [AttributeUsage(AttributeTargets.Class)] public class CustomEditor : Attribute { public CustomEditor(Type t) { } }

    public static class AssetDatabase
    {
        public static T LoadAssetAtPath<T>(string path) where T : UnityEngine.Object => null;
        public static UnityEngine.Object LoadAssetAtPath(string path, Type t) => null;
        public static UnityEngine.Object[] LoadAllAssetsAtPath(string path) => new UnityEngine.Object[0];
        public static UnityEngine.Object LoadMainAssetAtPath(string path) => null;
        public static void CreateAsset(UnityEngine.Object asset, string path) { }
        public static void AddObjectToAsset(UnityEngine.Object objectToAdd, UnityEngine.Object assetObject) { }
        public static void AddObjectToAsset(UnityEngine.Object objectToAdd, string path) { }
        public static string CreateFolder(string parent, string name) => "";
        public static bool IsValidFolder(string path) => false;
        public static void SaveAssets() { }
        public static void Refresh() { }
        public static void ImportAsset(string path) { }
        public static void ImportAsset(string path, ImportAssetOptions options) { }
        public static string AssetPathToGUID(string path) => "";
        public static string GUIDToAssetPath(string guid) => "";
        public static string GetAssetPath(UnityEngine.Object o) => "";
        public static bool CopyAsset(string from, string to) => false;
        public static bool DeleteAsset(string path) => false;
        public static string[] FindAssets(string filter) => new string[0];
        public static string[] FindAssets(string filter, string[] searchInFolders) => new string[0];
        public static void StartAssetEditing() { }
        public static void StopAssetEditing() { }
    }

    public static class PrefabUtility
    {
        public static GameObject SaveAsPrefabAsset(GameObject go, string path) => null;
        public static GameObject SaveAsPrefabAsset(GameObject go, string path, out bool success) { success = true; return null; }
        public static UnityEngine.Object InstantiatePrefab(UnityEngine.Object prefab) => null;
        public static UnityEngine.Object InstantiatePrefab(UnityEngine.Object prefab, Scene scene) => null;
        public static GameObject LoadPrefabContents(string path) => null;
        public static void UnloadPrefabContents(GameObject go) { }
        public static void SavePrefabAsset(GameObject go) { }
    }

    public static class Selection
    {
        public static UnityEngine.Object activeObject { get; set; }
        public static GameObject activeGameObject { get; set; }
        public static UnityEngine.Object[] objects { get; set; }
    }

    public static class EditorUtility
    {
        public static void SetDirty(UnityEngine.Object o) { }
        public static bool DisplayDialog(string title, string message, string ok) => false;
        public static bool DisplayDialog(string title, string message, string ok, string cancel) => false;
        public static void DisplayProgressBar(string t, string i, float p) { }
        public static void ClearProgressBar() { }
    }

    public static class EditorGUIUtility
    {
        public static void PingObject(UnityEngine.Object o) { }
        public static void PingObject(int instanceID) { }
    }

    public class EditorBuildSettingsScene
    {
        public EditorBuildSettingsScene(string path, bool enabled) { }
        public string path { get; set; }
        public bool enabled { get; set; }
    }

    public static class EditorBuildSettings
    {
        public static EditorBuildSettingsScene[] scenes { get; set; }
    }

    public class SerializedObject
    {
        public SerializedObject(UnityEngine.Object o) { }
        public SerializedProperty FindProperty(string path) => null;
        public bool ApplyModifiedProperties() => false;
        public void ApplyModifiedPropertiesWithoutUndo() { }
        public void Update() { }
    }

    public class SerializedProperty
    {
        public int arraySize { get; set; }
        public string stringValue { get; set; }
        public int intValue { get; set; }
        public float floatValue { get; set; }
        public bool boolValue { get; set; }
        public UnityEngine.Object objectReferenceValue { get; set; }
        public SerializedProperty GetArrayElementAtIndex(int i) => null;
        public void InsertArrayElementAtIndex(int i) { }
        public void DeleteArrayElementAtIndex(int i) { }
    }

    public static class EditorApplication
    {
        public static bool isPlaying { get; set; }
        public static void ExecuteMenuItem(string path) { }
        public static event Action update;
        public static bool isCompiling => false;
    }

    public static class Undo
    {
        public static void RegisterCreatedObjectUndo(UnityEngine.Object o, string name) { }
        public static void RecordObject(UnityEngine.Object o, string name) { }
        public static void DestroyObjectImmediate(UnityEngine.Object o) { }
    }

    public class AssetImporter : UnityEngine.Object
    {
        public string assetPath { get; set; }
        public static AssetImporter GetAtPath(string path) => null;
        public void SaveAndReimport() { }
    }

    public class ModelImporter : AssetImporter
    {
        public float globalScale { get; set; }
        public bool importAnimation { get; set; }
        public bool importMaterials { get; set; }
        public ModelImporterMaterialImportMode materialImportMode { get; set; }
        public ModelImporterMaterialLocation materialLocation { get; set; }
        public ModelImporterAnimationType animationType { get; set; }
        public ModelImporterAvatarSetup avatarSetup { get; set; }
        public bool isReadable { get; set; }
        public ModelImporterMeshCompression meshCompression { get; set; }
        public bool optimizeMeshVertices { get; set; }
        /// <summary>Bakes a Z-up source into Unity's Y-up at import time.</summary>
        public bool bakeAxisConversion { get; set; }
        public ModelImporterNormals importNormals { get; set; }
        public bool useFileScale { get; set; }
    }
    public enum ModelImporterNormals { Import, Calculate, None }
    public enum ModelImporterAvatarSetup { NoAvatar, CopyFromOther, CreateFromThisModel }
    public enum ModelImporterMaterialImportMode { None, ImportStandard, ImportViaMaterialDescription }
    public enum ModelImporterMaterialLocation { External, InPrefab }
    public enum ModelImporterAnimationType { None, Legacy, Generic, Human }
    public enum ModelImporterMeshCompression { Off, Low, Medium, High }

    public class TextureImporter : AssetImporter
    {
        public TextureImporterType textureType { get; set; }
        public bool alphaIsTransparency { get; set; }
        public bool mipmapEnabled { get; set; }
        public int maxTextureSize { get; set; }
        public SpriteImportMode spriteImportMode { get; set; }
        public TextureImporterCompression textureCompression { get; set; }
        public UnityEngine.TextureWrapMode wrapMode { get; set; }
        public UnityEngine.Vector4 spriteBorder { get; set; }
        public TextureImporterShape textureShape { get; set; }
        public float spritePixelsPerUnit { get; set; }
        public void GetSourceTextureWidthAndHeight(out int width, out int height) { width = 0; height = 0; }
    }
    public enum TextureImporterShape { Texture2D = 1, TextureCube = 2, Texture2DArray = 4, Texture3D = 8 }
    public enum TextureImporterType { Default, Sprite, NormalMap, GUI }
    public enum SpriteImportMode { None, Single, Multiple, Polygon }
    public enum TextureImporterCompression { Uncompressed, Compressed, CompressedHQ, CompressedLQ }

    public enum BuildTarget { WebGL, StandaloneOSX, StandaloneWindows64, Android, iOS, NoTarget }
    public enum BuildTargetGroup { Unknown, Standalone, WebGL, Android, iOS }

    public static class EditorUserBuildSettings
    {
        public static BuildTarget activeBuildTarget => BuildTarget.WebGL;
        public static bool SwitchActiveBuildTarget(BuildTargetGroup g, BuildTarget t) => false;
    }

    public static class PlayerSettings
    {
        public static string companyName { get; set; }
        public static string productName { get; set; }
        public static ColorSpace colorSpace { get; set; }
        public static bool runInBackground { get; set; }
        public static class WebGL
        {
            public static WebGLCompressionFormat compressionFormat { get; set; }
            public static bool decompressionFallback { get; set; }
            public static string template { get; set; }
            public static int memorySize { get; set; }
            public static WebGLLinkerTarget linkerTarget { get; set; }
            public static WebGLExceptionSupport exceptionSupport { get; set; }
            public static bool dataCaching { get; set; }
        }
    }
    public enum WebGLCompressionFormat { Brotli, Gzip, Disabled }
    public enum WebGLLinkerTarget { Wasm, Both }
    public enum WebGLExceptionSupport { None, ExplicitlyThrownExceptionsOnly, FullWithoutStacktrace, FullWithStacktrace }
    public enum ColorSpace { Gamma, Linear }

    public class SceneView : UnityEngine.Object
    {
        public static SceneView lastActiveSceneView => null;
        public void Frame(Bounds bounds, bool instant) { }
        public void FrameSelected() { }
    }

    public static class GameObjectUtility
    {
        public static void SetStaticEditorFlags(GameObject go, StaticEditorFlags flags) { }
    }
    [Flags] public enum StaticEditorFlags { Nothing = 0, ContributeGI = 1, OccluderStatic = 2, BatchingStatic = 4, NavigationStatic = 8, OccludeeStatic = 16, OffMeshLinkGeneration = 32, ReflectionProbeStatic = 64 }
    [Flags] public enum ImportAssetOptions { Default = 0, ForceUpdate = 1, ForceSynchronousImport = 2 }
}

namespace UnityEditor.Animations
{
    // AnimatorController derives from RuntimeAnimatorController so an Animator's
    // runtimeAnimatorController field assignment is type-compatible in real Unity
    // (the stub here keeps that inheritance so the compile-check still validates it).
    public class AnimatorController : UnityEngine.RuntimeAnimatorController
    {
        public static AnimatorController CreateAnimatorControllerAtPath(string path) => null;
        public AnimatorControllerLayer[] layers { get; }
        public void AddLayer(string name) { }
        public void AddParameter(string name, AnimatorControllerParameterType type) { }
    }

    public class AnimatorControllerLayer
    {
        public string name { get; set; }
        public AnimatorStateMachine stateMachine { get; set; }
    }

    public class AnimatorStateMachine : UnityEngine.Object
    {
        public AnimatorState AddState(string name) => null;
        public AnimatorState AddState(string name, Vector3 position) => null;
        public AnimatorState defaultState { get; set; }
        public AnimatorState[] states { get; }
    }

    public class AnimatorState : UnityEngine.Object
    {
        public string name { get; set; }
        public UnityEngine.Motion motion { get; set; }
    }

    public enum AnimatorControllerParameterType { Float, Int, Bool, Trigger }
}

namespace UnityEditor.SceneManagement
{
    public enum NewSceneSetup { EmptyScene, DefaultGameObjects }
    public enum NewSceneMode { Single, Additive }
    public enum OpenSceneMode { Single, Additive, AdditiveWithoutLoading }

    public static class EditorSceneManager
    {
        public static Scene NewScene(NewSceneSetup setup, NewSceneMode mode) => default;
        public static Scene NewScene(NewSceneSetup setup) => default;
        public static bool SaveScene(Scene scene) => false;
        public static bool SaveScene(Scene scene, string path) => false;
        public static Scene OpenScene(string path) => default;
        public static Scene OpenScene(string path, OpenSceneMode mode) => default;
        public static void MarkSceneDirty(Scene scene) { }
        public static bool SaveOpenScenes() => false;
        public static Scene GetActiveScene() => default;
    }
}
