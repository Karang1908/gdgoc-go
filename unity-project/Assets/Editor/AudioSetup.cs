using UnityEditor;
using UnityEngine;

namespace GDGGo.EditorTools
{
    /// <summary>
    /// Assigns the Kenney CC0 clips onto an <see cref="Audio.AudioManager"/>.
    ///
    /// Without this the manager's clip fields are all null and the game ships silent —
    /// every Play* call is null-guarded, so nothing errors and the silence is easy to
    /// miss until someone plays the build.
    ///
    /// Clip choices are deliberate rather than arbitrary:
    ///   * coin uses a short plucked note, because the pitch is scaled by the combo
    ///     multiplier at runtime and a tonal source is the only kind that survives that,
    ///   * crash uses a heavy metal impact rather than a jingle, so it reads as a
    ///     failure rather than as another reward,
    ///   * the police warning is a sting the player can hear over engine noise.
    /// </summary>
    public static class AudioSetup
    {
        private const string UI = "Assets/Audio/UI";
        private const string Impacts = "Assets/Audio/Impacts";
        private const string Jingles = "Assets/Audio/Jingles";

        private const string GameScenePath = "Assets/Scenes/Game.unity";

        /// <summary>
        /// Opens the Game scene (where the AudioManager lives) and wires its clips.
        /// Opening the scene here rather than requiring the user to have it open is what
        /// lets this run unattended as the last step of the full setup.
        /// </summary>
        [MenuItem("GDG Go/5. Assign Audio Clips", priority = 40)]
        public static void AssignAll()
        {
            if (!System.IO.File.Exists(GameScenePath))
            {
                Debug.LogError($"[AudioSetup] {GameScenePath} missing — run \"GDG Go > 1. Project Setup\" first.");
                return;
            }

            UnityEditor.SceneManagement.EditorSceneManager.OpenScene(
                GameScenePath, UnityEditor.SceneManagement.OpenSceneMode.Single);

            var managers = Object.FindObjectsByType<Audio.AudioManager>(FindObjectsSortMode.None);
            if (managers == null || managers.Length == 0)
            {
                Debug.LogWarning("[AudioSetup] No AudioManager in the Game scene — " +
                                 "run \"GDG Go > 3. Build Game Scene\" first.");
                return;
            }

            foreach (Audio.AudioManager manager in managers)
            {
                Assign(manager);
                EditorUtility.SetDirty(manager);
            }

            UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(
                UnityEngine.SceneManagement.SceneManager.GetActiveScene());
            UnityEditor.SceneManagement.EditorSceneManager.SaveOpenScenes();

            Debug.Log($"[AudioSetup] Assigned clips on {managers.Length} AudioManager(s).");
        }

        private static void Assign(Audio.AudioManager manager)
        {
            manager.uiClick = Clip($"{UI}/click1.ogg");
            manager.uiHover = Clip($"{UI}/rollover1.ogg");
            manager.loginSuccess = Clip($"{Jingles}/jingles_STEEL00.ogg");

            manager.coinPickup = Clip($"{Jingles}/jingles_PIZZI00.ogg");
            manager.pillPickup = Clip($"{Jingles}/jingles_NES07.ogg");
            manager.powerUpPick = Clip($"{Jingles}/jingles_NES00.ogg");

            manager.crash = Clip($"{Impacts}/impactMetal_heavy_000.ogg");
            manager.jump = Clip($"{Impacts}/impactPlate_light_000.ogg");
            manager.swerve = Clip($"{Impacts}/impactGeneric_light_000.ogg");

            manager.policeWarning = Clip($"{Jingles}/jingles_HIT00.ogg");
            manager.gameOver = Clip($"{Jingles}/jingles_SAX00.ogg");

            // Fuel: a positive but non-tonal chime, so it does not read as another coin.
            manager.fuelPickup = Clip($"{Jingles}/jingles_STEEL01.ogg");
            manager.lowFuelWarning = Clip($"{Jingles}/jingles_NES13.ogg");

            // musicLoop is deliberately left unassigned. Every clip in the Kenney music
            // pack here is a *jingle* — the longest is 1.76 s — and looping a one-second
            // sting under continuous gameplay is worse than silence. PlayMusic() no-ops
            // on a null clip, so the game stays quiet until a real loop is dropped in.
            // Drop a track at Assets/Audio/Music/ and assign it here to enable it.
        }

        /// <summary>
        /// Loads a clip, warning rather than throwing when a pack laid its files out
        /// differently. A missing clip is silence, never a crash.
        /// </summary>
        private static AudioClip Clip(string path)
        {
            var clip = AssetDatabase.LoadAssetAtPath<AudioClip>(path);
            if (clip == null)
                Debug.LogWarning($"[AudioSetup] Missing audio clip: {path} — that sound will be silent.");
            return clip;
        }
    }
}
