#!/usr/bin/env bash
# Dump the MariaDB database (LimeSurvey + room registry) to backups/ as gzip.
# Usage: ./scripts/backup-db.sh   (requires the stack to be running and .env to exist)
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo "create .env first (see .env.example)" >&2; exit 1; }
set -a
# shellcheck disable=SC1091
source .env
set +a

mkdir -p backups
out="backups/${DB_NAME}-$(date +%Y%m%d-%H%M%S).sql.gz"

docker compose exec -T db sh -c \
  'exec mariadb-dump -u root -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines "$MARIADB_DATABASE"' \
  | gzip > "$out"

echo "wrote $out"
