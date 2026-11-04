#!/usr/bin/env bash
# Validation for the scaffold: required files exist and docker-compose.yml resolves.
# Milestone 2 additions: theme manifest present and well-formed, no hard-coded
# colour values outside css/tokens.css, no remote font references (SC-006, SC-008).
# Usage: ./scripts/validate.sh
set -euo pipefail
cd "$(dirname "$0")/.."

THEME=limesurvey/themes/hotel-classic

required=(
  docker-compose.yml
  .env.example
  db/init/001_hotel_rooms.sql
  limesurvey/themes/hotel-classic/README.md
  limesurvey/themes/hotel-classic/css/tokens.css
  limesurvey/themes/hotel-classic/config.xml
  limesurvey/themes/hotel-classic/css/fonts.css
  limesurvey/themes/hotel-classic/css/hotel.css
  limesurvey/themes/hotel-classic/scripts/custom.js
  limesurvey/themes/hotel-classic/views/subviews/hotel/i18n.twig
  limesurvey/themes/hotel-classic/views/subviews/hotel/brand.twig
  limesurvey/survey/hotel-guest-survey.lss
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

# --- Milestone 2: static theme checks ---------------------------------------

# XML well-formedness (config.xml, survey export). xmllint first, python3 fallback.
check_xml() {
  local f="$1"
  if command -v xmllint >/dev/null 2>&1; then
    if ! xmllint --noout "$f"; then
      echo "malformed xml: $f" >&2
      exit 1
    fi
  else
    if ! python3 -c 'import xml.dom.minidom,sys; xml.dom.minidom.parse(sys.argv[1])' "$f"; then
      echo "malformed xml: $f" >&2
      exit 1
    fi
  fi
}

check_xml "$THEME/config.xml"
check_xml limesurvey/survey/hotel-guest-survey.lss

# A hex colour (# + 3, 4, 6 or 8 hex digits, as a whole token) is allowed only
# in css/tokens.css. Prints the matching file and line, nothing else.
hex_re='(^|[^0-9A-Za-z_-])#([0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{3})([^0-9A-Za-z-]|$)'
hex_found=0
while IFS= read -r file; do
  [[ "$file" == "$THEME/css/tokens.css" ]] && continue
  if grep -nE "$hex_re" "$file" >/dev/null 2>&1; then
    grep -nE "$hex_re" "$file" | while IFS= read -r line; do
      echo "hex colour outside tokens.css: $file:$line" >&2
    done
    hex_found=1
  fi
done < <(find "$THEME" -type f \( -name '*.css' -o -name '*.twig' -o -name '*.js' -o -name '*.xml' -o -name '*.html' \) | sort)
[[ $hex_found -eq 0 ]] || exit 1

# No third-party font services anywhere in the theme (FR-033, SC-008).
if grep -rnE 'fonts\.(googleapis|gstatic)\.com' "$THEME" >/dev/null 2>&1; then
  grep -rnE 'fonts\.(googleapis|gstatic)\.com' "$THEME" | while IFS= read -r line; do
    echo "remote font reference: $line" >&2
  done
  exit 1
fi

# No remote @import in theme styles (FR-033).
if grep -rnE '@import[[:space:]]+url\([[:space:]]*["'"'"']?https?:' "$THEME" >/dev/null 2>&1; then
  grep -rnE '@import[[:space:]]+url\([[:space:]]*["'"'"']?https?:' "$THEME" | while IFS= read -r line; do
    echo "remote @import: $line" >&2
  done
  exit 1
fi

echo "validate: ok"
