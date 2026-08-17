using UnityEngine;
using GDGGo.Gameplay;

namespace GDGGo.Scenery
{
    /// <summary>
    /// Streams buildings and props down both sides of the road.
    ///
    /// Purely cosmetic — nothing here has a collider — but it is what turns three lanes
    /// in a void into a city you are driving through, and it is the main thing that
    /// sells the sense of speed, because roadside geometry rushing past the camera reads
    /// far stronger than road texture alone.
    ///
    /// Meshes come from the Kenney City Kits, which ship with a <c>colormap.png</c>
    /// atlas — unlike the Quaternius packs, they are textured out of the box.
    /// </summary>
    public sealed class ScenerySpawner : ScrollingSpawner
    {
        [Header("Prefabs")]
        [Tooltip("Building prefabs, picked at random per slot.")]
        public GameObject[] buildingPrefabs;

        [Tooltip("Optional low props (streetlights, trees) placed nearer the kerb.")]
        public GameObject[] kerbPropPrefabs;

        [Header("Placement")]
        [Tooltip("Distance from road centre to the building line.")]
        public float sideOffset = 13f;

        [Tooltip("Random variation added to sideOffset so the skyline is not a flat wall.")]
        public float sideOffsetJitter = 3.5f;

        /// <summary>
        /// Optional second building row placed further from the road than the front row.
        ///
        /// The original skyline was a single wall of buildings at x ≈ ±13 with sky beyond
        /// it, which is exactly what "all I see is the sky" looked like. A back row sits
        /// further out (<see cref="backRowOffset"/>) and is spawned only every Nth slot so
        /// it never outnumbers the front — its job is to fill the gap behind the front row
        /// with taller, sparser silhouettes, giving the horizon depth instead of a hard
        /// edge. Leave null to disable the back row entirely (no behaviour change from the
        /// single-row spawner).
        /// </summary>
        [Tooltip("Optional distant buildings placed behind the front row to fill the horizon.")]
        public GameObject[] backRowPrefabs;

        [Tooltip("Distance from road centre for the back row. Should clear sideOffset + sideOffsetJitter.")]
        public float backRowOffset = 24f;

        [Tooltip("Random variation added to backRowOffset.")]
        public float backRowOffsetJitter = 4f;

        [Tooltip("Scale for back-row buildings. Larger than buildingScale so they read as further/taller.")]
        public float backRowScale = 7f;

        [Tooltip("Extra random scale on top of backRowScale.")]
        public float backRowScaleJitter = 2.5f;

        [Tooltip("Spawn a back-row building every Nth slot (1 = every slot, 2 = every other, etc.).")]
        public int backRowEveryNth = 2;

        private int _slotIndex;

        [Tooltip("Distance from road centre for kerb props.")]
        public float kerbOffset = 6.4f;

        [Tooltip("Metres between scenery slots.")]
        public float slotInterval = 16f;

        [Tooltip("Chance a given slot gets a kerb prop as well as a building.")]
        [Range(0f, 1f)] public float kerbPropChance = 0.45f;

        [Tooltip("Random Y-rotation applied to buildings for variety.")]
        public bool randomiseRotation = true;

        [Header("Scale")]
        [Tooltip("Uniform scale for buildings. Kenney city kits are authored on a small " +
                 "grid, so this usually needs raising until the skyline reads right " +
                 "against the 3.0-unit lane width.")]
        public float buildingScale = 4f;

        [Tooltip("Random extra scale on top of buildingScale, for skyline variety.")]
        public float buildingScaleJitter = 1.5f;

        [Tooltip("Uniform scale for kerb props.")]
        public float propScale = 1f;

        [Header("Verge greenery")]
        [Tooltip("Low props scattered across the grass between kerb and buildings.")]
        public GameObject[] vergePrefabs;

        [Tooltip("Innermost X for verge greenery. Should clear the pavement.")]
        public float vergeInnerX = 6.5f;

        [Tooltip("Chance each candidate slot actually gets a plant.")]
        [Range(0f, 1f)] public float vergeChance = 0.7f;

        public int vergeClusterMin = 1;
        public int vergeClusterMax = 3;
        public float vergeScaleMin = 0.7f;
        public float vergeScaleMax = 1.5f;

        [Header("Ground")]
        [Tooltip("World Y that scenery stands on. Matches the pavement height so props " +
                 "sit on the kerb rather than hovering above it or sinking into the road.")]
        public float groundY = 0.18f;

        /// <summary>
        /// Drops an instance so its lowest rendered vertex rests exactly on
        /// <paramref name="y"/>.
        ///
        /// Placing by pivot is not enough once a scale is applied: any gap between the
        /// pivot and the mesh's true base is multiplied by that scale, so a building at
        /// 5x floats five times as far as it would at 1x. Measuring the instance after
        /// scaling is the only placement that is correct for every prefab in the pack.
        /// </summary>
        private static void SeatOnGround(GameObject instance, float y)
        {
            if (instance == null) return;

            var renderers = instance.GetComponentsInChildren<Renderer>(true);
            if (renderers.Length == 0) return;

            Bounds b = renderers[0].bounds;
            for (int i = 1; i < renderers.Length; i++) b.Encapsulate(renderers[i].bounds);

            Vector3 p = instance.transform.position;
            p.y += y - b.min.y;
            instance.transform.position = p;
        }

