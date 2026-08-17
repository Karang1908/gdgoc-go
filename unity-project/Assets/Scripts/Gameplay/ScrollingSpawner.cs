using System.Collections.Generic;
using UnityEngine;

namespace GDGGo.Gameplay
{
    /// <summary>
    /// Base class for everything that streams objects past the player: road tiles,
    /// traffic, obstacles, coins, power-ups, scenery.
    ///
    /// Subclasses supply <i>what</i> to spawn and <i>how far apart</i>; this class owns
    /// the streaming contract that every one of them must obey identically:
    ///   1. every live object moves -Z by <see cref="WorldScroller.ScrollDelta"/> each frame,
    ///   2. objects that fall behind the camera are destroyed,
    ///   3. new objects are scheduled in track space so the spawn cadence is a function
    ///      of distance travelled, not of frame count or wall-clock time.
    ///
    /// Rule 1 is the one the original code missed — spawners placed objects at a fixed
    /// world Z and never moved them, so the player (who also never moves along Z) could
    /// never reach anything.
    ///
    /// All positions handled here are <b>world</b> space. Spawned objects are parented to
    /// the spawner purely for Hierarchy tidiness; <c>transform.position</c> is used
    /// throughout so a non-identity parent cannot desync them.
    /// </summary>
    public abstract class ScrollingSpawner : MonoBehaviour
    {
        [Header("Streaming window")]
        [Tooltip("Spawn objects until this far ahead of the player (world units).")]
        public float spawnAheadDistance = 170f;

        [Tooltip("Destroy objects once they fall this far behind the player (world Z).")]
        public float despawnBehindZ = -35f;

        [Tooltip("Track distance (m) before this spawner produces anything. Gives the " +
                 "player a clear run-in so a new player is not killed in the first second.")]
        public float startTrackDistance = 60f;

        /// <summary>Live objects owned by this spawner, in spawn order.</summary>
        protected readonly List<GameObject> Active = new List<GameObject>();

        /// <summary>Track distance at which the next object is due.</summary>
        protected float NextSpawnTrack;

        /// <summary>Guard against a subclass returning a degenerate interval.</summary>
        private const int MaxSpawnsPerFrame = 32;

        protected virtual void Start()
        {
            NextSpawnTrack = startTrackDistance;
        }

        protected virtual void Update()
        {
            var world = WorldScroller.Instance;
            if (world == null) return;

            ScrollAndCull(world.ScrollDelta);

            if (!ReadyToSpawn()) return;

            int guard = 0;
            while (world.TrackToWorldZ(NextSpawnTrack) < spawnAheadDistance && guard++ < MaxSpawnsPerFrame)
            {
                SpawnAt(world.TrackToWorldZ(NextSpawnTrack), world);
                // Never allow a non-positive interval: it would spin this loop forever.
                NextSpawnTrack += Mathf.Max(0.5f, IntervalMeters(world));
            }
        }

        /// <summary>Moves every live object toward the player and culls the ones behind.</summary>
        private void ScrollAndCull(float delta)
        {
            for (int i = Active.Count - 1; i >= 0; i--)
            {
                GameObject go = Active[i];
                if (go == null) { Active.RemoveAt(i); continue; }

                Vector3 p = go.transform.position;
                p.z -= delta;
                go.transform.position = p;

                if (p.z < despawnBehindZ)
                {
                    Recycle(go);
                    Active.RemoveAt(i);
                }
            }
        }

        /// <summary>Registers a freshly created object so it streams and culls with the rest.</summary>
        protected void Track(GameObject go)
        {
            if (go != null) Active.Add(go);
        }

        /// <summary>Destroys everything this spawner owns and rewinds its schedule.</summary>
        public virtual void ClearAll()
        {
            for (int i = 0; i < Active.Count; i++)
                if (Active[i] != null) Destroy(Active[i]);
            Active.Clear();
            NextSpawnTrack = startTrackDistance;
        }

        /// <summary>How an object leaves play. Destroy by default; override to pool.</summary>
        protected virtual void Recycle(GameObject go) => Destroy(go);

        /// <summary>False suppresses spawning without stopping the scroll (e.g. no prefabs assigned).</summary>
        protected virtual bool ReadyToSpawn() => true;

        /// <summary>Create one object (or cluster) at the given world Z.</summary>
        protected abstract void SpawnAt(float worldZ, WorldScroller world);

        /// <summary>Track-space gap until the next spawn. Must be &gt; 0.</summary>
        protected abstract float IntervalMeters(WorldScroller world);

        // ------------------------------------------------------------------
        // Shared helper: weighted random pick.
        // Every spawner needs this and they were each writing their own copy,
        // one of which divided by a zero total when all weights were left at 0.
        // ------------------------------------------------------------------
        protected static int PickWeightedIndex(float[] weights)
        {
            if (weights == null || weights.Length == 0) return -1;
            float total = 0f;
            for (int i = 0; i < weights.Length; i++)
                if (weights[i] > 0f) total += weights[i];

            if (total <= 0f) return Random.Range(0, weights.Length); // all unset: uniform

            float r = Random.value * total;
            float cumulative = 0f;
            for (int i = 0; i < weights.Length; i++)
            {
                if (weights[i] <= 0f) continue;
                cumulative += weights[i];
                if (r < cumulative) return i;
            }
            return weights.Length - 1;
        }
    }
}
