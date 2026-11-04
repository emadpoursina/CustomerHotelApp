---

description: "Task list for Hotel Guest App Demo (app shell, Nearby, Dashboard)"
---

# Tasks: Hotel Guest App Demo (app shell, Nearby, Dashboard)

**Input**: Design documents from `specs/002-hotel-demo-app/`

**Prerequisites**: plan.md, spec.md (with Clarifications 2026-11-04), research.md (R-01 to R-19), data-model.md, contracts/ (`app-shell.md`, `app-screens.md`, `survey-theme.md`, `dashboard-data.md`, `dashboard.schema.json`, `places.schema.json`, `scripts-cli.md`), quickstart.md

**Tests**: Requested. The plan defines 43 test flows with stable IDs: TF-S1, TF-U01 to TF-U08 (Python stdlib `unittest`), TF-D1 to TF-D7 (data, stack running) and TF-E01 to TF-E27 (Playwright 1.64 from `scratch/`). Every flow has a task that writes it and a task that runs it. Unit tests for `build-dashboard.py` and `seed-demo.py` are written first and must fail before the code exists. Browser flow scripts are written before or with the screen they cover and are run at each phase checkpoint.

**Organization**: Phases follow the demo PRD §7 build order: (1) shared shell, (2) Home, (3) Nearby, (4) survey theme, (5) dashboard, (6) seed, (7) walkthrough and `validate.sh`. Each user-story phase is still a self-contained, testable increment. Because of the build order, the phases run US1 → US3 → US2 → US4 → US6 → US5, not in spec priority order.

**Scope guards (apply to every task)**:

- `hotelSurveyDemoPRD.md` is the source of truth. Do **not** build QR codes, rooms, room tokens, exports, auth or anything production (PRD §5). Do not touch `db/init/` or the `hotel_rooms` table.
- Do **not** edit LimeSurvey core files or core tables. Survey questions, answer codes, mandatory rules and `limesurvey/survey/hotel-guest-survey.lss` stay unchanged (FR-012, FR-041).
- Database access from scripts is `SELECT` inside a read-only transaction only. Only the survey engine writes responses (the seed job uses the public form).
- Never read, log, print, copy or paste guest comment text (Q8, Q9). `build-dashboard.py` must never name `Q8`, `Q9`, `LIKED`, `IMPROVE`, `X8` or `X9`.
- No hex colour values outside `limesurvey/themes/hotel-classic/css/tokens.css`. `color-mix()` of tokens is allowed. No third-party URL, font, map, image or library.
- Every in-app link names a file (`/app/index.html`), never `/app/` (FR-040). Rate links are always `/index.php/420001` with **no** `lang` parameter (R-05).
- Do not edit `AGENTS.md`, `hotelSurveyPRD.md`, `hotelSurveyDemoPRD.md`, `docs/brand.md` or `docs/decisions.md`. Do not resolve any `docs/decisions.md` §2 item (plan R13).
- Never commit `.env`, `backups/`, `scratch/` or `app/data/dashboard.json`. Do not commit or push unless the orchestrator says so.
- Evidence (screenshots, JSON, text) goes to `specs/002-hotel-demo-app/evidence/` as `<flow-id>-<lang>-<width>.png|json|txt`. Results and **Verify** outcomes are rows in `specs/002-hotel-demo-app/evidence.md` (same table format as `specs/001-branded-bilingual-survey/evidence.md`). Never write comment text into evidence.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: The user story the task belongs to (US1–US6 from spec.md)
- `THEME` = `limesurvey/themes/hotel-classic/`. `TESTER` = `scratch/tester/` (git-ignored). Paths are relative to the repository root (the worktree).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Folder layout, the compose mount, git hygiene, the running stack and the two test harnesses.

- [X] T001 Create the folders `app/css/`, `app/js/`, `app/data/`, `scripts/tests/fixtures/` and `specs/002-hotel-demo-app/evidence/`, and create `specs/002-hotel-demo-app/evidence.md` with the header `# Evidence: 002-hotel-demo-app` and an empty table with columns `| Acceptance criterion | Flow | Command | Exit code | Artifact path(s) | Result / notes |`. Done when all paths exist.
- [X] T002 [P] In `docker-compose.yml`, add exactly one volume line to the `limesurvey` service, directly under the hotel-classic theme mount: `- ./app:/var/www/html/app:ro` with a one-line comment `# Static demo app (demo PRD §4), served by the same Apache.` Mount the directory, never single files (R-01: atomic rename of `dashboard.json` must be visible). No other change (no service, port, network or Caddy change). Done when `docker compose config` succeeds and shows the mount.
- [X] T003 [P] In `.gitignore`, add a section `# Generated demo data` with `app/data/dashboard.json` and `app/data/*.tmp`. Done when `git check-ignore -q app/data/dashboard.json` exits 0 and `git check-ignore -q app/data/places.json` exits 1.
- [X] T004 Bring the stack up from the worktree (plan R5, quickstart prerequisites): copy `.env` from the main checkout (`/Users/emad/Projects/hotelSurvey/.env`) into the worktree root (never commit it), run `docker compose up -d`, then confirm `docker compose ps` shows `db` healthy and `limesurvey` up, and `curl -s -o /dev/null -w '%{http_code}' http://hotelsurvey.localhost/upload/themes/survey/hotel-classic/css/tokens.css` returns `200`. Run the clock check from quickstart §1 (MariaDB `NOW()` and PHP `date()` both UTC, plan R6). Record both results as rows in `specs/002-hotel-demo-app/evidence.md`. Depends on T002.
- [X] T005 [P] Create the Playwright harness in `scratch/tester/` (git-ignored; never committed): `scratch/tester/package.json` pinning `playwright` `1.64.x` (install with `npm i` inside `scratch/tester/`, then `npx playwright install chromium`), and `scratch/tester/lib.cjs` exporting: `BASE = 'http://hotelsurvey.localhost'`; `VIEWPORTS = [320, 360, 390, 430, 1280]` (phones with `isMobile: true, hasTouch: true`, height 800); `newCtx(browser, {width, lang})` that adds an init script setting `localStorage['hotel.lang']` when `lang` is given; `evidence(name)` returning `specs/002-hotel-demo-app/evidence/<name>`; `noHScroll(page)` (`document.documentElement.scrollWidth <= innerWidth`); `targets48(page)` returning every visible `a, button, input, label.hotel-tile, [role=switch]` whose bounding box is under 48 × 48; `countRows()` and `countCompleted()` that run `docker compose exec -T db sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" mariadb -u "$MARIADB_USER" "$MARIADB_DATABASE" -N -e "SELECT COUNT(*) FROM lime_survey_420001 [WHERE submitdate IS NOT NULL]"'` and return integers only (no other column is ever selected); `answerSurvey(page, {lang, skipText:true})` that clicks Start, picks a tile on Q1–Q6 and Q7 and Continues through Q8–Q9 empty; and `consoleErrors(page)` collecting `console` errors and `pageerror`. Every flow script below exits non-zero on failure and writes `<flow-id>.json` with `{flow, lang, width, pass, details}`. Done when `node -e "require('./scratch/tester/lib.cjs')"` succeeds.
- [X] T006 [P] Create `scripts/tests/_load.py`: a helper `load(name)` that imports `scripts/<name>.py` (hyphenated file names such as `build-dashboard.py`) with `importlib.util.spec_from_file_location`, resolving the path from `__file__`. Add an empty `scripts/tests/__init__.py`. Done when `python3 -m unittest discover -s scripts/tests` runs (0 tests is fine).

---

## Phase 2: Foundational (PRD §7 step 1: shared shell)

**Purpose**: Tokens, the shared shell CSS and JS in the theme, the app string table and shell renderer, and the three page skeletons. Every user story renders inside this shell.

**CRITICAL**: No user-story work starts before this phase is done.