        protected override bool ReadyToSpawn() => buildingPrefabs != null && buildingPrefabs.Length > 0;

        protected override void SpawnAt(float worldZ, WorldScroller world)
        {
            // One slot fills both sides of the road.
            SpawnSide(-1, worldZ);
            SpawnSide(+1, worldZ);

            // Back row only on every Nth slot so it is sparser than the front — denser than
            // the front would front-row the back, defeating the point.
            _slotIndex++;
            if (backRowPrefabs != null && backRowPrefabs.Length > 0 && _slotIndex % backRowEveryNth == 0)
            {
                SpawnBackRow(-1, worldZ);
                SpawnBackRow(+1, worldZ);
            }
        }

        private void SpawnBackRow(int side, float worldZ)
        {
            GameObject prefab = backRowPrefabs[Random.Range(0, backRowPrefabs.Length)];
            if (prefab == null) return;

            float x = side * (backRowOffset + Random.Range(0f, backRowOffsetJitter));
            var rot = randomiseRotation
                ? Quaternion.Euler(0f, Random.Range(0, 4) * 90f, 0f)
                : Quaternion.identity;

            var building = Instantiate(prefab, new Vector3(x, groundY, worldZ), rot, transform);
            float scale = backRowScale + Random.Range(0f, backRowScaleJitter);
            building.transform.localScale = new Vector3(scale, scale, scale);
            SeatOnGround(building, groundY);
            Track(building);
        }

        private void SpawnSide(int side, float worldZ)
        {
            GameObject prefab = buildingPrefabs[Random.Range(0, buildingPrefabs.Length)];
            if (prefab != null)
            {
                float x = side * (sideOffset + Random.Range(0f, sideOffsetJitter));
                Quaternion rot = randomiseRotation
                    ? Quaternion.Euler(0f, Random.Range(0, 4) * 90f, 0f)
                    : Quaternion.identity;

                var building = Instantiate(prefab, new Vector3(x, groundY, worldZ), rot, transform);
                float scale = buildingScale + Random.Range(0f, buildingScaleJitter);
                building.transform.localScale = new Vector3(scale, scale, scale);
                // Re-seat AFTER scaling. The prefab's pivot is at its base, but a mesh
                // whose lowest vertex sits slightly below its pivot gets that gap
                // multiplied by the scale — at 4-5x a millimetre of slop becomes a
                // visible gap, which is why the skyline looked like it was hovering.
                SeatOnGround(building, groundY);
                Track(building);
            }

            if (kerbPropPrefabs == null || kerbPropPrefabs.Length == 0) return;
            if (Random.value > kerbPropChance) return;

            GameObject propPrefab = kerbPropPrefabs[Random.Range(0, kerbPropPrefabs.Length)];
            if (propPrefab == null) return;

            // Face kerb props inward toward the road.
            var propRot = Quaternion.Euler(0f, side > 0 ? 180f : 0f, 0f);
            var prop = Instantiate(propPrefab, new Vector3(side * kerbOffset, groundY, worldZ), propRot, transform);
            if (propScale != 1f) prop.transform.localScale = new Vector3(propScale, propScale, propScale);
            SeatOnGround(prop, groundY);
            Track(prop);

            SpawnVergeGreenery(side, worldZ);
        }

        /// <summary>
        /// Scatters low greenery across the grass verge between the kerb and the building
        /// line.
        ///
        /// The verge is the widest empty area on screen, and a flat green band reads as
        /// unfinished no matter how good the road is. Bushes are cheap (no collider, no
        /// animation) and they break the horizontal banding that otherwise runs the whole
        /// length of the level.
        /// </summary>
        private void SpawnVergeGreenery(int side, float worldZ)
        {
            if (vergePrefabs == null || vergePrefabs.Length == 0) return;

            int count = Random.Range(vergeClusterMin, vergeClusterMax + 1);
            for (int i = 0; i < count; i++)
            {
                if (Random.value > vergeChance) continue;

                GameObject prefab = vergePrefabs[Random.Range(0, vergePrefabs.Length)];
                if (prefab == null) continue;

                // Anywhere between the pavement edge and just short of the buildings, so
                // greenery never grows through a wall.
                float x = side * Random.Range(vergeInnerX, sideOffset - 1f);
                float z = worldZ + Random.Range(-slotInterval * 0.5f, slotInterval * 0.5f);

                var go = Instantiate(prefab, new Vector3(x, groundY, z),
                                     Quaternion.Euler(0f, Random.Range(0f, 360f), 0f), transform);

                float s = Random.Range(vergeScaleMin, vergeScaleMax);
                go.transform.localScale *= s;
                SeatOnGround(go, groundY);
                Track(go);
            }
        }

        protected override float IntervalMeters(WorldScroller world)
            => slotInterval * Random.Range(0.85f, 1.15f);
    }
}
