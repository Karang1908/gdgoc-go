using UnityEngine;
using UnityEngine.SceneManagement;
using GDGGo.Supabase;

namespace GDGGo.Core
{
    /// <summary>
    /// App-level singleton: manages game initialization and frame rate pacing.
    /// In the website-shells-the-game architecture, the build contains only the Game scene.
    /// </summary>
    public sealed class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public const string SceneGame = "Game";

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
            SupabaseSession.Instance?.InitFromUrlQuery();

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

        public void LoadGame() => SceneManager.LoadScene(SceneGame);
    }
}
