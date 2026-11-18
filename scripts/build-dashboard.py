#!/usr/bin/env python3
"""Host-side dashboard refresh for the hotel demo (demo PRD D-05).

Reads LimeSurvey's response table through `docker compose exec db mariadb`, inside a read-only
transaction, and writes an aggregates-only snapshot to app/data/dashboard.json (atomic replace).
The comment questions are never selected. Python 3 standard library only.

  python3 scripts/build-dashboard.py [--watch] [--interval SECONDS] [--out PATH] [--survey-id ID]

Exit codes (one-shot): 0 written, 1 database/Docker error, 2 survey or question not found,
3 output not writable. In --watch mode failures are reported on stderr and the last good file is kept;
SIGINT exits 0.
"""
import argparse
import json
import os
import re
import signal
import subprocess
import sys
import time
from decimal import ROUND_HALF_UP, Decimal

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir))
DEFAULT_OUT = os.path.join('app', 'data', 'dashboard.json')
DEFAULT_SURVEY = 420001
DEFAULT_INTERVAL = 10
MIN_INTERVAL = 2

# Category order and keys are fixed (dashboard-data.md §2). Only these question codes are read.
CATEGORIES = [
    ('overall', 'Q1OVERALL'),
    ('cleanliness', 'Q2CLEAN'),
    ('comfort', 'Q3COMFORT'),
    ('staff', 'Q4STAFF'),
    ('breakfast', 'Q5BREAKFAST'),
    ('facilities', 'Q6FACILITIES'),
]
RECOMMEND = 'Q7RECOMMEND'
DEPT_QUESTION = 'QDEPT'
DEPARTMENTS = ['restaurant', 'reception', 'facilities', 'housekeeping']
CODES = [code for _, code in CATEGORIES] + [RECOMMEND, DEPT_QUESTION]
RANGES = [('7d', 7), ('30d', 30), ('all', None)]
SCORE_VALUES = ("'1','2','3','4','5'")
NPS_VALUES = ("'0','1','2','3','4','5','6','7','8','9','10'")
COLUMN_RE = re.compile(r'^[0-9]+X[0-9]+X[0-9]+$')
NOW_RE = re.compile(r'^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$')
RANGE_VALUE_COUNT = 19  # total, en, fa, (n, sum) x 6, q7 n, promoters, passives, detractors


class DatabaseError(Exception):
    """Docker or the database failed. Carries no SQL output or row values."""


class QuestionNotFound(Exception):
    """The survey or one of the seven question codes is missing."""


class BadQuestionColumn(Exception):
    """A question resolved to a column name that is not {sid}X{gid}X{qid}."""


class OutputError(Exception):
    """The snapshot could not be written."""


EXIT_CODES = {DatabaseError: 1, QuestionNotFound: 2, BadQuestionColumn: 2, OutputError: 3}
REASONS = {
    DatabaseError: 'database query failed',
    QuestionNotFound: 'survey or question code not found',
    BadQuestionColumn: 'question column name is not valid',
    OutputError: 'output file is not writable',
}


# ---------------------------------------------------------------- arithmetic

def round_half_up(value, places):
    """Round half away from zero (dashboard-data.md §2)."""
    quantum = Decimal(1).scaleb(-places)
    return Decimal(value).quantize(quantum, rounding=ROUND_HALF_UP)


def average(total, n):
    if not n:
        return None
    return float(round_half_up(Decimal(total) / Decimal(n), 1))


def nps_score(n, promoters, detractors):
    if not n:
        return None
    return int(round_half_up(Decimal((promoters - detractors) * 100) / Decimal(n), 0))


# ---------------------------------------------------------------- shaping

def _int_or_none(text):
    if text is None or text == 'NULL':
        return None
    return int(text)


