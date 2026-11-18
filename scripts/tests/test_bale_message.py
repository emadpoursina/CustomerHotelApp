"""TF-U01: Unit test for Bale notification message builder (contracts/bale-message.md)."""
import inspect
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.abspath(os.path.join(HERE, os.pardir))
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

from bale_message import build_bale_message, DEPT_MAP_FA, DEFAULT_HOTEL_FA, DEFAULT_WHEN_FA


class TestBaleMessage(unittest.TestCase):
    def test_signature_has_no_comment_or_score_parameter(self):
        sig = inspect.signature(build_bale_message)
        params = list(sig.parameters.keys())
        allowed = {"department", "hotel_fa", "when_fa"}
        for p in params:
            self.assertIn(p, allowed, f"Forbidden parameter {p} in build_bale_message signature")
            self.assertNotIn("comment", p.lower())
            self.assertNotIn("praise", p.lower())
            self.assertNotIn("complaint", p.lower())
            self.assertNotIn("overall", p.lower())
            self.assertNotIn("nps", p.lower())
            self.assertNotIn("q8", p.lower())
            self.assertNotIn("q9", p.lower())

    def test_department_map_covers_four_codes(self):
        expected_codes = {"restaurant", "reception", "facilities", "housekeeping"}
        self.assertEqual(set(DEPT_MAP_FA.keys()), expected_codes)
        self.assertEqual(DEPT_MAP_FA["restaurant"], "رستوران")
        self.assertEqual(DEPT_MAP_FA["reception"], "پذیرش")
        self.assertEqual(DEPT_MAP_FA["facilities"], "تاسیسات")
        self.assertEqual(DEPT_MAP_FA["housekeeping"], "خانه‌داری")

    def test_builder_output_matches_contract_template(self):
        msg = build_bale_message("housekeeping")
        lines = msg.split("\n")
        self.assertEqual(len(lines), 3, f"Expected 3 lines, got {len(lines)}: {msg}")
        self.assertEqual(lines[0], "بازخورد جدید · خانه‌داری")
        self.assertEqual(lines[1], DEFAULT_HOTEL_FA)
        self.assertEqual(lines[2], DEFAULT_WHEN_FA)

    def test_all_department_codes(self):
        for code, fa_label in DEPT_MAP_FA.items():
            msg = build_bale_message(code)
            self.assertTrue(msg.startswith(f"بازخورد جدید · {fa_label}\n"))


if __name__ == "__main__":
    unittest.main()
