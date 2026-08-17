# Plan - Website-shells-the-game split

## Goal

ONE React site. Unity runs only the gameplay in an iframe on the home page.
The player never sees Unity UI for meta-flow: login, signup, car select,
result screen, and leaderboard all live in the React site. Unity ships
game-only (Game scene + Game scene's own AudioManager). When the player
dies, Unity posts a message to the site and the site owns the post-game UX.

## Decisions (user-confirmed)

- Stack: React + Vite SPA in web-hosting/. Netlify publishes dist/.
- Unity scope: WebGL build contains the Game scene ONLY. Boot, Menu,
  CarSelect, GameOver scenes are cut. AudioManager moves INTO the Game
  scene (it currently lives in Boot via DontDestroyOnLoad; the only reason
  for Boot was hosting it across scene transitions - we no longer
  transition).
- Auth boundary: Site owns the session. React logs the player in via
  Supabase, holds the JWT in localStorage, passes it to the Unity iframe
  via URL query param. Unity never logs in.
- Score submission: Auto-submit on gameover, parity with today's
  behaviour. Unity reports game-over via postMessage; the site POSTs the
  score immediately. The Unity build no longer contains ScoreAPI calls.
- Car selection: Site renders a /cars-free picker (it's just part of the
  home page pre-game flow), passes the chosen car id via iframe URL.
  PlayerCarSkin reads the query param first, falls back to PlayerPrefs,
  then the first skin.
- Single route beyond home: ONLY /leaderboard. No /login, /signup, /cars,
  /play routes. Login and signup are in-page modals on home; the play
  iframe IS home after auth; /leaderboard is the one other route.

## Architecture after the split

```
            ┌────────────────────────────────────────────────────────────┐
            │  React SPA (Vite), two routes: '/' and '/leaderboard'    │
            │                                                          │
            │  /  (home, gated by auth)                                │
            │   - in-page modal: Login OR Signup (Supabase JS SDK)     │
            │   - in-page: Car picker (hand-maintained TS list,        │
            │     mirrors PlayerCarSkin.skins[])                       │
            │   - PLAY button -> mounts <UnityEmbed> (the iframe)      │
            │   - iframe src: /Build/index.html                        │
            │       ?token=<jwt>&u=<username>&dn=<display>&car=<id>    │
            │   - listens for postMessage('gameover', payload)         │
            │   - on message: POST score immediately, show result      │
            │     overlay, offer: Play Again / Leaderboard / Sign out   │
            │                                                          │
            │  /leaderboard   Top-100 + your row + sign out (read)    │
            │                                                          │
            │  Supabase JS SDK: anon key + JWT in localStorage         │
            └────────────────────────┬─────────────────────────────────┘
                                     │  fetch / postMessage / REST
                ┌────────────────────┴────────────────────┐
                │                                         │
        ┌───────▼────────┐                       ┌────────▼─────────┐
        │  Supabase REST │  ←── site writes      │  Unity WebGL     │
        │  (auth + DB)   │                       │  (game-only)     │
        └────────────────┘                       └──────────────────┘
                                                     │
                                                     │  postMessage:
                                                     │   {type:'gameover',
                                                     │    score, coins,
                                                     │    distance, duration}
                                                     ▼
                                              site auto-POSTs score
```

The SQL triggers (stamp_score_identity, plausibility bounds, rate limit)
apply identically whether a request comes from UnityWebRequest or fetch,
so the data layer does not change. The site's POST uses the JWT the same
SQL row-level security + trigger machinery already validates today.

## Concrete changes

### 1. New web-hosting/ SPA (Vite + React + TS)

Layout (small):

  web-hosting/
    index.html                Vite entry, <div id="root"></div>
    package.json              scripts: dev, build, unity:copy
    tsconfig.json
    vite.config.ts            base: '/'
    netlify.toml              [build] command=npm run build, publish=dist
                              (existing Content-Encoding rules stay)
    src/
      main.tsx
      App.tsx                 <BrowserRouter>, two routes
      lib/
        supabase.ts           createClient(url, anonKey)
        api.ts                submitScore(), fetchLeaderboard()
      context/
        AuthContext.tsx       JWT in localStorage, current user, signOut
      data/
        cars.ts               hand-maintained: [{id, displayName, thumb}]
      home/
        Home.tsx              gate (auth modal) -> car picker -> Play
        AuthModal.tsx         Login/Signup toggle, supabase.auth signs in
        CarPicker.tsx         renders cars[], writes chosen id to state
        GameView.tsx          mounts <UnityEmbed>, listens for gameover,
                              POSTs score, shows result overlay
        ResultOverlay.tsx     final readouts + Play Again / Leaderboard /
                              Sign out buttons
      leaderboard/
        Leaderboard.tsx       Top-100 + your row
      components/
        Navbar.tsx            logo + auth state + Logout + Leaderboard link
        UnityEmbed.tsx        <iframe src='/Build/index.html?token=...'>
      styles/
        globals.css           Google palette
    public/
      Build/                  Unity WebGL output (copied via unity:copy)

UnityEmbed.tsx:

  export function UnityEmbed({ token, username, displayName, carId }) {
    const src = `/Build/index.html?token=${encodeURIComponent(token)}`
              + `&u=${encodeURIComponent(username)}`
              + `&dn=${encodeURIComponent(displayName)}`
              + `&car=${encodeURIComponent(carId)}`;
    return <iframe src={src} allowFullScreen
                   style={{ width:'100%', height:'100%', border:0 }} />;
  }

GameView listens via useEffect:

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.type !== 'gameover') return;
      submitScore(e.data).then(() => setShowResult(true));
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

