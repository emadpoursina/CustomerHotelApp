#!/usr/bin/env python3
"""Push the survey's titles and texts from the repo to a running LimeSurvey.

Only the language texts are changed: title, description, welcome text and end text.
Questions, answers and responses are never touched, so this is safe to run on every deploy.

Source: limesurvey/survey/hotel-guest-survey.lss (the structure export, en and fa blocks).
Target: LimeSurvey RemoteControl JSON-RPC (set_language_properties).

Environment (read from .env by the caller):
  LS_ADMIN_USER, LS_ADMIN_PASSWORD    admin login used for the RPC session
  LS_RPC_URL                          default http://localhost:8090/index.php/admin/remotecontrol

Usage:
  python3 scripts/sync-survey-text.py            # apply
  python3 scripts/sync-survey-text.py --dry-run  # show what would change, no login
"""
import json
import os
import sys
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LSS = os.path.join(ROOT, "limesurvey", "survey", "hotel-guest-survey.lss")
FIELDS = ["surveyls_title", "surveyls_description", "surveyls_welcometext", "surveyls_endtext"]
LANGS = {"en", "fa"}
RPC_URL = os.environ.get("LS_RPC_URL", "http://localhost:8090/index.php/admin/remotecontrol")


def texts_from_lss():
    """Return {(sid, lang): {field: text}} for every language block in the export."""
    out = {}
    for elem in ET.parse(LSS).getroot().iter():
        lang = elem.findtext("surveyls_language")
        sid = elem.findtext("surveyls_survey_id")
        if lang in LANGS and sid:
            out[(int(sid), lang)] = {f: (elem.findtext(f) or "") for f in FIELDS}
    return out


def rpc(method, params):
    body = json.dumps({"method": method, "params": params, "id": 1}).encode()
    req = urllib.request.Request(RPC_URL, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        reply = json.loads(resp.read().decode() or "{}")
    if reply.get("error"):
        raise RuntimeError(f"{method}: {reply['error']}")
    return reply.get("result")


def is_ok(result):
    """LimeSurvey returns True, or a dict of per-field True values plus status 'OK'."""
    if result is True:
        return True
    if isinstance(result, dict):
        return result.get("status") == "OK" and all(v is True for k, v in result.items() if k != "status")
    return False


def main():
    dry = "--dry-run" in sys.argv
    texts = texts_from_lss()
    if not texts:
        sys.exit("no en/fa survey blocks found in the .lss export")

    if dry:
        for (sid, lang), fields in sorted(texts.items()):
            print(f"survey {sid} [{lang}]: {', '.join(fields)} (from repo)")
        return

    user = os.environ.get("LS_ADMIN_USER")
    password = os.environ.get("LS_ADMIN_PASSWORD")
    if not user or not password:
        sys.exit("LS_ADMIN_USER and LS_ADMIN_PASSWORD must be set")

    key = rpc("get_session_key", [user, password])
    if not isinstance(key, str) or len(key) < 10:
        sys.exit(f"login failed: {key!r}")
    try:
        for (sid, lang), fields in sorted(texts.items()):
            result = rpc("set_language_properties", [key, sid, fields, lang])
            if not is_ok(result):
                sys.exit(f"survey {sid} [{lang}] not updated: {result!r}")
            print(f"survey {sid} [{lang}]: texts updated")
    finally:
        rpc("release_session_key", [key])


if __name__ == "__main__":
    main()
