# Contract: host-side scripts

All scripts run on the host from the repository (any working directory), need `.env` and the running stack, and use Python 3 standard library only (`docs/decisions.md` §1 item 4). No new dependency, no `requirements.txt` change.

## 1. `scripts/build-dashboard.py`

Specified in `dashboard-data.md` §5 (CLI, read-only access, atomic write, logging, exit codes).

## 2. `scripts/seed-demo.py`

```
python3 scripts/seed-demo.py [--count N] [--base-url URL] [--survey-id ID] [--seed N] [--fa-share F] [--dry-run]
```

| Option | Default | Meaning |
|---|---|---|
| `--count` | `40` | Completed responses to submit (1–200) |
| `--base-url` | `PUBLIC_URL` from `.env`, else `http://hotelsurvey.localhost` | Survey host. Refused unless the host is `localhost`, `*.localhost` or `127.0.0.1` |
| `--survey-id` | `420001` | Survey to fill |
| `--seed` | `42` | PRNG seed (same seed → same answers) |
| `--fa-share` | `0.55` | Share of responses started in Persian |
| `--dry-run` | off | Print the planned answer distribution (counts per language, per-question means), submit nothing |

Behaviour (research R-16):

- Each response: new cookie jar, `GET /index.php/<sid>?lang=<l>&newtest=Y`, then POST the form's hidden fields plus the answer and `move` for welcome, Q1…Q9 (`movesubmit` on the last), exactly as a browser would. No database access, no RemoteControl API, no clock change (FR-035, FR-036).
- Answers: Q1–Q6 in `1…5` with per-question bias (Breakfast lowest, Staff highest) so averages differ; Q7 in `0…10`, correlated with Q1 and covering promoters, passives and detractors; Q8/Q9 empty in about 70% of responses, otherwise `[demo seed <i>] synthetic comment` (A-03).
- Checks each final page for the thank-you marker; on failure stops with `seed: response <i> failed at step <name>` and exit 1. Never prints page HTML or answers.
- stdout: one progress line per 10 responses and a final `seed: submitted <n> responses (en=<a>, fa=<b>)`.
- Exit codes: `0` all submitted; `1` a submission failed; `2` refused host or bad arguments.

## 3. `scripts/validate.sh` (extended, FR-042)

Keeps every existing check and adds:

| Check | Fails when |
|---|---|
| Required files | any of `app/index.html`, `app/nearby.html`, `app/dashboard.html`, `app/css/app.css`, `app/js/{i18n,app,home,nearby,dashboard}.js`, `app/data/places.json`, theme `css/shell.css`, `scripts/shell.js`, `views/subviews/footer/footer.twig`, `scripts/build-dashboard.py`, `scripts/seed-demo.py` is missing |
| Hex colours | a hex colour appears in `app/` (`*.css`, `*.js`, `*.html`, `*.json`) or the theme, except `css/tokens.css` |
| Remote assets | any `http://` or `https://` URL in `app/` `*.html`/`*.css`/`*.js` (except the SVG namespace `http://www.w3.org/2000/svg`), or a Google Fonts reference |
| Bare directory links | `href="/app/"`, `href="/app"` or a link ending in `/app/` in `app/` or theme views (FR-040) |
| JSON | `app/data/places.json` does not parse, has `demo` ≠ `true`, or has fewer than 18 / more than 24 places |
| Python | `python3 -m py_compile` fails for a script in `scripts/` |
| JavaScript | `node --check` fails for a file in `app/js/` or the theme `scripts/` (skipped with a notice when `node` is absent) |
| Comment guard | `scripts/build-dashboard.py` contains `Q8`, `Q9`, `LIKED`, `IMPROVE`, `X8` or `X9` |
| Git hygiene | `git check-ignore -q app/data/dashboard.json` fails |
| Survey ID | the ID in `app/js/app.js` `SURVEY_URL` differs from the scripts' `--survey-id` default |
| Unit tests | `python3 -m unittest discover -s scripts/tests` fails |

Output on success stays `validate: ok`.

## 4. `docker-compose.yml`

One added volume line on `limesurvey`: `- ./app:/var/www/html/app:ro`. Nothing else changes (no new service, port, network or Caddy change).
