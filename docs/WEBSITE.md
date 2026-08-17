# GDG Go — Website Architecture & Integration Guide

This document describes the **Website-Shells-the-Game** split for **GDG Go**.

---

## 1. Overview & Architecture

The entire user lifecycle (Authentication, Vehicle Selection, Result Overlays, and Live Leaderboards) is managed by a **React + TypeScript + Vite Single Page Application (SPA)** in [`web-hosting/`](file:///Users/karangarg/Desktop/gdg-go/web-hosting).

Unity runs **pure gameplay only** ([`Game.unity`](file:///Users/karangarg/Desktop/gdg-go/unity-project/Assets/Scenes/Game.unity)) embedded inside an `<iframe>` on the home page.

```
┌────────────────────────────────────────────────────────────┐
│  React SPA (Vite + TS) in web-hosting/                     │
│  Routes: '/' (Home, Play, Modals) and '/leaderboard'       │
│                                                            │
│  - Supabase JS SDK manages Auth & JWT in localStorage       │
│  - Car selection rendered in React UI                      │
│  - Mounts Unity WebGL build inside an <iframe>            │
│  - Passes session & car via query params to Unity          │
│  - Listens for window postMessage('gameover', payload)     │
│  - Auto-submits score to Supabase REST and shows result UX │
└──────────────────────┬─────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│  Supabase REST   │       │   Unity WebGL    │
│  (Auth, DB, RLS) │       │   (Game ONLY)    │
└──────────────────┘       └──────────────────┘
```

---

## 2. Communication Contract

### Site → Unity (Iframe URL Query Parameters)

The [`UnityEmbed`](file:///Users/karangarg/Desktop/gdg-go/web-hosting/src/components/UnityEmbed.tsx) component mounts the WebGL build with authenticated session and vehicle parameters:

```
/Build/index.html?token=<JWT>&u=<username>&dn=<display_name>&car=<car_id>
```

- `token`: Player's Supabase JWT access token.
- `u`: Normalized username.
- `dn`: Public display name.
- `car`: Selected car skin ID (`'SportsCar'`, `'SUV'`, `'Taxi'`).

In Unity C#, [`SupabaseSession.InitFromUrlQuery()`](file:///Users/karangarg/Desktop/gdg-go/unity-project/Assets/Scripts/Supabase/SupabaseSession.cs) parses `Application.absoluteURL` and [`PlayerCarSkin`](file:///Users/karangarg/Desktop/gdg-go/unity-project/Assets/Scripts/Gameplay/PlayerCarSkin.cs) activates the matching car body.

### Unity → Site (PostMessage Bridge)

When a run ends (police Heat = 0 or Fuel = 0), [`GameSession.EndGame()`](file:///Users/karangarg/Desktop/gdg-go/unity-project/Assets/Scripts/Core/GameSession.cs) triggers:

```json
{
  "type": "gameover",
  "score": 1250,
  "coins": 42,
  "distance": 500,
  "duration": 35
}
```

Dispatched to `window.parent.postMessage` via [`PostMessageBridge.jslib`](file:///Users/karangarg/Desktop/gdg-go/unity-project/Assets/Plugins/WebGL/PostMessageBridge.jslib).

[`GameView.tsx`](file:///Users/karangarg/Desktop/gdg-go/web-hosting/src/home/GameView.tsx) intercepts this event, immediately submits the score to `/rest/v1/scores` via Supabase REST, and renders the celebratory [`ResultOverlay`](file:///Users/karangarg/Desktop/gdg-go/web-hosting/src/home/ResultOverlay.tsx).

---

## 3. Site Structure

```
web-hosting/
├── index.html                # Entry point with SEO tags and fonts
├── package.json              # Scripts: dev, build, unity:copy
├── tsconfig.json
├── vite.config.ts            # Vite config (output: dist/)
├── netlify.toml              # Build commands, caching, and SPA redirect rules
├── scripts/
│   └── copy-unity.js         # Copies Unity build to public/Build/
├── src/
│   ├── main.tsx              # React DOM root
│   ├── App.tsx               # App router and shell layout
│   ├── lib/
│   │   ├── supabase.ts       # Supabase JS client
│   │   └── api.ts            # Score submit, leaderboard, personal best APIs
│   ├── context/
│   │   └── AuthContext.tsx   # Auth state (synthetic email <user>@gdg-go.local)
│   ├── data/
│   │   └── cars.ts           # Selectable vehicle roster & stats
│   ├── components/
│   │   ├── Navbar.tsx        # Top navigation & user badge
│   │   └── UnityEmbed.tsx    # Responsive WebGL iframe
│   ├── home/
│   │   ├── Home.tsx          # Home coordinator (Auth gate, Car Picker, Game)
│   │   ├── AuthModal.tsx     # Login & Signup modal with validation
│   │   ├── CarPicker.tsx     # Interactive car selector & stats cards
│   │   ├── GameView.tsx      # Active game container & postMessage listener
│   │   └── ResultOverlay.tsx # Run results, confetti, & play again actions
│   ├── leaderboard/
│   │   └── Leaderboard.tsx   # Top-100 podium & user ranking table
│   └── styles/
│       └── globals.css       # Google brand palette & arcade styling
└── public/
    └── Build/                # Unity WebGL build output
```

---

## 4. Local Development & Deployment

### Running the Web SPA Locally

```bash
cd web-hosting
npm install
npm run dev
```

The site will launch at `http://localhost:3000`.

### Building for Production & Netlify

```bash
cd web-hosting
npm run build
```

The build script will:
1. Copy the latest WebGL build from `unity-project/Build/` to `web-hosting/public/Build/`.
2. Compile and bundle the React TypeScript SPA into `web-hosting/dist/`.

Deploy to Netlify with:
```bash
netlify deploy --prod --dir=dist
```
