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


# --- Demo app (demo PRD §4, contracts/scripts-cli.md §3, FR-042) ------------

demo_required=(
  app/index.html
  app/nearby.html
  app/dashboard.html
  app/inbox.html
  app/stories.html
  app/css/app.css
  app/js/i18n.js
  app/js/app.js
  app/js/home.js
  app/js/nearby.js
  app/js/dashboard.js
  app/js/inbox.js
  app/js/stories.js
  app/js/places.js
  app/api/places.php
  app/api/inbox.php
  app/api/stories.php
  app/img/kowsar-hero.jpg
  app/data/places.json
  limesurvey/themes/hotel-classic/css/shell.css
  limesurvey/themes/hotel-classic/scripts/shell.js
  limesurvey/themes/hotel-classic/views/subviews/footer/footer.twig
  scripts/build-dashboard.py
  scripts/seed-demo.py
)
missing=0
for f in "${demo_required[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "missing: $f" >&2
    missing=1
  fi
done
[[ $missing -eq 0 ]] || exit 1

# Hex colours: the app's own files are held to the same rule as the theme (tokens.css only).
app_hex_found=0
while IFS= read -r file; do
  if grep -nE "$hex_re" "$file" >/dev/null 2>&1; then
    grep -nE "$hex_re" "$file" | while IFS= read -r line; do
      echo "hex colour outside tokens.css: $file:$line" >&2
    done
    app_hex_found=1
  fi
done < <(find app -type f \( -name '*.css' -o -name '*.js' -o -name '*.html' -o -name '*.json' \) ! -path 'app/data/dashboard.json' | sort)
[[ $app_hex_found -eq 0 ]] || exit 1

# Remote assets: no http(s) URL in app pages, styles or scripts, except the SVG namespace; no Google Fonts.
remote_found=0
while IFS= read -r file; do
  if grep -nE 'https?://' "$file" | grep -v 'http://www\.w3\.org/2000/svg' >/dev/null 2>&1; then
    grep -nE 'https?://' "$file" | grep -v 'http://www\.w3\.org/2000/svg' | while IFS= read -r line; do
      echo "remote asset reference: $file:$line" >&2
    done
    remote_found=1
  fi
