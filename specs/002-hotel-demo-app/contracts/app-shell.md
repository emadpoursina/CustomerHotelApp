# Contract: App shell (static app and survey)

The shell is the app bar, drawer, scrim, bottom tab bar and toast. It is produced twice (by `app/js/app.js` for the app pages, by Twig in the `hotel-classic` theme for survey pages) and must produce the same DOM, classes and behaviour. Styling is one file (`limesurvey/themes/hotel-classic/css/shell.css`), behaviour is one file (`limesurvey/themes/hotel-classic/scripts/shell.js`). Visual reference: `prototype/index.html` (sizes and components in demo PRD §3).

## 1. Files and load order

App page `<head>` (identical in `app/index.html`, `app/nearby.html`, `app/dashboard.html`):

```
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="stylesheet" href="/upload/themes/survey/hotel-classic/css/tokens.css">
<link rel="stylesheet" href="/upload/themes/survey/hotel-classic/css/fonts.css">
<link rel="stylesheet" href="/upload/themes/survey/hotel-classic/css/shell.css">
<link rel="stylesheet" href="/app/css/app.css">
```

Scripts at the end of `<body>`, in order: `/upload/themes/survey/hotel-classic/scripts/shell.js`, `/app/js/i18n.js`, `/app/js/app.js`, then the page script (`home.js` | `nearby.js` | `dashboard.js`). No modules, no build step, no third-party URLs.

Theme `config.xml` `<files>` gains `css/shell.css` (after `css/hotel.css`) and `scripts/shell.js` (before `scripts/custom.js`). New names only, never a vanilla file name (spec 001 R-01). Reset the theme after the change.

## 2. DOM structure (both producers)

```html
<header class="hs-appbar">
  <button class="hs-icon-btn" id="hs-menu" aria-controls="hs-drawer" aria-expanded="false" aria-label="{menu}">[menu icon]</button>
  <h1 class="hs-title"><span class="hs-mark" aria-hidden="true">[brand icon]</span>{screen title}</h1>
  <button class="hs-icon-btn" data-soon aria-label="{notifications}">[bell icon]<span class="hs-dot"></span></button>
</header>

<div class="hs-scrim" id="hs-scrim" hidden></div>
<aside class="hs-drawer" id="hs-drawer" aria-hidden="true" aria-label="{menu}">
  <header>wordmark (lang=en dir=ltr) · Persian name (lang=fa dir=rtl) · tagline</header>
  <nav>
    <a class="hs-d-item" href="/app/index.html" [aria-current="page"]>Home</a>
    <a class="hs-d-item" href="/index.php/420001">Rate your stay</a>
    <a class="hs-d-item" href="/app/nearby.html">Nearby</a>
    <a class="hs-d-item" href="/app/dashboard.html">Dashboard</a>
    <div class="hs-d-sep"></div>
    <button class="hs-d-item" data-soon>My stay <span class="hs-soon">Soon</span></button>   (× My stay, Room service, Wi-Fi, Settings)
    <div class="hs-d-sep"></div>
    <div class="hs-d-lang"> label {d.lang} · group of two controls (§5) · optional locked note </div>
  </nav>
  <footer>{demo}</footer>
</aside>

<nav class="hs-tabbar" aria-label="{nav.main}">
  <a class="hs-tab" href="/app/index.html">Home</a>
  <a class="hs-tab" href="/app/nearby.html">Nearby</a>
  <a class="hs-tab hs-tab-center" href="/index.php/420001"><span class="hs-bubble">[star]</span>Rate</a>
  <a class="hs-tab" href="/app/dashboard.html">Dashboard</a>
  <button class="hs-tab" data-soon>Services</button>
</nav>

<div class="hs-toast" id="hs-toast" role="status" aria-live="polite" data-soon-text="{soon}"></div>
```

Rules:

- Tab order is fixed: Home, Nearby, Rate (centre, raised), Dashboard, Services (FR-003). The current destination has `aria-current="page"` on the tab and the drawer item; CSS colours it gold (`--color-accent`) for the icon only, text stays `--color-text`.
- Every link names a file; no link ends in `/app/` (FR-040). In Twig, links that leave or reload the survey also carry `data-pjax="false"`.
- Rate links never carry a `lang` parameter (research R-05).
- Icons are inline SVG from the prototype's icon set (`stroke="currentColor"`, `aria-hidden="true"`). No icon fonts, no image files.
- The `hs-mark` is a small decorative brand icon in gold at the title's inline start (FR-001 "hotel wordmark or icon"); the prototype has none, this is the only addition to its app bar.
- Every visible string and every `aria-label` comes from the string tables (FR-032).

Screen titles: Home `title.home`, Nearby `title.nearby`, Dashboard `title.dash`, all survey pages `title.rate`.

