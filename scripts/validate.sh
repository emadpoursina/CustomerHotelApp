#!/usr/bin/env bash
# Validation for the scaffold: required files exist and docker-compose.yml resolves.
# Usage: ./scripts/validate.sh
set -euo pipefail
cd "$(dirname "$0")/.."

required=(
  docker-compose.yml
  .env.example
  db/init/001_hotel_rooms.sql
  limesurvey/themes/hotel-classic/README.md
  limesurvey/themes/hotel-classic/css/tokens.css
  scripts/backup-db.sh
  AGENTS.md
)

missing=0
for f in "${required[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "missing: $f" >&2
    missing=1
  fi
done
[[ $missing -eq 0 ]] || exit 1

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }

# Resolve the compose file. Uses .env when present, otherwise the template.
env_file=.env
[[ -f .env ]] || env_file=.env.example
docker compose --env-file "$env_file" config --quiet

bash -n scripts/backup-db.sh
echo "validate: ok"
