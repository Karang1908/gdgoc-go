using UnityEngine;

namespace GDGGo.PowerUps
{
    /// <summary>
    /// Smooth floating hover bobbing, dynamic tilt, and ambient spin for in-world pickups.
    /// Gives all collectibles an arcade presence on track.
    /// </summary>
    public sealed class RotateSlow : MonoBehaviour
    {
        [Tooltip("Rotation speed in degrees per second.")]
        public float degPerSec = 75f;

        [Tooltip("Hover bob amplitude in meters.")]
        public float bobAmplitude = 0.18f;

        [Tooltip("Hover bob speed frequency.")]
        public float bobFrequency = 2.8f;

        private float _baseY;
        private float _phaseOffset;

        private void Start()
        {
            _baseY = transform.position.y;
            _phaseOffset = Random.value * Mathf.PI * 2f;
        }

        private void Update()
        {
            float dt = Time.deltaTime;
            float time = Time.time;

            // Smooth continuous spin
            transform.Rotate(0f, degPerSec * dt, 0f, Space.World);

            // Floating sinusoidal hover bobbing
            Vector3 p = transform.position;
            p.y = _baseY + Mathf.Sin(time * bobFrequency + _phaseOffset) * bobAmplitude;
            transform.position = p;
        }
    }
}
