// Hand-written stub of the subset of the Unity API used by gdg-go.
// Purpose: let `csc` type-check the game scripts without a Unity install.
// A clean compile here proves syntax + internal consistency + correct arity/typing
// against these signatures. It does NOT prove the real Unity signatures match.
#pragma warning disable CS0067, CS0649, CS0169, CS0414

using System;
using System.Collections;
using System.Collections.Generic;

namespace UnityEngine
{
    // ---------- Attributes ----------
    [AttributeUsage(AttributeTargets.Field)] public class HeaderAttribute : Attribute { public HeaderAttribute(string h) { } }
    [AttributeUsage(AttributeTargets.Field)] public class TooltipAttribute : Attribute { public TooltipAttribute(string t) { } }
    [AttributeUsage(AttributeTargets.Field)] public class RangeAttribute : Attribute { public RangeAttribute(float a, float b) { } }
    [AttributeUsage(AttributeTargets.Field)] public class SerializeFieldAttribute : Attribute { }
    [AttributeUsage(AttributeTargets.Field)] public class SpaceAttribute : Attribute { public SpaceAttribute() { } public SpaceAttribute(float h) { } }
    [AttributeUsage(AttributeTargets.Field)] public class TextAreaAttribute : Attribute { public TextAreaAttribute() { } public TextAreaAttribute(int a, int b) { } }
    [AttributeUsage(AttributeTargets.Class, AllowMultiple = true)] public class RequireComponent : Attribute { public RequireComponent(Type a) { } public RequireComponent(Type a, Type b) { } public RequireComponent(Type a, Type b, Type c) { } }
    [AttributeUsage(AttributeTargets.Class)] public class DefaultExecutionOrder : Attribute { public DefaultExecutionOrder(int order) { } }
    [AttributeUsage(AttributeTargets.Class)] public class DisallowMultipleComponent : Attribute { }
    [AttributeUsage(AttributeTargets.Class)] public class AddComponentMenu : Attribute { public AddComponentMenu(string m) { } }
    [AttributeUsage(AttributeTargets.Class)] public class CreateAssetMenuAttribute : Attribute { public string fileName; public string menuName; public int order; }
    [AttributeUsage(AttributeTargets.Class)] public class ExecuteAlways : Attribute { }
    [AttributeUsage(AttributeTargets.Class)] public class ExecuteInEditMode : Attribute { }
    [AttributeUsage(AttributeTargets.Method)] public class ContextMenu : Attribute { public ContextMenu(string m) { } }
    [AttributeUsage(AttributeTargets.Method)] public class RuntimeInitializeOnLoadMethodAttribute : Attribute { public RuntimeInitializeOnLoadMethodAttribute() { } public RuntimeInitializeOnLoadMethodAttribute(RuntimeInitializeLoadType t) { } }
    public enum RuntimeInitializeLoadType { AfterSceneLoad, BeforeSceneLoad, BeforeSplashScreen, SubsystemRegistration, AfterAssembliesLoaded }

    // ---------- Math ----------
    public struct Vector2
    {
        public float x, y;
        public Vector2(float x, float y) { this.x = x; this.y = y; }
        public static Vector2 zero => new Vector2(0, 0);
        public static Vector2 one => new Vector2(1, 1);
        public static Vector2 up => new Vector2(0, 1);
        public static Vector2 right => new Vector2(1, 0);
        public float magnitude => 0f;
        public float sqrMagnitude => 0f;
        public Vector2 normalized => this;
        public static float Distance(Vector2 a, Vector2 b) => 0f;
        public static Vector2 Lerp(Vector2 a, Vector2 b, float t) => a;
        public static Vector2 operator +(Vector2 a, Vector2 b) => a;
        public static Vector2 operator -(Vector2 a, Vector2 b) => a;
        public static Vector2 operator -(Vector2 a) => a;
        public static Vector2 operator *(Vector2 a, float b) => a;
        public static Vector2 operator *(float b, Vector2 a) => a;
        public static Vector2 operator /(Vector2 a, float b) => a;
        public static bool operator ==(Vector2 a, Vector2 b) => false;
        public static bool operator !=(Vector2 a, Vector2 b) => false;
        public override bool Equals(object o) => false;
        public override int GetHashCode() => 0;
    }

    public struct Vector3
    {
        public float x, y, z;
        public Vector3(float x, float y) { this.x = x; this.y = y; this.z = 0f; }
        public Vector3(float x, float y, float z) { this.x = x; this.y = y; this.z = z; }
        public static Vector3 zero => new Vector3(0, 0, 0);
        public static Vector3 one => new Vector3(1, 1, 1);
        public static Vector3 forward => new Vector3(0, 0, 1);
        public static Vector3 back => new Vector3(0, 0, -1);
        public static Vector3 up => new Vector3(0, 1, 0);
        public static Vector3 down => new Vector3(0, -1, 0);
        public static Vector3 right => new Vector3(1, 0, 0);
        public static Vector3 left => new Vector3(-1, 0, 0);
        public float magnitude => 0f;
        public float sqrMagnitude => 0f;
        public Vector3 normalized => this;
        public static float Distance(Vector3 a, Vector3 b) => 0f;
        public static float Dot(Vector3 a, Vector3 b) => 0f;
        public static Vector3 Cross(Vector3 a, Vector3 b) => a;
        public static Vector3 Lerp(Vector3 a, Vector3 b, float t) => a;
        public static Vector3 LerpUnclamped(Vector3 a, Vector3 b, float t) => a;
        public static Vector3 Slerp(Vector3 a, Vector3 b, float t) => a;
        public static Vector3 MoveTowards(Vector3 a, Vector3 b, float d) => a;
        public static Vector3 SmoothDamp(Vector3 cur, Vector3 tgt, ref Vector3 vel, float time) => cur;
        public static Vector3 SmoothDamp(Vector3 cur, Vector3 tgt, ref Vector3 vel, float time, float maxSpeed) => cur;
        public static Vector3 SmoothDamp(Vector3 cur, Vector3 tgt, ref Vector3 vel, float time, float maxSpeed, float dt) => cur;
        public static Vector3 Scale(Vector3 a, Vector3 b) => a;
        public static Vector3 operator +(Vector3 a, Vector3 b) => a;
        public static Vector3 operator -(Vector3 a, Vector3 b) => a;
        public static Vector3 operator -(Vector3 a) => a;
        public static Vector3 operator *(Vector3 a, float b) => a;
        public static Vector3 operator *(float b, Vector3 a) => a;
        public static Vector3 operator /(Vector3 a, float b) => a;
        public static bool operator ==(Vector3 a, Vector3 b) => false;
        public static bool operator !=(Vector3 a, Vector3 b) => false;
        public override bool Equals(object o) => false;
        public override int GetHashCode() => 0;
        public override string ToString() => "";
    }

