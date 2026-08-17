using UnityEngine;

namespace GDGGo.Obstacles
{
    /// <summary>
    /// Marks a prop as something the player crashes into, and says whether a jump clears it.
    ///
    /// This is what makes the jump a real mechanic rather than decoration: low props
    /// (cones, debris, barriers) can be hopped, while tall ones (traffic, stop signs,
    /// traffic lights) must be dodged by changing lane. Without the distinction the
    /// player would either jump over everything or nothing.
    /// </summary>
    public sealed class Obstacle : MonoBehaviour
    {
        [Tooltip("Low enough that an airborne car passes over it.")]
        public bool clearableByJump = true;

        [Tooltip("How many of the 3 lanes this prop is allowed to occupy at once. " +
                 "Spawners never fill every lane, so a run is always survivable.")]
        [Range(1, 2)] public int laneFootprint = 1;
    }
}
