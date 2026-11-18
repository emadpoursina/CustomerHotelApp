/*
 * hotel-classic app shell behaviour (contracts/app-shell.md §4).
 * Shared by the static app and the survey pages. Exposes window.HotelShell only.
 * Reads no form fields, makes no network request, logs nothing. Writes only
 * localStorage['hotel.lang'] (en | fa).
 */
(function () {
  'use strict';

  var LANG_KEY = 'hotel.lang';
  var TOAST_MS = 2000;
  var toastTimer = null;
  var lastOpener = null;

  function $(id) {
    return document.getElementById(id);
  }

  function isLang(v) {
    return v === 'en' || v === 'fa';
  }

  function getLang() {
    try {
      var stored = window.localStorage.getItem(LANG_KEY);
      if (isLang(stored)) {
        return stored;
      }
    } catch (e) {
      // Storage blocked: fall through to the browser rule.
    }
    var list = (window.navigator.languages && window.navigator.languages.length)
      ? window.navigator.languages
      : [window.navigator.language || ''];
    var fa = -1;
    var en = -1;
    for (var i = 0; i < list.length; i++) {
      var tag = String(list[i]).toLowerCase();
      if (fa === -1 && (tag === 'fa' || tag.indexOf('fa-') === 0)) {
        fa = i;
      }
      if (en === -1 && (tag === 'en' || tag.indexOf('en-') === 0)) {
        en = i;
      }
    }
    return (fa !== -1 && (en === -1 || fa < en)) ? 'fa' : 'en';
  }

  function setLang(l) {
    if (!isLang(l)) {
      return;
    }
    try {
      window.localStorage.setItem(LANG_KEY, l);
    } catch (e) {
      // Ignored: the choice then lasts for this page only.
    }
  }

  function toast(text) {
    var el = $('hs-toast');
    if (!el) {
      return;
    }
    var label = el.querySelector('.hs-toast-text') || el;
    label.textContent = text || el.getAttribute('data-soon-text') || '';
    el.classList.add('is-show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.classList.remove('is-show');
    }, TOAST_MS);
  }

  function setScrim(show) {
    var scrim = $('hs-scrim');
    if (scrim) {
      scrim.hidden = !show;
    }
  }

  function setLocked(locked) {
    document.documentElement.classList.toggle('hs-locked', locked);
  }

  function openDrawer() {
    var drawer = $('hs-drawer');
    var menu = $('hs-menu');
    if (!drawer) {
      return;
    }
    lastOpener = menu || null;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (menu) {
      menu.setAttribute('aria-expanded', 'true');
    }
    setScrim(true);
    setLocked(true);
    var first = drawer.querySelector('.hs-d-item');
    if (first) {
      first.focus();
    }
  }

  function closeDrawer(restoreFocus) {
    var drawer = $('hs-drawer');
    var menu = $('hs-menu');
    if (!drawer || !drawer.classList.contains('is-open')) {
      return;
    }
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (menu) {
      menu.setAttribute('aria-expanded', 'false');
    }
    setScrim(false);
    setLocked(false);
    if (restoreFocus && menu) {
      menu.focus();
    }
  }

  function openSheet(el) {
    if (!el) {
      return;
    }
    lastOpener = document.activeElement;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    setScrim(true);
    setLocked(true);
    var target = el.querySelector('.hs-sheet-close') || el;
    if (target.focus) {
      target.focus();
    }
  }

  function closeSheet() {
    var sheet = document.querySelector('.hs-sheet.is-open');
    if (!sheet) {
      return;
    }
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    setScrim(false);
    setLocked(false);
    if (lastOpener && lastOpener.focus && document.contains(lastOpener)) {
      lastOpener.focus();
    }
  }

  function isInside(el, id) {
    var node = el;
    while (node) {
      if (node.id === id) {
        return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  document.addEventListener('click', function (e) {
    var target = e.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('#hs-menu')) {
      var drawer = $('hs-drawer');
      if (drawer && drawer.classList.contains('is-open')) {
        closeDrawer(true);
      } else {
        openDrawer();
      }
      return;
    }

    if (target.closest('#hs-scrim')) {
      closeSheet();
      closeDrawer(true);
      return;
    }

    var soon = target.closest('[data-soon]');
    if (soon) {
      e.preventDefault();
      toast();
      return;
    }

    var langBtn = target.closest('[data-lang]');
    if (langBtn && !langBtn.disabled) {
      var l = langBtn.getAttribute('data-lang');
      if (isLang(l)) {
        setLang(l);
        var href = langBtn.getAttribute('data-href');
        if (href) {
          window.location.href = href;
        } else {
          document.dispatchEvent(new CustomEvent('hotel:langchange', { detail: { lang: l } }));
        }
      }
      return;
    }

    var link = target.closest('a');
    if (link && (isInside(link, 'hs-drawer') || isInside(link, 'hs-tabbar'))) {
      closeDrawer(false);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') {
      return;
    }
    if (document.querySelector('.hs-sheet.is-open')) {
      closeSheet();
      return;
    }
    closeDrawer(true);
  });

  // Unread badge for feedback inbox
  function updateInboxBadge() {
    var dot = document.querySelector('.hs-appbar .hs-dot');
    if (!dot) {
      return;
    }
    dot.style.display = 'none';
    if (typeof fetch !== 'function') {
      return;
    }
    fetch('/app/api/inbox.php?view=meta', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.ids)) { return; }
        var readMap = {};
        try {
          var raw = window.localStorage.getItem('hotel.inbox.read');
          var readArr = JSON.parse(raw || '[]');
          if (Array.isArray(readArr)) {
            for (var i = 0; i < readArr.length; i++) {
              readMap[readArr[i]] = true;
            }
          }
        } catch (e) {}
        var unread = 0;
        for (var j = 0; j < data.ids.length; j++) {
          if (!readMap[data.ids[j]]) {
            unread++;
          }
        }
        dot.style.display = unread > 0 ? 'block' : 'none';
      })
      .catch(function () {
        dot.style.display = 'none';
      });
  }

  document.addEventListener('pjax:scriptcomplete', function () {
    closeDrawer(false);
    updateInboxBadge();
  });

  // Browser chrome colour from the --color-primary token (no hex outside tokens.css).
  function themeColor() {
    var value = window.getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
    if (!value) {
      return;
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = value;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      themeColor();
      updateInboxBadge();
    });
  } else {
    themeColor();
    updateInboxBadge();
  }

  window.HotelShell = {
    getLang: getLang,
    setLang: setLang,
    toast: toast,
    openSheet: openSheet,
    closeSheet: closeSheet
  };
})();
