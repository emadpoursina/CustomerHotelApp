# Research: Hotel Guest App Demo (app shell, Nearby, Dashboard)

**Feature**: `specs/002-hotel-demo-app/spec.md` | **Date**: 2026-11-04

Findings come from the repository, `prototype/index.html`, `specs/001-branded-bilingual-survey/` (research R-01 to R-19), and read-only probes of the running stack on 2026-11-04 (`curl` against `http://hotelsurvey.localhost`, `docker compose exec` with `SHOW COLUMNS`, `COUNT(*)`, `NOW()` and `cat` only; no response content was read). Items marked **Verify** must be confirmed during implementation and recorded in `evidence.md`. Items marked **Open (operator)** are not decided here.

Verified facts used below:

| Fact | Value | How found |
|---|---|---|
| Survey ID | `420001`, base `en`, additional `fa`, active, `anonymized = Y`, `datestamp = Y`, `format = S`, `allowsave = N`, `usecookie = N` | `lime_surveys` (read-only SELECT) |
| Response table | `lime_survey_420001`: `id`, `submitdate` (NULL until completed), `lastpage`, `startlanguage`, `seed`, `startdate`, `datestamp`, then `420001X1X1` … `420001X1X7` (`varchar(5)`), `420001X1X8`, `420001X1X9` (`text`, the comments) | `SHOW COLUMNS` |
| Question codes to columns | qid 1–9 = `Q1OVERALL`, `Q2CLEAN`, `Q3COMFORT`, `Q4STAFF`, `Q5BREAKFAST`, `Q6FACILITIES`, `Q7RECOMMEND`, `Q8LIKED`, `Q9IMPROVE`, all in gid 1 | `lime_questions` (read-only SELECT) |
| Clocks | MariaDB `@@time_zone = SYSTEM`, system zone UTC. PHP `date_default_timezone_get() = UTC`. Container `date` is UTC. LimeSurvey `timeadjust` not set (0) | probes |
| Theme assets over HTTP | `/upload/themes/survey/hotel-classic/css/tokens.css` → 200 `text/css`; `/upload/themes/survey/hotel-classic/fonts/inter/Inter-latin-400.woff2` → 200 `font/woff2` | `curl` |
| Rewrite | `/var/www/html/.htaccess`: if the request is not an existing file, rewrite to `index.php` (the `!-d` condition is commented out, so bare directories go to LimeSurvey) | `cat` in container |
| Session lifetime | `iSessionExpirationTime = 7200` s (config default) | `config-defaults.php` |
| Layout | vanilla `layout_global.twig` includes `subviews/header/nav_bar.twig` **inside** `#dynamicreload` (re-rendered on every pjax step) and `subviews/footer/footer.twig` **outside** it | `cat` in container |
| Tooling on host | Python 3.15, Node 24, Playwright 1.64 via `npx` | `--version` |

---

## R-01 Serving the static app

