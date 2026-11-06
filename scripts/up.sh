#!/usr/bin/env bash
# Start the stack (LimeSurvey + MariaDB) in the background.
# Usage: ./scripts/up.sh   (or: make up)
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo "create .env first: cp .env.example .env" >&2; exit 1; }

docker compose up -d
docker compose ps
echo "survey: http://hotelsurvey.localhost"
