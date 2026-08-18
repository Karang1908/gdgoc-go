using UnityEngine;
using GDGGo.Gameplay;

namespace GDGGo.Traffic
{
    /// <summary>
    /// A civilian vehicle that drives forward while the world scrolls back past it.
    /// Supports dynamic lane changes with smooth steering curves and yaw banking.
    /// </summary>
    public sealed class TrafficCar : MonoBehaviour
    {
        [Tooltip("Forward world speed. Must stay below the player's cruise speed so it can be overtaken.")]
        public float forwardSpeed = 9f;

        [Tooltip("Chance that this vehicle will attempt a lane change while ahead of the player.")]
        [Range(0f, 1f)] public float laneChangeChance = 0.60f;

        [Tooltip("Minimum track ahead distance before a lane change can trigger.")]
        public float minLaneChangeZ = 35f;

        [Tooltip("Time in seconds to complete a lane change.")]
        public float laneChangeDuration = 1.1f;

        [Tooltip("Maximum yaw angle in degrees during a lane change.")]
        public float steeringYawAngle = 12f;

        [Tooltip("Optional: slight side-to-side drift so traffic does not look rail-mounted.")]
        public float laneWanderAmplitude = 0.08f;
        public float laneWanderHz = 0.35f;

        private int _currentLane = 1;
        private int _targetLane = 1;
        private float _startX;
        private float _targetX;
        private float _laneChangeTimer = 0f;
        private bool _isChangingLane = false;
        private float _timeUntilLaneChange;
        private float _wanderPhase;

        private void Start()
        {
            // Determine current lane from initial X position
            float x = transform.position.x;
            _currentLane = Mathf.RoundToInt((x / LaneModel.LaneWidth) + LaneModel.CentreLane);
            _currentLane = LaneModel.Clamp(_currentLane);
            _targetLane = _currentLane;
            _startX = LaneModel.LaneX(_currentLane);
            _targetX = _startX;

            _wanderPhase = Random.value * Mathf.PI * 2f;

            // Random schedule for lane change
            if (Random.value < laneChangeChance)
            {
                _timeUntilLaneChange = Random.Range(1.0f, 3.5f);
            }
            else
            {
                _timeUntilLaneChange = -1f;
            }
        }

        private void Update()
        {
            var session = Core.GameSession.Instance;
            if (session != null && !session.IsRunning) return;

            float dt = Time.deltaTime;
            Vector3 p = transform.position;
            p.z += forwardSpeed * dt;

            // Check if ready to initiate a lane change
            if (!_isChangingLane && _timeUntilLaneChange > 0f && p.z > minLaneChangeZ)
            {
                _timeUntilLaneChange -= dt;
                if (_timeUntilLaneChange <= 0f)
                {
                    TryInitiateLaneChange();
                }
            }

            // Handle active lane change
            if (_isChangingLane)
            {
                _laneChangeTimer += dt;
                float progress = Mathf.Clamp01(_laneChangeTimer / laneChangeDuration);
                // S-curve interpolation
                float t = Mathf.SmoothStep(0f, 1f, progress);
                p.x = Mathf.Lerp(_startX, _targetX, t);

                // Smooth steering yaw rotation
                float steerFactor = Mathf.Sin(progress * Mathf.PI);
                float steerDirection = Mathf.Sign(_targetX - _startX);
                transform.rotation = Quaternion.Euler(0f, steerDirection * steeringYawAngle * steerFactor, 0f);

                if (progress >= 1f)
                {
                    _isChangingLane = false;
                    _currentLane = _targetLane;
                    _startX = _targetX;
                    transform.rotation = Quaternion.identity;
                }
            }
            else
            {
                if (laneWanderAmplitude > 0f)
                {
                    _wanderPhase += dt * laneWanderHz * Mathf.PI * 2f;
                    p.x = _startX + Mathf.Sin(_wanderPhase) * laneWanderAmplitude;
                }
                else
                {
                    p.x = _startX;
                }
                transform.rotation = Quaternion.identity;
            }

            transform.position = p;
        }

        private void TryInitiateLaneChange()
        {
            int target;
            if (_currentLane == 0) target = 1;
            else if (_currentLane == 2) target = 1;
            else target = Random.value < 0.5f ? 0 : 2;

            var world = WorldScroller.Instance;
            float trackDist = world != null ? (world.Distance + transform.position.z) : transform.position.z;

            // Ensure lane is not blocked by static obstacle
            if (LaneReservations.TryReserve(trackDist, target))
            {
                _targetLane = target;
                _targetX = LaneModel.LaneX(_targetLane);
                _laneChangeTimer = 0f;
                _isChangingLane = true;
            }
        }
    }
}
