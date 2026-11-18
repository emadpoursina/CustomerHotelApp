# Implementation Plan: Department Feedback Inbox and Guest Stories

**Branch**: `department-feedback-inbox` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-department-feedback-inbox/spec.md` (clarified 2026-11-17; remaining clarify questions skipped after Q1 and already encoded).

## Summary

Guests tag one of four hotel departments, then take the same nine-question LimeSurvey stay survey. Completed responses feed a custom queue: Bale pings managers with department and scores only; an in-app inbox (the old bell) lets anyone in this demo publish or keep comments private; a guest stories wall shows only published anonymous excerpts; the dashboard filters the same aggregates by department.

Approach (no LimeSurvey core edits, no new container):

1. **`QDEPT`** list-radio as the first question after welcome, themed as four cards; stored by the engine on `lime_survey_420001`.
2. **`hotel_feedback_queue`** custom table for pending/published/private only (no comment columns).
3. **PHP** `app/api/inbox.php` + `app/api/stories.php` on existing Apache: sync, list, detail, actions, Bale send (token from `.env`, same pattern as `places.php`).
4. **Static pages** `app/inbox.html` and `app/stories.html`; shell bell, fifth tab, drawer, and Home teaser point at them.
5. **`build-dashboard.py`** schemaVersion 2 with `byDepartment` slices; still never reads comments.

## Technical Context

**Language/Version**: HTML5; CSS3 (logical properties, `color-mix()`); vanilla JavaScript (ES2017, classic scripts); Twig (LimeSurvey 6); PHP 8.x (`declare(strict_types=1)`, mysqli, curl); Python 3 stdlib; Bash; SQL (MariaDB 11).

**Primary Dependencies**: LimeSurvey CE 6.17.18, MariaDB 11, Docker Compose, shared Caddy. Bale Bot API (`tapi.bale.ai`). No new npm/pip libraries. Playwright 1.64 from `scratch/` for browser flows.

**Storage**: LimeSurvey response table (engine-owned, plus `QDEPT`); custom `hotel_feedback_queue`; `app/data/dashboard.json` (generated, git-ignored); browser `localStorage['hotel.lang']` and `localStorage['hotel.inbox.read']`. Bale notices are not persisted.

**Testing**: `./scripts/validate.sh`; `python3 -m unittest discover -s scripts/tests`; Playwright flows from `scratch/` with evidence in `specs/003-department-feedback-inbox/evidence/`; PHP `php -l`; captured Bale body in a test double (no real comments in logs).

**Target Platform**: Mobile-first browsers via Chrome device emulation (`docs/decisions.md` §2 item 5). Local `http://hotelsurvey.localhost`.

**Project Type**: Static app + LimeSurvey child theme + small PHP helpers on the existing Apache + host-side dashboard/seed scripts.

**Performance Goals**: Inbox list after submit visible on next bell open (sync on GET/thank-you). Dashboard still updates within the existing job interval. Bale send ≤ 5s timeout and never blocks thank-you.

**Constraints**: No LimeSurvey core file edits; no hand-written `ALTER` of `lime_*`; no manager login; no Telegram/native push; comments never in Bale, logs, or `dashboard.json`; tokens only in `tokens.css`; ≥48px; no horizontal scroll from 320px; secrets only in `.env`; `app/` mount stays `:ro`.

**Scale/Scope**: 1 survey question, 1 custom table, 2 PHP endpoints, 2 app pages, shell/theme/i18n edits, dashboard schema v2, seed+validate extensions.

No NEEDS CLARIFICATION items remain.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template. Binding rules are `AGENTS.md`, `hotelSurveyDemoPRD.md` (deferred items still deferred), `docs/decisions.md` §1, and this spec (A-22).