    public struct Quaternion
    {
        public float x, y, z, w;
        public Quaternion(float x, float y, float z, float w) { this.x = x; this.y = y; this.z = z; this.w = w; }
        public static Quaternion identity => new Quaternion(0, 0, 0, 1);
        public static Quaternion Euler(float x, float y, float z) => identity;
        public static Quaternion Euler(Vector3 e) => identity;
        public static Quaternion LookRotation(Vector3 f) => identity;
        public static Quaternion LookRotation(Vector3 f, Vector3 u) => identity;
        public static Quaternion Slerp(Quaternion a, Quaternion b, float t) => a;
        public static Quaternion Lerp(Quaternion a, Quaternion b, float t) => a;
        public static Quaternion AngleAxis(float a, Vector3 axis) => identity;
        public Vector3 eulerAngles { get => Vector3.zero; set { } }
        public static Quaternion operator *(Quaternion a, Quaternion b) => a;
        public static Vector3 operator *(Quaternion a, Vector3 b) => b;
    }

    public struct Color
    {
        public float r, g, b, a;
        public Color(float r, float g, float b) { this.r = r; this.g = g; this.b = b; this.a = 1f; }
        public Color(float r, float g, float b, float a) { this.r = r; this.g = g; this.b = b; this.a = a; }
        public static Color white => new Color(1, 1, 1);
        public static Color black => new Color(0, 0, 0);
        public static Color clear => new Color(0, 0, 0, 0);
        public static Color red => new Color(1, 0, 0);
        public static Color green => new Color(0, 1, 0);
        public static Color blue => new Color(0, 0, 1);
        public static Color yellow => new Color(1, 1, 0);
        public static Color cyan => new Color(0, 1, 1);
        public static Color magenta => new Color(1, 0, 1);
        public static Color gray => new Color(.5f, .5f, .5f);
        public static Color grey => new Color(.5f, .5f, .5f);
        public static Color Lerp(Color a, Color b, float t) => a;
        public static Color operator *(Color a, float b) => a;
        public static Color operator *(Color a, Color b) => a;
        public static Color operator +(Color a, Color b) => a;
    }

    public struct Color32
    {
        public byte r, g, b, a;
        public Color32(byte r, byte g, byte b, byte a) { this.r = r; this.g = g; this.b = b; this.a = a; }
        public static implicit operator Color(Color32 c) => Color.white;
        public static implicit operator Color32(Color c) => new Color32(255, 255, 255, 255);
    }

    public static class Mathf
    {
        public const float PI = 3.14159265f;
        public const float Infinity = float.PositiveInfinity;
        public const float NegativeInfinity = float.NegativeInfinity;
        public const float Deg2Rad = 0.0174532924f;
        public const float Rad2Deg = 57.29578f;
        public const float Epsilon = 1.401298E-45f;
        public static float Clamp(float v, float a, float b) => v;
        public static int Clamp(int v, int a, int b) => v;
        public static float Clamp01(float v) => v;
        public static float Lerp(float a, float b, float t) => a;
        public static float LerpUnclamped(float a, float b, float t) => a;
        public static float InverseLerp(float a, float b, float v) => 0f;
        public static float MoveTowards(float a, float b, float d) => a;
        public static float SmoothStep(float a, float b, float t) => a;
        public static float SmoothDamp(float cur, float tgt, ref float vel, float time) => cur;
        public static float SmoothDamp(float cur, float tgt, ref float vel, float time, float maxSpeed, float dt) => cur;
        public static float Abs(float v) => v;
        public static int Abs(int v) => v;
        public static float Sign(float v) => v;
        public static float Min(float a, float b) => a;
        public static int Min(int a, int b) => a;
        public static float Max(float a, float b) => a;
        public static int Max(int a, int b) => a;
        public static float Max(float a, float b, float c) => a;
        public static int Max(int a, int b, int c) => a;
        public static float Pow(float a, float b) => a;
        public static float Sqrt(float a) => a;
        public static float Sin(float a) => a;
        public static float Cos(float a) => a;
        public static float Tan(float a) => a;
        public static float Atan2(float a, float b) => a;
        public static float Exp(float a) => a;
        public static float Log(float a) => a;
        public static float Floor(float a) => a;
        public static float Ceil(float a) => a;
        public static float Round(float a) => a;
        public static int FloorToInt(float a) => 0;
        public static int CeilToInt(float a) => 0;
        public static int RoundToInt(float a) => 0;
        public static float Repeat(float t, float len) => t;
        public static float PingPong(float t, float len) => t;
        public static bool Approximately(float a, float b) => false;
        public static float PerlinNoise(float x, float y) => 0f;
    }

    public struct Bounds
    {
        public Vector3 center, size, extents, min, max;
        public Bounds(Vector3 c, Vector3 s) { center = c; size = s; extents = s; min = c; max = c; }
        public bool Contains(Vector3 p) => false;
        public void Encapsulate(Bounds b) { }
        public void Encapsulate(Vector3 p) { }
    }

    public struct Rect
    {
        public float x, y, width, height;
        public Rect(float x, float y, float w, float h) { this.x = x; this.y = y; width = w; height = h; }
    }

    public enum Space { World, Self }

    public class AnimationCurve
    {
        public AnimationCurve() { }
        public AnimationCurve(params Keyframe[] keys) { }
        public float Evaluate(float t) => 0f;
        public static AnimationCurve Linear(float a, float b, float c, float d) => new AnimationCurve();
        public static AnimationCurve EaseInOut(float a, float b, float c, float d) => new AnimationCurve();
        public static AnimationCurve Constant(float a, float b, float c) => new AnimationCurve();
    }
    public struct Keyframe { public float time, value; public Keyframe(float t, float v) { time = t; value = v; } }

    public class Gradient { }

    // ---------- Core object model ----------
    public class Object
    {
        public string name { get; set; }
        public HideFlags hideFlags { get; set; }
        public int GetInstanceID() => 0;
        public static void Destroy(Object o) { }
        public static void Destroy(Object o, float t) { }
        public static void DestroyImmediate(Object o) { }
        public static void DestroyImmediate(Object o, bool allowDestroyingAssets) { }
        public static void DontDestroyOnLoad(Object o) { }
        public static T Instantiate<T>(T original) where T : Object => original;
        public static T Instantiate<T>(T original, Transform parent) where T : Object => original;
        public static T Instantiate<T>(T original, Transform parent, bool worldPositionStays) where T : Object => original;
        public static T Instantiate<T>(T original, Vector3 pos, Quaternion rot) where T : Object => original;
        public static T Instantiate<T>(T original, Vector3 pos, Quaternion rot, Transform parent) where T : Object => original;
        public static T FindFirstObjectByType<T>() where T : Object => null;
        public static T FindAnyObjectByType<T>() where T : Object => null;
        public static T[] FindObjectsByType<T>(FindObjectsSortMode mode) where T : Object => new T[0];
        public static T[] FindObjectsByType<T>(FindObjectsInactive inactive, FindObjectsSortMode mode) where T : Object => new T[0];
        public static implicit operator bool(Object o) => false;
        public static bool operator ==(Object a, Object b) => false;
        public static bool operator !=(Object a, Object b) => false;
        public override bool Equals(object o) => false;
        public override int GetHashCode() => 0;
    }
    public enum FindObjectsSortMode { None, InstanceID }
    public enum FindObjectsInactive { Exclude, Include }
    public enum HideFlags { None = 0, HideInHierarchy = 1, HideInInspector = 2, DontSave = 4, NotEditable = 8, DontUnloadUnusedAsset = 16, DontSaveInEditor = 32, DontSaveInBuild = 64, HideAndDontSave = 61 }

