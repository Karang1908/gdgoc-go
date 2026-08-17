using UnityEngine;

namespace GDGGo.Audio
{
    /// <summary>
    /// Round-robin one-shot SFX pool, plus a looping music bed.
    ///
    /// All clips are Kenney CC0 (see docs/ASSETS.md). Every Play* wrapper is null-safe on
    /// both the clip and the pool, so an unassigned clip silently does nothing rather
    /// than throwing on a hot path — this runs in WebGL where an exception per coin
    /// would tank the frame rate.
    /// </summary>
    public sealed class AudioManager : MonoBehaviour
    {
        public static AudioManager Instance { get; private set; }

        [Header("UI")]
        public AudioClip uiClick;
        public AudioClip uiHover;
        public AudioClip loginSuccess;

        [Header("Gameplay")]
        public AudioClip coinPickup;
        public AudioClip pillPickup;
        public AudioClip crash;
        public AudioClip jump;
        public AudioClip swerve;
        public AudioClip powerUpPick;
        public AudioClip policeWarning;
        public AudioClip gameOver;
        public AudioClip fuelPickup;
        public AudioClip lowFuelWarning;

        [Header("Music")]
        public AudioClip musicLoop;
        [Range(0f, 1f)] public float musicVolume = 0.35f;

        [Header("Pool")]
        [Range(1, 16)] public int poolSize = 6;
        [Range(0f, 1f)] public float sfxVolume = 0.85f;

        private AudioSource[] _sources;
        private AudioSource _music;
        private int _cursor;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            _sources = new AudioSource[poolSize];
            for (int i = 0; i < poolSize; i++)
            {
                var go = new GameObject($"SFX_{i}");
                go.transform.SetParent(transform, false);
                var src = go.AddComponent<AudioSource>();
                src.playOnAwake = false;
                src.spatialBlend = 0f;   // 2D
                _sources[i] = src;
            }

            var musicGo = new GameObject("Music");
            musicGo.transform.SetParent(transform, false);
            _music = musicGo.AddComponent<AudioSource>();
            _music.playOnAwake = false;
            _music.loop = true;
            _music.spatialBlend = 0f;
            _music.volume = musicVolume;

            // A null clip is silence, not an exception — so an unwired manager looks
            // identical to a working one until someone plays the build. Surface "why is
            // it silent?" the first time we come up mostly-empty.
            WarnIfClipsMissing();
        }

        private bool _warnedMissing;
        private void WarnIfClipsMissing()
        {
            if (_warnedMissing) return;

            AudioClip[] required = { uiClick, loginSuccess, coinPickup, crash, jump, swerve, powerUpPick, gameOver, policeWarning, musicLoop, uiHover };
            int missing = 0;
            for (int i = 0; i < required.Length; i++) if (required[i] == null) missing++;

            if (missing >= 6)
            {
                _warnedMissing = true;
                Debug.LogWarning("[AudioManager] " + missing + "/" + required.Length + " clips are unassigned — the " +
                                 "game is silent. Run \"GDG Go > 5. Assign Audio Clips\" (or the full setup).");
            }
        }

        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        /// <summary>Plays a one-shot on the next pool source.</summary>
        public void Play(AudioClip clip, float volumeScale = 1f, float pitch = 1f)
        {
            if (clip == null || _sources == null || _sources.Length == 0) return;

            AudioSource src = _sources[_cursor];
            _cursor = (_cursor + 1) % _sources.Length;
            if (src == null) return;

            src.clip = clip;
            src.volume = sfxVolume * volumeScale;
            src.pitch = pitch;
            src.loop = false;
            src.Play();
        }

        public void PlayMusic()
        {
            if (_music == null || musicLoop == null) return;
            if (_music.isPlaying) return;
            _music.clip = musicLoop;
            _music.volume = musicVolume;
            _music.Play();
        }

        public void StopMusic()
        {
            if (_music != null) _music.Stop();
        }

        // Convenience wrappers — what the rest of the game calls.
        public void PlayClick() => Play(uiClick);
        public void PlayHover() => Play(uiHover, 0.6f);
        public void PlayLogin() => Play(loginSuccess);
        public void PlayCrash() => Play(crash, 1f);
        public void PlayJump() => Play(jump, 0.7f);
        public void PlaySwerve() => Play(swerve, 0.5f);
        public void PlayPowerUp() => Play(powerUpPick);
        public void PlayPoliceWarning() => Play(policeWarning);
        public void PlayGameOver() => Play(gameOver);

        /// <summary>
        /// Coin pickups ramp in pitch with the combo multiplier — the standard runner
        /// trick that makes a long coin line feel like it is building to something.
        /// </summary>
        public void PlayCoin()
        {
            int multiplier = Core.GameSession.Instance != null ? Core.GameSession.Instance.Multiplier : 1;
            float pitch = Mathf.Clamp(1f + (multiplier - 1) * 0.06f, 1f, 1.6f);
            Play(coinPickup, 0.75f, pitch);
        }

        public void PlayPill() => Play(pillPickup != null ? pillPickup : coinPickup, 1f, 1f);

        public void PlayFuel() => Play(fuelPickup != null ? fuelPickup : powerUpPick, 0.9f);

        /// <summary>
        /// The low-fuel sting. Deliberately louder than a pickup and pitched down — it is
        /// a warning, and it competes with engine noise and the police siren.
        /// </summary>
        public void PlayLowFuel() => Play(lowFuelWarning != null ? lowFuelWarning : policeWarning, 1f, 0.85f);
    }
}
