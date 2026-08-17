using UnityEngine;
using UnityEngine.SceneManagement;
using GDGGo.Supabase;

namespace GDGGo.Core
{
    /// <summary>
    /// App-level singleton: owns scene transitions and guarantees <see cref="SupabaseSession"/>
    /// exists. The <b>AudioManager</b> is intentionally NOT created here — the Boot scene
    /// owns it (AudioSetup wires its clips there), and bootstrapping a bare one would win
    /// the DontDestroyOnLoad singleton race and destroy the clip-wired manager.
    ///
    /// It bootstraps itself via <c>RuntimeInitializeOnLoadMethod</c> rather than relying
    /// on the Boot scene running first. That matters in two places: pressing Play
    /// directly on Game.unity while iterating, and a web build where a player deep-links
    /// or reloads on a scene that is not Boot. Without it, every
    /// <c>GameManager.Instance?.LoadMenu()</c> in the UI silently does nothing.
    /// </summary>
    public sealed class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public const string SceneBoot = "Boot";
        public const string SceneMenu = "Menu";
        public const string SceneCarSelect = "CarSelect";
        public const string SceneGame = "Game";
        public const string SceneGameOver = "GameOver";

        [Header("Boot")]
        [Tooltip("Seconds to hold the splash before routing to the Menu.")]
        public float bootSplashDuration = 1.2f;

        /// <summary>
        /// Creates the manager before the first scene's Awake if no scene provides one.
        /// </summary>
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Bootstrap()
        {
            if (Instance != null) return;
            var go = new GameObject(nameof(GameManager));
            go.AddComponent<GameManager>();
        }

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }

            Instance = this;
            DontDestroyOnLoad(gameObject);

            EnsureService<SupabaseSession>();
            // Deliberately NOT creating an AudioManager here. See the class summary: a
            // bare one would take the singleton slot from the Boot scene's clip-wired
            // manager and silence the whole game. Fix, do not re-add Audio here.

            // WebGL ignores vSync; an explicit target keeps the frame pacing sane and
            // stops the browser tab from spinning the GPU harder than 60fps needs.
            Application.targetFrameRate = 60;
        }

        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        private static void EnsureService<T>() where T : MonoBehaviour
        {
            if (Object.FindFirstObjectByType<T>() != null) return;
            var go = new GameObject(typeof(T).Name);
            go.AddComponent<T>();
        }

        private void Start()
        {
            // Only the Boot scene auto-routes; every other scene stays put.
            if (SceneManager.GetActiveScene().name == SceneBoot)
                Invoke(nameof(LoadMenu), bootSplashDuration);
        }

        // ============================================================
        // Scene transitions — wired to UI buttons
        // ============================================================
        public void LoadMenu() => SceneManager.LoadScene(SceneMenu);
        public void LoadCarSelect() => SceneManager.LoadScene(SceneCarSelect);
        public void LoadGame() => SceneManager.LoadScene(SceneGame);
        public void LoadGameOver() => SceneManager.LoadScene(SceneGameOver);
        public void QuitToBoot() => SceneManager.LoadScene(SceneBoot);
    }
}
