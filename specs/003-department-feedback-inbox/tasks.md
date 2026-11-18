---
description: "Task list for Department Feedback Inbox and Guest Stories"
---

# Tasks: Department Feedback Inbox and Guest Stories

**Input**: Design documents from `/specs/003-department-feedback-inbox/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included where the plan, FR-025, and `contracts/scripts-cli.md` require them (`scripts/tests/`, `validate.sh` guards, `php -l`). Browser flows (TF-E*) are polish/quickstart, not a new test framework.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and demoed independently after Phase 2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US5)
- Include exact file paths in descriptions

## Path Conventions

Repository root (no top-level `src/`): `app/`, `app/api/`, `limesurvey/`, `db/init/`, `scripts/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Env, tokens, and evidence folder so later phases have a place to land without inventing new layout.

- [X] T001 Create `specs/003-department-feedback-inbox/evidence/` for TF screenshots and Verify notes (never paste guest or seed comment bodies into evidence text; use hashes or `len>0`)
- [X] T002 [P] Document `BALE_BOT_TOKEN`, `BALE_CHAT_ID`, and optional `BALE_API_BASE` (default `https://tapi.bale.ai`, no trailing slash) in `.env.example` with empty = skip send; never commit real tokens
- [X] T003 [P] Pass `BALE_BOT_TOKEN: ${BALE_BOT_TOKEN:-}`, `BALE_CHAT_ID: ${BALE_CHAT_ID:-}`, `BALE_API_BASE: ${BALE_API_BASE:-https://tapi.bale.ai}` into `limesurvey.environment` in `docker-compose.yml` (same pattern as Neshan)
- [X] T004 [P] Add `--dept-restaurant`, `--dept-reception`, `--dept-facilities`, `--dept-housekeeping` only in `limesurvey/themes/hotel-classic/css/tokens.css` as `var(--…)` or `color-mix()` of existing palette; gold `--color-accent` stays selected/active chrome, not a department colour; do not hard-code hex in other files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Custom queue table, shared i18n keys, and the queue state-machine check that every later PHP/UI action must match.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create `db/init/002_hotel_feedback_queue.sql` as idempotent `CREATE TABLE IF NOT EXISTS hotel_feedback_queue` with: `id` INT UNSIGNED PK AI; `survey_id` INT (default 420001); `response_id` INT; `department` VARCHAR(32) copied from QDEPT at insert (one of `restaurant` \| `reception` \| `facilities` \| `housekeeping`, or empty string if missing); `overall` TINYINT UNSIGNED (Q1 1–5 at insert); `nps` TINYINT UNSIGNED (Q7 0–10 at insert); `submitted_at` DATETIME (`submitdate`); `state` ENUM `pending` \| `published` \| `private`; `decided_at` DATETIME NULL (set when leaving pending; updated on unpublish); UNIQUE `(survey_id, response_id)`; **no comment columns**; **no `lime_` identifiers**
- [X] T006 Apply `db/init/002_hotel_feedback_queue.sql` on the running MariaDB volume with `docker compose exec -T db sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" mariadb -u "$MARIADB_USER" "$MARIADB_DATABASE"' < db/init/002_hotel_feedback_queue.sql` (initdb.d will not re-run); confirm `hotel_feedback_queue` exists and `lime_surveys` is unchanged (TF-D1)
- [X] T007 [P] Add English and Persian strings (non-empty, no silent fallback) in `app/js/i18n.js` and matching shared shell keys in `limesurvey/themes/hotel-classic/views/subviews/hotel/i18n.twig` for: `tab.stories` Guest stories / داستان‌ها (retire Services as destination name), department labels Restaurant/رستوران Reception/پذیرش Facilities/تاسیسات Housekeeping/خانه‌داری, inbox chrome/filters/empty/no-match/relative-time buckets (just now; N minutes; N hours; N days), انتشار/Publish and خصوصی بماند/Keep private, stories empty/error, Home teaser title and static promotional copy
- [X] T008 [P] Add `scripts/queue_state.py` documenting the table in data-model.md: pending+publish→published; pending+private→private; published+private→private; publish from published or private rejected; private is terminal (no publish, no return to pending)
- [X] T009 Add `scripts/tests/test_queue_state.py` (TF-U02) covering those four allowed transitions and the rejected cases
- [X] T010 Extend `scripts/validate.sh` with: `002_hotel_feedback_queue.sql` exists and contains no `lime_` identifiers; `app/` or `scripts/` must not contain `api.telegram.org`; `BALE_BOT_TOKEN` and `NESHAN_API_KEY` must not appear in `app/js/` or `limesurvey/themes/hotel-classic/scripts/`; new department hex only in `tokens.css`

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 - Tag a department then rate the stay (Priority: P1) 🎯 MVP

