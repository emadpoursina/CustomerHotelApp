#!/usr/bin/env python3
"""Wipe survey 420001 and reimport it from the repo .lss (includes QDEPT).

Demo data only. LimeSurvey list-radio codes default to VARCHAR(5), which drops
restaurant/reception/facilities/housekeeping, so this widens lime_answers.code
before import. Run after a database wipe or when Rate skips the department cards.

  python3 scripts/reimport-survey.py --yes
  python3 scripts/reimport-survey.py --answers-only   # QDEPT cards only, no wipe

Needs LS_ADMIN_USER, LS_ADMIN_PASSWORD, and a running compose stack.
"""
import base64
import json
import os
import subprocess
import sys
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LSS = os.path.join(ROOT, "limesurvey", "survey", "hotel-guest-survey.lss")
SID = 420001
RPC_URL = os.environ.get("LS_RPC_URL", "http://127.0.0.1:8090/index.php/admin/remotecontrol")


def load_dotenv():
    path = os.path.join(ROOT, ".env")
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k, v = k.strip(), v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v


def rpc(method, params):
    body = json.dumps({"method": method, "params": params, "id": 1}).encode()
    req = urllib.request.Request(RPC_URL, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        reply = json.loads(resp.read().decode() or "{}")
    if reply.get("error"):
        raise RuntimeError("%s: %s" % (method, reply["error"]))
    return reply.get("result")


def sql(query, capture=False):
    cmd = [
        "docker", "compose", "exec", "-T", "db", "sh", "-c",
        'MYSQL_PWD="$MARIADB_PASSWORD" mariadb -N -u "$MARIADB_USER" "$MARIADB_DATABASE"',
    ]
    run = subprocess.run(cmd, input=query.encode(), check=True, cwd=ROOT, capture_output=capture)
    return run.stdout.decode() if capture else None


def qdept_answers_from_lss():
    """Return [(code, sortorder, {lang: label}), ...] for QDEPT in the repo .lss."""
    root = ET.parse(LSS).getroot()
    qid = None
    for questions in root.iter("questions"):
        for row in questions.findall("rows/row"):
            if (row.findtext("title") or "").strip() == "QDEPT":
                qid = (row.findtext("qid") or "").strip()
                break
    if not qid:
        sys.exit("QDEPT missing from %s" % LSS)
    by_aid = {}
    for answers in root.iter("answers"):
        for row in answers.findall("rows/row"):
            if (row.findtext("qid") or "").strip() != qid:
                continue
            aid = (row.findtext("aid") or "").strip()
            by_aid[aid] = {
                "code": (row.findtext("code") or "").strip(),
                "sortorder": int(row.findtext("sortorder") or 0),
                "labels": {},
            }
    for block in root.iter("answer_l10ns"):
        for row in block.findall("rows/row"):
            aid = (row.findtext("aid") or "").strip()
            if aid in by_aid:
                lang = (row.findtext("language") or "").strip()
                by_aid[aid]["labels"][lang] = row.findtext("answer") or ""
    return sorted(by_aid.values(), key=lambda a: a["sortorder"])


def escape_sql(value):
    return value.replace("\\", "\\\\").replace("'", "''")


def ensure_qdept_answers():
    """Import skips codes longer than 5 even after widening; insert QDEPT answers ourselves."""
    answers = qdept_answers_from_lss()
    qid = sql(
        "SELECT qid FROM lime_questions WHERE sid=%d AND title='QDEPT' AND parent_qid=0 LIMIT 1;" % SID,
        capture=True,
    ).strip()
    if not qid.isdigit():
        sys.exit("QDEPT question missing after import")
    existing = [
        ln.strip()
        for ln in sql("SELECT code FROM lime_answers WHERE qid=%s ORDER BY sortorder;" % qid, capture=True).splitlines()
        if ln.strip()
    ]
    if existing == [a["code"] for a in answers]:
        print("QDEPT codes already present:", ",".join(existing))
        return existing
    parts = [
        "DELETE FROM lime_answer_l10ns WHERE aid IN (SELECT aid FROM lime_answers WHERE qid=%s);" % qid,
        "DELETE FROM lime_answers WHERE qid=%s;" % qid,
    ]
    for a in answers:
        parts.append(
            "INSERT INTO lime_answers (qid, code, sortorder, assessment_value, scale_id) "
            "VALUES (%s, '%s', %d, 0, 0);" % (qid, escape_sql(a["code"]), a["sortorder"])
        )
        parts.append("SET @aid := LAST_INSERT_ID();")
        for lang, label in a["labels"].items():
            parts.append(
                "INSERT INTO lime_answer_l10ns (aid, answer, language) VALUES (@aid, '%s', '%s');"
                % (escape_sql(label), escape_sql(lang))
            )
    sql("\n".join(parts))
    codes = [
        ln.strip()
        for ln in sql("SELECT code FROM lime_answers WHERE qid=%s ORDER BY sortorder;" % qid, capture=True).splitlines()
        if ln.strip()
    ]
    subprocess.run(
        ["docker", "compose", "exec", "-T", "limesurvey", "sh", "-c", "rm -rf /var/www/html/tmp/runtime/cache/*"],
        check=False,
        cwd=ROOT,
    )
    print("QDEPT codes:", ",".join(codes))
    expected = [a["code"] for a in answers]
    if codes != expected:
        sys.exit("QDEPT answers missing or truncated: %s" % codes)
    return codes


def main():
    load_dotenv()
    if "--answers-only" in sys.argv:
        ensure_qdept_answers()
        return 0
    if "--yes" not in sys.argv:
        sys.exit("refusing: this deletes survey 420001. Re-run with --yes")
    user = os.environ.get("LS_ADMIN_USER")
    password = os.environ.get("LS_ADMIN_PASSWORD")
    if not user or not password:
        sys.exit("LS_ADMIN_USER / LS_ADMIN_PASSWORD missing")
    if not os.path.isfile(LSS):
        sys.exit("missing %s" % LSS)

    # ponytail: LimeSurvey stores list-radio codes as VARCHAR(5); QDEPT codes are up to 12.
    sql("ALTER TABLE lime_answers MODIFY code VARCHAR(32) NOT NULL;")
    print("widened lime_answers.code")

    key = rpc("get_session_key", [user, password])
    if not isinstance(key, str) or len(key) < 10:
        sys.exit("login failed")

    try:
        print("delete_survey:", rpc("delete_survey", [key, SID]))
        payload = base64.b64encode(open(LSS, "rb").read()).decode("ascii")
        imported = rpc("import_survey", [key, payload, "lss", None, SID])
        print("import_survey:", imported)
        sid = int(imported) if str(imported).isdigit() else SID
        print("activate_survey:", rpc("activate_survey", [key, sid]))
        print("template:", rpc("set_survey_properties", [key, sid, {"template": "hotel-classic"}]))
        questions = rpc("list_questions", [key, sid])
        titles = sorted({q.get("title") for q in questions if isinstance(q, dict)})
        print("titles:", ",".join(titles))
        if "QDEPT" not in titles:
            sys.exit("QDEPT missing after import")
    finally:
        rpc("release_session_key", [key])

    sql(
        "SET @col := (SELECT CONCAT('`', sid, 'X', gid, 'X', qid, '`') "
        "FROM lime_questions WHERE sid=%d AND title='QDEPT' AND parent_qid=0 LIMIT 1); "
        "SET @sql := CONCAT('ALTER TABLE lime_survey_%d MODIFY ', @col, ' VARCHAR(32) NULL'); "
        "PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;" % (SID, SID)
    )
    print("widened QDEPT response column")
    ensure_qdept_answers()
    return 0


if __name__ == "__main__":
    sys.exit(main())