| Gate (source) | Pre-design | Post-design | Evidence |
|---|---|---|---|
| Demo PRD source of truth; do not build deferred QR/rooms/exports/production | Pass | Pass | PIN/hidden URL explicitly out of scope; `hotel_rooms` untouched |
| LimeSurvey is the engine; do not rebuild survey functions | Pass | Pass | Q1–Q9 unchanged; `QDEPT` is one engine question; theme-only card UI ([department-question.md](./contracts/department-question.md)) |
| Customisation in theme, `app/`, `db/init/`, `scripts/` | Pass | Pass | Plus compose env for Bale (same as Neshan) |
| Never modify core files or core tables | Pass | Pass | No core PHP. No hand DDL on `lime_*`. Queue is `hotel_feedback_queue`. `QDEPT` column is created by LimeSurvey’s own survey definition (research R-01) |
| Dashboard read-only aggregates, never comment text | Pass | Pass | schema v2 still `additionalProperties: false`; job comment guard kept; comments only inbox detail + stories (R-07) |
| Custom data in separate tables | Pass | Pass | `hotel_feedback_queue` |
| No microservices / unnecessary backend | Pass | Pass | No new container. PHP is the existing Apache, justified by secret + writes (FR-024). Complexity table below |
| Room-token rules | N/A | N/A | Deferred |
| Anonymous, no names/emails | Pass | Pass | Wall and inbox JSON omit identity; survey stays anonymized |
| Persian and English, no silent fallback, language lock | Pass | Pass | New keys in `i18n.js` and `i18n.twig`; survey lock unchanged |
| Q1–7 required, Q8–9 optional | Pass | Pass | Unchanged after `QDEPT` |
| Mobile-first, 48px, no h-scroll, minimal JS | Pass | Pass | [inbox-stories-ui.md](./contracts/inbox-stories-ui.md) |
| Tokens only; gold = accent/selected only | Pass | Pass | Department stripes from new `tokens.css` vars, not `--color-accent` |
| Secrets / comments never committed or logged | Pass | Pass | Bale env; logging contract; validate.sh extensions |
| Open decisions §2: do not resolve | Pass | Pass | A-21 |

**Gate result**: Pass. Justified extra PHP (not a violation): AGENTS.md currently names `places.php` as the only custom server file; this spec’s FR-024 authorises the same pattern for Bale and the queue write path. Comments on unauthenticated inbox/stories are an accepted demo risk (A-13), not a dashboard leak.

## Project Structure

### Documentation (this feature)

```text
specs/003-department-feedback-inbox/
├── spec.md
├── plan.md                 # this file
├── research.md             # Phase 0
├── data-model.md           # Phase 1
├── quickstart.md           # Phase 1
├── contracts/
│   ├── department-question.md
│   ├── feedback-api.md
│   ├── bale-message.md
│   ├── inbox-stories-ui.md
│   ├── inbox-list.schema.json
│   ├── inbox-detail.schema.json
│   ├── stories.schema.json
│   ├── dashboard.schema.json
│   └── scripts-cli.md
├── checklists/requirements.md
└── tasks.md                # Phase 2 — not created by /speckit.plan
```

### Source Code (repository root)

```text
app/
├── inbox.html                # new
├── stories.html              # new
├── index.html                # Home teaser (edit)
├── dashboard.html            # department chips (edit)
├── css/app.css               # inbox/stories/teaser/chips
├── js/{app,i18n,home,dashboard,inbox,stories}.js
└── api/
    ├── places.php            # unchanged
    ├── inbox.php             # new: sync, list, detail, action, Bale
    └── stories.php           # new: published wall GET

limesurvey/survey/hotel-guest-survey.lss    # + QDEPT
limesurvey/themes/hotel-classic/
├── css/tokens.css            # --dept-* variables
├── css/hotel.css             # department cards
├── scripts/{shell.js, custom.js}
└── views/subviews/
    ├── hotel/i18n.twig
    ├── header/{nav_bar.twig, progress_bar.twig}
    ├── footer/footer.twig
    └── content/submit.twig   # non-blocking sync fetch

db/init/002_hotel_feedback_queue.sql

scripts/
├── build-dashboard.py        # schema v2 + QDEPT
├── seed-demo.py              # answers QDEPT
├── validate.sh
└── tests/                    # bale builder, dashboard slices, strings, seed

docker-compose.yml            # BALE_* env
.env.example
```

**Structure Decision**: Same layout as spec 002 (no top-level `src/`). PHP stays under `app/api/` so Apache serves it from the existing `:ro` mount (execute, not write). Custom SQL stays in `db/init/`. `docs/decisions.md` is not edited.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Additional PHP beyond `places.php` | Bale token must not reach the browser; queue publish needs a server write; `app/` is not writable for JSON files | Host-only Python watcher: delayed inbox and no safe browser POST. Static comment JSON: still needs a write API and would cache comments on disk |
| Comments in inbox/stories APIs | Spec requires manager review and a public wall | Putting comments in `dashboard.json`: violates the aggregates-only dashboard rule |

## Implementation Approach (for /speckit.tasks)