- [X] T007 Edit `THEME/css/tokens.css`: add `--appbar-h: 56px`, `--tabbar-h: 64px`, `--width-app: 430px`, and `--shadow`, `--scrim`, `--accent-soft` defined only as `color-mix()` of existing colour tokens (no new hex values, R-02). Keep every existing token. Done when the file parses in the browser and `grep -c '#' ` shows no new hex literal added.
- [X] T008 Create `THEME/css/shell.css` with every `hs-*` rule from `contracts/app-shell.md` §2–§3 and §7: `.hs-appbar` (56px, sticky top 0, `--color-bg`, bottom border, centred `.hs-title` with gold `.hs-mark`), `.hs-icon-btn` (≥ 48 × 48), `.hs-scrim` (`--scrim`, fixed, viewport), `.hs-drawer` (82% of the column, max 320px, from the inline start edge `max(0px, (100% - var(--width-app)) / 2)`, dark header `--color-text`, items 52px, `.hs-soon` pill, `.hs-d-lang` with disabled state and note), `.hs-tabbar` (fixed to the bottom of the column, `calc(var(--tabbar-h) + env(safe-area-inset-bottom))`, 5 tabs 64px tall, label 11px, `.hs-tab-center .hs-bubble` 56px raised 28px; `[aria-current="page"]` colours the icon `--color-accent`, text stays `--color-text`), `.hs-toast` (`--color-text` background, `bottom: calc(var(--tabbar-h) + 12px + env(safe-area-inset-bottom))`, hidden by default). Page frame rules: `body { max-width: var(--width-app); margin-inline: auto; padding-block-end: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--space-…)) }`, outside area `--color-border` and column `--shadow` above 430px (FR-006), `html.hs-locked { overflow: hidden }`, `html { scroll-padding-top: var(--appbar-h) }`, `[dir="rtl"] .hs-flip { transform: scaleX(-1) }`, focus ring `--focus-ring` on every interactive element. Set explicit font size, line height, margins and button resets on `hs-` elements so Bootstrap's reboot on survey pages does not change them (R-03, plan R3). Transitions ≤ 200 ms on drawer and toast only, and `@media (prefers-reduced-motion: reduce)` sets them to none (FR-039). Logical properties only. `var(--…)` only, no hex. Done when the file has no hex literal and no physical `left`/`right` property.
- [X] T009 Create `THEME/scripts/shell.js` (classic script, ES2017, IIFE) implementing `contracts/app-shell.md` §4: global `window.HotelShell` only, with `getLang()` (stored `localStorage['hotel.lang']` if `en`|`fa`, else `fa` when `fa` ranks above `en` in `navigator.languages`, else `en`; storage errors caught), `setLang(l)` (stores only `en`|`fa`; ignores errors), `toast(text?)` (single `#hs-toast`, default text from `data-soon-text`, restarts a 2000 ms timer on each call), `openSheet(el)` / `closeSheet()` (`.is-open`, scrim shown, `html.hs-locked`, focus in and back to the opener). Delegated `document` listeners: `#hs-menu` toggles the drawer (`.is-open`, scrim `hidden` toggled, `aria-expanded`, `aria-hidden`, `hs-locked`, focus to the first drawer item); scrim click and `Escape` close the drawer and any open sheet and return focus; any `[data-soon]` click calls `toast()` and `preventDefault()`; `[data-lang]:not([disabled])` click calls `setLang` then navigates to `data-href` if present, else dispatches `hotel:langchange` on `document`; any link click inside the drawer or tab bar closes the drawer. Also close the drawer on `pjax:scriptcomplete`. No network request, no form reads, no `console` calls. Done when `node --check THEME/scripts/shell.js` passes.
- [X] T010 [P] Create `app/js/i18n.js` (classic script): `window.HotelI18n = { S, t, num, fold }`. `S` holds `en` and `fa` tables with **every** key of the prototype's `S` object (`prototype/index.html` line ~313) copied as-is, plus the new keys in `data-model.md` §5 with the exact English and proposed Persian text given there (`menu`, `notifications`, `tab.*`, `nav.main`, `title.rate`, `d.*`, `d.lang`, `d.langLocked`, `demo`, `soon`, `lang.en`, `lang.fa`, `brand.en`, `brand.fa`, `tagline`, `n.m`, `n.km`, `n.24h`, `n.sheet`, `db.unavailable`, `db.stale`, `db.cat.overall` … `db.cat.facilities`). Shared keys must use the same text as `THEME/views/subviews/hotel/i18n.twig` (the `brand.*` values there are the source). `t(key, ...args)` replaces `%1`, `%2` and returns the key itself when missing (never the other language, R-17). `num(x, decimals)` uses `Intl.NumberFormat('fa-IR'|'en-US')` (R-13). `fold(s)` = NFD, strip `\p{M}`, lower-case, `ي`→`ی`, `ك`→`ک`, remove U+200C and U+0640, collapse whitespace, trim (R-11). Done when `node --check` passes and `fold('  Café ') === 'cafe'`.
- [X] T011 Create `app/js/app.js` (classic script): `window.HotelApp = { SURVEY_URL: '/index.php/420001', renderShell(route), applyLang(lang), loadJSON(url) }`. `renderShell(route)` (route = `home` | `nearby` | `dash`) builds, into the page's shell mount, the exact DOM of `contracts/app-shell.md` §2 (same classes, ids, ARIA and inline SVG icons from the prototype with `stroke="currentColor"` and `aria-hidden="true"`), with `aria-current="page"` on the current tab and drawer item, screen title `title.home` | `title.nearby` | `title.dash`, two `<button data-lang>` with `aria-pressed` (§5 "App pages"), `#hs-toast` with `data-soon-text` = `t('soon')`, all text through `textContent` or escaped. Rate links use `SURVEY_URL` and never add `lang`. All links name files. `applyLang(l)` sets `<html lang dir>` and re-renders the shell; on `hotel:langchange` the page re-renders shell and screen in place, keeping screen state and leaving the drawer open (prototype behaviour). `loadJSON(url)` = `fetch(url, {cache: 'no-store'})` then `.json()`, rejecting on non-2xx. Done when `node --check app/js/app.js` passes.
- [X] T012 Create `app/css/app.css` with the shared screen primitives used by more than one screen (section headings, `.card`-like surfaces under an `app-` prefix, pills, chips with a 36px visual height inside a 48px target per FR-037, segmented control, switch, `.hs-sheet` bottom sheet with drag handle, 200 ms transition and reduced-motion off), matching `prototype/index.html` sizes. `var(--…)` only. Screen-specific styles are added in later phases. Done when the file has no hex literal.
- [X] T013 Create the three page skeletons `app/index.html`, `app/nearby.html`, `app/dashboard.html`, each with exactly the `<head>` of `contracts/app-shell.md` §1 (viewport with `viewport-fit=cover`; `tokens.css`, `fonts.css`, `shell.css` from `/upload/themes/survey/hotel-classic/css/`, then `/app/css/app.css`), a shell mount, `<main id="hs-main">`, a `<noscript>` line in both languages saying the app needs JavaScript, and at the end of `<body>` in order: `/upload/themes/survey/hotel-classic/scripts/shell.js`, `/app/js/i18n.js`, `/app/js/app.js`, and the page script `/app/js/home.js` | `nearby.js` | `dashboard.js`. Create the three page scripts as stubs that call `HotelApp.applyLang(HotelShell.getLang())` and `renderShell(<route>)`. Done when the three pages return 200 from `http://hotelsurvey.localhost/app/<page>.html`.
- [X] T014 Foundational checkpoint (plan step 1): with the stack up, open `/app/index.html` at 390px in en and fa (Playwright one-off or DevTools). App bar, drawer (opens from the left in en and right in fa), tab bar and a `[data-soon]` toast all work; no console errors; `curl` returns 200 for `/upload/themes/survey/hotel-classic/css/shell.css` and `/upload/themes/survey/hotel-classic/scripts/shell.js`. Record a row in `specs/002-hotel-demo-app/evidence.md`.

**Checkpoint**: The shared shell renders in both languages on an empty app page.

---

## Phase 3: User Story 1 - App shell and Home (Priority: P1) — MVP (PRD §7 step 2)

**Goal**: A guest opens Home and sees the full app shell plus hero, Rate card, mock services and three nearby highlights. Every mock control shows the toast.

**Independent Test**: Open `/app/index.html` at 390px, open and close the drawer, tap every tab and every mock control, switch language in the drawer (TF-E01 to TF-E05).

### Tests for User Story 1 (write first)

- [X] T015 [P] [US1] Write `scratch/tester/tf-e01-shell-layout.cjs` (TF-E01): for each of `VIEWPORTS` × `en`/`fa`, open `/app/index.html`; assert `.hs-appbar` height 56, `.hs-tabbar` height ≥ 64, the Home tab has `aria-current="page"`, `noHScroll`, and at 1280px `main`'s column width ≤ 430 and centred (left and right gaps differ by ≤ 1px). Save `TF-E01-<lang>-<width>.png`.
- [X] T016 [P] [US1] Write `scratch/tester/tf-e02-drawer.cjs` (TF-E02): tap `#hs-menu`; assert the drawer is visible on the left in en and on the right in fa (bounding box), scrim visible, `aria-expanded="true"`; tap the scrim → closed; reopen, press Escape → closed, `aria-expanded="false"`, and `document.activeElement` is `#hs-menu`. Run on Home, Nearby and Dashboard.
- [X] T017 [P] [US1] Write `scratch/tester/tf-e03-navigation.cjs` (TF-E03), app-page part: from each of Home, Nearby and Dashboard, tap every tab and every real drawer item; assert Home/Nearby/Dashboard load `/app/index.html`, `/app/nearby.html`, `/app/dashboard.html` as full page loads; Rate lands on a URL whose path is `/index.php/420001` and whose original request had no `lang` parameter (check the request log, the welcome screen may add `lang` itself after alignment); Services shows the toast and `page.url()` is unchanged. Leave a `SURVEY_PAGES` hook that T043 fills in for survey pages.
- [X] T018 [P] [US1] Write `scratch/tester/tf-e04-toast.cjs` (TF-E04): on Home tap the 6 quick actions, the bell, the Services tab and the 4 drawer mock items; on Nearby (once US3 exists) the sheet's Directions, Call and Save. After each tap: exactly one `.hs-toast` element, visible, text = `t('soon')`, positioned above the tab bar, URL unchanged; double-tap one control and assert it hides 1.8–2.6 s after the **second** tap.
- [X] T019 [P] [US1] Write `scratch/tester/tf-e05-home.cjs` (TF-E05): with `page.clock.setFixedTime` at 09:00, 14:00 and 20:00 local, assert the greeting is `greet.m`, `greet.a`, `greet.e` in en and fa; tap each of the 3 highlights and assert the URL is `/app/nearby.html#place=<id>` for ids 8, 1, 17 and the sheet for that place is open (after US3); tap See all → `/app/nearby.html`.

