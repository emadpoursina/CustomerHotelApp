# Implementation Plan: Hotel Guest App Demo (app shell, Nearby, Dashboard)

**Branch**: `hotel-demo-app` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-hotel-demo-app/spec.md` (clarified 2026-11-04)

## Summary

Put the existing LimeSurvey guest survey and three new static screens inside one app-style shell that matches `prototype/index.html`, in English and Persian (RTL). The approach adds no backend and no container:

1. **Shared shell** in the `hotel-classic` theme: `css/shell.css` and `scripts/shell.js`, one copy each. LimeSurvey loads them through `config.xml`. The app pages load them straight from `/upload/themes/survey/hotel-classic/…`, next to the theme's `tokens.css` and `fonts.css` (both verified as served). The shell markup exists twice: in Twig (`nav_bar.twig` plus a new `footer.twig` override) and in `app/js/app.js`.
2. **Static app** in `app/` (Home, Nearby, Dashboard; vanilla HTML/CSS/JS, JSON data), served by LimeSurvey's Apache through one read-only bind mount, `./app:/var/www/html/app:ro`.
3. **Survey re-skin**: theme views only. Questions, rules and storage are unchanged. Rate always opens `/index.php/420001` with **no** `lang` parameter, so a live session resumes in its own language. The welcome screen is the only screen where the language may change, and it aligns itself to the app's stored language.
4. **Dashboard job** `scripts/build-dashboard.py` (Python stdlib). It reads in a read-only transaction through `docker compose exec db mariadb` and computes the aggregates in SQL from Q1–Q7, `startlanguage` and `submitdate` only. The date windows roll on the database clock. It writes `app/data/dashboard.json` atomically. `--watch` repeats every 10 s, and the page polls every 5 s.
5. **Seed job** `scripts/seed-demo.py` (Python stdlib): about 40 responses through the public survey form, localhost only.
6. **Validation**: an extended `validate.sh`, stdlib unit tests, Playwright test flows run from `scratch/`, and a manual SQL check.

## Technical Context

**Language/Version**: HTML5; CSS3 (custom and logical properties, `color-mix()`, grid); vanilla JavaScript (ES2017, classic scripts, no modules); Twig (LimeSurvey 6 sandbox); Python 3 (stdlib only; the host has 3.15); Bash (`validate.sh`); SQL (MariaDB 11).

**Primary Dependencies**: LimeSurvey CE 6.17.18 (`martialblog/limesurvey:6-apache`; the vanilla parent theme brings Bootstrap 5 and pjax), MariaDB 11, Docker Compose, and the shared Caddy (unchanged). The fonts are already self-hosted in the theme. No new library.

**Storage**: This feature only reads LimeSurvey's own tables (`lime_survey_420001`, `lime_questions`). Files: `app/data/places.json` (committed demo data) and `app/data/dashboard.json` (generated, git-ignored). Browser: `localStorage['hotel.lang']`.

**Testing**: `./scripts/validate.sh` (extended); `python3 -m unittest discover -s scripts/tests` (stdlib); the browser test flows below, run with Playwright 1.64 via `npx` from `scratch/` (git-ignored), with evidence in `specs/002-hotel-demo-app/evidence/`; the manual SQL check in `contracts/dashboard-data.md` §4.

**Target Platform**: Mobile browsers (Chrome on Android, Safari on iOS) through Chrome device emulation, because real phones are blocked by `docs/decisions.md` §2 item 5. Desktop Chrome. Local stack at `http://hotelsurvey.localhost`.

**Project Type**: Static web front end, LimeSurvey child-theme customisation, and two host-side CLI scripts.

**Performance Goals**: The Nearby list updates within one frame on each keystroke (21 items, SC-004). The dashboard shows a new submission within 15 s (10 s job + 5 s poll, SC-006). No third-party requests.

**Constraints**: No LimeSurvey core file or core-table change. Database access is read-only. Comment text is never read, published or logged. Colours come only from `tokens.css`. Touch targets are at least 48px. No horizontal scroll from 320px. Motion is 200 ms or less and off under reduced motion. Minimal JS. Every link names a file. Rate never adds `lang`.