**Goal**: Rate starts with four required department cards; the same nine questions follow; the tag is stored on the completed LimeSurvey response.

**Independent Test**: Start Rate, pick Housekeeping, complete Q1–Q7 (comments empty), thank-you; start again, pick Restaurant, complete with comments. SQL/`QDEPT` differs; a response without a department never appears under a department filter (dashboard chips in US5 confirm the same tag).

### Tests for User Story 1

- [X] T011 [P] [US1] Extend `scripts/tests/test_seed_form.py` so the fixture includes a `QDEPT` field and the parser still finds it before Q1 (TF-U06); ensure it fails until T016 is done

### Implementation for User Story 1

- [X] T012 [P] [US1] Edit `limesurvey/survey/hotel-guest-survey.lss`: add question `qid=10`, `title=QDEPT`, `type=L`, `question_theme_name=listradio`, `mandatory=Y`, `other=N`, group gid 1, `question_order=0`; shift existing Q1–Q9 `question_order` by +1 without changing qid 1–9; answers in order `restaurant` / `reception` / `facilities` / `housekeeping` with en Restaurant, Reception, Facilities, Housekeeping and fa رستوران، پذیرش، تاسیسات، خانه‌داری; question text en `Which department is this feedback about?` / fa `این بازخورد مربوط به کدام بخش است؟`
- [X] T013 [US1] Add `QDEPT` to the **active** survey `420001` via LimeSurvey add-question-on-active (same codes as T012). **Do not deactivate** the survey. Record exact admin steps in `specs/003-department-feedback-inbox/evidence/`. Confirm with read-only `SELECT title FROM lime_questions WHERE sid=420001 AND title='QDEPT';`. Do not hand-write `ALTER TABLE lime_*`
- [X] T014 [P] [US1] Theme `QDEPT` as four ≥48px cards (not a compact radio list) in `limesurvey/themes/hotel-classic/css/hotel.css` and `limesurvey/themes/hotel-classic/scripts/custom.js` keyed off question code `QDEPT` / `{SGQ}`; RTL in `fa`; Continue disabled until a card is selected; Back absent on first question; Q1 Back returns to `QDEPT` and changing the card updates the tag
- [X] T015 [US1] Update `limesurvey/themes/hotel-classic/views/subviews/header/progress_bar.twig`: hide progress on `QDEPT`; Q1–Q9 show **Question N of 9** (department does not count); welcome facts stay “9 questions”. **Verify** `aSurveyInfo.progress.currentstep` after the extra question (research K2) and record the probe in evidence
- [X] T016 [US1] Update `scripts/seed-demo.py` to post `QDEPT` after welcome `movenext` and before Q1 using the field name found in the form (never a hard-coded SGQA); round-robin or seeded mix of all four codes; do not print answers or comments; existing CLI flags unchanged
- [X] T017 [US1] LimeSurvey theme **Reset** after CSS/JS/Twig changes; Rate URLs stay `/index.php/420001` with **no** `lang` parameter

**Checkpoint**: Department picker works; Q1–Q9 unchanged; completed rows have a `QDEPT` value

---

## Phase 4: User Story 2 - Manager is pinged in Bale without seeing comments (Priority: P1)

