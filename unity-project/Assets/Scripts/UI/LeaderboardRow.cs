using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace GDGGo.UI
{
    /// <summary>
    /// One row of the leaderboard. Exists so the panel has typed fields to fill in
    /// rather than doing <c>transform.Find("NameText")</c> string lookups per row per
    /// refresh — which is what the old panel intended to do and never actually did,
    /// leaving the leaderboard rendering blank rows.
    /// </summary>
    public sealed class LeaderboardRow : MonoBehaviour
    {
        [Header("Labels")]
        public TMP_Text rankText;
        public TMP_Text nameText;
        public TMP_Text scoreText;
        public TMP_Text coinsText;

        [Header("Highlight")]
        [Tooltip("Background image tinted when this row is the signed-in player.")]
        public Image background;
        public Color normalColor = new Color(1f, 1f, 1f, 0.06f);
        public Color highlightColor = new Color(0.26f, 0.52f, 0.96f, 0.35f);

        /// <summary>Fills the row. <paramref name="isSelf"/> highlights the signed-in player.</summary>
        public void Bind(int rank, string displayName, int score, int coins, bool isSelf)
        {
            if (rankText != null) rankText.text = rank.ToString();
            if (nameText != null) nameText.text = string.IsNullOrEmpty(displayName) ? "—" : displayName;
            if (scoreText != null) scoreText.text = score.ToString("N0");
            if (coinsText != null) coinsText.text = coins.ToString("N0");
            if (background != null) background.color = isSelf ? highlightColor : normalColor;
        }
    }
}
