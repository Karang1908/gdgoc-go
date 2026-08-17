# Plan - Site-shells-the-game split (React + Vite SPA, game-only WebGL)

## Why

Today the player-facing surface - landing, login, signup, menu, car select,
leaderboard, game over - is a single Unity WebGL blob. The Unity scenes for
Login/Signup/Menu/CarSelect/Leaderboard/GameOver all live inside the WebGL
build, designed in uGUI, and the auth+leaderboard state lives in a Unity
SupabaseSession singleton calling Supabase REST via UnityWebRequest.

The user wants to design the auth/leaderboard UI in CSS (instead of uGUI) and
keep the leaderboard as a real page rather than a TMP_Text scroll view. So
auth + leaderboard move to a React + Vite SPA in web-hosting/, and the
WebGL build becomes a pure gameplay component the SPA embeds after login.

## Decisions (user-confirmed)

- Stack: React + Vite SPA in web-hosting/. netlify.toml switches from
  "just host files" to "run npm run build, publish dist/".
- Unity scope: WebGL build becomes game-only. Strip
  Menu/CarSelect/Leaderboard/GameOver/Login/Signup scenes - Unity only
  ships Boot (persistent AudioManager) + Game (the actual gameplay).
- Auth boundary: Site owns the session. Unity never logs in directly;
  it reads a JWT passed in from the embedding page and posts scores
  against it. The SQL triggers (stamp_score_identity, plausibility bounds,
  rate limit) apply identically whether the request comes from
  UnityWebRequest or fetch, so the data layer does not change.

## Architecture after the split

Browser SPA (React):
  /              marketing / Play now
  /login         username + password
  /signup        username + password + display_name
  /play          iframe Unity WebGL build (gated)
  /leaderboard   Top-100 + your row + sign-out

The SPA talks to Supabase REST via the JS SDK (anon key + JWT in
localStorage). Unity inside /play only reports scores back via
postMessage; the React page does the actual REST POST.

## Concrete changes

### 1. New web-hosting/ SPA (Vite + React + TS)

Layout:
  web-hosting/
    index.html                Vite entry, <div id="root"></div>
    package.json
    tsconfig.json
    vite.config.ts            base: '/' (served at site root on Netlify)
    netlify.toml              build: npm run build, publish: dist
    src/
      main.tsx
      App.tsx                 BrowserRouter + auth guard
      lib/
        supabase.ts           createClient(url, anonKey), session helpers
        api.ts                submitScore(), fetchLeaderboard()
      context/
        AuthContext.tsx       JWT in localStorage, current user, signOut()
      pages/
        Home.tsx              marketing + Play CTA
        Login.tsx
        Signup.tsx
        Play.tsx              mounts Unity iframe, handles game-end message
        Leaderboard.tsx       Top-100 table + your-row highlight
      components/
        Navbar.tsx
        ProtectedRoute.tsx
        UnityEmbed.tsx        <iframe src='/Build/index.html?token=...'>
      styles/
        globals.css           Google palette + Kenney UI accents
    public/
      Build/                  Unity WebGL output lands here via postbuild

public/Build/ is the standard Unity drop. The Vite build copies public/
into dist/ as-is. UnityEmbed.tsx mounts the iframe at
/Build/index.html?token=<jwt>&u=<username>&dn=<displayName>.

netlify.toml rewrite - the file already has the right Content-Encoding
rules for the Unity build, but the [build] block needs to switch from
publish = "." to:

  [build]
    command = "npm run build"
    publish = "dist"

(Rest of the headers rules stay.)

Auth flow (mirrors what AuthAPI.SignUp/SignIn do today, just in JS):

- /signup -> supabase.auth.signUp with synthetic email + password.
  Then INSERT into public.users via REST with the now-logged-in user's
  access_token. Surface 409 cleanly if username is taken (unique index).
- /login -> supabase.auth.signInWithPassword. Read display_name from
  public.users on success.
- AuthContext exposes { session, user, signOut }. ProtectedRoute wraps
  /play and /leaderboard.
- signOut() calls supabase.auth.signOut() and routes back to /.

Score submission from the site:

  // src/lib/api.ts
  export async function submitScore(s) {
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
        score: s.score, coins: s.coins,
        distance: s.distance, duration_seconds: s.duration,
        // username/display_name overwritten by stamp_score_identity trigger
      }),
    });
    if (!res.ok) throw new Error(await res.text());
  }

The SQL trigger stamp_score_identity overwrites username/display_name
from the authenticated public.users row, so client-supplied name forgery
stays impossible. Plausibility bounds + rate limit apply on top. The
Unity code path and the React code path hit the same triggers with the
same JWT - the data layer is unchanged.

