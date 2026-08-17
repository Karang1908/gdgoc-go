using UnityEngine;

namespace GDGGo.Gameplay
{
    /// <summary>
    /// The 3-lane road coordinate system, as static data.
    ///
    /// Static on purpose: every spawner (Traffic, Obstacles, Coins, Pedestrians) and the
    /// player must agree on what "lane 0" means in world space. When each of them held
    /// its own instance, a single mismatched laneWidth would silently desync the whole
    /// game. There is exactly one road, so there is exactly one lane model.
    /// </summary>
    public static class LaneModel
    {
        public const int LaneCount = 3;
        public const int CentreLane = LaneCount / 2;   // = 1

        /// <summary>
        /// Distance between adjacent lane centres, in world units.
        /// Tuned against the Quaternius <c>Street_Straight.fbx</c> road surface at the
        /// scale <c>RoadScroller.tileScale</c> applies. Cars are ~2 units wide at 0.6
        /// scale, so 3.0 leaves a comfortable gap without making lane changes feel slow.
        /// </summary>
        public const float LaneWidth = 3.0f;

        /// <summary>World-space X of a lane centre. 0 = left, 2 = right.</summary>
        public static float LaneX(int lane) => (Clamp(lane) - CentreLane) * LaneWidth;

        public static int Clamp(int lane) => Mathf.Clamp(lane, 0, LaneCount - 1);

        /// <summary>A uniformly random lane index.</summary>
        public static int RandomLane() => Random.Range(0, LaneCount);

        /// <summary>
        /// Fills <paramref name="buffer"/> with the lane indices 0..2 in random order.
        /// Used by spawners that must leave at least one lane passable: shuffle, then
        /// block only the first N. Caller supplies the buffer so this allocates nothing
        /// on the hot path.
        /// </summary>
        public static void ShuffledLanes(int[] buffer)
        {
            if (buffer == null || buffer.Length < LaneCount) return;
            for (int i = 0; i < LaneCount; i++) buffer[i] = i;
            for (int i = 0; i < LaneCount; i++)
            {
                int j = Random.Range(i, LaneCount);
                (buffer[i], buffer[j]) = (buffer[j], buffer[i]);
            }
        }
    }
}
