"""TF-U08: string parity between app/js/i18n.js and the survey's views/subviews/hotel/i18n.twig (research R-17)."""
import glob
import os
import re
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))
JS = os.path.join(ROOT, 'app', 'js', 'i18n.js')
TWIG = os.path.join(ROOT, 'limesurvey', 'themes', 'hotel-classic', 'views', 'subviews', 'hotel', 'i18n.twig')
APP_JS = glob.glob(os.path.join(ROOT, 'app', 'js', '*.js'))

# data-model.md §5 shared keys (shell) and survey-only keys (both files must carry them).
SHARED = ['menu', 'notifications', 'tab.home', 'tab.nearby', 'tab.rate', 'tab.dash', 'tab.services', 'nav.main',
          'title.rate', 'd.mystay', 'd.room', 'd.wifi', 'd.settings', 'd.soon', 'd.lang', 'd.langLocked',
          'demo', 'soon', 'lang.en', 'lang.fa', 'brand.en', 'brand.fa', 'brand.place', 'tagline']
SURVEY_ONLY = ['s.time', 's.anon', 's.q9', 's.langNote', 's.done.home', 's.done.nearby']
# The Twig macro names its brand keys brand.name_en / brand.name_fa / brand.tagline (data-model §5).
TWIG_NAME = {'brand.en': 'brand.name_en', 'brand.fa': 'brand.name_fa', 'tagline': 'brand.tagline'}
KEY_PREFIXES = ('n', 's', 'd', 'db', 'tab', 'title', 'greet', 'home', 'qa', 'lang', 'brand', 'nav', 'seeAll',
                'menu', 'notifications', 'demo', 'soon', 'tagline')


def parse_js_tables():
    with open(JS, encoding='utf-8') as f:
        src = f.read()
    tables = {}
    for lang in ('en', 'fa'):
        start = src.index('    %s: {' % lang)
        end = src.index('\n    }', start)
        body = src[start:end]
        tables[lang] = dict(re.findall(r"'([^']+)':\s*'((?:[^'\\]|\\.)*)'", body))
    return tables


def parse_twig_table():
    with open(TWIG, encoding='utf-8') as f:
        src = f.read()
    table = {}
    for key, en, fa in re.findall(r"'([^']+)':\s*\{'en':\s*'((?:[^'\\]|\\.)*)',\s*'fa':\s*'((?:[^'\\]|\\.)*)'\}", src):
        table[key] = {'en': en, 'fa': fa}
    return table


class TF_U08_Strings(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.js = parse_js_tables()
        cls.twig = parse_twig_table()

    def test_shared_and_survey_keys_present_identical_and_non_empty(self):
        for key in SHARED + SURVEY_ONLY:
            tkey = TWIG_NAME.get(key, key)
            self.assertIn(tkey, self.twig, 'twig missing ' + tkey)
            for lang in ('en', 'fa'):
                self.assertTrue(self.twig[tkey][lang].strip(), 'twig empty %s %s' % (tkey, lang))
            if key in SHARED:
                self.assertIn(key, self.js['en'], 'js missing ' + key)
                for lang in ('en', 'fa'):
                    self.assertTrue(self.js[lang][key].strip(), 'js empty %s %s' % (key, lang))
                    self.assertEqual(self.js[lang][key], self.twig[tkey][lang], 'mismatch %s/%s' % (key, lang))

    def test_every_key_used_by_the_app_exists_in_both_languages(self):
        used = set()
        for path in APP_JS:
            with open(path, encoding='utf-8') as f:
                for lit in re.findall(r"'([^'\n]+)'", f.read()):
                    if re.match(r'^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$', lit) and lit.split('.')[0] in KEY_PREFIXES:
                        used.add(lit)
        self.assertTrue(used)
        for key in sorted(used):
            for lang in ('en', 'fa'):
                self.assertIn(key, self.js[lang], 'missing %s in %s' % (key, lang))
                self.assertTrue(self.js[lang][key].strip(), 'empty %s in %s' % (key, lang))

    def test_english_and_persian_tables_have_the_same_keys(self):
        self.assertEqual(set(self.js['en']), set(self.js['fa']))


if __name__ == '__main__':
    unittest.main()
