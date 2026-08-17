using UnityEngine;
using UnityEngine.UI;
using TMPro;
using GDGGo.Core;
using GDGGo.Supabase;
using GDGGo.Audio;

namespace GDGGo.UI
{
    /// <summary>
    /// End-of-run screen. Shows the result, submits it, then shows where the player
    /// landed on the board.
    ///
    /// The order matters: submit first, then refresh the leaderboard, so the player sees
    /// their own row appear. That "where did I land" beat is what makes someone press
    /// Play Again, and on a public site it is the entire retention loop.
    ///
    /// Results are read from <see cref="GameSession"/>'s statics because the Game scene —
    /// and the GameSession instance with it — is already destroyed by the time this runs.
    /// </summary>
    public sealed class GameOverScreen : MonoBehaviour
    {
        [Header("Result")]
        public TMP_Text finalScoreText;
        public TMP_Text finalCoinsText;
        public TMP_Text finalDistanceText;
        public TMP_Text personalBestText;
        public TMP_Text statusText;

        [Header("Buttons")]
        public Button retryButton;
        public Button menuButton;
        public Button signOutButton;

        [Header("Leaderboard")]
        public LeaderboardPanel leaderboardPanel;

        private void Awake()
        {
            if (retryButton != null) retryButton.onClick.AddListener(OnRetry);
            if (menuButton != null) menuButton.onClick.AddListener(OnMenu);
            if (signOutButton != null) signOutButton.onClick.AddListener(OnSignOut);
        }

        private void OnEnable()
        {
            int score = GameSession.LastScore;
            int coins = GameSession.LastCoins;
            int meters = GameSession.LastMeters;
            int pills = GameSession.LastPills;
            int duration = GameSession.LastDurationSeconds;

            if (finalScoreText != null) finalScoreText.text = score.ToString("N0");
            if (finalCoinsText != null) finalCoinsText.text = coins.ToString("N0") + " coins";
            if (finalDistanceText != null) finalDistanceText.text = meters.ToString("N0") + " m";
            if (personalBestText != null) personalBestText.text = pills > 0 ? $"{pills} GDG pill{(pills == 1 ? "" : "s")}!" : string.Empty;

            AudioManager.Instance?.PlayGameOver();

            Submit(score, coins, meters, duration);
        }

        private void Submit(int score, int coins, int meters, int duration)
        {
            var session = SupabaseSession.Instance;
            if (session == null || !session.IsSignedIn)
            {
                SetStatus("Sign in to save your score to the leaderboard.");
                if (leaderboardPanel != null) leaderboardPanel.Refresh();
                return;
            }

            SetStatus("Saving your score…");

            StartCoroutine(ScoreAPI.InsertScore(score, coins, meters, duration, (ok, error) =>
            {
                SetStatus(ok ? "Score saved!" : "Couldn't save your score — check your connection.");

                // Refresh either way: seeing the board is useful even if the write failed.
                if (leaderboardPanel != null) leaderboardPanel.Refresh();

                if (!ok) return;

                StartCoroutine(ScoreAPI.FetchUserBest((bestOk, row) =>
                {
                    if (!bestOk || row == null || personalBestText == null) return;
                    personalBestText.text = row.score > score
                        ? $"Your best: {row.score:N0}"
                        : "New personal best!";
                }));
            }));
        }

        private void OnRetry()
        {
            AudioManager.Instance?.PlayClick();
            GameManager.Instance?.LoadGame();
        }

        private void OnMenu()
        {
            AudioManager.Instance?.PlayClick();
            GameManager.Instance?.LoadMenu();
        }

        private void OnSignOut()
        {
            AudioManager.Instance?.PlayClick();
            StartCoroutine(AuthAPI.SignOut(() => GameManager.Instance?.LoadMenu()));
        }

        private void SetStatus(string message)
        {
            if (statusText != null) statusText.text = message;
        }
    }
}
