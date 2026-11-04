# Contract: survey theme changes (`limesurvey/themes/hotel-classic/`)

Presentation only (FR-012, FR-041). Survey content, questions, answer codes, mandatory rules, validation, progress, Back/Continue logic and response storage stay exactly as in `specs/001-branded-bilingual-survey/`. No LimeSurvey core file is edited; overrides live in the theme.

## 1. Files

| File | Change | Purpose |
|---|---|---|
| `config.xml` | edit | Add `css/shell.css` (after `css/hotel.css`) and `scripts/shell.js` (before `scripts/custom.js`); `questionhelptextposition` default `bottom`; bump `<version>`/`<lastUpdate>`. Reset the theme afterwards |
| `css/tokens.css` | edit | Add `--appbar-h`, `--tabbar-h`, `--width-app`, `--shadow`, `--scrim`, `--accent-soft` (research R-02) |
| `css/shell.css` | new | All `hs-*` shell styling (shared with the app) |
| `scripts/shell.js` | new | Shell behaviour and `HotelShell` API (shared with the app), `contracts/app-shell.md` §4 |
| `scripts/custom.js` | edit | Replace the browser-language redirect with the welcome-screen alignment (`app-shell.md` §6) |
| `css/hotel.css` | edit | Restyle welcome, question and thank-you as app cards (prototype), tiles to prototype sizes, hide old header styles, notice as a compact footer line |
| `views/subviews/hotel/i18n.twig` | edit | Add shell and screen keys (`data-model.md` §5) |
| `views/subviews/header/nav_bar.twig` | edit | Render app bar, drawer, scrim and toast (`app-shell.md` §2) with state from `include_content` (`data-model.md` §2); keep the `placeholdernotice` switch |
| `views/subviews/footer/footer.twig` | new override | Vanilla footer content plus the tab bar (Rate current) |
| `views/subviews/content/firstpage.twig` | edit | Welcome card; remove the include of `language_changer_first_page.twig` |
| `views/subviews/content/submit.twig` | edit | Add "Back to home" and "Explore nearby" links styled as buttons |
| `views/subviews/header/progress_bar.twig` | edit (markup only) | Bar and step text in one row as the prototype; values and rules unchanged |
| `views/subviews/navigation/language_changer_first_page.twig` | unchanged, unused | Kept for history; README marks it unused |
| `README.md` | edit | File table, shell, language rules, Reset steps |

## 2. Per-screen rendering

| Screen | App bar title | Content | Drawer language | Notes |
|---|---|---|---|---|
| Welcome | `title.rate` | Card: star icon, tagline heading, admin welcome message, facts row (`s.time`, `s.anon`, `s.q9`), Start (`nav.start`), `s.langNote` in the page language | enabled, links (`app-shell.md` §5) | Survey name `<h1>` kept, visually hidden. `.hotel-welcome-intro` and `.hotel-welcome-time` hidden by CSS in the shell |
| Q1–Q9 | `title.rate` | Progress row ("Question N of 9"), card with Required/Optional tag, question text, tiles or textarea, help text as caption below, validation message in place | disabled + `d.langLocked` | Back hidden on Q1 (unchanged). Continue/Submit labels unchanged |
| Thank-you | `title.rate` | Check icon, admin end text, both hotel names, `s.done.home` → `/app/index.html`, `s.done.nearby` → `/app/nearby.html` | enabled, store + go Home | Links carry `data-pjax="false"` |
| Engine error page (`layout_errors.twig`) | unchanged | unchanged | n/a | Not wrapped in the shell (no `aSurveyInfo` state); out of scope |

All three survey screens show the tab bar with Rate current, and the drawer items Home, Rate your stay, Nearby, Dashboard working (FR-013).

## 3. Invariants checked by tests

- Question codes, answer codes, `mandatory` flags and the `.lss` export are unchanged (`git diff --stat limesurvey/survey/` is empty).
- A response submitted through the re-skinned survey has `submitdate` set, `startlanguage` = the session language, Q1–Q7 codes in range (spec 001 `data-model.md` §4).
- No guest-visible English string on Persian survey screens and vice versa (FR-032).
- No hex value in any theme file except `css/tokens.css` (`validate.sh`).
