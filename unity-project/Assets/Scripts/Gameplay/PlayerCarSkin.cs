using UnityEngine;

namespace GDGGo.Gameplay
{
    /// <summary>
    /// Applies the car chosen on the Car Select screen.
    ///
    /// The player prefab carries every selectable body as a disabled child; this enables
    /// exactly one at spawn and points <see cref="PlayerCar.meshRoot"/> at it so the
    /// banking animation drives the right mesh.
    ///
    /// This closes a loop that was previously open: CarSelectScreen wrote its choice to
    /// PlayerPrefs and nothing ever read it, so every car in the picker produced the
    /// same car in game.
    ///
    /// Swapping bodies rather than whole prefabs keeps one collider, one Rigidbody and
    /// one set of gameplay components, so a new car can never change the hitbox — which
    /// on a leaderboard would be a balance problem, not just a cosmetic one.
    /// </summary>
    [RequireComponent(typeof(PlayerCar))]
    public sealed class PlayerCarSkin : MonoBehaviour
    {
        [System.Serializable]
        public struct Skin
        {
            [Tooltip("Must match the id used by CarSelectScreen.")]
            public string id;
            [Tooltip("Mesh root for this body. All are disabled except the selected one.")]
            public GameObject meshRoot;
        }

        [Tooltip("Selectable bodies. The first entry is the fallback.")]
        public Skin[] skins;

        private void Awake()
        {
            if (skins == null || skins.Length == 0) return;

            string selected = PlayerPrefs.GetString(UI.CarSelectScreen.PlayerPrefsKey, skins[0].id);

            int chosen = 0;
            for (int i = 0; i < skins.Length; i++)
            {
                if (skins[i].id == selected) { chosen = i; break; }
            }

            for (int i = 0; i < skins.Length; i++)
            {
                if (skins[i].meshRoot == null) continue;
                skins[i].meshRoot.SetActive(i == chosen);
            }

            var car = GetComponent<PlayerCar>();
            if (car != null && skins[chosen].meshRoot != null)
                car.meshRoot = skins[chosen].meshRoot.transform;

            // Only the visible body should flash during post-crash immunity.
            var collision = GetComponent<PlayerCollision>();
            if (collision != null && skins[chosen].meshRoot != null)
                collision.flashRenderers = skins[chosen].meshRoot.GetComponentsInChildren<Renderer>(true);
        }
    }
}