**Goal**: Completing a survey inserts one queue row and sends one Persian Bale message with department and scores only; comment bodies never appear in the payload or logs; send failure does not block thank-you.

**Independent Test**: Submit one survey with filled comments and one with empty comments; inspect captured Bale POST body (mock `BALE_API_BASE` or fixture). Both include department and scores; neither includes comment text. Unset credentials: queue row still created, log `bale: skipped`.

### Tests for User Story 2

- [X] T018 [P] [US2] Add `scripts/tests/test_bale_message.py` (TF-U01): builder output equals the five-line template in `specs/003-department-feedback-inbox/contracts/bale-message.md`; signature inspect allows only department/overall/nps/hotel/time — **no comment parameter**; department map covers four codes; ASCII digits in the body

### Implementation for User Story 2

- [X] T019 [US2] Implement the Bale text builder and `sendMessage` POST in `app/api/inbox.php` (`declare(strict_types=1)`, mysqli + curl, no Yii): `POST {BALE_API_BASE}/bot{BALE_BOT_TOKEN}/sendMessage` with `chat_id` and `text` only, timeout ≤ 5s; empty token or chat id → skip; never log request/response bodies or Q8/Q9; never use `api.telegram.org`
- [X] T020 [US2] Implement `POST /app/api/inbox.php` `{ "op": "sync" }`: SELECT completed rows (`submitdate IS NOT NULL`) reading **only** response `id`, `submitdate`, `QDEPT`, Q1, Q7 (resolve `QDEPT` via `lime_questions` title + allow-list `^[0-9]+X[0-9]+X[0-9]+$`); `INSERT IGNORE` into `hotel_feedback_queue` as `pending` (empty `department` if missing); attempt **one** Bale send only when insert affected 1; JSON `{ "ok": true, "inserted": <int>, "bale": "sent"|"skipped"|"failed" }` never echoes comments; allowed logs only `inbox: sync inserted=N`, `bale: skipped`, `bale: sent`, `bale: failed status=N`; missing table 503 `error=setup`; DB down 503 `error=db`
- [X] T021 [US2] Fire non-blocking `fetch` `POST {op:sync}` from `limesurvey/themes/hotel-classic/views/subviews/content/submit.twig` on thank-you; ignore network errors; do not await before navigation; thank-you buttons remain Home and Nearby only (no stories button)
- [X] T022 [US2] Confirm duplicate thank-you refresh still yields one queue row and one send attempt (UNIQUE + send-only-on-insert); failed/skipped Bale still shows thank-you (FR-008)

**Checkpoint**: Completing a survey creates a pending queue item and a comment-free Bale attempt

---

## Phase 5: User Story 3 - Inbox: review scores, read comments, publish or keep private (Priority: P1)

**Goal**: The app-bar bell opens a full-screen inbox. Rows show scores only; detail shows comments; pending can Publish or Keep private once; published can unpublish to private; private cannot be published; unread is per-browser.

**Independent Test**: Complete a survey with comments; open the bell; unread row with scores only; open it, Keep private; complete another, Publish; filters and both empty states work.

### Implementation for User Story 3

