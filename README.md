# Hotel Guest Survey

QR-code guest feedback for a single hotel. Built on LimeSurvey CE. See `hotelSurveyPRD.md` for requirements and `AGENTS.md` for working rules. Open decisions are listed in `docs/decisions.md`.

## Status

**Current iteration: demo.** Scope is in `hotelSurveyDemoPRD.md` (app shell, survey, Nearby, simple dashboard). Not started. The milestones below are from the full PRD; 3–5 are deferred until after the demo.

| Milestone (PRD §8) | Status |
|---|---|
| 1. Infrastructure | Local only. Production VPS, public domain, admin IP restriction and tested restore are open (`docs/decisions.md` §2) |
| 2. Design and survey | Complete. Branded bilingual survey (fa/en), committed in `79c28c7` |
| 3. QR-code management | Not started. `hotel_rooms` table exists and is empty |
| 4. Management and reporting | Not started |
| 5. QA and launch | Not started. Blocked on `docs/decisions.md` §2 |

## Layout

```
docker-compose.yml          LimeSurvey + MariaDB
.env.example                Environment template (copy to .env)
db/init/                    SQL run on first database start (custom tables only)
limesurvey/themes/          Child theme, mounted into LimeSurvey
scripts/                    validate.sh, backup-db.sh
docs/decisions.md           Decisions and open questions
```

Routing is handled by the shared Caddy in `~/docker-infrastructure/caddy`. It serves `http://hotelsurvey.localhost` and proxies to LimeSurvey on host port 8090.

## Setup

1. `cp .env.example .env` and replace every `CHANGE_ME`.
2. Run `./scripts/validate.sh`.
3. Start the stack: `docker compose up -d`.
4. Open `http://hotelsurvey.localhost` for the survey, and `http://hotelsurvey.localhost/index.php/admin` for administration.

The database init script runs only when the database volume is created for the first time. To re-run it, remove the `db_data` volume. This deletes all data.

## Backups

`./scripts/backup-db.sh` writes `backups/<db>-<timestamp>.sql.gz`. Restore is not yet documented. The PRD requires a tested restore before launch.
