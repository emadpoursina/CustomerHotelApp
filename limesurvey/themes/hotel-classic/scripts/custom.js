/*
 * hotel-classic — the only custom script in this theme (FR-034).
 *
 * This file may contain, and only contain:
 *   1. The welcome-screen browser-language redirect (FR-005, A-01, task T025):
 *      runs once per tab session, only on the welcome screen, and reloads the
 *      same URL with lang=fa when the browser prefers Persian.
 *   2. No double-submit guard: the walkthrough (task T050) showed that the
 *      engine already adds one row for a repeated submit, so none is added here.
 *
 * It must never read, log, store or transmit answer or comment content
 * (FR-025, FR-034): no network calls, no console output, no form-field
 * access, no persistent browser storage other than the session flag.
 */

(function () {
  'use strict';

  var FLAG = 'hotelLangChecked';

  // Index of the first navigator entry whose tag starts with the prefix, or -1.
  function rank(list, prefix) {
    for (var i = 0; i < list.length; i++) {
      var tag = String(list[i]).toLowerCase();
      if (tag === prefix || tag.indexOf(prefix + '-') === 0) {
        return i;
      }
    }
    return -1;
  }

  function maybeRedirectToPersian() {
    // Welcome screen only (the welcome container is rendered by firstpage.twig).
    if (!document.getElementById('welcome-container')) {
      return;
    }
    // The guest's own choice (lang in the URL) always wins.
    if (new URLSearchParams(window.location.search).has('lang')) {
      return;
    }
    if (document.documentElement.lang !== 'en') {
      return;
    }
    // Once per tab session. Blocked storage means no redirect at all.
    try {
      if (window.sessionStorage.getItem(FLAG)) {
        return;
      }
      window.sessionStorage.setItem(FLAG, '1');
    } catch (e) {
      return;
    }

    var langs = (window.navigator.languages && window.navigator.languages.length)
      ? window.navigator.languages
      : [window.navigator.language || ''];
    var fa = rank(langs, 'fa');
    var en = rank(langs, 'en');
    if (fa === -1) {
      return;
    }
    if (en !== -1 && en < fa) {
      return;
    }

    var params = new URLSearchParams(window.location.search);
    params.set('lang', 'fa');
    window.location.replace(window.location.pathname + '?' + params.toString() + window.location.hash);
  }

  // LimeSurvey loads this file in the document head, before the welcome container exists,
  // so the check must wait for the DOM (found in the browser walkthrough, T025 / W2).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', maybeRedirectToPersian);
  } else {
    maybeRedirectToPersian();
  }
})();