- [X] T023 [US3] Extend GET in `app/api/inbox.php`: always run sync first; default/`view=list` matches `specs/003-department-feedback-inbox/contracts/inbox-list.schema.json` (`additionalProperties: false`; required `id`, `department` enum including `""`, `overall` 1–5 or null, `nps` 0–10 or null, `submittedAt`, `state` pending\|published\|private) with **no** `praise`/`complaint`/`q8`/`q9` keys; `view=meta` returns `{ "ids": [<int>, …] }` newest first; `id=<queue id>` matches `inbox-detail.schema.json` with `praise` and `complaint` strings (empty if missing) and MUST NOT include guest name, email, room, or LimeSurvey response `id`
- [X] T024 [US3] Implement `POST { "op": "action", "id": <queue id>, "action": "publish"|"private" }` in `app/api/inbox.php`: `id` integer; encode transitions in SQL (`UPDATE … WHERE id=? AND state='pending'` / `'published'`), not only in UI; pending+publish→published 200; pending+private→private 200; published+publish 409 `not_pending`; published+private→private 200; private+publish 409 `private_terminal`; private+private 200 no-op; missing 404; `affected_rows = 0` and row exists → 409; set `decided_at` when leaving pending
- [X] T025 [US3] Add `app/inbox.html`, `app/js/inbox.js`, and styles in `app/css/app.css`: full-screen shell list without `id` query — AND filters (department chips All + four codes; status All / Unread / Pending / Published / Private); row stripe `var(--dept-*)` on inline-start, department label, overall, NPS raw, relative time, unread marker, **no comment text**; two empty strings (no items vs no matches); tap → `inbox.html?id={queueId}`; on detail load append queue `id` to `localStorage['hotel.inbox.read']` JSON array; detail shows comments with vertical scroll only; pending: انتشار and خصوصی بماند; published: only Keep private; private: no Publish; after action update from JSON `state`; `fa` Persian digits via `HotelI18n.num`; controls ≥48px; reduced motion follows existing `app.css` rules
- [X] T026 [US3] Replace Coming soon bell with `<a href="/app/inbox.html">` in `app/js/app.js` and `limesurvey/themes/hotel-classic/views/subviews/header/nav_bar.twig` (`data-pjax="false"` on survey); `aria-label` notifications; child `.hs-dot` visible iff unread count > 0 from `GET /app/api/inbox.php?view=meta` vs `localStorage['hotel.inbox.read']`; failure hides the dot (no Coming soon toast); add `inbox` to `HotelApp.renderShell` routes for `aria-current` and titles
- [X] T027 [US3] RTL for Persian inbox list/detail (stripe side and list direction); no horizontal scroll at 320px+
- [X] T028 [US3] Lint `app/api/inbox.php` with `docker compose exec limesurvey php -l /var/www/html/app/api/inbox.php`

**Checkpoint**: Bell opens a real inbox; queue actions match the state machine; comments stay off the list and off Bale

---

## Phase 6: User Story 4 - Guest stories wall of approved anonymous comments (Priority: P2)

**Goal**: Fifth tab, Home static teaser, and drawer all open the same wall of published anonymous excerpts (one card per response). Pending, private, and empty-comment items are absent.

**Independent Test**: Empty wall when nothing published. Publish one response with both praise and complaint → one card with both excerpts. Keep another private → absent. Home teaser has no comment text.

### Implementation for User Story 4

- [X] T029 [US4] Add `app/api/stories.php` (`declare(strict_types=1)`): run inbox sync first; GET matches `specs/003-department-feedback-inbox/contracts/stories.schema.json` — published items with `trim(Q8) ≠ ''` OR `trim(Q9) ≠ ''`, newest `submitted_at` first, one object per queue row with `department` (four-code enum only), `praise`, `complaint`, `submittedAt`; omit pending, private, empty-comment published; **no** queue id, response id, name, email, room, or scores required
- [X] T030 [US4] Add `app/stories.html` and `app/js/stories.js` plus styles in `app/css/app.css`: load GET `/app/api/stories.php`; calm empty state (not an error); HTTP failure = error + retry; card anonymous, department visible, both excerpts on one card; truncate with expand when taller than ~6 lines; `fa` RTL; ≥48px; reduced motion
- [X] T031 [US4] Point fifth tab, drawer, and Home teaser at `/app/stories.html` in `app/js/app.js`, `app/index.html` / `app/js/home.js`, `limesurvey/themes/hotel-classic/views/subviews/footer/footer.twig`, and `limesurvey/themes/hotel-classic/views/subviews/header/nav_bar.twig`: remove Services `data-soon` destination; drawer item after Dashboard before mock block; Home replaces mock services grid with **static** title + promotional copy only — **no** fetch of stories API on Home; add `stories` to `HotelApp.renderShell` routes; label `tab.stories`
- [X] T032 [US4] Lint `app/api/stories.php` with `docker compose exec limesurvey php -l /var/www/html/app/api/stories.php`