    public class ScriptableObject : Object
    {
        public static T CreateInstance<T>() where T : ScriptableObject => null;
        public static ScriptableObject CreateInstance(Type t) => null;
    }

    public class Component : Object
    {
        public Transform transform { get; }
        public GameObject gameObject { get; }
        public string tag { get; set; }
        public T GetComponent<T>() => default;
        public Component GetComponent(Type t) => null;
        public Component GetComponent(string t) => null;
        public T GetComponentInChildren<T>() => default;
        public T GetComponentInChildren<T>(bool includeInactive) => default;
        public T GetComponentInParent<T>() => default;
        public T[] GetComponentsInChildren<T>() => new T[0];
        public T[] GetComponentsInChildren<T>(bool includeInactive) => new T[0];
        public T[] GetComponents<T>() => new T[0];
        public bool TryGetComponent<T>(out T c) { c = default; return false; }
        public bool CompareTag(string t) => false;
    }

    public sealed class GameObject : Object
    {
        public GameObject() { }
        public GameObject(string name) { }
        public GameObject(string name, params Type[] components) { }
        public Transform transform { get; }
        public string tag { get; set; }
        public int layer { get; set; }
        public bool activeSelf { get; }
        public bool activeInHierarchy { get; }
        public bool isStatic { get; set; }
        public UnityEngine.SceneManagement.Scene scene { get; }
        public void SetActive(bool v) { }
        public T AddComponent<T>() where T : Component => null;
        public Component AddComponent(Type t) => null;
        public T GetComponent<T>() => default;
        public Component GetComponent(Type t) => null;
        public T GetComponentInChildren<T>() => default;
        public T GetComponentInChildren<T>(bool includeInactive) => default;
        public T GetComponentInParent<T>() => default;
        public T[] GetComponentsInChildren<T>() => new T[0];
        public T[] GetComponentsInChildren<T>(bool includeInactive) => new T[0];
        public T[] GetComponents<T>() => new T[0];
        public bool TryGetComponent<T>(out T c) { c = default; return false; }
        public bool CompareTag(string t) => false;
        public static GameObject Find(string n) => null;
        public static GameObject FindWithTag(string t) => null;
        public static GameObject[] FindGameObjectsWithTag(string t) => new GameObject[0];
    }

    public class Transform : Component, IEnumerable
    {
        public Vector3 position { get; set; }
        public Vector3 localPosition { get; set; }
        public Vector3 localScale { get; set; }
        public Vector3 lossyScale { get; }
        public Quaternion rotation { get; set; }
        public Quaternion localRotation { get; set; }
        public Vector3 eulerAngles { get; set; }
        public Vector3 localEulerAngles { get; set; }
        public Vector3 forward { get; set; }
        public Vector3 right { get; set; }
        public Vector3 up { get; set; }
        public Transform parent { get; set; }
        public Transform root { get; }
        public int childCount { get; }
        public int siblingIndex { get; }
        public void Translate(float x, float y, float z) { }
        public void Translate(float x, float y, float z, Space s) { }
        public void Translate(Vector3 v) { }
        public void Translate(Vector3 v, Space s) { }
        public void Rotate(float x, float y, float z) { }
        public void Rotate(float x, float y, float z, Space s) { }
        public void Rotate(Vector3 v) { }
        public void Rotate(Vector3 axis, float angle, Space s) { }
        public void LookAt(Transform t) { }
        public void LookAt(Vector3 p) { }
        public void SetParent(Transform p) { }
        public void SetParent(Transform p, bool worldPositionStays) { }
        public void SetSiblingIndex(int i) { }
        public void SetAsLastSibling() { }
        public void SetAsFirstSibling() { }
        public Transform Find(string n) => null;
        public Transform GetChild(int i) => null;
        public Vector3 TransformPoint(Vector3 p) => p;
        public Vector3 InverseTransformPoint(Vector3 p) => p;
        public Vector3 TransformDirection(Vector3 p) => p;
        public IEnumerator GetEnumerator() => null;
    }

    public class Behaviour : Component { public bool enabled { get; set; } public bool isActiveAndEnabled { get; } }

    public class MonoBehaviour : Behaviour
    {
        public Coroutine StartCoroutine(IEnumerator routine) => null;
        public Coroutine StartCoroutine(string methodName) => null;
        public void StopCoroutine(IEnumerator routine) { }
        public void StopCoroutine(Coroutine routine) { }
        public void StopAllCoroutines() { }
        public void Invoke(string methodName, float time) { }
        public void InvokeRepeating(string methodName, float time, float rep) { }
        public void CancelInvoke() { }
        public void CancelInvoke(string methodName) { }
        public bool IsInvoking() => false;
        public bool IsInvoking(string methodName) => false;
        public static void print(object o) { }
    }

    public class UnityException : Exception { public UnityException() { } public UnityException(string m) : base(m) { } }
    public class MissingReferenceException : UnityException { }
    public class MissingComponentException : UnityException { }

    public class Coroutine : Object { }
    public class YieldInstruction { }
    public sealed class WaitForSeconds : YieldInstruction { public WaitForSeconds(float s) { } }
    public sealed class WaitForSecondsRealtime : CustomYieldInstruction { public WaitForSecondsRealtime(float s) { } public override bool keepWaiting => false; }
    public sealed class WaitForEndOfFrame : YieldInstruction { }
    public sealed class WaitForFixedUpdate : YieldInstruction { }
    public abstract class CustomYieldInstruction : IEnumerator
    {
        public abstract bool keepWaiting { get; }
        public object Current => null;
        public bool MoveNext() => false;
        public void Reset() { }
    }

    // ---------- Engine services ----------
    public static class Debug
    {
        public static void Log(object m) { }
        public static void Log(object m, Object ctx) { }
        public static void LogWarning(object m) { }
        public static void LogWarning(object m, Object ctx) { }
        public static void LogError(object m) { }
        public static void LogError(object m, Object ctx) { }
        public static void LogException(Exception e) { }
        public static void LogFormat(string f, params object[] a) { }
        public static void DrawLine(Vector3 a, Vector3 b, Color c) { }
        public static void DrawRay(Vector3 a, Vector3 b, Color c) { }
        public static bool isDebugBuild => false;
    }

