using UnityEngine;
using GDGGo.Gameplay;

namespace GDGGo.Core
{
    /// <summary>
    /// Owns everything that makes a run a run: score, coins, the combo multiplier, the
    /// active power-ups, and the "Heat" gap that decides when the police catch you.
    ///
    /// <b>Heat is the whole game.</b> It is a 0..1 gauge of how far ahead of the police
    /// you are; at 0 you are caught and the run ends. It moves as a function of how fast
    /// you are travelling relative to the current difficulty baseline:
    ///   * boosting outruns them        -> Heat climbs
    ///   * cruising loses ground slowly -> Heat drifts down, faster as difficulty rises
    ///   * braking lets them close       -> Heat drops hard
    ///   * crashing                      -> Heat takes a large one-off hit
    ///
    /// That coupling is deliberate: it means a run's length is decided by how well the
    /// player drives, not by a timer. The previous model drained Heat at a flat
    /// 0.02/sec regardless of input, so every run ended at exactly 50 seconds with an
    /// identical score — which for an online leaderboard is the one outcome that makes
    /// the whole feature pointless.
    /// </summary>
    public sealed class GameSession : MonoBehaviour
    {
        public static GameSession Instance { get; private set; }

        // ---------------- Run state ----------------
        public bool IsRunning { get; private set; }
        public int CoinCount { get; private set; }
        public int GDGPillsCollected { get; private set; }
        public float DistanceMeters => _world != null ? _world.Distance : 0f;
        public float RunSeconds { get; private set; }

        /// <summary>Distance points + coin points. Recomputed on read; never stored.</summary>
        public int Score => Mathf.RoundToInt(DistanceMeters) * PointsPerMetre + _coinScore;

        public const int PointsPerMetre = 2;

        // ---------------- Combo ----------------
        [Header("Combo")]
        [Tooltip("Seconds after a coin during which the next coin extends the combo.")]
        public float comboWindowSeconds = 2.2f;
        [Tooltip("Coins needed per multiplier step.")]
        public int coinsPerComboStep = 8;
        [Tooltip("Highest multiplier the combo can reach.")]
        public int maxMultiplier = 8;

        /// <summary>Current coin score multiplier (1..maxMultiplier), doubled again by the 2x power-up.</summary>
        public int Multiplier { get; private set; } = 1;
        public float ComboTimeLeft { get; private set; }
        private int _comboCoins;

        // ---------------- Heat / police ----------------
        [Header("Heat (police gap)")]
        [Tooltip("Speed ratio at which Heat holds steady. Above 1 so plain cruising slowly loses ground.")]
        public float cruiseThreshold = 1.04f;
        [Tooltip("How strongly speed relative to baseline drives Heat.")]
        public float heatResponse = 0.14f;
        [Tooltip("Extra Heat drain per second once difficulty is maxed.")]
        public float difficultyDrain = 0.05f;
        [Tooltip("Heat lost when the player crashes into an obstacle or traffic.")]
        public float crashHeatPenalty = 0.26f;
        [Tooltip("Heat lost for clipping a pedestrian.")]
        public float pedestrianHeatPenalty = 0.08f;
        [Tooltip("Heat regained per coin — rewards taking the risky line.")]
        public float heatPerCoin = 0.006f;

        /// <summary>0 = caught, 1 = maximum safe gap.</summary>
        public float Heat { get; private set; } = 1f;
        public bool IsHeatFrozen { get; private set; }

        // ---------------- Fuel ----------------
        [Header("Fuel")]
        [Tooltip("Seconds of driving a full tank lasts at cruising speed.")]
        public float fuelSecondsAtCruise = 42f;

        [Tooltip("Fraction of a tank restored by one fuel pickup.")]
        [Range(0.05f, 1f)] public float fuelPerCan = 0.28f;

        [Tooltip("Extra drain multiplier while boosting — speed costs fuel.")]
        public float boostFuelMultiplier = 2.1f;

        /// <summary>
        /// 0 = empty, 1 = full tank. Drains with distance rather than wall-clock, so the
        /// range of a tank is a fixed number of metres no matter how the player drives —
        /// which keeps "collect fuel" a routing problem rather than a speed penalty.
        /// Hitting 0 ends the run exactly like being caught.
        /// </summary>
        public float Fuel { get; private set; } = 1f;

