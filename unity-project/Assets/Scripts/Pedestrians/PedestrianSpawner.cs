using UnityEngine;
using GDGGo.Gameplay;

namespace GDGGo.Pedestrians
{
    /// <summary>
    /// Streams pedestrians onto the pavements.
    ///
    /// They walk parallel to the road rather than across it: a pedestrian stepping into
    /// the lanes would be an unavoidable hazard the player cannot read in time, which is
    /// exactly the kind of unfair death that kills a leaderboard game. They are set
    /// dressing with a small penalty attached if you mount the kerb.
    ///
    /// Meshes are the Quaternius Animated Men/Women packs driven by Mixamo clips. Those
    /// packs ship untextured, so their prefabs need flat materials assigned — see
    /// <c>PrefabsBuilder</c>.
    /// </summary>
    public sealed class PedestrianSpawner : ScrollingSpawner
    {
        [System.Serializable]
        public struct PedestrianEntry
        {
            [Tooltip("Prefab with a PedestrianNPC and an Animator driving a walk clip.")]
            public GameObject prefab;
            public float weight;
        }

        [Header("Prefabs")]
        public PedestrianEntry[] pedestrians;

        [Header("Placement")]
        [Tooltip("Distance from road centre to the pavement.")]
        public float pavementOffset = 6.0f;
        public float pavementJitter = 1.2f;

        [Tooltip("World Y of the pavement surface. Pedestrians walk on the raised kerb, " +
                 "not on the road, so this must match the road tile's pavement height.")]
        public float pavementY = 0.18f;

        [Header("Density")]
        public float intervalMeters = 26f;

        [Tooltip("Emit a pedestrian on BOTH pavements at every scheduled slot, rather " +
                 "than one side per slot. Doubles foot traffic for the same call rate.")]
        public bool spawnBothSides = true;

        private float[] _weights;

        protected override bool ReadyToSpawn() => pedestrians != null && pedestrians.Length > 0;

        protected override void SpawnAt(float worldZ, WorldScroller world)
        {
            EnsureWeights();

            if (spawnBothSides)
            {
                SpawnOne(worldZ, side: -1);
                SpawnOne(worldZ, side: +1);
            }
            else
            {
                int side = Random.value < 0.5f ? -1 : 1;
                SpawnOne(worldZ, side);
            }
        }

        private void SpawnOne(float worldZ, int side)
        {
            int index = PickWeightedIndex(_weights);
            if (index < 0) return;

            GameObject prefab = pedestrians[index].prefab;
            if (prefab == null) return;

            float x = side * (pavementOffset + Random.Range(0f, pavementJitter));

            // Face along the pavement, half of them walking each way.
            bool facingForward = Random.value < 0.5f;
            var rotation = Quaternion.Euler(0f, facingForward ? 0f : 180f, 0f);

            var go = Instantiate(prefab, new Vector3(x, pavementY, worldZ), rotation, transform);

            // Seat on the pavement by measured bounds — the character prefabs do not all
            // share a pivot convention, so placing by transform alone leaves some
            // hovering and others ankle-deep.
            var renderers = go.GetComponentsInChildren<Renderer>(true);
            if (renderers.Length > 0)
            {
                Bounds b = renderers[0].bounds;
                for (int i = 1; i < renderers.Length; i++) b.Encapsulate(renderers[i].bounds);
                Vector3 p = go.transform.position;
                p.y += pavementY - b.min.y;
                go.transform.position = p;
            }

            var npc = (PedestrianNPC)go.GetComponent(typeof(PedestrianNPC));
            if (npc == null) npc = (PedestrianNPC)go.AddComponent(typeof(PedestrianNPC));
            npc.SetWalking(facingForward ? 1f : -1f);

            Track(go);
        }

        private void EnsureWeights()
        {
            if (_weights != null && _weights.Length == pedestrians.Length) return;
            _weights = new float[pedestrians.Length];
            for (int i = 0; i < pedestrians.Length; i++) _weights[i] = pedestrians[i].weight;
        }

        protected override float IntervalMeters(WorldScroller world)
            => intervalMeters * Random.Range(0.6f, 1.6f);
    }
}