1. **Data plane**: `002_hotel_feedback_queue.sql`; apply on running DB; `.env.example` + compose `BALE_*`; unit tests for Bale text and queue transitions.
2. **QDEPT**: LSS + live survey add (R-01 Verify); theme cards; progress 1–9; seed step; thank-you sync fetch.
3. **PHP API**: inbox sync/list/detail/action + stories GET; comment-free list; logging guards.
4. **Inbox UI**: page, filters, unread localStorage, bell link + badge; replace Coming soon.
5. **Stories + Home teaser + tab/drawer**.
6. **Dashboard v2** + chips; validate.sh; demo walkthrough.

## Test Flows

IDs are stable for critic/tester. Viewports 320/360/390/430 + 1280. Both `hotel.lang` en and fa. Evidence under `specs/003-department-feedback-inbox/evidence/`. Never paste real or seeded comment bodies into evidence (use hashes or `len>0`).

### Static and unit

| ID | Flow | Expected |
|---|---|---|
| TF-S1 | `./scripts/validate.sh` | `validate: ok`; new guards fail on a scratch copy that names Q8 in the Bale sender or adds `api.telegram.org` |
| TF-U01 | Bale builder | Five-line Persian template; signature has no comment parameter; department map covers four codes |
| TF-U02 | Queue transitions | pending+publish→published; pending+private→private; published+private→private; publish from published/private rejected |
| TF-U03 | Dashboard walker v2 | Accepts fixture; extra `comments` key fails; `schemaVersion` 1 fails |
| TF-U04 | Department slice | Restaurant range totals match tagged fixture rows; untagged counted only in `ranges` |
| TF-U05 | String parity | New keys present and non-empty in en/fa in `i18n.js` and shared keys match `i18n.twig` |
| TF-U06 | Seed parser | Fixture with QDEPT field is posted before Q1 |

### Data (stack running)

| ID | Flow | Expected |
|---|---|---|
| TF-D1 | Apply SQL; `SHOW TABLES` | `hotel_feedback_queue` exists; `lime_surveys` unchanged |
| TF-D2 | Complete one survey with synthetic comments; GET list | One pending item; list JSON has no comment keys; `grep` of PHP logs for the synthetic string is 0 |
| TF-D3 | Capture Bale POST body (mock base or fixture) | Contains department and scores; 0 characters of the synthetic comment (SC-003, SC-006) |
| TF-D4 | Unset Bale env; complete survey | Queue row exists; thank-you shown; log `bale: skipped` |
| TF-D5 | Duplicate thank-you sync | Still one queue row; still one send attempt |
| TF-D6 | Dashboard job + SQL check per department and All | Figures match; `dashboard.json` has no comment text |
| TF-D7 | Job read-only proof | Same Com_* discipline as spec 002 TF-D7 |

### Browser

| ID | Flow | Expected |
|---|---|---|
| TF-E01 | Fresh Rate | Welcome then four department cards; cannot Continue without a choice; Q1 is 1 of 9 |
| TF-E02 | Pick Housekeeping, complete Q1–Q7 empty comments | Thank-you; dashboard Housekeeping count +1 vs All |
| TF-E03 | Back from Q1, change to Restaurant, finish | Inbox/dashboard show Restaurant |
| TF-E04 | Resume mid-survey | Not asked for department again; language still locked |
| TF-E05 | Bell from Home, Nearby, Dashboard, Q3 | Full-screen inbox; no “Coming soon”; survey uses `data-pjax=false` |
| TF-E06 | New row | Unread, stripe, scores, relative time, **no** comment on the row; detail shows comments; badge clears in this browser only (second context still unread) |
| TF-E07 | Publish | State published; stories shows one card; Home teaser still has no comment text |
| TF-E08 | Dual comments | One stories card with both excerpts |
| TF-E09 | Keep private / unpublish | Private has no Publish; stories card gone; cannot republish |
| TF-E10 | Filters + empty states | AND filters; dedicated no-match vs no-items |
| TF-E11 | Fifth tab + drawer + Home teaser | All open `stories.html`; Services toast gone |
| TF-E12 | Dashboard chips | All + four depts with date chips; All default; numbers follow both filters |
| TF-E13 | 320–430 en/fa | 0 h-scroll; controls ≥48px; no untranslated chrome; RTL stripe/list in fa |
| TF-E14 | Demo walk SC-010 | Department → submit with comments → Bale-safe ping → publish → stories → dashboard filter, first attempt |

## Risks

See research K1–K6. Highest: adding `QDEPT` on an **active** survey (never deactivate to edit).
