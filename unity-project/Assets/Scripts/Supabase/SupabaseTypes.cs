using System;

namespace GDGGo.Supabase
{
    // ============================================================
    // Request bodies
    // ============================================================

    /// <summary>Supabase Auth email/password signup body.</summary>
    [Serializable]
    public sealed class SignUpBody
    {
        // JsonUtility uses C# field names as JSON keys verbatim — keep snake_case.
        public string email;
        public string password;
    }

    /// <summary>Supabase Auth password-grant signin body (same shape as signup).</summary>
    [Serializable]
    public sealed class SignInBody
    {
        public string email;
        public string password;
    }

    // ============================================================
    // Auth responses
    // ============================================================

    /// <summary>
    /// Subset of Supabase Auth's session response. JsonUtility silently ignores unknown
    /// fields, so we declare only what we actually use.
    /// </summary>
    [Serializable]
    public sealed class SessionResponse
    {
        public string access_token;
        public string refresh_token;
        public string token_type;
        public int expires_in;
        public long expires_at;
        public SupabaseUser user;
    }

    /// <summary>Subset of the nested user object.</summary>
    [Serializable]
    public sealed class SupabaseUser
    {
        public string id;        // UUID — used as FK into the `users` table
        public string email;
        public string role;
        public string aud;
    }

    // ============================================================
    // App-layer tables
    // ============================================================

    /// <summary>Row in the `users` table. `id` is FK to auth.users.id.</summary>
    [Serializable]
    public sealed class UserRow
    {
        public string id;
        public string username;
        public string display_name;
        public string created_at;
    }

    /// <summary>Row in the `scores` table — each game becomes one row.</summary>
    [Serializable]
    public sealed class ScoreRow
    {
        public string id;            // server-generated uuid
        public string user_id;       // FK to auth.users.id
        public string username;
        public string display_name;
        public int score;
        public int coins;
        public int distance;
        public int duration_seconds;
        public string created_at;
    }

    /// <summary>
    /// JsonUtility cannot deserialize a bare JSON array at the root, so the
    /// <c>ScoreAPI</c> wraps the Supabase leaderboard response in this class before
    /// calling <c>JsonUtility.FromJson<ScoreRows>()</c>.
    /// </summary>
    [Serializable]
    public sealed class ScoreRows
    {
        public ScoreRow[] items;
    }
}