**Checkpoint**: Three entry points open the same wall; unpublished comments never appear; Home stays quote-free

---

## Phase 7: User Story 5 - Dashboard filtered by department (Priority: P2)

**Goal**: Existing aggregates dashboard gains All + four department chips; figures AND with date range; comment text still never in `dashboard.json`.

**Independent Test**: After mixed-department submissions, switch All / Restaurant / Housekeeping and confirm totals match a manual SQL count of completed tagged responses in that date range; untagged rows only in All.

### Tests for User Story 5

- [X] T033 [P] [US5] Extend `scripts/tests/test_build_dashboard.py` and `scripts/tests/schema_walk.py`: accept schemaVersion 2 fixture with `byDepartment`; injecting a `comments` key fails; schemaVersion 1 fails (TF-U03); restaurant range totals match tagged fixture rows; untagged counted only in `ranges` (TF-U04)

### Implementation for User Story 5

- [X] T034 [US5] Update `scripts/build-dashboard.py` to emit schemaVersion **2** matching `specs/003-department-feedback-inbox/contracts/dashboard.schema.json`: required `byDepartment.{restaurant,reception,facilities,housekeeping}` each with `{7d,30d,all}`; `ranges` = All including untagged/NULL/empty; slices `AND deptcol = '<code>'` using allow-list enum only; resolve `QDEPT` like Q1–Q7; **never** name `Q8`, `Q9`, `LIKED`, `IMPROVE`, `X8`, `X9`; keep read-only transaction and `--watch`; extra keys still fail the walker
- [X] T035 [US5] Add All + four department chips next to existing date chips in `app/dashboard.html`, `app/js/dashboard.js`, and `app/css/app.css`: All default; AND with date chip; every figure (counts, Q1 average, NPS index, Q1–Q6 bars, language split, low-sample note) uses `ranges` vs `byDepartment.{code}`; client never fetches comments
- [X] T036 [US5] After `python3 scripts/build-dashboard.py`, confirm `app/data/dashboard.json` has no comment text (`grep` synthetic comment string is 0) and job remains read-only (TF-D6, TF-D7)

**Checkpoint**: Dashboard slices by department; aggregates-only rule intact

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validation guards, string parity, and the SC-010 demo walk across all stories.

- [X] T037 Extend `scripts/validate.sh` so Bale/inbox PHP send paths fail if they name `Q8`, `Q9`, `LIKED`, `IMPROVE`, or log `$praise` / `$complaint`; run `php -l` on `app/api/inbox.php` and `app/api/stories.php` on host or via `docker compose exec limesurvey`; keep existing dashboard comment guard
- [X] T038 [P] Extend `scripts/tests/test_shell_strings.py` so new keys exist and are non-empty in en/fa in `app/js/i18n.js` and shared keys match `limesurvey/themes/hotel-classic/views/subviews/hotel/i18n.twig` (TF-U05)
- [X] T039 Run `./scripts/validate.sh` and `python3 -m unittest discover -s scripts/tests` until both pass (TF-S1)
- [X] T040 Seed mixed departments with `python3 scripts/seed-demo.py --count 8` (no printed comments) and rebuild `python3 scripts/build-dashboard.py`
- [X] T041 [P] Execute quickstart browser flows TF-E01–TF-E13 at 320/360/390/430 and 1280, `hotel.lang` en and fa; save evidence under `specs/003-department-feedback-inbox/evidence/` without copying comment text into chat or tickets
- [X] T042 Run the SC-010 demo walk from `specs/003-department-feedback-inbox/quickstart.md` (department → submit with synthetic comments → Bale-safe ping → inbox publish → stories → dashboard filter) on the first attempt (TF-E14)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational; QDEPT must exist before seed/sync can copy department
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 live `QDEPT` column so sync can read the tag; introduces `app/api/inbox.php` sync/Bale
- **User Story 3 (Phase 5)**: Depends on US2 sync module in `app/api/inbox.php` (same file — do not parallelize T019–T026 with a second writer)
- **User Story 4 (Phase 6)**: Depends on US2 sync (stories GET runs sync first) and US3 publish action so the wall has a path from pending
- **User Story 5 (Phase 7)**: Depends on US1 `QDEPT` (and seed mix); can proceed in parallel with US2–US4 if staffed (different files: `scripts/build-dashboard.py`, `app/dashboard.html`, `app/js/dashboard.js`)
- **Polish (Phase 8)**: Depends on all desired user stories

