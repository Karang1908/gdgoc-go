using UnityEngine;

namespace GDGGo.Coins
{
    /// <summary>
    /// A brief expand-and-fade applied to a throwaway copy of a pickup's mesh, so
    /// collecting something rare lands as an event rather than the object blinking out.
    ///
    /// It destroys itself, and it deliberately does not scroll with the world: over its
    /// ~0.35 s lifetime the drift is a few centimetres, and staying put keeps the burst
    /// anchored where the player's eye already is.
    /// </summary>
    public sealed class PickupBurst : MonoBehaviour
    {
        [Tooltip("Seconds the burst lives. Kept short — this plays mid-run, at speed.")]
        public float lifetime = 0.35f;

        [Tooltip("Final scale multiplier at the end of the burst.")]
        public float endScaleMultiplier = 2.4f;

        [Tooltip("Extra spin during the burst, degrees/sec.")]
        public float spinDegPerSecond = 540f;

        [Tooltip("How far the burst rises over its life, world units.")]
        public float rise = 1.1f;

        private Vector3 _startScale;
        private Vector3 _startPosition;
        private float _elapsed;
        private Material _material;
        private bool _canFade;

        private void Awake()
        {
            _startScale = transform.localScale;
            _startPosition = transform.position;

            var renderer = GetComponent<MeshRenderer>();
            if (renderer == null) return;

            // Instance the material: fading the shared one would fade every coin of this
            // colour still on the road.
            _material = renderer.material;
            _canFade = _material != null && (_material.HasProperty("_Color") || _material.HasProperty("_BaseColor"));
            if (_canFade) MakeTransparent(_material);
        }

        private void Update()
        {
            _elapsed += Time.deltaTime;
            float t = Mathf.Clamp01(_elapsed / Mathf.Max(0.01f, lifetime));

            // Ease-out: the burst is fastest at the moment of pickup, which is what ties
            // it to the impact rather than looking like an independent animation.
            float eased = 1f - (1f - t) * (1f - t);

            transform.localScale = _startScale * Mathf.Lerp(1f, endScaleMultiplier, eased);
            transform.position = _startPosition + Vector3.up * (rise * eased);
            transform.Rotate(0f, spinDegPerSecond * Time.deltaTime, 0f, Space.World);

            if (_canFade) SetAlpha(1f - eased);

            if (t >= 1f) Destroy(gameObject);
        }

        private void OnDestroy()
        {
            // The instanced material is ours; Unity will not collect it for us.
            if (_material != null) Destroy(_material);
        }

        /// <summary>
        /// Switches a Standard/URP-Lit material to transparent blending so alpha does
        /// anything at all. Opaque materials ignore the alpha channel entirely.
        /// </summary>
        private static void MakeTransparent(Material material)
        {
            material.SetFloat("_Mode", 3f);                       // Standard: Transparent
            material.SetFloat("_Surface", 1f);                    // URP: Transparent
            material.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
            material.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            material.SetInt("_ZWrite", 0);
            material.DisableKeyword("_ALPHATEST_ON");
            material.EnableKeyword("_ALPHABLEND_ON");
            material.renderQueue = (int)UnityEngine.Rendering.RenderQueue.Transparent;
        }

        private void SetAlpha(float alpha)
        {
            if (_material.HasProperty("_Color"))
            {
                Color c = _material.GetColor("_Color");
                c.a = alpha;
                _material.SetColor("_Color", c);
            }
            if (_material.HasProperty("_BaseColor"))
            {
                Color c = _material.GetColor("_BaseColor");
                c.a = alpha;
                _material.SetColor("_BaseColor", c);
            }
        }
    }
}
