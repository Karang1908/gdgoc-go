using UnityEngine;

namespace GDGGo.Gameplay
{
    /// <summary>
    /// The single source of truth for how far the world has travelled and how fast it is
    /// moving right now.
    ///
    /// The player car never translates along Z. Instead everything else — road tiles,
    /// traffic, obstacles, coins, scenery — moves toward -Z past a stationary player.
    /// Every one of those movers reads <see cref="ScrollDelta"/> from here, so they are
    /// guaranteed to stay in lockstep. Previously each spawner had its own idea of
    /// motion (and most had none), which is why the world sat still.
    ///
    /// Coordinates come in two flavours and it matters which you use:
    ///   * <b>track space</b> — absolute metres since the run began. Never rewinds.
    ///     Spawners schedule future events in track space (<see cref="Distance"/>).
    ///   * <b>world space</b> — Unity Z, relative to the player at the origin.
    ///     An object scheduled for track distance D belongs at world Z = D - Distance.
    ///
    /// Runs at execution order -100 so <see cref="ScrollDelta"/> is already correct for
    /// this frame by the time any spawner's Update reads it.
    /// </summary>
    [DefaultExecutionOrder(-100)]
    public sealed class WorldScroller : MonoBehaviour
    {
        public static WorldScroller Instance { get; private set; }

        [Header("Speed ramp")]
        [Tooltip("Forward speed at the start of a run (world units / sec).")]
        public float startSpeed = 16f;

        [Tooltip("Speed the run asymptotes to once fully ramped.")]
        public float maxSpeed = 42f;

        [Tooltip("Track distance (m) over which speed climbs from startSpeed to maxSpeed.")]
        public float rampDistance = 2200f;

        [Header("Player speed modifiers")]
        [Tooltip("Multiplier applied while the player holds boost / has Nitro.")]
        public float boostMultiplier = 1.55f;

        [Tooltip("Multiplier applied while the player brakes.")]
        public float brakeMultiplier = 0.55f;

        [Tooltip("How quickly actual speed chases the target (higher = snappier).")]
        public float speedLerp = 3.5f;

        /// <summary>Absolute metres travelled this run. Track space.</summary>
        public float Distance { get; private set; }

        /// <summary>Metres the world moved this frame. Movers translate by -this on Z.</summary>
        public float ScrollDelta { get; private set; }

        /// <summary>Current forward speed in world units / second.</summary>
        public float Speed { get; private set; }

        /// <summary>Speed ignoring boost/brake — the difficulty baseline.</summary>
        public float BaseSpeed { get; private set; }

        /// <summary>0 at the start of a run, 1 once the speed ramp is exhausted. Spawners
        /// use this to scale density so the game gets harder, not just faster.</summary>
        public float Difficulty01 => Mathf.Clamp01(Distance / Mathf.Max(1f, rampDistance));

        private PlayerCar _player;
        private bool _frozen;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(this); return; }
            Instance = this;
            Speed = startSpeed;
            BaseSpeed = startSpeed;

            // Reservations are static, so a second run in the same session would
            // otherwise inherit the previous run's blocked lanes.
            LaneReservations.Clear();
        }

        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        private void Update()
        {
            if (_frozen) { ScrollDelta = 0f; return; }

            var session = Core.GameSession.Instance;
            if (session != null && !session.IsRunning)
            {
                // Run is over: coast to a stop rather than freezing mid-frame, so the
                // crash reads as a crash instead of a hitch.
                Speed = Mathf.MoveTowards(Speed, 0f, 40f * Time.deltaTime);
                ScrollDelta = Speed * Time.deltaTime;
                return;
            }

            if (_player == null) _player = Object.FindFirstObjectByType<PlayerCar>();

            BaseSpeed = Mathf.Lerp(startSpeed, maxSpeed, Difficulty01);

            float target = BaseSpeed;
            if (_player != null)
            {
                if (_player.IsBoosting) target *= boostMultiplier;
                else if (_player.IsBraking) target *= brakeMultiplier;
            }

            Speed = Mathf.Lerp(Speed, target, 1f - Mathf.Exp(-speedLerp * Time.deltaTime));

            ScrollDelta = Speed * Time.deltaTime;
            Distance += ScrollDelta;
        }

        /// <summary>Converts a track-space distance into the world Z it should occupy now.</summary>
        public float TrackToWorldZ(float trackDistance) => trackDistance - Distance;

        /// <summary>Halts all world motion (used by the game-over freeze frame).</summary>
        public void Freeze() => _frozen = true;

        /// <summary>Resets for a fresh run without reloading the scene.</summary>
        public void ResetRun()
        {
            Distance = 0f;
            ScrollDelta = 0f;
            Speed = startSpeed;
            BaseSpeed = startSpeed;
            _frozen = false;
            LaneReservations.Clear();
        }
    }
}