    public static class Time
    {
        public static float deltaTime => 0f;
        public static float unscaledDeltaTime => 0f;
        public static float fixedDeltaTime => 0f;
        public static float time => 0f;
        public static float unscaledTime => 0f;
        public static float timeScale { get; set; }
        public static float realtimeSinceStartup => 0f;
        public static int frameCount => 0;
        public static float smoothDeltaTime => 0f;
    }

    public static class Screen
    {
        public static int width => 0;
        public static int height => 0;
        public static bool fullScreen { get; set; }
        public static float dpi => 0f;
    }

    public static class Application
    {
        public static bool isPlaying => false;
        public static bool isEditor => false;
        public static bool isMobilePlatform => false;
        public static RuntimePlatform platform => RuntimePlatform.WebGLPlayer;
        public static int targetFrameRate { get; set; }
        public static string absoluteURL { get; set; } = "";
        public static string version => "";
        public static string persistentDataPath => "";
        public static string streamingAssetsPath => "";
        public static void Quit() { }
        public static void OpenURL(string u) { }
    }
    public enum RuntimePlatform { WebGLPlayer, OSXEditor, OSXPlayer, WindowsPlayer, WindowsEditor, Android, IPhonePlayer, LinuxPlayer, LinuxEditor }

    public static class Resources
    {
        public static T Load<T>(string path) where T : Object => null;
        public static Object Load(string path) => null;
        public static T[] LoadAll<T>(string path) where T : Object => new T[0];
        public static void UnloadUnusedAssets() { }
    }

    public static class QualitySettings
    {
        public static int vSyncCount { get; set; }
        public static int shadowDistance { get; set; }
        public static int antiAliasing { get; set; }
        public static AnisotropicFiltering anisotropicFiltering { get; set; }
        public static bool softVegetation { get; set; }
        // Real Unity types this as ShadowResolution enum, kept int here for simplicity
        // since the project doesn't use it yet (we set via Light.shadowCustomResolution).
        public static int shadowResolution { get; set; }
    }
    public enum AnisotropicFiltering { Disable, Enable, ForceEnable }

    public static class RenderSettings
    {
        public static Material skybox { get; set; }
        public static Color ambientLight { get; set; }
        // Real Unity types this as UnityEngine.Rendering.AmbientMode, not int.
        public static UnityEngine.Rendering.AmbientMode ambientMode { get; set; }
        public static Color ambientSkyColor { get; set; }
        public static Color ambientEquatorColor { get; set; }
        public static Color ambientGroundColor { get; set; }
        public static float ambientIntensity { get; set; }
        public static bool fog { get; set; }
        public static FogMode fogMode { get; set; }
        public static Color fogColor { get; set; }
        public static float fogDensity { get; set; }
        public static float fogStartDistance { get; set; }
        public static float fogEndDistance { get; set; }
    }

    public enum FogMode { Linear = 1, Exponential = 2, ExponentialSquared = 3 }

    public static class JsonUtility
    {
        public static string ToJson(object o) => "";
        public static string ToJson(object o, bool pretty) => "";
        public static T FromJson<T>(string json) => default;
        public static object FromJson(string json, Type t) => null;
        public static void FromJsonOverwrite(string json, object o) { }
    }

    public static class PlayerPrefs
    {
        public static void SetInt(string k, int v) { }
        public static void SetFloat(string k, float v) { }
        public static void SetString(string k, string v) { }
        public static int GetInt(string k, int d = 0) => d;
        public static float GetFloat(string k, float d = 0f) => d;
        public static string GetString(string k, string d = "") => d;
        public static bool HasKey(string k) => false;
        public static void DeleteKey(string k) { }
        public static void DeleteAll() { }
        public static void Save() { }
    }

    // ---------- Input ----------
    public enum KeyCode
    {
        None, A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z,
        Alpha0, Alpha1, Alpha2, Alpha3, Alpha4, Alpha5, Alpha6, Alpha7, Alpha8, Alpha9,
        UpArrow, DownArrow, LeftArrow, RightArrow, Space, Return, KeypadEnter, Escape, Tab, Backspace,
        LeftShift, RightShift, LeftControl, RightControl, LeftAlt, RightAlt, Mouse0, Mouse1, P_
    }
    public enum TouchPhase { Began, Moved, Stationary, Ended, Canceled }
    public struct Touch
    {
        public int fingerId;
        public Vector2 position;
        public Vector2 rawPosition;
        public Vector2 deltaPosition;
        public float deltaTime;
        public int tapCount;
        public TouchPhase phase;
    }
    public static class Input
    {
        public static bool GetKey(KeyCode k) => false;
        public static bool GetKeyDown(KeyCode k) => false;
        public static bool GetKeyUp(KeyCode k) => false;
        public static bool GetKey(string k) => false;
        public static bool GetKeyDown(string k) => false;
        public static bool GetButton(string b) => false;
        public static bool GetButtonDown(string b) => false;
        public static float GetAxis(string a) => 0f;
        public static float GetAxisRaw(string a) => 0f;
        public static bool GetMouseButton(int b) => false;
        public static bool GetMouseButtonDown(int b) => false;
        public static bool GetMouseButtonUp(int b) => false;
        public static Vector3 mousePosition => Vector3.zero;
        public static int touchCount => 0;
        public static Touch GetTouch(int i) => default;
        public static Touch[] touches => new Touch[0];
        public static bool touchSupported => false;
        public static bool anyKeyDown => false;
    }

    public static class Random
    {
        public static float value => 0f;
        public static Vector3 insideUnitSphere => Vector3.zero;
        public static Vector2 insideUnitCircle => Vector2.zero;
        public static Quaternion rotation => Quaternion.identity;
        public static int Range(int min, int max) => min;
        public static float Range(float min, float max) => min;
        public static void InitState(int seed) { }
    }

    // ---------- Rendering ----------
    public class Texture : Object { public int width { get; } public int height { get; } public TextureWrapMode wrapMode { get; set; } public FilterMode filterMode { get; set; } public string name { get; set; } }
    public enum TextureFormat { RGBA32, RGB24, Alpha8, DXT5, ETC_RGB4, ASTC_RGBA_4x4 }
    public class Texture2D : Texture
    {
        public Texture2D(int w, int h) { }
        public Texture2D(int w, int h, TextureFormat fmt, bool mipChain) { }
        public void SetPixel(int x, int y, Color color) { }
        public void Apply() { }
        public byte[] EncodeToPNG() => new byte[0];
    }

    /// <summary>TTF/OTF font asset. Distinct from TMPro.TMP_FontAsset, which wraps one.</summary>
    public class Font : Object { }