def shape_range(values):
    """values: the 19 SQL values of one range (see RANGE_VALUE_COUNT). Returns the range object."""
    if len(values) != RANGE_VALUE_COUNT:
        raise DatabaseError('unexpected aggregate row shape')
    v = [_int_or_none(x) or 0 for x in values]
    total, en, fa = v[0], v[1], v[2]
    categories = []
    for i, (key, code) in enumerate(CATEGORIES):
        n = v[3 + 2 * i]
        total_sum = v[4 + 2 * i]
        categories.append({'key': key, 'code': code, 'n': n, 'sum': total_sum, 'avg': average(total_sum, n)})
    q7n, promoters, passives, detractors = v[15], v[16], v[17], v[18]
    return {
        'total': total,
        'languages': {'en': en, 'fa': fa, 'other': total - en - fa},
        'categories': categories,
        'nps': {
            'n': q7n,
            'promoters': promoters,
            'passives': passives,
            'detractors': detractors,
            'score': nps_score(q7n, promoters, detractors),
        },
    }


def shape_range_map(rows_by_label):
    return {label: shape_range(rows_by_label[label]) for label, _ in RANGES}


def build_snapshot(ranges, by_department, survey_id, generated_at):
    doc = {
        'schemaVersion': 2,
        'generatedAt': generated_at,
        'surveyId': survey_id,
        'ranges': {label: ranges[label] for label, _ in RANGES},
        'byDepartment': {dept: {label: by_department[dept][label] for label, _ in RANGES} for dept in DEPARTMENTS},
    }
    validate_snapshot(doc)
    return doc


