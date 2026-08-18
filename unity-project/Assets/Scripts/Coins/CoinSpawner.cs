using UnityEngine;
using GDGGo.Gameplay;

namespace GDGGo.Coins
{
    /// <summary>
    /// Streams coins in readable patterns — the game's reward loop and the only piece of
    /// GDG branding the player actually chases.
    ///
    /// Coins arrive as <i>patterns</i>, never as isolated singles: a line down one lane,
    /// a weave that walks the player across lanes, an arc that pays out for jumping, or
    /// a full row. Patterns are what make a runner feel authored rather than random,
    /// because each one is a little instruction about where to steer.
    ///
    /// Colour split follows the brief: red / blue / yellow / green are the Google
    /// colours and are pure cosmetic variety at 1 point each; the GDG pill is the rare
    /// one worth 25. The mesh is identical across all five (Quaternius RPG
    /// <c>Coin.fbx</c>, which has a single "Gold" material slot) — only the material
    /// differs, which is what keeps the "everything from packs" rule intact.
    ///
    /// This class previously had no Update() and its spawn methods had zero callers, so
    /// no coin ever appeared in the game.
    /// </summary>
    public sealed class CoinSpawner : ScrollingSpawner
    {
        private enum Pattern { Line, Weave, Arc, Row }

        [Header("Prefab & materials")]
        [Tooltip("Coin prefab (Quaternius RPG Coin.fbx + CoinPickup).")]
        public CoinPickup coinPrefab;

        [Tooltip("Optional dedicated fuel prefab.")]
        public CoinPickup fuelPrefabOverride;

        [Tooltip("Optional dedicated GDG Pill coin prefab with custom 3D mesh & logo.")]
        public CoinPickup pillPrefabOverride;

        [Tooltip("Materials for the four Google-colour coins and the rare GDG pill.")]
        public Material redMaterial;
        public Material blueMaterial;
        public Material yellowMaterial;
        public Material greenMaterial;
        public Material gdgPillMaterial;
        public Material fuelMaterial;

        [Header("Spawn weights")]
        [Tooltip("Relative weights for Red / Blue / Yellow / Green. The GDG pill uses " +
                 "gdgPillChance instead and is rolled first.")]
        public float redWeight = 1f;
        public float blueWeight = 1f;
        public float yellowWeight = 1f;
        public float greenWeight = 1f;

        [Tooltip("Probability that any given coin is the rare GDG pill.")]
        [Range(0f, 0.2f)] public float gdgPillChance = 0.055f;

        [Tooltip("Track distance (m) before the GDG pill can drop at all.")]
        public float gdgPillUnlockDistance = 25f;

        [Header("Geometry")]
        [Tooltip("Spacing between coins along Z within a pattern.")]
        public float coinSpacing = 2.4f;

        [Tooltip("Height coins float above the road.")]
        public float hoverHeight = 1.2f;

        [Tooltip("Peak extra height of an arc pattern — should sit inside the car's jump arc.")]
        public float archPeakHeight = 2.4f;

        [Header("Density")]
        [Tooltip("Metres between coin patterns.")]
        public float patternInterval = 30f;

        private float[] _colourWeights;

        protected override bool ReadyToSpawn() => coinPrefab != null;

        [Header("Fuel")]
        [Tooltip("Metres between fuel cans when the tank is comfortably full.")]
        public float fuelIntervalMetres = 85f;

        [Tooltip("Metres between fuel cans once the tank is low. Cans arrive more often " +
                 "as the player runs dry so a run ends from bad driving, not bad luck.")]
        public float fuelIntervalWhenLow = 45f;

        /// <summary>Track distance at which the next fuel can is due.</summary>
        private float _nextFuelTrack = 35f;

        [Header("GDG Pill Milestones")]
        [Tooltip("Guaranteed milestone interval for GDG Pill coin spawns (every 100 meters).")]
        public float pillMilestoneInterval = 100f;
        private float _nextPillMilestoneTrack = 100f;

