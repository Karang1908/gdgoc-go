using UnityEngine;

namespace GDGGo.Gameplay
{
    /// <summary>
    /// Applies the car chosen on the Car Select screen.
    ///
    /// The player prefab carries every selectable body as a disabled child; this enables
    /// exactly one at spawn and points <see cref="PlayerCar.meshRoot"/> at it so the
    /// banking animation drives the right mesh.
    /// </summary>
    [RequireComponent(typeof(PlayerCar))]
    public sealed class PlayerCarSkin : MonoBehaviour
    {
        [System.Serializable]
        public struct Skin
        {
            [Tooltip("Must match the id used by CarSelectScreen / web host.")]
            public string id;
            [Tooltip("Mesh root for this body. All are disabled except the selected one.")]
            public GameObject meshRoot;
        }

        public const string PlayerPrefsKey = "SelectedCarId";

        [Tooltip("Selectable bodies. The first entry is the fallback.")]
        public Skin[] skins;

        private void Awake()
        {
            if (skins == null || skins.Length == 0) return;

            string fromUrl = Supabase.SupabaseSession.Instance?.CarId;
            string selected = !string.IsNullOrEmpty(fromUrl)
                ? fromUrl
                : PlayerPrefs.GetString(PlayerPrefsKey, skins[0].id);

            int chosen = 0;
            for (int i = 0; i < skins.Length; i++)
            {
                if (IsSkinMatch(skins[i].id, selected))
                {
                    chosen = i;
                    break;
                }
            }

            Debug.Log($"[PlayerCarSkin] Selected car ID '{selected}' mapped to skin index {chosen} ('{skins[chosen].id}')");

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

        private static bool IsSkinMatch(string skinId, string requestedId)
        {
            if (string.IsNullOrEmpty(skinId) || string.IsNullOrEmpty(requestedId)) return false;
            string s = skinId.Trim().ToLowerInvariant();
            string r = requestedId.Trim().ToLowerInvariant();
            if (s == r) return true;
            if (s == "sports" && (r == "sportscar" || r == "sports" || r == "velocity")) return true;
            if (s == "race" && (r == "racer" || r == "race" || r == "apex")) return true;
            if (s == "suv" && (r == "suv" || r == "suv-luxury" || r == "titan")) return true;
            if (s == "taxi" && (r == "taxi" || r == "cab" || r == "metro")) return true;
            return false;
        }
    }
}