### Implementation for User Story 1

- [X] T020 [P] [US1] Create `app/data/places.json` per `contracts/places.schema.json` by converting the prototype's `PLACES` array (`prototype/index.html` line ~381): keep the 21 places and their `id`s, convert tags to arrays, rename fields per the schema. Top level: `"demo": true`, `"note"` (one sentence: the places are fictional demo data, FR-016), `"highlights": [8, 1, 17]` (one café, one restaurant, one point of interest, A-08), `"places": [...]`. Field rules (data-model.md §4, verbatim): `id` "Unique, ≥ 1"; `category` `"restaurant"` | `"cafe"` | `"poi"`; `name` `{ en, fa }` "Non-empty both"; `distance_m` integer "1–10000"; `rating` "1.0–5.0, one decimal"; `price` integer "1–3"; `hours` `[open, close]` "`0 ≤ open < close ≤ 48`; `close > 24` = after midnight; `[0, 24]` = 24 h"; `tags` `{ en: string[], fa: string[] }` "≥ 1 each, same length"; `description` `{ en, fa }` "Non-empty both". No hex values. Done when `python3 -c` with a small stdlib check confirms 21 places, unique ids, every rule above, and all highlight ids exist.
- [X] T021 [US1] Implement `app/js/home.js` per `contracts/app-screens.md` §2: hero card (greeting by local hour: `greet.m` < 12, `greet.a` < 17, else `greet.e`; wordmark; Persian name; tagline), Rate card `<a href="${HotelApp.SURVEY_URL}">` with star icon, `home.rate.t`, `home.rate.d` and a `.hs-flip` chevron, the `home.services` 3 × 2 grid (Room service, Housekeeping, Wi-Fi, Late checkout, Concierge, Spa) as `<button data-soon>`, and `home.nearby` + `seeAll` link to `/app/nearby.html` with a horizontal strip of the 3 `highlights` (category pill, name, rating, distance via `n.m`/`n.km`), each `<a href="/app/nearby.html#place=<id>">`. Data via `HotelApp.loadJSON('/app/data/places.json')`; text via `textContent`. Re-render on `hotel:langchange`. Depends on T020.
- [X] T022 [US1] Add Home styles to `app/css/app.css` (hero, Rate card with 2px `--color-accent` border, services grid, highlight strip scrolling inside itself so the page never scrolls horizontally, FR-038), matching the prototype at 390px. `var(--…)` only.
- [X] T023 [US1] Run TF-E01, TF-E02, TF-E03 (app pages), TF-E04 (Home controls) and TF-E05 (greeting and See all; highlight sheet part after T033) with `node scratch/tester/<flow>.cjs`. Fix failures in the implementation files, never in the assertions, unless an assertion contradicts a contract. Save evidence and add one row per flow to `specs/002-hotel-demo-app/evidence.md`.

**Checkpoint**: Home inside the shell works in both languages. This is the MVP increment.

---

## Phase 4: User Story 3 - Browse nearby places (Priority: P2) (PRD §7 step 3)

**Goal**: Nearby lists the 21 mock places with search, category chips, Open now, sort, detail sheet and empty state.

**Independent Test**: Open Nearby, type "cafe", toggle Open now, change category and sort, open a place, search nonsense and clear (TF-E10 to TF-E15).

### Tests for User Story 3 (write first)

- [X] T024 [P] [US3] Write `scratch/tester/tf-e10-list.cjs` (TF-E10): load `/app/nearby.html`; assert 21 rows in distance order, the first row is Garden Terrace at 150 m (look up its id in `app/data/places.json`, do not assume one), the count text equals `t('n.results', 21)` and the `n.demo` pill is visible. Expose each row's place id as `data-id` for the assertions (the implementation must set it).
- [X] T025 [P] [US3] Write `scratch/tester/tf-e11-search.cjs` (TF-E11): type `c`, `a`, `f`, `e` one key at a time and assert the row count is non-increasing and updated after each key; `cafe` and `  CAFE ` → ids {8, 11, 14}; `کافه` → {8, 10, 11, 13, 14}; `kebab` with `hotel.lang = fa` → {1, 4}; `باغ` with `hotel.lang = en` → {1, 13, 17}.
- [X] T026 [P] [US3] Write `scratch/tester/tf-e12-filters.cjs` (TF-E12) with `page.clock` at 21:00 local: Cafés + Open now → ids in order 13, 8, 9, 12, 14; + Top rated → 9, 8, 12, 13, 14; Restaurants + search `kebab` → 1, 4; then All + Open now at 00:30 → 20, 7, 14, 18 (Mountain Kebab, closes 24:00, is not listed).
- [X] T027 [P] [US3] Write `scratch/tester/tf-e13-sheet.cjs` (TF-E13): tap a row; assert the sheet (`role="dialog"`, `aria-modal="true"`) shows category, name, rating, walking minutes (`max(1, round(distance_m / 80))`), price, open pill, description, hours (a `[0,24]` place shows `n.24h`), tags and three `[data-soon]` buttons; tap Directions → toast; scrim → closed; reopen; Escape → closed.
- [X] T028 [P] [US3] Write `scratch/tester/tf-e14-empty.cjs` (TF-E14): set Cafés + Open now + Top rated, search `zzzz`; assert the empty state shows `n.empty.t`, `n.empty.d` and the `n.clear` button; tap it; assert search empty, All pressed, Open now off, Top rated still pressed, 21 places, and the search field is focused.
- [X] T029 [P] [US3] Write `scratch/tester/tf-e15-network.cjs` (TF-E15): record every request on `/app/index.html` and `/app/nearby.html` (with a sheet opened); assert every request URL is on `hotelsurvey.localhost` and its path starts with `/app/` or `/upload/themes/survey/hotel-classic/`.

### Implementation for User Story 3

- [X] T030 [US3] Implement the Nearby controls and list in `app/js/nearby.js` per `contracts/app-screens.md` §3: search field (`type="search"`, `n.search` label and placeholder), category chips All / Restaurants / Cafés / Places of interest (`aria-pressed`, single select, row scrolls inside itself), Open now `role="switch"` with `aria-checked`, sort segmented control Nearest / Top rated (`aria-pressed`). Filtering on every `input` event and control change: `match(p) = (cat == 'all' || p.category == cat) && (!open || openNow(p)) && (fold(q) == '' || any(fold(s).includes(fold(q)) for s in [name.en, name.fa, ...tags.en, ...tags.fa]))`. `openNow(p)` with device local time `h` (decimal hours): `(open <= h && h < close) || (close > 24 && h < close - 24)` (R-12). Sort (data-model.md §7): `dist` ascending by `distance_m`, ties by `id`; `rating` descending, ties by `distance_m` then `id`. Result count `n.results` + `n.demo` pill; rows are `<button data-id="<id>">` with category icon (inline SVG), name in the current language, rating, distance (`< 1000` → `n.m`, else `n.km` one decimal), price (`$` × price), Open/Closed pill, `.hs-flip` chevron. Empty state: search icon, `n.empty.t`, `n.empty.d`, `n.clear` resets `q`, `cat`, `open` (sort kept) and focuses the search field. State (`q`, `cat`, `open`, `sort`) survives `hotel:langchange`. Text via `textContent` only.
- [X] T031 [US3] Add the detail sheet and deep link to `app/js/nearby.js`: one `.hs-sheet` (`role="dialog"`, `aria-modal="true"`, labelled by the place name, `n.sheet` as fallback label) with drag handle, category label, name, rating, walking time `n.min`, price, open pill, description, hours (`n.hours`: `HH:MM – HH:MM` using `close % 24`, digits via `num()`; `[0, 24]` → `n.24h`), tag pills, and Directions / Call / Save as `<button data-soon>`. Open with `HotelShell.openSheet`, close via scrim and Escape (shell). On load, `#place=<id>` opens that place's sheet after the list renders; an unknown id is ignored. Depends on T030.
- [X] T032 [US3] Add Nearby styles to `app/css/app.css` (search field, chip row scrolling inside itself, switch, segmented control, list rows ≥ 48px tall, pills, empty state, sheet content), matching the prototype at 390px; no horizontal page scroll at 320px in fa (FR-038).
- [X] T033 [US3] Run TF-E10 to TF-E15, then re-run TF-E04 (sheet buttons) and TF-E05 (highlight deep links) now that the sheet exists. Save evidence and add rows to `specs/002-hotel-demo-app/evidence.md`.

