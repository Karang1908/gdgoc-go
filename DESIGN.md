# Design

<!-- impeccable:design-system 1 -->

The visual system for **GDGoC Go!**, the GDG on Campus BITS Pilani Dubai Campus
web game. Recorded from the built code, not from intention.

The whole system answers one instruction: the site must read as a Google
product, not as a game site wearing Google's colours. Where a game convention
and a Google convention disagree, Google wins — except inside the Unity canvas,
which this system does not touch.

Everything below lives in `web-hosting/src/styles/globals.css` (tokens plus the
component primitives) and in the per-component `<style>` blocks that consume it.
To restyle for a future GDG event, change the token block, not the components.

## Type

Self-hosted in `web-hosting/public/assets/fonts/`, preloaded in `index.html`.
Nothing is fetched from a CDN at runtime.

| Role | Face | Weights |
| --- | --- | --- |
| Display: h1–h4, buttons, nav, scores, brand | **Google Sans** | 400–700 |
| UI and body: paragraphs, inputs, table cells, leaderboard names | **Google Sans Text** | 400 / 500 / 700 |

- `h1` `clamp(2.25rem, 5.5vw, 3.75rem)`, weight 700, tracking **-0.03em**
- `h2` `clamp(1.375rem, 2.8vw, 2rem)`, weight 500, tracking -0.018em
- `h3` 1.1875rem / 500 · `h4` 1rem / 500
- `.lede` `clamp(1rem, 1.5vw, 1.1875rem)`, `--text-2`, max 62ch
- Headings use `text-wrap: balance`

Two rules that are easy to get wrong:

1. **UI chrome is weight 500, never 700.** Google sets buttons, nav, table
   headers, chips, and stat labels at medium. Heavy weight is reserved for
   display numerals and dialog titles — in practice only `.score-number`,
   `.result-title`, and `.showcase-car-name`.
2. **Nothing shouts.** No `text-transform: uppercase` anywhere, and UI labels
   are sentence case ("Global leaderboard", "Play again", "Final score"). The
   documented leaderboard column names keep their Title Case.

### Numbers are not monospaced

`.font-mono` and `--font-mono` both resolve to **Google Sans Text** with
`font-variant-numeric: tabular-nums`. Columns still align, because tabular
figures are what alignment actually needs; a mono face was only ever a costume,
and the one previously named (`JetBrains Mono`) was never loaded, so every
number fell back to the platform's system mono.

## Colour

Google's real neutral ramp. One blue carries every action. **The four brand
colours are reserved** — footer marks, coin and GDG-coin values, and rank one —
and never used as UI accents. That reservation is what keeps the surface reading
as Google rather than as a toy.

```
--g-blue #4285F4   --g-red #EA4335   --g-yellow #FBBC04   --g-green #34A853
```

| Token | Light | Dark |
| --- | --- | --- |
| `--bg` | `#FFFFFF` | `#202124` |
| `--surface` / `-2` / `-3` | `#FFFFFF` / `#F8F9FA` / `#F1F3F4` | `#292A2D` / `#303134` / `#3C4043` |
| `--border-subtle` / `--border` / `--border-strong` | `#E8EAED` / `#DADCE0` / `#BDC1C6` | `#3C4043` / `#5F6368` / `#80868B` |
| `--text` / `--text-2` / `--text-3` | `#202124` / `#5F6368` / `#70757A` | `#E8EAED` / `#BDC1C6` / `#9AA0A6` |
| `--accent` / `--on-accent` | `#1A73E8` / `#FFFFFF` | `#8AB4F8` / `#202124` |
| `--success` / `--danger` | `#188038` / `#C5221F` | `#81C995` / `#F28B82` |

### Three colour decisions worth keeping

1. **Dark is `#202124`, not black.** Google does not ship pure-black web
   surfaces. The previous AMOLED theme also used Tailwind zinc greys
   (`#f4f4f5`/`#a1a1aa`/`#71717a`), which are not in Google's ramp at all.
2. **`--text-3` is `#70757A`, not Google Grey 600 (`#80868B`).** Grey 600
   measures **3.68:1** on white and fails the 4.5 floor for placeholder and hint
   text. `#70757A` is the grey Google Search uses for result text: same family,
   **4.65:1**. Every token pair in both themes is ≥4.5:1 — verified, not assumed.
3. **Hardcoded neutrals are a bug, not a shortcut.** Literal `#5F6368` in a
   component does not respond to the theme. All of them are tokens now.

Elevation is Google's own two-layer shadow (contact offset + ambient blur),
`--shadow-1` … `--shadow-4`. There are no zero-offset colour halos.

## Shape, state, and motion

- Controls are pills (`--pill`); cards `28px`, fields `8px`, chips `8px`.
- **Outlines are 1px.** M3 never uses a 2px outline on a button or card.
- Buttons: `.btn-filled` (primary), `.btn-tonal`, `.btn-outlined`,
  `.btn-secondary`, `.btn-accent` (the one brand-green "go race" moment),
  `.btn-danger` (outlined, never filled — a misfire is public), `.btn-text`,
  plus `.icon-btn`.
