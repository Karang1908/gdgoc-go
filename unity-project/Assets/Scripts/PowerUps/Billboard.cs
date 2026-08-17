using UnityEngine;

namespace GDGGo.PowerUps
{
    /// <summary>
    /// Camera-facing billboard. Each frame, rotates the GameObject so its +Z face
    /// points at the active camera. Used by power-up glow halos so the radial
    /// sprite always presents a full circle to the player no matter the viewing
    /// angle — exactly how Subway Surfers power-up glows behave.
    ///
    /// The billboard is a sibling of the spinning mesh (parented to the pickup
    /// root, not to the rotating "Mesh" child), so it tracks the camera while
    /// the silhouette keeps its own Y-spin — two independent motions, the way
    /// the real games compose them.
    ///
    /// A cached <see cref="Camera.main"/> reference is refreshed lazily so a
    /// scene that swaps cameras (Boot -> Game) still works without an editor
    /// reload. <c>lateUpdate</c> means the camera has already moved this frame
    /// before the billboard aligns to it, eliminating one-frame lag.
    /// </summary>
    public sealed class Billboard : MonoBehaviour
    {
        [Tooltip("If true, lock the X rotation so the billboard stays upright and only yaws to face the camera. " +
                 "Default false = full 3-axis billboard (true Subway-Surfers style).")]
        public bool lockYAxis = false;

        private Camera _camera;

        private void LateUpdate()
        {
            if (_camera == null || !_camera.gameObject.activeInHierarchy) _camera = Camera.main;
            if (_camera == null) return;

            Vector3 forward = _camera.transform.position - transform.position;
            if (forward.sqrMagnitude < 1e-6f) return;

            if (lockYAxis)
            {
                forward.y = 0f;
                if (forward.sqrMagnitude < 1e-6f) return;
                Quaternion look = Quaternion.LookRotation(forward.normalized, Vector3.up);
                // LookRotation aims +Z at the target; the quad is authored facing +Z,
                // so no extra 90 deg tweak is needed.
                transform.rotation = look;
            }
            else
            {
                // LookRotation aims +Z at the position difference. A quad whose
                // vertices sit in the XY plane faces +Z by convention, so this is
                // exactly the right orientation.
                transform.rotation = Quaternion.LookRotation(forward, Vector3.up);
            }
        }
    }
}
