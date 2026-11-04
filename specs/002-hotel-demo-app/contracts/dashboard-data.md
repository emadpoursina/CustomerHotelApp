# Contract: dashboard data (`app/data/dashboard.json`)

Producer: `scripts/build-dashboard.py` (host-side, Python 3 stdlib). Consumer: `app/js/dashboard.js`. JSON Schema: `dashboard.schema.json` (this folder). Aggregates only (FR-029).

## 1. Example

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-11-04T20:56:41Z",
  "surveyId": 420001,
  "ranges": {
    "7d":  { "total": 41, "languages": { "en": 18, "fa": 23, "other": 0 },
             "categories": [
               { "key": "overall",     "code": "Q1OVERALL",    "n": 41, "sum": 172, "avg": 4.2 },
               { "key": "cleanliness", "code": "Q2CLEAN",      "n": 41, "sum": 176, "avg": 4.3 },
               { "key": "comfort",     "code": "Q3COMFORT",    "n": 41, "sum": 166, "avg": 4.0 },
               { "key": "staff",       "code": "Q4STAFF",      "n": 41, "sum": 186, "avg": 4.5 },
               { "key": "breakfast",   "code": "Q5BREAKFAST",  "n": 41, "sum": 141, "avg": 3.4 },
               { "key": "facilities",  "code": "Q6FACILITIES", "n": 41, "sum": 160, "avg": 3.9 }
             ],
             "nps": { "n": 41, "promoters": 17, "passives": 15, "detractors": 9, "score": 20 } },
    "30d": { "…": "same shape" },
    "all": { "…": "same shape" }
  }
}
```

## 2. Semantics

| Field | Definition |
|---|---|
| `generatedAt` | MariaDB `NOW()` captured once per cycle (`@now`), UTC, `YYYY-MM-DDTHH:MM:SSZ` |
| Range filter | `submitdate IS NOT NULL` and, for `7d`/`30d`, `submitdate >= @now - INTERVAL 7/30 DAY`; `all` has no lower bound (FR-025, clarification Q4) |
| `total` | Completed responses in range |
| `languages` | Counts by `startlanguage`: `en`, `fa`, anything else `other` |
| `categories[i].n` | Responses in range whose Q(i+1) value is one of `'1'…'5'` |
| `categories[i].sum` | Sum of those values |
| `categories[i].avg` | `sum / n` rounded half away from zero to 1 decimal; `null` if `n = 0` |
| `nps.n` | Responses in range whose Q7 value is one of `'0'…'10'` |
| `nps.promoters` / `passives` / `detractors` | Q7 in `9–10` / `7–8` / `0–6` |
| `nps.score` | `(promoters − detractors) × 100 / n` rounded half away from zero to an integer; `null` if `n = 0` |

Category order and keys are fixed: `overall` (Q1OVERALL), `cleanliness` (Q2CLEAN), `comfort` (Q3COMFORT), `staff` (Q4STAFF), `breakfast` (Q5BREAKFAST), `facilities` (Q6FACILITIES). The KPI "Average overall stay" is `categories[0].avg`.

Forbidden anywhere in the file: comment text (Q8, Q9), response IDs, per-response rows or arrays of individual answers, IP addresses, `startdate`, `seed`, tokens. The schema sets `additionalProperties: false` at every level.

## 3. Display rules (`dashboard.js`)

| Condition (selected range) | Display |
|---|---|
| File missing, HTTP error or invalid JSON | `db.unavailable` card only; no numbers |
| `total = 0` | Range chips + `db.none` empty state; never `NaN`, `0/0` or `—%` |
| `0 < total < 10` | All figures + `db.low` note with the count (FR-026) |
| `generatedAt` more than 60 s before the browser's now | All figures + `db.stale` with the last-updated time |
| always (with data) | `db.privacy` note and `db.updated` with `generatedAt` in local time `HH:MM` |

KPI tiles: Responses (`total`), Overall stay (`categories[0].avg` "/ 5"), NPS (`score`, signed: `+20`, `0`, `−100`, LTR-isolated). NPS card: detractor/passive/promoter bar and percentages of `nps.n`. Category card: six rows with label, `avg` (one decimal) and `n = {n}` each, bar width `avg / 5`, the highest average in gold (first on ties). Language card: English vs فارسی split of `languages.en`/`languages.fa` with whole-number percentages of `total`. Default range `30d`. Poll every 3 s while the page is visible (F4, research R-10).

## 4. Manual SQL check (SC-005)

Run read-only; compare each figure with the dashboard for the same range. Replace `@days` with `7`, `30`, or `NULL` for All. Run it within a few seconds of a refresh (or stop `--watch` first) so both use nearly the same `NOW()`.

```bash
docker compose exec -T db sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" mariadb -u "$MARIADB_USER" "$MARIADB_DATABASE" --table' <<'SQL'
SET SESSION TRANSACTION READ ONLY;
SET @days = 30;   -- 7, 30, or NULL for All
SELECT
  COUNT(*)                                                         AS total,
  SUM(startlanguage = 'en')                                        AS lang_en,
  SUM(startlanguage = 'fa')                                        AS lang_fa,
  ROUND(SUM(CAST(`420001X1X1` AS DECIMAL(4,0))) / SUM(`420001X1X1` IN ('1','2','3','4','5')), 1) AS q1_avg,
  SUM(`420001X1X1` IN ('1','2','3','4','5'))                       AS q1_n,
  ROUND(SUM(CAST(`420001X1X2` AS DECIMAL(4,0))) / SUM(`420001X1X2` IN ('1','2','3','4','5')), 1) AS q2_avg,
  ROUND(SUM(CAST(`420001X1X3` AS DECIMAL(4,0))) / SUM(`420001X1X3` IN ('1','2','3','4','5')), 1) AS q3_avg,
  ROUND(SUM(CAST(`420001X1X4` AS DECIMAL(4,0))) / SUM(`420001X1X4` IN ('1','2','3','4','5')), 1) AS q4_avg,
  ROUND(SUM(CAST(`420001X1X5` AS DECIMAL(4,0))) / SUM(`420001X1X5` IN ('1','2','3','4','5')), 1) AS q5_avg,
  ROUND(SUM(CAST(`420001X1X6` AS DECIMAL(4,0))) / SUM(`420001X1X6` IN ('1','2','3','4','5')), 1) AS q6_avg,
  SUM(`420001X1X7` IN ('9','10'))                                  AS promoters,
  SUM(`420001X1X7` IN ('0','1','2','3','4','5','6'))               AS detractors,
  ROUND((SUM(`420001X1X7` IN ('9','10')) - SUM(`420001X1X7` IN ('0','1','2','3','4','5','6'))) * 100
        / SUM(`420001X1X7` IN ('0','1','2','3','4','5','6','7','8','9','10')))                     AS nps
