using UnityEngine;
using UnityEngine.UI;
using TMPro;
using GDGGo.Core;

namespace GDGGo.UI
{
    /// <summary>
    /// In-game HUD. Mirrors <see cref="GameSession"/> into on-screen labels each frame.
    ///
    /// The score counter deliberately eases toward the true value rather than snapping:
    /// a number that visibly climbs after a pickup reads as a reward, where a number
    /// that just changes reads as a readout. The multiplier chip pops on change for the
    /// same reason.
    /// </summary>
    public sealed class HUD : MonoBehaviour
    {
        [Header("Labels")]
        public TMP_Text scoreText;
        public TMP_Text distanceText;
        public TMP_Text coinText;

        [Header("Combo")]
        public TMP_Text multiplierText;
        [Tooltip("Scale the multiplier chip pops to when it increases.")]
        public float multiplierPopScale = 1.45f;
        public float multiplierPopDecay = 5f;

        [Header("Power-up icons")]
        public Image magnetIcon;
        public Image boostIcon;
        public Image shieldIcon;
        public Image twoXIcon;
        public Image freezeIcon;

        [Range(0f, 1f)] public float activeAlpha = 1f;
        [Range(0f, 1f)] public float idleAlpha = 0.22f;

        [Header("Fuel")]
        [Tooltip("Fill image for the fuel gauge. Uses Image.Type.Filled.")]
        public Image fuelFillImage;
        public TMP_Text fuelText;

        [Tooltip("Gauge colour at a full tank.")]
        public Color fuelFullColor = new Color(0.204f, 0.659f, 0.325f);   // Google green
        [Tooltip("Gauge colour once the tank is low.")]
        public Color fuelLowColor = new Color(0.918f, 0.263f, 0.208f);    // Google red
        [Tooltip("Pulses per second while fuel is low — the gauge should nag.")]
        public float fuelPulseHz = 2.6f;

        [Header("Feel")]
        [Tooltip("How fast the displayed score catches up to the real one.")]
        public float scoreCatchUpPerSecond = 6f;

        private GameSession _session;
        private float _displayedScore;
        private int _lastMultiplier = 1;
        private float _multiplierPop;

        private void OnDisable()
        {
            if (_session != null) _session.OnLowFuel -= PlayLowFuelSting;
        }

        private static void PlayLowFuelSting() => Audio.AudioManager.Instance?.PlayLowFuel();

        private void Update()
        {
            if (_session == null)
            {
                _session = GameSession.Instance;
                // Subscribe once, on the frame the session first appears — GameSession is
                // created by SceneBuilder alongside the HUD, so it is not guaranteed to
                // exist in our Awake.
                if (_session != null) _session.OnLowFuel += PlayLowFuelSting;
            }
            if (_session == null) return;

            UpdateScore();
            UpdateMultiplier();
            UpdateFuel();

            if (distanceText != null) distanceText.text = Mathf.RoundToInt(_session.DistanceMeters) + " m";
            if (coinText != null) coinText.text = _session.CoinCount.ToString();

            SetIcon(magnetIcon, _session.HasMagnet);
            SetIcon(shieldIcon, _session.HasShield);
            SetIcon(twoXIcon, _session.Has2x);
            SetIcon(freezeIcon, _session.PoliceFreezeActive);
            SetIcon(boostIcon, Gameplay.PlayerCar.Current != null && Gameplay.PlayerCar.Current.IsBoosting);
        }

        private void UpdateScore()
        {
            if (scoreText == null) return;

            int target = _session.Score;
            // Exponential ease, but always close at least 1 point/frame so the counter
            // cannot stall a fraction short of the real value.
            _displayedScore = Mathf.Lerp(_displayedScore, target,
                                         1f - Mathf.Exp(-scoreCatchUpPerSecond * Time.deltaTime));
            if (Mathf.Abs(target - _displayedScore) < 1f) _displayedScore = target;

            scoreText.text = Mathf.RoundToInt(_displayedScore).ToString("N0");
        }

        private void UpdateMultiplier()
        {
            if (multiplierText == null) return;

            int multiplier = _session.Multiplier;

            if (multiplier > _lastMultiplier) _multiplierPop = 1f;
            _lastMultiplier = multiplier;

            // Hide the chip entirely at 1x — an always-on "x1" is noise.
            bool show = multiplier > 1;
            if (multiplierText.gameObject.activeSelf != show) multiplierText.gameObject.SetActive(show);
            if (!show) return;

            multiplierText.text = "x" + multiplier;

            _multiplierPop = Mathf.MoveTowards(_multiplierPop, 0f, multiplierPopDecay * Time.deltaTime);
            float scale = 1f + (multiplierPopScale - 1f) * _multiplierPop;
            multiplierText.transform.localScale = new Vector3(scale, scale, 1f);
        }

        /// <summary>
        /// Drives the fuel gauge. Green when healthy, lerping to red as the tank empties,
        /// and pulsing once it is genuinely low — a bar that only shrinks is easy to miss
        /// while the player is watching traffic.
        /// </summary>
        private void UpdateFuel()
        {
            float fuel = _session.Fuel;

            if (fuelText != null) fuelText.text = Mathf.RoundToInt(fuel * 100f) + "%";
            if (fuelFillImage == null) return;

            fuelFillImage.fillAmount = fuel;

            // Normalise across the low-fuel band so the colour shift happens where it
            // matters instead of being spread across the whole tank.
            float t = Mathf.Clamp01(fuel / Mathf.Max(0.0001f, GameSession.LowFuelThreshold));
            Color c = Color.Lerp(fuelLowColor, fuelFullColor, t);

            if (fuel <= GameSession.LowFuelThreshold)
            {
                // Sin gives a smooth throb; remapped to 0.55..1 so the bar never fully
                // disappears and read as broken.
                float pulse = 0.55f + 0.45f * (0.5f + 0.5f * Mathf.Sin(Time.time * fuelPulseHz * Mathf.PI * 2f));
                c *= pulse;
                c.a = 1f;
            }

            fuelFillImage.color = c;
        }

        private void SetIcon(Image icon, bool active)
        {
            if (icon == null) return;
            Color c = icon.color;
            c.a = active ? activeAlpha : idleAlpha;
            icon.color = c;
        }
    }
}