**Scale/Scope**: 3 app pages and 11 survey page types; 21 places; about 40 seeded responses; 1 compose line; 2 Python scripts; about 9 theme files touched.

No NEEDS CLARIFICATION items remain. `research.md` resolves every unknown. Items that need the running stack are marked **Verify** there and covered by test flows.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template. As in spec 001, the binding rules are in `AGENTS.md`, `hotelSurveyDemoPRD.md` and `docs/decisions.md` §1, so this gate checks those.

| Gate (source) | Pre-design | Post-design | Evidence |
|---|---|---|---|
| The demo PRD is the source of truth; build nothing it defers (AGENTS.md, decisions §1 #12) | Pass | Pass | No QR codes, rooms, tokens, exports, auth or production work. `hotel_rooms` is untouched |
| LimeSurvey is the engine; do not rebuild survey functions | Pass | Pass | The survey runs in LimeSurvey. The theme changes presentation only (`contracts/survey-theme.md`). The seed job uses the public form |
| Customisation lives in the theme, `app/`, `db/init/` and `scripts/` | Pass | Pass | Files only in those places, plus one `docker-compose.yml` volume line (FR-041 allows "container mount configuration") |
| Never modify core files or core tables | Pass | Pass | Theme overrides only. Database access is `SELECT` inside a read-only transaction. Only the engine writes responses |
| The dashboard reads read-only, publishes aggregates only, never comment text | Pass | Pass | Research R-08; the schema allow-list; the comment-guard check in `validate.sh`; TF-D3, TF-D4 |
| Custom data goes in separate tables | N/A | N/A | No new data in the database |
| No microservices or unnecessary backend | Pass | Pass | No new service or web backend. The existing Apache serves the static files |
| Room-token rules | N/A | N/A | Deferred (demo PRD §5) |
| No account, anonymous, no names or emails | Pass | Pass | Survey settings are unchanged. The app collects nothing |
| Persian and English, every string translated, language fixed during the survey | Pass | Pass | Research R-05, R-06, R-17; the string-parity test; the locked switch on question screens |
| Required Q1–7, optional Q8–9 | Pass | Pass | Unchanged; TF-E07, TF-E08 |
| Mobile-first, ≥ 48px, no horizontal scroll, minimal JS | Pass | Pass | `contracts/app-shell.md` §3; TF-E20; one shared shell script and small page scripts |
| Tokens only; gold for accents and selected states only | Pass | Pass | New tokens go in `tokens.css`, and the hex check covers `app/`. Gold is used for the active tab icon, selected chips, the top category bar and the Rate card border |
| Secrets and guest comments (never commit `.env` or `backups/`; never log comments) | Pass | Pass | The scripts log counts only. Database credentials stay in the container's environment. `dashboard.json` is git-ignored |
| Open decisions: ask before resolving (decisions §2) | Pass | Pass | None is resolved; see Risks R13 |

**Gate result**: Pass, no violations. Notes: (1) `docker-compose.yml` gains a mount, which FR-041 and PRD §4 explicitly allow. (2) The prototype's desktop device bezel is not reproduced (research R-04). The PRD requirement, a centred column of at most 430px, is met.

## Project Structure

### Documentation (this feature)

```text
specs/002-hotel-demo-app/
├── spec.md                  # clarified spec
├── plan.md                  # this file
├── research.md              # Phase 0: R-01 … R-19
├── data-model.md            # Phase 1: responses (read-only), session, language pref, place, strings, snapshot, UI state
├── quickstart.md            # Phase 1: setup and human walkthrough
├── contracts/
│   ├── app-shell.md         # shared shell DOM, sizes, behaviour, language states
│   ├── app-screens.md       # Home, Nearby, Dashboard
│   ├── survey-theme.md      # theme file changes and per-screen rendering
│   ├── dashboard-data.md    # snapshot semantics, display rules, manual SQL check, job CLI
│   ├── dashboard.schema.json
│   ├── places.schema.json
│   └── scripts-cli.md       # seed CLI, validate.sh additions, compose change
├── checklists/requirements.md
├── evidence/                # created by the tester (screenshots, JSON results, SQL check output)
└── tasks.md                 # Phase 2 (/speckit.tasks), not created here
```

### Source Code (repository root)

```text
app/                                         # new, mounted read-only at /var/www/html/app
├── index.html  nearby.html  dashboard.html
├── css/app.css
├── js/{i18n,app,home,nearby,dashboard}.js
└── data/places.json                         # committed demo data; dashboard.json is generated (git-ignored)

limesurvey/themes/hotel-classic/
├── config.xml                               # + css/shell.css, scripts/shell.js, help text at the bottom
├── README.md                                # updated
├── css/{tokens.css (edit), shell.css (new), hotel.css (edit)}
├── scripts/{shell.js (new), custom.js (edit)}
└── views/subviews/
    ├── hotel/i18n.twig                      # + shell and screen keys
    ├── header/{nav_bar.twig, progress_bar.twig}
    ├── footer/footer.twig                   # new override: tab bar
    └── content/{firstpage.twig, submit.twig}

scripts/
├── build-dashboard.py                       # new
├── seed-demo.py                             # new
├── validate.sh                              # extended
└── tests/                                   # new, stdlib unittest
    ├── test_build_dashboard.py
    ├── test_seed_form.py
    ├── test_shell_strings.py
    └── fixtures/                            # synthetic HTML and SQL-output samples, no real data

docker-compose.yml                           # + ./app:/var/www/html/app:ro
.gitignore                                   # + app/data/dashboard.json, app/data/*.tmp
README.md                                    # status and the demo-day commands
```

**Structure Decision**: The static app goes in `app/` (PRD §4). The shared shell assets go in the theme, which stays the single source of tokens, fonts and shell CSS and JS. Host-side tooling goes in `scripts/`, with stdlib tests in `scripts/tests/`. There are no top-level `src/` or `tests/` folders: the repo has no build, and this matches spec 001's layout. `docs/decisions.md` is not edited by this plan. Whether to record the finished build as a §1 row is the operator's choice after the demo.

## Implementation Approach (phased, PRD §7 build order, for /speckit.tasks)

1. **Shell foundation**: token additions; `shell.css`; `shell.js` (`HotelShell`); `app/js/i18n.js`; `app/js/app.js` (`renderShell`, `applyLang`, `SURVEY_URL`); the compose mount; `.gitignore`. Checkpoint: an empty app page shows the app bar, drawer, tab bar and toast in both languages (TF-E01 to TF-E04).
2. **Home**: `index.html`, `home.js`, and `places.json` with highlights (TF-E05).
3. **Nearby**: `places.json`, with the 21 prototype places converted (tags become arrays, fields renamed per the schema); the list, `fold()` search, chips, Open now, sort, sheet, deep link and empty state (TF-E10 to TF-E15).
4. **Survey theme**: `config.xml`, `nav_bar.twig`, `footer.twig`, `firstpage.twig`, `submit.twig`, the `progress_bar.twig` markup, the `hotel.css` restyle, the `i18n.twig` keys and the `custom.js` alignment, then a theme Reset (TF-E06 to TF-E09, TF-E16 to TF-E19).
5. **Dashboard**: `build-dashboard.py`, with the unit tests written first for its pure functions (SQL row parsing, shaping, rounding, schema allow-list, atomic write); then the states in `dashboard.html` and `dashboard.js` (TF-U01 to TF-U06, TF-D1 to TF-D5, TF-D7, TF-E22 to TF-E24).
6. **Seed**: `seed-demo.py`: first `--dry-run`, then `--count 1`, then 40 (TF-U07, TF-D6).
7. **Hardening and walkthrough**: the `validate.sh` extensions, the string-parity test, the walkthrough at 320/360/390/430/desktop in en and fa, the quickstart walkthrough, README and theme README updates, and evidence (TF-S1, TF-U08, TF-E20, TF-E21, TF-E25 to TF-E27).

## Test Flows

The IDs are stable for the critic and tester stages.

- **Viewports**: 320, 360, 390 and 430px phone emulation, and 1280px desktop.
- **Both languages**: run once with `hotel.lang = en` and once with `fa`.
- **Evidence**: save files to `specs/002-hotel-demo-app/evidence/` as `<flow-id>-<lang>-<width>.png` or `.json`.
- **Browser contexts**: use a fresh context per flow unless the flow says otherwise.
- **Comments**: never paste comment text into evidence. Seeded comment text is synthetic.

Expected place lists use the `id` values from `places.json`, which keeps the prototype's IDs.

### Static and unit

| ID | Flow | Expected | Covers |
|---|---|---|---|
| TF-S1 | `./scripts/validate.sh` | `validate: ok`. Each new check fails when a deliberate violation is put into a throwaway copy of the repo in `scratch/` (hex in `app.css`, `href="/app/"`, `Q8` in the job, missing `.gitignore` entry), and passes again after the revert | FR-007, FR-040, FR-042, SC-010 |
| TF-U01 | Unit: shape a range from fixture SQL rows | Counts are copied. `avg = sum/n`, rounded half-up to 1 decimal (63/20 → 3.2, 61/20 → 3.1, 7/2 → 3.5). `n = 0` → `null` | FR-022, FR-023, SC-005 |
| TF-U02 | Unit: NPS | All passives → 0. All detractors → −100. All promoters → 100. 1 promoter, 7 passives → 13 (12.5 rounds away from zero). 1 detractor, 7 passives → −13. `n = 0` → `null` | FR-022, edge cases |
| TF-U03 | Unit: snapshot allow-list | The output passes a stdlib key and type walker that implements `dashboard.schema.json`. Injecting any extra key (for example `comments`) raises an error | FR-029, SC-007 |
| TF-U04 | Unit: atomic write and keep-last-good | Write A, then run a cycle that raises before writing: the file still equals A and no `.tmp` is left. Writing B replaces A with one `os.replace` | Edge: database loss in watch mode |
| TF-U05 | Unit: column resolution | A fixture with the 7 codes → `420001X1X1` … `420001X1X7`. A missing code → the exit-2 error. A row whose column does not match the pattern → rejected. Q8 and Q9 rows in the fixture are ignored | FR-029, R-08 |
| TF-U06 | Unit: `generatedAt` and logging | `generatedAt` comes from the SQL `@now` field, formatted with a trailing `Z`. The captured stdout and stderr of a cycle contain only the documented line formats | FR-028, FR-029 |
| TF-U07 | Unit: seed form parsing | A synthetic LimeSurvey-like HTML fixture → every hidden input, the form action and the answer field names are found. The host guard refuses `example.com` and accepts `hotelsurvey.localhost` and `127.0.0.1` | FR-035, R-16 |
| TF-U08 | Unit: shell string parity | Every shared key (`data-model.md` §5) exists in `i18n.js` and `i18n.twig` with identical `en` and `fa` text. No value is empty. Every key used in `app/js/*.js` exists in both languages in `i18n.js` | FR-032, A-12 |

### Data (stack running)

| ID | Flow | Expected | Covers |
|---|---|---|---|
| TF-D1 | Note the current counts (or start with an empty survey). Run `python3 scripts/build-dashboard.py` | Exit 0 and one stdout line. `dashboard.json` validates against the schema. On an empty table every range has `total 0`, `avg null` and `score null` | FR-028, edge: no responses |
| TF-D2 | After seeding, run the job once, then the manual SQL check (`dashboard-data.md` §4) for 7, 30 and All | Every figure matches exactly for each range: total, language counts, Q1–Q6 averages, promoters, detractors and NPS | FR-025, SC-005, US4-AS5 |
| TF-D3 | Seed with synthetic comments and run the job. Then run `grep -c 'synthetic comment' app/data/dashboard.json` and inspect the keys | `0`. Only schema keys. No array longer than 6 | FR-029, SC-007, US4-AS6 |
| TF-D4 | Run the job with `--watch` and capture its output for 1 minute while a survey with a comment is submitted | The output contains only `dashboard:` count lines: no comment text, no SQL rows | FR-029 |
| TF-D5 | With `--watch` running: `docker compose stop db`, wait 25 s, then `docker compose start db` | stderr shows `cycle failed` lines. `dashboard.json` stays byte-identical to its state before the stop. Writes resume once the database is back, without restarting the job. The Dashboard page shows the stale note while the database is stopped | Edge: database loss, stale file |
| TF-D6 | Run `python3 scripts/seed-demo.py --dry-run`, then `--count 40` | The dry run submits nothing (row count unchanged). The real run exits 0 and adds 40 completed rows. Both languages appear, the Q1–Q6 averages are not all equal, and every `submitdate` is today. The script contains no database code | FR-035, FR-036, US6 |
| TF-D7 | Read-only proof on a quiet stack (no browser activity): record `SHOW GLOBAL STATUS LIKE 'Com_%'`, run the job once, record again | Only read and session counters increase (`Com_select`, `Com_set_option`, `Com_begin`, `Com_rollback`). `Com_insert`, `Com_update`, `Com_delete`, `Com_replace`, `Com_create_*`, `Com_alter_*` and `Com_drop_*` are unchanged | FR-028, AGENTS.md |

### Browser (Playwright from `scratch/`, stack running, theme reset)

| ID | Flow | Expected | Covers |
|---|---|---|---|
| TF-E01 | Open `/app/index.html` at each viewport, both languages | App bar (56px) and tab bar (64px + inset) visible. Home tab has `aria-current`. `scrollWidth <= innerWidth`. At 431px and wider the column is at most 430px wide and centred | US1-AS1, US1-AS6, FR-006, SC-001 |
| TF-E02 | Tap the hamburger, then the scrim. Reopen and press Esc | The drawer opens from the left in en and from the right in fa, over the scrim. It closes both ways. `aria-expanded` toggles, and focus returns to the hamburger | US1-AS2, US5-AS1 |
| TF-E03 | Tap every tab and every drawer item from Home, Nearby, Dashboard and a survey question page | Home, Nearby and Dashboard open their file URLs as full page loads. Rate opens `/index.php/420001` **without** `lang` in the URL. Services shows the toast and the URL does not change | US1-AS3, US2-AS6, FR-003, FR-013, FR-040 |
| TF-E04 | Tap every mock control: the 6 quick actions, the 4 drawer mock items, the bell, Services, and the sheet's Directions, Call and Save. Double-tap one | The `soon` toast appears above the tab bar and hides about 2 s after the last tap. Exactly one toast element. No navigation | US1-AS4, FR-004, SC-002 |
| TF-E05 | Home: check the greeting with the Playwright clock at 09:00, 14:00 and 20:00. Tap each highlight, then See all | The greeting matches. A highlight opens `nearby.html#place=<id>` with that place's sheet open. See all opens Nearby | FR-008, FR-011, US1-AS5 |
| TF-E06 | Fresh context, `hotel.lang = fa`, tap the Rate card | The welcome screen appears inside the shell with `<html lang="fa" dir="rtl">`. After alignment the URL has `lang=fa`. The welcome screen has no language selector of its own. The drawer switch is enabled (links). The response row count is unchanged | US2-AS1, US5-AS3, FR-015, A-01 |
| TF-E07 | Start, then press Continue without answering on each of Q1–Q7 | The guest stays on the question, and the translated required message shows in place. Back is absent on Q1 | US2-AS2, FR-012 |
| TF-E08 | Answer Q1–Q7, leave Q8 and Q9 empty, Submit | The thank-you screen shows the icon, end text, both names, "Back to home" and "Explore nearby". Each button opens the right app page. Completed rows +1, with `startlanguage` = the survey language | US2-AS3, US2-AS5, FR-014 |
| TF-E09 | On Q3, open the drawer | The language buttons are `disabled` and the note `d.langLocked` is visible. Tapping does nothing | US2-AS4, FR-005 |
| TF-E10 | Nearby: load | 21 rows sorted by distance (first: Garden Terrace, 150 m). The count reads "21 places", with the Demo data pill | US3-AS1, FR-016 |
| TF-E11 | Search, one key at a time: `c`, `a`, `f`, `e`. Then `  CAFE ` (with spaces); `کافه`; `kebab` with the app in fa; `باغ` with the app in en | The list narrows after each key. `cafe` and `  CAFE ` give the same result: ids 8, 11, 14 (the "Café" names, matched through accent folding). `کافه` → 8, 10, 11, 13, 14. `kebab` (fa) → 1, 4. `باغ` (en) → 1, 13, 17 | US3-AS2, FR-017, R-11, edge: spaces and case |
| TF-E12 | Combinations, with the Playwright clock at 21:00 local time: Cafés + Open now; then + Top rated; Restaurants + search `kebab`; then All + Open now with the clock at 00:30 | Cafés + Open now → 13, 8, 9, 12, 14 (by distance). + Top rated → 9, 8, 12, 13, 14. Restaurants + `kebab` → 1, 4. All + Open now at 00:30 → 20, 7, 14, 18 by distance (the after-midnight and 24-hour places). Mountain Kebab (closes 24:00) is closed | US3-AS3, FR-018, edge: past midnight |
| TF-E13 | Tap a row and check the sheet. Tap Directions. Tap the scrim, reopen, press Esc | The sheet shows category, name, rating, walking minutes, price, open pill, description, hours (a 24-hour place shows `n.24h`), tags and 3 buttons. Directions shows the toast. The sheet closes both ways | US3-AS4, FR-019 |
| TF-E14 | With Cafés + Open now + Top rated set, search `zzzz`, then tap Clear filters | The empty state shows its title, text and button. After clearing: search empty, All selected, Open now off, sort still Top rated, 21 places | US3-AS5, FR-020 |
| TF-E15 | Network log on Nearby and Home | Requests go only to `hotelsurvey.localhost` (`/app/*` and `/upload/themes/survey/hotel-classic/*`). No map, image or third-party request | FR-021, PRD §3 |
| TF-E16 | Mid-survey (Q4, en), tap the Home tab, switch the app to fa in the drawer, then tap Rate | The survey resumes at Q4 in **English**, the URL has no `lang`, and the switch is locked. The completed count is unchanged. After finishing, Rate again opens a fresh welcome screen in Persian | US2-AS8, edge: resume language, A-09, R-05 Verify (a) and (c) |
| TF-E17 | Mid-survey, leave. Clear cookies (simulates expiry), then tap Rate with `hotel.lang = fa` | A fresh welcome screen in Persian. The abandoned row has `submitdate` NULL, and the job does not count it | US2-AS8, FR-030, R-05 Verify (d) |
| TF-E18 | On the welcome screen (en), switch to فارسی in the drawer, then back to English | The welcome screen reloads in fa (RTL), then in en. `hotel.lang` follows. No response row is created | US2-AS7, FR-005 |
| TF-E19 | On the thank-you screen, switch to the other language in the drawer | Home opens in that language, and `hotel.lang` is updated | FR-005, R-06 |
| TF-E20 | All screens (Home, Nearby with the sheet, Dashboard, welcome, Q1, Q7, Q9, thank-you) at every viewport, both languages | `scrollWidth <= innerWidth`. App bar and tab bar present. Every visible link, button, input and radio-tile label has a bounding box of at least 48 × 48 (chips: 48px target, 36px visual). Screenshots saved | SC-001, SC-010, FR-037, FR-038 |
| TF-E21 | Persian walkthrough of all screens: scan the visible text for Latin letters outside the allow-list (brand wordmark, "English", "NPS", `n =`). English walkthrough: scan for Arabic-script letters other than "فارسی" and the Persian brand name | No untranslated strings. The drawer opens from the right, chevrons are mirrored, bars fill from the right, and digits are Persian | US5, FR-032, FR-033, SC-008 |
| TF-E22 | Dashboard with seeded data: read the KPIs, the 6 bars and the language split. Switch between 7, 30 and All | The figures equal `dashboard.json` for that range, formatted (average to 1 decimal, signed NPS, `n = x` on each bar). The chips update every figure. On seed day all three show the same numbers, which is expected (A-02) | US4-AS1, US4-AS2, FR-022 to FR-025 |
| TF-E23 | Dashboard states, using route interception: 0 responses; 5 responses; missing file (404); invalid JSON; `generatedAt` 2 minutes old | "No responses in this period" (no NaN); the low-sample note with 5; the unavailable state; the unavailable state; the stale note with the time | US4-AS3, FR-026, FR-027, edge cases |
| TF-E24 | Live loop: with `--watch` running and the Dashboard open (no reload), note the total. Submit a survey in another tab and measure the time until the total increases. Repeat 10 times | 15 s or less in at least 9 of 10 trials | US4-AS4, SC-006 |
| TF-E25 | With reduced motion emulated, open the drawer, the sheet and the toast | No transition (computed `transition-duration` is 0s). Everything still works | FR-039 |
| TF-E26 | Demo-day script (PRD §8) at 390px, in en and then fa: Home → Nearby, search `cafe` + Open now → Rate, submit → Dashboard count +1 | Completes on the first attempt with no console errors | SC-009, SC-003 |
| TF-E27 | Visual comparison: screenshot each app screen and the prototype's matching screen at 390px, both languages. Also compare the survey shell with the app shell | Same components, order, strings, icons and states. The only differences are the documented ones: no device bezel, the brand mark in the app bar, the real survey content, and the placeholder notice when it is on | FR-043, R3 |

## Risks, Assumptions and Open Items

| # | Item | Type | Handling |
|---|---|---|---|
| R1 | LimeSurvey may restart the survey instead of resuming it when `/index.php/420001` is opened mid-session | Verify (R-05) | TF-E16. Fallback: accept a fresh start and record it as a known limitation (partial rows still never count) |
| R2 | pjax may try to load `/app/*.html` into the survey fragment | Verify (R-07) | `data-pjax="false"` on every shell link; TF-E03 from survey pages |
| R3 | Bootstrap's reboot on survey pages shifts the shell's metrics (fonts, button padding) | Assumption | The `hs-` namespace and explicit metrics in `shell.css`. TF-E27 compares survey-shell and app-shell screenshots |
| R4 | Theme manifest and asset caching hide CSS and JS changes | Known (spec 001 R-01) | Reset the theme after the `config.xml` change; clear `tmp/assets` if needed (quickstart §2) |
| R5 | Running `docker compose up -d` from the worktree points the shared `hotel-survey` stack's mounts at the worktree | Known (R-01) | Quickstart: do it deliberately for testing, then run `docker compose up -d` from the main checkout afterwards |
| R6 | PHP and MariaDB clocks could drift apart (both are UTC today) | Assumption | The window boundaries would shift. Checked in quickstart §1. Not a demo blocker |
| R7 | The seed script depends on LimeSurvey's form fields (CSRF, `LEMpostKey`) | Verify (R-16) | Run `--count 1` first. A failure stops with the step name. Never fall back to table writes |
| R8 | On seed day, 7 days, 30 days and All show the same figures | Accepted (clarification Q2, A-02) | Explain it in the demo, or submit live on a later day |
| R9 | The placeholder notice on survey pages differs from the prototype | Operator (R-14) | The notice stays switchable in the admin. The drawer label is always shown |
| R10 | `questionhelptextposition = bottom` moves spec 001's scale caption | Assumption (R-15) | Presentation only. One option reverts it |
| R11 | The new Persian strings have not been reviewed by a fluent speaker | Open (operator; carried from spec 001 R4) | Ship them as proposals, listed in the theme README |
| R12 | Rating direction and digit style in Persian (spec 001 R-04, R-05) | Open (operator) | Defaults unchanged |
| R13 | `docs/decisions.md` §2 items 1–5 (domain, admin IPs, branding, GDPR retention, LAN phone testing) | Open (operator) | **This plan resolves none of them.** Item 5 limits testing to emulation. Item 4 covers the abandoned partial rows this demo creates. Item 3 keeps the placeholder brand |
| R14 | The dashboard has no login, so anyone who can reach the local URL can see it | Accepted (FR-031, PRD §5) | Local only, aggregates only |
| R15 | No dedicated read-only database user | Assumption (R-08) | Read-only transaction, SELECT-only SQL and TF-D7. A dedicated user is deferred to production |

## Complexity Tracking

No constitution violations. Two deliberate deviations from the visual reference are documented; they are not violations. A plain centred column replaces the desktop device bezel (R-04), and the app bar gains a small brand mark (FR-001).
