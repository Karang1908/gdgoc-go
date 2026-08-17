using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using TMPro;

namespace GDGGo.EditorTools
{
    /// <summary>
    /// Builds the four non-gameplay scenes (Boot, Menu, CarSelect, GameOver) and the
    /// leaderboard row prefab.
    ///
    /// Login and signup are panels inside the Menu scene rather than scenes of their
    /// own. For a public web game that matters: a visitor who lands on the page, signs
    /// up and plays should never sit through a scene load mid-flow.
    ///
    /// Layout is anchored rather than absolute so it survives phone aspect ratios; the
    /// CanvasScaler matches on height for the same reason.
    /// </summary>
    public static class UIScreenBuilder
    {
        private const string Scenes = "Assets/Scenes";
        private const string RowPrefabPath = "Assets/Prefabs/UI/LeaderboardRow.prefab";

        // Google brand palette. These are the exact brand hex values converted to linear-
        // safe sRGB floats: blue #4285F4, red #EA4335, yellow #FBBC05, green #34A853.
        private static readonly Color GoogleBlue = new Color(0.259f, 0.522f, 0.957f);
        private static readonly Color GoogleRed = new Color(0.918f, 0.263f, 0.208f);
        private static readonly Color GoogleYellow = new Color(0.984f, 0.737f, 0.020f);
        private static readonly Color GoogleGreen = new Color(0.204f, 0.659f, 0.325f);

        /// <summary>Neutral button fill. Lighter than the panel so it reads as a control.</summary>
        private static readonly Color ButtonInk = new Color(0.16f, 0.18f, 0.23f, 1f);

        /// <summary>Input field fill — darker than the panel, so a field reads as a well.</summary>
        private static readonly Color FieldInk = new Color(0.03f, 0.04f, 0.06f, 1f);
        private static readonly Color PanelInk = new Color(0.07f, 0.08f, 0.11f, 0.98f);

        /// <summary>Dim behind a modal. Opaque enough to kill the menu behind it.</summary>
        private static readonly Color ScrimInk = new Color(0.02f, 0.02f, 0.04f, 0.82f);

        [MenuItem("GDG Go/4. Build UI Scenes", priority = 30)]
        public static void BuildAll()
        {
            BuildLeaderboardRowPrefab();
            BuildBootScene();
            BuildMenuScene();
            BuildCarSelectScene();
            BuildGameOverScene();

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[UIScreenBuilder] UI scenes built.");
        }

        // ==================================================================
        // Leaderboard row prefab
        // ==================================================================

        private static void BuildLeaderboardRowPrefab()
        {
            if (AssetDatabase.LoadAssetAtPath<GameObject>(RowPrefabPath) != null) return;
            MaterialLibrary.EnsureFolder("Assets/Prefabs/UI");

            var root = new GameObject("LeaderboardRow", typeof(RectTransform));
            var rect = (RectTransform)root.transform;
            rect.sizeDelta = new Vector2(760f, 56f);

            var background = root.AddComponent<Image>();
            background.color = new Color(1f, 1f, 1f, 0.06f);

            // Leaderboard rows carry player-chosen display names — body face so they read
            // as typed rather than shouted.
            TMP_FontAsset font = FontSetup.Body();
            var row = root.AddComponent<UI.LeaderboardRow>();
            row.background = background;

            // Columns as anchored fractions so the row reflows with the panel width.
            row.rankText = Column(root.transform, "RankText", font, 0.00f, 0.12f, TextAlignmentOptions.Left);
            row.nameText = Column(root.transform, "NameText", font, 0.13f, 0.60f, TextAlignmentOptions.Left);
            row.scoreText = Column(root.transform, "ScoreText", font, 0.60f, 0.82f, TextAlignmentOptions.Right);
            row.coinsText = Column(root.transform, "CoinsText", font, 0.83f, 0.99f, TextAlignmentOptions.Right);

            PrefabUtility.SaveAsPrefabAsset(root, RowPrefabPath);
            Object.DestroyImmediate(root);
            Debug.Log($"[UIScreenBuilder] Built {RowPrefabPath}");
        }

        private static TMP_Text Column(Transform parent, string name, TMP_FontAsset font,
                                       float anchorMinX, float anchorMaxX, TextAlignmentOptions alignment)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);

            var rect = (RectTransform)go.transform;
            rect.anchorMin = new Vector2(anchorMinX, 0f);
            rect.anchorMax = new Vector2(anchorMaxX, 1f);
            rect.offsetMin = new Vector2(12f, 0f);
            rect.offsetMax = new Vector2(-12f, 0f);

