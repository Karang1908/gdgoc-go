using UnityEngine;

namespace GDGGo.Supabase
{
    /// <summary>
    /// Runtime configuration for Supabase (_address and anon public key_).
    /// This is a ScriptableObject so its values are **baked into the build**, readable
    /// on every Unity platform (incl. WebGL) with no file IO at runtime.
    ///
    /// Setup (one-time, in Editor):
    ///   1. Right-click in the Project window →  Create → GDG Go → Supabase Config
    ///   2. Name it "SupabaseConfig.asset" and place it under Assets/Resources/
    ///   3. Paste your Supabase project URL and anon *public* key into the Inspector fields
    ///   4. The script auto-loads via Resources.Load("SupabaseConfig") at runtime
    ///
    /// The anon key is safe to ship in the build (it is the public client key, same as
    /// a Firebase web config). Row-Level-Security on the Postgres side is what actually
    /// authorizes each request. See ../docs/PROJECT.md for the SQL + RLS rules.
    ///
    /// A parallel JSON template sits at Assets/StreamingAssets/supabase-config.json
    /// purely as documentation of the schema — runtime reads only this ScriptableObject.
    /// </summary>
    [CreateAssetMenu(fileName = "SupabaseConfig", menuName = "GDG Go/Supabase Config", order = 0)]
    public sealed class SupabaseConfig : ScriptableObject
    {
        [Tooltip("Bare Supabase project URL, e.g. https://abcd1234.supabase.co — do NOT include /rest/v1/ or a trailing slash.")]
        public string url;

        [Tooltip("Supabase anon public key (Project Settings -> API -> anon public). Safe to ship in builds; RLS enforces authorization.")]
        public string anonKey;

        /// <summary>
        /// Loads the runtime config singleton. Looks for a ScriptableObject asset at
        /// `Resources/SupabaseConfig`. If not found, returns a runtime-only fallback
        /// with empty strings and logs an error to the Console.
        /// </summary>
        public static SupabaseConfig Load()
        {
            var cfg = Resources.Load<SupabaseConfig>("SupabaseConfig");
            if (cfg == null)
            {
                Debug.LogError("[Supabase] Resources/SupabaseConfig.asset not found. " +
                               "Create it via Create > GDG Go > Supabase Config and place it under Assets/Resources/.");
                cfg = ScriptableObject.CreateInstance<SupabaseConfig>();
                cfg.url = string.Empty;
                cfg.anonKey = string.Empty;
            }
            return cfg;
        }

        /// <summary>
        /// The bare project root (scheme + host only), with any trailing path or slash
        /// removed. Callers append API paths onto this. If <see cref="url"/> was filled
        /// with the REST endpoint rather than the project URL (a common paste mistake),
        /// this still yields a working base instead of a malformed URL that 404s.
        /// </summary>
        public string BaseUrl
        {
            get
            {
                if (string.IsNullOrWhiteSpace(url)) return string.Empty;
                int scheme = url.IndexOf("://", System.StringComparison.OrdinalIgnoreCase);
                if (scheme < 0) return string.Empty;
                int hostStart = scheme + 3;
                int slash = url.IndexOf('/', hostStart);
                return slash < 0 ? url.TrimEnd('/') : url.Substring(0, slash);
            }
        }

        /// <summary>True when a usable base URL and anon key are both present.</summary>
        public bool IsValid => !string.IsNullOrEmpty(BaseUrl) && !string.IsNullOrEmpty(anonKey);
    }
}