## 3. Sizes and layout (from demo PRD §3 and the prototype)

| Element | Rule |
|---|---|
| App bar | 56px (`--appbar-h`), `--color-bg` surface, bottom border `--color-border`, title centred, `position: sticky; top: 0` |
| Tab bar | 64px (`--tabbar-h`) + `env(safe-area-inset-bottom)`, fixed to the bottom of the column, surface white, top border; tab label 11px; centre bubble 56px raised 28px |
| Drawer | 82% of the column, max 320px, from the inline start (right in RTL), `--color-bg`, dark header (`--color-text`) |
| Scrim | `--scrim`, covers the viewport |
| Toast | above the tab bar (`bottom: tabbar + 12px + safe area`), `--color-text` background, auto-hides after 2000 ms |
| Column | `max-width: var(--width-app)` (430px), centred; outside area `--color-border` above 430px (FR-006) |
| Touch targets | every link and button ≥ 48 × 48px (`--touch-min`), tabs are 64px tall, drawer items 52px |
| Motion | drawer, sheet, toast only, ≤ 200 ms; none under `prefers-reduced-motion: reduce` (FR-039) |
| Direction | logical properties only (`inset-inline-*`, `margin-inline-*`, `text-align: start`); `[dir="rtl"] .hs-flip` mirrors chevrons |
| Colour | `var(--…)` from `tokens.css` only; `color-mix()` of tokens is allowed; no hex outside `tokens.css` (FR-007) |

Research R-04 explains the document-scroll model and why the prototype's device bezel is not reproduced.

## 4. Behaviour (`shell.js`)

All handlers are delegated on `document`, so they work after LimeSurvey's pjax swaps and after the app re-renders.

| Trigger | Result |
|---|---|
| `#hs-menu` click | Toggle drawer: `.is-open` on drawer, scrim shown, `aria-expanded`, `aria-hidden`, `html.hs-locked`; focus moves to the first drawer item |
| Scrim click or `Escape` | Close the drawer and any open `.hs-sheet`; focus returns to the opener |
| Any `[data-soon]` click | Show the toast with `data-soon-text`; a second tap restarts the 2 s timer (one toast); never navigates (FR-004) |
| `[data-lang]` click (not disabled) | `setLang(value)`; if the control has `data-href`, navigate there; otherwise dispatch `hotel:langchange` on `document` (the app re-renders in place and keeps the drawer open, as the prototype) |
| Link in drawer or tab bar | Normal navigation; the drawer closes |

Public API (global `window.HotelShell`, no other globals):

- `getLang()` → `'en' | 'fa'` (stored value, else browser default; research R-05).
- `setLang(l)` → stores `l` if `en`/`fa`; ignores storage errors.
- `toast(text?)` → shows the toast (default text from `data-soon-text`).
- `openSheet(el)`, `closeSheet()` → used by Nearby and Home for the bottom sheet (`.hs-sheet`, `role="dialog"`, `aria-modal="true"`).

`shell.js` reads no form fields, makes no network request, writes nothing except `localStorage['hotel.lang']`, and logs nothing (spec 001 FR-034 still applies to theme scripts).

## 5. Language switch states

| Context | Controls | Behaviour |
|---|---|---|
| App pages | two `<button data-lang>`; `aria-pressed` on the current one | Re-render in place (`hotel:langchange`), `<html lang dir>` updated |
| Survey welcome | two `<a href="{surveyUrl}?lang=xx" data-pjax="false">`; current has `aria-current="true"` | Full reload into that language; `custom.js` stores it; no response is started |
| Survey question screens (also when resumed) | two `<button disabled>` + note `d.langLocked` | Nothing (FR-005) |
| Survey thank-you | two `<button data-lang data-href="/app/index.html">` | Store and open Home in that language |

## 6. Welcome-screen alignment (`custom.js`, theme only)

Runs only when `#welcome-container` exists (research R-05):

1. If the URL has `lang`: `HotelShell.setLang(document.documentElement.lang)`. Stop.
2. Else if `document.documentElement.lang !== HotelShell.getLang()`: `location.replace(<same URL> + lang=<pref>)`.
3. Else nothing.

It replaces spec 001's once-per-session browser redirect. With no stored preference, `getLang()` applies the same browser rule, so direct visitors behave as in spec 001.

## 7. Accessibility

- Drawer and sheet: `aria-hidden` toggled, Escape closes, focus moves in on open and back to the opener on close.
- Tab bar: `<nav aria-label>`; current item `aria-current="page"`.
- Toast: `role="status"`, polite.
- Disabled language buttons use the `disabled` attribute and the visible note, not colour alone.
- Focus ring `--focus-ring` (2px) on every interactive element.
