# Evidence: 002-hotel-demo-app (tester attempt 1, FLOW_ID flow_20261104T124715_e076fa)

| Acceptance criterion | Flow name | Command | Exit code | Artifact path(s) | Commit SHA |
|---|---|---|---|---|---|
| Scaffold validation passes (TF-S1 baseline) | TF-S1 | `./scripts/validate.sh` | 0 | specs/002-hotel-demo-app/evidence/run/validate.txt | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Injected violations each fail validate; revert passes (TF-S1) | TF-S1 | `bash scratch/tester/tf-s1.sh` | 0 | specs/002-hotel-demo-app/evidence/run/tf-s1.txt | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Dashboard unit tests, 22 tests OK (TF-U01 to TF-U08) | TF-U | `python3 -m unittest discover -s scripts/tests -v` | 0 | specs/002-hotel-demo-app/evidence/run/unit.txt | 037004260e23ae582e664d40ea883e1108ff36c0 |
| One-shot job: one stdout line, schema ok (TF-D1) | TF-D1 | `bash scratch/tester/tf-d1-oneshot.sh` | 0 | specs/002-hotel-demo-app/evidence/run/d1.txt | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Dashboard aggregates equal manual SQL for 7d/30d/all (TF-D2) and file privacy (TF-D3) | TF-D2, TF-D3 | `node scratch/tester/tf-d2.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/d2.txt, specs/002-hotel-demo-app/evidence/TF-D2.json, specs/002-hotel-demo-app/evidence/TF-D3.json, specs/002-hotel-demo-app/evidence/TF-D2-sql-7d.txt, specs/002-hotel-demo-app/evidence/TF-D2-sql-30d.txt, specs/002-hotel-demo-app/evidence/TF-D2-sql-all.txt, specs/002-hotel-demo-app/evidence/TF-D3.txt | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Watch log formats, no comment text, SIGINT exit 0 (TF-D4) | TF-D4 | `python3 scratch/tester/tf_d_runner.py d4` | 0 | specs/002-hotel-demo-app/evidence/run/d4.txt, specs/002-hotel-demo-app/evidence/TF-D4.json, specs/002-hotel-demo-app/evidence/TF-D4-watch.log | 037004260e23ae582e664d40ea883e1108ff36c0 |
| DB loss resilience, writes resume (TF-D5) | TF-D5 | `python3 scratch/tester/tf_d_runner.py d5` | 0 | specs/002-hotel-demo-app/evidence/run/d5.txt, specs/002-hotel-demo-app/evidence/TF-D5.json, specs/002-hotel-demo-app/evidence/TF-D5-watch.log | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Seeded 40 responses via public form still present and varied (TF-D6) | TF-D6 | `node scratch/tester/tf-d6.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/d6.txt, specs/002-hotel-demo-app/evidence/TF-D6.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Read-only: no write-class Com_* counter changes (TF-D7) | TF-D7 | `python3 scratch/tester/tf_d_runner.py d7` | 0 | specs/002-hotel-demo-app/evidence/run/d7.txt, specs/002-hotel-demo-app/evidence/TF-D7.json, specs/002-hotel-demo-app/evidence/TF-D7-status-before.txt, specs/002-hotel-demo-app/evidence/TF-D7-status-after.txt | 037004260e23ae582e664d40ea883e1108ff36c0 |
| R2 pjax bypass for app links from survey pages | R2 | `node scratch/tester/r2-pjax.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/r2.txt, specs/002-hotel-demo-app/evidence/R2-verify.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Shell layout 320-1280, bars, centred column | TF-E01 | `node scratch/tester/tf-e01-shell-layout.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e01-shell-layout.txt, specs/002-hotel-demo-app/evidence/TF-E01.json, specs/002-hotel-demo-app/evidence/TF-E01-en-1280.png, specs/002-hotel-demo-app/evidence/TF-E01-en-390.png, specs/002-hotel-demo-app/evidence/TF-E01-fa-1280.png | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Drawer open/close, side per language | TF-E02 | `node scratch/tester/tf-e02-drawer.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e02-drawer.txt, specs/002-hotel-demo-app/evidence/TF-E02.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Tabs and drawer navigation, Services toast | TF-E03 | `node scratch/tester/tf-e03-navigation.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e03-navigation.txt, specs/002-hotel-demo-app/evidence/TF-E03.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Mock controls toast | TF-E04 | `node scratch/tester/tf-e04-toast.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e04-toast.txt, specs/002-hotel-demo-app/evidence/TF-E04.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Home greeting, highlights, See all | TF-E05 | `node scratch/tester/tf-e05-home.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e05-home.txt, specs/002-hotel-demo-app/evidence/TF-E05.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Home to Rate in Persian handover | TF-E06 | `node scratch/tester/tf-e06-handover.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e06-handover.txt, specs/002-hotel-demo-app/evidence/TF-E06.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Required question validation, no Back on Q1 | TF-E07 | `node scratch/tester/tf-e07-required.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e07-required.txt, specs/002-hotel-demo-app/evidence/TF-E07.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Complete survey, thank-you, one completed row | TF-E08 | `node scratch/tester/tf-e08-submit.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e08-submit.txt, specs/002-hotel-demo-app/evidence/TF-E08.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Locked language switch mid-survey | TF-E09 | `node scratch/tester/tf-e09-locked.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e09-locked.txt, specs/002-hotel-demo-app/evidence/TF-E09.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Nearby list, 21 places, order | TF-E10 | `node scratch/tester/tf-e10-list.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e10-list.txt, specs/002-hotel-demo-app/evidence/TF-E10.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Nearby search as you type | TF-E11 | `node scratch/tester/tf-e11-search.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e11-search.txt, specs/002-hotel-demo-app/evidence/TF-E11.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Nearby category, Open now, sort combined | TF-E12 | `node scratch/tester/tf-e12-filters.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e12-filters.txt, specs/002-hotel-demo-app/evidence/TF-E12.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Detail sheet | TF-E13 | `node scratch/tester/tf-e13-sheet.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e13-sheet.txt, specs/002-hotel-demo-app/evidence/TF-E13.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Empty state and Clear filters | TF-E14 | `node scratch/tester/tf-e14-empty.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e14-empty.txt, specs/002-hotel-demo-app/evidence/TF-E14.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Network: same-origin requests only | TF-E15 | `node scratch/tester/tf-e15-network.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e15-network.txt, specs/002-hotel-demo-app/evidence/TF-E15.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Session resume language | TF-E16 | `node scratch/tester/tf-e16-resume.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e16-resume.txt, specs/002-hotel-demo-app/evidence/TF-E16-result.json, specs/002-hotel-demo-app/evidence/TF-E16.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Cookie clear fresh welcome | TF-E17 | `node scratch/tester/tf-e17-expiry.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e17-expiry.txt, specs/002-hotel-demo-app/evidence/TF-E17.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Welcome language switch | TF-E18 | `node scratch/tester/tf-e18-welcome-switch.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e18-welcome-switch.txt, specs/002-hotel-demo-app/evidence/TF-E18.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Thank-you language switch | TF-E19 | `node scratch/tester/tf-e19-thankyou-switch.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e19-thankyou-switch.txt, specs/002-hotel-demo-app/evidence/TF-E19.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Width matrix 320-1280, en/fa, no h-scroll, 48 px targets (60 checks) | TF-E20 | `node scratch/tester/tf-e20-matrix.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e20-matrix.txt, specs/002-hotel-demo-app/evidence/TF-E20.json, specs/002-hotel-demo-app/evidence/TF-E20-dashboard-en-320.png, specs/002-hotel-demo-app/evidence/TF-E20-dashboard-en-390.png, specs/002-hotel-demo-app/evidence/TF-E20-dashboard-fa-320.png | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Persian strings, RTL, digits; English clean | TF-E21 | `node scratch/tester/tf-e21-strings.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e21-strings.txt, specs/002-hotel-demo-app/evidence/TF-E21.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Dashboard figures equal dashboard.json | TF-E22 | `node scratch/tester/tf-e22-dashboard.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e22-dashboard.txt, specs/002-hotel-demo-app/evidence/TF-E22.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Dashboard states (zero, low, stale, unavailable) | TF-E23 | `node scratch/tester/tf-e23-dashboard-states.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e23-dashboard-states.txt, specs/002-hotel-demo-app/evidence/TF-E23.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Live refresh, 10 of 10 within 15 s (max 10.6 s) | TF-E24 | `node scratch/tester/tf-e24-live.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e24-live.txt, specs/002-hotel-demo-app/evidence/TF-E24-timings.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Reduced motion | TF-E25 | `node scratch/tester/tf-e25-motion.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e25-motion.txt, specs/002-hotel-demo-app/evidence/TF-E25.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| Demo day at 390 px with --watch | TF-E26 | `node scratch/tester/tf-e26-demo-day.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e26-demo-day.txt, specs/002-hotel-demo-app/evidence/TF-E26.json | 037004260e23ae582e664d40ea883e1108ff36c0 |
| App vs prototype visual and string checklist | TF-E27 | `node scratch/tester/tf-e27-visual.cjs` | 0 | specs/002-hotel-demo-app/evidence/run/tf-e27-visual.txt, specs/002-hotel-demo-app/evidence/TF-E27-checklist.json, specs/002-hotel-demo-app/evidence/TF-E27.json, specs/002-hotel-demo-app/evidence/TF-E27-dash-en-app.png, specs/002-hotel-demo-app/evidence/TF-E27-dash-en-proto.png | 037004260e23ae582e664d40ea883e1108ff36c0 |
| C3: no page-level horizontal overflow at 360 px (documentElement and body scrollWidth <= clientWidth) on Home, Nearby, sheet, Dashboard, survey welcome/Q1/Q7/thank-you, en and fa (16 checks) | TF-C3 | `TF_C3_SUBMIT=1 node scratch/tester/tf-c3-overflow.cjs` | 0 | specs/002-hotel-demo-app/evidence/TF-C3.json | 037004260e23ae582e664d40ea883e1108ff36c0 |

## Verdict: PASS

All executed flows exited 0: validate.sh, 22 unit tests, TF-S1, TF-D1 to TF-D7, TF-E01 to TF-E27, R2, and the C3 overflow check.

## PRD section 6 acceptance

All nine items PASS: bars and drawer at 360-430 px (TF-E01, E02, E20, C3); five tabs and toasts (E03, E04); Home to Rate, validation, thank-you (E06, E07, E08); Nearby search, filters, sheet, empty state (E10 to E14); Dashboard equals manual SQL, ranges, low-sample note (E22, E23, D2, D3); live refresh within 15 s (E24: 10 of 10, E26); English and Persian with RTL drawer (E21, E02); no horizontal scroll at 320 px, 48 px targets, validate passes (E20, S1); centred column on desktop (E01).

## Critic suggestions

- C1: `app/js/dashboard.js` header comment still says "Polls every 5 s" while `POLL_MS = 3000`. Comment-only, non-blocking.
- C2: `scripts/seed-demo.py` checks the host before the first request only, not after a redirect. Localhost-only dev tool, non-blocking.
- C3: verified, no page-level overflow at 360 px (TF-C3, 16 of 16). Closed drawer, sheet and toast sit outside the layout and are excluded from the element scan; scrollWidth equals clientWidth (360) on every screen.

## Privacy

Published `dashboard.json` has no comment text (TF-D3, 0 matches of a synthetic comment; schema walk ok). Watch logs hold no comment text (TF-D4, 0 matches). The job selects no comment columns, DB access is read-only (TF-D7).

## Pending UAT

T084 (manual Chrome walkthrough) is for human UAT. It is pending, not a failure.

## Accepted deviations and notes

- D-1 to D-4 as listed in the prior evidence and plan: base survey language is `en` with `fa` additional (Persian path redirects once to `?lang=fa`); dashboard page polls every 3 s (supersedes the 5 s in plan.md and the ~10 s in spec A-04; SC-006 still met); job uses three read-only `docker compose exec` sessions per cycle; Persian copy is proposed pending review (R11).
- TF-D1 empty-table branch skipped live (table not empty, 193+ rows); the shared database is never emptied. Covered by the stub unit test TF_D1_EmptyTable.
- Test runs added rows to the shared `lime_survey_420001` table (including 2 completed rows from the C3 thank-you check). Nothing was deleted. The operator may wish to reset demo data before a demo.
- Harness scripts are in `scratch/tester/` (git-ignored). Application code and tasks.md were not modified.
