using UnityEngine;

namespace GDGGo.PowerUps
{
    /// <summary>
    /// Ambient Y-axis spin. Used on the PowerUp prefab so it visually rotates like a coin,
    /// signalling "pick me up". Lives in Scripts/ (not Editor/) so it ships in the build.
    /// </summary>
    public sealed class RotateSlow : MonoBehaviour
    {
        public float degPerSec = 45f;
        private void Update() => transform.Rotate(0f, degPerSec * Time.deltaTime, 0f, Space.World);
    }
}
