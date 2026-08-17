using UnityEngine;

namespace GDGGo.Traffic
{
    /// <summary>
    /// A civilian vehicle that drives forward while the world scrolls back past it.
    ///
    /// <see cref="ScrollingSpawner"/> already moves every spawned object -Z by the world
    /// scroll each frame. This component adds its own forward motion back on top, so the
    /// net closing speed the player sees is (world speed - forwardSpeed). That is what
    /// makes traffic feel like something you overtake rather than something teleporting
    /// at you, and it means traffic automatically gets easier to catch as the player
    /// speeds up.
    ///
    /// This class used to be an empty Update() with a TODO, so traffic never moved at all.
    /// </summary>
    public sealed class TrafficCar : MonoBehaviour
    {
        [Tooltip("Forward world speed. Must stay below the player's cruise speed or it " +
                 "can never be overtaken.")]
        public float forwardSpeed = 9f;

        [Tooltip("Optional: slight side-to-side drift so traffic does not look rail-mounted.")]
        public float laneWanderAmplitude = 0.12f;
        public float laneWanderHz = 0.35f;

        private float _wanderPhase;
        private float _baseX;

        private void Start()
        {
            _baseX = transform.position.x;
            _wanderPhase = Random.value * Mathf.PI * 2f;
        }

        private void Update()
        {
            var session = Core.GameSession.Instance;
            if (session != null && !session.IsRunning) return;

            Vector3 p = transform.position;
            p.z += forwardSpeed * Time.deltaTime;

            if (laneWanderAmplitude > 0f)
            {
                _wanderPhase += Time.deltaTime * laneWanderHz * Mathf.PI * 2f;
                p.x = _baseX + Mathf.Sin(_wanderPhase) * laneWanderAmplitude;
            }

            transform.position = p;
        }
    }
}
