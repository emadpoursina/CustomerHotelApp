"""TF-U07: seed-demo.py form parsing, host guard and deterministic answer plan (demo PRD D-07, contracts/scripts-cli.md §2)."""
import os
import re
import unittest

from _load import load

sd = load('seed-demo')
FIX = os.path.join(os.path.dirname(__file__), 'fixtures', 'survey_page.html')


class TF_U07_Seed(unittest.TestCase):
    def setUp(self):
        with open(FIX, encoding='utf-8') as f:
            self.html = f.read()

    def test_form_parse_returns_hidden_inputs_action_and_answer_field(self):
        form = sd.parse_form(self.html)
        self.assertEqual(form['action'], '/index.php/420001')
        hidden = form['hidden']
        for name in ['YII_CSRF_TOKEN', 'sid', 'thisstep', 'SID', 'start_time', 'LEMpostKey', 'relevance420001X1X1', 'java420001X1X1']:
            self.assertIn(name, hidden)
        self.assertEqual(hidden['YII_CSRF_TOKEN'], 'fixture-csrf-token')
        self.assertEqual(form['answer_fields'], ['420001X1X1'])

    def test_host_guard(self):
        for url in ['http://example.com', 'http://hotelsurvey.example.org']:
            self.assertFalse(sd.host_allowed(url), url)
        for url in ['http://hotelsurvey.localhost', 'http://localhost:8090', 'http://127.0.0.1']:
            self.assertTrue(sd.host_allowed(url), url)

    def test_refused_host_exits_2(self):
        self.assertEqual(sd.main(['--base-url', 'http://example.com', '--dry-run']), 2)

    def test_answer_plan_is_deterministic_and_in_range(self):
        a = sd.plan_answers(40, seed=42, fa_share=0.55)
        b = sd.plan_answers(40, seed=42, fa_share=0.55)
        self.assertEqual(a, b)
        for item in a:
            self.assertEqual(len(item['q']), 7)
            self.assertTrue(all(1 <= v <= 5 for v in item['q'][:6]))
            self.assertTrue(0 <= item['q'][6] <= 10)
            for text in item['comments']:
                self.assertTrue(text is None or re.match(r'^\[demo seed \d+\] synthetic comment$', text))
        langs = [x['lang'] for x in a]
        self.assertTrue('en' in langs and 'fa' in langs)
        empty = sum(1 for x in a for t in x['comments'] if t is None)
        self.assertGreater(empty, 0)


if __name__ == '__main__':
    unittest.main()
