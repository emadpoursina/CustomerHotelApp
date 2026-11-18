# Contract: scripts, env, validate

## 1. Schema apply (existing MariaDB volumes)

`db/init/002_hotel_feedback_queue.sql` is mounted into `initdb.d` for **new** volumes only.

On an already-initialized demo DB:

```bash
docker compose exec -T db sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" mariadb -u "$MARIADB_USER" "$MARIADB_DATABASE"' < db/init/002_hotel_feedback_queue.sql
```

The file must be idempotent (`CREATE TABLE IF NOT EXISTS`). It must not mention `lime_*` tables.

## 2. Seed (`scripts/seed-demo.py`)

Existing CLI flags unchanged. After welcome `movenext`, answer `QDEPT` then Q1–Q9. Every seeded completed row must have a department code so dashboard chips are non-empty (A-14). Do not print answers or comments.

## 3. Dashboard job (`scripts/build-dashboard.py`)

- Output schemaVersion **2** with `byDepartment` ([dashboard.schema.json](./dashboard.schema.json)).
- Resolve `QDEPT` in addition to Q1–Q7. Still never name Q8/Q9/LIKED/IMPROVE/X8/X9.
- `ranges` = all completed in the date window. Each department slice adds `AND deptcol = '<code>'` (code from the allow-list enum, not from user input).
- Read-only transaction unchanged. `--watch` unchanged.
- Unit tests: existing shaping/NPS/allow-list plus a fixture slice (restaurant n matches rows tagged restaurant). Injecting a `comments` key still fails the walker.

## 4. Compose / `.env.example`

Pass through to `limesurvey`:

```yaml
BALE_BOT_TOKEN: ${BALE_BOT_TOKEN:-}
BALE_CHAT_ID: ${BALE_CHAT_ID:-}
BALE_API_BASE: ${BALE_API_BASE:-https://tapi.bale.ai}
```

Document empty = skip send. Never commit real tokens.

## 5. `validate.sh` additions

| Check | Fail when |
|---|---|
| Existing comment guard on `build-dashboard.py` | Unchanged |
| Bale/inbox PHP send path | File that performs Bale HTTP names `Q8`, `Q9`, `LIKED`, `IMPROVE`, or logs `$praise` / `$complaint` |
| Telegram | `app/` or `scripts/` contains `api.telegram.org` |
| Token leak | `BALE_BOT_TOKEN` or `NESHAN_API_KEY` appears in `app/js/` or theme `scripts/` |
| String parity | New keys missing in en or fa, or mismatched between `i18n.js` and `i18n.twig` for shared shell keys |
| Hex | New department colours only in `tokens.css` |
| PHP syntax | `php -l app/api/inbox.php` and `stories.php` when `php` exists on the host **or** via `docker compose exec limesurvey php -l` |
| Schema file | `002_hotel_feedback_queue.sql` exists and has no `lime_` identifiers |

## 6. Unit tests (stdlib)

- `test_bale_message.py`: builder output equals the five-line template; function rejects kwargs named like comments if such a parameter is accidentally added (signature inspect: allowed names only).
- `test_queue_state.py` (pure Python mirror of the transition table) **or** a PHP CLI `--self-check` invoked from unittest if the rules live only in PHP — prefer extracting a tiny `scripts/queue_state.py` used as documentation of the table, with PHP duplicating the same WHERE clauses (keep them in `data-model.md` as the source of truth if two copies appear).
- Extend `test_shell_strings.py` for `tab.stories`, inbox, department, stories, teaser keys.
- Extend `test_seed_form.py` so the fixture includes a `QDEPT` field and the parser still finds it.
