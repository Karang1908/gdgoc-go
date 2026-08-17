using UnityEngine;

namespace GDGGo.Pedestrians
{
    /// <summary>
    /// A pedestrian on the pavement. Walks along Z under its own power while the world
    /// scrolls past; the spawner handles the scroll, this handles the walk.
    ///
    /// Hitting one costs Heat but never ends the run outright — mounting the kerb should
    /// be punished, not instantly fatal.
    /// </summary>
    public sealed class PedestrianNPC : MonoBehaviour
    {
        [Tooltip("Walk speed along Z, world units/sec.")]
        public float walkSpeed = 1.5f;

        [Tooltip("Animator driving the walk clip. The shared PedestrianWalk controller " +
                 "loops a Man_Walk / Female_Walk state, so this is purely a runtime hook " +
                 "for any future per-NPC effects (e.g. ragdoll on hit).")]
        public Animator animator;

        /// <summary>+1 walks toward +Z, -1 toward -Z.</summary>
        private float _direction = 1f;
        private bool _hit;

        private void Awake()
        {
            if (animator == null) animator = GetComponentInChildren<Animator>();
        }

        private void Update()
        {
            var session = Core.GameSession.Instance;
            if (session != null && !session.IsRunning) return;

            Vector3 p = transform.position;
            p.z += walkSpeed * _direction * Time.deltaTime;
            transform.position = p;
        }

        /// <summary>
        /// Sets the walk direction. The AnimatorController's default state is already
        /// the Walk loop, so no per-frame parameter sync is required — but we keep the
        /// direction sign so <see cref="Update"/> slides the NPC along Z in the right
        /// way. The clip itself is symmetrical, so visually it walks the same in both
        /// directions; the player only sees pavement foot traffic either way.
        /// </summary>
        public void SetWalking(float direction)
        {
            _direction = direction >= 0f ? 1f : -1f;
        }

        private void OnTriggerEnter(Collider other)
        {
            if (_hit || other == null || !other.CompareTag(Tags.Player)) return;

            var session = Core.GameSession.Instance;
            if (session == null || !session.IsRunning) return;

            _hit = true;
            session.OnPedestrianHit();
        }
    }
}
