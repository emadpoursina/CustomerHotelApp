/*
 * Guest app core: shell rendering, language, JSON loading (contracts/app-screens.md, app-shell.md §2).
 * Classic script, no build step. Exposes window.HotelApp only.
 * Screen text is inserted with textContent or escaped strings; icons are static inline SVG.
 */
(function () {
  'use strict';

  // Survey 420001, no lang parameter (research R-05, R-18).
  var SURVEY_URL = '/index.php/420001';

  var P = {
    // Brand mark: a pointed Persian arch over the lake (docs/brand.md). Same paths as icons.twig.
    mark: '<path d="M5.5 20.5V11.8C5.5 8.4 8.3 5.9 12 3c3.7 2.9 6.5 5.4 6.5 8.8v8.7"/><path d="M8.5 15.2c1.2 0 1.2-.9 2.4-.9s1.2.9 2.4.9 1.2-.9 2.4-.9"/><path d="M8.5 18.2c1.2 0 1.2-.9 2.4-.9s1.2.9 2.4.9 1.2-.9 2.4-.9"/><path d="M3 20.5h18"/><path d="M12 6.6v1.6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    chart: '<path d="M4 20V11M10 20V5M16 20v-8M21 20H3"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chev: '<path d="M9 6l6 6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    food: '<path d="M7 3v7a2 2 0 0 0 4 0V3M9 12v9M17 3c-2.2 1.5-2.2 7 0 8.5V21"/>',
    cafe: '<path d="M4 9h12v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M12 3v3"/>',
    poi: '<path d="M3 21h18M5 21V10M19 21V10M9.5 21V10M14.5 21V10M2.5 10L12 4l9.5 6z"/>',
    all: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    bed: '<path d="M3 18V7M3 13h18v5M21 18v-5a3 3 0 0 0-3-3h-7v3"/><circle cx="7" cy="10.5" r="1.5"/>',
    sparkle: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".6"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16.5 6.5l3 3"/>',
    leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15z"/><path d="M5 19l7-7"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    nav: '<path d="M3 11l18-8-8 18-2-8z"/>',
    save: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    gear: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.2"/><circle cx="15" cy="17" r="2.2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    alert: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17h.01"/>',
    walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6 3 3v3M9 12l2-4 4 2 2 3M11 8l-3 3-1 3"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'
  };

  function icon(name, cls) {
    return '<svg class="hs-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (P[name] || '') + '</svg>';
  }

  var T = function (k) { return window.HotelI18n.t.apply(null, arguments); };
  var state = { route: 'home', screen: null };

  function ensureMount(id, before) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      if (before) {
        before.parentNode.insertBefore(el, before);
      } else {
        document.body.appendChild(el);
      }
    }
    return el;
  }

  // Both brand names, the current language first. Each name carries its own lang and direction.
  function brandNames(lang) {
    var fa = '<div class="hs-brand-fa" lang="fa" dir="rtl">' + T('brand.fa') + '</div>';
    var en = '<div class="hs-brand-en" lang="en" dir="ltr">' + T('brand.en') + '</div>';
    return '<div class="hs-brand hs-brand-' + lang + '">' + (lang === 'fa' ? fa + en : en + fa) + '</div>';
  }

  // Shell markup (contracts/app-shell.md §2). Top mount sits above <main>, foot mount below it.
  function renderShell(route) {
    state.route = route;
    var top = ensureMount('hs-shell', document.getElementById('hs-main'));
    var foot = ensureMount('hs-shell-foot');
    var drawerWasOpen = !!document.getElementById('hs-drawer') && document.getElementById('hs-drawer').classList.contains('is-open');
    var focusLang = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-lang');
    var lang = document.documentElement.lang === 'fa' ? 'fa' : 'en';
    var cur = function (r) { return state.route === r ? ' aria-current="page"' : ''; };

    top.innerHTML =
      '<header class="hs-appbar">' +
        '<button class="hs-icon-btn" id="hs-menu" type="button" aria-controls="hs-drawer" aria-expanded="' + (drawerWasOpen ? 'true' : 'false') + '" aria-label="' + T('menu') + '">' + icon('menu') + '</button>' +
        '<h1 class="hs-title"><span class="hs-mark">' + icon('mark') + '</span><span class="hs-title-text">' + T({ home: 'title.home', nearby: 'title.nearby', rate: 'title.rate', dash: 'title.dash' }[state.route]) + '</span></h1>' +
        '<button class="hs-icon-btn" type="button" data-soon aria-label="' + T('notifications') + '">' + icon('bell') + '<span class="hs-dot"></span></button>' +
      '</header>';

    foot.innerHTML =
      '<div class="hs-scrim" id="hs-scrim"' + (drawerWasOpen ? '' : ' hidden') + '></div>' +
      '<aside class="hs-drawer' + (drawerWasOpen ? ' is-open' : '') + '" id="hs-drawer" aria-hidden="' + (drawerWasOpen ? 'false' : 'true') + '" aria-label="' + T('menu') + '">' +
        '<header class="hs-d-head">' +
          '<span class="hs-d-mark">' + icon('mark') + '</span>' +
          brandNames(lang) +
          '<div class="hs-d-place">' + T('brand.place') + '</div>' +
        '</header>' +
        '<nav class="hs-d-nav">' +
          '<a class="hs-d-item" href="/app/index.html"' + cur('home') + '>' + icon('home') + T('tab.home') + '</a>' +
          '<a class="hs-d-item" href="' + SURVEY_URL + '"' + cur('rate') + '>' + icon('star') + T('title.rate') + '</a>' +
          '<a class="hs-d-item" href="/app/nearby.html"' + cur('nearby') + '>' + icon('pin') + T('tab.nearby') + '</a>' +
          '<a class="hs-d-item" href="/app/dashboard.html"' + cur('dash') + '>' + icon('chart') + T('tab.dash') + '</a>' +
          '<div class="hs-d-sep"></div>' +
          '<button class="hs-d-item" type="button" data-soon>' + icon('bed') + T('d.mystay') + '<span class="hs-soon">' + T('d.soon') + '</span></button>' +
          '<button class="hs-d-item" type="button" data-soon>' + icon('sparkle') + T('d.room') + '<span class="hs-soon">' + T('d.soon') + '</span></button>' +
          '<button class="hs-d-item" type="button" data-soon>' + icon('wifi') + T('d.wifi') + '<span class="hs-soon">' + T('d.soon') + '</span></button>' +
          '<button class="hs-d-item" type="button" data-soon>' + icon('gear') + T('d.settings') + '<span class="hs-soon">' + T('d.soon') + '</span></button>' +
          '<div class="hs-d-sep"></div>' +
          '<div class="hs-d-lang">' +
            '<div class="hs-d-label">' + icon('globe') + T('d.lang') + '</div>' +
            '<div class="hs-seg" role="group" aria-label="' + T('d.lang') + '">' +
              '<button type="button" data-lang="en" aria-pressed="' + (lang === 'en') + '">English</button>' +
              '<button type="button" data-lang="fa" aria-pressed="' + (lang === 'fa') + '" lang="fa">فارسی</button>' +
            '</div>' +
          '</div>' +
        '</nav>' +
        '<footer class="hs-d-foot">' + T('demo') + '</footer>' +
      '</aside>' +
      '<nav class="hs-tabbar" aria-label="' + T('nav.main') + '">' +
        '<a class="hs-tab" href="/app/index.html"' + cur('home') + '>' + icon('home') + T('tab.home') + '</a>' +
        '<a class="hs-tab" href="/app/nearby.html"' + cur('nearby') + '>' + icon('pin') + T('tab.nearby') + '</a>' +
        '<a class="hs-tab hs-tab-center" href="' + SURVEY_URL + '"' + cur('rate') + '><span class="hs-bubble">' + icon('star') + '</span>' + T('tab.rate') + '</a>' +
        '<a class="hs-tab" href="/app/dashboard.html"' + cur('dash') + '>' + icon('chart') + T('tab.dash') + '</a>' +
        '<button class="hs-tab" type="button" data-soon>' + icon('grid') + T('tab.services') + '</button>' +
      '</nav>' +
      '<div class="hs-toast" id="hs-toast" role="status" aria-live="polite" data-soon-text="' + T('soon') + '">' + icon('info') + '<span class="hs-toast-text"></span></div>';

    if (focusLang) {
      var again = foot.querySelector('[data-lang="' + focusLang + '"]');
      if (again) { again.focus(); }
    }
  }

  function applyLang(lang) {
    var l = lang === 'fa' ? 'fa' : 'en';
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr';
    renderShell(state.route);
    if (state.screen) {
      state.screen(document.getElementById('hs-main'));
    }
  }

  function setScreen(fn) {
    state.screen = fn;
  }

  function loadJSON(url) {
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }
      return res.json();
    });
  }

  document.addEventListener('hotel:langchange', function (e) {
    applyLang(e.detail && e.detail.lang);
  });

  window.HotelApp = {
    SURVEY_URL: SURVEY_URL,
    icon: icon,
    brandNames: brandNames,
    renderShell: renderShell,
    applyLang: applyLang,
    setScreen: setScreen,
    loadJSON: loadJSON
  };
})();
