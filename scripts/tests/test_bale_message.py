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
    def test_signature_has_no_comment_parameter(self):
        sig = inspect.signature(build_bale_message)
        params = list(sig.parameters.keys())
        # Allowed parameter names only
        allowed = {"department", "overall", "nps", "hotel_fa", "when_fa"}
        for p in params:
            self.assertIn(p, allowed, f"Forbidden parameter {p} in build_bale_message signature")
            self.assertNotIn("comment", p.lower())
            self.assertNotIn("praise", p.lower())
            self.assertNotIn("complaint", p.lower())
            self.assertNotIn("q8", p.lower())
            self.assertNotIn("q9", p.lower())

    def test_department_map_covers_four_codes(self):
        expected_codes = {"restaurant", "reception", "facilities", "housekeeping"}
        self.assertEqual(set(DEPT_MAP_FA.keys()), expected_codes)
        self.assertEqual(DEPT_MAP_FA["restaurant"], "رستوران")
        self.assertEqual(DEPT_MAP_FA["reception"], "پذیرش")
        self.assertEqual(DEPT_MAP_FA["facilities"], "تاسیسات")
        self.assertEqual(DEPT_MAP_FA["housekeeping"], "خانه‌داری")

    def test_builder_output_matches_contract_template_and_ascii_digits(self):
        msg = build_bale_message("housekeeping", 4, 9)
        lines = msg.split("\n")
        self.assertEqual(len(lines), 5, f"Expected 5 lines, got {len(lines)}: {msg}")
        self.assertEqual(lines[0], "بازخورد جدید · خانه‌داری")
        self.assertEqual(lines[1], "امتیاز کلی: 4/5")
        self.assertEqual(lines[2], "NPS: 9")
        self.assertEqual(lines[3], DEFAULT_HOTEL_FA)
        self.assertEqual(lines[4], DEFAULT_WHEN_FA)

        # ASCII digits in overall and nps lines
        self.assertIn("4/5", lines[1])
        self.assertIn("9", lines[2])
        # Ensure no Persian digits in the score lines
        for persian_digit in "۰۱۲۳۴۵۶۷۸۹":
            self.assertNotIn(persian_digit, lines[1])
            self.assertNotIn(persian_digit, lines[2])

    def test_all_department_codes(self):
        for code, fa_label in DEPT_MAP_FA.items():
            msg = build_bale_message(code, 5, 10)
            self.assertTrue(msg.startswith(f"بازخورد جدید · {fa_label}\n"))


if __name__ == "__main__":
    unittest.main()
