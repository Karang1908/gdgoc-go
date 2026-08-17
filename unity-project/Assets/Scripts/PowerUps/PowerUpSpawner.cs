using UnityEngine;
using GDGGo.Gameplay;

namespace GDGGo.PowerUps
{
    /// <summary>
    /// Streams power-ups. Rare by design — they are a reward for reaching depth, not a
    /// constant supply.
    ///
    /// Previously this class had a public Spawn() nobody called and an Update() that was
    /// an explicit no-op, so no power-up ever appeared.
    /// </summary>
    public sealed class PowerUpSpawner : ScrollingSpawner
    {
        [System.Serializable]
        public struct SpawnEntry
        {
            public PowerUpType type;
            [Tooltip("Prefab carrying a PowerUpEffect and a trigger collider.")]
            public PowerUpEffect prefab;
            [Tooltip("Relative spawn weight.")]
            public float spawnWeight;
            [Tooltip("How long the effect lasts. Ignored by Shield, which lasts until hit.")]
            public float durationSec;
        }

        [Header("Prefabs")]
        public SpawnEntry[] entries;

        [Header("Density")]
        [Tooltip("Metres between power-ups.")]
        public float intervalMeters = 240f;

        [Tooltip("Height the power-up floats above the road.")]
        public float hoverHeight = 1.5f;

        private float[] _weights;

        protected override bool ReadyToSpawn() => entries != null && entries.Length > 0;

        protected override void SpawnAt(float worldZ, WorldScroller world)
        {
            EnsureWeights();
            int index = PickWeightedIndex(_weights);
            if (index < 0) return;

            SpawnEntry entry = entries[index];
            if (entry.prefab == null) return;

            float trackDistance = world.Distance + worldZ;

            // Put it somewhere reachable rather than inside a bus.
            int lane = LaneModel.RandomLane();
            for (int i = 0; i < LaneModel.LaneCount; i++)
            {
                int candidate = (lane + i) % LaneModel.LaneCount;
                if (!LaneReservations.IsBlocked(trackDistance, candidate)) { lane = candidate; break; }
            }

            var pos = new Vector3(LaneModel.LaneX(lane), hoverHeight, worldZ);
            PowerUpEffect effect = Instantiate(entry.prefab, pos, Quaternion.identity, transform);
            effect.Configure(entry.type,
                             entry.durationSec > 0f ? entry.durationSec : 8f,
                             TintFor(entry.type));

            Track(effect.gameObject);
        }

        /// <summary>
        /// Colour code per power-up. Kept distinct in hue rather than shade so they stay
        /// tellable apart at speed, in peripheral vision, on a phone screen.
        /// </summary>
        private static Color TintFor(PowerUpType type)
        {
            switch (type)
            {
                case PowerUpType.CoinMagnet: return new Color(0.98f, 0.74f, 0.02f);  // amber
                case PowerUpType.Nitro: return new Color(0.20f, 0.90f, 1.00f);       // cyan
                case PowerUpType.Shield: return new Color(0.26f, 0.52f, 0.96f);      // blue
                case PowerUpType.TwoX: return new Color(0.20f, 0.85f, 0.35f);        // green
                case PowerUpType.PoliceFreeze: return new Color(0.85f, 0.35f, 0.95f);// magenta
                default: return Color.white;
            }
        }

        private void EnsureWeights()
        {
            if (_weights != null && _weights.Length == entries.Length) return;
            _weights = new float[entries.Length];
            for (int i = 0; i < entries.Length; i++) _weights[i] = entries[i].spawnWeight;
        }

        protected override float IntervalMeters(WorldScroller world)
            => intervalMeters * Random.Range(0.75f, 1.35f);
    }
}
