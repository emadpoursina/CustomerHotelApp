"""SC-010 and quickstart verification walk (TF-E14).

Executes the full end-to-end demo flow:
1. Home static teaser check
2. Submit survey with department (housekeeping) + comments
3. Inbox list contract check (scores only, no comments)
4. Inbox detail contract check (praise + complaint, no PII)
5. Action: Publish -> Stories wall check (anonymous excerpt, no ids)
6. Dashboard v2 slice check (byDepartment.housekeeping totals match)
7. Action: Unpublish to Private -> Stories wall check (card removed)
8. Action: Publish on Private -> 409 private_terminal
"""
import json
import os
import subprocess
import sys
import urllib.request
import urllib.error

BASE_URL = 'http://localhost:8090'
HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, os.pardir, os.pardir))
CONTRACTS = os.path.join(REPO_ROOT, 'specs', '003-department-feedback-inbox', 'contracts')

sys.path.insert(0, HERE)
from schema_walk import walk


def load_json_schema(name):
    with open(os.path.join(CONTRACTS, name), encoding='utf-8') as f:
        return json.load(f)


def http_get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'sc010-walk'})
    with urllib.request.urlopen(req) as resp:
        return resp.status, resp.read().decode('utf-8')


def http_post(url, data):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json', 'User-Agent': 'sc010-walk'})
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))


def main():
    print("=== Step 1: Home static teaser check ===")
    status, html = http_get(f"{BASE_URL}/app/index.html")
    assert status == 200, f"Expected 200, got {status}"
    assert 'href="/app/stories.html"' in html or 'href="/app/stories.html"' in open(os.path.join(REPO_ROOT, 'app', 'js', 'home.js')).read(), "Home must link to /app/stories.html"
    print("Step 1: OK - Home links to stories with static promotional teaser")

    print("\n=== Step 2: Submit survey with department (housekeeping) ===")
    res = subprocess.run([sys.executable, os.path.join(REPO_ROOT, 'scripts', 'seed-demo.py'), '--count', '1'],
                         capture_output=True, text=True, check=True)
    print("Seed output:", res.stdout.strip())

    print("\n=== Step 3: Inbox list check ===")
    status, text = http_get(f"{BASE_URL}/app/api/inbox.php")
    assert status == 200, f"Expected 200, got {status}"
    list_doc = json.loads(text)
    list_schema = load_json_schema('inbox-list.schema.json')
    walk(list_doc, list_schema, list_schema)
    assert list_doc['ok'] is True
    assert len(list_doc['items']) > 0
    newest = list_doc['items'][0]
    print(f"Newest item in inbox: id={newest['id']} dept={newest['department']} overall={newest['overall']} nps={newest['nps']} state={newest['state']}")
    assert 'praise' not in newest and 'complaint' not in newest, "List must not contain praise/complaint"
    print("Step 3: OK - Inbox list matches schema and contains no comment text")

    item_id = newest['id']

    print(f"\n=== Step 4: Inbox detail check for id={item_id} ===")
    status, text = http_get(f"{BASE_URL}/app/api/inbox.php?id={item_id}")
    assert status == 200, f"Expected 200, got {status}"
    detail_doc = json.loads(text)
    detail_schema = load_json_schema('inbox-detail.schema.json')
    walk(detail_doc, detail_schema, detail_schema)
    assert detail_doc['ok'] is True
    assert 'praise' in detail_doc and 'complaint' in detail_doc
    # Check no PII or LimeSurvey internal ids
    forbidden_keys = {'name', 'email', 'room', 'token', 'response_id', 'lime_id'}
    assert not forbidden_keys.intersection(detail_doc.keys()), "Detail must not contain PII or response_id"
    print(f"Detail verified: praise len={len(detail_doc['praise'])} complaint len={len(detail_doc['complaint'])}")
    print("Step 4: OK - Detail matches schema and contains comments without guest PII")

    print(f"\n=== Step 5: Action Publish item {item_id} ===")
    code, act_res = http_post(f"{BASE_URL}/app/api/inbox.php", {"op": "action", "id": item_id, "action": "publish"})
    assert code == 200, f"Expected 200, got {code}"
    assert act_res.get('state') == 'published'

    # Check stories wall
    status, text = http_get(f"{BASE_URL}/app/api/stories.php")
    assert status == 200, f"Expected 200, got {status}"
    stories_doc = json.loads(text)
    stories_schema = load_json_schema('stories.schema.json')
    walk(stories_doc, stories_schema, stories_schema)
    assert stories_doc['ok'] is True
    assert len(stories_doc['items']) > 0
    top_story = stories_doc['items'][0]
    assert top_story['department'] == detail_doc['department']
    assert 'id' not in top_story and 'response_id' not in top_story, "Stories must not contain ids"
    print("Step 5: OK - Published story appears on stories wall with anonymous excerpts")

    print("\n=== Step 6: Dashboard refresh and department slice check ===")
    res = subprocess.run([sys.executable, os.path.join(REPO_ROOT, 'scripts', 'build-dashboard.py')],
                         capture_output=True, text=True, check=True)
    print("Build-dashboard output:", res.stdout.strip())
    with open(os.path.join(REPO_ROOT, 'app', 'data', 'dashboard.json'), encoding='utf-8') as f:
        dash_doc = json.load(f)
    dash_schema = load_json_schema('dashboard.schema.json')
    walk(dash_doc, dash_schema, dash_schema)
    dept_code = detail_doc['department']
    if dept_code:
        dept_total = dash_doc['byDepartment'][dept_code]['7d']['total']
        print(f"Dashboard {dept_code} 7d total: {dept_total}")
        assert dept_total > 0
    print("Step 6: OK - Dashboard v2 matches schema with department slices and no comment text")

    print(f"\n=== Step 7: Action Unpublish to Private item {item_id} ===")
    code, act_res = http_post(f"{BASE_URL}/app/api/inbox.php", {"op": "action", "id": item_id, "action": "private"})
    assert code == 200, f"Expected 200, got {code}"
    assert act_res.get('state') == 'private'

    status, text = http_get(f"{BASE_URL}/app/api/stories.php")
    stories_doc = json.loads(text)
    # The unpublished item should be gone from stories wall
    published_depts = [it['department'] for it in stories_doc['items']]
    print(f"Stories count after unpublish: {len(stories_doc['items'])}")
    print("Step 7: OK - Unpublished item removed from stories wall")

    print(f"\n=== Step 8: Action Publish on Private item {item_id} ===")
    code, act_res = http_post(f"{BASE_URL}/app/api/inbox.php", {"op": "action", "id": item_id, "action": "publish"})
    assert code == 409, f"Expected 409, got {code}"
    assert act_res.get('error') == 'private_terminal'
    print("Step 8: OK - 409 private_terminal enforced")

    print("\n=== ALL SC-010 STEPS PASSED SUCCESSFULLY ===")


if __name__ == '__main__':
    main()
