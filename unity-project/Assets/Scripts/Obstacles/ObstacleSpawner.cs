using UnityEngine;
using GDGGo.Gameplay;

namespace GDGGo.Obstacles
{
    /// <summary>
    /// Streams stationary hazards: cones, barriers.
    ///
    /// Smart obstacle distance:
    /// As the car's speed increases, the distance between obstacles also scales UP
    /// so the player has consistent, fair reaction time.
    /// Spawns further ahead in the distance with plenty of visual anticipation.
    /// </summary>
    public sealed class ObstacleSpawner : ScrollingSpawner
    {
        [System.Serializable]
        public struct ObstacleEntry
        {
            [Tooltip("Prefab carrying an Obstacle component and a trigger collider.")]
            public GameObject prefab;
            [Tooltip("Relative spawn weight.")]
            public float weight;
        }

        [Header("Prefabs")]
        public ObstacleEntry[] obstaclePrefabs;

        [Header("Density")]
        [Tooltip("Metres between clusters at the start of a run.")]
        public float intervalAtStart = 160f;

        [Tooltip("Metres between clusters once difficulty is maxed.")]
        public float intervalAtMaxDifficulty = 240f;

        [Tooltip("Difficulty above which clusters may block two lanes instead of one.")]
        [Range(0f, 1f)] public float twoLaneBlockThreshold = 0.95f;

        [Tooltip("Chance of a two-lane cluster once past the threshold.")]
        [Range(0f, 1f)] public float twoLaneBlockChance = 0.0f;

        private readonly int[] _laneBuffer = new int[LaneModel.LaneCount];
        private float[] _weights;

        protected override bool ReadyToSpawn() => obstaclePrefabs != null && obstaclePrefabs.Length > 0;

        protected override void SpawnAt(float worldZ, WorldScroller world)
        {
            int blocked = 1;
            if (world != null && world.Difficulty01 >= twoLaneBlockThreshold && Random.value < twoLaneBlockChance)
                blocked = 2;
            blocked = Mathf.Min(blocked, LaneModel.LaneCount - 1);

            float trackDistance = (world != null ? world.Distance : 0f) + worldZ;

            LaneModel.ShuffledLanes(_laneBuffer);
            for (int i = 0; i < blocked; i++)
            {
                if (!LaneReservations.TryReserve(trackDistance, _laneBuffer[i])) continue;
                SpawnOne(_laneBuffer[i], worldZ);
            }
        }

        private void SpawnOne(int lane, float worldZ)
        {
            EnsureWeights();
            int index = PickWeightedIndex(_weights);
            if (index < 0) return;

            GameObject prefab = obstaclePrefabs[index].prefab;
            if (prefab == null) return;

            var pos = new Vector3(LaneModel.LaneX(lane), 0f, worldZ);
            var go = Instantiate(prefab, pos, Quaternion.identity, transform);
            Track(go);
        }

        private void EnsureWeights()
        {
            if (_weights != null && _weights.Length == obstaclePrefabs.Length) return;
            _weights = new float[obstaclePrefabs.Length];
            for (int i = 0; i < obstaclePrefabs.Length; i++) _weights[i] = obstaclePrefabs[i].weight;
        }

        protected override float IntervalMeters(WorldScroller world)
        {
            float difficulty = world != null ? world.Difficulty01 : 0f;
            float baseInterval = Mathf.Lerp(intervalAtStart, intervalAtMaxDifficulty, difficulty);

            // Dynamic speed scaling: as vehicle travels faster, spacing increases proportionally
            if (world != null && world.startSpeed > 0f)
            {
                float speedRatio = Mathf.Max(1f, world.Speed / world.startSpeed);
                baseInterval *= speedRatio;
            }

            // +/-15% organic jitter
            return baseInterval * Random.Range(0.88f, 1.15f);
        }
    }
}
