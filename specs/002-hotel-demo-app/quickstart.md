# Quickstart: run and check the hotel app demo

This guide sets up the demo and walks through it by hand. It follows the plan's test flows (TF-…) and demo PRD §6 and §8. Formats and rules are in `contracts/`, and the entities in `data-model.md`.

## Prerequisites

- Docker running, the shared Caddy up (`http://hotelsurvey.localhost` resolves), Python 3, and Chrome with DevTools device emulation.
- `.env` in the checkout you run from. A worktree has no `.env`, because it is git-ignored. Copy it from the main checkout and never commit it: `cp ../../../hotelSurvey/.env .` (adjust the path).
- The survey `420001` is imported and active (spec 001 quickstart §3). If an import gave it another ID, change `SURVEY_URL` in `app/js/app.js` and the `--survey-id` defaults (research R-18).

> **Shared stack.** `docker-compose.yml` names the project `hotel-survey`. When you run `docker compose up -d` from a worktree, the existing containers are recreated with **that worktree's** files (same database). When you're done testing, run `docker compose up -d` from the main checkout to switch back.

## 1. Static checks and stack

```bash
./scripts/validate.sh                       # expect: validate: ok   (TF-S1; also runs the unit tests)
docker compose up -d                        # recreates limesurvey with the ./app mount
docker compose ps                           # db healthy, limesurvey up
curl -s -o /dev/null -w '%{http_code}\n' http://hotelsurvey.localhost/app/index.html                              # 200
curl -s -o /dev/null -w '%{http_code}\n' http://hotelsurvey.localhost/upload/themes/survey/hotel-classic/css/shell.css   # 200
```

Clock check (risk R6). Both values must be in the same zone (UTC):

```bash
docker compose exec -T db sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" mariadb -u "$MARIADB_USER" -N -e "SELECT NOW()"'
docker compose exec -T limesurvey php -r 'echo date("Y-m-d H:i:s"), PHP_EOL;'
```

## 2. Theme reset (after the `config.xml` change)

1. Admin (`/index.php/admin`) → *Configuration → Themes* → `hotel-classic` → **Reset**. This loads `css/shell.css` and `scripts/shell.js` and sets the help-text position to bottom.
2. If a CSS or JS change still doesn't show, clear LimeSurvey's runtime asset cache (only generated files, never core files): `docker compose exec limesurvey sh -c 'rm -rf /var/www/html/tmp/assets/*'`.
3. *Theme options → Placeholder brand*: leave it `on` for development. For a clean demo, the operator may switch it `off` (risk R9).

## 3. Demo data

```bash
python3 scripts/seed-demo.py --dry-run      # planned distribution only, submits nothing
python3 scripts/seed-demo.py --count 1      # first real submission (checks the form flow, R-16)
python3 scripts/seed-demo.py                # about 40 responses, both languages (TF-D6)
python3 scripts/build-dashboard.py          # one cycle; prints: dashboard: all=… 30d=… 7d=… at …
```

Expected: `app/data/dashboard.json` exists, and `git status` does not list it (it is git-ignored). Seeded responses all carry today's date, so 7 days, 30 days and All match on seed day (A-02).

## 4. Walkthrough (by hand, about 15 minutes)

Use Chrome DevTools device mode (Pixel 7 or iPhone 14, then the widths 320, 360, 390 and 430, then desktop). Start the live refresh in a second terminal and leave it running:

```bash
python3 scripts/build-dashboard.py --watch
```

| Step | Do | Check |
|---|---|---|
| 1 | Open `http://hotelsurvey.localhost/app/index.html` | App bar (hamburger, title with brand mark, bell), tab bar with a raised gold-accent Rate tab, Home active. Hero greeting, Rate card, 6 services, 3 highlights. On desktop, a centred phone-width column |
| 2 | Tap the bell, each service, and Services in the tab bar | "Coming soon" toast above the tab bar, gone after about 2 s. The page does not change |
| 3 | Open the drawer; tap the backdrop; reopen; press Esc | It slides in from the left and closes both ways. Hotel names, menu, 4 "Soon" items, language switch, "Demo build · placeholder brand" |
| 4 | Drawer → فارسی | Everything switches to Persian, RTL, with the drawer on the right and Persian digits. Reload: still Persian |
| 5 | Tap a highlight | Nearby opens with that place's sheet |
| 6 | Nearby: type `cafe`, then toggle Open now, then pick Cafés and Top rated | The list narrows on each key (`cafe` finds the three "Café" places). Every control combines. The count updates |
| 7 | Tap a place; tap Directions; tap the backdrop | The sheet shows all details. Directions shows the toast. The backdrop closes the sheet |
| 8 | Search `zzzz` → Clear filters | Empty state, then the full list again (sort kept) |
| 9 | Dashboard tab | KPIs (responses, overall /5, signed NPS), NPS bar, 6 category bars each with `n`, language split, "Aggregates only", "Updated HH:MM". Chips 7/30/All |
| 10 | Rate tab | The welcome screen inside the same shell, in the app language. No language links on the card. Facts row and Start |
| 11 | Drawer → switch language on the welcome screen | The welcome screen reloads in the other language. No response is started |
| 12 | Start → press Continue without answering | The translated required message. Back is hidden on Q1 |
| 13 | Answer Q1–Q3, then open the drawer | The language switch is disabled, with "Locked while the survey is open" |
| 14 | Tap Home. Switch the app language in the drawer. Tap Rate | The survey resumes at Q4 in its **original** language, and the switch is still locked (TF-E16) |
| 15 | Finish Q4–Q7, leave Q8 and Q9 empty, Submit | Thank-you screen with "Back to home" and "Explore nearby" |
| 16 | Tap "Explore nearby", then the Dashboard tab | Within about 15 s the Responses count is 1 higher, with no reload |
| 17 | Tap Rate again | A fresh welcome screen, in the current app language |
| 18 | Repeat steps 1–17 in the other language and at 320px | No horizontal scroll anywhere. Every control is easy to tap |

## 5. Manual SQL check (SC-005)

With `--watch` stopped (or right after a refresh), run the query in `contracts/dashboard-data.md` §4 for `@days = 7`, `30` and `NULL`. Compare it with the dashboard on the matching chip. Every figure must be equal. Save the output (aggregates only) to `evidence/TF-D2-sql-<range>.txt`.

## 6. Privacy checks

```bash
grep -c 'synthetic comment' app/data/dashboard.json     # expect 0 (TF-D3)
python3 -m json.tool app/data/dashboard.json | head -40 # counts, sums, averages only
```

The `--watch` terminal shows only `dashboard:` count lines (TF-D4).

## 7. Resilience (optional, TF-D5)

With `--watch` running: `docker compose stop db`. The job prints `cycle failed` lines and the file is unchanged. After about 60 s, the Dashboard shows the stale note. Then `docker compose start db`: refreshes resume without restarting the job.

## 8. Demo day (PRD §8)

```bash
docker compose up -d
python3 scripts/build-dashboard.py --watch      # leave running
```

Open `http://hotelsurvey.localhost/app/index.html` in Chrome device mode. Script: Home → Nearby (search "cafe", Open now) → Rate (submit) → Dashboard (count goes up). A real phone needs the LAN hostname from `docs/decisions.md` §2 item 5, which is still open.

## 9. Switching the shared stack back

From the main checkout: `docker compose up -d`. If the main checkout has no `app/` yet, `/app/*` returns 404 there. That is expected until the feature is merged.