- **State layers, not colour swaps.** Hover is an 8% overlay and pressed 12%,
  composited with `background-image: linear-gradient(<state>, <state>)` over the
  element's own `background-color`. A gradient is used rather than a
  pseudo-element so components stay free to use `::before` / `::after`.
- Fields are M3 outlined. **Blue means focus**, applied as an inset ring so the
  focus state does not shift layout the way a border-width change would.
- Focus rings inherit the element's own shape; they do not force a radius.
- Motion is the token ease (`cubic-bezier(0.2,0,0,1)`) at 0.15/0.25/0.4s, and
  everything is disabled under `prefers-reduced-motion`.

## Phone rules

The game is played on phones. These are measured floors, not preferences —
every one is verified across 320/360/390/430 portrait and 844×390 landscape.

- **Touch targets ≥44px.** M3's default 40px control sits under it, so
  `@media (pointer: coarse)` raises `.btn` to 44px and `.icon-btn` to 48px.
  **Size follows the pointer, not the width.** A landscape phone is 844px wide
  and still needs 44px; that is exactly how `.controls-back` regressed while
  its override sat inside `@media (max-width: 760px)`.
- **Text ≥12px (0.75rem).** Anything smaller is unreadable at arm's length on a
  phone. The dense leaderboard and garage labels were the offenders.
- **Inputs are 16px on coarse pointers.** Below 16px, iOS silently zooms the
  page when a field takes focus, and the layout never recovers cleanly.
- **Pinch-zoom stays enabled.** Blocking it fails WCAG 1.4.4 and Google's own
  pages allow it. Gameplay is unaffected: the Unity iframe sets
  `touch-action: none !important` and `body.game-active` does the same, so
  zoom is impossible over the canvas without disabling it everywhere else.
- **No `backdrop-filter`.** Blur forces its own compositing layer and is a real
  jank source on low-end Android. Scrims are solid; Google's dialogs are too.
- **The install banner reserves its own height.** It is `position: fixed`, so
  while it is visible `body.install-prompt-visible` gives the scroll owners
  92px of bottom padding — otherwise it covers the last row of `/controls` and
  `/leaderboard`.

## Installed app (Add to Home Screen)

The expected path is: a player is handed a link, plays in the browser, then
installs it. That path has to be as good as the browser one.

- `display: standalone`, `display_override: ["standalone", "minimal-ui"]`.
  `window-controls-overlay` was removed — it is a desktop titlebar feature.
- Icons are declared **twice**: `any` and `maskable` as separate entries. One
  entry marked `"any maskable"` is treated as maskable everywhere, which is not
  what non-masked contexts should render. The artwork is safe-zone compliant
  (the mark occupies the central ~67%), so masking crops nothing.
- `screenshots` are declared for both `narrow` and `wide` form factors, which
  is what makes Chrome on Android show its rich install dialog instead of the
  minimal one. Regenerate them from the real app when the UI changes.
- **iOS status bar is `default`, never `black-translucent`.** Translucent draws
  the status bar text in white and pulls content under it, which makes the
  clock and battery invisible against this app's white app bar.
- `theme_color` / `background_color` are `#FFFFFF`, matching the light default.
- `public/sw.js` carries an explicit `CACHE_VERSION`. Bump it whenever a
  non-fingerprinted public asset changes (the manifest, icons, the Unity
  build), or installed apps keep serving the old one.

## What this system must not break

These are game-shell contracts, not style choices. They live in `globals.css`
below the token block and in the component blocks, and `HANDOFF.md` §11 and §15
are the authority on them:

- the viewport lock on `html`, `body`, `#root` — no body scroll;
- `body.game-active` hiding the app bar and footer and fixing the game surface;
- `--app-height`, written from `visualViewport`, and the safe-area insets;
- the dark logo rule scoped to `.logo-desktop.logo-dark` — an unscoped
  `.logo-dark` renders both marks and blows out the mobile width;
- the leaderboard's below-900px card layout;
- no persistent bottom navigation, on any route.

`GameView`'s loader sits on a hardcoded black canvas, so its muted text is a
fixed `#9aa0a6` rather than a token — the surface never themes.

## Brand assets

- App bar: `gdg-logo-light.png` / `gdg-logo-dark.png`, swapped on `data-theme`,
  44px desktop; `gdg-mark.png` at 32px below 800px.
- Guest hero: `branding/gdgoc-go-logo.png`, the 1536×1024 transparent asset
  carrying the exact tagline "BUILD. CONNECT. RACE." Do not recreate that
  tagline in CSS or crop the artwork.
- PWA `theme_color` / `background_color` and the `<meta name="theme-color">`
  pair track the system: `#FFFFFF` light, `#202124` dark.
- Icons are drawn SVG (lucide), one consistent weight. No emoji as icons.
