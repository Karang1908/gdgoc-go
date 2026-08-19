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

        private void Start()
        {
            EnsureSubwaySurfersClips();
        }

        private void EnsureSubwaySurfersClips()
        {
            if (coinPickup == null) coinPickup = GenerateSubwayCoin();
            if (pillPickup == null) pillPickup = GenerateGoldenJackpot();
            if (powerUpPick == null) powerUpPick = GeneratePowerUpSurge();
            if (jump == null) jump = GenerateRocketJump();
        }

        private AudioClip GenerateSubwayCoin()
        {
            int sampleRate = 44100;
            int samples = (int)(sampleRate * 0.16f);
            float[] data = new float[samples];
            for (int i = 0; i < samples; i++)
            {
                float t = (float)i / sampleRate;
                float env = Mathf.Exp(-t * 26f);
                float wave = Mathf.Sin(2f * Mathf.PI * 1760f * t) * 0.7f + Mathf.Sin(2f * Mathf.PI * 3520f * t) * 0.3f;
                data[i] = wave * env * 0.85f;
            }
            var clip = AudioClip.Create("SubwayCoin", samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private AudioClip GenerateGoldenJackpot()
        {
            int sampleRate = 44100;
            int samples = (int)(sampleRate * 0.38f);
            float[] data = new float[samples];
            float[] freqs = { 1046.5f, 1318.5f, 1567.9f, 2093.0f }; // C6, E6, G6, C7
            for (int i = 0; i < samples; i++)
            {
                float t = (float)i / sampleRate;
                int note = Mathf.Clamp((int)(t / 0.07f), 0, 3);
                float f = freqs[note];
                float noteT = t - note * 0.07f;
                float env = Mathf.Exp(-noteT * 14f);
                float wave = Mathf.Sin(2f * Mathf.PI * f * t) * 0.65f + Mathf.Sin(2f * Mathf.PI * f * 2f * t) * 0.25f;
                data[i] = wave * env * 0.9f;
            }
            var clip = AudioClip.Create("GDGJackpot", samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private AudioClip GeneratePowerUpSurge()
        {
            int sampleRate = 44100;
            int samples = (int)(sampleRate * 0.42f);
            float[] data = new float[samples];
            for (int i = 0; i < samples; i++)
            {
                float t = (float)i / sampleRate;
                float f = Mathf.Lerp(300f, 1800f, t / 0.42f);
                float env = t < 0.08f ? t / 0.08f : Mathf.Exp(-(t - 0.08f) * 7f);
                float wave = Mathf.Sin(2f * Mathf.PI * f * t) * 0.6f + Mathf.Sin(2f * Mathf.PI * (f * 1.5f) * t) * 0.3f;
                data[i] = wave * env * 0.85f;
            }
            var clip = AudioClip.Create("PowerUpSurge", samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        private AudioClip GenerateRocketJump()
        {
            int sampleRate = 44100;
            int samples = (int)(sampleRate * 0.28f);
            float[] data = new float[samples];
            for (int i = 0; i < samples; i++)
            {
                float t = (float)i / sampleRate;
                float env = Mathf.Exp(-t * 9f);
                float noise = (Random.value * 2f - 1f) * 0.5f;
                float sweep = Mathf.Sin(2f * Mathf.PI * Mathf.Lerp(120f, 650f, t / 0.28f) * t) * 0.5f;
                data[i] = (noise + sweep) * env * 0.85f;
            }
            var clip = AudioClip.Create("RocketBlast", samples, 1, sampleRate, false);
            clip.SetData(data, 0);
            return clip;
        }

        // Convenience wrappers — what the rest of the game calls.
        public void PlayClick() => Play(uiClick);
        public void PlayHover() => Play(uiHover, 0.6f);
        public void PlayLogin() => Play(loginSuccess);
        public void PlayCrash() => Play(crash, 1f);
        public void PlayJump() => Play(jump != null ? jump : GenerateRocketJump(), 0.85f);
        public void PlaySwerve() => Play(swerve, 0.5f);
        public void PlayPowerUp() => Play(powerUpPick != null ? powerUpPick : GeneratePowerUpSurge(), 0.45f);
        public void PlayPoliceWarning() => Play(policeWarning);
        public void PlayGameOver() => Play(gameOver);

        /// <summary>
        /// Subway Surfers rapid pentatonic pitch combo: each coin in a quick succession climbs up the scale!
        /// </summary>
        public void PlayCoin()
        {
            int multiplier = Core.GameSession.Instance != null ? Core.GameSession.Instance.Multiplier : 1;
            float pitch = Mathf.Clamp(1f + (multiplier - 1) * 0.08f, 1f, 1.8f);
            Play(coinPickup != null ? coinPickup : GenerateSubwayCoin(), 0.35f, pitch);
        }

        public void PlayPill() => Play(pillPickup != null ? pillPickup : GenerateGoldenJackpot(), 0.45f, 1f);

        public void PlayFuel() => Play(fuelPickup != null ? fuelPickup : GeneratePowerUpSurge(), 0.9f);

        public void PlayLowFuel() => Play(lowFuelWarning != null ? lowFuelWarning : policeWarning, 1f, 0.85f);
    }
}
