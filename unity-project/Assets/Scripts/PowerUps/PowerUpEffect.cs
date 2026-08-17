using UnityEngine;
using GDGGo.Core;

namespace GDGGo.PowerUps
{
    /// <summary>
    /// A floating power-up pickup. Applies itself to <see cref="GameSession"/> on contact.
    /// </summary>
    public sealed class PowerUpEffect : MonoBehaviour
    {
        public PowerUpType type = PowerUpType.CoinMagnet;

        [Tooltip("Seconds the effect lasts. Ignored by Shield, which persists until it absorbs a hit.")]
        public float durationSec = 8f;

        [Tooltip("Renderer tinted to signal which power-up this is. Found in children if unset.")]
        public Renderer tintTarget;

        private bool _consumed;

        private void Awake()
        {
            if (tintTarget == null) tintTarget = GetComponentInChildren<Renderer>(true);
        }

        /// <summary>
        /// Configures a freshly spawned pickup.
        ///
        /// All five power-ups share one mesh (the pack's star), so colour is the only
        /// thing telling the player what they are about to grab. Without it every pickup
        /// is a coin-flip, which turns a reward into a gamble.
        ///
        /// Writes to <c>.material</c> deliberately — that instances the material for this
        /// pickup only. Using <c>.sharedMaterial</c> would recolour every power-up in the
        /// scene, and the shared asset on disk with it.
        /// </summary>
        public void Configure(PowerUpType powerUpType, float duration, Color tint)
        {
            type = powerUpType;
            durationSec = duration;

            if (tintTarget == null) tintTarget = GetComponentInChildren<Renderer>(true);
            if (tintTarget == null) return;

            Material instance = tintTarget.material;
            if (instance == null) return;

            if (instance.HasProperty("_BaseColor")) instance.SetColor("_BaseColor", tint);
            if (instance.HasProperty("_Color")) instance.SetColor("_Color", tint);
            if (instance.HasProperty("_EmissionColor")) instance.SetColor("_EmissionColor", tint * 1.4f);
        }

        private void OnTriggerEnter(Collider other)
        {
            if (_consumed || other == null || !other.CompareTag(Tags.Player)) return;

            var session = GameSession.Instance;
            if (session == null || !session.IsRunning) return;

            _consumed = true;
            session.ApplyPowerUp(type, durationSec);
            Audio.AudioManager.Instance?.PlayPowerUp();

            Destroy(gameObject);
        }
    }
}
