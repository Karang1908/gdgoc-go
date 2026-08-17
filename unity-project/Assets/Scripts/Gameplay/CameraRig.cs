using UnityEngine;

namespace GDGGo.Gameplay
{
    /// <summary>
    /// Chase camera. Trails the player laterally, kicks its FOV with speed, and shakes
    /// on impact.
    ///
    /// The lateral lag is the important part: if the camera were welded to the player's
    /// X, a lane change would move the whole world sideways and read as the road
    /// swerving rather than the car. Letting the camera fall behind by a fraction makes
    /// the car visibly move *within* the frame, which is what sells the dodge.
    /// </summary>
    [DefaultExecutionOrder(100)]   // after the player has moved this frame
    public sealed class CameraRig : MonoBehaviour
    {
        [Header("Target")]
        public Transform target;

        [Header("Placement")]
        public Vector3 offset = new Vector3(0f, 5.2f, -9.5f);
        public float pitchDegrees = 12f;

        [Tooltip("0 = camera ignores the player's lane, 1 = welded to it. " +
                 "Around 0.55 keeps the car in frame while still letting it slide.")]
        [Range(0f, 1f)] public float lateralFollow = 0.55f;

        [Tooltip("How quickly the camera catches up laterally.")]
        public float lateralLerp = 6f;

        [Tooltip("How much of the player's jump height the camera tracks.")]
        [Range(0f, 1f)] public float verticalFollow = 0.35f;

        [Header("Speed feel")]
        public float baseFieldOfView = 62f;
        [Tooltip("Extra FOV at full boost — the speed rush.")]
        public float boostFieldOfViewBonus = 10f;
        public float fovLerp = 4f;

        [Header("Shake")]
        public float crashShakeAmplitude = 0.55f;
        public float crashShakeDuration = 0.42f;
        public float shakeFrequency = 28f;

        private Camera _camera;
        private float _shakeTimeLeft;
        private float _shakeAmplitude;
        private float _currentX;
        private float _currentY;
        private Core.GameSession _session;

        private void Awake()
        {
            _camera = GetComponent<Camera>();
            if (_camera == null) _camera = GetComponentInChildren<Camera>();
            transform.rotation = Quaternion.Euler(pitchDegrees, 0f, 0f);
        }

        private void Start()
        {
            if (target == null && PlayerCar.Current != null) target = PlayerCar.Current.transform;
            Subscribe();
        }

        private void OnDestroy()
        {
            if (_session != null) _session.OnCrash -= Shake;
        }

        private void Subscribe()
        {
            _session = Core.GameSession.Instance;
            if (_session != null) _session.OnCrash += Shake;
        }

        private void LateUpdate()
        {
            // GameSession may not have existed yet on our Start (scene load order).
            if (_session == null) Subscribe();
            if (target == null && PlayerCar.Current != null) target = PlayerCar.Current.transform;

            Vector3 basePosition = offset;

            if (target != null)
            {
                float targetX = target.position.x * lateralFollow;
                float targetY = offset.y + Mathf.Max(0f, target.position.y) * verticalFollow;
                _currentX = Mathf.Lerp(_currentX, targetX, 1f - Mathf.Exp(-lateralLerp * Time.deltaTime));
                _currentY = Mathf.Lerp(_currentY, targetY, 1f - Mathf.Exp(-lateralLerp * Time.deltaTime));
                basePosition = new Vector3(_currentX, _currentY, offset.z);
            }

            transform.position = basePosition + CurrentShakeOffset();
            UpdateFieldOfView();
        }

        private Vector3 CurrentShakeOffset()
        {
            if (_shakeTimeLeft <= 0f) return Vector3.zero;

            _shakeTimeLeft -= Time.deltaTime;
            float falloff = Mathf.Clamp01(_shakeTimeLeft / Mathf.Max(0.01f, crashShakeDuration));
            float amount = _shakeAmplitude * falloff * falloff;

            // Two different frequencies so the shake does not read as a clean sine wave.
            return new Vector3(
                Mathf.Sin(Time.time * shakeFrequency) * amount,
                Mathf.Sin(Time.time * shakeFrequency * 1.37f) * amount,
                0f);
        }

        private void UpdateFieldOfView()
        {
            if (_camera == null) return;

            var world = WorldScroller.Instance;
            float speedExcess = 0f;
            if (world != null && world.BaseSpeed > 0.01f)
                speedExcess = Mathf.Clamp01((world.Speed / world.BaseSpeed) - 1f);

            float targetFov = baseFieldOfView + boostFieldOfViewBonus * speedExcess;
            _camera.fieldOfView = Mathf.Lerp(_camera.fieldOfView, targetFov, 1f - Mathf.Exp(-fovLerp * Time.deltaTime));
        }

        /// <summary>Kicks off a shake. Wired to GameSession.OnCrash.</summary>
        public void Shake()
        {
            _shakeAmplitude = crashShakeAmplitude;
            _shakeTimeLeft = crashShakeDuration;
        }
    }
}