        /// <summary>Fires when fuel crosses below <see cref="LowFuelThreshold"/>, once per refill.</summary>
        public event System.Action OnLowFuel;
        public const float LowFuelThreshold = 0.25f;
        private bool _lowFuelAnnounced;

        // ---------------- Power-ups ----------------
        public bool HasMagnet { get; private set; }
        public bool Has2x { get; private set; }
        public bool HasShield { get; private set; }
        public bool HasNitro { get; private set; }
        public bool PoliceFreezeActive { get; private set; }

        /// <summary>Fires once per run, with (score, coins, metres).</summary>
        public event System.Action<int, int, int> OnGameOver;

        /// <summary>Fires when the player crashes but survives — for camera shake / SFX.</summary>
        public event System.Action OnCrash;

        /// <summary>Fires on every coin, with the value actually awarded.</summary>
        public event System.Action<int> OnCoin;

        // ---------------- Cross-scene result cache ----------------
        // Statics, because the GameOver scene reads these after this GameObject is gone.
        public static int LastScore { get; private set; }
        public static int LastCoins { get; private set; }
        public static int LastMeters { get; private set; }
        public static int LastPills { get; private set; }
        public static int LastDurationSeconds { get; private set; }

        private int _coinScore;
        private WorldScroller _world;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            IsRunning = true;
        }

        private void Start()
        {
            _world = WorldScroller.Instance;
        }

        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        private void Update()
        {
            if (!IsRunning) return;
            if (_world == null) _world = WorldScroller.Instance;

            RunSeconds += Time.deltaTime;
            TickCombo();
            TickHeat();
            TickFuel();
        }

        /// <summary>
        /// Burns fuel as a function of distance travelled, not time.
        ///
        /// Tying it to distance means a tank is always worth the same number of metres, so
        /// boosting does not secretly shorten the run — it just gets you there sooner. The
        /// boost multiplier then re-adds a deliberate cost, which is what makes "boost now
        /// or save fuel" an actual decision instead of a free button.
        /// </summary>
        private void TickFuel()
        {
            if (_world == null) return;

            // Metres a full tank covers, derived from the cruise speed so retuning speed
            // does not silently change how far a tank goes.
            float rangeMetres = Mathf.Max(1f, _world.startSpeed * fuelSecondsAtCruise);

            float metres = _world.ScrollDelta;
            var player = PlayerCar.Current;
            if (player != null && player.IsBoosting) metres *= boostFuelMultiplier;

            Fuel = Mathf.Clamp01(Fuel - metres / rangeMetres);

            if (!_lowFuelAnnounced && Fuel <= LowFuelThreshold)
            {
                _lowFuelAnnounced = true;
                OnLowFuel?.Invoke();
            }

            if (Fuel <= 0f) EndGame();
        }

        /// <summary>Refills the tank by <see cref="fuelPerCan"/>. Called by a fuel pickup.</summary>
        public void AddFuel()
        {
            if (!IsRunning) return;
            Fuel = Mathf.Clamp01(Fuel + fuelPerCan);
            if (Fuel > LowFuelThreshold) _lowFuelAnnounced = false;
            Audio.AudioManager.Instance?.PlayFuel();
        }

        private void TickCombo()
        {
            if (ComboTimeLeft <= 0f) return;
            ComboTimeLeft -= Time.deltaTime;
            if (ComboTimeLeft <= 0f)
            {
                ComboTimeLeft = 0f;
                _comboCoins = 0;
                Multiplier = 1;
            }
        }

        private void TickHeat()
        {
            if (IsHeatFrozen || PoliceFreezeActive || _world == null) return;

            // Speed relative to the difficulty baseline: ~0.55 braking, 1.0 cruising,
            // ~1.55 boosting. Anything above cruiseThreshold gains ground on the police.
            float baseline = Mathf.Max(1f, _world.BaseSpeed);
            float speedRatio = _world.Speed / baseline;

            float rate = (speedRatio - cruiseThreshold) * heatResponse;
            rate -= difficultyDrain * _world.Difficulty01;

            Heat = Mathf.Clamp01(Heat + rate * Time.deltaTime);
            if (Heat <= 0f) EndGame();
        }

        // ============================================================
        // Events from the world
        // ============================================================

