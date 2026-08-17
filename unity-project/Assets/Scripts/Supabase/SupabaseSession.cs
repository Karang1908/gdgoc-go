using UnityEngine;

namespace GDGGo.Supabase
{
    /// <summary>
    /// Holds the active Supabase session (JWT + user identity) and vehicle configuration
    /// passed from the hosting website wrapper via iframe query parameters or in-engine auth.
    /// </summary>
    public sealed class SupabaseSession : MonoBehaviour
    {
        public static SupabaseSession Instance { get; private set; }

        /// <summary>JWT access token passed from the host React website or received from signin.</summary>
        public string Jwt { get; private set; }

        /// <summary>Cached display name from the users table or URL query.</summary>
        public string DisplayName { get; private set; }

        /// <summary>Cached username from signup/signin or URL query.</summary>
        public string Username { get; private set; }

        /// <summary>Selected car body ID (e.g. 'SportsCar', 'SUV', 'Taxi') passed from the website.</summary>
        public string CarId { get; private set; }

        /// <summary>True iff we have a non-empty access token.</summary>
        public bool IsSignedIn => !string.IsNullOrEmpty(Jwt);

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            InitFromUrlQuery();
        }

        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        /// <summary>
        /// Reads ?token=&amp;u=&amp;dn=&amp;car= from <see cref="Application.absoluteURL"/> in WebGL builds.
        /// </summary>
        public void InitFromUrlQuery()
        {
            string url = Application.absoluteURL;
            if (string.IsNullOrEmpty(url)) return;

            try
            {
                int queryIdx = url.IndexOf('?');
                if (queryIdx >= 0 && queryIdx < url.Length - 1)
                {
                    string query = url.Substring(queryIdx + 1);
                    string[] pairs = query.Split('&');
                    foreach (string pair in pairs)
                    {
                        string[] kv = pair.Split('=');
                        if (kv.Length == 2)
                        {
                            string key = System.Uri.UnescapeDataString(kv[0]);
                            string val = System.Uri.UnescapeDataString(kv[1]);
                            if (key == "token") Jwt = val;
                            else if (key == "u") Username = val;
                            else if (key == "dn") DisplayName = val;
                            else if (key == "car") CarId = val;
                        }
                    }
                    Debug.Log($"[SupabaseSession] Parsed URL query: user={Username}, car={CarId}, hasToken={!string.IsNullOrEmpty(Jwt)}");
                }
            }
            catch (System.Exception ex)
            {
                Debug.LogWarning("[SupabaseSession] Failed to parse URL query: " + ex.Message);
            }
        }

        /// <summary>Clears the in-memory session.</summary>
        public void Clear()
        {
            Jwt = null;
            Username = null;
            DisplayName = null;
            CarId = null;
            Debug.Log("[Supabase] Session cleared.");
        }
    }
}
