"""TF-U01 to TF-U06: build-dashboard.py (demo PRD D-05, contracts/dashboard-data.md, data-model.md §6)."""
import io
import json
import os
import re
import tempfile
import unittest
from decimal import Decimal
from unittest import mock

from _load import load
from schema_walk import validate as schema_validate

bd = load('build-dashboard')
HERE = os.path.dirname(__file__)
FIX = os.path.join(HERE, 'fixtures')


def read_rows(name):
    rows = []
    with open(os.path.join(FIX, name), encoding='utf-8') as f:
        for line in f:
            if line.startswith('#') or not line.strip():
                continue
            rows.append(line.rstrip('\n').split('\t'))
    return rows


def range_values():
    """The ranges.tsv rows (label stripped), keyed by label."""
    out = {}
    for row in read_rows('ranges.tsv'):
        out[row[0]] = row[1:]
    return out


def fake_sql(questions_name='questions.tsv', ranges_fail=False, now='2026-11-04 21:00:00'):
    """Returns run_sql(sql) that answers the job's queries from fixtures (never calls Docker)."""
    ranges = range_values()

    def run_sql(sql):
        if ranges_fail and 'submitdate' in sql:
            raise bd.DatabaseError('synthetic failure')
        if 'lime_questions' in sql:
            return '\n'.join('\t'.join(r) for r in read_rows(questions_name)) + '\n'
        if 'NOW()' in sql and 'submitdate' not in sql:
            return now + '\n'
        lines = [ranges[k] for k in ('7d', '30d', 'all')]
        for _ in bd.DEPARTMENTS:
            lines.extend([ranges[k] for k in ('7d', '30d', 'all')])
        return '\n'.join('\t'.join(v) for v in lines) + '\n'
    return run_sql


class TF_U01_Shape(unittest.TestCase):
    def test_counts_copied_and_avg_half_up(self):
        r = bd.shape_range(range_values()['7d'])
        self.assertEqual(r['total'], 20)
        self.assertEqual(r['languages'], {'en': 8, 'fa': 12, 'other': 0})
        avgs = {c['key']: c['avg'] for c in r['categories']}
        self.assertEqual(avgs['overall'], 3.2)      # 63/20 = 3.15 -> 3.2
        self.assertEqual(avgs['cleanliness'], 3.1)  # 61/20 = 3.05 -> 3.1
        self.assertEqual(avgs['comfort'], 3.5)      # 7/2 -> 3.5
        self.assertIsNone(avgs['staff'])            # n = 0

    def test_empty_range_gives_null_avg_and_score(self):
        r = bd.shape_range(range_values()['all'])
        self.assertEqual(r['total'], 0)
        self.assertTrue(all(c['avg'] is None for c in r['categories']))
        self.assertIsNone(r['nps']['score'])


class TF_U02_NPS(unittest.TestCase):
    def test_cases(self):
        self.assertEqual(bd.nps_score(8, 0, 0), 0)       # all passives
        self.assertEqual(bd.nps_score(5, 5, 0), 100)     # all promoters
        self.assertEqual(bd.nps_score(5, 0, 5), -100)    # all detractors
        self.assertEqual(bd.nps_score(8, 1, 0), 13)      # 12.5 -> 13
        self.assertEqual(bd.nps_score(8, 0, 1), -13)     # -12.5 -> -13
        self.assertIsNone(bd.nps_score(0, 0, 0))

    def test_half_up_helpers(self):
        self.assertEqual(bd.round_half_up(Decimal('3.15'), 1), Decimal('3.2'))
        self.assertEqual(bd.round_half_up(Decimal('-12.5'), 0), Decimal('-13'))