**Checkpoint**: Nearby works alone and from Home highlights.

---

## Phase 5: User Story 2 - Rate the stay inside the app (Priority: P1) (PRD §7 step 4)

**Goal**: The existing survey runs inside the same shell, restyled as app cards, with the welcome-screen language handover, the locked switch on question screens, resume without `lang`, and the two thank-you buttons. Survey content and rules are unchanged.

**Independent Test**: From Home tap Rate, try to skip a required question, complete all nine, land on thank-you, tap Back to home (TF-E06 to TF-E09, TF-E16 to TF-E19).

### Tests for User Story 2 (write first)

- [X] T034 [P] [US2] Write `scratch/tester/tf-e06-handover.cjs` (TF-E06): fresh context, `hotel.lang = fa`, open `/app/index.html`, tap the Rate card; assert `<html lang="fa" dir="rtl">` on the welcome screen inside the shell (`.hs-appbar`, `.hs-tabbar` present), the final URL has `lang=fa`, no language selector inside the welcome content, the drawer language controls are enabled links, and `countRows()` is unchanged.
- [X] T035 [P] [US2] Write `scratch/tester/tf-e07-required.cjs` (TF-E07): Start, then on each of Q1–Q7 press Continue without answering; assert the page stays on the same question and the translated required message is visible in place; assert no Back button on Q1. Run in en and fa.
- [X] T036 [P] [US2] Write `scratch/tester/tf-e08-submit.cjs` (TF-E08): answer Q1–Q7, leave Q8 and Q9 empty, Submit; assert the thank-you screen has the check icon, end text, both hotel names, `s.done.home` → `/app/index.html` and `s.done.nearby` → `/app/nearby.html` (tap each in turn from a fresh completion or by checking `href` plus one tap); `countCompleted()` +1; and a query of `startlanguage` for the newest completed row (only that column) equals the survey language.
- [X] T037 [P] [US2] Write `scratch/tester/tf-e09-locked.cjs` (TF-E09): on Q3 open the drawer; assert both language buttons have the `disabled` attribute, the `d.langLocked` note is visible, and tapping them changes neither URL nor `localStorage['hotel.lang']`.
- [X] T038 [P] [US2] Write `scratch/tester/tf-e16-resume.cjs` (TF-E16, Verify R1): in en, answer Q1–Q3 and reach Q4; tap the Home tab; switch the app to fa in the drawer; tap Rate; record every request URL. Assert: the page shows Q4 (not the welcome screen), `<html lang="en">`, no request to `/index.php/420001` carried `lang`, the drawer switch is disabled, `countCompleted()` unchanged. Then finish the survey; tap Rate again; assert a fresh welcome screen with `<html lang="fa">`. Write `TF-E16-result.json` with `resumed: true|false`.
- [X] T039 [P] [US2] Write `scratch/tester/tf-e17-expiry.cjs` (TF-E17): reach Q3, go Home, `context.clearCookies()`, set `hotel.lang = fa`, tap Rate; assert a fresh welcome screen in Persian; assert `countRows()` grew by exactly the abandoned row while `countCompleted()` did not (the partial row has `submitdate` NULL).
- [X] T040 [P] [US2] Write `scratch/tester/tf-e18-welcome-switch.cjs` (TF-E18): on the welcome screen in en, drawer → فارسی; assert reload with `<html lang="fa" dir="rtl">`, `localStorage['hotel.lang'] === 'fa'`; switch back to English and assert the reverse; `countRows()` unchanged throughout.
- [X] T041 [P] [US2] Write `scratch/tester/tf-e19-thankyou-switch.cjs` (TF-E19): complete a survey in en; on the thank-you screen, drawer → فارسی; assert navigation to `/app/index.html` with `<html lang="fa">` and `localStorage['hotel.lang'] === 'fa'`.

### Implementation for User Story 2

- [X] T042 [US2] Edit `THEME/views/subviews/hotel/i18n.twig`: add the shared shell keys from `data-model.md` §5 with text identical to `app/js/i18n.js` (`menu`, `notifications`, `tab.home` … `tab.services`, `nav.main`, `title.rate`, `d.mystay`, `d.room`, `d.wifi`, `d.settings`, `d.soon`, `d.lang`, `d.langLocked`, `demo`, `soon`, `lang.en`, `lang.fa`) and the survey-only keys (`s.time`, `s.anon`, `s.q9`, `s.langNote`, `s.done.home`, `s.done.nearby`). Keep every existing key and the `brand.*` names. Done when every new key has a non-empty `en` and `fa` value.
- [X] T043 [US2] Copy the vanilla footer from the container read-only (`docker compose exec limesurvey cat /var/www/html/themes/survey/vanilla/views/subviews/footer/footer.twig`) into a new override `THEME/views/subviews/footer/footer.twig`, keep its content, and append the tab bar of `contracts/app-shell.md` §2 (Rate tab `aria-current="page"`; links `/app/index.html`, `/app/nearby.html`, `{{ aSurveyInfo.surveyUrl }}`-based Rate link without `lang` (or `/index.php/420001` if `surveyUrl` carries parameters; never add `lang`), `/app/dashboard.html`, Services `<button data-soon>`), every link with `data-pjax="false"`, strings from `i18n.twig`. Then fill the `SURVEY_PAGES` hook in `scratch/tester/tf-e03-navigation.cjs` with the welcome screen and Q3.
- [X] T044 [US2] Edit `THEME/views/subviews/header/nav_bar.twig`: render the app bar (title `title.rate`, `hs-mark`, bell `data-soon`), scrim, drawer and `#hs-toast` exactly per `contracts/app-shell.md` §2, keeping the `placeholdernotice` switch (rendered as a compact muted line at the end of the content per R-14, not the old header line). Drawer state from `aSurveyInfo.include_content` (data-model.md §2, app-shell.md §5): `firstpage` → two `<a href="{surveyUrl}?lang=en|fa" data-pjax="false">` with `aria-current="true"` on the current language; `submit` → two `<button data-lang="en|fa" data-href="/app/index.html">`; anything else → two `<button disabled>` plus the visible `d.langLocked` note. Drawer items Home, Rate, Nearby, Dashboard as plain `<a data-pjax="false">` (Rate without `lang`), 4 mock items as `<button data-soon>` with the `d.soon` pill, footer `demo`. The shell renders in `aSurveyInfo.languagecode` (FR-015). No hard-coded survey ID (R-18).
- [X] T045 [US2] Edit `THEME/config.xml`: in `<files>` add `css/shell.css` after `css/hotel.css` and `scripts/shell.js` before `scripts/custom.js` (new names only, never a vanilla file name); set the `questionhelptextposition` option default to `bottom`; bump `<version>` and `<lastUpdate>`. Done when `xmllint --noout THEME/config.xml` (or `python3 -c "import xml.dom.minidom,sys;xml.dom.minidom.parse(sys.argv[1])"`) passes.
- [X] T046 [P] [US2] Edit `THEME/views/subviews/content/firstpage.twig`: welcome card per `contracts/survey-theme.md` §2 (star icon, tagline heading, admin welcome message, facts row `s.time` · `s.anon` · `s.q9`, Start `nav.start`, `s.langNote`); keep the survey name `<h1>` in the DOM but visually hidden; **remove** the include of `language_changer_first_page.twig` (the file stays, unused). Keep `#welcome-container`.
- [X] T047 [P] [US2] Edit `THEME/views/subviews/content/submit.twig`: keep the check icon, admin end text and both hotel names; add `<a class="… hotel-done-btn" href="/app/index.html" data-pjax="false">{{ s.done.home }}</a>` and `<a … href="/app/nearby.html" data-pjax="false">{{ s.done.nearby }}</a>` styled as buttons (FR-014). Keep the `.hotel-done` marker the seed job checks.
- [X] T048 [P] [US2] Edit `THEME/views/subviews/header/progress_bar.twig` (markup only): progress bar and "Question N of 9" in one row as the prototype; values and rules unchanged; fill grows from the inline start (right in RTL). _(Note: progress_bar.twig markup is unchanged; the one-row layout is CSS in hotel.css.)_
- [X] T049 [US2] Edit `THEME/css/hotel.css`: restyle welcome, question and thank-you as app cards matching the prototype (question card with Required/Optional tag, `.hotel-scale` tiles at prototype sizes with ≥ 48px targets, help caption below the scale, validation message in place), hide `.hotel-welcome-intro` and `.hotel-welcome-time` inside the shell, remove the old header styles the app bar replaces, style the thank-you buttons and the compact placeholder notice. Logical properties, `var(--…)` only.
- [X] T050 [US2] Edit `THEME/scripts/custom.js`: replace spec 001's browser-language redirect with the welcome-screen alignment of `contracts/app-shell.md` §6, running only when `#welcome-container` exists: (1) URL has `lang` → `HotelShell.setLang(document.documentElement.lang)` and stop; (2) else if `document.documentElement.lang !== HotelShell.getLang()` → `location.replace(<same URL with lang=<pref>>)`; (3) else nothing. Keep any other existing behaviour of the file. No logging. Done when `node --check` passes.
- [X] T051 [US2] Apply the theme: in the admin (`/index.php/admin` → Configuration → Themes → `hotel-classic` → Reset), by hand or with a Playwright admin script in `scratch/tester/` using the admin credentials from `.env` (never printed), then clear the runtime asset cache with `docker compose exec limesurvey sh -c 'rm -rf /var/www/html/tmp/assets/*'` if changes do not show (plan R4). Verify (R-02, R-15) that a survey page loads `shell.css` and `shell.js` and that the Q1 help text renders below the scale. Record both in `specs/002-hotel-demo-app/evidence.md`.
- [X] T052 [US2] **Verify R2 (pjax bypass, R-07)**: on Q3 (en), tap the Home tab, the Nearby drawer item and Dashboard; with Playwright, assert each is a top-level navigation (`page.waitForNavigation` / `framenavigated` on the main frame with the `/app/*.html` URL and a fresh `document`, not an XHR into `#dynamicreload`; the request log shows a document request, not `X-PJAX`). If a link is captured by pjax, add the attribute or class vanilla's ajaxify uses to skip links to every leaving link in `nav_bar.twig` and `footer.twig` and re-run. Record outcome and any fix in `specs/002-hotel-demo-app/evidence.md` as "R2 Verify".
- [X] T053 [US2] **Verify R1 (session resume, R-05 Verify a–d)**: run `scratch/tester/tf-e16-resume.cjs`, `tf-e17-expiry.cjs` and `tf-e18-welcome-switch.cjs`. Record (a) resume at Q4 in the session language, (b) leaving the welcome screen via `?lang=` creates no row, (c) after Submit Rate shows a fresh welcome, (d) after cookie clear Rate shows a fresh welcome in the app language, as "R1 Verify" rows. If (a) fails because LimeSurvey restarts instead of resuming, do **not** add `lang`, a flag or server code: apply the plan's fallback (accept a fresh start; partial rows still never count), mark TF-E16's resume assertion as a known limitation in `specs/002-hotel-demo-app/evidence.md` and in `THEME/README.md`, and report it to the orchestrator for the operator.
- [X] T054 [US2] Run TF-E03 (survey pages), TF-E06, TF-E07, TF-E08, TF-E09 and TF-E19 in en and fa at 390px. Confirm the invariant `git diff --stat limesurvey/survey/` is empty. Save evidence and add rows to `specs/002-hotel-demo-app/evidence.md`.