The site auto-submits on receipt. The result overlay then offers Play
Again (re-mounts iframe), Leaderboard (route), Sign out.

netlify.toml [build] switches from publish='.' to:

  [build]
    command = "npm run build"
    publish = "dist"

(other existing rules stay).

package.json scripts:

  {
    "unity:copy": "rm -rf public/Build && cp -R ../unity-project/Build public/Build",
    "build": "npm run unity:copy && vite build",
    "dev": "vite"
  }

Auth flow in JS (mirrors what AuthAPI.SignUp/SignIn do today):

- AuthModal Signup tab:
    supabase.auth.signUp({ email, password })  // synthetic
                                              // <username>@gdg-go.local
    then a second INSERT into public.users via REST with the new user's
    access_token: { id, username, display_name }. Surface 409 on
    duplicate username.
- AuthModal Login tab:
    supabase.auth.signInWithPassword({ email, password })
    then fetch display_name from public.users.
- AuthContext exposes { session, user, signOut }. signOut() calls
  supabase.auth.signOut() then resets to home with the auth modal.

submitScore():

  // src/lib/api.ts
  export async function submitScore(p) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not signed in');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        score: p.score, coins: p.coins,
        distance: p.distance, duration_seconds: p.duration,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
  }

fetchLeaderboard():

  export async function fetchLeaderboard(limit = 100) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/scores?select=username,display_name,score,coins,distance,created_at&order=score.desc,created_at.asc&limit=${limit}`,
      { headers: { apikey: SUPABASE_ANON_KEY,
                   Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    return res.json();
  }

Verified: 0001_init.sql has 'public read scores' policy for SELECT using
(true), so the anon key + bearer can read the leaderboard. The site does
not need an authenticated session to render /leaderboard, but the
'your row' highlight still relies on AuthContext for the user's id.

cars.ts (hand-maintained, mirrors PlayerCarSkin.skins[]):

  export const CARS = [
    { id: 'SportsCar', displayName: 'Sports Car', thumb: '/cars/sport.jpg' },
    { id: 'SUV',       displayName: 'SUV',        thumb: '/cars/suv.jpg' },
    { id: 'Taxi',      displayName: 'Taxi',       thumb: '/cars/taxi.jpg' },
  ];
  // KEEP IN SYNC with the Skin[] array serialized on
  // unity-project/Assets/Prefabs/Player.prefab's PlayerCarSkin component.
  // Drift here means /cars offers a choice Unity ignores.

Thumbnails: copy 3 small PNGs from unity-project/Assets/UI/KenneyUI/ or
render offline from the existing Kenney car sprites. Stick under
web-hosting/src/assets/cars/ and reference from CARS[]. Per the project's
'everything from packs except coin materials' rule this is fine - they're
just preview thumbs, not gameplay.

### 2. Unity-side changes

Build becomes two scenes -> one scene (Game only).

Cut from Build Settings:
  - Boot.unity
  - Menu.unity
  - CarSelect.unity
  - GameOver.unity

Resulting build = [Game.unity] alone.

Audio manager: move into the Game scene.

Today the AudioManager GameObject lives in Boot.unity, clip-wired via the
AudioSetup editor menu, and survives scene loads via DontDestroyOnLoad.
With only one scene in the build and no transitions, Game.unity needs its
own AudioManager GameObject with the same 13 clips wired. Add the
AudioManager prefab to the Game scene (or have GameSession.Awake ensure
one exists if missing, similar to GameManager's bootstrap pattern). The
DontDestroyOnLoad behavior becomes a no-op (only one scene), harmless.

Editor side: AudioSetup needs to wire clips into the Game scene's
AudioManager instead of Boot's. Update AudioSetup.SetupAll() or rerun via
'GDG Go > 5. Assign Audio Clips' once AudioManager is relocated.

Delete scenes (file removal):

  unity-project/Assets/Scenes/Boot.unity         + .meta
  unity-project/Assets/Scenes/Menu.unity         + .meta
  unity-project/Assets/Scenes/CarSelect.unity    + .meta
  unity-project/Assets/Scenes/GameOver.unity     + .meta

(Boot's meta references get cleaned up automatically; verify no other
asset GUID-references Boot.unity - run
  grep -rn "b38df4f7a56d24cd9856d1e7f4d1b1a0\|7ff6caea31fba433f8ee67a4b57bcae9\|0c8c3e201a4154b59b88c606225e6458\|da5dbc18ac20245bfb2374d813315652" unity-project/Assets
before deleting to catch any prefab/scene that links back. Adjust those
references first.)

Delete now-orphaned UI scripts (only call sites were in the deleted scenes):

  unity-project/Assets/Scripts/UI/LoginScreen.cs       + .meta
  unity-project/Assets/Scripts/UI/SignupScreen.cs      + .meta
  unity-project/Assets/Scripts/UI/MenuScreen.cs        + .meta
  unity-project/Assets/Scripts/UI/CarSelectScreen.cs   + .meta
  unity-project/Assets/Scripts/UI/LeaderboardPanel.cs  + .meta
  unity-project/Assets/Scripts/UI/LeaderboardRow.cs    + .meta
  unity-project/Assets/Scripts/UI/GameOverScreen.cs    + .meta   (cut, replaced by GameSession reporting on death)
  unity-project/Assets/Scripts/UI/UIAnimator.cs        + .meta   (cut if no HUD caller; verify)

Verify no other references:

  grep -rn "LoginScreen\|SignupScreen\|MenuScreen\|CarSelectScreen\|LeaderboardPanel\|LeaderboardRow\|GameOverScreen\|UIAnimator" unity-project/Assets/Scripts/

Also delete in Editor (UIScreenBuilder builds these scenes; with the scenes
gone it's dead code):

  unity-project/Assets/Editor/UIScreenBuilder.cs       + .meta

And its output prefab that no longer ships:

  unity-project/Assets/Prefabs/UI/LeaderboardRow.prefab + .meta

Verify 'GDG Go > 4. Build UI Scenes' menu item is removed (it lived in
UIScreenBuilder) and that ProjectSetup no longer calls
UIScreenBuilder.BuildScenes - update those calls if found.

Keep in the Game scene:
  unity-project/Assets/Scripts/UI/HUD.cs     - in-game HUD (score/distance/fuel)

Rewrite GameSession.EndGame() to report to the host instead of loading
GameOver scene:

  Today:
    public void EndGame() { ... SceneManager.LoadScene('GameOver'); }

  New:
    public void EndGame() {
        LastScore = score; LastCoins = coins; LastMeters = meters;
        LastDurationSeconds = ...;
        AudioManager.Instance?.PlayGameOver();
        ReportGameOverToHost(score, coins, meters, duration);
        // Optionally: Pause the game, freeze input, show an in-canvas
        // 'game over - waiting for site' indicator, wait for the site
        // to send 'play again' or close the iframe.
    }

    private void ReportGameOverToHost(int s, int c, int m, int d) {
        string json = JsonUtility.ToJson(new GameOverReport {
            type = "gameover",
            score = s, coins = c, distance = m, duration = d
        });
    #if UNITY_WEBGL && !UNITY_EDITOR
        Application.ExternalEval(
          $"window.parent.postMessage({json}, '*')");
    #endif
    }

Site-side response to 'play again' can reload the iframe (React
unmounts + remounts UnityEmbed, which restarts the WebGL build), so Unity
does not need its own restart button - the result overlay's 'Play Again'
button handles it from outside.

Receives session + car from iframe URL query.

Edit:

  unity-project/Assets/Scripts/Supabase/SupabaseSession.cs:
    + public string Jwt { get; private set; }
    + public string Username { get; private set; }
    + public string DisplayName { get; private set; }
    + public void InitFromUrlQuery() {
    +   Jwt         = QueryString("token");
    +   Username    = QueryString("u");
    +   DisplayName = QueryString("dn");
    + }

(QueryString implementation: Unity offers Application.absoluteURL which
contains the iframe URL with query string - parse with Uri.Builder in C#.
VERIFY EXACT API against real Unity via unity_reflect before writing; the
double-encoded iframe URL needs careful unescaping.)

  unity-project/Assets/Scripts/Gameplay/PlayerCarSkin.cs:
    in Awake(), before the PlayerPrefs fallback:
    + string fromUrl = SupabaseSession.Instance?.CarId;
    + string selected = !string.IsNullOrEmpty(fromUrl)
    +     ? fromUrl
    +     : PlayerPrefs.GetString(UI.CarSelectScreen.PlayerPrefsKey,
    +                              skins[0].id);

(This is the only edit to PlayerCarSkin; CarSelectScreen is being deleted,
but its PlayerPrefsKey constant is referenced here - move the constant
into PlayerCarSkin itself or a dedicated static class before deleting
CarSelectScreen, so the fallback still compiles.)

GameManager cuts:

  - Delete LoadMenu, LoadCarSelect, LoadGameOver, QuitToBoot methods and
    their SceneBoot/SceneMenu/SceneCarSelect/SceneGameOver constants
    (keep SceneGame since GameSession calls SceneManager.LoadScene to
    handle site-initiated restart, OR rely on iframe remount for restart
    and delete even LoadGame - decide based on whether GameView can fully
    restart by unmounting the iframe).
  - Delete the Boot-scene auto-route in Start() (no Boot scene).
  - Delete the EnsureService<SupabaseSession>() call in Awake() and
    replace with: in GameSession.Awake or GameManager.Awake, call
    SupabaseSession.Instance.InitFromUrlQuery() once.

Supabase C# code that is orphaned:

  unity-project/Assets/Scripts/Supabase/AuthAPI.cs        - cut, no caller
  unity-project/Assets/Scripts/Supabase/ScoreAPI.cs       - cut, no caller
  unity-project/Assets/Scripts/Supabase/SupabaseTypes.cs  - keep only if
    GameSession / SupabaseSession reference any type from it (audit
    first). If unused, cut.
  unity-project/Assets/Scripts/Supabase/SupabaseConfig.cs
    - keep the ScriptableObject since SupabaseSession may still need
    anon key for any direct REST (question: does Unity still call
    Supabase after this split? If only the site talks to Supabase,
    SupabaseConfig is unused in the WebGL build and can be cut. If Unity
    needs it for e.g. car thumbnails or telemetry, keep.)
  unity-project/Assets/Resources/SupabaseConfig.asset
    - same audit as above; removed from build if SupabaseConfig cut.

If the WebGL build no longer references Supabase from C# at all, this is
a big size win for the 25MB brotli budget. Audit by grep on the
Supabase namespace after the cuts:

  grep -rn "Supabase" unity-project/Assets/Scripts/

If the only references are SupabaseSession reading the query params,
SupabaseConfig + AuthAPI + ScoreAPI + SupabaseTypes can all be cut.

### 3. Build settings + WebGL template

- File > Build Settings: scenes = [Game] only.
- WebGL template = Default (the loader HTML is fine; we don't need
  unityInstance for postMessage - Application.ExternalEval just runs JS in
  the iframe and targets window.parent directly).
- WebGL template index.html: stock, unchanged.

### 4. Postbuild wiring

See package.json scripts above. Netlify runs npm run build, which copies
unity-project/Build/ to web-hosting/public/Build/ and then Vite produces
dist/ containing both the SPA's hashed bundle and the Unity drop.

## Verification gate

Stop and inspect when each of these is true. None claim 'fixed' without
running them.

- Compile-check:
    export PATH="$HOME/.dotnet:$HOME/.dotnet/tools:$PATH"
    dotnet build tools/compile-check/GDGGo.CompileCheck.csproj
  -> 0 errors / 0 warnings. Fails loudly if any scene/script cut left a
  dangling reference.
- Reference audit:
    grep -rn "LoginScreen\|SignupScreen\|MenuScreen\|CarSelectScreen\|\
      LeaderboardPanel\|LeaderboardRow\|GameOverScreen\|UIScreenBuilder\|\
      LoadMenu\|LoadCarSelect\|LoadGameOver\|QuitToBoot" \
      unity-project/Assets/
  returns nothing.
- Scene audit: Build Settings list = [Game]. Boot/Menu/CarSelect/GameOver
  are deleted from disk (not just unticked).
- Editor log clean after rebuild: no CS errors from cut agents.
- Unity WebGL build emits unity-project/Build/ at size in budget: <= 25 MB
  brotli. (Stripping Supabase C# + 4 scenes should help; if over budget,
  add an Addressables / asset audit, out of scope here.)
- SPA build:
    cd web-hosting && npm install && npm run build
  completes; dist/index.html + dist/Build/index.html both present.
- Manual smoke (local server):
    npx serve web-hosting/dist
  -> site loads. Open the auth modal, sign up, sign in (Supabase
  project must be reachable). Pick a car. Click PLAY. Crashing the car
  in the game fires a gameover postMessage; the site receives it, POSTs
  the score to /rest/v1/scores, and the new row appears if you navigate
  to /leaderboard. Click 'Play Again' - the iframe remounts and a new
  run starts.
- Cross-check UnityEndGame postMessage actually reaches the parent:
  open browser devtools on the SPA, watch for the message event in the
  console listener. If Application.ExternalEval double-encodes the JSON,
  switch to SendMessage('unityInstance', ...) -> JS bridge - but
  ExternalEval should suffice and matches Unity docs.

## Out of scope (deliberately)

- Netlify Function for short-lived Unity tokens. JWT in iframe URL is
  fine because site and iframe share an origin (both served by the React
  app on Netlify). Harden later if needed.
- React component library / Tailwind. Plain CSS + Google brand palette +
  Kenney UI sprite accents where needed.
- Profile pages, achievements, friends, history.
- Per-run replay submission or server-authoritative simulation - the
  existing plausibility bounds + rate limit in 0002_score_integrity.sql
  are the integrity layer, unchanged.
- WebGL build size optimization beyond what the scene/script cuts
  naturally yield.
- Music in the Unity build - existing behaviour (musicLoop null, PlayMusic
  no-ops) stays. The site may play its own backing music via an <audio>
  element later; not in scope here.

## Risks (implementer owns these)

1. Application.ExternalEval targeting window.parent from inside an
   iframe: verify the postMessage payload reaches the SPA. The iframe
   loads /Build/index.html from the same origin, so same-origin security
   allows it. If ExternalEval double-encodes JSON, fall back to a minimal
   .jslib SendMessage bridge (a 10-line JS function that calls
   window.parent.postMessage with the JSON string). Per CLAUDE.md the
   project intentionally avoids .jslib, so try ExternalEval first.
2. Boot.unity GUID references: before deleting, grep project for the four
   scene GUIDs (Boot, Menu, CarSelect, GameOver). Some prefab or script
   could reference a scene by GUID via SceneAsset (rare but possible).
3. PlayerPrefKey const lives on CarSelectScreen (being deleted). Move
   the const somewhere permanent (PlayerCarSkin itself or a new
   GDGGo.Core.Keys static class) before deleting CarSelectScreen, or the
   fallback line in PlayerCarSkin won't compile.
4. AudioManager in the Game scene: AudioClip assignments are not
   deterministic across script reloads. Re-run 'GDG Go > 5. Assign Audio
   Clips' from the editor menu after relocating AudioManager to Game, or
   wire clip references in a small editor helper.
5. QueryString parsing in WebGL: Application.absoluteURL returns the full
   URL including query in iframe builds but may differ across Unity
   versions. Verify against the actual build (unity_reflect on
   Application.absoluteURL, or write a tiny Debug.Log to confirm
   parsing). Fall back to injecting the query via a tiny bit of JS in
   the WebGL template's index.html that calls SendMessage on load.
6. WebGL iframe focus / input capture: Unity canvas must capture
   keyboard when the iframe is active. Test click-to-focus; ensure the
   iframe has tabIndex or autofocus so WASD/touch input reaches the
   canvas.
7. Build size: stripping 4 scenes + several UI scripts + Supabase C#
   should improve the build, but if HUD.cs pulls in TMP assets at
   runtime the savings may be modest. Confirm after the cut.
8. Car list drift: cars.ts is hand-maintained and mirrors
   PlayerCarSkin.skins[]. Adding a 4th skin in Unity without updating
   cars.ts makes /cars offer a no-op choice. Document at the top of
   cars.ts; consider an editor menu later that emits cars.json at build
   time (out of scope here).

## Files affected

Created:
  web-hosting/{package.json, tsconfig.json, vite.config.ts, index.html}
  web-hosting/src/**
  web-hosting/public/Build/             (gitignored; repopulated by build)
  web-hosting/dist/                      (gitignored; Vite output)
  docs/WEBSITE.md                        (short doc on SPA / hand-off / Supabase)

Modified:
  web-hosting/netlify.toml               publish -> dist
  unity-project/Assets/Scripts/Core/GameManager.cs
    - cut LoadMenu/CarSelect/GameOver/QuitToBoot, Boot route, Boot constants
    - call SupabaseSession.InitFromUrlQuery() once
  unity-project/Assets/Scripts/Core/GameSession.cs
    - EndGame reports to host via Application.ExternalEval postMessage; no
      scene load
  unity-project/Assets/Scripts/Supabase/SupabaseSession.cs
    - add Jwt/Username/DisplayName + InitFromUrlQuery()
  unity-project/Assets/Scripts/Gameplay/PlayerCarSkin.cs
    - read ?car= query first, PlayerPrefs fallback, skins[0] default
    - (move PlayerPrefsKey const in here or to a Keys static class)
  unity-project/Assets/Editor/AudioSetup.cs (or equivalent)
    - wire AudioManager in Game scene instead of Boot
  unity-project/ProjectSettings/EditorBuildSettings.asset
    - scenes = [Game]
  unity-project/Assets/Scenes/Game.unity
    - add AudioManager GameObject (relocated from Boot)
  CLAUDE.md
    - update Architecture facts (#1 about WorldScroller, #8 the cross-scene
      statics, and 'AudioManager is in Boot' note all need the new truth)

Deleted:
  unity-project/Assets/Scenes/{Boot,Menu,CarSelect,GameOver}.unity + .meta
  unity-project/Assets/Scripts/UI/{LoginScreen,SignupScreen,MenuScreen,
    CarSelectScreen,LeaderboardPanel,LeaderboardRow,GameOverScreen,
    UIAnimator}.cs + .meta  (UIAnimator only if HUD doesn't use it)
  unity-project/Assets/Editor/UIScreenBuilder.cs + .meta
  unity-project/Assets/Prefabs/UI/LeaderboardRow.prefab + .meta
  (Optionally, after audit:)
  unity-project/Assets/Scripts/Supabase/{AuthAPI,ScoreAPI,SupabaseTypes,
    SupabaseConfig}.cs + .meta
  unity-project/Assets/Resources/SupabaseConfig.asset + .meta

Not touched:
  unity-project/Assets/Scripts/UI/HUD.cs (in-game HUD, ships with Game)
  All gameplay scripts (CoinSpawner, PowerUpSpawner, RoadScroller, etc.)
  unity-project/Assets/Editor/PrefabsBuilder.cs (prefab/build pipeline)
  unity-project/Assets/Editor/ModelAxisFixer.cs
  unity-project/Assets/Editor/ProjectSetup.cs (update menu item list if
    it references UIScreenBuilder or Boot scene; otherwise unchanged)
  supabase/migrations/*.sql
