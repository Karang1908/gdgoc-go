using UnityEngine;
using GDGGo.Gameplay;

namespace GDGGo.Obstacles
{
    /// <summary>
    /// Streams stationary hazards: cones, barriers, signs, traffic lights.
    ///
    /// The one inviolable rule is that <b>at least one lane is always passable</b>. The
    /// spawner shuffles the three lanes and blocks only the first one or two, so an
    /// unwinnable wall can never be generated. Everything else — how often clusters
    /// appear, how many lanes they block — scales with
    /// <see cref="WorldScroller.Difficulty01"/> so the run tightens as it goes.
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
        public float intervalAtStart = 34f;

        [Tooltip("Metres between clusters once difficulty is maxed.")]
        public float intervalAtMaxDifficulty = 15f;

        [Tooltip("Difficulty above which clusters may block two lanes instead of one.")]
        [Range(0f, 1f)] public float twoLaneBlockThreshold = 0.35f;

        [Tooltip("Chance of a two-lane cluster once past the threshold.")]
        [Range(0f, 1f)] public float twoLaneBlockChance = 0.4f;

        private readonly int[] _laneBuffer = new int[LaneModel.LaneCount];
        private float[] _weights;

        protected override bool ReadyToSpawn() => obstaclePrefabs != null && obstaclePrefabs.Length > 0;

        protected override void SpawnAt(float worldZ, WorldScroller world)
        {
            // Decide how many lanes to block, never all of them.
            int blocked = 1;
            if (world.Difficulty01 >= twoLaneBlockThreshold && Random.value < twoLaneBlockChance)
                blocked = 2;
            blocked = Mathf.Min(blocked, LaneModel.LaneCount - 1);   // always leave one open

            float trackDistance = world.Distance + worldZ;

            LaneModel.ShuffledLanes(_laneBuffer);
            for (int i = 0; i < blocked; i++)
            {
                // Refuse any placement that would close the last gap — traffic may
                // already have claimed a lane near this point on the track.
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
            float baseInterval = Mathf.Lerp(intervalAtStart, intervalAtMaxDifficulty, world.Difficulty01);
            // +/-25% jitter so the rhythm never becomes metronomic and memorisable.
            return baseInterval * Random.Range(0.75f, 1.25f);
        }
    }
}
