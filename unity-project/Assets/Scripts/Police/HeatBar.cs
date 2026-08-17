using UnityEngine;
using UnityEngine.UI;

namespace GDGGo.Police
{
    /// <summary>
    /// Renders <see cref="Core.GameSession.Heat"/> — how much road is left between the
    /// player and the police — as a filled bar.
    ///
    /// The colour ramp is Google green to Google red, and the pulse only kicks in below
    /// the panic threshold. A bar that pulses constantly stops carrying information;
    /// keeping it still until things are actually bad is what makes the pulse mean
    /// something.
    /// </summary>
    public sealed class HeatBar : MonoBehaviour
    {
        [Header("Images")]
        [Tooltip("Image with Type = Filled. Its fillAmount tracks Heat.")]
        public Image fillImage;
        public Image backgroundImage;

        [Header("Colours")]
        public Color safeColor = new Color(0.204f, 0.659f, 0.325f);    // Google green
        public Color warningColor = new Color(0.984f, 0.737f, 0.020f); // Google yellow
        public Color dangerColor = new Color(0.918f, 0.263f, 0.208f);  // Google red

        [Header("Panic pulse")]
        [Tooltip("Heat below which the bar starts pulsing.")]
        [Range(0f, 1f)] public float panicThreshold = 0.3f;
        public float pulseHz = 4.5f;

        [Tooltip("How quickly the bar follows Heat. Smoothing stops a crash from " +
                 "snapping the bar and makes the loss of ground legible.")]
        public float followSpeed = 6f;

        private float _displayed = 1f;

        private void Update()
        {
            if (fillImage == null) return;

            var session = Core.GameSession.Instance;
            float heat = session != null ? Mathf.Clamp01(session.Heat) : 0f;

            _displayed = Mathf.Lerp(_displayed, heat, 1f - Mathf.Exp(-followSpeed * Time.deltaTime));
            fillImage.fillAmount = _displayed;

            fillImage.color = ColorForHeat(_displayed);
        }

        private Color ColorForHeat(float heat)
        {
            // Two-stop ramp: green -> yellow over the top half, yellow -> red below.
            Color color = heat > 0.5f
                ? Color.Lerp(warningColor, safeColor, (heat - 0.5f) * 2f)
                : Color.Lerp(dangerColor, warningColor, heat * 2f);

            if (heat >= panicThreshold) return color;

            // Below the threshold, flash toward white so it reads even in peripheral vision.
            float pulse = Mathf.Sin(Time.time * pulseHz * Mathf.PI * 2f) * 0.5f + 0.5f;
            float intensity = 1f - (heat / Mathf.Max(0.01f, panicThreshold));
            return Color.Lerp(color, Color.white, pulse * intensity * 0.55f);
        }
    }
}
