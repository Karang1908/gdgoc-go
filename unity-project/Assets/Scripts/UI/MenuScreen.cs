using UnityEngine;
using UnityEngine.UI;
using TMPro;
using GDGGo.Supabase;
using GDGGo.Core;
using GDGGo.Audio;

namespace GDGGo.UI
{
    /// <summary>
    /// The main menu, and the router between the auth panels.
    ///
    /// Because this ships as a public web game rather than a kiosk, the menu has to cope
    /// with a first-time visitor who has no account: the panels are toggled here rather
    /// than living in separate scenes, so signing up never costs a scene load and the
    /// player lands back on a menu that already knows who they are.
    /// </summary>
    public sealed class MenuScreen : MonoBehaviour
    {
        [Header("Primary buttons")]
        public Button playButton;
        public Button carSelectButton;
        public Button leaderboardButton;
        public Button signOutButton;
        public Button signInButton;

        [Header("Header")]
        public TMP_Text greetingText;
        public TMP_Text usernameDisplayText;

        [Header("Panels")]
        public GameObject loginPanel;
        public GameObject signupPanel;
        public GameObject leaderboardPanelRoot;
        public LeaderboardPanel leaderboardPanel;
        public Button closeLeaderboardButton;

        private void Awake()
        {
            if (playButton != null) playButton.onClick.AddListener(OnPlay);
            if (carSelectButton != null) carSelectButton.onClick.AddListener(OnCarSelect);
            if (leaderboardButton != null) leaderboardButton.onClick.AddListener(OnShowLeaderboard);
            if (signOutButton != null) signOutButton.onClick.AddListener(OnSignOut);
            if (signInButton != null) signInButton.onClick.AddListener(ShowLogin);
            if (closeLeaderboardButton != null) closeLeaderboardButton.onClick.AddListener(HideLeaderboard);
        }

        private void OnEnable()
        {
            AudioManager.Instance?.PlayMusic();
            RefreshForSession();
        }

        /// <summary>Re-reads the session and shows the right controls. Called by the auth panels on success.</summary>
        public void RefreshForSession()
        {
            SupabaseSession session = SupabaseSession.Instance;
            bool signedIn = session != null && session.IsSignedIn;

            if (signedIn)
            {
                string name = string.IsNullOrEmpty(session.DisplayName) ? session.Username : session.DisplayName;
                if (greetingText != null) greetingText.text = $"Hello, {name}!";
                if (usernameDisplayText != null) usernameDisplayText.text = "@" + session.Username;
                HideAuthPanels();
            }
            else
            {
                if (greetingText != null) greetingText.text = "Sign in to play and get on the leaderboard.";
                if (usernameDisplayText != null) usernameDisplayText.text = string.Empty;
            }

            if (playButton != null) playButton.gameObject.SetActive(signedIn);
            if (carSelectButton != null) carSelectButton.gameObject.SetActive(signedIn);
            if (signOutButton != null) signOutButton.gameObject.SetActive(signedIn);
            if (signInButton != null) signInButton.gameObject.SetActive(!signedIn);

            LayoutSecondaryRow(signedIn);
        }

        /// <summary>
        /// Re-centres the secondary button row for however many of its chips are visible.
        ///
        /// The row is authored as three chips, but only RANKS shows when signed out. With
        /// fixed positions that leaves a single chip sitting off to one side under a
        /// centred primary button, which reads as a layout fault rather than a state.
        /// Laying it out at runtime keeps the row centred at one, two or three chips.
        /// </summary>
        private void LayoutSecondaryRow(bool signedIn)
        {
            var chips = new System.Collections.Generic.List<RectTransform>();
            if (leaderboardButton != null && leaderboardButton.gameObject.activeSelf)
                chips.Add((RectTransform)leaderboardButton.transform);
            if (carSelectButton != null && carSelectButton.gameObject.activeSelf)
                chips.Add((RectTransform)carSelectButton.transform);
            if (signOutButton != null && signOutButton.gameObject.activeSelf)
                chips.Add((RectTransform)signOutButton.transform);

            if (chips.Count == 0) return;

            float width = chips[0].sizeDelta.x;
            float stride = width + secondaryRowGap;
            float startX = -stride * (chips.Count - 1) * 0.5f;

            for (int i = 0; i < chips.Count; i++)
            {
                Vector2 p = chips[i].anchoredPosition;
                p.x = startX + stride * i;
                chips[i].anchoredPosition = p;
            }
        }

        [Header("Layout")]
        [Tooltip("Horizontal gap between the secondary action chips.")]
        public float secondaryRowGap = 12f;

        // ------------------------------------------------------------------
        // Panel routing
        // ------------------------------------------------------------------

        public void ShowLogin()
        {
            AudioManager.Instance?.PlayClick();
            if (loginPanel != null) loginPanel.SetActive(true);
            if (signupPanel != null) signupPanel.SetActive(false);
        }

        public void ShowSignup()
        {
            AudioManager.Instance?.PlayClick();
            if (signupPanel != null) signupPanel.SetActive(true);
            if (loginPanel != null) loginPanel.SetActive(false);
        }

        public void HideAuthPanels()
        {
            if (loginPanel != null) loginPanel.SetActive(false);
            if (signupPanel != null) signupPanel.SetActive(false);
        }

        private void OnShowLeaderboard()
        {
            AudioManager.Instance?.PlayClick();
            if (leaderboardPanelRoot != null) leaderboardPanelRoot.SetActive(true);
            if (leaderboardPanel != null) leaderboardPanel.Refresh();
        }

        private void HideLeaderboard()
        {
            AudioManager.Instance?.PlayClick();
            if (leaderboardPanelRoot != null) leaderboardPanelRoot.SetActive(false);
        }

        // ------------------------------------------------------------------
        // Navigation
        // ------------------------------------------------------------------

        private void OnPlay()
        {
            AudioManager.Instance?.PlayClick();

            if (SupabaseSession.Instance == null || !SupabaseSession.Instance.IsSignedIn)
            {
                ShowLogin();
                return;
            }
            GameManager.Instance?.LoadGame();
        }

        private void OnCarSelect()
        {
            AudioManager.Instance?.PlayClick();
            GameManager.Instance?.LoadCarSelect();
        }

        private void OnSignOut()
        {
            AudioManager.Instance?.PlayClick();
            StartCoroutine(AuthAPI.SignOut(RefreshForSession));
        }
    }
}
