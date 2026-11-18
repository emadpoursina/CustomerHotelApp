# Data model: Department Feedback Inbox and Guest Stories

**Spec**: [spec.md](./spec.md) · **Research**: [research.md](./research.md)

## 1. Department tag

Not a separate survey. One value per response.

| Field | Type | Rules |
|---|---|---|
| code | enum | `restaurant` \| `reception` \| `facilities` \| `housekeeping` |
| stored as | LimeSurvey answer on `QDEPT` | Required before Q1; guest cannot multi-select |
| labels en | Restaurant, Reception, Facilities, Housekeeping | |
| labels fa | رستوران، پذیرش، تاسیسات، خانه‌داری | |
| stripe token | `--dept-restaurant` … `--dept-housekeeping` | Defined only in `tokens.css`; gold is not a department colour |

Legacy completed rows (no `QDEPT` column or NULL): valid under dashboard **All** only; no queue row unless newly completed after this feature.

## 2. Survey response (existing + QDEPT)

Table `lime_survey_420001` (engine-owned). This feature does not add hotel-owned copies of scores or comments.

| Field | Source | Used by |
|---|---|---|
| `id` | PK | Queue `response_id` |
| `submitdate` | NULL until complete | Sync eligibility; inbox time |
| `startlanguage` | `en` / `fa` | Dashboard language split only |
| `QDEPT` column | `{sid}X{gid}X{qid}` for title `QDEPT` | Inbox, Bale, dashboard slice, stories |
| Q1 column | `Q1OVERALL` | Overall score 1–5 (inbox/Bale raw) |
| Q7 column | `Q7RECOMMEND` | NPS raw 0–10 (inbox/Bale); dashboard NPS index unchanged |
| Q8 / Q9 | `Q8LIKED` / `Q9IMPROVE` text | Inbox **detail** and published **stories** only |

Q2–Q6 unchanged; dashboard category bars still use them. Validation of Q1–Q9 unchanged.

## 3. Queue item

Table `hotel_feedback_queue` (custom). One row per completed response.

| Column | Type | Rules |
|---|---|---|
| `id` | INT UNSIGNED PK AI | Inbox unread key in the browser |
| `survey_id` | INT | Default 420001 |
| `response_id` | INT | LimeSurvey response `id` |
| `department` | VARCHAR(32) | Copied from `QDEPT` at insert; one of the four codes |
| `overall` | TINYINT UNSIGNED | Q1 1–5 at insert |
| `nps` | TINYINT UNSIGNED | Q7 0–10 at insert |
| `submitted_at` | DATETIME | `submitdate` |
| `state` | ENUM | `pending` \| `published` \| `private` |
| `decided_at` | DATETIME NULL | Set when leaving `pending`; updated on unpublish |
| UNIQUE | `(survey_id, response_id)` | At most one queue row (and therefore one Bale send) |

**No comment columns.**

### State machine

```text
                publish
  pending ────────────────► published
     │                         │
     │ keep private            │ keep private (unpublish)
     ▼                         ▼
  private ◄────────────────────┘
     │
     └── terminal for publication (no publish, no return to pending)
```

| From | Action | To | Wall |
|---|---|---|---|
| pending | انتشار / publish | published | Eligible if Q8 or Q9 is non-empty after trim |
| pending | خصوصی بماند / keep private | private | Never |
| published | خصوصی بماند | private | Card removed |
| private | — | — | Actions: no انتشار |
| any | — | pending | Forbidden |

Insert always `pending`. Missing department at insert: still queue the row with `department` empty string; inbox shows a fallback label; dashboard department chips ignore it.

## 4. Browser unread (not a table)

| Key | `localStorage['hotel.inbox.read']` |
|---|---|
| Value | JSON array of queue `id` numbers |
| Mark read | Opening inbox detail for that id |
| Badge | Count of inbox list ids not in the array |
| Scope | This browser only; never synced |

## 5. Bale notice (ephemeral)

Not stored. Built from queue denormalized fields + hotel Persian name. Must not contain Q8/Q9. See [contracts/bale-message.md](./contracts/bale-message.md).

## 6. Guest story (derived)

Not a table. A published queue row **and** (`trim(Q8) ≠ ''` OR `trim(Q9) ≠ ''`).

| Shown | Hidden |
|---|---|
| Department label, praise excerpt, complaint excerpt (whichever exist), relative time optional | Response id, queue id, name, email, room, language, scores (scores are not required on the wall) |

One card per response. Empty-comment published rows are omitted (FR-017).

## 7. Dashboard snapshot v2

File `app/data/dashboard.json` (git-ignored). Aggregates only. See [contracts/dashboard.schema.json](./contracts/dashboard.schema.json).

- `ranges` = All (including untagged).
- `byDepartment.{code}` = same range shape, completed rows whose `QDEPT` equals that code.

Forbidden in the file: comments, response ids, per-response arrays, queue states.

## 8. UI session (existing)

`localStorage['hotel.lang']` unchanged. Survey language still locks after Start. Inbox/stories follow the app language like Dashboard.

## 9. Validation rules (trust boundary)

- PHP inbox actions: `id` integer; `action` in `publish|private`; enforce the state machine in SQL (`UPDATE … WHERE state='pending'` / `'published'`), not only in the UI.
- List JSON: no `praise`, `complaint`, `q8`, `q9`, or free-text comment keys.
- Bale function signature accepts only department, overall, nps, hotel name, time — not comment strings.
- Department codes outside the enum are stored as-is but treated as untagged for dashboard slices.
