#!/usr/bin/env python3
"""Demo seed: submits synthetic responses through the public survey (demo PRD D-07).

No database access, no RemoteControl API, no clock change (FR-035, FR-036). Each response uses a new
cookie jar and the same steps a browser takes: GET the survey, leave the welcome screen, answer
Q1-Q9 (field names read from the form), submit. Refuses any host other than localhost, *.localhost
and 127.0.0.1. Python 3 standard library only.

  python3 scripts/seed-demo.py [--count N] [--base-url URL] [--survey-id ID] [--seed N] [--fa-share F] [--dry-run]

Exit codes: 0 all submitted (or dry run), 1 a submission failed, 2 refused host or bad arguments.
"""
import argparse
import http.cookiejar
import os
import random
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir))
DEFAULT_BASE = 'http://hotelsurvey.localhost'
DEFAULT_SURVEY = 420001
ANSWER_RE = re.compile(r'^\d+X\d+X\d+$')
TIMEOUT = 20


class SeedStepError(Exception):
    def __init__(self, step):
        super().__init__(step)
        self.step = step


class _FormParser(HTMLParser):
    """Collects the survey form (id="limesurvey"): action, hidden inputs and answer fields in page order."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_form = False
        self.form_seen = False
        self.action = None
        self.hidden = {}
        self.answer_fields = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'form' and a.get('id') == 'limesurvey' and not self.form_seen:
            self.in_form = True
            self.form_seen = True
            self.action = a.get('action')
            return
        if not self.in_form:
            return
        if tag == 'input':
            kind = (a.get('type') or 'text').lower()
            name = a.get('name')
            if not name:
                return
            if kind == 'hidden':
                self.hidden[name] = a.get('value', '')
            elif kind == 'radio' and ANSWER_RE.match(name) and name not in self.answer_fields:
                self.answer_fields.append(name)
        elif tag == 'textarea':
            name = a.get('name')
            if name and ANSWER_RE.match(name) and name not in self.answer_fields:
                self.answer_fields.append(name)

    def handle_endtag(self, tag):
        if tag == 'form' and self.in_form:
            self.in_form = False


def parse_form(html):
    p = _FormParser()
    p.feed(html)
    return {'action': p.action, 'hidden': p.hidden, 'answer_fields': p.answer_fields}


def host_allowed(url):
    host = urllib.parse.urlsplit(url).hostname or ''
    return host in ('localhost', '127.0.0.1') or host.endswith('.localhost')


def _clamp(v, lo, hi):
    return max(lo, min(hi, v))


def plan_answers(count, seed, fa_share):
    """Deterministic plan. Q1-Q6 in 1-5 with per-question bias, Q7 in 0-10 tied to Q1, Q8/Q9 empty in most."""
    rng = random.Random(seed)
    bias = [0.4, 0.5, 0.2, 0.7, -0.5, 0.0]
    plan = []
    for i in range(1, count + 1):
        lang = 'fa' if rng.random() < fa_share else 'en'
        q = [int(_clamp(round(3.6 + b + rng.gauss(0, 0.9)), 1, 5)) for b in bias]
        q7 = int(_clamp(round(q[0] * 2 + rng.gauss(0, 1.5)), 0, 10))
        comments = []
        for _ in range(2):
            comments.append('[demo seed %d] synthetic comment' % i if rng.random() < 0.3 else None)
        plan.append({'lang': lang, 'q': q + [q7], 'comments': comments})
    return plan


def read_env_value(key):
    path = os.path.join(REPO_ROOT, '.env')
    try:
        with open(path, encoding='utf-8') as f:
            for line in f:
                m = re.match(r'^%s=(.*)$' % re.escape(key), line.strip())
                if m:
                    return m.group(1).strip().strip('"').strip("'")
    except OSError:
        pass
    return None


def _open(opener, url, data=None):
    body = None if data is None else urllib.parse.urlencode(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/x-www-form-urlencoded'})
    with opener.open(req, timeout=TIMEOUT) as res:
        return res.geturl(), res.read().decode('utf-8', errors='replace')


def submit_one(base, sid, item, index):
    """One response through the public form. Raises SeedStepError with the failing step name."""
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    start_url = '%s/index.php/%d?lang=%s&newtest=Y' % (base, sid, item['lang'])
    try:
        page_url, html = _open(opener, start_url)
    except (urllib.error.URLError, OSError):
        raise SeedStepError('start')
    form = parse_form(html)
    if not form['action']:
        raise SeedStepError('start')
    post_url = urllib.parse.urljoin(page_url, form['action'])
    data = dict(form['hidden'])
    data['move'] = 'movenext'
    try:
        page_url, html = _open(opener, post_url, data)
    except (urllib.error.URLError, OSError):
        raise SeedStepError('welcome')
    for qi in range(1, 10):
        form = parse_form(html)
        if not form['answer_fields']:
            raise SeedStepError('Q%d' % qi)
        field = form['answer_fields'][0]
        data = dict(form['hidden'])
        if qi <= 7:
            data[field] = str(item['q'][qi - 1])
        else:
            data[field] = item['comments'][qi - 8] or ''
        data['move'] = 'movesubmit' if qi == 9 else 'movenext'
        post_url = urllib.parse.urljoin(page_url, form['action'] or start_url)
        try:
            page_url, html = _open(opener, post_url, data)
        except (urllib.error.URLError, OSError):
            raise SeedStepError('Q%d' % qi)
        if qi < 9:
            nxt = parse_form(html)['answer_fields']
            if nxt and nxt[0] == field:
                raise SeedStepError('Q%d' % qi)
    if 'hotel-done' not in html:
        raise SeedStepError('submit')


def dry_run_report(plan, out):
    n = len(plan)
    en = sum(1 for x in plan if x['lang'] == 'en')
    fa = n - en
    print('seed: dry run, %d responses planned (en=%d, fa=%d), nothing submitted' % (n, en, fa), file=out)
    for qi in range(7):
        mean = sum(x['q'][qi] for x in plan) / float(n) if n else 0.0
        print('seed: mean Q%d = %.1f' % (qi + 1, mean), file=out)


def parse_args(argv):
    p = argparse.ArgumentParser(description='Submit demo survey responses through the public form.')
    p.add_argument('--count', type=int, default=40, help='responses to submit (1-200)')
    p.add_argument('--base-url', default=None, help='survey host (default PUBLIC_URL from .env, else %s)' % DEFAULT_BASE)
    p.add_argument('--survey-id', type=int, default=DEFAULT_SURVEY)
    p.add_argument('--seed', type=int, default=42, help='PRNG seed (same seed, same answers)')
    p.add_argument('--fa-share', type=float, default=0.55, help='share of responses started in Persian')
    p.add_argument('--dry-run', action='store_true', help='print the planned distribution, submit nothing')
    args = p.parse_args(argv)
    if not 1 <= args.count <= 200:
        p.error('--count must be between 1 and 200')
    if not 0.0 <= args.fa_share <= 1.0:
        p.error('--fa-share must be between 0 and 1')
    if args.base_url is None:
        args.base_url = read_env_value('PUBLIC_URL') or DEFAULT_BASE
    args.base_url = args.base_url.rstrip('/')
    return args


def main(argv=None):
    args = parse_args(sys.argv[1:] if argv is None else argv)
    if not host_allowed(args.base_url):
        print('seed: refused host (only localhost, *.localhost and 127.0.0.1 are allowed)', file=sys.stderr)
        return 2
    plan = plan_answers(args.count, args.seed, args.fa_share)
    if args.dry_run:
        dry_run_report(plan, sys.stdout)
        return 0
    done = {'en': 0, 'fa': 0}
    for i, item in enumerate(plan, 1):
        try:
            submit_one(args.base_url, args.survey_id, item, i)
        except SeedStepError as exc:
            print('seed: response %d failed at step %s' % (i, exc.step), file=sys.stderr)
            return 1
        done[item['lang']] += 1
        if i % 10 == 0:
            print('seed: progress %d/%d' % (i, args.count), flush=True)
    print('seed: submitted %d responses (en=%d, fa=%d)' % (sum(done.values()), done['en'], done['fa']), flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