Leaderboard read:

  export async function fetchLeaderboard(limit = 100) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/scores?select=username,display_name,score,coins,distance,created_at&order=score.desc,created_at.asc&limit=${limit}`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    );
    return res.json();
  }

(Verify the scores SELECT policy in 0001_init.sql allows anon read for
the leaderboard view - it should, per the existing project notes.)

### 2. Embedding the Unity build

src/components/UnityEmbed.tsx:

  export function UnityEmbed({ token, username, displayName }: Props) {
    const src = `/Build/index.html?token=${encodeURIComponent(token)}`
              + `&u=${encodeURIComponent(username)}`
              + `&dn=${encodeURIComponent(displayName)}`;
    return <iframe src={src} allowFullScreen
                   style={{ width: '100%', height: '100%', border: 0 }} />;
  }

Game-end handshake - Unity calls back into the host page when the run
ends. We will use postMessage:

  window.parent.postMessage(JSON.stringify({
    type: 'gameover',
    score, coins, distance, duration
  }), '*')

The React side listens in a useEffect and calls submitScore() after the
user dismisses the result screen. The Unity build no longer contains
ScoreAPI.InsertScore in its hot path - it just reports.

### 3. Unity-side changes

Delete scenes + scripts (Unity project becomes game-only).

Delete the scenes: Menu.unity, CarSelect.unity, GameOver.unity. (Login
and Signup are TMP canvases inside Menu.unity today; check the build
settings list to confirm.) Strip from File > Build Settings so the
WebGL build only includes Boot + Game.

Delete the now-orphaned UI scripts:
  Assets/Scripts/UI/LoginScreen.cs
  Assets/Scripts/UI/SignupScreen.cs
  Assets/Scripts/UI/MenuScreen.cs
  Assets/Scripts/UI/CarSelectScreen.cs
  Assets/Scripts/UI/LeaderboardPanel.cs
  Assets/Scripts/UI/LeaderboardRow.cs

Verify no other references with:
  grep -r "LoginScreen|SignupScreen|MenuScreen|CarSelectScreen|LeaderboardPanel|LeaderboardRow" unity-project/Assets/Scripts/

Keep:
  Assets/Scripts/UI/HUD.cs (in-game HUD)
  Assets/Scripts/UI/GameOverScreen.cs (refactor - see below)
  Assets/Scripts/UI/UIAnimator.cs (utility)

Rewrite GameOverScreen.cs to report, not submit.

Today it calls ScoreAPI.InsertScore. New behaviour:

  private void OnEnable() {
      int score = GameSession.LastScore;
      int coins = GameSession.LastCoins;
      int meters = GameSession.LastMeters;
      int duration = GameSession.LastDurationSeconds;
      ShowResult(score, coins, meters);
      AudioManager.Instance?.PlayGameOver();
      ReportToHost(score, coins, meters, duration);
  }

  private void ReportToHost(int score, int coins, int meters, int duration) {
      string json = JsonUtility.ToJson(new GameOverReport {
          type = "gameover",
          score = score, coins = coins, distance = meters, duration = duration
      });
      Application.ExternalEval($"window.parent.postMessage({json}, '*')");
  }

  private void OnRetry() { /* restart Game scene */ }
  private void OnExit()  { Application.ExternalEval("window.parent.postMessage(JSON.stringify({type:'exit'}),'*')"); }

GameOverScreen keeps the retry button (restart in-scene, no scene
load) and replaces menu/signOut with Exit to site, which posts a
message so the SPA can unmount the iframe and route back.

Replace SupabaseSession.GetAccessToken() with a query-param reader.

SupabaseConfig.Load() still loads SupabaseConfig.asset (URL + anon
key stay - the WebGL build still needs them for any direct REST it
does). A new SupabaseSession.InitFromUrlQuery() reads ?token=&u=&dn=
from the loader HTML's window.location.search and stores them in
SupabaseSession.Jwt, SupabaseSession.Username,
SupabaseSession.DisplayName.

This is a token-passing model. The JWT is briefly visible in the
iframe URL. That's acceptable for MVP: the JWT is already visible in
the React app's localStorage, and SQL row-level security + plausibility
triggers make a stolen JWT at most equivalent to "submit one extra
fake run" - the same risk the site has today. Harden later with a
short-lived signed-claims token from a Netlify Function if needed.

GameManager stays. RuntimeInitializeOnLoadMethod auto-bootstrap still
matters - a single-scene WebGL build needs GameManager.Instance to
exist so LoadGame() works on retry. LoadMenu/LoadCarSelect/LoadGameOver
methods get deleted (calls compile-break; verify nothing else uses
them after the scene cuts).

### 4. Build settings + WebGL template

- File > Build Settings: scenes = [Boot, Game] only. WebGL template =
  Default (the loader HTML it ships with is fine - we don't need
  unityInstance for Application.ExternalEval, which just runs JS
  inside the iframe context and targets window.parent directly).
- WebGL template index.html: today it's stock; we don't need to edit
  it. Application.ExternalEval already targets window.parent from
  inside the iframe, so the React app receives the message without
  touching Unity's loader HTML.

### 5. Postbuild wiring

Today the developer manually copies unity-project/Build/ ->
web-hosting/Build/. With Vite, automate it:

  // web-hosting/package.json
  "scripts": {
    "unity:copy": "rm -rf public/Build && cp -R ../unity-project/Build public/Build",
    "build": "npm run unity:copy && vite build",
    "dev":   "vite"
  }

Netlify runs npm run build, which copies the Unity build then
produces dist/ containing index.html + the copied Build/ folder.

## Verification gate

Stop and inspect when each of these is true. None claim "fixed" without
running them.

- Compile-check: export PATH="$HOME/.dotnet:$HOME/.dotnet/tools:$PATH"
  && dotnet build tools/compile-check/GDGGo.CompileCheck.csproj ->
  0 errors / 0 warnings. Will fail loudly if any of the scene-cuts left
  dangling references in non-UI scripts.
- Reference audit: grep -r "LoginScreen|SignupScreen|MenuScreen|CarSelectScreen|LeaderboardPanel|LeaderboardRow|LoadMenu|LoadCarSelect|LoadGameOver" unity-project/Assets/Scripts/ returns nothing.
- Scene audit: Build Settings list = [Boot, Game]. The other scenes
  can stay on disk but are not built.
- WebGL build: Unity build emits unity-project/Build/ with no
  references to the deleted scenes.
- SPA build: cd web-hosting && npm install && npm run build completes;
  dist/index.html + dist/Build/index.html both present.
- Manual smoke: npm run dev -> site loads at http://localhost:5173.
  /signup creates a user; /login re-authenticates; /leaderboard reads
  the top-100; /play mounts the iframe; running the game and crashing
  posts a gameover message; SPA receives it, submits the score,
  navigates back to /leaderboard, and the new row appears.

## Out of scope (deliberately)

- A Netlify Function for short-lived Unity tokens. JWT-in-query-param
  is acceptable for MVP; harden later if needed.
- React component library / Tailwind. Plain CSS modules + Google
  palette + Kenney UI sprites (copy what's needed from
  unity-project/Assets/UI/KenneyUI/ to web-hosting/src/assets/ if we
  want pixel parity, otherwise re-author in CSS).
- Profile pages, achievements, friends. The leaderboard + auth is the
  ask.
- Replacing ScoreAPI.cs / AuthAPI.cs C# code. They're orphaned by the
  cuts (no callsites left) but I'll keep them on disk - deleting
  scripts that compiled cleanly is the kind of unasked-for cleanup
  that bites later. Surface, don't touch.

## Files affected (rough map)

Created:
  web-hosting/{package.json, tsconfig.json, vite.config.ts, index.html}
  web-hosting/src/**
  web-hosting/public/Build/ (gitignored; populated by postbuild)
  web-hosting/dist/ (gitignored; Vite output)
  docs/WEBSITE.md (short doc on the SPA + how the React app talks to
  Unity + Supabase; referenced from the main README.md).

Modified:
  web-hosting/netlify.toml - switch publish source to dist.
  unity-project/Assets/Scripts/UI/GameOverScreen.cs - refactor to
    post postMessage, drop ScoreAPI.InsertScore call.
  unity-project/Assets/Scripts/Supabase/SupabaseSession.cs - add
    InitFromUrlQuery() reader for ?token=&u=&dn=.
  unity-project/Assets/Scripts/Core/GameManager.cs - drop
    LoadMenu/LoadCarSelect/LoadGameOver.
  unity-project/ProjectSettings/EditorBuildSettings.asset - scenes =
    [Boot, Game].

Deleted:
  unity-project/Assets/Scenes/{Menu,CarSelect,GameOver}.unity + .meta
  (Login/Signup screens are TMP canvases inside Menu.unity and go
  with it).
  unity-project/Assets/Scripts/UI/{LoginScreen,SignupScreen,MenuScreen,
    CarSelectScreen,LeaderboardPanel,LeaderboardRow}.cs

Not touched:
  unity-project/Assets/Scripts/UI/HUD.cs - still in Game scene.
  unity-project/Assets/Scripts/UI/UIAnimator.cs - utility.
  unity-project/Assets/Scripts/Supabase/{AuthAPI,ScoreAPI,SupabaseConfig,
    SupabaseTypes}.cs - orphaned but left on disk.
  All gameplay scripts (CoinSpawner, PowerUpSpawner, RoadScroller,
  etc.) - unchanged.
  supabase/migrations/*.sql - schema and triggers stay.
