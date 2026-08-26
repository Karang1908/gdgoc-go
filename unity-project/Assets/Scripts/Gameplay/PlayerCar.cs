using UnityEngine;
using Gamepad = UnityEngine.InputSystem.Gamepad;

namespace GDGGo.Gameplay
{
    /// <summary>
    /// The player's car. Handles lane changes, jumps, braking and boost.
    ///
    /// The car never translates along Z — <see cref="WorldScroller"/> moves the world past
    /// it instead. So "forward speed" here is only an *intent* (brake / boost) that the
    /// WorldScroller reads; this component's own motion is purely lateral (lane) and
    /// vertical (jump).
    ///
    /// Input supports keyboard, phone gestures, Xbox-style gamepads, and the public
    /// Move/Jump/Brake methods used by optional on-screen controls.
    ///
    /// Note there is no CharacterController. The class used to require one and then
    /// never call Move() on it, which left a stray capsule collider fighting the
    /// BoxCollider and the kinematic Rigidbody for the same space.
    /// </summary>
    public sealed class PlayerCar : MonoBehaviour
    {
        [Header("Visuals")]
        [Tooltip("Child transform holding the car mesh. Banked/tilted for feel; the root " +
                 "stays axis-aligned so its collider does not rotate into other lanes.")]
        public Transform meshRoot;

        [Tooltip("Optional dust/exhaust particles played on jump and boost.")]
        public ParticleSystem jumpDustFX;

        [Header("Lane motion")]
        [Tooltip("Seconds to complete one lane change.")]
        public float laneChangeTime = 0.12f;

        [Tooltip("Degrees the mesh banks into a lane change.")]
        public float bankAngle = 20f;

        [Header("Jump & Fast Drop")]
        public float jumpHeight = 2.8f;
        public float jumpDuration = 0.60f;

        [Header("Input")]
        [Tooltip("Minimum screen-pixel travel before a drag counts as a swipe.")]
        public float swipeThresholdPixels = 40f;

        [Tooltip("Maximum gap between taps that activates a short mobile boost.")]
        public float doubleTapWindowSeconds = 0.32f;

        [Tooltip("Seconds of boost awarded by a double tap.")]
        public float doubleTapBoostSeconds = 1.2f;

        [Tooltip("How far the left stick must move before it triggers a lane change or fast-fall.")]
        [Range(0.5f, 0.95f)]
        public float gamepadStickPressThreshold = 0.65f;

        [Tooltip("How close the left stick must return to centre before another movement can trigger.")]
        [Range(0.05f, 0.45f)]
        public float gamepadStickReleaseThreshold = 0.30f;

        [Tooltip("How far the right trigger must be held before boost activates.")]
        [Range(0.1f, 0.9f)]
        public float gamepadTriggerThreshold = 0.35f;

        /// <summary>The active player car. Cached so per-coin magnet logic does not have
        /// to run a scene-wide search on every coin, every frame.</summary>
        public static PlayerCar Current { get; private set; }

        public int CurrentLane { get; private set; } = LaneModel.CentreLane;
        public bool IsJumping { get; private set; }
        public bool IsBraking => _keyboardBraking || _gamepadBraking || _buttonBraking ||
                                 Time.unscaledTime < _brakeTapUntil;

        /// <summary>True while boosting, whether from held input or an active Nitro pickup.</summary>
        public bool IsBoosting => _keyboardBoostHeld || _gamepadBoostHeld || _buttonBoostHeld ||
                                  Time.unscaledTime < _touchBoostUntil ||
                                  (Core.GameSession.Instance != null && Core.GameSession.Instance.HasNitro);

        /// <summary>Current world speed. Owned by WorldScroller; mirrored here for callers.</summary>
        public float CurrentSpeed => WorldScroller.Instance != null ? WorldScroller.Instance.Speed : 0f;

        private int _fromLane;
        private float _laneChangeT = 1f;   // 1 = settled
        private float _jumpTimer;
        private float _groundY;
        private bool _keyboardBraking;
        private bool _gamepadBraking;
        private bool _buttonBraking;
        private bool _keyboardBoostHeld;
        private bool _gamepadBoostHeld;
        private bool _buttonBoostHeld;
        private bool _gamepadHorizontalArmed = true;
        private bool _gamepadDownArmed = true;
        private float _brakeTapUntil = -1f;
        private float _touchBoostUntil = -1f;
        private float _lastTapTime = -10f;

        // Swipe tracking
        private Vector2 _touchStart;
        private bool _touchActive;

        private void Awake()
        {
            Current = this;
            _groundY = transform.position.y;
            _fromLane = CurrentLane;
            Vector3 p = transform.position;
            p.x = LaneModel.LaneX(CurrentLane);
            transform.position = p;
        }

        private void OnDestroy()
        {
            if (Current == this) Current = null;
        }