    public enum TextureWrapMode { Repeat, Clamp, Mirror, MirrorOnce }
    public enum FilterMode { Point, Bilinear, Trilinear }
    public class Sprite : Object
    {
        public static Sprite Create(Texture2D tex, Rect rect, Vector2 pivot) => null;
        public static Sprite Create(Texture2D tex, Rect rect, Vector2 pivot, float ppu) => null;
        public static Sprite Create(Texture2D tex, Rect rect, Vector2 pivot, float ppu, uint extrude, SpriteMeshType type, Vector4 border) => null;
        public Rect rect { get; }
        public Texture2D texture { get; }
    }
    public enum SpriteMeshType { FullRect, Tight }
    public struct Vector4
    {
        public float x, y, z, w;
        public Vector4(float x, float y, float z, float w) { this.x = x; this.y = y; this.z = z; this.w = w; }
        public static Vector4 zero => new Vector4(0f, 0f, 0f, 0f);
        public static Vector4 one => new Vector4(1f, 1f, 1f, 1f);
        public static bool operator ==(Vector4 a, Vector4 b) => a.x == b.x && a.y == b.y && a.z == b.z && a.w == b.w;
        public static bool operator !=(Vector4 a, Vector4 b) => !(a == b);
        public override bool Equals(object o) => o is Vector4 v && this == v;
        public override int GetHashCode() => 0;
    }

    public class Shader : Object { public static Shader Find(string name) => null; }
    public class Material : Object
    {
        public Material(Shader s) { }
        public Material(Material m) { }
        public Shader shader { get; set; }
        public Color color { get; set; }
        public Texture mainTexture { get; set; }
        public string[] shaderKeywords { get; set; }
        public void SetColor(string n, Color c) { }
        public void SetColor(int id, Color c) { }
        public Color GetColor(string n) => Color.white;
        public void SetFloat(string n, float v) { }
        public float GetFloat(string n) => 0f;
        public void SetInt(string n, int v) { }
        public void SetTexture(string n, Texture t) { }
        public Texture GetTexture(string n) => null;
        public void SetVector(string n, Vector4 v) { }
        public void EnableKeyword(string k) { }
        public void DisableKeyword(string k) { }
        public bool IsKeywordEnabled(string k) => false;
        public bool HasProperty(string n) => false;
        public bool HasColor(string n) => false;
        public bool HasTexture(string n) => false;
        public MaterialGlobalIlluminationFlags globalIlluminationFlags { get; set; }
        public int renderQueue { get; set; }
    }
    public enum MaterialGlobalIlluminationFlags { None, RealtimeEmissive, BakedEmissive, EmissiveIsBlack, AnyEmissive }

    public class Renderer : Component
    {
        public Material material { get; set; }
        public Material[] materials { get; set; }
        public Material sharedMaterial { get; set; }
        public Material[] sharedMaterials { get; set; }
        public bool enabled { get; set; }
        public Bounds bounds { get; }
        public bool receiveShadows { get; set; }
        public UnityEngine.Rendering.ShadowCastingMode shadowCastingMode { get; set; }
        public UnityEngine.Rendering.LightProbeUsage lightProbeUsage { get; set; }
        public UnityEngine.Rendering.ReflectionProbeUsage reflectionProbeUsage { get; set; }
    }
    public class MeshRenderer : Renderer { }
    public class SkinnedMeshRenderer : Renderer { public Mesh sharedMesh { get; set; } }
    public class MeshFilter : Component { public Mesh mesh { get; set; } public Mesh sharedMesh { get; set; } }
    public class Mesh : Object
    {
        public Bounds bounds { get; set; }
        public int subMeshCount { get; set; }
        public string name { get; set; }
        public Vector3[] vertices { get; set; }
        public int[] triangles { get; set; }
        public Vector3[] normals { get; set; }
        public Vector2[] uv { get; set; }
        public void RecalculateBounds() { }
        public void RecalculateNormals() { }
        public int[] GetTriangles(int submesh) => new int[0];
        public void SetVertices(System.Collections.Generic.List<Vector3> v) { }
        public void SetNormals(System.Collections.Generic.List<Vector3> n) { }
        public void SetTriangles(System.Collections.Generic.List<int> t, int submesh) { }
        public void SetTriangles(int[] t, int submesh) { }
    }

    public class Light : Behaviour
    {
        public LightType type { get; set; }
        public float intensity { get; set; }
        public Color color { get; set; }
        public float range { get; set; }
        public float spotAngle { get; set; }
        public LightShadows shadows { get; set; }
        public LightRenderMode renderMode { get; set; }
        public float shadowBias { get; set; }
        public float shadowNormalBias { get; set; }
        public float shadowNearPlane { get; set; }
        public int shadowCustomResolution { get; set; }
    }
    public enum LightType { Spot, Directional, Point, Area, Rectangle, Disc }
    public enum LightShadows { None, Hard, Soft }
    public enum LightRenderMode { Auto, ForcePixel, ForceVertex }

    public class Camera : Behaviour
    {
        public static Camera main => null;
        public float fieldOfView { get; set; }
        public float nearClipPlane { get; set; }
        public float farClipPlane { get; set; }
        public CameraClearFlags clearFlags { get; set; }
        public Color backgroundColor { get; set; }
        public bool orthographic { get; set; }
        public float orthographicSize { get; set; }
        public int cullingMask { get; set; }
        public float depth { get; set; }
        public Vector3 WorldToScreenPoint(Vector3 p) => p;
        public Vector3 ScreenToWorldPoint(Vector3 p) => p;
    }
    public enum CameraClearFlags { Skybox = 1, Color = 2, SolidColor = 2, Depth = 3, Nothing = 4 }

    public class ParticleSystem : Component
    {
        public void Play() { }
        public void Stop() { }
        public void Pause() { }
        public void Clear() { }
        public void Emit(int count) { }
        public bool isPlaying { get; }
        public MainModule main { get; }
        public EmissionModule emission { get; }
        public struct MainModule { public float startSpeed { set { } } public float startLifetime { set { } } public MinMaxGradient startColor { set { } } }
        public struct EmissionModule { public bool enabled { get; set; } public float rateOverTime { set { } } }
        public struct MinMaxGradient { public MinMaxGradient(Color c) { } public static implicit operator MinMaxGradient(Color c) => new MinMaxGradient(c); }
    }

    public class Animator : Behaviour
    {
        public void SetFloat(int id, float v) { }
        public void SetFloat(string n, float v) { }
        public void SetBool(int id, bool v) { }
        public void SetBool(string n, bool v) { }
        public void SetTrigger(int id) { }
        public void SetTrigger(string n) { }
        public void SetInteger(string n, int v) { }
        public void Play(string n) { }
        public void CrossFade(string n, float t) { }
        public float speed { get; set; }
        public RuntimeAnimatorController runtimeAnimatorController { get; set; }
        public Avatar avatar { get; set; }
        public AnimatorCullingMode cullingMode { get; set; }
        public bool applyRootMotion { get; set; }
        public static int StringToHash(string n) => 0;
    }
    public enum AnimatorCullingMode { AlwaysAnimate, CullUpdateTransforms, CullCompletely }
    public class RuntimeAnimatorController : Object { }
    // Motion is the base of AnimationClip and BlendTree in real Unity. Lives in the
    // UnityEngine namespace; placed here (UnityEngine) so the AnimationClip stub below
    // can derive from it like the real API does.
    public class Motion : Object { }
    public class AnimationClip : Motion { public string name { get; set; } public float length { get; } }
    public class Avatar : Object { }

