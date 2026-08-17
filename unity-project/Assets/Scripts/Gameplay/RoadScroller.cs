using UnityEngine;

namespace GDGGo.Gameplay
{
    /// <summary>
    /// Streams the modular road under the player.
    ///
    /// Tiles are laid end to end with no gap, so the spawn interval is exactly
    /// <see cref="tileLength"/> — unlike the other spawners, this one is not random.
    /// Tiles come from the Quaternius Street Pack (<c>Street_Straight.fbx</c> and
    /// friends), which ship untextured, so <c>PrefabsBuilder</c> assigns flat materials
    /// to their slots.
    ///
    /// <see cref="startTrackDistance"/> is negative so there is already road behind the
    /// player on frame one; otherwise the run opens with the car hanging over a void.
    /// </summary>
    public sealed class RoadScroller : ScrollingSpawner
    {
        [Header("Road tiles")]
        [Tooltip("Straight road tile prefabs. Picked at random for surface variety. " +
                 "Every one MUST be exactly tileLength long on Z or seams will appear.")]
        public GameObject[] tilePrefabs;

        [Tooltip("Relative spawn weight per tile prefab. Leave empty for a uniform pick.")]
        public float[] tileWeights;

        [Tooltip("Length of one tile along Z, in world units, after prefab scaling. " +
                 "Measure the imported mesh's Renderer bounds if seams appear.")]
        public float tileLength = 12f;

        private void Reset()
        {
            // Sensible defaults when the component is added by hand in the Inspector.
            startTrackDistance = -48f;
            spawnAheadDistance = 200f;
            despawnBehindZ = -60f;
        }

        protected override bool ReadyToSpawn()
        {
            if (tilePrefabs != null && tilePrefabs.Length > 0) return true;
            // Warn once rather than every frame.
            if (!_warned)
            {
                _warned = true;
                Debug.LogWarning("[RoadScroller] No tilePrefabs assigned — run " +
                                 "\"GDG Go > Build All Prefabs\" then rebuild the Game scene.");
            }
            return false;
        }
        private bool _warned;

        protected override void SpawnAt(float worldZ, WorldScroller world)
        {
            int index = (tileWeights != null && tileWeights.Length == tilePrefabs.Length)
                ? PickWeightedIndex(tileWeights)
                : Random.Range(0, tilePrefabs.Length);

            GameObject prefab = tilePrefabs[Mathf.Clamp(index, 0, tilePrefabs.Length - 1)];
            if (prefab == null) return;

            var tile = Instantiate(prefab, new Vector3(0f, 0f, worldZ), Quaternion.identity, transform);
            Track(tile);
        }

        /// <summary>Constant: tiles must butt up against each other exactly.</summary>
        protected override float IntervalMeters(WorldScroller world) => Mathf.Max(1f, tileLength);
    }
}
