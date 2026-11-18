# Quickstart: Department Feedback Inbox and Guest Stories

Validation/run guide for spec `003-department-feedback-inbox`. Implementation details live in `plan.md` and (later) `tasks.md`. Do not paste guest comment text into notes or evidence.

## Prerequisites

- Stack from spec 002: `docker compose up -d`, `.env` present, survey `420001` active, theme Reset after theme file changes, `python3 scripts/build-dashboard.py --watch` if you need live dashboard numbers.
- This worktree’s bind mounts: run compose from `department-feedback-inbox` so `app/` and the theme are this branch.
- Playwright harness in `scratch/tester/` (git-ignored), same as spec 002.

## One-time data setup

1. Apply the custom table (existing volumes skip `db/init` on boot):

   ```bash
   docker compose exec -T db sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" mariadb -u "$MARIADB_USER" "$MARIADB_DATABASE"' < db/init/002_hotel_feedback_queue.sql
   ```

2. Add `QDEPT` to the **active** survey `420001` with the codes in [contracts/department-question.md](./contracts/department-question.md). Prefer LimeSurvey’s add-question-on-active-survey path. **Do not deactivate** the survey to edit (that can wipe responses). Confirm with a read-only `SELECT title FROM lime_questions WHERE sid=420001 AND title='QDEPT';`.

3. Optional live Bale: set `BALE_BOT_TOKEN` and `BALE_CHAT_ID` in `.env`, recreate the `limesurvey` service. Leave empty to skip sends.

4. Theme **Reset** in LimeSurvey after `config.xml` / CSS / JS / Twig changes.

## Commands

```bash
./scripts/validate.sh
python3 -m unittest discover -s scripts/tests
python3 scripts/seed-demo.py --count 8   # mixed departments
python3 scripts/build-dashboard.py       # schemaVersion 2
```

PHP lint (container):

```bash
docker compose exec limesurvey php -l /var/www/html/app/api/inbox.php
docker compose exec limesurvey php -l /var/www/html/app/api/stories.php
```

## Human walkthrough (SC-010)

Use a phone-width window (390px). Persian first, then English.

1. Open `http://hotelsurvey.localhost/app/index.html`. Home shows a **static** stories teaser (no guest quotes).
2. Tap Rate. After welcome/Start, pick **خانه‌داری**. Complete Q1–Q7; fill both comment boxes with **synthetic** text; submit. Thank-you still offers Home and Nearby only.
3. If Bale is configured, the manager chat shows department and scores and **does not** show the comment bodies. If not configured, completion still succeeds.
4. Tap the bell → inbox. New unread row: stripe, department, scores, time — no comment on the row. Open it; comments visible. Tap **انتشار**.
5. Tab **داستان‌ها** (and drawer item, and Home teaser): one anonymous card, both excerpts, no ids.
6. Dashboard: All vs Housekeeping chips; comments still absent on the dashboard (privacy line remains).
7. Second submission → **خصوصی بماند**: not on the wall. Publish then unpublish: card disappears; Publish is gone.

Empty checks: inbox with no rows; stories with nothing published; inbox filter that matches nothing.

## Contract checks (no comment dump)

- `GET /app/api/inbox.php` — items match [inbox-list.schema.json](./contracts/inbox-list.schema.json) (no praise/complaint keys).
- `GET /app/api/inbox.php?id=…` — [inbox-detail.schema.json](./contracts/inbox-detail.schema.json).
- `GET /app/api/stories.php` — [stories.schema.json](./contracts/stories.schema.json); no `id` fields.
- `app/data/dashboard.json` — [dashboard.schema.json](./contracts/dashboard.schema.json) v2; `grep` for the synthetic comment string is 0.
- Manual SQL for dashboard slices: same windows as spec 002, plus `AND <QDEPT column> = 'housekeeping'` for a department chip ([data-model.md](./data-model.md) §7).

## Resume / Back

Leave after choosing a department and answering Q1; tap Rate again — resume, no second department prompt, language locked. Back from Q1 returns to the four cards.

## Evidence

Save under `specs/003-department-feedback-inbox/evidence/`. Screenshots of list/detail/wall are fine; if a screenshot shows a comment, use only synthetic seed text and do not copy that text into chat or tickets (`AGENTS.md`).