def validate_snapshot(doc):
    """Allow-list validation of the published shape (dashboard.schema.json). Raises ValueError."""
    def need(cond, what):
        if not cond:
            raise ValueError(what)

    def count(x):
        return isinstance(x, int) and not isinstance(x, bool) and x >= 0

    need(set(doc) == {'schemaVersion', 'generatedAt', 'surveyId', 'ranges', 'byDepartment'}, 'top keys')
    need(doc['schemaVersion'] == 2, 'schemaVersion')
    need(re.match(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$', doc['generatedAt']) is not None, 'generatedAt')
    need(set(doc['ranges']) == {'7d', '30d', 'all'}, 'range keys')
    need(set(doc['byDepartment']) == set(DEPARTMENTS), 'byDepartment keys')

    def check_range_map(r_map, prefix):
        need(set(r_map) == {'7d', '30d', 'all'}, prefix + ' range keys')
        for label, r in r_map.items():
            need(set(r) == {'total', 'languages', 'categories', 'nps'}, prefix + ' keys ' + label)
            need(count(r['total']), 'total')
            need(set(r['languages']) == {'en', 'fa', 'other'}, 'language keys')
            need(all(count(x) for x in r['languages'].values()), 'language counts')
            need(sum(r['languages'].values()) == r['total'], 'languages sum to total')
            need(len(r['categories']) == 6, 'six categories')
            for c, (key, code) in zip(r['categories'], CATEGORIES):
                need(set(c) == {'key', 'code', 'n', 'sum', 'avg'}, 'category keys')
                need(c['key'] == key and c['code'] == code, 'category order')
                need(count(c['n']) and count(c['sum']), 'category counts')
                need(c['avg'] is None or 1 <= c['avg'] <= 5, 'avg range')
            nps = r['nps']
            need(set(nps) == {'n', 'promoters', 'passives', 'detractors', 'score'}, 'nps keys')
            need(nps['promoters'] + nps['passives'] + nps['detractors'] == nps['n'], 'nps parts sum to n')
            need(nps['score'] is None or -100 <= nps['score'] <= 100, 'nps score range')

    check_range_map(doc['ranges'], 'ranges')
    for dept in DEPARTMENTS:
        check_range_map(doc['byDepartment'][dept], 'byDepartment.' + dept)


# ---------------------------------------------------------------- SQL

def _count_expr(col):
    return ("COALESCE(SUM(`%s` IN (%s)), 0)" % (col, SCORE_VALUES),
            "COALESCE(SUM(CASE WHEN `%s` IN (%s) THEN CAST(`%s` AS UNSIGNED) ELSE 0 END), 0)"
            % (col, SCORE_VALUES, col))


def now_sql():
    return 'SELECT NOW();'


def questions_sql(survey_id):
    titles = ",".join("'%s'" % code for code in CODES)
    return ("SELECT title, sid, gid, qid FROM lime_questions "
            "WHERE sid = %d AND parent_qid = 0 AND title IN (%s);" % (survey_id, titles))


def _score_exprs(score_cols, rec):
    exprs = []
    for col in score_cols:
        exprs.extend(_count_expr(col) if col else ("0", "0"))
    if rec:
        exprs.extend([
            "COALESCE(SUM(`%s` IN (%s)), 0)" % (rec, NPS_VALUES),
            "COALESCE(SUM(`%s` IN ('9','10')), 0)" % rec,
            "COALESCE(SUM(`%s` IN ('7','8')), 0)" % rec,
            "COALESCE(SUM(`%s` IN ('0','1','2','3','4','5','6')), 0)" % rec,
        ])
    else:
        exprs.extend(["0", "0", "0", "0"])
    return exprs


def ranges_sql(now, survey_id, columns):
    lines = ["SET @now = CAST('%s' AS DATETIME);" % now]
    score_cols = columns[:6]
    rec = columns[6]
    dept_col = columns[7]
    for _, days in RANGES:
        exprs = ["COUNT(*)",
                 "COALESCE(SUM(startlanguage = 'en'), 0)",
                 "COALESCE(SUM(startlanguage = 'fa'), 0)"]
        exprs.extend(_score_exprs(score_cols, rec))
        where = "submitdate IS NOT NULL"
        if days is not None:
            where += " AND submitdate >= @now - INTERVAL %d DAY" % days
        lines.append("SELECT %s FROM lime_survey_%d WHERE %s;" % (", ".join(exprs), survey_id, where))

    for dept in DEPARTMENTS:
        for _, days in RANGES:
            exprs = ["COUNT(*)",
                     "COALESCE(SUM(startlanguage = 'en'), 0)",
                     "COALESCE(SUM(startlanguage = 'fa'), 0)"]
            exprs.extend(_score_exprs(score_cols, rec))
            where = "submitdate IS NOT NULL"
            if days is not None:
                where += " AND submitdate >= @now - INTERVAL %d DAY" % days
            dept_prefix = dept[:5]
            where += " AND (`%s` = '%s' OR `%s` = '%s')" % (dept_col, dept, dept_col, dept_prefix)
            lines.append("SELECT %s FROM lime_survey_%d WHERE %s;" % (", ".join(exprs), survey_id, where))

    return "\n".join(lines)


def resolve_columns(rows, survey_id):
    """rows: [title, sid, gid, qid] per question.

    Returns eight slots: Q1–Q6, Q7, QDEPT. Score columns may be None after the
    two-step survey (department + comment only). QDEPT is required.
    """
    found = {}
    for title, sid, gid, qid in rows:
        if title not in CODES:
            continue
        if int(sid) != survey_id:
            continue
        col = '%dX%sX%s' % (survey_id, gid, qid)
        if not COLUMN_RE.match(col):
            raise BadQuestionColumn(title)
        found[title] = col
    if DEPT_QUESTION not in found:
        raise QuestionNotFound(DEPT_QUESTION)
    return [found.get(code) for code in CODES]


# ---------------------------------------------------------------- DB access

def docker_sql(script):
    """Runs one read-only script in a fresh session. Returns stdout. Never returns or prints stderr."""
    wrapped = "SET SESSION TRANSACTION READ ONLY;\nSTART TRANSACTION READ ONLY;\n" + script + "\nROLLBACK;\n"
    cmd = ['docker', 'compose', 'exec', '-T', 'db', 'sh', '-c',
           'MYSQL_PWD="$MARIADB_PASSWORD" exec mariadb -u "$MARIADB_USER" "$MARIADB_DATABASE" '
           '--batch --skip-column-names']
    try:
        proc = subprocess.run(cmd, input=wrapped, capture_output=True, text=True, cwd=REPO_ROOT, timeout=60)
    except (OSError, subprocess.TimeoutExpired):
        raise DatabaseError('docker is not available or timed out')
    if proc.returncode != 0:
        raise DatabaseError('database query failed')
    return proc.stdout


# ---------------------------------------------------------------- cycle

def atomic_write(path, text):
    tmp = path + '.tmp'
    try:
        with open(tmp, 'w', encoding='utf-8') as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except OSError:
        try:
            if os.path.exists(tmp):
                os.remove(tmp)
        except OSError:
            pass
        raise OutputError(path)


def run_cycle(run_sql, survey_id, out_path):
    """One refresh: read NOW, resolve columns, read ranges and departments, validate, write. Returns snapshot."""
    now_lines = [line for line in run_sql(now_sql()).splitlines() if line.strip()]
    if not now_lines or not NOW_RE.match(now_lines[0].strip()):
        raise DatabaseError('clock value not readable')
    now = now_lines[0].strip()

    rows = [line.split('\t') for line in run_sql(questions_sql(survey_id)).splitlines() if line.strip()]
    columns = resolve_columns(rows, survey_id)

    out_lines = [line for line in run_sql(ranges_sql(now, survey_id, columns)).splitlines() if line.strip()]
    expected_count = len(RANGES) * (1 + len(DEPARTMENTS))
    if len(out_lines) != expected_count:
        raise DatabaseError('unexpected aggregate result count')

    idx = 0
    values = {}
    for label, _ in RANGES:
        values[label] = out_lines[idx].split('\t')
        idx += 1
    ranges = shape_range_map(values)

    by_dept = {}
    for dept in DEPARTMENTS:
        dept_values = {}
        for label, _ in RANGES:
            dept_values[label] = out_lines[idx].split('\t')
            idx += 1
        by_dept[dept] = shape_range_map(dept_values)

    generated_at = now.replace(' ', 'T') + 'Z'
    doc = build_snapshot(ranges, by_dept, survey_id, generated_at)
    atomic_write(out_path, json.dumps(doc, ensure_ascii=False, indent=2, sort_keys=False) + '\n')
    return doc


def run_once(run_sql, survey_id, out_path, out, err):
    """One cycle with the documented stdout and stderr lines. Returns the exit code."""
    try:
        doc = run_cycle(run_sql, survey_id, out_path)
    except Exception as exc:  # noqa: BLE001 - only the class name and a fixed reason are reported
        code = EXIT_CODES.get(type(exc), 1)
        reason = REASONS.get(type(exc), 'unexpected error')
        print('dashboard: cycle failed: %s: %s' % (type(exc).__name__, reason), file=err)
        return code
    r = doc['ranges']
    print('dashboard: all=%d 30d=%d 7d=%d at %s' % (
        r['all']['total'], r['30d']['total'], r['7d']['total'], doc['generatedAt']), file=out)
    return 0


def parse_args(argv):
    p = argparse.ArgumentParser(description='Refresh app/data/dashboard.json from the survey responses (read-only).')
    p.add_argument('--watch', action='store_true', help='repeat every --interval seconds until Ctrl-C')
    p.add_argument('--interval', type=int, default=DEFAULT_INTERVAL, help='seconds between cycle starts (min 2)')
    p.add_argument('--out', default=DEFAULT_OUT, help='output path, relative to the repository root')
    p.add_argument('--survey-id', type=int, default=DEFAULT_SURVEY, help='survey whose responses are read')
    args = p.parse_args(argv)
    if args.interval < MIN_INTERVAL:
        p.error('--interval must be at least %d' % MIN_INTERVAL)
    if args.survey_id < 1:
        p.error('--survey-id must be positive')
    if not os.path.isabs(args.out):
        args.out = os.path.join(REPO_ROOT, args.out)
    return args


def main(argv=None):
    args = parse_args(sys.argv[1:] if argv is None else argv)
    if not args.watch:
        return run_once(docker_sql, args.survey_id, args.out, sys.stdout, sys.stderr)
    try:
        while True:
            run_once(docker_sql, args.survey_id, args.out, sys.stdout, sys.stderr)
            sys.stdout.flush()
            sys.stderr.flush()
            time.sleep(args.interval)
    except KeyboardInterrupt:
        return 0


if __name__ == '__main__':
    signal.signal(signal.SIGINT, signal.default_int_handler)
    sys.exit(main())
