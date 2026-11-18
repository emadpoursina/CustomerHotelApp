# Research: Department Feedback Inbox and Guest Stories

**Feature**: `specs/003-department-feedback-inbox/spec.md` | **Date**: 2026-11-17

Findings come from the repository (app shell, theme, `places.php`, `build-dashboard.py`, `hotel-guest-survey.lss`, `db/init/001_hotel_rooms.sql`), spec 002 research (survey `420001`, response columns, read-only dashboard job), and `AGENTS.md`. Items marked **Verify** are confirmed during implementation. Skip was used after clarify Q1; remaining product choices are already in the spec (do not re-ask).

Verified facts reused from spec 002:

| Fact | Value |
|---|---|
| Survey | `420001`, `format = S` (one question per page), `anonymized = Y`, questions `Q1OVERALL`…`Q9IMPROVE` in gid 1, qid 1–9 |
| Response table | `lime_survey_420001` with `submitdate` NULL until complete; Q1–Q7 varchar scores; Q8/Q9 text |
| App | Static pages under `/app/*.html`, shell in `app/js/app.js` and theme Twig; bell and Services are `data-soon` |
| Dashboard | Host job writes `app/data/dashboard.json` (schemaVersion 1, aggregates only, never Q8/Q9) |
| Secrets pattern | `app/api/places.php` on LimeSurvey Apache/PHP; env from compose; key never in the browser |
| Custom SQL | `db/init/*.sql` runs **only** on first MariaDB volume init; existing demos need an explicit apply |
| App mount | `./app:/var/www/html/app:ro` — PHP can run, cannot write files under `app/` |

No NEEDS CLARIFICATION items remain in Technical Context.

---

## R-01 Department tag: LimeSurvey question `QDEPT`, not a fourth survey

- **Decision**: Add one mandatory list-radio question **`QDEPT`** (type `L`, theme `listradio`) as the first question after welcome, same survey `420001`. Answer codes (stable, language-independent): `restaurant`, `reception`, `facilities`, `housekeeping`. English/Persian question text and answer labels match the spec. Q1–Q9 codes, scales, and mandatory flags stay unchanged (FR-002, FR-004).
- **Rationale**: `format = S` already gives a full page before Q1. Resume, Back, language lock, and storage are LimeSurvey’s. Spec A-15 allows a survey-adjacent field. Dashboard and queue can resolve the column the same way spec 002 resolves Q1–Q7 (`title` → `{sid}X{gid}X{qid}`).
- **Alternatives considered**: Four surveys or branching (rejected: spec). A static `rate.html` picker plus `sessionStorage` (rejected: resume/Back would desync from LimeSurvey `lastpage`). A custom table *only* for the tag, posted from theme JS (rejected: extra write path and race before a response row exists).
- **Engine boundary**: Implementers MUST NOT run `ALTER TABLE lime_*` by hand. The column on `lime_survey_420001` is created by LimeSurvey when the question is added through its survey definition (updated `.lss` + admin/structure change on the live survey). Queue state never lives in `lime_*`.
- **Verify**: On LimeSurvey 6.17, adding `QDEPT` to the **active** survey adds a nullable column and leaves existing rows in place (A-14). If the admin UI requires deactivating, **stop** and use LimeSurvey’s “change survey” / add-question-on-active path instead of deactivate (deactivate can wipe responses). Record the exact admin steps in evidence.

## R-02 Department UI: themed cards, progress still 9 rating questions

- **Decision**: Keep the welcome screen (language alignment from spec 002). After Start, `QDEPT` is rendered as four ≥48px cards (not a compact radio list). Hide the progress bar on `QDEPT`. For Q1–Q9, show **Question N of 9** (not of 10). Welcome facts stay “9 questions”.
- **Rationale**: US1-AS1 wants cards and “no survey question yet” in the rating sense. Welcome is not a rating question; replacing it would break the only language-alignment screen. Progress must not imply a tenth scored item (FR-004).
- **Implementation sketch**: Theme CSS/JS keyed off question code `QDEPT` (SGQA / `{SGQ}` in the form), in `hotel.css` + `custom.js` and/or a thin condition in `listradio` views. `progress_bar.twig`: if `currentstep === 0` after the extra question, treat as department (hide); else `stepNo = currentstep`, `stepTotal = 9`. **Verify** `currentstep` values with one instrumented run (spec 002 recorded Q1 as 0 before this change).
- **Back**: LimeSurvey Back from Q1 returns to `QDEPT`; changing the card updates the tag for that session (edge case).
- **Alternatives considered**: Skip welcome (rejected: language lock/alignment). Department as a static page before `/index.php/420001` (rejected: R-01).

