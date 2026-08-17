using UnityEngine;

namespace GDGGo.Supabase
{
    /// <summary>
    /// Holds the active Supabase session (JWT + user identity) for the lifetime of the
    /// runtime. Mounts on a <see cref="GameObject"/> marked <c>DontDestroyOnLoad</c> so it
    /// survives scene transitions. Login/Signup writes to it; logout clears it. The HUD,
    /// GameOver screen and Leaderboard API read from it.
    /// </summary>
    public sealed class SupabaseSession : MonoBehaviour
    {
        public static SupabaseSession Instance { get; private set; }

        /// <summary>Currently signed-in session. Null when logged out.</summary>
        public SessionResponse Current { get; private set; }

        /// <summary>Cached display name from the `users` table (set after signup or fetch-on-login).</summary>
        public string DisplayName { get; private set; }

        /// <summary>Cached username (set after signup or fetched on login).</summary>
        public string Username { get; private set; }

        /// <summary>The auth.user.id UUID of the signed-in player, or null.</summary>
        public string Uid => Current?.user?.id;

        /// <summary>True iff we have a non-null session with an access token.</summary>
        public bool IsSignedIn => Current != null && !string.IsNullOrEmpty(Current.access_token);

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }

        /// <summary>
        /// Persists a freshly-obtained session. Called by <see cref="AuthAPI"/> after
        /// signup or signin succeed.
        /// </summary>
        public void SaveSession(SessionResponse session, string username, string displayName)
        {
            Current = session;
            Username = username;
            DisplayName = displayName;
            Debug.Log("[Supabase] Session saved: " + username + " (" + (Uid ?? "no-uid") + ")");
        }

        /// <summary>Clears the in-memory session. Does NOT call the Supabase logout endpoint
        /// (the caller's responsibility so it can be fire-and-forget during a network failure).</summary>
        public void Clear()
        {
            Current = null;
            Username = null;
            DisplayName = null;
            Debug.Log("[Supabase] Session cleared.");
        }
    }
}