            var label = go.AddComponent<TextMeshProUGUI>();
            label.text = "—";
            label.fontSize = 26f;
            label.alignment = alignment;
            label.color = Color.white;
            if (font != null) label.font = font;
            return label;
        }

        // ==================================================================
        // Scenes
        // ==================================================================

        private static void BuildBootScene()
        {
            Scene scene = OpenAndClear("Boot");
            if (!scene.IsValid()) return;

            var manager = new GameObject("GameManager");
            manager.AddComponent<Core.GameManager>();

            // AudioManager clips are assigned by hand; see docs/SETUP_GUIDE.md.
            var audio = new GameObject("AudioManager");
            audio.AddComponent<Audio.AudioManager>();

            var canvas = MakeCanvas("BootCanvas", out Transform canvasRoot);
            MakeLogo(canvasRoot, new Vector2(0f, 60f), 260f);
            MakeLabel(canvasRoot, "Title", "GDG GO", 64f, new Vector2(0.5f, 0.5f), new Vector2(0f, -120f), TextAlignmentOptions.Center);

            Save(scene);
        }

        private static void BuildMenuScene()
        {
            Scene scene = OpenAndClear("Menu");
            if (!scene.IsValid()) return;

            MakeCanvas("MenuCanvas", out Transform root);
            var menu = root.gameObject.AddComponent<UI.MenuScreen>();

            MakeBackdrop(root);

            // --- Title block -------------------------------------------------
            // Subway Surfers puts an oversized wordmark high on the screen and lets the
            // 3D world fill everything behind it. The logo plate bobs — the one piece of
            // continuous motion on an otherwise still screen, which is what stops a menu
            // reading as a screenshot.
            // Vertical rhythm. These were measured in the running scene, not estimated:
            // the logo plate renders 78 tall and the wordmark block 96, both anchored on
            // their centres, and BOTH bob by +-6. So the gap between their centres must
            // exceed (78 + 96)/2 + 12 of travel = 99 before any breathing room. At the
            // previous -70 / -184 they overlapped by 15 pixels.
            // The plate is deliberately static: with both it and the wordmark bobbing, the
            // two move as one block and the motion reads as the whole screen drifting
            // rather than as the title being alive. Only the wordmark breathes.
            MakeLogo(root, new Vector2(0f, -64f), 300f, new Vector2(0.5f, 1f));

            MakeWordmark(root, new Vector2(0f, -196f));
            MakeBrandRule(root, new Vector2(0f, -262f), 300f);

            menu.greetingText = MakeLabel(root, "Greeting", "Welcome", 30f, new Vector2(0.5f, 1f), new Vector2(0f, -304f), TextAlignmentOptions.Center);
            menu.usernameDisplayText = MakeLabel(root, "Username", "", 22f, new Vector2(0.5f, 1f), new Vector2(0f, -340f),
                                                 TextAlignmentOptions.Center, new Color(1f, 1f, 1f, 0.55f));

            // --- Primary action ----------------------------------------------
            // One oversized button, low-centre, pulsing. In a runner the player taps this
            // hundreds of times, so it is the only thing on screen allowed to shout.
            //
            // PLAY and SIGN IN share the slot: RefreshForSession shows exactly one, so the
            // primary action never moves between sessions.
            menu.playButton = MakeButton(root, "PlayButton", "PLAY", new Vector2(0.5f, 0f), new Vector2(0f, 214f), GoogleGreen, new Vector2(420f, 96f));
            menu.signInButton = MakeButton(root, "SignInButton", "SIGN IN", new Vector2(0.5f, 0f), new Vector2(0f, 214f), GoogleBlue, new Vector2(420f, 96f));
            SetLabelSize(menu.playButton, 42f);
            SetLabelSize(menu.signInButton, 42f);
            SetPulse(menu.playButton);
            SetPulse(menu.signInButton);

            // --- Secondary actions -------------------------------------------
            // A row of equal chips under the primary, the way a runner's shop/leaderboard/
            // settings row works — never a vertical stack of full-width bars, which reads
            // as a settings menu rather than a game.
            const float chipW = 132f, chipH = 66f, gap = 12f;
            float rowY = 128f;
            menu.leaderboardButton = MakeButton(root, "LeaderboardButton", "RANKS", new Vector2(0.5f, 0f), new Vector2(-(chipW + gap), rowY), GoogleBlue, new Vector2(chipW, chipH));
            menu.carSelectButton = MakeButton(root, "CarButton", "CARS", new Vector2(0.5f, 0f), new Vector2(0f, rowY), new Color(0.45f, 0.29f, 0.78f), new Vector2(chipW, chipH));
            menu.signOutButton = MakeButton(root, "SignOutButton", "EXIT", new Vector2(0.5f, 0f), new Vector2(chipW + gap, rowY), new Color(0.30f, 0.32f, 0.38f), new Vector2(chipW, chipH));

            // Clear of the brand strip along the very bottom edge.
            MakeLabel(root, "Footer", "GDG on Campus", 20f, new Vector2(0.5f, 0f), new Vector2(0f, 62f),
                      TextAlignmentOptions.Center, new Color(1f, 1f, 1f, 0.35f));

            BuildLoginPanel(root, menu);
            BuildSignupPanel(root, menu);
            BuildLeaderboardOverlay(root, menu);

            Save(scene);
        }

        private static void BuildLoginPanel(Transform root, UI.MenuScreen menu)
        {
            // 680 wide so a 480px field plus the SHOW button still clears the edge.
            Transform panel = MakePanel(root, "LoginPanel", new Vector2(680f, 470f));
            var login = panel.gameObject.AddComponent<UI.LoginScreen>();
            login.menu = menu;

            MakeLabel(panel, "Title", "SIGN IN", 40f, new Vector2(0.5f, 1f), new Vector2(0f, -52f), TextAlignmentOptions.Center);
            // Fields sit left of centre to leave a gutter for SHOW; see MakeInput's width.
            login.usernameField = MakeInput(panel, "UsernameField", "Username", new Vector2(-46f, 74f));
            login.passwordField = MakeInput(panel, "PasswordField", "Password", new Vector2(-46f, 8f), password: true);
            // x = 246: field right edge is at -46+240 = 194, so this clears it by 6px and
            // its own right edge lands at 292, inside the 340 half-width.
            login.showPasswordButton = MakeButton(panel, "ShowPasswordButton", "SHOW", new Vector2(0.5f, 0.5f), new Vector2(246f, 8f), size: new Vector2(88f, 56f));
            login.statusText = MakeLabel(panel, "Status", "", 22f, new Vector2(0.5f, 0.5f), new Vector2(0f, -46f), TextAlignmentOptions.Center, GoogleRed);

            login.loginButton = MakeButton(panel, "LoginButton", "SIGN IN", new Vector2(0.5f, 0f), new Vector2(0f, 112f), GoogleBlue);
            login.goToSignupButton = MakeButton(panel, "ToSignupButton", "CREATE ACCOUNT", new Vector2(0.5f, 0f), new Vector2(0f, 46f));
            login.closeButton = MakeButton(panel, "CloseButton", "X", new Vector2(1f, 1f), new Vector2(-34f, -34f), size: new Vector2(44f, 44f));

            menu.loginPanel = ScrimOf(panel);
            ScrimOf(panel).SetActive(false);
        }

        private static void BuildSignupPanel(Transform root, UI.MenuScreen menu)
        {
            Transform panel = MakePanel(root, "SignupPanel", new Vector2(680f, 560f));
            var signup = panel.gameObject.AddComponent<UI.SignupScreen>();
            signup.menu = menu;

            MakeLabel(panel, "Title", "CREATE ACCOUNT", 38f, new Vector2(0.5f, 1f), new Vector2(0f, -52f), TextAlignmentOptions.Center);
            signup.usernameField = MakeInput(panel, "UsernameField", "Username", new Vector2(-46f, 116f));
            signup.passwordField = MakeInput(panel, "PasswordField", "Password", new Vector2(-46f, 48f), password: true);
            signup.showPasswordButton = MakeButton(panel, "ShowPasswordButton", "SHOW", new Vector2(0.5f, 0.5f), new Vector2(246f, 48f), size: new Vector2(88f, 56f));
            // Display name spans the full width — no SHOW button competing for the gutter.
            signup.displayNameField = MakeInput(panel, "DisplayNameField", "Display name (shown on leaderboard)", new Vector2(0f, -20f), width: 572f);
            signup.statusText = MakeLabel(panel, "Status", "", 22f, new Vector2(0.5f, 0.5f), new Vector2(0f, -76f), TextAlignmentOptions.Center, GoogleRed);

            signup.signupButton = MakeButton(panel, "SignupButton", "CREATE", new Vector2(0.5f, 0f), new Vector2(0f, 112f), GoogleBlue);
            signup.backToLoginButton = MakeButton(panel, "BackToLoginButton", "I ALREADY HAVE ONE", new Vector2(0.5f, 0f), new Vector2(0f, 46f));
            signup.closeButton = MakeButton(panel, "CloseButton", "X", new Vector2(1f, 1f), new Vector2(-34f, -34f), size: new Vector2(44f, 44f));

            menu.signupPanel = ScrimOf(panel);
            ScrimOf(panel).SetActive(false);
        }

        private static void BuildLeaderboardOverlay(Transform root, UI.MenuScreen menu)
        {
            Transform panel = MakePanel(root, "LeaderboardPanel", new Vector2(840f, 620f));

            MakeLabel(panel, "Title", "TOP 10", 42f, new Vector2(0.5f, 1f), new Vector2(0f, -44f), TextAlignmentOptions.Center);

            Transform rows = MakeRowsContainer(panel);
            var board = panel.gameObject.AddComponent<UI.LeaderboardPanel>();
            board.rowPrefab = AssetDatabase.LoadAssetAtPath<UI.LeaderboardRow>(RowPrefabPath);
            board.rowsContainer = rows;
            board.statusText = MakeLabel(panel, "Status", "", 24f, new Vector2(0.5f, 0f), new Vector2(0f, 96f), TextAlignmentOptions.Center);
            board.refreshOnEnable = true;

            menu.leaderboardPanel = board;
            menu.leaderboardPanelRoot = ScrimOf(panel);
            menu.closeLeaderboardButton = MakeButton(panel, "CloseButton", "CLOSE", new Vector2(0.5f, 0f), new Vector2(0f, 40f));

            ScrimOf(panel).SetActive(false);
        }

        private static void BuildCarSelectScene()
        {
            Scene scene = OpenAndClear("CarSelect");
            if (!scene.IsValid()) return;

            MakeCanvas("CarSelectCanvas", out Transform root);
            var screen = root.gameObject.AddComponent<UI.CarSelectScreen>();

            MakeLabel(root, "Title", "CHOOSE YOUR CAR", 46f, new Vector2(0.5f, 1f), new Vector2(0f, -70f), TextAlignmentOptions.Center);

            // Ids must match PrefabsBuilder.SelectableCars, which is what PlayerCarSkin reads.
            var cars = new List<UI.CarSelectScreen.CarEntry>();
            var options = PrefabsBuilder.SelectableCars;
            float spacing = 220f;
            float startX = -spacing * (options.Length - 1) * 0.5f;

            for (int i = 0; i < options.Length; i++)
            {
                Button button = MakeButton(root, $"Car_{options[i].Id}", options[i].Label,
                    new Vector2(0.5f, 0.5f), new Vector2(startX + i * spacing, 20f),
                    size: new Vector2(200f, 90f));
                cars.Add(new UI.CarSelectScreen.CarEntry { id = options[i].Id, selectionButton = button });
            }
            screen.cars = cars.ToArray();

            screen.selectionNameLabel = MakeLabel(root, "Selection", "", 28f, new Vector2(0.5f, 0.5f), new Vector2(0f, -80f), TextAlignmentOptions.Center);
            screen.startGameButton = MakeButton(root, "StartButton", "START", new Vector2(0.5f, 0f), new Vector2(0f, 150f), GoogleBlue);
            screen.backButton = MakeButton(root, "BackButton", "BACK", new Vector2(0.5f, 0f), new Vector2(0f, 80f));

            Save(scene);
        }

        private static void BuildGameOverScene()
        {
            Scene scene = OpenAndClear("GameOver");
            if (!scene.IsValid()) return;

            MakeCanvas("GameOverCanvas", out Transform root);
            var screen = root.gameObject.AddComponent<UI.GameOverScreen>();

            MakeLabel(root, "Title", "BUSTED!", 68f, new Vector2(0.5f, 1f), new Vector2(0f, -70f), TextAlignmentOptions.Center, GoogleRed);

            screen.finalScoreText = MakeLabel(root, "FinalScore", "0", 76f, new Vector2(0.5f, 1f), new Vector2(0f, -170f), TextAlignmentOptions.Center);
            screen.finalCoinsText = MakeLabel(root, "FinalCoins", "0", 30f, new Vector2(0.5f, 1f), new Vector2(-140f, -250f), TextAlignmentOptions.Center);
            screen.finalDistanceText = MakeLabel(root, "FinalDistance", "0 m", 30f, new Vector2(0.5f, 1f), new Vector2(140f, -250f), TextAlignmentOptions.Center);
            screen.personalBestText = MakeLabel(root, "PersonalBest", "", 26f, new Vector2(0.5f, 1f), new Vector2(0f, -294f), TextAlignmentOptions.Center);
            screen.statusText = MakeLabel(root, "Status", "", 22f, new Vector2(0.5f, 0f), new Vector2(0f, 200f), TextAlignmentOptions.Center);

            screen.retryButton = MakeButton(root, "RetryButton", "PLAY AGAIN", new Vector2(0.5f, 0f), new Vector2(0f, 140f), GoogleBlue);
            screen.menuButton = MakeButton(root, "MenuButton", "MENU", new Vector2(0.5f, 0f), new Vector2(0f, 76f));

            // Leaderboard beneath the score: on a public site the "where did I land"
            // moment is what makes someone press Play Again.
            // MakeCard, not MakePanel: this board is part of the screen, so it must not
            // dim the PLAY AGAIN button behind it or swallow its clicks.
            Transform boardRoot = MakeCard(root, "LeaderboardPanel", new Vector2(760f, 420f), new Vector2(0f, -40f));
            Transform rows = MakeRowsContainer(boardRoot);
            var board = boardRoot.gameObject.AddComponent<UI.LeaderboardPanel>();
            board.rowPrefab = AssetDatabase.LoadAssetAtPath<UI.LeaderboardRow>(RowPrefabPath);
            board.rowsContainer = rows;
            board.refreshOnEnable = false;   // GameOverScreen refreshes it after submitting
            screen.leaderboardPanel = board;

            Save(scene);
        }

        // ==================================================================
        // UI construction helpers
        // ==================================================================

        private static Scene OpenAndClear(string sceneName)
        {
            string path = $"{Scenes}/{sceneName}.unity";
            if (!File.Exists(path))
            {
                Debug.LogError($"[UIScreenBuilder] {path} missing — run \"GDG Go > 1. Project Setup\" first.");
                return default;
            }

            Scene scene = EditorSceneManager.OpenScene(path, OpenSceneMode.Single);
            foreach (GameObject root in scene.GetRootGameObjects())
                Object.DestroyImmediate(root);
            return scene;
        }

        private static void Save(Scene scene)
        {
            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);
        }

        private static Canvas MakeCanvas(string name, out Transform root)
        {
            var camera = new GameObject("Main Camera");
            camera.tag = "MainCamera";
            var cam = camera.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.05f, 0.06f, 0.09f);
            camera.AddComponent<AudioListener>();

            var eventSystem = new GameObject("EventSystem");
            eventSystem.AddComponent<EventSystem>();
            eventSystem.AddComponent<StandaloneInputModule>();

            var go = new GameObject(name, typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            var canvas = go.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;

            var scaler = go.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280f, 720f);
            scaler.matchWidthOrHeight = 1f;   // match height: phones are narrow, not short

            root = go.transform;
            return canvas;
        }

        /// <summary>
        /// A modal panel: a full-screen scrim that swallows clicks and dims whatever is
        /// behind it, with the panel card centred on top.
        ///
        /// The scrim is the point. A bare panel does not occlude the menu behind it —
        /// sibling order decides draw order in uGUI, so the menu's buttons and greeting
        /// drew straight over the panel and the login card read as transparent. The scrim
        /// also blocks raycasts, so the PLAY button behind a modal is no longer clickable.
        ///
        /// Returns the card, not the scrim, so callers keep parenting their content to
        /// the panel. <c>SetActive</c> on the returned card's parent chain is handled by
        /// returning the card whose own root is the scrim — callers toggle
        /// <c>panel.gameObject</c>, so the card carries the scrim as its parent and both
        /// disappear together only if the scrim is the toggled object. To keep that simple
        /// the scrim is what gets returned to MenuScreen, via <see cref="ScrimOf"/>.
        /// </summary>
        private static Transform MakePanel(Transform parent, string name, Vector2 size, Vector2 offset = default)
        {
            // Full-screen scrim, parented to the canvas.
            var scrimGo = new GameObject(name + "Scrim", typeof(RectTransform));
            scrimGo.transform.SetParent(parent, false);

            var scrimRect = (RectTransform)scrimGo.transform;
            scrimRect.anchorMin = Vector2.zero;
            scrimRect.anchorMax = Vector2.one;
            scrimRect.offsetMin = Vector2.zero;
            scrimRect.offsetMax = Vector2.zero;

            var scrimImage = scrimGo.AddComponent<Image>();
            scrimImage.color = ScrimInk;
            scrimImage.raycastTarget = true;   // swallow clicks aimed at the menu behind

            return MakeCard(scrimGo.transform, name, size, offset);
        }

        /// <summary>
        /// A panel card with no scrim, for panels that sit inline in a screen rather than
        /// over it — the GameOver leaderboard, which must not dim the PLAY AGAIN button
        /// behind it or eat its clicks.
        /// </summary>
        private static Transform MakeCard(Transform parent, string name, Vector2 size, Vector2 offset = default)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);

            var rect = (RectTransform)go.transform;
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = offset;
            rect.sizeDelta = size;

            var image = go.AddComponent<Image>();
            image.sprite = LoadSprite("Assets/UI/KenneyUI/panel_rectangle.png");
            image.type = Image.Type.Sliced;
            image.color = PanelInk;

            // Cards pop in rather than blink on — the difference between a dialog that
            // feels like part of the game and one that feels like an error box.
            go.AddComponent<UI.UIAnimator>().motion = UI.UIAnimator.Motion.PopIn;

            return go.transform;
        }

        /// <summary>
        /// The scrim wrapping a card built by <see cref="MakePanel"/>. This is the object
        /// to show and hide — toggling the card alone would leave the scrim covering the
        /// screen and eating every click.
        /// </summary>
        private static GameObject ScrimOf(Transform card) => card.parent.gameObject;

        private static Transform MakeRowsContainer(Transform panel)
        {
            var go = new GameObject("Rows", typeof(RectTransform));
            go.transform.SetParent(panel, false);

            var rect = (RectTransform)go.transform;
            rect.anchorMin = new Vector2(0f, 0f);
            rect.anchorMax = new Vector2(1f, 1f);
            rect.offsetMin = new Vector2(30f, 140f);
            rect.offsetMax = new Vector2(-30f, -100f);

            var layout = go.AddComponent<VerticalLayoutGroup>();
            layout.spacing = 6f;
            layout.childForceExpandHeight = false;
            layout.childControlHeight = false;
            layout.childForceExpandWidth = true;
            layout.childControlWidth = true;

            return go.transform;
        }

        /// <summary>
        /// Full-screen vertical wash behind a menu. Built from the Kenney gradient sprite
        /// if one imported, otherwise a flat tint — either way it stops the screen from
        /// being the camera's raw clear colour, which is the flattest possible look.
        /// Sits first in the hierarchy so everything else draws over it.
        /// </summary>
        private static Image MakeBackdrop(Transform parent)
        {
            var go = new GameObject("Backdrop", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            go.transform.SetAsFirstSibling();

            var rect = (RectTransform)go.transform;
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = Vector2.zero;
            rect.offsetMax = Vector2.zero;

            var image = go.AddComponent<Image>();
            image.color = new Color(0.055f, 0.065f, 0.095f, 1f);
            image.raycastTarget = false;

            // A thin band of the four brand colours pinned to the very bottom edge. It
            // reads as a horizon accent rather than as UI, and it stops the lower edge of
            // the screen being a hard cut without needing any painted art.
            //
            // Kept to the bottom 4% and low alpha on purpose: at 34% height these were
            // four opaque rectangles filling the lower third of the screen, which looked
            // like a rendering fault rather than a glow.
            Color[] brand = { GoogleBlue, GoogleRed, GoogleYellow, GoogleGreen };
            for (int i = 0; i < brand.Length; i++)
            {
                var band = new GameObject($"Glow{i}", typeof(RectTransform));
                band.transform.SetParent(go.transform, false);

                var bandRect = (RectTransform)band.transform;
                bandRect.anchorMin = new Vector2(i / (float)brand.Length, 0f);
                bandRect.anchorMax = new Vector2((i + 1) / (float)brand.Length, 0.04f);
                bandRect.offsetMin = Vector2.zero;
                bandRect.offsetMax = Vector2.zero;

                var bandImage = band.AddComponent<Image>();
                bandImage.color = new Color(brand[i].r, brand[i].g, brand[i].b, 0.85f);
                bandImage.raycastTarget = false;
            }
            return image;
        }

        /// <summary>
        /// The four Google brand colours as a thin rule. One unmistakable brand cue that
        /// costs four quads and no art, and it is the element that makes the screen read
        /// as Google's rather than as a generic dark theme.
        /// </summary>
        private static void MakeBrandRule(Transform parent, Vector2 offset, float width)
        {
            var go = new GameObject("BrandRule", typeof(RectTransform));
            go.transform.SetParent(parent, false);

            var rect = (RectTransform)go.transform;
            rect.anchorMin = new Vector2(0.5f, 1f);
            rect.anchorMax = new Vector2(0.5f, 1f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = offset;
            rect.sizeDelta = new Vector2(width, 5f);

            Color[] brand = { GoogleBlue, GoogleRed, GoogleYellow, GoogleGreen };
            float segment = width / brand.Length;

            for (int i = 0; i < brand.Length; i++)
            {
                var seg = new GameObject($"Seg{i}", typeof(RectTransform));
                seg.transform.SetParent(go.transform, false);

                var segRect = (RectTransform)seg.transform;
                segRect.anchorMin = new Vector2(0f, 0f);
                segRect.anchorMax = new Vector2(0f, 1f);
                segRect.pivot = new Vector2(0f, 0.5f);
                segRect.anchoredPosition = new Vector2(i * segment, 0f);
                segRect.sizeDelta = new Vector2(segment, 0f);

                var img = seg.AddComponent<Image>();
                img.color = brand[i];
                img.raycastTarget = false;
            }
        }

        /// <summary>
        /// The "GDG GO!" title, built as layered TMP rather than as art.
        ///
        /// A runner's title is heavy, outlined and slightly tilted; TMP gives the outline
        /// and the weight for free, and layering a dark copy behind an offset bright copy
        /// fakes the extruded drop that the reference sheets get from painted art. When
        /// real 2D art lands this is the single object to swap for an Image.
        /// </summary>
        private static void MakeWordmark(Transform parent, Vector2 offset)
        {
            var holder = new GameObject("Wordmark", typeof(RectTransform));
            holder.transform.SetParent(parent, false);

            var rect = (RectTransform)holder.transform;
            rect.anchorMin = new Vector2(0.5f, 1f);
            rect.anchorMax = new Vector2(0.5f, 1f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = offset;
            rect.sizeDelta = new Vector2(560f, 96f);
            // A few degrees of tilt is most of what separates a game logo from a heading.
            rect.localRotation = Quaternion.Euler(0f, 0f, -3f);

            MakeWordmarkLayer(holder.transform, "Shadow", new Vector2(5f, -6f), new Color(0f, 0f, 0f, 0.55f), 0f);
            MakeWordmarkLayer(holder.transform, "Face", Vector2.zero, new Color(0.996f, 0.804f, 0.106f), 0.28f);

            holder.AddComponent<UI.UIAnimator>().motion = UI.UIAnimator.Motion.Bob;
        }

        private static void MakeWordmarkLayer(Transform parent, string name, Vector2 offset, Color color, float outline)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);

            var rect = (RectTransform)go.transform;
            rect.anchorMin = Vector2.zero;
            rect.anchorMax = Vector2.one;
            rect.offsetMin = new Vector2(offset.x, offset.y);
            rect.offsetMax = new Vector2(offset.x, offset.y);

            var label = go.AddComponent<TextMeshProUGUI>();
            label.text = "GDG GO!";
            label.fontSize = 86f;
            label.alignment = TextAlignmentOptions.Center;
            label.color = color;
            label.characterSpacing = 6f;
            label.textWrappingMode = TextWrappingModes.NoWrap;
            label.raycastTarget = false;
            label.fontStyle = FontStyles.Bold;
            if (outline > 0f)
            {
                label.outlineWidth = outline;
                label.outlineColor = new Color32(20, 24, 40, 255);
            }

            TMP_FontAsset font = FontSetup.Display();
            if (font != null) label.font = font;
        }

        /// <summary>Upgrades a button's animation to the breathing primary-action pulse.</summary>
        private static void SetPulse(Button button)
        {
            if (button == null) return;
            var animator = button.GetComponent<UI.UIAnimator>();
            if (animator != null) animator.motion = UI.UIAnimator.Motion.PulseButton;
        }

        /// <summary>Overrides the caption size on a button built by <see cref="MakeButton"/>.</summary>
        private static void SetLabelSize(Button button, float size)
        {
            if (button == null) return;
            var label = button.GetComponentInChildren<TMP_Text>(true);
            if (label != null) label.fontSize = size;
        }

        private static Image MakeLogo(Transform parent, Vector2 offset, float width, Vector2 anchor = default)
        {
            if (anchor == default) anchor = new Vector2(0.5f, 0.5f);

            var go = new GameObject("Logo", typeof(RectTransform));
            go.transform.SetParent(parent, false);

            var rect = (RectTransform)go.transform;
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = anchor;
            rect.anchoredPosition = offset;
            // GDG_LOGO.png measures 1221x204, so its true aspect is 0.167. Plus a little
            // vertical padding for the plate's margin. Guessing this leaves the mark
            // floating in a tall empty band.
            rect.sizeDelta = new Vector2(width, width * 0.167f + 28f);

            // The supplied logo is the full lockup in dark ink, so on a dark backdrop it
            // is nearly invisible. Sit it on a rounded light plate — the same treatment a
            // real brand sheet uses for dark backgrounds, and it doubles as the card the
            // title block sits on.
            var plate = go.AddComponent<Image>();
            plate.sprite = LoadSprite("Assets/UI/KenneyUI/panel_rectangle.png");
            plate.type = Image.Type.Sliced;
            plate.color = new Color(0.97f, 0.97f, 0.98f, 1f);
            plate.raycastTarget = false;

            var logoGo = new GameObject("LogoImage", typeof(RectTransform));
            logoGo.transform.SetParent(go.transform, false);
            var logoRect = (RectTransform)logoGo.transform;
            logoRect.anchorMin = Vector2.zero;
            logoRect.anchorMax = Vector2.one;
            // Inset so the plate reads as a margin around the mark.
            logoRect.offsetMin = new Vector2(18f, 14f);
            logoRect.offsetMax = new Vector2(-18f, -14f);

            var image = logoGo.AddComponent<Image>();
            image.sprite = LoadSprite("Assets/UI/GDG/GDG_LOGO.png");
            image.preserveAspect = true;
            image.raycastTarget = false;
            return plate;
        }

        private static TMP_Text MakeLabel(Transform parent, string name, string text, float size,
                                          Vector2 anchor, Vector2 offset, TextAlignmentOptions alignment,
                                          Color? color = null)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);

            var rect = (RectTransform)go.transform;
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = offset;
            rect.sizeDelta = new Vector2(720f, size * 1.6f);

            var label = go.AddComponent<TextMeshProUGUI>();
            label.text = text;
            label.fontSize = size;
            label.alignment = alignment;
            label.color = color ?? Color.white;

            // Big text is a heading and gets the display face; small text is prose and
            // gets the readable one. Kenney Future's lowercase is small-caps, so using it
            // for a status line or a placeholder makes the UI look like it is shouting.
            TMP_FontAsset font = size >= 32f ? FontSetup.Display() : FontSetup.Body();
            if (font != null) label.font = font;
            return label;
        }

        private static Button MakeButton(Transform parent, string name, string caption,
                                         Vector2 anchor, Vector2 offset, Color? tint = null, Vector2 size = default)
        {
            if (size == default) size = new Vector2(340f, 62f);

            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);

            var rect = (RectTransform)go.transform;
            rect.anchorMin = anchor;
            rect.anchorMax = anchor;
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = offset;
            rect.sizeDelta = size;

            Color fill = tint ?? ButtonInk;

            var image = go.AddComponent<Image>();
            // "_depth" carries a baked bottom bevel, which is what gives the chunky
            // moulded-plastic look of a mobile runner's menu rather than a flat swatch.
            image.sprite = LoadSprite("Assets/UI/KenneyUI/button_rectangle_depth.png");
            image.type = Image.Type.Sliced;
            image.color = fill;

            var button = go.AddComponent<Button>();

            // Scale/squash response. uGUI's own transition only tints, which reads as an
            // acknowledgement rather than as pressing a physical object.
            go.AddComponent<UI.UIAnimator>().motion = UI.UIAnimator.Motion.Button;

            // Explicit colour states. Unity's defaults tint toward white, which washes a
            // saturated brand colour out to pastel on hover; scaling the fill instead
            // keeps the hue and just changes its value.
            button.targetGraphic = image;
            var colors = button.colors;
            colors.normalColor = Color.white;                       // multiplied against image.color
            colors.highlightedColor = new Color(1.12f, 1.12f, 1.12f, 1f);
            colors.pressedColor = new Color(0.86f, 0.86f, 0.86f, 1f);
            colors.selectedColor = Color.white;
            colors.disabledColor = new Color(0.5f, 0.5f, 0.5f, 0.6f);
            colors.fadeDuration = 0.08f;
            button.colors = colors;

            var labelGo = new GameObject("Label", typeof(RectTransform));
            labelGo.transform.SetParent(go.transform, false);
            var labelRect = (RectTransform)labelGo.transform;
            labelRect.anchorMin = Vector2.zero;
            labelRect.anchorMax = Vector2.one;
            labelRect.offsetMin = Vector2.zero;
            labelRect.offsetMax = Vector2.zero;

            var label = labelGo.AddComponent<TextMeshProUGUI>();
            label.text = caption;
            label.fontSize = 28f;
            label.alignment = TextAlignmentOptions.Center;
            label.color = Color.white;
            label.characterSpacing = 4f;   // Kenney Future is condensed; tracking helps it breathe
            label.textWrappingMode = TextWrappingModes.NoWrap;
            label.raycastTarget = false;   // the Image handles the click
            // Button captions are short and already uppercase, which is what Kenney
            // Future is good at.
            TMP_FontAsset font = FontSetup.Display();
            if (font != null) label.font = font;

            return button;
        }

        private static TMP_InputField MakeInput(Transform parent, string name, string placeholder,
                                                Vector2 offset, bool password = false, float width = 480f)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);

            var rect = (RectTransform)go.transform;
            rect.anchorMin = new Vector2(0.5f, 0.5f);
            rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = offset;
            rect.sizeDelta = new Vector2(width, 56f);

            var image = go.AddComponent<Image>();
            image.sprite = LoadSprite("Assets/UI/KenneyUI/panel_rectangle.png");
            image.type = Image.Type.Sliced;
            image.color = FieldInk;

            // TMP_InputField needs a viewport plus a text component to drive.
            var viewport = new GameObject("TextArea", typeof(RectTransform));
            viewport.transform.SetParent(go.transform, false);
            var viewportRect = (RectTransform)viewport.transform;
            viewportRect.anchorMin = Vector2.zero;
            viewportRect.anchorMax = Vector2.one;
            viewportRect.offsetMin = new Vector2(16f, 6f);
            viewportRect.offsetMax = new Vector2(-16f, -6f);
            viewport.AddComponent<RectMask2D>();

            // Body face, always. This is where the player types their username, and
            // Kenney Future's small-caps lowercase would render "karan1908" as "KARAN1908"
            // no matter what they actually typed.
            TMP_FontAsset font = FontSetup.Body();

            var textGo = new GameObject("Text", typeof(RectTransform));
            textGo.transform.SetParent(viewport.transform, false);
            var textRect = (RectTransform)textGo.transform;
            textRect.anchorMin = Vector2.zero;
            textRect.anchorMax = Vector2.one;
            textRect.offsetMin = Vector2.zero;
            textRect.offsetMax = Vector2.zero;
            var text = textGo.AddComponent<TextMeshProUGUI>();
            text.fontSize = 26f;
            text.color = Color.white;
            if (font != null) text.font = font;

            var placeholderGo = new GameObject("Placeholder", typeof(RectTransform));
            placeholderGo.transform.SetParent(viewport.transform, false);
            var placeholderRect = (RectTransform)placeholderGo.transform;
            placeholderRect.anchorMin = Vector2.zero;
            placeholderRect.anchorMax = Vector2.one;
            placeholderRect.offsetMin = Vector2.zero;
            placeholderRect.offsetMax = Vector2.zero;
            var placeholderLabel = placeholderGo.AddComponent<TextMeshProUGUI>();
            placeholderLabel.text = placeholder;
            placeholderLabel.fontSize = 26f;
            placeholderLabel.color = new Color(1f, 1f, 1f, 0.4f);
            if (font != null) placeholderLabel.font = font;

            var input = go.AddComponent<TMP_InputField>();
            input.textViewport = viewportRect;
            input.textComponent = text;
            input.placeholder = placeholderLabel;
            input.characterLimit = 32;
            if (password)
            {
                input.contentType = TMP_InputField.ContentType.Password;
                input.inputType = TMP_InputField.InputType.Password;
            }

            return input;
        }


        /// <summary>
        /// TMP's default font, or null if TextMeshPro has not been set up yet.
        ///
        /// <c>TMP_Settings.defaultFontAsset</c> looks like a safe null-returning property
        /// but its getter is <c>instance.m_defaultFontAsset</c> with no null check, so it
        /// throws a NullReferenceException whenever TMP Essential Resources have not been
        /// imported. That is a one-time manual step in a fresh project, so the very first
        /// run of the setup would otherwise die here and take the rest of the build with
        /// it. Returning null instead lets every screen still get built; TMP falls back to
        /// its own default font once the essentials are imported.
        /// </summary>
        public static TMPro.TMP_FontAsset SafeDefaultFont()
        {
            try
            {
                return TMP_Settings.defaultFontAsset;
            }
            catch (System.Exception)
            {
                if (!_warnedAboutTmp)
                {
                    _warnedAboutTmp = true;
                    Debug.LogWarning(
                        "[GDG Go] TextMeshPro Essential Resources are not imported, so UI text " +
                        "has no font assigned. Fix it once via Window > TextMeshPro > " +
                        "Import TMP Essential Resources, then re-run \"GDG Go > Run Full Project Setup\".");
                }
                return null;
            }
        }
        private static bool _warnedAboutTmp;

        private static Sprite LoadSprite(string path)
        {
            var sprite = AssetDatabase.LoadAssetAtPath<Sprite>(path);
            if (sprite == null)
                Debug.LogWarning($"[UIScreenBuilder] {path} is not imported as a Sprite. " +
                                 "Select it in the Project window and set Texture Type = Sprite (2D and UI).");
            return sprite;
        }
    }
}
