#!/usr/bin/env bash
# Deploy the app to the production server over SSH.
#   1. validates the scaffold
#   2. syncs the project files with rsync (never .env, backups, scratch, or database data)
#   3. runs `docker compose up -d --build` on the server
#   4. pushes survey titles and texts to LimeSurvey (scripts/sync-survey-text.py); never questions or responses
#
# Required in .env (or the environment):
#   DEPLOY_HOST=user@server.example      SSH target
#   DEPLOY_PATH=/opt/hotel-survey        project directory on the server (must hold its own .env)
#   DEPLOY_PORT=22                       optional SSH port
#
# The production host and domain are still open (docs/decisions.md section 2).
# Usage: ./scripts/deploy.sh   (or: make deploy)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${DEPLOY_HOST:?set DEPLOY_HOST in .env (for example user@server.example)}"
: "${DEPLOY_PATH:?set DEPLOY_PATH in .env (for example /opt/hotel-survey)}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"

./scripts/validate.sh

# Preflight before anything is changed: SSH works and the target already holds a compose project with its own .env.
ssh -n -p "$DEPLOY_PORT" -o BatchMode=yes "$DEPLOY_HOST" \
  "cd '${DEPLOY_PATH}' 2>/dev/null && test -f .env && test -f docker-compose.yml" \
  || { echo "preflight failed: ${DEPLOY_PATH} on ${DEPLOY_HOST} needs docker-compose.yml and .env (nothing was changed)" >&2; exit 1; }

echo "Deploy to ${DEPLOY_HOST}:${DEPLOY_PATH} (SSH port ${DEPLOY_PORT})."
# Non-interactive: --yes / -y or DEPLOY_ASSUME_YES=1 (piping into the script is not reliable,
# because the validation step reads stdin).
if [[ "${1:-}" == "--yes" || "${1:-}" == "-y" || "${DEPLOY_ASSUME_YES:-}" == "1" ]]; then
  echo "Confirmed by flag; continuing."
else
  read -r -p "Type 'deploy' to continue: " answer
  [[ "$answer" == "deploy" ]] || { echo "aborted"; exit 1; }
fi

rsync -az --delete \
  -e "ssh -p ${DEPLOY_PORT}" \
  --exclude '.git/' \
  --exclude '.env' \
  --exclude 'backups/' \
  --exclude 'scratch/' \
  --exclude '.agent/' \
  --exclude '.pi/' \
  --exclude '.specify/' \
  --exclude 'specs/' \
  --exclude 'prototype/' \
  --exclude 'app/data/dashboard.json' \
  --exclude 'app/data/*.tmp' \
  --exclude '__pycache__/' \
  --exclude '.DS_Store' \
  ./ "${DEPLOY_HOST}:${DEPLOY_PATH}/"

ssh -p "$DEPLOY_PORT" "$DEPLOY_HOST" \
  "cd '${DEPLOY_PATH}' && docker compose up -d --build && docker compose ps"

# Titles and texts only (never questions or responses). Runs on the server with its own .env.
ssh -p "$DEPLOY_PORT" "$DEPLOY_HOST" \
  "cd '${DEPLOY_PATH}' && set -a && . ./.env && set +a && python3 scripts/sync-survey-text.py"

# Theme check (read-only): the guest survey must render the hotel shell. If it does not, the server's LimeSurvey
# still uses the stock theme. Fix in the LimeSurvey admin: install hotel-classic (Theme options) and apply it to the survey.
# The check never changes the server, and a failure only makes the deploy exit non-zero.
SURVEY_ID="${SURVEY_ID:-420001}"
if ssh -n -p "$DEPLOY_PORT" "$DEPLOY_HOST" \
  "cd '${DEPLOY_PATH}' && set -a && . ./.env && set +a && curl -s -m 10 \"http://localhost:\${SURVEY_PORT:-8090}/index.php/${SURVEY_ID}\" | grep -q 'hs-appbar'"; then
  echo "theme check ok: survey ${SURVEY_ID} renders hotel-classic"
else
  echo "theme check FAILED: survey ${SURVEY_ID} on ${DEPLOY_HOST} does not render hotel-classic (stock theme in use)." >&2
  echo "Install hotel-classic in the LimeSurvey admin (Theme options) and apply it to survey ${SURVEY_ID}, then re-run the check." >&2
  exit 1
fi

echo "deployed to ${DEPLOY_HOST}:${DEPLOY_PATH}"