### User Story Dependencies

- **User Story 1 (P1)**: After Phase 2 — no dependency on inbox/Bale/stories
- **User Story 2 (P1)**: After US1 live question (needs `QDEPT` on completed rows)
- **User Story 3 (P1)**: After US2 (`inbox.php` exists); independently testable as UI over the same API
- **User Story 4 (P2)**: After US3 publish path (or seed SQL `state='published'` for a wall-only spike — not the spec path)
- **User Story 5 (P2)**: After US1; parallel with US2–US4

### Within Each User Story

- Tests listed above should fail until the matching implementation lands
- Schema/LSS before theme/seed
- Sync/Bale before inbox UI
- Action API before stories wall
- Dashboard job before dashboard chips

### Parallel Opportunities

- T002, T003, T004 (env, compose, tokens)
- T007 and T008 (i18n vs `queue_state.py`)
- T011 and T012 (seed test vs LSS) once Phase 2 is done
- T014 (theme cards) in parallel with T012 (LSS) — different files
- T018 (Bale unit test) in parallel with US1 theme work
- T033 (dashboard tests) in parallel with US3/US4
- T038 in parallel with T037
- Do **not** parallelize multiple writers on `app/api/inbox.php`, `app/js/app.js`, or `app/css/app.css`

---

## Parallel Example: User Story 1

```bash
# After Phase 2:
Task: "Extend scripts/tests/test_seed_form.py QDEPT fixture (T011)"
Task: "Edit limesurvey/survey/hotel-guest-survey.lss QDEPT (T012)"
Task: "Theme QDEPT cards in hotel.css + custom.js (T014)"
```

## Parallel Example: User Story 5 (alongside inbox)

```bash
Task: "Extend test_build_dashboard.py schema v2 (T033)"
Task: "Update scripts/build-dashboard.py byDepartment (T034)"
# Not in parallel with T025/T030 if also editing app/css/app.css
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: four cards → same nine questions → `QDEPT` stored
5. Demo tagged feedback even without inbox

### Incremental Delivery (matches plan)

1. Setup + Foundational → table, tokens, i18n
2. US1 → department tag (MVP)
3. US2 → comment-free Bale ping
4. US3 → inbox publish/private (P1 operator surface)
5. US4 → guest stories wall
6. US5 → dashboard department chips
7. Polish → `validate.sh`, unittest, SC-010 walk

### Parallel Team Strategy

1. Together: Phase 1–2
2. Then:
   - Dev A: US1 (LSS, theme, seed)
   - Dev B: US5 (dashboard job + chips) after QDEPT column exists
   - Dev C: US2 then US3 then US4 (single owner of `inbox.php` / `stories.php`)

---

## Notes

- [P] = different files, no incomplete-task dependency
- Do not modify LimeSurvey core files or hand-ALTER `lime_*`
- Comments are sensitive: never log them; never put them in `dashboard.json` or Bale text
- `app/` stays `:ro` inside the container; PHP must not write files under `app/`
- `docs/decisions.md` §2 stays unresolved
- Stop at any checkpoint to validate the story independently


---

## Phase 9: Convergence

- [X] T043 Update stories.php sync to send Bale manager notification or delegate to Bale-aware inbox sync on new queue row inserts per FR-005 (contradicts)

---

## Phase 10: Convergence

- [X] T044 Fix .app-chip min-width: var(--touch-min) in app/css/app.css to ensure filter chips meet >=48px touch target on both axes per SC-007 (partial)