        private void Update()
        {
            var session = Core.GameSession.Instance;
            bool acceptInput = session == null || session.IsRunning;

            if (acceptInput)
            {
                ReadKeyboard();
                ReadGamepad();
                ReadTouch();
            }
            else
            {
                _keyboardBraking = false;
                _gamepadBraking = false;
                _buttonBraking = false;
                _keyboardBoostHeld = false;
                _gamepadBoostHeld = false;
                _buttonBoostHeld = false;
                _gamepadHorizontalArmed = true;
                _gamepadDownArmed = true;
                _brakeTapUntil = -1f;
                _touchBoostUntil = -1f;
            }

            UpdateLanePosition();
            UpdateJump();
        }

        // ============================================================
        // Public control surface — also what on-screen buttons call
        // ============================================================

        public void MoveLeft() => ChangeLane(-1);
        public void MoveRight() => ChangeLane(+1);

        public void Jump()
        {
            if (IsJumping) return;
            IsJumping = true;
            _jumpTimer = 0f;
            if (jumpDustFX != null) jumpDustFX.Play();
            Audio.AudioManager.Instance?.PlayJump();
        }

        /// <summary>
        /// Subway-Surfers signature mechanic: swiping down mid-air immediately cancels the jump
        /// and slams the vehicle back onto the asphalt to dodge upcoming obstacles.
        /// </summary>
        public void FastFall()
        {
            if (!IsJumping)
            {
                BrakeTap();
                return;
            }

            // Rapidly speed up jump descent to slam the vehicle down
            _jumpTimer = Mathf.Max(_jumpTimer, jumpDuration * 0.72f);
            Audio.AudioManager.Instance?.PlaySwerve();
        }

        public void BrakeStart() => _buttonBraking = true;
        public void BrakeStop() => _buttonBraking = false;
        public void BoostStart() => _buttonBoostHeld = true;
        public void BoostStop() => _buttonBoostHeld = false;

        // ============================================================
        // Input
        // ============================================================

        private void ReadKeyboard()
        {
            if (Input.GetKeyDown(KeyCode.A) || Input.GetKeyDown(KeyCode.LeftArrow)) MoveLeft();
            if (Input.GetKeyDown(KeyCode.D) || Input.GetKeyDown(KeyCode.RightArrow)) MoveRight();
            if (Input.GetKeyDown(KeyCode.W) || Input.GetKeyDown(KeyCode.UpArrow) || Input.GetKeyDown(KeyCode.Space)) Jump();
            if (Input.GetKeyDown(KeyCode.S) || Input.GetKeyDown(KeyCode.DownArrow)) FastFall();

            _keyboardBraking = Input.GetKey(KeyCode.S) || Input.GetKey(KeyCode.DownArrow);
            _keyboardBoostHeld = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
        }

        /// <summary>
        /// Xbox controller layout: left stick or D-pad changes lanes, A jumps, B/down
        /// brakes or fast-falls, and the right trigger boosts. Stick actions must return
        /// near centre before firing again so one deliberate press always means one lane.
        /// </summary>
        private void ReadGamepad()
        {
            Gamepad gamepad = Gamepad.current;
            if (gamepad == null)
            {
                _gamepadBraking = false;
                _gamepadBoostHeld = false;
                _gamepadHorizontalArmed = true;
                _gamepadDownArmed = true;
                return;
            }

            Vector2 stick = gamepad.leftStick.ReadValue();
            Vector2 dpad = gamepad.dpad.ReadValue();
            float pressThreshold = Mathf.Clamp(gamepadStickPressThreshold, 0.5f, 0.95f);
            float releaseThreshold = Mathf.Clamp(gamepadStickReleaseThreshold, 0.05f, pressThreshold - 0.05f);

            float horizontal = Mathf.Abs(dpad.x) > Mathf.Abs(stick.x) ? dpad.x : stick.x;
            if (_gamepadHorizontalArmed)
            {
                if (horizontal <= -pressThreshold)
                {
                    MoveLeft();
                    _gamepadHorizontalArmed = false;
                }
                else if (horizontal >= pressThreshold)
                {
                    MoveRight();
                    _gamepadHorizontalArmed = false;
                }
            }
            else if (Mathf.Abs(horizontal) <= releaseThreshold)
            {
                _gamepadHorizontalArmed = true;
            }

            bool downHeld = stick.y <= -pressThreshold || dpad.y <= -pressThreshold;
            bool fastFallPressed = gamepad.buttonEast.wasPressedThisFrame;
            if (_gamepadDownArmed && downHeld)
            {
                fastFallPressed = true;
                _gamepadDownArmed = false;
            }
            else if (!downHeld && stick.y >= -releaseThreshold && dpad.y >= -releaseThreshold)
            {
                _gamepadDownArmed = true;
            }

            if (gamepad.buttonSouth.wasPressedThisFrame) Jump();
            if (fastFallPressed) FastFall();

            _gamepadBraking = downHeld || gamepad.buttonEast.isPressed;
            _gamepadBoostHeld = gamepad.rightTrigger.ReadValue() >=
                                Mathf.Clamp(gamepadTriggerThreshold, 0.1f, 0.9f);
        }

