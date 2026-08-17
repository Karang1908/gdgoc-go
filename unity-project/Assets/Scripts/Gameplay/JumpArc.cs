using System.Collections;
using UnityEngine;

namespace GDGGo.Gameplay
{
    /// <summary>
    /// Utility coroutine that drives a Transform along a parabolic jump arc.
    /// Used by the player car when triggered off a <c>Street_Elevated_Ramp</c> /
    /// <c>Street_Bridge_Ramp</c> tile.
    /// </summary>
    public static class JumpArc
    {
        public static IEnumerator Perform(Transform t, float height, float duration)
        {
            // TODO[assets]: tune height/duration against Street_Elevated_Ramp.fbx;
            // the ramp visually implies an arc — match it but tune gameplay feel first.
            float elapsed = 0f;
            Vector3 start = t.position;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float p = Mathf.Clamp01(elapsed / duration);
                float y = 4f * height * p * (1f - p);  // symmetric parabola: y=0 at p=0 and p=1, peaks at height
                Vector3 p3 = t.position;
                p3.y = start.y + y;
                t.position = p3;
                yield return null;
            }
            var end = t.position;
            end.y = start.y;
            t.position = end;
        }
    }
}