class TF_U03_Schema(unittest.TestCase):
    def snapshot(self):
        ranges = bd.shape_range_map(range_values())
        by_dept = {dept: bd.shape_range_map(range_values()) for dept in bd.DEPARTMENTS}
        return bd.build_snapshot(ranges, by_dept, 420001, '2026-11-04T21:00:00Z')

    def test_snapshot_matches_schema(self):
        schema_validate(self.snapshot())

    def test_schema_version_1_fails(self):
        doc = self.snapshot()
        doc['schemaVersion'] = 1
        with self.assertRaises(ValueError):
            schema_validate(doc)

    def test_extra_key_rejected_at_every_level(self):
        for where in ['top', 'range', 'category', 'nps', 'byDepartment']:
            doc = self.snapshot()
            if where == 'top':
                doc['comments'] = []
            elif where == 'range':
                doc['ranges']['7d']['comments'] = []
            elif where == 'category':
                doc['ranges']['7d']['categories'][0]['comments'] = []
            elif where == 'byDepartment':
                doc['byDepartment']['restaurant']['7d']['comments'] = []
            else:
                doc['ranges']['7d']['nps']['comments'] = []
            with self.assertRaises(ValueError, msg=where):
                schema_validate(doc)


class TF_U04_AtomicWrite(unittest.TestCase):
    def test_failed_cycle_keeps_file_and_leaves_no_tmp(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, 'dashboard.json')
            bd.run_cycle(fake_sql(), 420001, out)
            with open(out, encoding='utf-8') as f:
                before = f.read()
            with self.assertRaises(bd.DatabaseError):
                bd.run_cycle(fake_sql(ranges_fail=True), 420001, out)
            with open(out, encoding='utf-8') as f:
                self.assertEqual(f.read(), before)
            self.assertEqual([n for n in os.listdir(d) if n.endswith('.tmp')], [])

    def test_write_uses_one_os_replace(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, 'dashboard.json')
            real = os.replace
            calls = []

            def counting(src, dst):
                calls.append((src, dst))
                return real(src, dst)
            with mock.patch.object(bd.os, 'replace', side_effect=counting):
                bd.run_cycle(fake_sql(), 420001, out)
                bd.run_cycle(fake_sql(), 420001, out)
            self.assertEqual(len(calls), 2)
            self.assertTrue(all(dst == out for _, dst in calls))


def empty_sql(now='2026-11-04 21:00:00'):
    """run_sql stub for an empty response table: every aggregate row is zero (stands in for TF-D1's empty branch)."""
    questions = '\n'.join('\t'.join(r) for r in read_rows('questions.tsv')) + '\n'
    zero_row = '\t'.join(['0'] * bd.RANGE_VALUE_COUNT)

    def run_sql(sql):
        if 'lime_questions' in sql:
            return questions
        if 'NOW()' in sql and 'submitdate' not in sql:
            return now + '\n'
        count = len(bd.RANGES) * (1 + len(bd.DEPARTMENTS))
        return '\n'.join([zero_row] * count) + '\n'
    return run_sql


class TF_D1_EmptyTable(unittest.TestCase):
    """C-01 / US4 AC3: the dashboard build's empty path, driven with stubbed zero-count rows (no DB writes)."""

    def test_empty_cycle_publishes_zero_totals_and_nulls_and_validates(self):
        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, 'dashboard.json')
            doc = bd.run_cycle(empty_sql(), 420001, out)
            with open(out, encoding='utf-8') as f:
                written = json.load(f)
        self.assertEqual(written, doc)
        for label in ('7d', '30d', 'all'):
            for r in [written['ranges'][label]] + [written['byDepartment'][dept][label] for dept in bd.DEPARTMENTS]:
                self.assertEqual(r['total'], 0, label)
                self.assertEqual(r['languages'], {'en': 0, 'fa': 0, 'other': 0}, label)
                self.assertTrue(all(c['n'] == 0 and c['sum'] == 0 for c in r['categories']), label)
                self.assertTrue(all(c['avg'] is None for c in r['categories']), label)
                self.assertEqual(r['nps']['n'], 0, label)
                self.assertIsNone(r['nps']['score'], label)
        schema_validate(written)

    def test_empty_cycle_one_line_output(self):
        out, err = io.StringIO(), io.StringIO()
        with tempfile.TemporaryDirectory() as d:
            code = bd.run_once(empty_sql(), 420001, os.path.join(d, 'x.json'), out, err)
        self.assertEqual(code, 0)
        self.assertEqual(err.getvalue(), '')
        self.assertEqual(out.getvalue().strip(), 'dashboard: all=0 30d=0 7d=0 at 2026-11-04T21:00:00Z')