        /// <summary>
        /// Swipe handling for phones & mouse gestures.
        /// </summary>
        private void ReadTouch()
        {
            if (Input.touchCount > 0)
            {
                Touch t = Input.GetTouch(0);
                switch (t.phase)
                {
                    case TouchPhase.Began:
                        _touchStart = t.position;
                        _touchActive = true;
                        break;
                    case TouchPhase.Moved:
                    case TouchPhase.Stationary:
                        if (_touchActive) TryResolveSwipe(t.position);
                        break;
                    case TouchPhase.Ended:
                    case TouchPhase.Canceled:
                        if (_touchActive)
                        {
                            TryResolveSwipe(t.position);
                            if (_touchActive && t.phase == TouchPhase.Ended) RegisterTap();
                        }
                        _touchActive = false;
                        break;
                }
                return;
            }

            // Mouse drag mirrors swipe so the gesture can be tested on desktop.
            if (Input.GetMouseButtonDown(0))
            {
                _touchStart = new Vector2(Input.mousePosition.x, Input.mousePosition.y);
                _touchActive = true;
            }
            else if (Input.GetMouseButton(0) && _touchActive)
            {
                TryResolveSwipe(new Vector2(Input.mousePosition.x, Input.mousePosition.y));
            }
            else if (Input.GetMouseButtonUp(0))
            {
                if (_touchActive)
                {
                    TryResolveSwipe(new Vector2(Input.mousePosition.x, Input.mousePosition.y));
                    if (_touchActive) RegisterTap();
                }
                _touchActive = false;
            }
        }

        private void TryResolveSwipe(Vector2 current)
        {
            float dx = current.x - _touchStart.x;
            float dy = current.y - _touchStart.y;

            if (Mathf.Abs(dx) < swipeThresholdPixels && Mathf.Abs(dy) < swipeThresholdPixels) return;

            if (Mathf.Abs(dx) > Mathf.Abs(dy))
            {
                if (dx > 0f) MoveRight(); else MoveLeft();
            }
            else
            {
                if (dy > 0f) Jump(); else FastFall();
            }
            _touchActive = false;
        }

        /// <summary>Two quick taps provide a discoverable, button-free boost on phones.</summary>
        private void RegisterTap()
        {
            float now = Time.unscaledTime;
            if (now - _lastTapTime <= Mathf.Max(0.1f, doubleTapWindowSeconds))
            {
                _touchBoostUntil = now + Mathf.Max(0.1f, doubleTapBoostSeconds);
                _lastTapTime = -10f;
            }
            else
            {
                _lastTapTime = now;
            }
        }

        /// <summary>Swipe-down brakes briefly when on the ground.</summary>
        private void BrakeTap()
        {
            _brakeTapUntil = Time.unscaledTime + 0.35f;
        }

        // ============================================================
        // Motion
        // ============================================================

        private void ChangeLane(int direction)
        {
            int target = LaneModel.Clamp(CurrentLane + direction);
            if (target == CurrentLane) return;

            _fromLane = CurrentLane;
            CurrentLane = target;
            _laneChangeT = 0f;
            Audio.AudioManager.Instance?.PlaySwerve();
        }

        private void UpdateLanePosition()
        {
            if (_laneChangeT < 1f)
                _laneChangeT = Mathf.Clamp01(_laneChangeT + Time.deltaTime / Mathf.Max(0.01f, laneChangeTime));

            // Smooth cubic ease out
            float t = _laneChangeT * _laneChangeT * (3f - 2f * _laneChangeT);
            float x = Mathf.Lerp(LaneModel.LaneX(_fromLane), LaneModel.LaneX(CurrentLane), t);

            Vector3 p = transform.position;
            p.x = x;
            transform.position = p;

            if (meshRoot != null)
            {
                // Dynamic banking roll into the lane change + pitch when jumping + road vibe
                float bankAmount = Mathf.Sin(_laneChangeT * Mathf.PI) * bankAngle;
                float direction = Mathf.Sign(LaneModel.LaneX(CurrentLane) - LaneModel.LaneX(_fromLane));
                float roadVibe = Mathf.Sin(Time.time * 28f) * 0.4f;

                float jumpPitch = 0f;
                if (IsJumping)
                {
                    float jumpT = _jumpTimer / Mathf.Max(0.01f, jumpDuration);
                    jumpPitch = jumpT < 0.45f ? -9f : +11f; // Nose up on rocket launch, nose down on descent
                }

                meshRoot.localRotation = Quaternion.Euler(roadVibe + jumpPitch, 0f, -bankAmount * direction);
            }
        }

        private void UpdateJump()
        {
            if (!IsJumping) return;

            _jumpTimer += Time.deltaTime;
            float t = _jumpTimer / Mathf.Max(0.01f, jumpDuration);

            Vector3 p = transform.position;
            if (t >= 1f)
            {
                IsJumping = false;
                p.y = _groundY;
                if (jumpDustFX != null) jumpDustFX.Play();
            }
            else
            {
                // High-launch rocket trajectory with arcade hangtime
                float heightFactor = Mathf.Sin(t * Mathf.PI);
                p.y = _groundY + jumpHeight * heightFactor;
            }
            transform.position = p;
        }
    }
}