    // ---------- Audio ----------
    public class AudioClip : Object { public float length { get; } }
    public class AudioSource : Behaviour
    {
        public AudioClip clip { get; set; }
        public float volume { get; set; }
        public float pitch { get; set; }
        public bool loop { get; set; }
        public bool playOnAwake { get; set; }
        public bool isPlaying { get; }
        public float spatialBlend { get; set; }
        public bool mute { get; set; }
        public float time { get; set; }
        public void Play() { }
        public void Stop() { }
        public void Pause() { }
        public void PlayOneShot(AudioClip c) { }
        public void PlayOneShot(AudioClip c, float v) { }
    }
    public class AudioListener : Behaviour { public static float volume { get; set; } public static bool pause { get; set; } }

    // ---------- Physics ----------
    public class Collider : Component
    {
        public bool isTrigger { get; set; }
        public bool enabled { get; set; }
        public Bounds bounds { get; }
        public Rigidbody attachedRigidbody { get; }
        public PhysicsMaterial material { get; set; }
    }
    public class PhysicsMaterial : Object { }
    public class BoxCollider : Collider { public Vector3 size { get; set; } public Vector3 center { get; set; } }
    public class SphereCollider : Collider { public float radius { get; set; } public Vector3 center { get; set; } }
    public class CapsuleCollider : Collider { public float radius { get; set; } public float height { get; set; } public Vector3 center { get; set; } public int direction { get; set; } }
    public class MeshCollider : Collider { public bool convex { get; set; } public Mesh sharedMesh { get; set; } }
    public class CharacterController : Collider
    {
        public void Move(Vector3 m) { }
        public bool isGrounded { get; }
        public float radius { get; set; }
        public float height { get; set; }
        public Vector3 center { get; set; }
    }
    public class Rigidbody : Component
    {
        public bool isKinematic { get; set; }
        public bool useGravity { get; set; }
        public float mass { get; set; }
        public float drag { get; set; }
        public Vector3 velocity { get; set; }
        public Vector3 linearVelocity { get; set; }
        public Vector3 angularVelocity { get; set; }
        public RigidbodyInterpolation interpolation { get; set; }
        public CollisionDetectionMode collisionDetectionMode { get; set; }
        public RigidbodyConstraints constraints { get; set; }
        public void MovePosition(Vector3 p) { }
        public void MoveRotation(Quaternion q) { }
        public void AddForce(Vector3 f) { }
        public void AddForce(Vector3 f, ForceMode m) { }
    }
    public enum RigidbodyInterpolation { None, Interpolate, Extrapolate }
    public enum CollisionDetectionMode { Discrete, Continuous, ContinuousDynamic, ContinuousSpeculative }
    [Flags] public enum RigidbodyConstraints { None = 0, FreezePositionX = 2, FreezePositionY = 4, FreezePositionZ = 8, FreezeRotationX = 16, FreezeRotationY = 32, FreezeRotationZ = 64, FreezeRotation = 112, FreezeAll = 126 }
    public enum ForceMode { Force, Acceleration, Impulse, VelocityChange }
    public struct RaycastHit { public Vector3 point; public Vector3 normal; public float distance; public Collider collider; public Transform transform; public GameObject gameObject; }
    public class Collision { public Collider collider; public GameObject gameObject; public Transform transform; public ContactPoint[] contacts; }
    public struct ContactPoint { public Vector3 point; public Vector3 normal; }
    public static class Physics
    {
        public static bool Raycast(Vector3 o, Vector3 d, out RaycastHit hit, float max) { hit = default; return false; }
        public static bool Raycast(Vector3 o, Vector3 d, out RaycastHit hit, float max, int layerMask) { hit = default; return false; }
        public static Collider[] OverlapSphere(Vector3 p, float r) => new Collider[0];
        public static Collider[] OverlapSphere(Vector3 p, float r, int layerMask) => new Collider[0];
        public static int OverlapSphereNonAlloc(Vector3 p, float r, Collider[] results) => 0;
        public static int OverlapSphereNonAlloc(Vector3 p, float r, Collider[] results, int layerMask) => 0;
        public static void IgnoreCollision(Collider a, Collider b) { }
        public static void IgnoreLayerCollision(int a, int b, bool ignore) { }
    }
    public struct LayerMask
    {
        public int value;
        public static int GetMask(params string[] names) => 0;
        public static int NameToLayer(string n) => 0;
        public static string LayerToName(int l) => "";
        public static implicit operator int(LayerMask m) => 0;
        public static implicit operator LayerMask(int i) => default;
    }
}

namespace UnityEngine.SceneManagement
{
    public struct Scene
    {
        public string name { get; }
        public string path { get; }
        public int buildIndex { get; }
        public bool isLoaded { get; }
        public bool IsValid() => false;
        public GameObject[] GetRootGameObjects() => new GameObject[0];
    }
    public enum LoadSceneMode { Single, Additive }
    public static class SceneManager
    {
        public static void LoadScene(string name) { }
        public static void LoadScene(int index) { }
        public static void LoadScene(string name, LoadSceneMode mode) { }
        public static UnityEngine.AsyncOperation LoadSceneAsync(string name) => null;
        public static Scene GetActiveScene() => default;
        public static int sceneCount => 0;
        public static event Action<Scene, LoadSceneMode> sceneLoaded;
        public static event Action<Scene> sceneUnloaded;
    }
}

namespace UnityEngine
{
    public class AsyncOperation : YieldInstruction { public bool isDone { get; } public float progress { get; } public bool allowSceneActivation { get; set; } }
}

