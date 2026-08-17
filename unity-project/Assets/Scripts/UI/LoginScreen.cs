using UnityEngine;
using UnityEngine.UI;
using TMPro;
using GDGGo.Supabase;
using GDGGo.Audio;

namespace GDGGo.UI
{
    /// <summary>
    /// Sign-in panel for returning players.
    ///
    /// Lives as a panel inside the Menu scene rather than as its own scene, so signing
    /// in does not cost a scene load and returns the player straight to a menu that
    /// already knows them. On success it tells <see cref="MenuScreen"/> to re-read the
    /// session; it does not reload anything.
    /// </summary>
    public sealed class LoginScreen : MonoBehaviour
    {
        [Header("Fields")]
        public TMP_InputField usernameField;
        public TMP_InputField passwordField;

        [Header("Buttons")]
        public Button loginButton;
        public Button goToSignupButton;
        public Button closeButton;
        [Tooltip("Optional show/hide password toggle. Built by UIScreenBuilder; null-safe if absent.")]
        public Button showPasswordButton;

        [Header("Status")]
        public TMP_Text statusText;

        [Header("Owner")]
        [Tooltip("Menu that owns this panel. Told to refresh on a successful sign-in.")]
        public MenuScreen menu;

        public const int MinUsernameLength = 3;
        public const int MinPasswordLength = 6;

        private bool _busy;

        private void Awake()
        {
            if (loginButton != null) loginButton.onClick.AddListener(OnLogin);
            if (goToSignupButton != null) goToSignupButton.onClick.AddListener(OnGoToSignup);
            if (closeButton != null) closeButton.onClick.AddListener(Close);
            if (showPasswordButton != null) showPasswordButton.onClick.AddListener(TogglePassword);

            // Enter on the username steps to the password; Enter on the password submits.
            if (usernameField != null)
                usernameField.onEndEdit.AddListener(_ => { if (WasEnter()) Focus(passwordField); });
            if (passwordField != null)
                passwordField.onEndEdit.AddListener(_ => { if (WasEnter()) OnLogin(); });
        }

        private void OnEnable()
        {
            SetStatus(string.Empty);
            // Start each visit clean — a password left in the field from a previous
            // attempt is both a privacy smell and a confusing one.
            if (usernameField != null) usernameField.text = string.Empty;
            if (passwordField != null) { passwordField.text = string.Empty; HidePassword(); }
            Focus(usernameField);
        }

        // Enter handling. onEndEdit fires on submit-by-Enter AND on focus loss; only the
        // Enter case should move focus or submit, otherwise tabbing away logs you in.
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
            passwordField.text = passwordField.text;   // force TMP to re-render masking
            Focus(passwordField);
        }

        private void HidePassword()
        {
            if (passwordField == null) return;
            passwordField.contentType = TMP_InputField.ContentType.Password;
            passwordField.inputType = TMP_InputField.InputType.Password;
        }

        private void OnLogin()
        {
            if (_busy) return;
            AudioManager.Instance?.PlayClick();

            string username = usernameField != null ? usernameField.text.Trim() : string.Empty;
            string password = passwordField != null ? passwordField.text : string.Empty;

            if (username.Length < MinUsernameLength) { SetStatus($"Username needs at least {MinUsernameLength} characters."); return; }
            if (password.Length < MinPasswordLength) { SetStatus($"Password needs at least {MinPasswordLength} characters."); return; }

            SetBusy(true);
            SetStatus("Signing in…");

            StartCoroutine(AuthAPI.SignIn(username, password, (ok, message) =>
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
                    Debug.LogWarning($"[Login] Raw error: {message}");
                    SetStatus(Friendly(message));
                }
            }));
        }

        private void OnGoToSignup()
        {
            if (menu != null) menu.ShowSignup();
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
            if (loginButton != null) loginButton.interactable = !busy;
        }

        /// <summary>
        /// Supabase returns raw JSON errors. Surfacing those to a player on a public
        /// site is noise at best and leaks internals at worst, so the common cases get
        /// a plain-English message and anything unrecognised falls back to a generic one.
        /// </summary>
        private static string Friendly(string raw)
        {
            if (string.IsNullOrEmpty(raw)) return "Sign-in failed. Please try again.";
            if (raw.Contains("Invalid login credentials")) return "Wrong username or password.";
            if (raw.Contains("Email not confirmed")) return "Account not confirmed yet.";
            if (raw.Contains("rate limit") || raw.Contains("429")) return "Too many attempts — wait a moment.";
            return "Sign-in failed. Check your connection and try again.";
        }

        private void SetStatus(string message)
        {
            if (statusText != null) statusText.text = message;
        }
    }
}
