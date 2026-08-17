using UnityEngine;

namespace GDGGo.Gameplay
{
    /// <summary>
    /// A tiny shared registry of "lane X is blocked around track distance D".
    ///
    /// Obstacles and traffic are streamed by independent spawners on different cadences.
    /// Individually each is careful to leave a lane open, but nothing stopped them from
    /// coincidentally blocking the remaining lane at the same Z — an unwinnable wall.
    /// Every blocking spawner reserves its slot here first and skips the spawn if the
    /// reservation would close the last gap.
    ///
    /// Implemented as a fixed ring buffer: it allocates once, never grows, and old
    /// entries age out naturally as the track advances past them.
    /// </summary>
    public static class LaneReservations
    {
        private const int Capacity = 64;

        private static readonly float[] _track = new float[Capacity];
        private static readonly int[] _lane = new int[Capacity];
        private static int _cursor;

        /// <summary>Track-distance window within which two props count as "the same place".</summary>
        public const float BlockingWindowMetres = 9f;

        /// <summary>Forgets every reservation. Call when a run starts.</summary>
        public static void Clear()
        {
            for (int i = 0; i < Capacity; i++)
            {
                _track[i] = float.NegativeInfinity;
                _lane[i] = -1;
            }
            _cursor = 0;
        }

        /// <summary>
        /// True if something already blocks <paramref name="lane"/> near
        /// <paramref name="trackDistance"/>. Non-blocking spawners (coins, power-ups)
        /// use this to avoid burying a pickup inside a traffic car.
        /// </summary>
        public static bool IsBlocked(float trackDistance, int lane)
        {
            for (int i = 0; i < Capacity; i++)
            {
                if (_lane[i] != lane) continue;
                if (Mathf.Abs(_track[i] - trackDistance) <= BlockingWindowMetres) return true;
            }
            return false;
        }

        /// <summary>
        /// Attempts to block <paramref name="lane"/> at <paramref name="trackDistance"/>.
        /// Returns false — and reserves nothing — if doing so would leave the player no
        /// passable lane at that point on the track.
        /// </summary>
        public static bool TryReserve(float trackDistance, int lane)
        {
            int blockedMask = 0;
            for (int i = 0; i < Capacity; i++)
            {
                if (_lane[i] < 0) continue;
                if (Mathf.Abs(_track[i] - trackDistance) > BlockingWindowMetres) continue;
                blockedMask |= 1 << _lane[i];
            }

            int candidateMask = blockedMask | (1 << lane);
            int allLanesMask = (1 << LaneModel.LaneCount) - 1;

            // Refuse the reservation that would close the final gap.
            if ((candidateMask & allLanesMask) == allLanesMask) return false;

            _track[_cursor] = trackDistance;
            _lane[_cursor] = lane;
            _cursor = (_cursor + 1) % Capacity;
            return true;
        }
    }
}