namespace UnityEngine.Networking
{
    public class DownloadHandler : IDisposable { public string text { get; } public byte[] data { get; } public void Dispose() { } }
    public class DownloadHandlerBuffer : DownloadHandler { }
    public class UploadHandler : IDisposable { public byte[] data { get; } public string contentType { get; set; } public void Dispose() { } }
    public class UploadHandlerRaw : UploadHandler { public UploadHandlerRaw(byte[] d) { } }
    public class UnityWebRequestAsyncOperation : AsyncOperation { public UnityWebRequest webRequest { get; } }
    public class UnityWebRequest : IDisposable
    {
        public enum Result { InProgress, Success, ConnectionError, ProtocolError, DataProcessingError }
        public const string kHttpVerbGET = "GET";
        public const string kHttpVerbPOST = "POST";
        public const string kHttpVerbPUT = "PUT";
        public const string kHttpVerbDELETE = "DELETE";
        public const string kHttpVerbHEAD = "HEAD";
        public UnityWebRequest() { }
        public UnityWebRequest(string url) { }
        public UnityWebRequest(string url, string method) { }
        public string url { get; set; }
        public string method { get; set; }
        public string error { get; }
        public long responseCode { get; }
        public bool isDone { get; }
        public float downloadProgress { get; }
        public Result result { get; }
        public int timeout { get; set; }
        public DownloadHandler downloadHandler { get; set; }
        public UploadHandler uploadHandler { get; set; }
        public void SetRequestHeader(string n, string v) { }
        public string GetRequestHeader(string n) => "";
        public string GetResponseHeader(string n) => "";
        public UnityWebRequestAsyncOperation SendWebRequest() => null;
        public void Abort() { }
        public void Dispose() { }
        public static UnityWebRequest Get(string url) => null;
        public static UnityWebRequest Post(string url, string body, string contentType) => null;
        public static UnityWebRequest Delete(string url) => null;
        public static UnityWebRequest Put(string url, byte[] body) => null;
        public static string EscapeURL(string s) => s;
        public static string UnEscapeURL(string s) => s;
    }
}

namespace UnityEngine.EventSystems
{
    public class EventSystem : UnityEngine.Behaviour { }
    public class StandaloneInputModule : UnityEngine.Behaviour { }
    public class BaseInputModule : UnityEngine.Behaviour { }

    /// <summary>Payload passed to every pointer callback. Only the members used here.</summary>
    public class PointerEventData
    {
        public UnityEngine.Vector2 position;
        public UnityEngine.GameObject pointerEnter;
        public int pointerId;
        public bool dragging;
    }

    // Real Unity declares one method per handler interface; the stub does too, so a
    // class claiming the interface must actually implement it.
    public interface IPointerClickHandler { void OnPointerClick(PointerEventData eventData); }
    public interface IPointerEnterHandler { void OnPointerEnter(PointerEventData eventData); }
    public interface IPointerExitHandler { void OnPointerExit(PointerEventData eventData); }
    public interface IPointerDownHandler { void OnPointerDown(PointerEventData eventData); }
    public interface IPointerUpHandler { void OnPointerUp(PointerEventData eventData); }
    public interface IDragHandler { void OnDrag(PointerEventData eventData); }
}

namespace UnityEngine.UI
{
    public class CanvasScaler : UnityEngine.Behaviour
    {
        public enum ScaleMode { ConstantPixelSize, ScaleWithScreenSize, ConstantPhysicalSize }
        public enum ScreenMatchMode { MatchWidthOrHeight, Expand, Shrink }
        public ScaleMode uiScaleMode { get; set; }
        public ScreenMatchMode screenMatchMode { get; set; }
        public UnityEngine.Vector2 referenceResolution { get; set; }
        public float matchWidthOrHeight { get; set; }
        public float referencePixelsPerUnit { get; set; }
    }
    public class GraphicRaycaster : UnityEngine.Behaviour { }
    public class Graphic : UnityEngine.Behaviour { public UnityEngine.Color color { get; set; } public bool raycastTarget { get; set; } public UnityEngine.RectTransform rectTransform { get; } }
    public class MaskableGraphic : Graphic { }
    public class Image : MaskableGraphic
    {
        public enum Type { Simple, Sliced, Tiled, Filled }
        public enum FillMethod { Horizontal, Vertical, Radial90, Radial180, Radial360 }
        public UnityEngine.Sprite sprite { get; set; }
        public Type type { get; set; }
        public FillMethod fillMethod { get; set; }
        public float fillAmount { get; set; }
        public bool preserveAspect { get; set; }
        public UnityEngine.Material material { get; set; }
    }
    public class RawImage : MaskableGraphic { public UnityEngine.Texture texture { get; set; } }
    public class Text : MaskableGraphic { public string text { get; set; } public int fontSize { get; set; } }
    /// <summary>
    /// Tint states for a Selectable. Real Unity multiplies these against the target
    /// Graphic's own colour, which is why values above 1 brighten rather than wash out.
    /// </summary>
    public struct ColorBlock
    {
        public UnityEngine.Color normalColor;
        public UnityEngine.Color highlightedColor;
        public UnityEngine.Color pressedColor;
        public UnityEngine.Color selectedColor;
        public UnityEngine.Color disabledColor;
        public float colorMultiplier;
        public float fadeDuration;
    }

    public class Selectable : UnityEngine.Behaviour
    {
        public bool interactable { get; set; }
        public UnityEngine.Sprite image { get; set; }
        public Graphic targetGraphic { get; set; }
        public ColorBlock colors { get; set; }
    }
    public class Button : Selectable { public ButtonClickedEvent onClick { get; } public class ButtonClickedEvent : UnityEngine.Events.UnityEvent { } }
    public class Slider : Selectable { public float value { get; set; } public float minValue { get; set; } public float maxValue { get; set; } }
    public class Toggle : Selectable { public bool isOn { get; set; } }
    public class ScrollRect : UnityEngine.Behaviour { public UnityEngine.RectTransform content { get; set; } public bool horizontal { get; set; } public bool vertical { get; set; } public UnityEngine.RectTransform viewport { get; set; } }
    public class Mask : UnityEngine.Behaviour { public bool showMaskGraphic { get; set; } }
    public class RectMask2D : UnityEngine.Behaviour { }
    public class LayoutGroup : UnityEngine.Behaviour { public RectOffset padding { get; set; } public TextAnchor childAlignment { get; set; } }
    public class HorizontalOrVerticalLayoutGroup : LayoutGroup { public float spacing { get; set; } public bool childForceExpandWidth { get; set; } public bool childForceExpandHeight { get; set; } public bool childControlWidth { get; set; } public bool childControlHeight { get; set; } }
    public class VerticalLayoutGroup : HorizontalOrVerticalLayoutGroup { }
    public class HorizontalLayoutGroup : HorizontalOrVerticalLayoutGroup { }
    public class ContentSizeFitter : UnityEngine.Behaviour { public enum FitMode { Unconstrained, MinSize, PreferredSize } public FitMode horizontalFit { get; set; } public FitMode verticalFit { get; set; } }
    public class LayoutElement : UnityEngine.Behaviour { public float preferredHeight { get; set; } public float preferredWidth { get; set; } public float minHeight { get; set; } }
    public class RectOffset { public RectOffset() { } public RectOffset(int l, int r, int t, int b) { } public int left { get; set; } public int right { get; set; } public int top { get; set; } public int bottom { get; set; } }
}