class TF_U04_DepartmentSlicing(unittest.TestCase):
    def test_restaurant_matches_and_untagged_in_ranges_only(self):
        ranges = range_values()
        questions = '\n'.join('\t'.join(r) for r in read_rows('questions.tsv')) + '\n'

        def dept_sql(sql):
            if 'lime_questions' in sql:
                return questions
            if 'NOW()' in sql and 'submitdate' not in sql:
                return '2026-11-04 21:00:00\n'
            lines = [ranges[k] for k in ('7d', '30d', 'all')]
            zero_row = ['0'] * bd.RANGE_VALUE_COUNT
            rest_row = ['5', '2', '3'] + ['5', '20'] * 6 + ['5', '3', '1', '1']
            for dept in bd.DEPARTMENTS:
                if dept == 'restaurant':
                    lines.extend([rest_row, rest_row, rest_row])
                else:
                    lines.extend([zero_row, zero_row, zero_row])
            return '\n'.join('\t'.join(v) for v in lines) + '\n'

        with tempfile.TemporaryDirectory() as d:
            out = os.path.join(d, 'dash.json')
            doc = bd.run_cycle(dept_sql, 420001, out)
            self.assertEqual(doc['ranges']['7d']['total'], 20)
            self.assertEqual(doc['byDepartment']['restaurant']['7d']['total'], 5)
            self.assertEqual(doc['byDepartment']['reception']['7d']['total'], 0)


class TF_U05_Columns(unittest.TestCase):
    def test_codes_resolve_in_order_and_q8_q9_ignored(self):
        cols = bd.resolve_columns(read_rows('questions.tsv'), 420001)
        self.assertEqual(cols, ['420001X1X%d' % i for i in range(1, 8)] + ['420001X1X10'])

    def test_missing_question_is_not_found(self):
        with self.assertRaises(bd.QuestionNotFound):
            bd.resolve_columns(read_rows('questions_missing.tsv'), 420001)

    def test_bad_column_is_rejected(self):
        with self.assertRaises(bd.BadQuestionColumn):
            bd.resolve_columns(read_rows('questions_badcol.tsv'), 420001)


class TF_U06_Output(unittest.TestCase):
    def test_generated_at_and_one_line_stdout(self):
        out, err = io.StringIO(), io.StringIO()
        with tempfile.TemporaryDirectory() as d:
            code = bd.run_once(fake_sql(now='2026-11-04 21:00:00'), 420001, os.path.join(d, 'x.json'), out, err)
        self.assertEqual(code, 0)
        self.assertEqual(err.getvalue(), '')
        line = out.getvalue().strip()
        self.assertRegex(line, r'^dashboard: all=\d+ 30d=\d+ 7d=\d+ at \S+Z$')
        self.assertIn('at 2026-11-04T21:00:00Z', line)

    def test_failed_cycle_one_stderr_line(self):
        out, err = io.StringIO(), io.StringIO()
        with tempfile.TemporaryDirectory() as d:
            code = bd.run_once(fake_sql(ranges_fail=True), 420001, os.path.join(d, 'x.json'), out, err)
        self.assertEqual(code, 1)
        self.assertEqual(out.getvalue(), '')
        line = err.getvalue().strip()
        self.assertRegex(line, r'^dashboard: cycle failed: \w+: .+$')
        self.assertNotIn('synthetic', line.lower().replace('synthetic failure', ''))


if __name__ == '__main__':
    unittest.main()
