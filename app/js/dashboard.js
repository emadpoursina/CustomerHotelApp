/*
 * Dashboard screen (contracts/app-screens.md §4, dashboard-data.md §3). Classic script.
 * Reads only /app/data/dashboard.json (aggregates, written by scripts/build-dashboard.py).
 * Polls every 5 s while the page is visible and refreshes on becoming visible again.
 */
(function () {
  'use strict';

  var T = window.HotelI18n.t;
  var num = window.HotelI18n.num;
  var icon = HotelApp.icon;
  var URL_JSON = '/app/data/dashboard.json';
  var POLL_MS = 3000;
  var STALE_S = 60;
  var LOW_SAMPLE = 10;
  var RANGES = [['7d', 'db.7'], ['30d', 'db.30'], ['all', 'db.all']];
  var DEPTS = [
    ['all', 'inbox.all'],
    ['restaurant', 'dept.restaurant'],
    ['reception', 'dept.reception'],
    ['facilities', 'dept.facilities'],
    ['housekeeping', 'dept.housekeeping']
  ];
  var CATS = ['db.cat.overall', 'db.cat.cleanliness', 'db.cat.comfort', 'db.cat.staff', 'db.cat.breakfast', 'db.cat.facilities'];

  var state = { range: '30d', dept: 'all', data: null, error: false, key: null };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function lang() {
    return document.documentElement.lang === 'fa' ? 'fa' : 'en';
  }

  function pct(part, whole) {
    var v = whole ? Math.round((part / whole) * 100) : 0;
    return num(v) + (lang() === 'fa' ? '٪' : '%');
  }

  function signed(score) {
    if (score > 0) {
      return '+' + num(score);
    }
    if (score < 0) {
      return '−' + num(-score);
    }
    return num(0);
  }

  function clock(iso) {
    var d = new Date(iso);
    var hh = d.getHours();
    var mm = d.getMinutes();
    return (hh < 10 ? num(0) : '') + num(hh) + ':' + (mm < 10 ? num(0) : '') + num(mm);
  }

  function chips() {
    var rangeChips = '<div class="app-range" role="group" aria-label="' + esc(T('db.view')) + '">' +
      '<span class="app-label">' + esc(T('db.view')) + '</span>' +
      '<div class="app-seg">' + RANGES.map(function (r) {
        return '<button type="button" data-range="' + r[0] + '" aria-pressed="' + (state.range === r[0]) + '">' + esc(T(r[1])) + '</button>';
      }).join('') + '</div></div>';

    var deptChips = '<div class="app-range" role="group" aria-label="Department">' +
      '<div class="app-chips">' + DEPTS.map(function (d) {
        var act = state.dept === d[0] ? ' is-active' : '';
        return '<button class="app-chip' + act + '" type="button" data-dept="' + d[0] + '">' + esc(T(d[1])) + '</button>';
      }).join('') + '</div></div>';

    return '<div class="app-chips-wrap">' + rangeChips + deptChips + '</div>';
  }

  function note(text) {
    return '<div class="app-note" role="note">' + icon('alert') + '<span>' + esc(text) + '</span></div>';
  }

  function unavailable() {
    return '<div class="app-card app-empty">' + icon('alert') + '<p class="app-muted">' + esc(T('db.unavailable')) + '</p></div>';
  }

  function figures(r, data) {
    var n = r.total;
    var cats = r.categories;
    var overall = cats[0].avg;
    var nps = r.nps;
    var bestIdx = -1;
    cats.forEach(function (c, i) {
      if (c.avg !== null && (bestIdx === -1 || c.avg > cats[bestIdx].avg)) {
        bestIdx = i;
      }
    });
    var parts = [];
    if (n > 0 && n < LOW_SAMPLE) {
      parts.push(note(T('db.low', num(n))));
    }
    if (data.stale) {
      parts.push(note(T('db.stale', clock(data.generatedAt))));
    }
    var hasScores = cats.some(function (c) { return c.avg !== null; }) || (nps && nps.n > 0);
    if (hasScores) {
      parts.push('<div class="app-kpis">' +
        '<div class="app-card app-kpi"><span>' + esc(T('db.total')) + '</span><b>' + num(n) + '</b></div>' +
        '<div class="app-card app-kpi"><span>' + esc(T('db.avg')) + '</span><b>' + (overall === null ? '–' : num(overall, 1)) + '</b><span>/ ' + num(5) + '</span></div>' +
        '<div class="app-card app-kpi"><span>' + esc(T('db.nps')) + '</span><b><bdi dir="ltr">' + signed(nps.score === null ? 0 : nps.score) + '</bdi></b></div>' +
        '</div>');
      parts.push('<div class="app-card"><div class="app-card-head"><h2>' + esc(T('db.nps')) + '</h2><span class="app-small app-muted">' + esc(T('db.npsHelp')) + '</span></div>' +
        '<div class="app-nps-bar"><i style="width:' + (nps.n ? (nps.detractors / nps.n) * 100 : 0) + '%"></i>' +
        '<i style="width:' + (nps.n ? (nps.passives / nps.n) * 100 : 0) + '%"></i>' +
        '<i style="width:' + (nps.n ? (nps.promoters / nps.n) * 100 : 0) + '%"></i></div>' +
        '<div class="app-legend"><span><i class="k-det"></i>' + esc(T('db.det')) + ' ' + pct(nps.detractors, nps.n) + '</span>' +
        '<span><i class="k-pas"></i>' + esc(T('db.pas')) + ' ' + pct(nps.passives, nps.n) + '</span>' +
        '<span><i class="k-pro"></i>' + esc(T('db.pro')) + ' ' + pct(nps.promoters, nps.n) + '</span></div></div>');
      parts.push('<div class="app-card"><div class="app-card-head"><h2>' + esc(T('db.cats')) + '</h2><span class="app-small app-muted">' + esc(T('db.n', num(n))) + '</span></div>' +
        cats.map(function (c, i) {
          var w = c.avg === null ? 0 : (c.avg / 5) * 100;
          return '<div class="app-cat' + (i === bestIdx ? ' top' : '') + '"><span>' + esc(T(CATS[i])) + '</span>' +
            '<b>' + (c.avg === null ? '–' : num(c.avg, 1)) + '</b>' +
            '<small>' + esc(T('db.n', num(c.n))) + '</small>' +
            '<div class="app-track"><i style="width:' + w + '%"></i></div></div>';
        }).join('') + '</div>');
    } else {
      parts.push('<div class="app-kpis">' +
        '<div class="app-card app-kpi"><span>' + esc(T('db.total')) + '</span><b>' + num(n) + '</b></div>' +
        '</div>');
    }
    var en = r.languages.en;
    var fa = r.languages.fa;
    parts.push('<div class="app-card"><div class="app-card-head"><h2>' + esc(T('db.lang')) + '</h2><span class="app-small app-muted">' + esc(T('db.n', num(n))) + '</span></div>' +
      '<div class="app-split"><i style="width:' + (n ? (en / n) * 100 : 0) + '%"></i><i style="width:' + (n ? (fa / n) * 100 : 0) + '%"></i></div>' +
      '<div class="app-legend"><span><i class="k-en"></i><bdi>' + esc(T('lang.en')) + '</bdi> <bdi dir="ltr">' + pct(en, n) + '</bdi></span>' +
      '<span><i class="k-fa"></i><bdi lang="fa">' + esc(T('lang.fa')) + '</bdi> <bdi dir="ltr">' + pct(fa, n) + '</bdi></span></div></div>');
    return parts.join('');
  }

  function render(main) {
    if (!main) {
      return;
    }
    var html;
    if (state.error || !state.data) {
      html = unavailable();
    } else {
      var r;
      if (state.dept === 'all') {
        r = state.data.ranges[state.range];
      } else if (state.data.byDepartment && state.data.byDepartment[state.dept]) {
        r = state.data.byDepartment[state.dept][state.range];
      }
      if (!r || r.total === 0) {
        html = chips() + '<div class="app-card app-empty">' + icon('chart') + '<p class="app-muted">' + esc(T('db.none')) + '</p></div>';
      } else {
        html = chips() + figures(r, state.data) +
          '<p class="app-foot-note">' + esc(T('db.privacy')) + '<br>' + esc(T('db.updated', clock(state.data.generatedAt))) + '</p>';
      }
    }
    main.innerHTML = '<div class="app-stack">' + html + '</div>';
  }

  function classify(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || !snapshot.ranges || !snapshot.generatedAt) {
      return null;
    }
    var age = (Date.now() - new Date(snapshot.generatedAt).getTime()) / 1000;
    snapshot.stale = age > STALE_S;
    return snapshot;
  }

  function refresh(force) {
    var url = URL_JSON + '?t=' + Date.now();
    HotelApp.loadJSON(url).then(function (snap) {
      var ok = classify(snap);
      if (!ok) {
        state.error = true;
        state.data = null;
        state.key = 'error';
      } else {
        var key = ok.generatedAt + '|' + ok.stale + '|' + ok.ranges['7d'].total + '|' + ok.ranges['30d'].total + '|' + ok.ranges.all.total;
        state.error = false;
        if (!force && key === state.key) {
          return;
        }
        state.key = key;
        state.data = ok;
      }
      render(document.getElementById('hs-main'));
    }).catch(function () {
      if (state.key === 'error' && !force) {
        return;
      }
      state.error = true;
      state.data = null;
      state.key = 'error';
      render(document.getElementById('hs-main'));
    });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element)) {
      return;
    }
    var b = t.closest('[data-range]');
    if (b && document.getElementById('hs-main').contains(b)) {
      state.range = b.getAttribute('data-range');
      render(document.getElementById('hs-main'));
      return;
    }
    var d = t.closest('[data-dept]');
    if (d && document.getElementById('hs-main').contains(d)) {
      state.dept = d.getAttribute('data-dept');
      render(document.getElementById('hs-main'));
    }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      refresh(true);
    }
  });

  window.setInterval(function () {
    if (document.visibilityState === 'visible') {
      refresh(false);
    }
  }, POLL_MS);

  HotelApp.renderShell('dash');
  HotelApp.setScreen(render);
  HotelApp.applyLang(HotelShell.getLang());
  refresh(true);
})();