namespace UnityEngine
{
    public class RectTransform : Transform
    {
        public Vector2 anchorMin { get; set; }
        public Vector2 anchorMax { get; set; }
        public Vector2 anchoredPosition { get; set; }
        public Vector2 sizeDelta { get; set; }
        public Vector2 pivot { get; set; }
        public Vector2 offsetMin { get; set; }
        public Vector2 offsetMax { get; set; }
        public Rect rect { get; }
    }
    public class Canvas : Behaviour
    {
        public RenderMode renderMode { get; set; }
        public Camera worldCamera { get; set; }
        public int sortingOrder { get; set; }
        public bool overrideSorting { get; set; }
    }
    public enum RenderMode { ScreenSpaceOverlay, ScreenSpaceCamera, WorldSpace }
    public class CanvasGroup : Behaviour { public float alpha { get; set; } public bool interactable { get; set; } public bool blocksRaycasts { get; set; } }
    public enum TextAnchor { UpperLeft, UpperCenter, UpperRight, MiddleLeft, MiddleCenter, MiddleRight, LowerLeft, LowerCenter, LowerRight }
}

namespace UnityEngine.Events
{
    public class UnityEventBase { public void RemoveAllListeners() { } public int GetPersistentEventCount() => 0; }
    public class UnityEvent : UnityEventBase { public void AddListener(UnityAction c) { } public void RemoveListener(UnityAction c) { } public void Invoke() { } }
    public class UnityEvent<T> : UnityEventBase { public void AddListener(UnityAction<T> c) { } public void RemoveListener(UnityAction<T> c) { } public void Invoke(T a) { } }
    public delegate void UnityAction();
    public delegate void UnityAction<T>(T a);
}

namespace UnityEngine.Rendering
{
    /// <summary>Ambient lighting model. Trilight is the sky/equator/ground gradient.</summary>
    public enum AmbientMode { Skybox = 0, Trilight = 1, Flat = 3, Custom = 4 }

    public enum ShadowCastingMode { Off = 0, On = 1, TwoSided = 2, ShadowsOnly = 3 }

    public enum LightProbeUsage { Off = 0, BlendProbes = 1, UseProxyVolume = 2, AddProxyVolumes = 4 }
    public enum ReflectionProbeUsage { Off = 0, BlendProbes = 1, BlendProbesAndSkybox = 2, Simple = 3 }

    public enum BlendMode { Zero = 0, One = 1, SrcAlpha = 5, OneMinusSrcAlpha = 10 }

    public enum RenderQueue { Background = 1000, Geometry = 2000, AlphaTest = 2450, Transparent = 3000, Overlay = 4000 }

    public class RenderPipelineAsset : UnityEngine.ScriptableObject { }
    public static class GraphicsSettings
    {
        public static RenderPipelineAsset defaultRenderPipeline { get; set; }
        public static RenderPipelineAsset renderPipelineAsset { get; set; }
        public static RenderPipelineAsset currentRenderPipeline { get; }
    }
}

namespace TMPro
{
    public enum TextAlignmentOptions
    {
        TopLeft, Top, TopRight, Left, Center, Right, BottomLeft, Bottom, BottomRight,
        Midline, MidlineLeft, MidlineRight, Baseline, Capline, TopJustified, Justified
    }
    public enum TextOverflowModes { Overflow, Ellipsis, Masking, Truncate, ScrollRect, Page, Linked }
    public class TMP_FontAsset : UnityEngine.ScriptableObject
    {
        public UnityEngine.Texture2D atlasTexture => null;
        public UnityEngine.Material material { get; set; }
        public bool TryAddCharacters(string characters) => true;
        public System.Collections.Generic.List<TMP_Character> characterTable => null;
        public AtlasPopulationMode atlasPopulationMode { get; set; }

        public static TMP_FontAsset CreateFontAsset(
            UnityEngine.Font font,
            int samplingPointSize,
            int atlasPadding,
            UnityEngine.TextCore.LowLevel.GlyphRenderMode renderMode,
            int atlasWidth,
            int atlasHeight,
            AtlasPopulationMode atlasPopulationMode = AtlasPopulationMode.Dynamic,
            bool enableMultiAtlasSupport = true) => null;
    }

    public class TMP_Character { public uint unicode; }

    public enum AtlasPopulationMode { Static, Dynamic, DynamicOS }
    public enum TextWrappingModes { NoWrap = 0, Normal = 1, PreserveWhitespace = 2, PreserveWhitespaceNoWrap = 3 }

    public class TMP_Text : UnityEngine.UI.MaskableGraphic
    {
        public string text { get; set; }
        public float fontSize { get; set; }
        public float fontSizeMin { get; set; }
        public float fontSizeMax { get; set; }
        public bool enableAutoSizing { get; set; }
        public TextAlignmentOptions alignment { get; set; }
        public TMP_FontAsset font { get; set; }
        public TextOverflowModes overflowMode { get; set; }
        public bool enableWordWrapping { get; set; }
        public UnityEngine.Color faceColor { get; set; }
        public float characterSpacing { get; set; }
        public UnityEngine.FontStyles fontStyle { get; set; }
        public TextWrappingModes textWrappingMode { get; set; }
        public float outlineWidth { get; set; }
        public UnityEngine.Color32 outlineColor { get; set; }
    }
    public class TextMeshProUGUI : TMP_Text { }
    public class TMP_InputField : UnityEngine.UI.Selectable
    {
        public enum ContentType { Standard, Autocorrected, IntegerNumber, DecimalNumber, Alphanumeric, Name, EmailAddress, Password, Pin, Custom }
        public enum InputType { Standard, AutoCorrect, Password }
        public string text { get; set; }
        public ContentType contentType { get; set; }
        public InputType inputType { get; set; }
        public int characterLimit { get; set; }
        public TMP_Text textComponent { get; set; }
        public UnityEngine.RectTransform textViewport { get; set; }
        public UnityEngine.UI.Graphic placeholder { get; set; }
        public SubmitEvent onSubmit { get; }
        public SubmitEvent onEndEdit { get; }
        public OnChangeEvent onValueChanged { get; }
        public void ActivateInputField() { }
        public class SubmitEvent : UnityEngine.Events.UnityEvent<string> { }
        public class OnChangeEvent : UnityEngine.Events.UnityEvent<string> { }
    }
    // Real Unity: TMP_Settings is a ScriptableObject with a static `instance`. It was
    // previously stubbed as a static class, which made `new SerializedObject(settings)`
    // impossible to express.
    public class TMP_Settings : UnityEngine.ScriptableObject
    {
        public static TMP_FontAsset defaultFontAsset => null;
        public static TMP_Settings instance => null;
    }
}

namespace UnityEngine
{
    [Flags] public enum FontStyles { Normal = 0, Bold = 1, Italic = 2, Underline = 4, UpperCase = 8, LowerCase = 16, SmallCaps = 32, Strikethrough = 64, Superscript = 128, Subscript = 256, Highlight = 512 }
}

namespace UnityEngine.TextCore.LowLevel
{
    /// <summary>How TMP rasterises glyphs into its atlas. SDFAA is the default for UI text.</summary>
    public enum GlyphRenderMode
    {
        SMOOTH_HINTED, SMOOTH, RASTER_HINTED, RASTER,
        SDF, SDF8, SDF16, SDF32, SDFAA_HINTED, SDFAA,
    }
}
