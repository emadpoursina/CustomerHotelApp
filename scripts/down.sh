#!/usr/bin/env bash
# Stop and remove the stack containers. Named volumes (database, uploads) are kept.
# Usage: ./scripts/down.sh   (or: make down)
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose down
echo "stack stopped. Data volumes were kept."
