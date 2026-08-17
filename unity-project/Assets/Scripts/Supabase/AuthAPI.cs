using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace GDGGo.Supabase
{
    /// <summary>
    /// Async REST wrappers around Supabase Auth. All methods are coroutines that yield a
    /// <c>UnityWebRequest</c> and invoke the supplied <c>Action<bool, string></c> when
    /// done: <c>(true, displayName)</c> on success, <c>(false, errorMessage)</c> on failure.
    ///
    /// Username is mapped to a synthetic email (<c><username>@gdg-go.local</c>) so
    /// Supabase's built-in email/password provider works without collecting real emails
    /// from event attendees — see PROJECT.md §6.
    /// </summary>
    public static class AuthAPI
    {
        private const string SyntheticDomain = "gdg-go.local";
        private const string JsonContentType = "application/json";

        /// <summary>
        /// Creates a new Supabase Auth user and inserts the matching profile row in
        /// <c>users</c>. The full flow:
        ///   1. POST /auth/v1/signup  -> receives session + user.uid
        ///   2. POST /rest/v1/users    -> writes `{ id, username, display_name }`
        /// If step 2 fails (e.g. duplicate username 409), the created auth user is
        /// left orphaned — for an event game we accept that and surface the error
        /// to the player to retry with a different username.
        /// </summary>
        public static IEnumerator SignUp(
            string username,
            string password,
            string displayName,
            System.Action<bool, string> onComplete)
        {
            if (string.IsNullOrWhiteSpace(username) ||
                string.IsNullOrWhiteSpace(password) ||
                string.IsNullOrWhiteSpace(displayName))
            {
                onComplete?.Invoke(false, "All fields are required.");
                yield break;
            }

            var cfg = SupabaseConfig.Load();
            if (!cfg.IsValid)
            {
                onComplete?.Invoke(false, "Supabase config missing. Add Resources/SupabaseConfig.asset.");
                yield break;
            }

            string email = BuildEmail(username);
            var body = new SignUpBody { email = email, password = password };
            string json = JsonUtility.ToJson(body);

            using (var req = new UnityWebRequest(cfg.BaseUrl + "/auth/v1/signup", UnityWebRequest.kHttpVerbPOST))
            {
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                req.uploadHandler = new UploadHandlerRaw(bytes);
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("apikey", cfg.anonKey);
                req.SetRequestHeader("Content-Type", JsonContentType);
                yield return req.SendWebRequest();

                if (req.result != UnityWebRequest.Result.Success)
                {
                    onComplete?.Invoke(false, PrettyError(req));
                    yield break;
                }

                SessionResponse session;
                try
                {
                    session = JsonUtility.FromJson<SessionResponse>(req.downloadHandler.text);
                }
                catch (System.Exception ex)
                {
                    onComplete?.Invoke(false, "Bad session payload: " + ex.Message);
                    yield break;
                }

                // Save session before making the second call so we have the JWT in hand.
                SupabaseSession.Instance.SaveSession(session, username, displayName);

                // Now write the profile row to `users`. If this fails we still have
                // a valid auth session, but the signup is effectively partial — push
                // the error back to the caller so the UI can show it. The session
                // has been saved; the auth user is orphaned but rows-in-the-db can be
                // cleaned up later manually if needed.
                yield return InsertProfile(cfg, session.access_token, session.user.id,
                    username, displayName,
                    (ok, err) =>
                    {
                        if (!ok)
                        {
                            SupabaseSession.Instance.Clear();
                            onComplete?.Invoke(false, "Account created but profile save failed: " + err);
                        }
                        else
                        {
                            onComplete?.Invoke(true, displayName);
                        }
                    });
            }
        }

        /// <summary>
        /// Sign-in an existing player by username + password. Returns the stored display
        /// name on success; we also fetch the profile row to populate display name.
        /// </summary>
        public static IEnumerator SignIn(
            string username,
            string password,
            System.Action<bool, string> onComplete)
        {
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                onComplete?.Invoke(false, "Username and password are required.");
                yield break;
            }

            var cfg = SupabaseConfig.Load();
            if (!cfg.IsValid)
            {
                onComplete?.Invoke(false, "Supabase config missing. Add Resources/SupabaseConfig.asset.");
                yield break;
            }

            string email = BuildEmail(username);
            var body = new SignInBody { email = email, password = password };
            string json = JsonUtility.ToJson(body);

            using (var req = new UnityWebRequest(cfg.BaseUrl + "/auth/v1/token?grant_type=password", UnityWebRequest.kHttpVerbPOST))
            {
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                req.uploadHandler = new UploadHandlerRaw(bytes);
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("apikey", cfg.anonKey);
                req.SetRequestHeader("Content-Type", JsonContentType);
                yield return req.SendWebRequest();

                if (req.result != UnityWebRequest.Result.Success)
                {
                    onComplete?.Invoke(false, PrettyError(req));
                    yield break;
                }

                SessionResponse session;
                try
                {
                    session = JsonUtility.FromJson<SessionResponse>(req.downloadHandler.text);
                }
                catch (System.Exception ex)
                {
                    onComplete?.Invoke(false, "Bad session payload: " + ex.Message);
                    yield break;
                }

                // Fetch the display name from the public `users` table — anonymous read
                // is allowed per the RLS rules (public read policy on `users`).
                yield return FetchProfile(cfg, session, username,
                    (ok, displayName) =>
                    {
                        if (!ok)
                        {
                            SupabaseSession.Instance.Clear();
                            onComplete?.Invoke(false, "Signed in but profile missing: " + displayName);
                            return;
                        }

                        SupabaseSession.Instance.SaveSession(session, username, displayName);
                        onComplete?.Invoke(true, displayName);
                    });
            }
        }

        /// <summary>
        /// Sign out the current session server-side, then clear the local cache.
        /// Network failure still clears the local session — we tolerate a dangling
        /// refresh token on the server for an event demo.
        /// </summary>
        public static IEnumerator SignOut(System.Action onComplete)
        {
            var cfg = SupabaseConfig.Load();
            var s = SupabaseSession.Instance;
            if (!s.IsSignedIn || !cfg.IsValid)
            {
                s.Clear();
                onComplete?.Invoke();
                yield break;
            }

            using (var req = new UnityWebRequest(cfg.BaseUrl + "/auth/v1/logout", UnityWebRequest.kHttpVerbPOST))
            {
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("apikey", cfg.anonKey);
                req.SetRequestHeader("Authorization", "Bearer " + s.Current.access_token);
                req.SetRequestHeader("Content-Type", JsonContentType);
                yield return req.SendWebRequest();
                // We don't care about the result — local clear always happens.
                if (req.result != UnityWebRequest.Result.Success)
                    Debug.LogWarning("[Supabase] Logout HTTP failed: " + req.error +
                                     " / " + req.downloadHandler?.text);
            }
            s.Clear();
            onComplete?.Invoke();
        }

        // ============================================================
        // Internals
        // ============================================================

        private static string BuildEmail(string username) => username + "@" + SyntheticDomain;

        private static IEnumerator InsertProfile(
            SupabaseConfig cfg,
            string accessToken,
            string uid,
            string username,
            string displayName,
            System.Action<bool, string> onDone)
        {
            // Use a dedicated insert DTO so we OMIT created_at entirely — sending it as
            // an explicit JSON null would bypass the column's DEFAULT now() and store
            // NULL instead, breaking any tiebreaker on created_at ordering.
            var row = new UserRowInsert
            {
                id = uid,
                username = username,
                display_name = displayName
            };
            string body = JsonUtility.ToJson(row);

            using (var req = new UnityWebRequest(cfg.BaseUrl + "/rest/v1/users", UnityWebRequest.kHttpVerbPOST))
            {
                byte[] bytes = Encoding.UTF8.GetBytes(body);
                req.uploadHandler = new UploadHandlerRaw(bytes);
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("apikey", cfg.anonKey);
                req.SetRequestHeader("Authorization", "Bearer " + accessToken);
                req.SetRequestHeader("Content-Type", JsonContentType);
                req.SetRequestHeader("Prefer", "return=minimal");  // no row echoed back
                yield return req.SendWebRequest();

                if (req.result != UnityWebRequest.Result.Success)
                    onDone(false, PrettyError(req));
                else
                    onDone(true, displayName);
            }
        }

        private static IEnumerator FetchProfile(
            SupabaseConfig cfg,
            SessionResponse session,
            string username,
            System.Action<bool, string> onDone)
        {
            // SELECT display_name FROM users WHERE username = '<username>'
            string url = cfg.BaseUrl + "/rest/v1/users?select=display_name&username=eq." +
                         UnityWebRequest.EscapeURL(username);
            using (var req = UnityWebRequest.Get(url))
            {
                req.SetRequestHeader("apikey", cfg.anonKey);
                // Public read rule on `users` means anonymous GET works; add token too
                // for robustness.
                req.SetRequestHeader("Authorization", "Bearer " + session.access_token);
                yield return req.SendWebRequest();

                if (req.result != UnityWebRequest.Result.Success)
                {
                    onDone(false, PrettyError(req));
                    yield break;
                }

                // Response is bare array: [{"display_name":"..."}]. Wrap for JsonUtility.
                var wrapper = !string.IsNullOrEmpty(req.downloadHandler.text)
                    ? JsonUtility.FromJson<UserRowsByUsernameReq>(@"{""items"":" + req.downloadHandler.text + "}")
                    : null;

                if (wrapper == null || wrapper.items == null || wrapper.items.Length == 0)
                {
                    onDone(false, "no profile row");
                    yield break;
                }
                onDone(true, wrapper.items[0].display_name);
            }
        }

        private static string PrettyError(UnityWebRequest req)
        {
            string body = !string.IsNullOrEmpty(req.downloadHandler?.text)
                ? req.downloadHandler.text : req.error;
            return body;
        }

        /// <summary>Tiny wrapper to deserialize a bare Supabase array into JsonUtility.</summary>
        [System.Serializable]
        private sealed class UserRowsByUsernameReq
        {
            public UserDisplayNameOnly[] items;
        }

        [System.Serializable]
        private sealed class UserDisplayNameOnly
        {
            public string display_name;
        }

        /// <summary>Insert-only DTO for the `users` table. Omits server-defaulted columns
        /// (e.g. created_at) so Postgres applies DEFAULT now() instead of NULL.</summary>
        [System.Serializable]
        private sealed class UserRowInsert
        {
            public string id;
            public string username;
            public string display_name;
        }
    }
}
