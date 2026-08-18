using UnityEngine;
using GDGGo.Core;

namespace GDGGo.Gameplay
{
    /// <summary>
    /// Detects thrilling "Near Miss" dodges when the player narrowly avoids an obstacle or traffic car.
    /// Awards bonus points and triggers satisfying arcade alert and audio stinger.
    /// </summary>
    public sealed class NearMissDetector : MonoBehaviour
    {
        private PlayerCar _car;
        private PlayerCollision _collision;
        private float _lastNearMissTime;
        private const float NearMissCooldown = 0.85f;

        private void Awake()
        {
            _car = GetComponentInParent<PlayerCar>();
            _collision = GetComponentInParent<PlayerCollision>();
        }

        private void OnTriggerEnter(Collider other)
        {
            if (other == null || _car == null) return;
            if (_collision != null && _collision.IsInvulnerable) return;
            if (Time.time < _lastNearMissTime + NearMissCooldown) return;

            if (other.CompareTag(Tags.Obstacle))
            {
                _lastNearMissTime = Time.time;
                var session = GameSession.Instance;
                if (session != null && session.IsRunning)
                {
                    session.AddBonusScore(50);
                    UI.HUD.Instance?.ShowAlert("NEAR MISS! +50", new Color(1f, 0.85f, 0.1f));
                    Audio.AudioManager.Instance?.PlaySwerve();
                }
            }
        }
    }
}