- **Decision**: Add one read-only bind mount to the `limesurvey` service in `docker-compose.yml`: `./app:/var/www/html/app:ro`. Apache serves `/app/index.html`, `/app/nearby.html`, `/app/dashboard.html`, `/app/css/*`, `/app/js/*` and `/app/data/*` as existing files, so LimeSurvey's rewrite never sees them. Every link names the file (`/app/index.html`), never `/app/` (FR-040), because `/app/` is rewritten to `index.php`.
- **Rationale**: Demo PRD §4 (no new container, no Caddy change). The directory (not single files) is mounted so that the host-side job's atomic rename of `app/data/dashboard.json` is visible in the container (a single-file bind mount pins the old inode).
- **Alternatives considered**: A separate nginx container (rejected: PRD §4, AGENTS.md "no microservices"). Serving from `upload/` (rejected: mixes app files into LimeSurvey's upload volume). Mounting the file `dashboard.json` alone (rejected: breaks with atomic rename).
- **Note (worktree)**: `docker-compose.yml` has `name: hotel-survey`. Running `docker compose up -d` from a worktree recreates the **same** containers with that worktree's bind mounts (same named volumes, same data). This is how the feature is tested, and running `docker compose up -d` from the main checkout afterwards restores it. Recorded in `quickstart.md`.

## R-02 One source of tokens, fonts and shell styling

- **Decision**: The static app links the theme's files directly over HTTP from the theme mount, in this order: `/upload/themes/survey/hotel-classic/css/tokens.css`, `…/css/fonts.css`, `…/css/shell.css`, then `/app/css/app.css`. The shell behaviour script `…/scripts/shell.js` is likewise loaded by both the theme (through `config.xml`) and the app pages (`<script src>`). Screen styles that only the app needs (Home, Nearby, Dashboard, bottom sheet) live in `app/css/app.css`.
- **Rationale**: FR-007 and demo PRD §3–§4: one source of tokens and fonts. Both URLs return 200 today (verified), so no second mount and no copy are needed. Putting `shell.css` and `shell.js` in the theme means the survey and the app share one stylesheet and one behaviour script for the shell; only the markup is duplicated (PRD §4, A-12).
- **New tokens**: `tokens.css` gains only what the shell needs and the prototype defines inline: `--appbar-h: 56px`, `--tabbar-h: 64px`, `--width-app: 430px`, `--shadow`, `--scrim`, `--accent-soft` (the last three are `color-mix()` of existing colour tokens, so no new hex values). `shell.css` and `app.css` use `var(--…)` only.
- **Alternatives considered**: Copy `tokens.css` into `app/` (rejected: two sources). Second bind mount of the theme into `/var/www/html/app/theme` (rejected: nested mount inside a read-only mount, and unnecessary). Inline the prototype's `<style>` per page (rejected: three copies).
- **Verify**: LimeSurvey copies theme CSS and JS into its runtime asset cache; after `config.xml` gains `css/shell.css` and `scripts/shell.js`, **Reset** the theme (spec 001 R-01). The app always reads the live files from `/upload/…`, so it is not affected by that cache.

## R-03 Where the survey shell markup goes

- **Decision**: Two theme view overrides carry the shell on every survey page, with no `layout_global.twig` override:
  - `views/subviews/header/nav_bar.twig` (already overridden): app bar, drawer, scrim and toast. It sits inside `#dynamicreload`, so it is re-rendered on every step with the correct state (welcome, in progress, completed).
  - `views/subviews/footer/footer.twig` (new override, vanilla content kept): the bottom tab bar (Rate active). The tab bar is identical on every survey page, so it is fine outside the pjax region.
- **App pages**: the shell markup for the three app pages is produced once by `app/js/app.js` (`renderShell(route)`), not hand-copied into three HTML files. Total copies of the shell markup: two (Twig and `app.js`), as PRD §4 intends. Both must produce the DOM described in `contracts/app-shell.md` §2.
- **Class names**: every shell class is prefixed `hs-` (hotel shell). Vanilla loads Bootstrap 5, whose `.toast`, `.card`, `.btn`, `.nav`, `.badge` and `.offcanvas` would otherwise collide with the prototype's class names. `shell.css` sets its own font size, line height, margins and button resets so the shell looks the same with and without Bootstrap's reboot.
- **Alternatives considered**: Override `layout_global.twig` to reproduce the prototype's inner-scroll frame (rejected: couples the theme to more core markup and fights pjax and LimeSurvey's scroll-to-error; see R-04). Render the survey shell client-side from `app.js` strings (rejected: PRD §4 says the shell is in the Twig header/footer, and a client-rendered shell flashes in late on every pjax step).

## R-04 Layout model and the phone column

- **Decision**: Document scrolling, not the prototype's fixed-height inner `<main>` scroll. `html` and `body` scroll normally; the app bar is `position: sticky; top: 0`; the tab bar, drawer, scrim, sheet and toast are `position: fixed` and constrained to the phone column with `inset-inline: 0; margin-inline: auto; max-width: var(--width-app)`. The drawer's start edge is `max(0px, (100% - var(--width-app)) / 2)` from the viewport's inline start. `body` is `max-width: var(--width-app); margin-inline: auto; padding-block-end: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + space)`. Above 430px the area outside the column uses `--color-border` and the column gets `--shadow` (FR-006).
- **Deviation from the prototype**: the prototype draws a rounded black device bezel (400px wide, ≥600px viewports). This plan keeps a plain centred 430px column with a shadow and no bezel, because the survey pages are server-rendered by LimeSurvey with document scroll. Everything inside the column (sizes, colours, components) matches the prototype. The prototype also leaves widths 431–599px full-width, which would break FR-006; the plan caps the column from 431px.
- **Scroll locking**: while the drawer or sheet is open, `html.hs-locked { overflow: hidden; }`. `html { scroll-padding-top: var(--appbar-h); }` keeps LimeSurvey's scroll-to-error target below the sticky app bar.
- **Alternatives considered**: Prototype frame in both (rejected above). Fixed app bar (rejected: sticky needs no spacer).

