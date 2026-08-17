using UnityEngine;
using UnityEngine.UI;
using TMPro;
using GDGGo.Supabase;
using GDGGo.Audio;

namespace GDGGo.UI
{
    /// <summary>
    /// Self-registration panel. Anyone visiting the site can create an account and get
    /// onto the leaderboard.
    ///
    /// Usernames are validated client-side before the request goes out, because the
    /// `users` table has a UNIQUE index on username and a collision leaves an orphaned
    /// auth user behind (see <see cref="AuthAPI.SignUp"/>). Catching the obvious cases
    /// here saves the player a confusing round trip.
    /// </summary>
    public sealed class SignupScreen : MonoBehaviour
    {
        [Header("Fields")]
        public TMP_InputField usernameField;
        public TMP_InputField passwordField;
        public TMP_InputField displayNameField;

        [Header("Buttons")]
        public Button signupButton;
        public Button backToLoginButton;
        public Button closeButton;
        [Tooltip("Optional show/hide password toggle. Built by UIScreenBuilder; null-safe if absent.")]
        public Button showPasswordButton;

        [Header("Status")]
        public TMP_Text statusText;

        [Header("Owner")]
        public MenuScreen menu;

        private bool _busy;

        private void Awake()
        {
            if (signupButton != null) signupButton.onClick.AddListener(OnSignup);
            if (backToLoginButton != null) backToLoginButton.onClick.AddListener(OnBackToLogin);
            if (closeButton != null) closeButton.onClick.AddListener(Close);
            if (showPasswordButton != null) showPasswordButton.onClick.AddListener(TogglePassword);

            // Enter walks the form: username -> password -> display name -> submit.
            if (usernameField != null)
                usernameField.onEndEdit.AddListener(_ => { if (WasEnter()) Focus(passwordField); });
            if (passwordField != null)
                passwordField.onEndEdit.AddListener(_ => { if (WasEnter()) Focus(displayNameField); });
            if (displayNameField != null)
                displayNameField.onEndEdit.AddListener(_ => { if (WasEnter()) OnSignup(); });
        }

        private void OnEnable()
        {
            SetStatus(string.Empty);
            if (usernameField != null) usernameField.text = string.Empty;
            if (passwordField != null) { passwordField.text = string.Empty; HidePassword(); }
            if (displayNameField != null) displayNameField.text = string.Empty;
            Focus(usernameField);
        }

        private static bool WasEnter() =>
            Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter);

        private static void Focus(TMP_InputField field)
        {
            if (field != null) field.ActivateInputField();
        }

        private void TogglePassword()
        {
            if (passwordField == null) return;
            bool hidden = passwordField.contentType == TMP_InputField.ContentType.Password;
            passwordField.contentType = hidden ? TMP_InputField.ContentType.Standard : TMP_InputField.ContentType.Password;
            passwordField.inputType   = hidden ? TMP_InputField.InputType.Standard    : TMP_InputField.InputType.Password;
            passwordField.text = passwordField.text;
            Focus(passwordField);
        }

        private void HidePassword()
        {
            if (passwordField == null) return;
            passwordField.contentType = TMP_InputField.ContentType.Password;
            passwordField.inputType = TMP_InputField.InputType.Password;
        }

        private void OnSignup()
        {
            if (_busy) return;
            AudioManager.Instance?.PlayClick();

            string username = usernameField != null ? usernameField.text.Trim() : string.Empty;
            string password = passwordField != null ? passwordField.text : string.Empty;
            string displayName = displayNameField != null ? displayNameField.text.Trim() : string.Empty;

            string problem = Validate(username, password, displayName);
            if (problem != null) { SetStatus(problem); return; }

            SetBusy(true);
            SetStatus("Creating your account…");

            StartCoroutine(AuthAPI.SignUp(username, password, displayName, (ok, message) =>
            {
                SetBusy(false);
                if (ok)
                {
                    AudioManager.Instance?.PlayLogin();
                    if (menu != null) menu.RefreshForSession();
                    gameObject.SetActive(false);
                }
                else
                {
                    Debug.LogWarning($"[Signup] Raw error: {message}");
                    SetStatus(Friendly(message));
                }
            }));
        }

        /// <summary>
        /// Returns a message describing the first problem, or null when valid.
        /// The username becomes part of a synthetic email address
        /// (<c>&lt;username&gt;@gdg-go.local</c>), so it has to be email-local-part safe.
        /// </summary>
        private static string Validate(string username, string password, string displayName)
        {
            if (username.Length < LoginScreen.MinUsernameLength)
                return $"Username needs at least {LoginScreen.MinUsernameLength} characters.";
            if (username.Length > 24)
                return "Username must be 24 characters or fewer.";

            foreach (char c in username)
            {
                bool allowed = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
                               || (c >= '0' && c <= '9') || c == '_' || c == '.' || c == '-';
                if (!allowed) return "Username can only use letters, numbers, dot, dash and underscore.";
            }

            if (password.Length < LoginScreen.MinPasswordLength)
                return $"Password needs at least {LoginScreen.MinPasswordLength} characters.";
            if (string.IsNullOrWhiteSpace(displayName))
                return "Display name is required — it's what shows on the leaderboard.";
            if (displayName.Length > 24)
                return "Display name must be 24 characters or fewer.";

            return null;
        }

        private void OnBackToLogin()
        {
            if (menu != null) menu.ShowLogin();
            else gameObject.SetActive(false);
        }

        private void Close()
        {
            AudioManager.Instance?.PlayClick();
            gameObject.SetActive(false);
        }

        private void SetBusy(bool busy)
        {
            _busy = busy;
            if (signupButton != null) signupButton.interactable = !busy;
        }

        private static string Friendly(string raw)
        {
            if (string.IsNullOrEmpty(raw)) return "Sign-up failed. Please try again.";
            // 23505 is Postgres' unique_violation, which here means the username is taken.
            if (raw.Contains("23505") || raw.Contains("duplicate key") || raw.Contains("already registered"))
                return "That username is taken — try another.";
            if (raw.Contains("Password should be")) return "That password is too weak.";
            if (raw.Contains("rate limit") || raw.Contains("429")) return "Too many attempts — wait a moment.";
            return "Sign-up failed. Check your connection and try again.";
        }

        private void SetStatus(string message)
        {
            if (statusText != null) statusText.text = message;
        }
    }
}