## R-03 Queue table and apply-on-existing-volume

- **Decision**: Custom table `hotel_feedback_queue` in `db/init/002_hotel_feedback_queue.sql` (same folder as `hotel_rooms`). Columns: surrogate `id`, `survey_id`, `response_id`, denormalized `department` / `overall` / `nps` / `submitted_at` (no comment columns), `state` ENUM `pending|published|private`, `decided_at`, unique `(survey_id, response_id)`.
- **Rationale**: FR-016. Denormalized scores keep the inbox **list** query off Q8/Q9. Comments are read only in the detail/stories queries.
- **Existing volumes**: `initdb.d` will not re-run. Quickstart applies the file with `docker compose exec -T db` (idempotent `CREATE TABLE IF NOT EXISTS`). No new microservice.
- **Alternatives considered**: Store state in LimeSurvey assessments/attributes (rejected: core tables). Static `inbox.json` written by a host job (rejected: `app/` is mounted `:ro` inside the container for PHP, and publish actions need a write path from the browser). Copying Q8/Q9 into the queue table (rejected: duplicates sensitive text; Bale sync might touch it).

## R-04 Sync on complete: PHP on LimeSurvey Apache (same pattern as places)

- **Decision**: One PHP module `app/api/inbox.php` (plus `app/api/stories.php` as a thin GET) that:
  1. **Sync**: `INSERT IGNORE` into `hotel_feedback_queue` for each `lime_survey_420001` row with `submitdate IS NOT NULL` that is not yet queued, reading **only** id, submitdate, QDEPT, Q1, Q7 (never Q8/Q9 in this query). Then send Bale for newly inserted ids.
  2. **List/meta**: queue rows without comments.
  3. **Detail**: join comments for one id.
  4. **Action**: `pending→published|private` once; `published→private`; reject publish on private (HTTP 409).
- **Triggers**: (a) thank-you screen `fetch` POST `{op:sync}` (non-blocking); (b) every inbox/stories GET runs sync first so seed and missed pings catch up; (c) no second long-running job required. `build-dashboard.py` stays read-only and comment-blind.
- **DB**: `mysqli` using existing compose env `DB_HOST`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`. Do not bootstrap Yii.
- **Rationale**: FR-024 / places.php: secrets and writes stay on the server. Unique key gives at most one queue row and one Bale send per response (edge: thank-you refresh).
- **Alternatives considered**: LimeSurvey plugin or core hook (rejected: core). Host-only Python watcher (rejected: up to 10s delay and a second writer). LimeSurvey RemoteControl (rejected: extra surface). End URL to an external host (rejected: extra moving part).

## R-05 Bale: server-side sendMessage, scores only

- **Decision**: HTTP POST to `{BALE_API_BASE}/bot{token}/sendMessage` (default base `https://tapi.bale.ai`) with `chat_id` and `text` only. Env: `BALE_BOT_TOKEN`, `BALE_CHAT_ID`, optional `BALE_API_BASE`. Empty token or chat id → skip send, log `bale: skipped` (no payload). Send failure → log `bale: failed status={n}` (no body, no comments); still 200 on survey and queue insert (FR-008). Message language is **Persian** even if `startlanguage=en` (A-10). Body shape is fixed in `contracts/bale-message.md`. Never put comments in the JSON posted to Bale. Never log request/response bodies.
- **Rationale**: Telegram-compatible Bot API that Bale documents; matches “department and scores only”.
- **Alternatives considered**: Telegram Bot API host `api.telegram.org` (rejected: FR-008 / SC-009). Client-side bot token (rejected: A-16). Including comment excerpts (rejected: FR-006).
- **Verify**: One live send in the operator’s Bale chat during demo setup. Unit-test the **text builder** with synthetic scores and assert the builder’s inputs cannot include comment fields (no Q8/Q9 parameters).

## R-06 Inbox and stories as real app pages; bell and tab 5

- **Decision**: `app/inbox.html` (full-screen list + detail via `?id=` or hash) and `app/stories.html`. Bell is an `<a href="/app/inbox.html">` in `app.js` and `nav_bar.twig` (survey: `data-pjax="false"`). Fifth tab and a drawer item both go to `app/stories.html`. Services toast is removed for that tab. Home replaces the mock services grid with a **static** stories teaser (no comment fetch on Home).
- **Unread**: `localStorage['hotel.inbox.read']` = JSON array of queue `id`s. Opening detail appends that id. Badge/dot = list ids not in the set. Independent per browser (A-06). No unread column in SQL.
- **Rationale**: Matches dashboard (a real HTML file). Overlay-in-shell would duplicate list/detail inside every page including pjax survey steps.
- **Alternatives considered**: Keep Services tab and add a sixth destination (rejected: FR-020). Server-side read flags (rejected: A-06).

