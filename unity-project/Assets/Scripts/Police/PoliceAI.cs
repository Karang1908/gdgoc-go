using UnityEngine;
using GDGGo.Gameplay;

namespace GDGGo.Police
{
    /// <summary>
    /// The chasing police car. It is a <b>visualisation of Heat</b>, not an independent
    /// agent: <see cref="Core.GameSession"/> owns the Heat value and this car simply sits
    /// at the distance behind the player that Heat implies. Making it chase "for real"
    /// would duplicate the same state in two places and let the picture disagree with
    /// the rules.
    ///
    /// It does add its own character on top — weaving between lanes, leaning in as Heat
    /// drops, and flashing its light bar faster the closer it gets — so the player reads
    /// the danger from the mirror rather than from the HUD.
    ///
    /// Mesh: Kenney Car Kit <c>police.fbx</c> (textured; the Quaternius Cop.fbx is not).
    /// </summary>
    public sealed class PoliceAI : MonoBehaviour
    {
        [Header("Chase geometry")]
        [Tooltip("Distance behind the player at Heat = 1 (safe).")]
        public float maxGap = 22f;

        [Tooltip("Distance behind the player at Heat = 0 (caught).")]
        public float minGap = 3.2f;

        [Tooltip("How quickly the car eases to its target distance.")]
        public float followLerp = 2.5f;

        [Header("Weave")]
        [Tooltip("How far the car drifts sideways while chasing.")]
        public float weaveAmplitude = 2.2f;
        public float weaveHz = 0.32f;

        [Tooltip("How strongly the car swings toward the player's lane as Heat drops.")]
        [Range(0f, 1f)] public float lockOnStrength = 0.75f;

        [Header("Light bar")]
        public Light barRed;
        public Light barBlue;
        [Tooltip("Flash rate at Heat = 1.")]
        public float barCycleHzCalm = 1.6f;
        [Tooltip("Flash rate at Heat = 0.")]
        public float barCycleHzPanic = 6f;

        [Header("Warning")]
        [Tooltip("Heat below which the warning stinger plays.")]
        [Range(0f, 1f)] public float warningHeat = 0.28f;
        [Tooltip("Minimum seconds between warning stingers.")]
        public float warningCooldown = 3.5f;

        private float _barPhase;
        private float _weavePhase;
        private float _nextWarningTime;
        private float _currentZ;
        private PlayerCar _player;

        private void Awake()
        {
            _player = PlayerCar.Current;
            _currentZ = -maxGap;
            _weavePhase = Random.value * Mathf.PI * 2f;
        }

        private void Update()
        {
            if (_player == null) _player = PlayerCar.Current;
            if (_player == null) return;

            var session = Core.GameSession.Instance;
            float heat = session != null ? Mathf.Clamp01(session.Heat) : 1f;

            UpdatePosition(heat);
            UpdateLightBar(heat);
            UpdateWarning(session, heat);
        }

        private void UpdatePosition(float heat)
        {
            // Heat 1 -> far behind, Heat 0 -> right on the bumper.
            float targetZ = _player.transform.position.z - Mathf.Lerp(minGap, maxGap, heat);
            _currentZ = Mathf.Lerp(_currentZ, targetZ, 1f - Mathf.Exp(-followLerp * Time.deltaTime));

            // Weave freely when far back; converge on the player's lane as it closes in.
            _weavePhase += Time.deltaTime * weaveHz * Mathf.PI * 2f;
            float freeWeave = Mathf.Sin(_weavePhase) * weaveAmplitude;
            float playerX = _player.transform.position.x;
            float lockOn = Mathf.Lerp(0f, lockOnStrength, 1f - heat);
            float x = Mathf.Lerp(freeWeave, playerX, lockOn);

            transform.position = new Vector3(x, transform.position.y, _currentZ);
        }

        private void UpdateLightBar(float heat)
        {
            if (barRed == null && barBlue == null) return;

            float hz = Mathf.Lerp(barCycleHzPanic, barCycleHzCalm, heat);
            _barPhase += Time.deltaTime * hz;
            bool redOn = Mathf.Repeat(_barPhase, 1f) < 0.5f;

            if (barRed != null) barRed.enabled = redOn;
            if (barBlue != null) barBlue.enabled = !redOn;
        }

        private void UpdateWarning(Core.GameSession session, float heat)
        {
            if (session == null || !session.IsRunning) return;
            if (heat > warningHeat || Time.time < _nextWarningTime) return;

            _nextWarningTime = Time.time + warningCooldown;
            Audio.AudioManager.Instance?.PlayPoliceWarning();
        }
    }
}
