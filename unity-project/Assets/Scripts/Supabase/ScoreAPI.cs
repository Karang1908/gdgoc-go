using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace GDGGo.Supabase
{
    /// <summary>
    /// Async REST wrappers around the Supabase `scores` table. All methods are coroutines
    /// invoking the supplied <c>Action</c> when complete.
    ///
    /// Endpoints (all under <c>{cfg.BaseUrl}</c>):
    ///   POST /rest/v1/scores   -> insert a new score row   (requires Authorization: Bearer uid-JWT)
    ///   GET  /rest/v1/scores?order=score.desc&limit=10  -> leaderboard Top-10 (public)
    ///   GET  /rest/v1/scores?user_id=eq.<uid>&order=score.desc&limit=1  -> user's best
    ///
    /// See PROJECT.md §6 for the SQL schema + RLS rules that back this.
    /// </summary>
    public static class ScoreAPI
    {
        private const string JsonContentType = "application/json";

        /// <summary>
        /// Submit a finished game's score on behalf of the current signed-in player.
        /// Requires <see cref="SupabaseSession.IsSignedIn"/> to be true.
        /// </summary>
        public static IEnumerator InsertScore(
            int score,
            int coins,
            int distance,
            int durationSeconds,
            System.Action<bool, string> onComplete)
        {
            var s = SupabaseSession.Instance;
            if (!s.IsSignedIn)
            {
                onComplete?.Invoke(false, "Not signed in.");
                yield break;
            }

            var cfg = SupabaseConfig.Load();
            if (!cfg.IsValid)
            {
                onComplete?.Invoke(false, "Supabase config missing.");
                yield break;
            }

            // Omit server-generated columns (id, created_at) so Postgres applies their defaults.
            var row = new ScoreRowInsert
            {
                user_id = s.Uid,
                username = s.Username,
                display_name = s.DisplayName,
                score = score,
                coins = coins,
                distance = distance,
                duration_seconds = durationSeconds
            };
            string body = JsonUtility.ToJson(row);

            using (var req = new UnityWebRequest(cfg.BaseUrl + "/rest/v1/scores", UnityWebRequest.kHttpVerbPOST))
            {
                byte[] bytes = Encoding.UTF8.GetBytes(body);
                req.uploadHandler = new UploadHandlerRaw(bytes);
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("apikey", cfg.anonKey);
                req.SetRequestHeader("Authorization", "Bearer " + s.Current.access_token);
                req.SetRequestHeader("Content-Type", JsonContentType);
                req.SetRequestHeader("Prefer", "return=minimal");
                yield return req.SendWebRequest();

                if (req.result != UnityWebRequest.Result.Success)
                    onComplete?.Invoke(false, PrettyError(req));
                else
                    onComplete?.Invoke(true, null);
            }
        }

        /// <summary>
        /// Fetch the Top-N leaderboard rows (descending by score). Public read — no auth
        /// token needed (the RLS "public read scores" policy covers anons).
        /// </summary>
        public static IEnumerator FetchLeaderboard(
            int limit,
            System.Action<bool, ScoreRow[]> onComplete)
        {
            var cfg = SupabaseConfig.Load();
            if (!cfg.IsValid)
            {
                onComplete?.Invoke(false, null);
                yield break;
            }

            // created_at breaks score ties in favour of whoever got there first, which
            // also keeps the ordering stable between refreshes.
            string url = cfg.BaseUrl + "/rest/v1/scores?order=score.desc,created_at.asc&limit=" + limit;
            using (var req = UnityWebRequest.Get(url))
            {
                req.SetRequestHeader("apikey", cfg.anonKey);
                // Optional: send the bearer if signed-in — never required for public reads.
                var s = SupabaseSession.Instance;
                if (s != null && s.IsSignedIn)
                    req.SetRequestHeader("Authorization", "Bearer " + s.Current.access_token);
                yield return req.SendWebRequest();

                if (req.result != UnityWebRequest.Result.Success)
                {
                    onComplete?.Invoke(false, null);
                    yield break;
                }

                onComplete?.Invoke(true, ParseArray(req.downloadHandler.text));
            }
        }

        /// <summary>
        /// Fetch the player's own best score row (the single highest-scoring row for
        /// their uid). Returns null if they have no scores yet.
        /// </summary>
        public static IEnumerator FetchUserBest(System.Action<bool, ScoreRow> onComplete)
        {
            var s = SupabaseSession.Instance;
            if (!s.IsSignedIn)
            {
                onComplete?.Invoke(false, null);
                yield break;
            }

            var cfg = SupabaseConfig.Load();
            if (!cfg.IsValid)
            {
                onComplete?.Invoke(false, null);
                yield break;
            }

            string url = cfg.BaseUrl + "/rest/v1/scores?user_id=eq." + UnityWebRequest.EscapeURL(s.Uid) +
                         "&order=score.desc&limit=1";
            using (var req = UnityWebRequest.Get(url))
            {
                req.SetRequestHeader("apikey", cfg.anonKey);
                req.SetRequestHeader("Authorization", "Bearer " + s.Current.access_token);
                yield return req.SendWebRequest();

                if (req.result != UnityWebRequest.Result.Success)
                {
                    onComplete?.Invoke(false, null);
                    yield break;
                }

                var arr = ParseArray(req.downloadHandler.text);
                onComplete?.Invoke(true, arr != null && arr.Length > 0 ? arr[0] : null);
            }
        }

        // ============================================================
        // Internals
        // ============================================================

        /// <summary>
        /// Wraps a bare <c>[{},{}]</c> response string in <c>{"items":[ ... ]}</c> so
        /// <see cref="JsonUtility"/> can deserialize it into <see cref="ScoreRows"/>.
        /// </summary>
        private static ScoreRow[] ParseArray(string bareArrayJson)
        {
            if (string.IsNullOrEmpty(bareArrayJson) || bareArrayJson.Trim() == "[]")
                return System.Array.Empty<ScoreRow>();

            string wrapped = "{\"items\":" + bareArrayJson + "}";
            try
            {
                return JsonUtility.FromJson<ScoreRows>(wrapped).items
                       ?? System.Array.Empty<ScoreRow>();
            }
            catch (System.Exception ex)
            {
                Debug.LogError("[Supabase] Failed to parse scores array: " + ex.Message);
                return System.Array.Empty<ScoreRow>();
            }
        }

        private static string PrettyError(UnityWebRequest req)
            => !string.IsNullOrEmpty(req.downloadHandler?.text)
               ? req.downloadHandler.text : req.error;

        /// <summary>Insert-only DTO for the `scores` table. Server generates id + created_at.</summary>
        [System.Serializable]
        private sealed class ScoreRowInsert
        {
            public string user_id;
            public string username;
            public string display_name;
            public int score;
            public int coins;
            public int distance;
            // Sent so the database can sanity-check the run against the clock. See the
            // plausibility trigger in supabase/migrations/0002_score_integrity.sql.
            public int duration_seconds;
        }
    }
}
