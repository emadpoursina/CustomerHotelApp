# AGENTS.md — Hotel Guest Survey

Single-hotel guest feedback app. Guests scan a room QR code and complete a short survey in Persian or English. Management reviews results in LimeSurvey's admin UI. **Source of truth for requirements: `hotelSurveyPRD.md`.**

## Architecture rules

- LimeSurvey CE is the survey engine. Do not rebuild survey functionality.
- Customisation lives outside LimeSurvey core: the child theme in `limesurvey/themes/hotel-classic/`, custom SQL in `db/init/`, and scripts in `scripts/`.
- Never modify LimeSurvey core files or LimeSurvey core database tables.
- Custom data goes in separate tables (for example `hotel_rooms`).
- Avoid microservices and unnecessary backend code. Add custom components only when a PRD requirement needs them.
- Room tokens are identifiers, not credentials. Store only a SHA-256 hash of each token (`qr_token_hash`). Validate tokens server-side.
- Invalid or deactivated tokens must never be associated with a valid room.

## Product rules

- Guests need no account. Surveys are anonymous by default. Do not collect names or emails.
- Languages: Persian and English (operator decision, Milestone 2; replaces German and English). Every string is translated, and the language stays fixed for the whole survey.
- Required questions: 1–6 (1–5 rating) and 7 (0–10). Questions 8 and 9 are optional text.
- Mobile-first. Touch targets are at least 48px. No horizontal scrolling. Keep JavaScript minimal.

## Design tokens

Colours, fonts and spacing are defined in `limesurvey/themes/hotel-classic/css/tokens.css`. Do not hard-code hex values elsewhere. Gold is for accents and selected states only.

## Commands

- Validate the scaffold: `./scripts/validate.sh`
- Start the stack: `docker compose up -d` (requires `.env`). Served at `http://hotelsurvey.localhost` via the shared Caddy.
- Back up the database: `./scripts/backup-db.sh`

## Secrets and data

- Never commit `.env` or `backups/`. Both are in `.gitignore`.
- Guest comments are sensitive. Do not log them or paste them into tickets or chat.
- Scratch files go in `scratch/` (git-ignored).

## Open decisions

Tracked in `docs/decisions.md`. Ask before resolving any item listed there as open.
