# AGENTS.md — Hotel Guest Survey

Single-hotel guest feedback app. Guests scan a room QR code and complete a short survey in Persian or English. Management reviews results in LimeSurvey's admin UI.

**Source of truth for requirements (current iteration): `hotelSurveyDemoPRD.md`.** It's a reduced demo scope: an app-style shell around the survey, plus a Nearby places section and a simple dashboard. Where it differs from the full MVP spec in `hotelSurveyPRD.md`, the demo PRD wins. Items it defers (QR codes, rooms, exports, production) are not to be built in this iteration.

## Architecture rules

- LimeSurvey CE is the survey engine. Do not rebuild survey functionality.
- Customisation lives outside LimeSurvey core: the child theme in `limesurvey/themes/hotel-classic/`, the static demo app in `app/` (Home, Nearby, Dashboard; vanilla HTML/CSS/JS, no build step), custom SQL in `db/init/`, and scripts in `scripts/`.
- The only server-side custom code is `app/api/places.php` (Neshan places proxy, runs on LimeSurvey's Apache/PHP). The Neshan key lives in `.env` only and never reaches the browser. Keep it parameter-free and cached (`docs/google-places.md`).
- The dashboard reads LimeSurvey's response table read-only and publishes aggregates only, never comment text.
- Never modify LimeSurvey core files or LimeSurvey core database tables.
- Custom data goes in separate tables (for example `hotel_rooms`).
- Avoid microservices and unnecessary backend code. Add custom components only when a PRD requirement needs them.
- Room tokens are identifiers, not credentials. Store only a SHA-256 hash of each token (`qr_token_hash`). Validate tokens server-side.
- Invalid or deactivated tokens must never be associated with a valid room.

## Product rules

- Guests need no account. Surveys are anonymous by default. Do not collect names or emails.
- Languages: Persian and English (operator decision, Milestone 2; replaces German and English). Every string is translated, and the language stays fixed for the whole survey.
- Required: department (restaurant / reception / facilities / housekeeping). Optional: one comment. No rating scales.
- Mobile-first. Touch targets are at least 48px. No horizontal scrolling. Keep JavaScript minimal.

## Design tokens

Brand: Kowsar Malekshahr Complex (`docs/brand.md`). Colours, fonts and spacing are defined in `limesurvey/themes/hotel-classic/css/tokens.css`. Do not hard-code hex values elsewhere. Lapis is the primary colour; gold is for accents and selected states only.

## Commands

- Validate the scaffold: `./scripts/validate.sh`
- Start the stack: `docker compose up -d` (requires `.env`). Served at `http://hotelsurvey.localhost` via the shared Caddy.
- Back up the database: `./scripts/backup-db.sh`
- After a demo wipe, restore survey 420001 (QDEPT included): `python3 scripts/reimport-survey.py --yes` then `python3 scripts/sync-survey-text.py`
- Put a few published comments on the guest stories wall: `python3 scripts/seed-stories.py --base-url http://127.0.0.1:8090`

## Secrets and data

- Never commit `.env` or `backups/`. Both are in `.gitignore`.
- Guest comments are sensitive. Do not log them or paste them into tickets or chat.
- Scratch files go in `scratch/` (git-ignored).

## Open decisions

Tracked in `docs/decisions.md`. Ask before resolving any item listed there as open.