## R-07 Comments leave the dashboard; they enter two authenticated-looking but open APIs

- **Decision**: `dashboard.json` remains aggregates-only (schemaVersion **2** adds department slices, still `additionalProperties: false`, still no comment keys). Inbox **detail** and **stories** GET may return Q8/Q9 text. Dashboard job still must not name `Q8`, `Q9`, `LIKED`, `IMPROVE`, `X8`, `X9`. `validate.sh` keeps that guard and adds: (1) Bale builder/send files do not name those tokens; (2) no `api.telegram.org` / `telegram` send URLs; (3) no `BALE_BOT_TOKEN` in `app/js` or theme JS.
- **Rationale**: FR-019 vs FR-011/017. Demo has no login (A-13); same openness as today’s dashboard, but comments are now fetchable by anyone with the URL — accepted for this iteration.
- **Constitution tension**: AGENTS.md “dashboard … never comment text” still holds for the dashboard job and file. It does **not** forbid inbox/stories. Do not put comments into `dashboard.json` to “reuse the job”.

## R-08 Dashboard schema v2: All plus four department slices

- **Decision**: Bump `schemaVersion` to 2. Keep `ranges` as today = **All** (every completed row in the date window, including untagged legacy). Add `byDepartment: { restaurant, reception, facilities, housekeeping }` each with the same `{7d,30d,all}` range objects. Job resolves `QDEPT` and filters with `column = 'restaurant'` etc. NULL/empty department is excluded from slices, included in `ranges`.
- **UI**: Department chips next to existing date chips; All is default; AND with the date chip (FR-021). Client never fetches comments.
- **Rationale**: One file, one poll, no PHP for aggregates.
- **Alternatives considered**: Five full snapshots as separate files (rejected: more IO). Filter in the browser from per-response rows (rejected: would publish per-response data and risk comments).

## R-09 Seed, strings, tokens

- **Decision**: `seed-demo.py` answers `QDEPT` with a deterministic mix of the four codes before Q1; synthetic comments stay the existing `[demo seed N] synthetic comment` pattern (never log them). New i18n keys in **both** `app/js/i18n.js` and `i18n.twig` with identical en/fa text (extend the string-parity unit test). Department stripe colours are **new CSS variables in `tokens.css` only**, each `var(--…)` or `color-mix()` of existing palette — **not** gold (`--color-accent` stays selected/active chrome, A-09).
- **Persian numerals**: reuse `HotelI18n.num` / theme `digits` for scores and relative-time counts on `fa` screens (FR-022).
- **Relative time buckets** (A-08): just now; N minutes; N hours; N days (same cutovers in both languages).

## R-10 Adding QDEPT to the committed LSS

- **Decision**: Edit `limesurvey/survey/hotel-guest-survey.lss`: new question `qid=10`, `title=QDEPT`, `mandatory=Y`, `question_order=0`; shift existing `question_order` values up by 1. Four `answers` / `answer_l10ns` rows. Do not change qid 1–9. Live stack: follow R-01 Verify (add question on active survey with the same codes). Re-importing a full LSS as a **new** survey is last resort (would change `sid`).
- **Alternatives considered**: Only document a manual admin recipe without LSS (rejected: not reproducible).

---

## Risks

| ID | Risk | Mitigation |
|---|---|---|
| K1 | Adding a question to an active survey wipes or clones `sid` | Verify first on a copy or via LimeSurvey “active survey add question”. Never deactivate-to-edit. |
| K2 | `currentstep` after QDEPT is not 0-based as assumed | One probe page; adjust `progress_bar.twig` only. |
| K3 | Bale API path/host differs from `tapi.bale.ai` | `BALE_API_BASE` override; skip-if-unset so demos without a bot still work. |
| K4 | Inbox comments on a public URL | Spec A-13; later PIN. Do not log comments in the meantime. |
| K5 | Dual sync (thank-you + GET) double-sends Bale | `INSERT IGNORE` + send only for rows whose insert affected 1. |
| K6 | Worktree compose shares named volumes | Same as spec 002: `docker compose up -d` from this worktree remounts `app/` and the theme. |
