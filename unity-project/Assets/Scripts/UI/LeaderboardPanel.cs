using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using TMPro;
using GDGGo.Supabase;

namespace GDGGo.UI
{
    /// <summary>
    /// Renders the Top-N leaderboard from Supabase.
    ///
    /// The previous version instantiated the right number of rows and then left every
    /// field-assignment commented out, so it drew N blank strips. This one actually
    /// binds the data, highlights the signed-in player's row, and reuses row objects
    /// across refreshes instead of destroying and re-creating them.
    /// </summary>
    public sealed class LeaderboardPanel : MonoBehaviour
    {
        [Header("Row rendering")]
        [Tooltip("Prefab carrying a LeaderboardRow component.")]
        public LeaderboardRow rowPrefab;

        [Tooltip("Parent the rows are instantiated under (usually a VerticalLayoutGroup).")]
        public Transform rowsContainer;

        [Header("Query")]
        [Tooltip("How many rows to request.")]
        public int topN = 10;

        [Header("Status")]
        public TMP_Text statusText;

        [Tooltip("Refresh automatically when this panel is enabled.")]
        public bool refreshOnEnable = true;

        private readonly List<LeaderboardRow> _rows = new List<LeaderboardRow>();
        private bool _inFlight;

        private void OnEnable()
        {
            if (refreshOnEnable) Refresh();
        }

        /// <summary>Fetches and redraws. Ignores overlapping calls.</summary>
        public void Refresh()
        {
            if (_inFlight) return;
            if (rowPrefab == null || rowsContainer == null)
            {
                SetStatus("Leaderboard UI not wired.");
                return;
            }
            StartCoroutine(FetchRoutine());
        }

        private IEnumerator FetchRoutine()
        {
            _inFlight = true;
            SetStatus("Loading leaderboard…");

            bool ok = false;
            ScoreRow[] rows = null;

            yield return ScoreAPI.FetchLeaderboard(topN, (success, data) =>
            {
                ok = success;
                rows = data;
            });

            _inFlight = false;

            if (!ok || rows == null)
            {
                SetStatus("Couldn't load the leaderboard. Check your connection.");
                yield break;
            }

            RenderRows(rows);
            SetStatus(rows.Length == 0 ? "No scores yet — be the first!" : string.Empty);
        }

        private void RenderRows(ScoreRow[] rows)
        {
            string selfUid = SupabaseSession.Instance != null ? SupabaseSession.Instance.Uid : null;

            // Grow the pool to fit.
            while (_rows.Count < rows.Length)
            {
                var row = Instantiate(rowPrefab, rowsContainer);
                _rows.Add(row);
            }

            for (int i = 0; i < _rows.Count; i++)
            {
                LeaderboardRow row = _rows[i];
                if (row == null) continue;

                bool used = i < rows.Length;
                row.gameObject.SetActive(used);
                if (!used) continue;

                ScoreRow data = rows[i];
                bool isSelf = !string.IsNullOrEmpty(selfUid) && selfUid == data.user_id;
                row.Bind(i + 1, data.display_name, data.score, data.coins, isSelf);
            }
        }

        private void SetStatus(string message)
        {
            if (statusText != null) statusText.text = message;
        }
    }
}
