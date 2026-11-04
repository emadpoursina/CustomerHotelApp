# Hotel Guest Survey

QR-code guest feedback for a single hotel. Built on LimeSurvey CE. See `hotelSurveyPRD.md` for requirements and `AGENTS.md` for working rules. Open decisions are listed in `docs/decisions.md`.

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