**Checkpoint**: The survey runs inside the shell end to end; R1 and R2 are verified and recorded.

---

## Phase 6: User Story 4 - Manager dashboard with live numbers (Priority: P2) (PRD §7 step 5)

**Goal**: A host-side job publishes an aggregates-only `app/data/dashboard.json` (one-shot and `--watch`), and the Dashboard page shows KPIs, NPS, six category bars, the language split, range chips and all states.

**Independent Test**: Start `--watch`, note the total, submit one survey, see it within 15 s; compare figures with the manual SQL check.

### Tests for User Story 4 (write first, must fail before T062)

- [X] T055 [P] [US4] Create synthetic fixtures (no real data) in `scripts/tests/fixtures/`: `questions.tsv` (tab-separated `title sid gid qid` rows for Q1OVERALL … Q7RECOMMEND plus Q8LIKED and Q9IMPROVE, as `mariadb --batch --skip-column-names` prints them), `questions_missing.tsv` (Q4STAFF absent), `questions_badcol.tsv` (one row producing a column that fails `^[0-9]+X[0-9]+X[0-9]+$`), and `ranges.tsv` (the aggregate rows the job's SQL returns for `7d`, `30d`, `all` plus the `@now` line, with values chosen for the tie cases 63/20, 61/20, 7/2 and an `n = 0` range).
- [X] T056 [P] [US4] Write `scripts/tests/test_build_dashboard.py` covering TF-U01 to TF-U06 with `unittest` and `_load.load('build-dashboard')`: **TF-U01** shaping a range from `ranges.tsv`: counts copied, `avg` = sum/n half-up to 1 decimal (63/20 → 3.2, 61/20 → 3.1, 7/2 → 3.5), `n = 0` → `None`; **TF-U02** NPS: all passives → 0, all detractors → −100, all promoters → 100, 1 promoter + 7 passives → 13, 1 detractor + 7 passives → −13, `n = 0` → `None`; **TF-U03** a stdlib key/type walker implementing `specs/002-hotel-demo-app/contracts/dashboard.schema.json` accepts the snapshot and raises on any extra key (e.g. `comments`) at any level; **TF-U04** atomic write: write A, run a cycle whose query raises → file still equals A and no `*.tmp` remains; writing B replaces A through one `os.replace` (patch `os.replace` to count calls); **TF-U05** column resolution: `questions.tsv` → `420001X1X1` … `420001X1X7` in order, Q8/Q9 rows ignored, `questions_missing.tsv` → the exit-2 error class, `questions_badcol.tsv` → rejected; **TF-U06** `generatedAt` comes from the SQL `@now` field formatted `YYYY-MM-DDTHH:MM:SSZ`, and captured stdout/stderr of one successful and one failed cycle match only `^dashboard: all=\d+ 30d=\d+ 7d=\d+ at \S+Z$` and `^dashboard: cycle failed: \w+: .+$`. The DB call must be injectable (a function argument or module attribute) so tests never call Docker. Done when the tests run and fail because `scripts/build-dashboard.py` does not exist yet.
- [X] T057 [P] [US4] Write `scratch/tester/tf-e22-dashboard.cjs` (TF-E22): read `app/data/dashboard.json` from disk; on `/app/dashboard.html` for each chip 7/30/All assert Responses = `total`, Overall = `categories[0].avg` formatted to 1 decimal "/ 5", NPS signed (`+20`, `0`, `−100`) inside an LTR-isolated element, six bars each with `avg` and `n = {n}`, the language split percentages of `total`; assert chips update every figure; in fa assert Persian digits.
- [X] T058 [P] [US4] Write `scratch/tester/tf-e23-dashboard-states.cjs` (TF-E23) using `page.route('**/app/data/dashboard.json*')`: a snapshot with `total 0` → `db.none` and no `NaN`, `Infinity` or `undefined` in the text; `total 5` → figures plus `db.low`; 404 → `db.unavailable` and no numbers; invalid JSON → `db.unavailable`; `generatedAt` 2 minutes old → figures plus `db.stale` with the time. Build the synthetic snapshots in the script.
- [X] T059 [P] [US4] Write `scratch/tester/tf-e24-live.cjs` (TF-E24): with `--watch` running (started by the operator or the script via `child_process`), open the Dashboard (30d) in one page, note Responses; in a second context submit a survey with `answerSurvey`; measure time from Submit to the Responses increase without reloading. Repeat 10 times; pass when ≥ 9 of 10 are ≤ 15 s. Write the timings to `TF-E24-timings.json`.
- [X] T060 [P] [US4] Write the data-flow scripts in `scratch/tester/` (bash, git-ignored): `tf-d1-oneshot.sh` (TF-D1: run `python3 scripts/build-dashboard.py`, assert exit 0, exactly one stdout line, validate the file with the walker from T056, and on an empty table every range has `total 0`, `avg null`, `score null`); `tf-d4-watch-log.sh` (TF-D4: capture `--watch` stdout and stderr for 60 s while a survey with a synthetic comment is submitted; assert every line matches the two documented formats and `grep -c 'synthetic'` on the log is 0); `tf-d5-db-loss.sh` (TF-D5: with `--watch` running, `sha256sum` the file, `docker compose stop db`, wait 25 s, assert `cycle failed` lines and identical hash, `docker compose start db`, assert writes resume without restarting the job); `tf-d7-readonly.sh` (TF-D7: on a quiet stack record `SHOW GLOBAL STATUS LIKE 'Com_%'`, run the job once, record again; assert `Com_insert`, `Com_update`, `Com_delete`, `Com_replace`, `Com_create_%`, `Com_alter_%`, `Com_drop_%` unchanged; save both snapshots as evidence).

### Implementation for User Story 4

- [X] T061 [US4] Create `scripts/build-dashboard.py` (Python 3 stdlib only) per `contracts/dashboard-data.md` §2 and §5 and research R-08 to R-10: CLI `[--watch] [--interval SECONDS (default 10, min 2)] [--out PATH (default app/data/dashboard.json, relative to the repo root resolved from __file__)] [--survey-id ID (default 420001)]`. DB access only via `docker compose exec -T db sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" exec mariadb -u "$MARIADB_USER" "$MARIADB_DATABASE" --batch --skip-column-names'` with SQL on stdin, run from the repo root. Each cycle: `SET SESSION TRANSACTION READ ONLY; START TRANSACTION READ ONLY; SET @now = NOW();` select `@now`; resolve columns with `SELECT title, sid, gid, qid FROM lime_questions WHERE sid = <id> AND parent_qid = 0 AND title IN ('Q1OVERALL','Q2CLEAN','Q3COMFORT','Q4STAFF','Q5BREAKFAST','Q6FACILITIES','Q7RECOMMEND')` (the comment codes are never named), validate each `{sid}X{gid}X{qid}` against `^[0-9]+X[0-9]+X[0-9]+$`; then one aggregate `SELECT` per range (`7d`, `30d`, `all`) over `submitdate IS NOT NULL` and `submitdate >= @now - INTERVAL 7|30 DAY` (no bound for `all`) returning only: total, `startlanguage` counts (`en`, `fa`, other), per Q1–Q6 count and sum of values in `'1'…'5'`, Q7 count of `'0'…'10'`, promoters (`9`,`10`), passives (`7`,`8`), detractors (`0`–`6`); then `ROLLBACK`. Shape with `Decimal` and `ROUND_HALF_UP` (avg 1 decimal, NPS integer, `None` when `n = 0`), category order and keys fixed (`overall` … `facilities` with codes `Q1OVERALL` … `Q6FACILITIES`), `schemaVersion: 1`, `surveyId`, `generatedAt` from `@now` as `YYYY-MM-DDTHH:MM:SSZ`. Validate against the schema walker before writing; write atomically (`<out>.tmp` in the same folder, `fsync`, `os.replace`). stdout one line per success `dashboard: all=<n> 30d=<n> 7d=<n> at <generatedAt>`; stderr one line per failure `dashboard: cycle failed: <ErrorClass>: <short reason>` (never SQL output or row values). Exit codes (one-shot): 0 written, 1 DB/Docker error, 2 survey or question code not found, 3 output not writable. `--watch`: failures never exit and keep the last good file; SIGINT exits 0. The file must not contain the strings `Q8`, `Q9`, `LIKED`, `IMPROVE`, `X8`, `X9`. Done when `python3 -m unittest discover -s scripts/tests` passes (TF-U01 to TF-U06).
- [X] T062 [US4] Implement `app/js/dashboard.js` per `contracts/dashboard-data.md` §3 and `contracts/app-screens.md` §4: fetch `data/dashboard.json?t=<now>` with `cache: 'no-store'` on load, every 5 s while `document.visibilityState === 'visible'`, and once on `visibilitychange` to visible; default range `30d`; label `db.view` + chips `db.7`, `db.30`, `db.all` (`aria-pressed`); states: missing/HTTP error/invalid JSON → only the `db.unavailable` card; `total = 0` → chips + `db.none`; `0 < total < 10` → figures + `db.low` with the count; `generatedAt` older than 60 s → figures + `db.stale` with the time; always with data: `db.privacy` and `db.updated` with `generatedAt` in local `HH:MM`. KPI tiles Responses, Overall stay (`categories[0].avg` "/ 5"), NPS signed in `<bdi dir="ltr">`; NPS card with detractor/passive/promoter bar and percentages of `nps.n`; category card with six rows (`db.cat.*` label, `avg` 1 decimal, `n = {n}`, bar width `avg / 5` from the inline start, highest average gold, first on ties); language card en vs فارسی whole-number percentages of `total`. Only format published numbers, never re-round from sums. All numbers via `num()`; text via `textContent`. Selected range survives `hotel:langchange`. Fetch nothing else.
- [X] T063 [US4] Add Dashboard styles to `app/css/app.css` (chips row, KPI row, NPS bar, category bars filling from the inline start, language split, notes, unavailable and empty states) matching the prototype's `dash()` at 390px. `var(--…)` only.
- [X] T064 [US4] Run TF-U01 to TF-U06 (`python3 -m unittest discover -s scripts/tests -v`, save output as `evidence/TF-U-dashboard.txt`), TF-D1, TF-D4, TF-D5, TF-D7, TF-E23 and TF-E24 (needs the survey from Phase 5). Add rows to `specs/002-hotel-demo-app/evidence.md`.

**Checkpoint**: The dashboard loop works with live submissions; only aggregates are published.

---

## Phase 7: User Story 6 - Demo data ready (Priority: P3) (PRD §7 step 6)

**Goal**: An operator seeds about 40 varied responses in both languages through the public survey; the dashboard numbers match a manual SQL count.

**Independent Test**: Run the seed job, run the refresh job once, confirm about 40 responses with both languages and varied averages (TF-D6), then the manual SQL check (TF-D2).

### Tests for User Story 6 (write first, must fail before T067)

- [X] T065 [P] [US6] Create `scripts/tests/fixtures/survey_page.html`: a synthetic LimeSurvey-like page with `<form id="limesurvey" action="/index.php/420001">`, hidden inputs (`YII_CSRF_TOKEN`, `sid`, `thisstep`, `SID`, `start_time`, `LEMpostKey`, a `relevance…` and a `java…` field) and a radio group named `420001X1X1` with values 1–5. No real data.
- [X] T066 [P] [US6] Write `scripts/tests/test_seed_form.py` (TF-U07) with `_load.load('seed-demo')`: parsing the fixture returns every hidden input name and value, the form action and the answer field name `420001X1X1`; the host guard refuses `http://example.com` and `http://hotelsurvey.example.org` (exit code 2 path) and accepts `http://hotelsurvey.localhost`, `http://localhost:8090` and `http://127.0.0.1`; the answer generator with `--seed 42` is deterministic, keeps Q1–Q6 in 1–5 and Q7 in 0–10, and its Q8/Q9 values are empty or match `^\[demo seed \d+\] synthetic comment$`. Done when the tests fail because `scripts/seed-demo.py` does not exist yet.

### Implementation for User Story 6

- [X] T067 [US6] Create `scripts/seed-demo.py` (Python 3 stdlib: `urllib.request`, `http.cookiejar`, `html.parser`) per `contracts/scripts-cli.md` §2 and research R-16: CLI `[--count N (default 40, 1–200)] [--base-url URL (default PUBLIC_URL from .env, else http://hotelsurvey.localhost)] [--survey-id ID (default 420001)] [--seed N (default 42)] [--fa-share F (default 0.55)] [--dry-run]`. Host guard: only `localhost`, `*.localhost`, `127.0.0.1`, else exit 2. Per response: new cookie jar; `GET /index.php/<sid>?lang=<l>&newtest=Y`; parse `form#limesurvey` (all hidden inputs + action); POST hidden fields + `move=movenext` (welcome → Q1); for each question re-read the hidden fields from the latest page, post the answer to the field name found in the form (never hard-coded) and `move=movenext`, `movesubmit` on Q9; require the `.hotel-done` marker on the final page, else print `seed: response <i> failed at step <name>` and exit 1 (never print HTML or answers). Answers: deterministic PRNG with per-question bias (Breakfast lowest, Staff highest), Q7 correlated with Q1 covering promoters, passives and detractors, Q8/Q9 empty in about 70%, otherwise `[demo seed <i>] synthetic comment`. stdout: one progress line per 10 responses and `seed: submitted <n> responses (en=<a>, fa=<b>)`. `--dry-run` prints the planned counts per language and per-question means and submits nothing. No database code, no RemoteControl API, no clock change (FR-035, FR-036). Done when `python3 -m unittest discover -s scripts/tests` passes (TF-U07).
- [X] T068 [US6] **Verify R7 (seed form posts, R-16)**: note `countRows()` and `countCompleted()`; run `python3 scripts/seed-demo.py --dry-run` → counts unchanged; run `python3 scripts/seed-demo.py --count 1` → exit 0 and exactly +1 completed row with `submitdate` today. If LimeSurvey rejects a post (CSRF, `LEMpostKey`, wrong `move`), fix by re-reading hidden fields from each response page or correcting field handling in `scripts/seed-demo.py`; **never** fall back to table writes or the RemoteControl API. If still blocked, stop and report the failing step name to the orchestrator (the Playwright fallback is allowed only in `scratch/`, not committed). Record as "R7 Verify" in `specs/002-hotel-demo-app/evidence.md`.
- [X] T069 [US6] Run TF-D6: `python3 scripts/seed-demo.py --count 40`; assert exit 0, +40 completed rows, both languages present (`SELECT startlanguage, COUNT(*) … GROUP BY startlanguage`), Q1–Q6 averages not all equal, every `submitdate` is today (`SELECT COUNT(*) … WHERE DATE(submitdate) <> CURDATE()` over the new rows = 0), and `grep -nE 'INSERT|UPDATE|DELETE|mariadb|mysql' scripts/seed-demo.py` finds no database code. Save as `evidence/TF-D6.txt`.
- [X] T070 [US6] Run TF-D2 and TF-D3: run `python3 scripts/build-dashboard.py` once, then within a few seconds the manual SQL check from `contracts/dashboard-data.md` §4 for `@days = 7`, `30` and `NULL`; compare total, language counts, Q1–Q6 averages, promoters, detractors and NPS with the matching range in `app/data/dashboard.json`; every figure must be equal. Save `evidence/TF-D2-sql-7d.txt`, `TF-D2-sql-30d.txt`, `TF-D2-sql-all.txt` (aggregates only). Then `grep -c 'synthetic comment' app/data/dashboard.json` → `0`, keys only from the schema, no array longer than 6 (`evidence/TF-D3.txt`).
- [X] T071 [US6] Run TF-E22 (`scratch/tester/tf-e22-dashboard.cjs`) in en and fa at 390px against the seeded data. On seed day 7/30/All show the same numbers (A-02, expected). Add rows to `specs/002-hotel-demo-app/evidence.md`.

**Checkpoint**: Seeded data, dashboard figures equal the manual SQL check, no comment text published.

---

## Phase 8: User Story 5 - Bilingual and RTL everywhere (Priority: P2) (PRD §7 step 7, part 1)

**Goal**: Every string exists in both languages with identical shared text, Persian is RTL on every screen with Persian digits, and the choice persists across screens and reloads.

**Independent Test**: Switch to Persian on Home, visit every tab and complete a survey; reload; switch back (TF-U08, TF-E21).

### Tests for User Story 5 (write first)

- [X] T072 [P] [US5] Write `scripts/tests/test_shell_strings.py` (TF-U08): parse `app/js/i18n.js` (the `en` and `fa` object literals, stdlib regex parser for `'key': 'value'` pairs) and `THEME/views/subviews/hotel/i18n.twig`; assert every shared key in `data-model.md` §5 exists in both files with identical `en` and `fa` text (map `brand.en`/`brand.fa`/`tagline` to the Twig `brand.*` names); no value is empty in either language; every key used via `t('…')` in `app/js/*.js` exists in both languages of `i18n.js`.
- [X] T073 [P] [US5] Write `scratch/tester/tf-e21-strings.cjs` (TF-E21): Persian walkthrough of Home, Nearby with the sheet open, Dashboard, survey welcome, Q1, Q7, Q9 and thank-you: collect visible text plus `aria-label`, `placeholder` and `title` values and fail on any Latin letter outside the allow-list (brand wordmark, "English", "NPS", `n =`); assert the drawer opens from the right, `.hs-flip` chevrons are mirrored, bars fill from the right, digits are Persian; reload Home and Nearby and assert Persian is kept (US5-AS2). English walkthrough: fail on Arabic-script letters other than "فارسی" and the Persian brand name.

### Implementation for User Story 5

- [X] T074 [US5] Run TF-U08 and TF-E21 in both languages; fix any missing, empty or mismatched string in `app/js/i18n.js` or `THEME/views/subviews/hotel/i18n.twig` (keeping shared text identical) and any RTL defect in `THEME/css/shell.css`, `app/css/app.css` or `THEME/css/hotel.css`. Persian strings stay proposals for the open Persian copy review (plan R11). Save evidence and add rows to `specs/002-hotel-demo-app/evidence.md`.

**Checkpoint**: Both languages pass the string scans and the parity test.

---

## Phase 9: Polish & Cross-Cutting Concerns (PRD §7 step 7, part 2)

**Purpose**: Extended `validate.sh`, the full-matrix walkthrough, reduced motion, demo-day script, visual comparison, docs and evidence.

- [X] T075 Extend `scripts/validate.sh` per `contracts/scripts-cli.md` §3, keeping every existing check and the final `validate: ok`: add the required files (`app/index.html`, `app/nearby.html`, `app/dashboard.html`, `app/css/app.css`, `app/js/{i18n,app,home,nearby,dashboard}.js`, `app/data/places.json`, `THEME/css/shell.css`, `THEME/scripts/shell.js`, `THEME/views/subviews/footer/footer.twig`, `scripts/build-dashboard.py`, `scripts/seed-demo.py`); hex check also over `app/` (`*.css`, `*.js`, `*.html`, `*.json`); remote-asset check over `app/` `*.html|*.css|*.js` (allow only `http://www.w3.org/2000/svg`) and Google Fonts; bare `/app/` links (`href="/app/"`, `href="/app"`, or a link ending in `/app/`) in `app/` and theme views; `places.json` parses, `demo` is `true`, 18–24 places; `python3 -m py_compile` for `scripts/*.py`; `node --check` for `app/js/*.js` and `THEME/scripts/*.js` (skip with a notice when `node` is absent); comment guard (`build-dashboard.py` contains none of `Q8`, `Q9`, `LIKED`, `IMPROVE`, `X8`, `X9`); `git check-ignore -q app/data/dashboard.json`; survey ID in `app/js/app.js` `SURVEY_URL` equals the `--survey-id` default in both scripts; `python3 -m unittest discover -s scripts/tests`. Done when `./scripts/validate.sh` prints `validate: ok`.
- [X] T076 Run TF-S1: `./scripts/validate.sh` → `validate: ok`. Then in a throwaway copy (`rsync -a --exclude .git --exclude scratch ./ scratch/tf-s1/` plus `git init` there so `check-ignore` works) inject each violation one at a time and confirm the script fails, then revert and confirm it passes: a hex colour in `app/css/app.css`, `href="/app/"` in `app/index.html`, `Q8` in `scripts/build-dashboard.py`, the `app/data/dashboard.json` line removed from `.gitignore`. Save `evidence/TF-S1.txt` and a row in `specs/002-hotel-demo-app/evidence.md`.
- [X] T077 [P] Write `scratch/tester/tf-e20-matrix.cjs` (TF-E20): for Home, Nearby with the sheet open, Dashboard, survey welcome, Q1, Q7, Q9 and thank-you, at every `VIEWPORTS` width, in en and fa: assert `noHScroll`, app bar and tab bar present, and `targets48()` returns nothing (chips: 48px target, 36px visual); save `TF-E20-<screen>-<lang>-<width>.png`.
- [X] T078 [P] Write `scratch/tester/tf-e25-motion.cjs` (TF-E25): with `reducedMotion: 'reduce'`, open the drawer, the Nearby sheet and the toast; assert computed `transition-duration` is `0s` on `.hs-drawer`, `.hs-sheet`, `.hs-toast` and everything still opens and closes.
- [X] T079 [P] Write `scratch/tester/tf-e26-demo-day.cjs` (TF-E26): at 390px, en then fa, with `--watch` running: Home → Nearby, search `cafe` + Open now → Rate, complete and submit → Dashboard; assert Responses increases within 15 s, the run completes on the first attempt and `consoleErrors` is empty.
- [X] T080 [P] Write `scratch/tester/tf-e27-visual.cjs` (TF-E27): at 390px in en and fa, screenshot Home, Nearby, the Nearby sheet, Dashboard and the drawer from the app and the matching screens of `prototype/index.html` (opened via `file://`, language set through its own switch), plus a survey question page next to an app page; save pairs as `TF-E27-<screen>-<lang>-{app,proto}.png` and a JSON checklist of components, order, strings, icons and states compared. The only allowed differences: no device bezel, the brand mark in the app bar, the real survey content, and the placeholder notice when on.
- [X] T081 Run TF-E20, TF-E25, TF-E26 and TF-E27, fix any defect in the owning implementation file, re-run the affected flows, and record results in `specs/002-hotel-demo-app/evidence.md`. For TF-E27, list every visual difference found and whether it is one of the documented ones.
- [X] T082 [P] Update `THEME/README.md`: file table (new `css/shell.css`, `scripts/shell.js`, `views/subviews/footer/footer.twig`; `language_changer_first_page.twig` marked unused), the shared shell and its two producers, the language rules (welcome alignment, locked switch, Rate without `lang`, resume behaviour and any R1 limitation from T053), the Reset and asset-cache steps, and the list of new Persian strings pending review (plan R11).
- [X] T083 [P] Update `README.md`: project status (demo iteration), the app URL `http://hotelsurvey.localhost/app/index.html`, the demo-day commands (`docker compose up -d`, `python3 scripts/build-dashboard.py --watch`, `python3 scripts/seed-demo.py`), and a pointer to `specs/002-hotel-demo-app/quickstart.md`. No change to `AGENTS.md` or `docs/decisions.md`.
- [ ] T084 Run the full `specs/002-hotel-demo-app/quickstart.md` walkthrough (§1–§8) once in en and once in fa, including the TF-D5 resilience check if not already recorded, and confirm every demo PRD §6 acceptance item; add a final summary row per PRD §6 item to `specs/002-hotel-demo-app/evidence.md` with the flow IDs that prove it, and confirm all 43 flows (TF-S1, TF-U01–U08, TF-D1–D7, TF-E01–E27) have a row with a result. _(OPEN: the manual Chrome device-mode walkthrough of quickstart §4 (steps 1 to 18, en and fa) needs a person. Its checks are covered by TF-E01 to TF-E27 and TF-D1 to TF-D7. All 43 flows have rows in evidence.md. Blocker: human walkthrough.)_

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. T004 needs T002.
- **Foundational (Phase 2)**: needs Phase 1. Blocks every story.
- **US1 Home (Phase 3)**: needs Phase 2. Creates `app/data/places.json` (T020), which US3 reuses.
- **US3 Nearby (Phase 4)**: needs Phase 2 and T020. The highlight deep-link part of TF-E05 and the sheet part of TF-E04 run in T033.
- **US2 Survey (Phase 5)**: needs Phase 2 (`shell.css`, `shell.js`, string text from `i18n.js`). Independent of US1/US3 code, but TF-E03 and TF-E06 start from app pages, so run them after Phase 3.
- **US4 Dashboard (Phase 6)**: the job and unit tests need only Phase 1–2. TF-E24 and TF-D4 need US2 (a working survey).
- **US6 Seed (Phase 7)**: needs US2 (the `.hotel-done` marker, the public form) and US4 (TF-D2, TF-D3, TF-E22 compare against `dashboard.json`).
- **US5 Bilingual (Phase 8)**: needs every screen (Phases 3–7).
- **Polish (Phase 9)**: needs all stories. T075 can start earlier (after the files it lists exist).

### Verify items (must be run on the live stack)

- **R1 session resume** → T038 (flow script) and T053 (verification and fallback).
- **R2 pjax bypass** → T052.
- **R7 seed form posts** → T068.

### Within each story

- Flow scripts and unit tests first; unit tests must fail before their implementation (T056 before T061, T066 before T067).
- Data before screen scripts (T020 before T021/T030).
- `i18n.twig` (T042) before the Twig views (T043, T044, T046, T047); `config.xml` (T045) and the views before the Reset (T051); the Reset before R2/R1 verification (T052, T053).
- `app/css/app.css` is edited in T012, T022, T032, T063: these are sequential, never parallel.
- `app/js/nearby.js` T030 before T031.

### Parallel Opportunities

- Phase 1: T002, T003, T005, T006.
- Phase 2: T010 in parallel with T007–T009 (different files); T011 after T009 and T010.
- Phase 3: all flow scripts T015–T019 and the data file T020 together.
- Phase 4: flow scripts T024–T029 together.
- Phase 5: flow scripts T034–T041 together; then T046, T047, T048 together after T042.
- Phase 6: T055–T060 together; the job (T061) and the page (T062) can be built in parallel by two agents.
- Phase 7: T065, T066 together.
- Phase 8: T072, T073 together.
- Phase 9: T077–T080, T082, T083 together.

---

## Parallel Example: User Story 2

```bash
# Flow scripts first, together:
Task: "Write scratch/tester/tf-e06-handover.cjs (TF-E06)"
Task: "Write scratch/tester/tf-e07-required.cjs (TF-E07)"
Task: "Write scratch/tester/tf-e16-resume.cjs (TF-E16, Verify R1)"
Task: "Write scratch/tester/tf-e18-welcome-switch.cjs (TF-E18)"

# After i18n.twig (T042), the independent views together:
Task: "Edit THEME/views/subviews/content/firstpage.twig"
Task: "Edit THEME/views/subviews/content/submit.twig"
Task: "Edit THEME/views/subviews/header/progress_bar.twig"
```

## Parallel Example: User Story 4

```bash
Task: "Create synthetic fixtures in scripts/tests/fixtures/"
Task: "Write scripts/tests/test_build_dashboard.py (TF-U01–U06)"
Task: "Write scratch/tester/tf-e23-dashboard-states.cjs (TF-E23)"
Task: "Write scratch/tester/tf-d*.sh data flows (TF-D1, D4, D5, D7)"
```

---

## Implementation Strategy

### MVP first (User Story 1)

1. Phase 1 Setup, then Phase 2 shared shell.
2. Phase 3 Home. **Stop and validate**: TF-E01 to TF-E05 pass in en and fa. This is the "app, not website" impression on its own.

### Incremental delivery (PRD §7 order)

1. Shell → Home (MVP).
2. Nearby (US3): TF-E10 to TF-E15.
3. Survey in the shell (US2): R2 and R1 verified, TF-E06 to TF-E09, TF-E16 to TF-E19. Home → Rate → thank-you now works.
4. Dashboard (US4): TF-U01 to TF-U06, TF-D1, D4, D5, D7, TF-E23, TF-E24. The demo loop closes.
5. Seed (US6): R7 verified, TF-U07, TF-D6, TF-D2, TF-D3, TF-E22.
6. Bilingual sweep (US5): TF-U08, TF-E21.
7. Polish: `validate.sh` (TF-S1), TF-E20, TF-E25 to TF-E27, docs, quickstart walkthrough.

## Test-flow coverage map (43 flows)

| Flow | Written in | Run in |
|---|---|---|
| TF-S1 | T075 | T076 |
| TF-U01–U06 | T055, T056 | T061, T064 |
| TF-U07 | T065, T066 | T067 |
| TF-U08 | T072 | T074 |
| TF-D1, D4, D5, D7 | T060 | T064 |
| TF-D2, D3 | T070 | T070 |
| TF-D6 | T069 | T069 |
| TF-E01–E05 | T015–T019 | T023, T033 |
| TF-E06–E09 | T034–T037 | T054 |
| TF-E10–E15 | T024–T029 | T033 |
| TF-E16–E18 | T038–T040 | T053 |
| TF-E19 | T041 | T054 |
| TF-E20 | T077 | T081 |
| TF-E21 | T073 | T074 |
| TF-E22 | T057 | T071 |
| TF-E23, E24 | T058, T059 | T064 |
| TF-E25–E27 | T078–T080 | T081 |

## Notes

- [P] tasks touch different files and depend on no unfinished task.
- `scratch/` is git-ignored: flow scripts there are test tooling, not deliverables. Their results live in `specs/002-hotel-demo-app/evidence/` and `evidence.md`.
- The shared stack (`name: hotel-survey`) is recreated with the worktree's mounts by T004. When the pipeline finishes, the operator runs `docker compose up -d` from the main checkout to switch back (quickstart §9); `/app/*` then returns 404 until merge, which is expected.
- Fix failing flows in implementation files. Change an assertion only when it contradicts a contract, and record why in `evidence.md`.

## Phase 10: Convergence

- [X] T085 Add a stdlib unit test to `scripts/tests/test_build_dashboard.py` that drives `run_cycle` with a stub `run_sql` returning zero-count aggregate rows for all three ranges (empty table) and asserts `total` 0, every `categories[*].avg` None, `nps.score` None, and that the written snapshot passes `validate_snapshot`. It stands in for the live TF-D1 empty-table branch, which stays unrun so the shared table is not emptied (evidence.md, F9). Note the result on the TF-D1 row in `specs/002-hotel-demo-app/evidence.md` (US4/AC3, partial).
- [X] T086 Correct the TF-E24 row in `specs/002-hotel-demo-app/evidence.md`: the timings file is `specs/002-hotel-demo-app/evidence/TF-E24-timings.json` (the row names `TF-E24.json`, which does not exist), and replace "see file" with the ten-run result (all ten at or under 15 s, maximum 10.6 s) (US4/AC4, partial).

## Phase 11: Convergence

- [X] T087 Re-run `python3 -m unittest discover -s scripts/tests -v`, re-save the output to `specs/002-hotel-demo-app/evidence/TF-U-dashboard.txt` (the saved file still reports 20 tests, the run now reports 22), and change the "20 tests" counts in the TF-U01 to TF-U08 row and the Unit row of the flow coverage table in `specs/002-hotel-demo-app/evidence.md` to the new count (T064, partial).
- [X] T088 Rename the stub empty-table class `TF_U08_EmptyTable` in `scripts/tests/test_build_dashboard.py` to `TF_D1_EmptyTable`, because TF-U08 is the shell string parity flow (T072), and update the TF-D1 row in `specs/002-hotel-demo-app/evidence.md` to cite the renamed stub test; re-run the unit tests (US4/AC3, partial).
- [X] T089 Restate the TF-E24 flow label in `specs/002-hotel-demo-app/evidence.md` to the SC-006 criterion (at least 9 of 10 trials within 15 s) and keep the result as 10 of 10 at or under 15 s, max 10.6 s, so the label no longer presents 10 of 10 as the pass threshold (SC-006, partial).

## Phase 12: Convergence

- [X] T090 Final evidence sweep: re-run `./scripts/validate.sh` and re-save its full output to `specs/002-hotel-demo-app/evidence/validate.txt` (the saved file still reports "Ran 20 tests"; the current run reports 22 tests and `validate: ok`); in `specs/002-hotel-demo-app/evidence.md` add a note in "Deviations, limits and open items" that the dashboard page polls every 3 s (F4, `POLL_MS` in `app/js/dashboard.js`), which supersedes the 5 s poll stated in `plan.md` (Summary item 4) and T062 (SC-006, A-04; contradicts, LOW). Re-check that no other test or check count in `evidence.md` differs from `evidence/TF-U-dashboard.txt` (22) or `evidence/TF-E*.json` (`checks` length). Do not touch T084.