        protected override void SpawnAt(float worldZ, WorldScroller world)
        {
            float trackDistance = world.Distance + worldZ;

            int lane = PickOpenLane(trackDistance);

            // 1. Guaranteed GDG Pill Coin every 100 meters!
            if (trackDistance >= _nextPillMilestoneTrack)
            {
                SpawnGuaranteedGDGPill(lane, worldZ);
                _nextPillMilestoneTrack = trackDistance + pillMilestoneInterval;
                return;
            }

            // 2. Fuel is scheduled on its own track-space cadence
            if (trackDistance >= _nextFuelTrack)
            {
                SpawnFuel(lane, worldZ);
                var session = Core.GameSession.Instance;
                bool low = session != null && session.Fuel <= Core.GameSession.LowFuelThreshold;
                _nextFuelTrack = trackDistance + (low ? fuelIntervalWhenLow : fuelIntervalMetres);
                return;
            }

            switch (ChoosePattern())
            {
                case Pattern.Line: SpawnLine(lane, worldZ, 6); break;
                case Pattern.Weave: SpawnWeave(lane, worldZ); break;
                case Pattern.Arc: SpawnArc(lane, worldZ); break;
                case Pattern.Row: SpawnRow(worldZ); break;
            }
        }

        /// <summary>A single guaranteed GDG Pill coin, hovering in the open lane.</summary>
        private void SpawnGuaranteedGDGPill(int lane, float worldZ)
        {
            float x = LaneModel.LaneX(lane);
            float y = hoverHeight + 0.1f;

            CoinPickup prefabToUse = pillPrefabOverride != null ? pillPrefabOverride : coinPrefab;
            var coin = Instantiate(prefabToUse, new Vector3(x, y, worldZ), Quaternion.identity, transform);
            coin.coinType = CoinType.GDGPill;
            coin.coinValue = 25;
            if (pillPrefabOverride == null)
            {
                coin.ApplyMaterial(gdgPillMaterial);
            }
            Track(coin.gameObject);
        }

        /// <summary>A single fuel can, hovering in the middle of its lane.</summary>
        private void SpawnFuel(int lane, float worldZ)
        {
            CoinPickup template = fuelPrefabOverride != null ? fuelPrefabOverride : coinPrefab;
            var coin = Instantiate(template, new Vector3(LaneModel.LaneX(lane), hoverHeight, worldZ),
                                   Quaternion.identity, transform);
            coin.coinType = CoinType.Fuel;
            coin.coinValue = 0;
            // The dedicated fuel prefab is already tinted orange by PrefabsBuilder, so
            // recolouring via the legacy coin material on the bottle would overwrite a
            // deliberate Glass/Liquid palette with a flat orange and flatten the
            // silhouette. Only ApplyMaterial the coin-fallback path (no override).
            if (fuelPrefabOverride == null) coin.ApplyMaterial(MaterialFor(CoinType.Fuel));
            // Bigger than a coin: a fuel can is a landmark the player steers toward.
            // (Only applies when falling back to the coin mesh; the dedicated bottle
            // prefab is already built at fuel scale, so we don't double-scale it.)
            if (fuelPrefabOverride == null) coin.transform.localScale *= 1.6f;
            Track(coin.gameObject);
        }

        protected override float IntervalMeters(WorldScroller world)
            => patternInterval * Random.Range(0.85f, 1.2f);

        // ------------------------------------------------------------------
        // Patterns
        // ------------------------------------------------------------------

        private Pattern ChoosePattern()
        {
            float r = Random.value;
            if (r < 0.42f) return Pattern.Line;
            if (r < 0.72f) return Pattern.Weave;
            if (r < 0.90f) return Pattern.Arc;
            return Pattern.Row;
        }

        /// <summary>A straight run of coins down one lane.</summary>
        private void SpawnLine(int lane, float worldZ, int count)
        {
            for (int i = 0; i < count; i++)
                SpawnCoin(LaneModel.LaneX(lane), hoverHeight, worldZ + i * coinSpacing);
        }

