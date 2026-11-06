/*
 * Nearby screen (contracts/app-screens.md §3, data-model.md §4 and §7, research R-11 and R-12).
 * Classic script. Data: HotelPlaces (Google Places through /app/api/places.php, or demo data).
 * Text is escaped before insertion; links are https or tel only.
 */
(function () {
  'use strict';

  var T = window.HotelI18n.t;
  var num = window.HotelI18n.num;
  var fold = window.HotelI18n.fold;
  var icon = HotelApp.icon;
  var P = window.HotelPlaces;
  var esc = P.esc;

  var data = null;
  var status = 'loading';   // loading | ready | error
  var state = { q: '', cat: 'all', open: false, sort: 'dist', sheetId: null };
  var sheet = null;
  var CATS = ['all', 'restaurant', 'cafe', 'poi'];

  function lang() {
    return document.documentElement.lang === 'fa' ? 'fa' : 'en';
  }

  function live() {
    return !!data && data.source === 'google';
  }

  function matches(p) {
    var q = fold(state.q);
    if (state.cat !== 'all' && p.category !== state.cat) {
      return false;
    }
    if (state.open && P.isOpen(p, data) !== true) {
      return false;
    }
    if (q === '') {
      return true;
    }
    var fields = [p.name.en, p.name.fa];
    if (p.tags) {
      fields = fields.concat(p.tags.en || [], p.tags.fa || []);
    }
    if (p.address) {
      fields.push(p.address.en || '', p.address.fa || '');
    }
    return fields.some(function (s) { return fold(s).indexOf(q) !== -1; });
  }

  function tie(a, b) {
    return String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0;
  }

  function sorted(list) {
    var out = list.slice();
    if (state.sort === 'rating') {
      out.sort(function (a, b) {
        return ((b.rating || 0) - (a.rating || 0)) || (a.distance_m - b.distance_m) || tie(a, b);
      });
    } else {
      out.sort(function (a, b) {
        return (a.distance_m - b.distance_m) || tie(a, b);
      });
    }
    return out;
  }

  function pill(p) {
    var o = P.isOpen(p, data);
    if (o === null) {
      return '';
    }
    return '<span class="app-pill ' + (o ? 'ok' : 'closed') + '">' + esc(T(o ? 'n.isOpen' : 'n.isClosed')) + '</span>';
  }

  function meta(p) {
    var bits = [];
    if (p.rating) {
      bits.push('<span class="app-star">' + icon('star') + num(p.rating, 1) + '</span>');
    }
    bits.push('<span>' + esc(P.distance(p.distance_m)) + '</span>');
    var price = P.price(p);
    if (price) {
      bits.push('<span dir="ltr">' + esc(price) + '</span>');
    }
    return bits.join('<span class="app-dot" aria-hidden="true"></span>') + pill(p);
  }

  function skeleton() {
    var row = '<div class="app-card app-place app-skel" aria-hidden="true"><span class="app-ic-square"></span><span><i></i><i></i></span></div>';
    return '<p class="app-count" role="status">' + esc(T('n.loading')) + '</p><div class="app-list">' + row + row + row + row + '</div>';
  }

  function errorState() {
    return '<div class="app-empty">' + icon('alert') +
      '<h3>' + esc(T('n.error.t')) + '</h3>' +
      '<p class="app-muted app-small">' + esc(T('n.error.d')) + '</p>' +
      '<button class="app-btn app-btn-auto secondary" type="button" data-retry>' + icon('refresh') + esc(T('n.retry')) + '</button>' +
      '</div>';
  }

  function countLine(n) {
    var bits = [esc(T('n.results', num(n)))];
    if (live() && data.radius_m) {
      bits.push(esc(T('n.within', P.distance(data.radius_m))));
    }
    var badge = live() ? (data.stale ? '<span class="app-pill">' + esc(T('n.stale')) + '</span>' : '') : '<span class="app-pill">' + esc(T('n.demo')) + '</span>';
    return '<p class="app-count"><span>' + bits.join(' · ') + '</span>' + badge + '</p>';
  }

  function resultsHTML() {
    if (status === 'loading') {
      return skeleton();
    }
    if (status === 'error') {
      return errorState();
    }
    var list = sorted(data.places.filter(matches));
    if (!list.length) {
      return '<div class="app-empty">' + icon('search') +
        '<h3>' + esc(T('n.empty.t')) + '</h3>' +
        '<p class="app-muted app-small">' + esc(T('n.empty.d')) + '</p>' +
        '<button class="app-btn app-btn-auto secondary" type="button" data-clear>' + esc(T('n.clear')) + '</button>' +
        '</div>';
    }
    var rows = list.map(function (p) {
      return '<button class="app-card app-place" type="button" data-id="' + esc(p.id) + '">' +
        '<span class="app-ic-square">' + icon(P.CAT_ICON[p.category]) + '</span>' +
        '<span class="app-place-main"><h3>' + esc(p.name[lang()]) + '</h3>' +
          '<span class="app-meta">' + meta(p) + '</span></span>' +
        '<span class="app-chev hs-flip">' + icon('chev') + '</span>' +
        '</button>';
    }).join('');
    return countLine(list.length) + '<div class="app-list">' + rows + '</div>' + P.attribution(data);
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
    return '<div class="app-search">' + icon('search') +
        '<input id="q" type="search" value="' + esc(state.q) + '" placeholder="' + esc(T('n.search')) + '" aria-label="' + esc(T('n.search')) + '" autocomplete="off" enterkeyhint="search">' +
      '</div>' +
      '<div class="app-chips" role="group" aria-label="' + esc(T('n.all')) + '">' + CATS.map(function (c) {
        return '<button class="app-chip" type="button" data-cat="' + c + '" aria-pressed="' + (state.cat === c) + '">' +
          '<span class="app-chip-v">' + icon(P.CAT_ICON[c]) + esc(T(P.CAT_KEY[c])) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="app-toolbar">' +
        '<button class="app-toggle" type="button" id="openT" role="switch" aria-checked="' + state.open + '"><span class="app-switch"></span>' + esc(T('n.open')) + '</button>' +
        '<div class="app-seg" role="group" aria-label="' + esc(T('n.sort.dist')) + '">' +
          '<button type="button" data-sort="dist" aria-pressed="' + (state.sort === 'dist') + '">' + esc(T('n.sort.dist')) + '</button>' +
          '<button type="button" data-sort="rating" aria-pressed="' + (state.sort === 'rating') + '">' + esc(T('n.sort.rating')) + '</button>' +
        '</div>' +
      '</div>' +
      '<div id="results" aria-live="polite">' + resultsHTML() + '</div>';
  }

  function render(main) {
    if (!main) {
      return;
    }
    main.innerHTML = '<div class="app-stack">' + controlsHTML() + '</div>';
    if (state.sheetId !== null && sheet && sheet.classList.contains('is-open')) {
      showSheet(state.sheetId, true);
    } else {
      state.sheetId = null;
    }
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

  function actions(p) {
    var dir = live() ? P.safeUrl(p.directions_url) : null;
    var tel = live() ? P.safeTel(p.phone) : null;
    var out = dir
      ? '<a class="app-btn" href="' + esc(dir) + '" target="_blank" rel="noopener noreferrer">' + icon('nav', 'hs-flip') + esc(T('n.dir')) + '</a>'
      : '<button class="app-btn" type="button" data-soon>' + icon('nav', 'hs-flip') + esc(T('n.dir')) + '</button>';
    if (tel) {
      out += '<a class="app-btn secondary" href="tel:' + esc(tel) + '">' + icon('phone') + esc(T('n.call')) + '</a>';
    } else if (!live()) {
      out += '<button class="app-btn secondary" type="button" data-soon>' + icon('phone') + esc(T('n.call')) + '</button>';
    }
    out += '<button class="app-btn secondary" type="button" data-soon>' + icon('save') + esc(T('n.save')) + '</button>';
    return out;
  }

  function sheetHTML(p) {
    var l = lang();
    var tags = p.tags && p.tags[l] ? p.tags[l].map(function (t) { return '<span class="app-pill">' + esc(t) + '</span>'; }).join('') : '';
    var about = p.description && p.description[l] ? '<p class="app-sheet-desc">' + esc(p.description[l]) + '</p>' : '';
    var rows = '<div class="app-info-row">' + icon('clock') + '<span><b>' + esc(T('n.today')) + '</b> ' + esc(P.todayHours(p, data)) + '</span></div>';
    if (p.address && p.address[l]) {
      rows += '<div class="app-info-row">' + icon('pin') + '<span>' + esc(p.address[l]) + '</span></div>';
    }
    if (live() && p.phone_display && P.safeTel(p.phone)) {
      rows += '<div class="app-info-row">' + icon('phone') + '<span dir="ltr">' + esc(p.phone_display) + '</span></div>';
    }
    var reviews = p.rating_count ? '<span class="app-muted">(' + esc(T('n.reviews', num(p.rating_count))) + ')</span>' : '';
    var rating = p.rating ? '<span class="app-star">' + icon('star') + num(p.rating, 1) + ' ' + reviews + '</span>' : '';
    var price = P.price(p);
    return '<div class="app-handle"></div>' +
      '<div class="app-sheet-head"><span class="app-ic-square">' + icon(P.CAT_ICON[p.category]) + '</span>' +
        '<div><div class="app-label">' + esc(T(P.CAT_KEY[p.category])) + '</div>' +
        '<h2 id="hs-sheet-title">' + esc(p.name[l]) + '</h2></div></div>' +
      '<div class="app-meta app-sheet-meta">' + rating +
        '<span>' + icon('walk') + esc(T('n.min', num(P.walkMinutes(p.distance_m)))) + '</span>' +
        (price ? '<span dir="ltr">' + esc(price) + '</span>' : '') + pill(p) + '</div>' +
      about +
      '<div class="app-info">' + rows + '</div>' +
      (tags ? '<div class="app-tags">' + tags + '</div>' : '') +
      '<div class="app-sheet-actions">' + actions(p) + '</div>' +
      P.attribution(data);
  }

  function showSheet(id, rebuildOnly) {
    var p = data && P.byId(data, id);
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

  function load() {
    status = 'loading';
    updateResults();
    P.load().then(function (d) {
      data = d;
      status = 'ready';
      updateResults();
      openFromHash();
    }).catch(function () {
      status = 'error';
      updateResults();
    });
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
    if (t.closest('[data-retry]')) {
      load();
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
    var m = /^#place=([A-Za-z0-9_%-]+)$/.exec(window.location.hash);
    if (m) {
      var id;
      try {
        id = decodeURIComponent(m[1]);
      } catch (err) {
        return;
      }
      if (P.byId(data, id)) {
        showSheet(id);
      }
    }
  }

  HotelApp.renderShell('nearby');
  HotelApp.setScreen(render);
  HotelApp.applyLang(HotelShell.getLang());
  load();
})();
