using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace GDGGo.UI
{
    /// <summary>
    /// Gives a uGUI element the springy, over-shooting motion a mobile runner's menu is
    /// expected to have: buttons that squash when pressed, panels that pop in rather than
    /// appear, and a slow idle bob on hero art.
    ///
    /// This exists because uGUI's built-in Button transition only tints a colour. A tint
    /// change reads as "the computer acknowledged you"; a scale change reads as "you
    /// pressed a physical thing", and that difference is most of what separates a menu
    /// that feels finished from one that feels like a debug screen.
    ///
    /// Everything is driven from Update against unscaled time so it keeps working while
    /// the game is paused, and there are no coroutines to leak on a destroyed object.
    /// </summary>
    [DisallowMultipleComponent]
    public sealed class UIAnimator : MonoBehaviour, IPointerEnterHandler, IPointerExitHandler,
                                     IPointerDownHandler, IPointerUpHandler
    {
        public enum Motion
        {
            /// <summary>Scale + hover response. For buttons.</summary>
            Button,
            /// <summary>Pops in from small on enable. For panels and cards.</summary>
            PopIn,
            /// <summary>Continuous gentle float. For logos and hero art.</summary>
            Bob,
            /// <summary>Button response PLUS a continuous breathing pulse. For the one
            /// primary call-to-action, which should visibly invite the tap.</summary>
            PulseButton,
        }

        [Header("Behaviour")]
        public Motion motion = Motion.Button;

        [Header("Button")]
        [Tooltip("Scale multiplier while the pointer is over the control.")]
        public float hoverScale = 1.06f;
        [Tooltip("Scale multiplier while held down. Below 1 so the button squashes.")]
        public float pressedScale = 0.94f;
        [Tooltip("How fast the control chases its target scale.")]
        public float responsiveness = 14f;

        [Header("Pop-in")]
        public float popDuration = 0.28f;
        [Tooltip("How far past full size the pop overshoots. 0 = no overshoot.")]
        public float popOvershoot = 0.12f;

        [Header("Bob")]
        public float bobAmplitude = 6f;
        public float bobFrequency = 0.55f;

        [Header("Pulse")]
        [Tooltip("Peak extra scale of the idle pulse, as a fraction.")]
        public float pulseAmount = 0.035f;
        public float pulseFrequency = 1.1f;

        private RectTransform _rect;
        private Vector3 _baseScale;
        private Vector2 _basePosition;
        private bool _hovered;
        private bool _pressed;
        private float _popElapsed;
        private float _bobPhase;

        private void Awake()
        {
            _rect = GetComponent<RectTransform>();
            _baseScale = _rect != null ? _rect.localScale : Vector3.one;
            _basePosition = _rect != null ? _rect.anchoredPosition : Vector2.zero;
            // Randomised so several bobbing elements never move in lockstep.
            _bobPhase = Random.value * Mathf.PI * 2f;
        }

        private void OnEnable()
        {
            _popElapsed = 0f;
            _hovered = false;
            _pressed = false;

            if (motion == Motion.PopIn && _rect != null)
                _rect.localScale = _baseScale * 0.86f;
        }

        private void Update()
        {
            if (_rect == null) return;

            // Unscaled: menus animate while the game is paused at Time.timeScale = 0.
            float dt = Time.unscaledDeltaTime;

            switch (motion)
            {
                case Motion.Button: TickButton(dt, false); break;
                case Motion.PulseButton: TickButton(dt, true); break;
                case Motion.PopIn: TickPopIn(dt); break;
                case Motion.Bob: TickBob(dt); break;
            }
        }

        private void TickButton(float dt, bool pulse)
        {
            float target = 1f;
            if (_pressed) target = pressedScale;
            else if (_hovered) target = hoverScale;

            // The idle pulse is suppressed while the pointer is on the control: competing
            // with the hover response would make the button feel loose rather than alive.
            if (pulse && !_hovered && !_pressed)
            {
                _bobPhase += dt * pulseFrequency * Mathf.PI * 2f;
                target += Mathf.Sin(_bobPhase) * pulseAmount;
            }

            _rect.localScale = Vector3.Lerp(_rect.localScale, _baseScale * target,
                                            1f - Mathf.Exp(-responsiveness * dt));
        }

        private void TickPopIn(float dt)
        {
            if (_popElapsed >= popDuration) return;

            _popElapsed += dt;
            float t = Mathf.Clamp01(_popElapsed / Mathf.Max(0.01f, popDuration));

            // Ease-out with a single overshoot bump: fast in, slight past-target, settle.
            float eased = 1f - (1f - t) * (1f - t);
            float overshoot = Mathf.Sin(t * Mathf.PI) * popOvershoot;

            _rect.localScale = _baseScale * (0.86f + 0.14f * eased + overshoot);

            if (t >= 1f) _rect.localScale = _baseScale;
        }

        private void TickBob(float dt)
        {
            _bobPhase += dt * bobFrequency * Mathf.PI * 2f;
            _rect.anchoredPosition = _basePosition + new Vector2(0f, Mathf.Sin(_bobPhase) * bobAmplitude);
        }

        // ------------------------------------------------------------------
        // Pointer events. Guarded on the button actually being interactable so a
        // disabled control does not animate as though it were live.
        // ------------------------------------------------------------------

        private bool Interactable
        {
            get
            {
                var selectable = GetComponent<Selectable>();
                return selectable == null || selectable.interactable;
            }
        }

        public void OnPointerEnter(PointerEventData e)
        {
            if (!Interactable) return;
            _hovered = true;
            Audio.AudioManager.Instance?.PlayHover();
        }

        public void OnPointerExit(PointerEventData e)
        {
            _hovered = false;
            _pressed = false;
        }

        public void OnPointerDown(PointerEventData e)
        {
            if (!Interactable) return;
            _pressed = true;
        }

        public void OnPointerUp(PointerEventData e) => _pressed = false;
    }
}