FROM lime_survey_420001
WHERE submitdate IS NOT NULL
  AND (@days IS NULL OR submitdate >= NOW() - INTERVAL @days DAY);
SQL
```

Notes: column names are for survey 420001 as verified (research table); the job resolves them by question code. Only the seven score columns, `startlanguage` and `submitdate` are referenced; never the comment columns. With every Q1–Q6 answer in `'1'…'5'` (mandatory questions), `SUM(CAST(...))` over all completed rows equals the job's sum. If an out-of-range value ever exists, the job ignores it and the check's `*_n` columns show the difference.

## 5. Producer CLI (`scripts/build-dashboard.py`)

```
python3 scripts/build-dashboard.py [--watch] [--interval SECONDS] [--out PATH] [--survey-id ID]
```

| Option | Default | Meaning |
|---|---|---|
| (none) | | One cycle, then exit |
| `--watch` | off | Repeat every `--interval` s until Ctrl-C (exit 0 on SIGINT) |
| `--interval` | `10` | Seconds between cycle starts (min 2) |
| `--out` | `app/data/dashboard.json` | Output path, relative to the repo root |
| `--survey-id` | `420001` | Survey whose response table is read |

Behaviour:

- Runs from any working directory (resolves the repo root from its own path); requires `docker` and a running `db` service.
- Database access only through `docker compose exec -T db mariadb` with `SET SESSION TRANSACTION READ ONLY` and `SELECT` statements (research R-08). Never writes to the database.
- Writes atomically (temp file in the same folder, `os.replace`).
- stdout, one line per successful cycle: `dashboard: all=<n> 30d=<n> 7d=<n> at <generatedAt>`. Nothing else.
- stderr, one line per failed cycle: `dashboard: cycle failed: <ErrorClass>: <short reason>`. Never SQL output, row values or comment text.
- Exit codes (one-shot): `0` written; `1` database/Docker error; `2` survey or a required question code not found; `3` output not writable. In `--watch`, failures do not exit; the last good file is kept.
