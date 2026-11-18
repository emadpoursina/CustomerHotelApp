# Contract: Feedback HTTP API

Runs on LimeSurvey Apache/PHP next to `app/api/places.php`. Secrets and MariaDB stay on the server. The `app/` mount is read-only; these scripts must not write files under `app/`.

Base: `http://hotelsurvey.localhost/app/api/`

No authentication (demo, A-13). Same-origin browser calls only; no CORS headers needed.

## 1. `POST /app/api/inbox.php`

Content-Type: `application/json`.

### 1.1 Sync

```json
{ "op": "sync" }
```

- Inserts missing queue rows for completed responses (`submitdate IS NOT NULL`).
- SELECT for insert: response `id`, `submitdate`, `QDEPT`, Q1, Q7 only.
- `INSERT IGNORE` on `(survey_id, response_id)`.
- For each **newly inserted** id, attempt one Bale send ([bale-message.md](./bale-message.md)).
- Response: `{ "ok": true, "inserted": <int>, "bale": "sent"|"skipped"|"failed" }` (`bale` is the *last* send outcome, or `skipped` if `inserted=0`). Never echo comments.

Thank-you page fires this once, does not await it for navigation, and ignores network errors.

### 1.2 Action

```json
{ "op": "action", "id": 12, "action": "publish" }
```

`action`: `publish` | `private`. `id`: queue `id` (not LimeSurvey response id).

| Current state | `publish` | `private` |
|---|---|---|
| pending | → published, 200 `{ "ok": true, "state": "published" }` | → private, 200 |
| published | 409 `{ "ok": false, "error": "not_pending" }` | → private, 200 |
| private | 409 `{ "ok": false, "error": "private_terminal" }` | 200 no-op `{ "ok": true, "state": "private" }` |
| missing | 404 | 404 |

SQL must encode the transitions (`UPDATE … WHERE id=? AND state='pending'` etc.). If `affected_rows = 0` and the row exists, return 409.

## 2. `GET /app/api/inbox.php`

Always runs sync first (so the list is fresh after seed).

| Query | Result |
|---|---|
| (none) or `view=list` | List envelope ([inbox-list.schema.json](./inbox-list.schema.json)) |
| `view=meta` | `{ "ids": [<int>, …] }` newest first — for the bell badge |
| `id=<queue id>` | Detail ([inbox-detail.schema.json](./inbox-detail.schema.json)) |

Filters are **client-side** (FR-012) using list fields `department`, `state`, plus local unread. The API may ignore filter query params in this iteration.

List items MUST NOT include praise, complaint, or any guest free text.

Detail MAY include `praise` and `complaint` (empty string if missing). It MUST NOT include guest name, email, room, or LimeSurvey `id` (use queue `id` only in the JSON).

## 3. `GET /app/api/stories.php`

Runs sync first. Returns [stories.schema.json](./stories.schema.json): published items with at least one non-empty comment, newest `submitted_at` first. One object per queue row; both excerpts on that object when both exist. No queue id, no response id, no scores required.

Pending, private, and empty-comment published rows are omitted.

## 4. Logging

Allowed: `inbox: sync inserted=N`, `bale: skipped`, `bale: sent`, `bale: failed status=401`.

Forbidden: comment text, Q8/Q9 values, full Bale or DB row dumps, bot token.

## 5. Errors

JSON `{ "ok": false, "error": "<code>" }` with HTTP 4xx/5xx. Missing table: 503 `error=setup` (apply `002_hotel_feedback_queue.sql`). DB down: 503 `error=db`.