## R-05 Language preference, handover and resume

- **Decision**:
  1. One browser value, `localStorage['hotel.lang']` = `en` | `fa`, shared by the app and the survey shell (same origin). `shell.js` exposes `HotelShell.getLang()` and `HotelShell.setLang(l)`. With no stored value, the default is the browser rule from spec 001 FR-005: `fa` if `fa` ranks above `en` in `navigator.languages`, else `en`. Storage errors (private mode) fall back to the default and never throw.
  2. **Rate never carries a `lang` parameter.** Every Rate entry point (tab, drawer item, Home card) links to `/index.php/420001`.
  3. **Welcome-screen alignment** (in the theme's `scripts/custom.js`, replacing the spec 001 browser redirect): only on the welcome screen (`#welcome-container` present). If the URL has a `lang` parameter, the guest chose it, so store it (`setLang(pageLang)`). Otherwise, if `<html lang>` differs from `getLang()`, `location.replace()` the same URL with `lang=<pref>`. The added parameter makes a second redirect impossible.
  4. **Resume**: LimeSurvey keeps the survey session in the PHP session (`iSessionExpirationTime = 7200`). Opening `/index.php/420001` with no `lang` and no `newtest` while a session is at question *N* renders question *N* in the session's language. Because the app never adds `lang`, it never changes a resumed session's language (clarification Q3). The welcome screen is only shown when no question has been reached yet, which is exactly when the language may still change. A completed survey ends its session, so the next Rate starts fresh in the app language.
- **Rationale**: The static app cannot see the PHP session. Moving the language decision to the one screen where it is allowed (the welcome screen, rendered by LimeSurvey only when no answer has been given) meets FR-005, FR-015, A-01 and A-09 with no flag that could go stale, and needs no server code.
- **Alternatives considered**: An "in progress" flag in `localStorage` written by the theme (rejected: it outlives an expired session, so Rate would then open the base language, not the app language). Always add `lang=` to Rate (rejected: clarification Q3 forbids it; it would switch a resumed session's language, spec 001 R-07 limitation). A LimeSurvey plugin (rejected: backend code).
- **Verify**: (a) `/index.php/420001` resumes at question *N* in the session language. (b) Leaving the welcome screen via `?lang=` creates no response row. (c) After Submit, `/index.php/420001` shows a fresh welcome screen. (d) After the session expires, Rate shows a fresh welcome screen aligned to the app language. Fallback for (a) if LimeSurvey restarts instead of resuming: accept a fresh start (still never counts partial answers) and record it as a known limitation for the operator.

## R-06 Language switch on survey pages

- **Decision**: The Twig drawer renders the switch according to `aSurveyInfo.include_content`:
  - `firstpage` (welcome): two links, `surveyUrl?lang=en|fa`, `data-pjax="false"` (full load so `<html lang dir>` updates, spec 001 R-07/R-19). R-05 step 3 stores the choice on load.
  - `submit` (thank-you): two buttons with `data-lang` and `data-href="/app/index.html"`. `shell.js` stores the language and opens Home in it (the thank-you page cannot be reloaded without starting a new survey).
  - anything else (question pages, including a resumed session): two disabled buttons plus the translated note `d.langLocked` (FR-005).
- **Welcome selector**: `firstpage.twig` no longer includes `language_changer_first_page.twig` (clarification Q1). The file stays in the theme, unused, so spec 001's history is intact; the theme README marks it unused.

## R-07 pjax and links leaving the survey

- **Decision**: Every shell link in Twig that leaves the survey (`/app/*.html`) or reloads it (`?lang=`, Rate) carries `data-pjax="false"` and is a plain `<a href>`. `shell.js` binds all handlers by delegation on `document` (drawer toggle, scrim, Esc, `[data-soon]` toast, `[data-lang]`), so they survive pjax fragment swaps. It also listens for LimeSurvey's `pjax:scriptcomplete` (if fired) to close an open drawer after a step change.
- **Verify**: With vanilla's pjax, tapping Home or Nearby mid-survey performs a full navigation to the app page (not a fragment load into `#dynamicreload`). If `data-pjax="false"` is not honoured for a link, add the class or attribute vanilla's ajaxify uses to skip links (spec 001 R-19 found `data-pjax="false"` works for the language links).

## R-08 Dashboard query: read-only, completed only, no comments

- **Decision**: `scripts/build-dashboard.py` (Python 3 stdlib) runs SQL through `docker compose exec -T db sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" exec mariadb -u "$MARIADB_USER" "$MARIADB_DATABASE" --batch --skip-column-names'` with the SQL on stdin. Credentials stay in the container's environment; nothing secret is on the host command line or in output.
  - The session runs `SET SESSION TRANSACTION READ ONLY; START TRANSACTION READ ONLY;` and only `SELECT` statements, then `ROLLBACK`.
  - Columns are resolved by question code, not hard-coded: `SELECT title, sid, gid, qid FROM lime_questions WHERE sid = ? AND parent_qid = 0 AND title IN ('Q1OVERALL', … ,'Q7RECOMMEND')`, building `{sid}X{gid}X{qid}`. If any of the seven is missing, the job fails the cycle (keeps the last good file). `Q8LIKED` and `Q9IMPROVE` are never named in the script and their columns are never selected (FR-029). Column names are validated against `^[0-9]+X[0-9]+X[0-9]+$` before being placed in SQL.
  - Aggregation happens in SQL, so only counts and sums leave the database: one row per range (`7d`, `30d`, `all`) with total completed, `startlanguage` counts, per-question count and sum for Q1–Q6 (values `'1'`–`'5'` only), and Q7 count, promoters (`9`,`10`), passives (`7`,`8`), detractors (`0`–`6`).
  - Completed means `submitdate IS NOT NULL` (FR-030, A-06).
  - Windows: `SET @now = NOW();` once per cycle, then `submitdate >= @now - INTERVAL 7 DAY` (or 30), no bound for All (clarification Q4, FR-025). `generatedAt` is that same `@now`, published as UTC ISO 8601.
- **Clock alignment**: LimeSurvey writes `submitdate` in PHP's zone, and the window uses MariaDB's `NOW()`. Both are UTC today (verified). If either changes, the windows shift by the offset. Recorded as risk R6.
- **Read-only user**: a dedicated `SELECT`-only database user would be stronger, but `db/init/` runs only on a fresh volume and the existing volume would need a manual `GRANT`. For the local demo, the read-only transaction plus `SELECT`-only SQL is the control. A dedicated user is noted for production (deferred, PRD §5).
- **Alternatives considered**: LimeSurvey RemoteControl API (rejected: needs enabling JSON-RPC and admin credentials; returns full responses including comments). `SELECT *` then aggregate in Python (rejected: comment text would leave the database). Python MySQL driver (rejected: not stdlib, and the DB network is `internal`, so the host cannot reach port 3306 anyway).

## R-09 Rounding, NPS and the manual SQL check

- **Decision**: The job publishes exact integers (counts and sums) and derived values computed with Python `Decimal` and `ROUND_HALF_UP` (ties away from zero):
  - category average: `sum / n` rounded to one decimal; `null` when `n = 0`;
  - NPS: `(promoters − detractors) × 100 / n7` rounded to a whole number, signed; `null` when `n7 = 0`.
  The browser only formats those numbers; it never re-rounds a float. The manual SQL check in `contracts/dashboard-data.md` §4 uses `ROUND(SUM(…)/COUNT(…), 1)` and `ROUND((pro − det) * 100 / n7)` on exact `DECIMAL` values, which MariaDB also rounds half away from zero, so the two agree exactly (SC-005).
- **Rationale**: Rounding a binary float in JavaScript (for example 63/20 = 3.15 → `3.1`) would disagree with SQL (`3.2`) and fail SC-005 on tie cases.
- **Language share**: published as counts (`en`, `fa`, `other`). The browser shows whole-number percentages; those are display only and are not part of the SQL check, which compares counts.

## R-10 Refresh cadence and freshness

- **Decision**: `--watch` runs a cycle every 10 s (PRD D-05; `--interval` overrides). The dashboard page polls `data/dashboard.json?t=<now>` with `cache: 'no-store'` every **5 s** while visible, and once on `visibilitychange` to visible. Worst case from Submit to screen: 10 s job + query time + 5 s poll ≈ 15 s (SC-006, A-04).
- **Atomic write**: write `dashboard.json.tmp` in `app/data/`, `fsync`, then `os.replace()`. A reader never sees a partial file.
- **Failure**: on any error (Docker down, DB unreachable, missing column, unparsable output) the cycle logs one line to stderr (error class and a short message, never SQL output or row data), leaves the last good file untouched and retries next cycle. One-shot mode exits non-zero.
- **Browser states**: file missing or unparsable → translated "not available yet" state (no numbers). `generatedAt` older than 60 s → numbers plus a translated stale note with the last-updated time. Both are spec edge cases.
- **Git**: `app/data/dashboard.json` and `*.tmp` are added to `.gitignore`. The file is generated per environment and never committed.

## R-11 Nearby search matching

- **Decision**: Match the trimmed query against the place's name and tags in **both** languages (FR-017, spec US3-AS2). Both sides go through one `fold()` function: Unicode NFD, remove combining marks (`\p{M}`), lower-case, map Arabic `ي`→`ی` and `ك`→`ک`, remove ZWNJ (U+200C) and tatweel (U+0640), collapse whitespace. Empty query matches everything.
- **Why it matters**: the demo-day script searches "cafe" (PRD §8). The data spells it "Café". Without accent folding, the prototype's plain `toLowerCase().includes()` returns **zero** places for "cafe". With `fold()`, "cafe" matches Corner Café, Golestan Pastry Café and Night Owl Café.
- **Alternatives considered**: Add "cafe" to tags (rejected: hides the defect and does not help "cafes"/"café" typing in other words).

## R-12 Open now and hours

- **Decision**: Keep the prototype's model. `hours: [open, close]` in decimal hours of the venue's day; `close > 24` means after midnight (`[18, 26]` = 18:00–02:00); `[0, 24]` means 24 hours. Open now, using the device's local time `h`: `(open <= h && h < close) || (close > 24 && h < close - 24)`. Display: `[0,24]` → "Open 24 hours"; otherwise `HH:MM – HH:MM` with `close % 24`, digits localised. Walking time: `max(1, round(distance_m / 80))` minutes.
- **Edge**: `[12, 24]` closes at midnight: at 23:59 open, at 00:00 closed (`0 < 24` but `0 >= 12` is false). Covered by a test flow.

## R-13 Numbers and direction in Persian

- **Decision**: The app formats numbers with `Intl.NumberFormat('fa-IR')` for Persian and `en-US` for English (Persian digits, FR-033), matching the prototype and spec 001 R-05 (`persianDigits = true`). Signed NPS is rendered in an LTR-isolated element (`<bdi dir="ltr">`) so the sign stays in front. Percentages use `٪` in Persian. Progress and bar fills use `inset-inline-start`, so they grow from the right in RTL. Chevrons and the Directions icon flip with `[dir="rtl"] .hs-flip`.

## R-14 Placeholder-brand notice on survey pages

- **Decision**: Keep spec 001's `placeholdernotice` theme option. When `on`, the notice renders as a compact muted line at the end of the survey content (above the tab bar's reserved space), not as the old header line, which the app bar replaces. The drawer footer always shows "Demo build · placeholder brand" (A-11) in the app and the survey. The operator can turn the survey notice off in the admin for the demo; nothing else depends on it.
- **Rationale**: Spec 001 FR-037 keeps working without breaking the prototype's look. Reversible by an existing admin switch. Listed as an operator item, not decided further.

## R-15 Survey screens restyled without content changes

- **Decision** (FR-012, FR-013, presentation only):
  - **App bar title** on all survey pages: `title.rate` ("Rate your stay"). The survey name `<h1>` stays in the DOM, visually hidden, for screen readers.
  - **Welcome**: one card like the prototype: star icon, tagline as heading (already from `brand.tagline`), the admin welcome message paragraph, a facts row (About 2 minutes · Anonymous · 9 questions) from theme strings, Start, and the note "The survey stays in English/Persian once you start" (`s.langNote`). The admin text's `.hotel-welcome-intro` and `.hotel-welcome-time` paragraphs are hidden by CSS inside the shell because the facts row says the same. The survey's welcome text in LimeSurvey is not edited.
  - **Questions**: progress bar plus "Question N of 9" in one row; the question in a card with the Required/Optional tag, the question text as heading, the tiles (existing `.hotel-scale` CSS restyled to the prototype's tiles), the help text ("1 = Very poor, 5 = Excellent") as the caption under the scale by setting theme option `questionhelptextposition = bottom`. Back/Continue keep spec 001's rules (no Back on Q1).
  - **Thank-you**: the existing check icon, admin end text, both hotel names, plus two buttons: "Back to home" (`/app/index.html`) and "Explore nearby" (`/app/nearby.html`), as links styled as buttons (FR-014).
- **Verify**: `questionhelptextposition` change takes effect after a theme Reset (theme options can be stored in LimeSurvey's own table; the Reset re-reads `config.xml`).

## R-16 Seeding through the public survey

- **Decision**: `scripts/seed-demo.py` (Python 3 stdlib: `urllib.request`, `http.cookiejar`, `html.parser`). For each response, a fresh cookie jar (new session), then:
  1. `GET /index.php/420001?lang=<en|fa>&newtest=Y`.
  2. Parse the form `#limesurvey`: collect every hidden input (CSRF token `YII_CSRF_TOKEN`, `sid`, `thisstep`, `SID`, `start_time`, `LEMpostKey`, `relevance…`, `java…` and others), plus the form `action`.
  3. POST the hidden fields with `move=movenext` (welcome → Q1), then for each question the answer field (`420001X1X<qid>`, resolved from the form's input names, not hard-coded) and `move=movenext`, and on Q9 `move=movesubmit`.
  4. Check the final page has the thank-you marker (`.hotel-done`); otherwise stop with an error naming the step (never printing page content).
  - Answers: deterministic PRNG (`--seed`, default 42) with per-question bias like the prototype (breakfast lower, staff higher) so category averages differ; Q7 correlated with Q1; about 55% `fa`. Q8/Q9: empty for most, otherwise clearly synthetic text such as `[demo seed 17] synthetic comment` (A-03, FR-035).
  - Guard: refuses to run unless the base URL host is `localhost`, `*.localhost` or `127.0.0.1` (prevents seeding a real deployment by mistake); `--count` default 40.
  - Dates: real submission time; no backdating (FR-036, clarification Q2).
- **Verify**: the hidden-field set and `move` values for LimeSurvey 6.17.18 format `S` (first run with `--count 1`, then count completed rows). If LimeSurvey rejects a scripted post (CSRF or `LEMpostKey`), fix by re-reading the hidden fields from each response page, never by writing to tables.
- **Alternatives considered**: RemoteControl `add_response` (rejected: FR-036 and FR-035 forbid it; it bypasses the public path). Playwright-driven seeding (rejected for the committed script: needs Node and a browser on demo day; acceptable only as a fallback in `scratch/`).

## R-17 Strings and translation sources

- **Decision**: Two string tables, by runtime:
  - `app/js/i18n.js`: every app string in `en` and `fa`, taken from the prototype's `S` table, plus the new keys in `data-model.md` §5.
  - `views/subviews/hotel/i18n.twig`: existing survey strings plus the shell keys the survey shell needs (tabs, drawer, toast, facts, language note, thank-you buttons).
  - Keys used by both shells carry the same key names and **identical** text in both tables. A unit test (`scripts/tests/test_shell_strings.py`) parses both files and fails on any difference or missing translation (FR-032, A-12).
- **Missing key**: `t()` returns the key itself, never the other language (spec 001 rule), so a gap is visible in review.
- **Open (operator)**: Persian copy review (spec 001 R4) now covers the new strings too.

## R-18 Survey ID in one place per runtime

- **Decision**: The survey ID `420001` appears in `app/js/app.js` (`SURVEY_URL = '/index.php/420001'`) and as the default of `--survey-id` in both scripts (overridable). In Twig the theme uses `aSurveyInfo.surveyUrl` and never hard-codes it. `validate.sh` checks that the ID in `app.js` equals the scripts' default.
- **Note**: Re-importing the `.lss` keeps `420001` if that ID is free. If an import assigns a different ID, change the three places (documented in `quickstart.md`).

## R-19 Testing approach

- **Decision**:
  1. `./scripts/validate.sh`, extended (FR-042): new required files; hex and remote-font checks also over `app/`; `py_compile` for the new scripts; `node --check` for the app and shell JS when `node` exists; bare `/app/` link check; a check that `build-dashboard.py` never names `Q8`/`Q9` codes or the `X8`/`X9` columns; `.gitignore` covers `app/data/dashboard.json`; survey-ID consistency (R-18); and it runs the stdlib unit tests.
  2. Python `unittest` (stdlib, no new dependency) in `scripts/tests/`: dashboard shaping and rounding, NPS edge cases, empty ranges, schema allow-list, atomic write and keep-last-good, seed form parsing with a synthetic HTML fixture, and shell-string parity.
  3. Browser test flows (plan §Test flows) run by the tester with Playwright from `scratch/` (git-ignored, no committed Node dependency, as in spec 001), saving screenshots and JSON results under `specs/002-hotel-demo-app/evidence/`.
  4. The manual SQL check (`contracts/dashboard-data.md` §4) for SC-005.
- **Alternatives considered**: Committing a Playwright suite (deferred, as in spec 001 R-18; it would add a Node toolchain to a no-build project).
