#!/usr/bin/env python3
"""Submit a few demo guest comments through the public survey and publish them.

Stories on the wall come from published queue rows joined to Q8/Q9. This does not
write comments into hotel_feedback_queue. Localhost only (same rule as seed-demo).

  python3 scripts/seed-stories.py
  python3 scripts/seed-stories.py --base-url http://127.0.0.1:8090
"""
import importlib.util
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SID = 420001

STORIES = [
    {
        "lang": "en",
        "dept": "restaurant",
        "q": [5, 5, 4, 5, 5, 4, 10],
        "comments": [
            "Breakfast on the terrace was the best part of the trip. The tea never went cold.",
            "",
        ],
    },
    {
        "lang": "en",
        "dept": "reception",
        "q": [5, 4, 4, 5, 4, 4, 9],
        "comments": [
            "They found us a quiet room after a late arrival without making a fuss.",
            "",
        ],
    },
    {
        "lang": "en",
        "dept": "facilities",
        "q": [4, 4, 4, 4, 3, 5, 8],
        "comments": [
            "The courtyard at dusk is worth sitting in for an hour.",
            "Parking was tight on Friday night.",
        ],
    },
    {
        "lang": "en",
        "dept": "housekeeping",
        "q": [5, 5, 5, 4, 4, 4, 9],
        "comments": [
            "The room smelled clean. Towels were swapped twice without asking.",
            "",
        ],
    },
    {
        "lang": "fa",
        "dept": "restaurant",
        "q": [5, 4, 4, 5, 5, 4, 9],
        "comments": [
            "قورمه\u200cسبزی داغ و جاافتاده بود؛ همان طعمی که دنبالش بودیم.",
            "",
        ],
    },
    {
        "lang": "fa",
        "dept": "reception",
        "q": [4, 4, 4, 5, 4, 3, 8],
        "comments": [
            "پذیرش با حوصله مسیر باغ را روی نقشه نشان داد.",
            "",
        ],
    },
    {
        "lang": "fa",
        "dept": "housekeeping",
        "q": [4, 5, 4, 4, 4, 4, 8],
        "comments": [
            "اتاق مرتب بود.",
            "شیر حمام کمی چکه می\u200cکرد.",
        ],
    },
    {
        "lang": "fa",
        "dept": "facilities",
        "q": [5, 4, 4, 4, 4, 5, 9],
        "comments": [
            "استخر خلوت بود و عصرها نور حیاط خیلی قشنگ می\u200cشد.",
            "",
        ],
    },
]


def load_seed_demo():
    path = os.path.join(ROOT, "scripts", "seed-demo.py")
    spec = importlib.util.spec_from_file_location("hotel_seed_demo", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def sql(query):
    cmd = [
        "docker", "compose", "exec", "-T", "db", "sh", "-c",
        'MYSQL_PWD="$MARIADB_PASSWORD" mariadb -N -u "$MARIADB_USER" "$MARIADB_DATABASE"',
    ]
    run = subprocess.run(cmd, input=query.encode(), check=True, cwd=ROOT, capture_output=True)
    return run.stdout.decode()


def last_response_id():
    raw = sql("SELECT COALESCE(MAX(id),0) FROM lime_survey_%d;" % SID).strip()
    return int(raw or 0)


def publish(response_id, item):
    sql(
        "INSERT INTO hotel_feedback_queue "
        "(survey_id, response_id, department, overall, nps, submitted_at, state, decided_at) "
        "SELECT %d, id, '%s', NULL, NULL, submitdate, 'published', NOW() "
        "FROM lime_survey_%d WHERE id=%d "
        "ON DUPLICATE KEY UPDATE state='published', decided_at=NOW(), "
        "department=VALUES(department);"
        % (SID, item["dept"], SID, response_id)
    )


def main():
    seed = load_seed_demo()
    base = "http://127.0.0.1:8090"
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == "--base-url" and i < len(sys.argv) - 1:
            base = sys.argv[i + 1].rstrip("/")
    if not seed.host_allowed(base):
        print("seed-stories: refused host (localhost only)", file=sys.stderr)
        return 2
    published = 0
    for i, item in enumerate(STORIES, 1):
        before = last_response_id()
        try:
            seed.submit_one(base, SID, item, i)
        except seed.SeedStepError as exc:
            print("seed-stories: story %d failed at %s" % (i, exc.step), file=sys.stderr)
            return 1
        after = last_response_id()
        if after <= before:
            print("seed-stories: story %d submitted but no new response row" % i, file=sys.stderr)
            return 1
        publish(after, item)
        published += 1
        print("seed-stories: published %s [%s] id=%d" % (item["dept"], item["lang"], after), flush=True)
    print("seed-stories: %d stories on the wall" % published)
    return 0


if __name__ == "__main__":
    sys.exit(main())
