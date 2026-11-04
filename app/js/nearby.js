/*
 * Nearby screen (contracts/app-screens.md §3, data-model.md §4 and §7, research R-11 and R-12).
 * Classic script. Data: app/data/places.json (demo data). Text is escaped before insertion.
 */
(function () {
  'use strict';

  var T = window.HotelI18n.t;
  var num = window.HotelI18n.num;
  var fold = window.HotelI18n.fold;
  var icon = HotelApp.icon;

  var data = null;
  var state = { q: '', cat: 'all', open: false, sort: 'dist', sheetId: null };
  var sheet = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function lang() {
    return document.documentElement.lang === 'fa' ? 'fa' : 'en';
  }

  var CAT_ICON = { restaurant: 'food', cafe: 'cafe', poi: 'poi', all: 'all' };
  var CAT_KEY = { restaurant: 'n.restaurant', cafe: 'n.cafe', poi: 'n.poi', all: 'n.all' };
  var CATS = ['all', 'restaurant', 'cafe', 'poi'];

  function openNow(p) {
    var now = new Date();
    var h = now.getHours() + now.getMinutes() / 60;
    return (p.hours[0] <= h && h < p.hours[1]) || (p.hours[1] > 24 && h < p.hours[1] - 24);
  }

  function distance(m) {
    return m < 1000 ? T('n.m', num(m)) : T('n.km', num(m / 1000, 1));
  }

  function walkMinutes(m) {
    return Math.max(1, Math.round(m / 80));
  }

  function clock(h) {
    var whole = Math.floor(h % 24);
    var minutes = Math.round((h - Math.floor(h)) * 60);
    var hh = (whole < 10 ? num(0) : '') + num(whole);
    var mm = (minutes < 10 ? num(0) : '') + num(minutes);
    return hh + ':' + mm;
  }

  function hours(p) {
    if (p.hours[0] === 0 && p.hours[1] === 24) {
      return T('n.24h');
    }
    return clock(p.hours[0]) + ' – ' + clock(p.hours[1]);
  }

  function matches(p) {
    var q = fold(state.q);
    if (state.cat !== 'all' && p.category !== state.cat) {
      return false;
    }
    if (state.open && !openNow(p)) {
      return false;
    }
    if (q === '') {
      return true;
    }
    var fields = [p.name.en, p.name.fa].concat(p.tags.en, p.tags.fa);
    return fields.some(function (s) { return fold(s).indexOf(q) !== -1; });
  }

  function sorted(list) {
    var out = list.slice();
    if (state.sort === 'rating') {
      out.sort(function (a, b) {
        return (b.rating - a.rating) || (a.distance_m - b.distance_m) || (a.id - b.id);
      });
    } else {
      out.sort(function (a, b) {
        return (a.distance_m - b.distance_m) || (a.id - b.id);
      });
    }
    return out;
  }

  function pill(p) {
    var o = openNow(p);
    return '<span class="app-pill ' + (o ? 'ok' : 'closed') + '">' + esc(T(o ? 'n.isOpen' : 'n.isClosed')) + '</span>';
  }

  function resultsHTML() {
    var list = sorted(data.places.filter(matches));
    if (!list.length) {
      return '<div class="app-empty">' + icon('search') +
        '<h3 style="margin-block:var(--space-3) var(--space-2)">' + esc(T('n.empty.t')) + '</h3>' +
        '<p class="app-muted app-small">' + esc(T('n.empty.d')) + '</p>' +
        '<button class="app-btn app-btn-auto secondary" type="button" data-clear style="margin:var(--space-4) auto 0">' + esc(T('n.clear')) + '</button>' +
        '</div>';
    }
    var rows = list.map(function (p) {
      return '<button class="app-card app-place" type="button" data-id="' + esc(p.id) + '">' +
        '<span class="app-ic-square">' + icon(CAT_ICON[p.category]) + '</span>' +
        '<span class="app-place-main"><h3>' + esc(p.name[lang()]) + '</h3>' +
          '<span class="app-meta"><span class="app-star">' + icon('star') + num(p.rating, 1) + '</span>' +
          '<span>' + esc(distance(p.distance_m)) + '</span>' +
          '<span>' + esc('$'.repeat(p.price)) + '</span>' + pill(p) + '</span></span>' +
        '<span class="app-chev hs-flip">' + icon('chev') + '</span>' +
        '</button>';
    }).join('');
    return '<p class="app-count">' + esc(T('n.results', num(list.length))) + ' · <span class="app-pill">' + esc(T('n.demo')) + '</span></p>' +
      '<div class="app-list">' + rows + '</div>';
  }

  function updateResults() {
    var box = document.getElementById('results');
    if (box) {
      box.innerHTML = resultsHTML();
    }
  }

  function syncControls() {
    document.querySelectorAll('[data-cat]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-cat') === state.cat));
    });
    document.querySelectorAll('[data-sort]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-sort') === state.sort));
    });
    var sw = document.getElementById('openT');
    if (sw) {
      sw.setAttribute('aria-checked', String(state.open));
    }
  }

  function controlsHTML() {
    var q = esc(state.q);
    return '<div class="app-search">' + icon('search') +
        '<input id="q" type="search" value="' + q + '" placeholder="' + esc(T('n.search')) + '" aria-label="' + esc(T('n.search')) + '" autocomplete="off">' +
      '</div>' +
      '<div class="app-chips" role="group" aria-label="' + esc(T('n.all')) + '">' + CATS.map(function (c) {
        return '<button class="app-chip" type="button" data-cat="' + c + '" aria-pressed="' + (state.cat === c) + '">' +
          '<span class="app-chip-v">' + icon(CAT_ICON[c]) + esc(T(CAT_KEY[c])) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="app-toolbar">' +
        '<button class="app-toggle" type="button" id="openT" role="switch" aria-checked="' + state.open + '"><span class="app-switch"></span>' + esc(T('n.open')) + '</button>' +
        '<div class="app-seg" role="group" aria-label="' + esc(T('n.sort.dist')) + '">' +
          '<button type="button" data-sort="dist" aria-pressed="' + (state.sort === 'dist') + '">' + esc(T('n.sort.dist')) + '</button>' +
          '<button type="button" data-sort="rating" aria-pressed="' + (state.sort === 'rating') + '">' + esc(T('n.sort.rating')) + '</button>' +
        '</div>' +
      '</div>' +
      '<div id="results">' + resultsHTML() + '</div>';
  }

  function render(main) {
    if (!main || !data) {
      return;
    }
    main.innerHTML = '<div class="app-stack">' + controlsHTML() + '</div>';
    if (state.sheetId !== null && sheet && sheet.classList.contains('is-open')) {
      showSheet(state.sheetId, true);
    } else {
      state.sheetId = null;
    }
  }

  function placeById(id) {
    var found = null;
    data.places.forEach(function (p) {
      if (p.id === Number(id)) {
        found = p;
      }
    });
    return found;
  }

  function ensureSheet() {
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.className = 'hs-sheet';
      sheet.id = 'hs-sheet';
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-hidden', 'true');
      sheet.setAttribute('tabindex', '-1');
      document.body.appendChild(sheet);
    }
    return sheet;
  }

  function sheetHTML(p) {
    var o = openNow(p);
    var tags = p.tags[lang()].map(function (t) { return '<span class="app-pill">' + esc(t) + '</span>'; }).join('');
    return '<div class="app-handle"></div>' +
      '<div class="app-sheet-head"><span class="app-ic-square">' + icon(CAT_ICON[p.category]) + '</span>' +
        '<div><div class="app-label">' + esc(T(CAT_KEY[p.category])) + '</div>' +
        '<h2 id="hs-sheet-title">' + esc(p.name[lang()]) + '</h2></div></div>' +
      '<div class="app-meta app-sheet-meta">' +
        '<span class="app-star">' + icon('star') + num(p.rating, 1) + '</span>' +
        '<span>' + icon('walk') + esc(T('n.min', num(walkMinutes(p.distance_m)))) + '</span>' +
        '<span>' + esc('$'.repeat(p.price)) + '</span>' + pill(p) + '</div>' +
      '<p style="margin-block-start:var(--space-3)">' + esc(p.description[lang()]) + '</p>' +
      '<div class="app-meta app-hours">' + icon('clock') + esc(T('n.hours')) + ': ' + esc(hours(p)) + '</div>' +
      '<div class="app-tags">' + tags + '</div>' +
      '<div class="app-sheet-actions">' +
        '<button class="app-btn" type="button" data-soon>' + icon('nav', 'hs-flip') + esc(T('n.dir')) + '</button>' +
        '<button class="app-btn secondary" type="button" data-soon>' + icon('phone') + esc(T('n.call')) + '</button>' +
        '<button class="app-btn secondary" type="button" data-soon>' + icon('save') + esc(T('n.save')) + '</button>' +
      '</div>';
  }

  function showSheet(id, rebuildOnly) {
    var p = placeById(id);
    if (!p) {
      return;
    }
    var el = ensureSheet();
    el.innerHTML = sheetHTML(p);
    el.setAttribute('aria-labelledby', 'hs-sheet-title');
    state.sheetId = p.id;
    if (!rebuildOnly) {
      window.HotelShell.openSheet(el);
    } else {
      el.focus();
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) {
      return;
    }
    var main = document.getElementById('hs-main');
    if (!main || !main.contains(t)) {
      return;
    }
    var catBtn = t.closest('[data-cat]');
    if (catBtn) {
      state.cat = catBtn.getAttribute('data-cat');
      syncControls();
      updateResults();
      return;
    }
    var sortBtn = t.closest('[data-sort]');
    if (sortBtn) {
      state.sort = sortBtn.getAttribute('data-sort');
      syncControls();
      updateResults();
      return;
    }
    if (t.closest('#openT')) {
      state.open = !state.open;
      syncControls();
      updateResults();
      return;
    }
    if (t.closest('[data-clear]')) {
      state.q = '';
      state.cat = 'all';
      state.open = false;
      render(document.getElementById('hs-main'));
      var input = document.getElementById('q');
      if (input) {
        input.focus();
      }
      return;
    }
    var row = t.closest('[data-id]');
    if (row) {
      showSheet(row.getAttribute('data-id'));
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'q') {
      state.q = e.target.value;
      updateResults();
    }
  });

  function openFromHash() {
    var m = /^#place=(\d+)$/.exec(window.location.hash);
    if (m && placeById(m[1])) {
      showSheet(m[1]);
    }
  }

  HotelApp.renderShell('nearby');
  HotelApp.setScreen(render);
  HotelApp.applyLang(HotelShell.getLang());
  HotelApp.loadJSON('/app/data/places.json').then(function (d) {
    data = d;
    render(document.getElementById('hs-main'));
    openFromHash();
  }).catch(function () {
    data = null;
  });
})();
