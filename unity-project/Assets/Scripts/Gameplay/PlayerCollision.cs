using UnityEngine;
using GDGGo.Core;

namespace GDGGo.Gameplay
{
    /// <summary>
    /// Detects the player hitting things. This is the component the project was missing
    /// entirely: <c>GameSession.OnCrashStatic()</c> existed but nothing ever called it,
    /// so the car drove through obstacles without consequence.
    ///
    /// Everything the player can hit is a static trigger collider; the player is a
    /// kinematic Rigidbody with a trigger collider, which is the pairing Unity delivers
    /// OnTrigger messages for. Coins and power-ups handle their own pickup on their own
    /// side; this class is only concerned with things that hurt.
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public sealed class PlayerCollision : MonoBehaviour
    {
        [Tooltip("Seconds of immunity after a crash, so one pile-up cannot drain Heat in a single frame.")]
        public float invulnerabilitySeconds = 1.8f;

        [Tooltip("Mesh root to flash while immune. Optional.")]
        public Renderer[] flashRenderers;

        [Tooltip("Flashes per second during the immunity window.")]
        public float flashHz = 8f;

        /// <summary>True while the post-crash immunity window is open.</summary>
        public bool IsInvulnerable => _invulnerableUntil > Time.time;

        private float _invulnerableUntil;
        private PlayerCar _car;

        private void Awake()
        {
            _car = GetComponent<PlayerCar>();
        }

        private void Update()
        {
            if (flashRenderers == null || flashRenderers.Length == 0) return;

            bool visible = !IsInvulnerable || Mathf.Repeat(Time.time * flashHz, 1f) > 0.5f;
            for (int i = 0; i < flashRenderers.Length; i++)
                if (flashRenderers[i] != null) flashRenderers[i].enabled = visible;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (other == null) return;

            var session = GameSession.Instance;
            if (session == null || !session.IsRunning) return;
            if (IsInvulnerable) return;

            if (!other.CompareTag(Tags.Obstacle)) return;

            // A jumpable obstacle (cone, debris) is cleared by being airborne.
            // Tall ones (traffic, signs, lights) are not, so a jump cannot cheese them.
            var obstacle = other.GetComponentInParent<Obstacles.Obstacle>();
            bool clearedByJump = _car != null && _car.IsJumping
                                 && obstacle != null && obstacle.clearableByJump;
            if (clearedByJump) return;

            _invulnerableUntil = Time.time + invulnerabilitySeconds;
            session.OnCrashStatic();
            Audio.AudioManager.Instance?.PlayCrash();
        }

        private void OnDisable()
        {
            // Never leave the mesh hidden if we are switched off mid-flash.
            if (flashRenderers == null) return;
            for (int i = 0; i < flashRenderers.Length; i++)
                if (flashRenderers[i] != null) flashRenderers[i].enabled = true;
        }
    }
}
