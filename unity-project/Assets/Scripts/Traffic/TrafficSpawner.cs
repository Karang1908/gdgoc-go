using UnityEngine;
using GDGGo.Gameplay;

namespace GDGGo.Traffic
{
    /// <summary>
    /// Streams moving civilian traffic — the game's equivalent of Subway Surfers' trains.
    ///
    /// Traffic cars drive forward slowly, so the player closes on them rather than them
    /// rushing him; overtaking is the core rhythm. Because a traffic car is a moving
    /// blocker, it reserves its lane through <see cref="LaneReservations"/> exactly like
    /// a static obstacle does, so traffic and obstacles can never seal all three lanes
    /// at the same point on the track.
    ///
    /// Meshes are the Kenney Car Kit vehicles, which are the textured ones — the
    /// Quaternius car pack ships with no textures at all.
    /// </summary>
    public sealed class TrafficSpawner : ScrollingSpawner
    {
        [System.Serializable]
        public struct TrafficEntry
        {
            [Tooltip("Prefab carrying a TrafficCar component and a trigger collider tagged Obstacle.")]
            public GameObject prefab;
            [Tooltip("Relative spawn weight.")]
            public float weight;
            [Tooltip("Forward speed for this vehicle class. Buses and trucks are slower.")]
            public float forwardSpeed;
        }

        [Header("Prefabs")]
        public TrafficEntry[] trafficPrefabs;

        [Header("Density")]
        [Tooltip("Metres between traffic spawns at the start of a run.")]
        public float intervalAtStart = 46f;

        [Tooltip("Metres between traffic spawns once difficulty is maxed.")]
        public float intervalAtMaxDifficulty = 22f;

        [Tooltip("Fallback speed when an entry leaves forwardSpeed at zero.")]
        public float defaultForwardSpeed = 9f;

        private float[] _weights;

        protected override bool ReadyToSpawn() => trafficPrefabs != null && trafficPrefabs.Length > 0;

        protected override void SpawnAt(float worldZ, WorldScroller world)
        {
            EnsureWeights();
            int index = PickWeightedIndex(_weights);
            if (index < 0) return;

            TrafficEntry entry = trafficPrefabs[index];
            if (entry.prefab == null) return;

            int lane = LaneModel.RandomLane();
            float trackDistance = world.Distance + worldZ;
            if (!LaneReservations.TryReserve(trackDistance, lane)) return;

            var pos = new Vector3(LaneModel.LaneX(lane), 0f, worldZ);
            var go = Instantiate(entry.prefab, pos, Quaternion.identity, transform);

            var car = go.GetComponent<TrafficCar>();
            if (car == null) car = go.AddComponent<TrafficCar>();
            car.forwardSpeed = entry.forwardSpeed > 0f ? entry.forwardSpeed : defaultForwardSpeed;

            Track(go);
        }

        private void EnsureWeights()
        {
            if (_weights != null && _weights.Length == trafficPrefabs.Length) return;
            _weights = new float[trafficPrefabs.Length];
            for (int i = 0; i < trafficPrefabs.Length; i++) _weights[i] = trafficPrefabs[i].weight;
        }

        protected override float IntervalMeters(WorldScroller world)
        {
            float baseInterval = Mathf.Lerp(intervalAtStart, intervalAtMaxDifficulty, world.Difficulty01);
            return baseInterval * Random.Range(0.8f, 1.3f);
        }
    }
}