        /// <summary>A diagonal that walks the player one lane across.</summary>
        private void SpawnWeave(int startLane, float worldZ)
        {
            int direction = startLane == 0 ? 1 : (startLane == LaneModel.LaneCount - 1 ? -1 : (Random.value < 0.5f ? -1 : 1));
            const int perStep = 3;

            for (int step = 0; step < 2; step++)
            {
                int lane = LaneModel.Clamp(startLane + direction * step);
                for (int i = 0; i < perStep; i++)
                {
                    float z = worldZ + (step * perStep + i) * coinSpacing;
                    SpawnCoin(LaneModel.LaneX(lane), hoverHeight, z);
                }
            }
        }

        /// <summary>An arc that pays out only if the player jumps through it.</summary>
        private void SpawnArc(int lane, float worldZ)
        {
            const int count = 7;
            float x = LaneModel.LaneX(lane);

            for (int i = 0; i < count; i++)
            {
                // t runs -1..1 across the arc; height is a parabola peaking in the middle.
                float t = (i / (count - 1f)) * 2f - 1f;
                float y = hoverHeight + archPeakHeight * (1f - t * t);
                SpawnCoin(x, y, worldZ + i * coinSpacing);
            }
        }

        /// <summary>All three lanes at once — a guaranteed pickup wherever the player is.</summary>
        private void SpawnRow(float worldZ)
        {
            for (int lane = 0; lane < LaneModel.LaneCount; lane++)
                SpawnCoin(LaneModel.LaneX(lane), hoverHeight, worldZ);
        }

        // ------------------------------------------------------------------
        // Internals
        // ------------------------------------------------------------------

        private int PickOpenLane(float trackDistance)
        {
            int start = LaneModel.RandomLane();
            for (int i = 0; i < LaneModel.LaneCount; i++)
            {
                int lane = (start + i) % LaneModel.LaneCount;
                if (!LaneReservations.IsBlocked(trackDistance, lane)) return lane;
            }
            return start;
        }

        private void SpawnCoin(float x, float y, float z)
        {
            CoinType type = PickType();
            CoinPickup prefabToUse = coinPrefab;
            if (type == CoinType.GDGPill && pillPrefabOverride != null)
            {
                prefabToUse = pillPrefabOverride;
            }
            else if (type == CoinType.Fuel && fuelPrefabOverride != null)
            {
                prefabToUse = fuelPrefabOverride;
            }

            var coin = Instantiate(prefabToUse, new Vector3(x, y, z), Quaternion.identity, transform);

            coin.coinType = type;
            coin.coinValue = type == CoinType.GDGPill ? 25 : 1;
            if (type != CoinType.GDGPill || pillPrefabOverride == null)
            {
                coin.ApplyMaterial(MaterialFor(type));
            }

            Track(coin.gameObject);
        }

        private CoinType PickType()
        {
            // The pill is gated on distance, so an early run is pure Google-colour coins
            // and the first pill genuinely reads as a reward for getting somewhere.
            var world = WorldScroller.Instance;
            bool pillUnlocked = world != null && world.Distance >= gdgPillUnlockDistance;

            if (pillUnlocked && Random.value < gdgPillChance) return CoinType.GDGPill;

            if (_colourWeights == null)
                _colourWeights = new float[4];
            _colourWeights[0] = redWeight;
            _colourWeights[1] = blueWeight;
            _colourWeights[2] = yellowWeight;
            _colourWeights[3] = greenWeight;

            switch (PickWeightedIndex(_colourWeights))
            {
                case 0: return CoinType.Red;
                case 1: return CoinType.Blue;
                case 2: return CoinType.Yellow;
                default: return CoinType.Green;
            }
        }

        private Material MaterialFor(CoinType type)
        {
            switch (type)
            {
                case CoinType.Red: return redMaterial;
                case CoinType.Blue: return blueMaterial;
                case CoinType.Yellow: return yellowMaterial;
                case CoinType.Green: return greenMaterial;
                case CoinType.GDGPill: return gdgPillMaterial;
                case CoinType.Fuel: return fuelMaterial != null ? fuelMaterial : greenMaterial;
                default: return redMaterial;
            }
        }
    }
}