done < <(find app -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' \) | sort)
if grep -rnE 'fonts\.(googleapis|gstatic)\.com' app "$THEME" >/dev/null 2>&1; then
  echo "remote font reference in app or theme" >&2
  remote_found=1
fi
[[ $remote_found -eq 0 ]] || exit 1

# Bare directory links: /app/ or /app must never be a link target (FR-040).
bare_found=0
if grep -rnE '(href="/app/?"|href="/app/?#|href="[^"]*/app/")' app "$THEME/views" >/dev/null 2>&1; then
  grep -rnE '(href="/app/?"|href="/app/?#|href="[^"]*/app/")' app "$THEME/views" | while IFS= read -r line; do
    echo "bare directory link: $line" >&2
  done
  bare_found=1
fi
[[ $bare_found -eq 0 ]] || exit 1

# places.json: parses, demo is true, 18 to 24 places.
python3 - <<'PY' || { echo "places.json check failed" >&2; exit 1; }
import json, sys
d = json.load(open('app/data/places.json', encoding='utf-8'))
assert d.get('demo') is True, 'demo must be true'
n = len(d.get('places', []))
assert 18 <= n <= 24, 'place count %d outside 18-24' % n
PY

# Places proxy: PHP syntax (host php, else the running LimeSurvey container, else skipped).
check_php() {
  local f="$1"
  if [[ -f "$f" ]]; then
    if command -v php >/dev/null 2>&1; then
      php -l "$f" >/dev/null || { echo "php syntax error: $f" >&2; exit 1; }
    elif docker compose ps --status running --services 2>/dev/null | grep -qx limesurvey; then
      docker compose exec -T limesurvey php -l "/var/www/html/$f" >/dev/null \
        || { echo "php syntax error: $f" >&2; exit 1; }
    else
      echo "php not found and stack not running: skipping PHP syntax check for $f" >&2
    fi
  fi
}
check_php app/api/places.php
check_php app/api/inbox.php
check_php app/api/stories.php

# Feedback queue table check (spec 003)
if [[ ! -f db/init/002_hotel_feedback_queue.sql ]]; then
  echo "missing: db/init/002_hotel_feedback_queue.sql" >&2
  exit 1
fi
if grep -iE 'lime_' db/init/002_hotel_feedback_queue.sql >/dev/null 2>&1; then
  echo "forbidden lime_ identifier in 002_hotel_feedback_queue.sql" >&2
  exit 1
fi

# Telegram forbidden: Bale only (spec 003)
if grep -rnE --exclude='validate.sh' 'api\.telegram\.org' app scripts >/dev/null 2>&1; then
  echo "api.telegram.org forbidden in app/ or scripts/" >&2
  exit 1
fi

# Secrets: BALE_BOT_TOKEN and NESHAN_API_KEY must not appear in client scripts
if grep -rnE 'BALE_BOT_TOKEN|NESHAN_API_KEY' app/js "$THEME/scripts" >/dev/null 2>&1; then
  echo "server secret name in client scripts" >&2
  exit 1
fi

# Secrets: no Google-format API key (AIza...) in tracked or new files. Keys belong in .env only.
if git ls-files -co --exclude-standard -z | xargs -0 grep -lE 'AIza[0-9A-Za-z_-]{35}' 2>/dev/null | grep -q .; then
  git ls-files -co --exclude-standard -z | xargs -0 grep -lE 'AIza[0-9A-Za-z_-]{35}' 2>/dev/null | while IFS= read -r f; do
    echo "api key in a repository file: $f (move it to .env)" >&2
  done
  exit 1
fi

# Python: every script compiles.
for f in scripts/*.py; do
  python3 -m py_compile "$f" || { echo "python compile failed: $f" >&2; exit 1; }
done
find scripts -name '__pycache__' -type d -prune -exec rm -rf {} + 2>/dev/null || true

# JavaScript: syntax check when node is installed.
if command -v node >/dev/null 2>&1; then
  for f in app/js/*.js "$THEME"/scripts/*.js; do
    node --check "$f" || { echo "javascript syntax error: $f" >&2; exit 1; }
  done
else
  echo "node not found: skipping JavaScript syntax checks" >&2
fi

# Comment guard: the dashboard job never names the comment questions or their columns.
if grep -nE 'Q8|Q9|LIKED|IMPROVE|X8|X9' scripts/build-dashboard.py >/dev/null 2>&1; then
  grep -nE 'Q8|Q9|LIKED|IMPROVE|X8|X9' scripts/build-dashboard.py >&2
  echo "comment guard: build-dashboard.py names a comment question" >&2
  exit 1
fi

# Comment guard: Bale send path must never name comment questions or log comments
python3 - <<'PY' || { echo "comment guard: Bale send path or error_log names comments" >&2; exit 1; }
import re
with open('app/api/inbox.php', encoding='utf-8') as f:
    inbox_content = f.read()
with open('app/api/stories.php', encoding='utf-8') as f:
    stories_content = f.read()

# send_bale_notification must not reference comment fields in inbox.php or stories.php
for content in [inbox_content, stories_content]:
    m = re.search(r'function send_bale_notification\b.*?\n\}', content, re.DOTALL)
    if m and re.search(r'Q8|Q9|LIKED|IMPROVE|\$praise|\$complaint', m.group(0)):
        raise SystemExit(1)

# error_log must never log praise or complaint in inbox.php or stories.php
for content in [inbox_content, stories_content]:
    if re.search(r'error_log\s*\(.*(\$praise|\$complaint)', content):
        raise SystemExit(1)
PY

# Git hygiene: the generated snapshot is ignored.
git check-ignore -q app/data/dashboard.json || { echo "app/data/dashboard.json must be git-ignored" >&2; exit 1; }

# Survey ID: the app's survey URL matches the scripts' default.
app_sid=$(grep -oE "SURVEY_URL = '/index.php/[0-9]+'" app/js/app.js | grep -oE '[0-9]+' | head -1 || true)
build_sid=$(grep -oE "DEFAULT_SURVEY = [0-9]+" scripts/build-dashboard.py | grep -oE '[0-9]+' | head -1 || true)
seed_sid=$(grep -oE "DEFAULT_SURVEY = [0-9]+" scripts/seed-demo.py | grep -oE '[0-9]+' | head -1 || true)
if [[ -z "$app_sid" || "$app_sid" != "$build_sid" || "$app_sid" != "$seed_sid" ]]; then
  echo "survey id mismatch: app=$app_sid build=$build_sid seed=$seed_sid" >&2
  exit 1
fi

# Unit tests (stdlib only).
python3 -m unittest discover -s scripts/tests >/dev/null || { echo "unit tests failed: python3 -m unittest discover -s scripts/tests" >&2; exit 1; }

echo "validate: ok"