        /// <summary>A coin was picked up. Value is the coin's base worth.</summary>
        public void OnCoinCollected(int coinValue, bool isGDGPill)
        {
            if (!IsRunning) return;

            _comboCoins++;
            ComboTimeLeft = comboWindowSeconds;
            Multiplier = Mathf.Clamp(1 + _comboCoins / Mathf.Max(1, coinsPerComboStep), 1, maxMultiplier);

            int awarded = coinValue * Multiplier * (Has2x ? 2 : 1);
            _coinScore += awarded;
            CoinCount++;
            if (isGDGPill) GDGPillsCollected++;

            Heat = Mathf.Clamp01(Heat + heatPerCoin);
            OnCoin?.Invoke(awarded);
        }

        /// <summary>The player hit an obstacle or a traffic car.</summary>
        public void OnCrashStatic()
        {
            if (!IsRunning) return;

            // A shield absorbs the whole hit, including the combo reset.
            if (HasShield)
            {
                HasShield = false;
                OnCrash?.Invoke();
                return;
            }

            _comboCoins = 0;
            Multiplier = 1;
            ComboTimeLeft = 0f;

            Heat = Mathf.Clamp01(Heat - crashHeatPenalty);
            OnCrash?.Invoke();

            if (Heat <= 0f) EndGame();
        }

        /// <summary>Clipping a pedestrian: costs ground but is never an instant loss.</summary>
        public void OnPedestrianHit()
        {
            if (!IsRunning) return;
            Heat = Mathf.Clamp01(Heat - pedestrianHeatPenalty);
            OnCrash?.Invoke();
            if (Heat <= 0f) EndGame();
        }

        // ============================================================
        // Power-ups
        // ============================================================

        public void ApplyPowerUp(PowerUps.PowerUpType type, float durationSeconds)
        {
            if (!IsRunning) return;

            switch (type)
            {
                case PowerUps.PowerUpType.CoinMagnet:
                    HasMagnet = true;
                    CancelInvoke(nameof(DisableMagnet));
                    Invoke(nameof(DisableMagnet), durationSeconds);
                    break;

                case PowerUps.PowerUpType.TwoX:
                    Has2x = true;
                    CancelInvoke(nameof(Disable2x));
                    Invoke(nameof(Disable2x), durationSeconds);
                    break;

                case PowerUps.PowerUpType.Shield:
                    HasShield = true;   // no timer: lasts until it absorbs a hit
                    break;

                case PowerUps.PowerUpType.Nitro:
                    HasNitro = true;
                    CancelInvoke(nameof(DisableNitro));
                    Invoke(nameof(DisableNitro), durationSeconds);
                    break;

                case PowerUps.PowerUpType.PoliceFreeze:
                    PoliceFreezeActive = true;
                    CancelInvoke(nameof(DisablePoliceFreeze));
                    Invoke(nameof(DisablePoliceFreeze), durationSeconds);
                    break;
            }
        }

        private void DisableMagnet() => HasMagnet = false;
        private void Disable2x() => Has2x = false;
        private void DisableNitro() => HasNitro = false;
        private void DisablePoliceFreeze() => PoliceFreezeActive = false;

        public void FreezeHeat(float duration)
        {
            IsHeatFrozen = true;
            CancelInvoke(nameof(UnfreezeHeat));
            Invoke(nameof(UnfreezeHeat), duration);
        }
        private void UnfreezeHeat() => IsHeatFrozen = false;

        // ============================================================
        // End of run
        // ============================================================

        /// <summary>Ends the run. Safe to call more than once; only the first call counts.</summary>
        public void EndGame()
        {
            if (!IsRunning) return;
            IsRunning = false;

            int finalScore = Score;
            int finalCoins = CoinCount;
            int finalMeters = Mathf.RoundToInt(DistanceMeters);

            LastScore = finalScore;
            LastCoins = finalCoins;
            LastMeters = finalMeters;
            LastPills = GDGPillsCollected;
            LastDurationSeconds = Mathf.RoundToInt(RunSeconds);

            OnGameOver?.Invoke(finalScore, finalCoins, finalMeters);

            // Hold on the crash for a beat so the camera shake and SFX land before the
            // scene swaps. GameManager survives the load, so this is safe.
            Invoke(nameof(GoToGameOver), 1.4f);
        }

        private void GoToGameOver()
        {
            if (GameManager.Instance != null) GameManager.Instance.LoadGameOver();
            else UnityEngine.SceneManagement.SceneManager.LoadScene(GameManager.SceneGameOver);
        }
    }
}
