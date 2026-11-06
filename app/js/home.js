/*
 * Home screen (contracts/app-screens.md §2). Classic script, vanilla DOM.
 * Data: HotelPlaces (Google Places through /app/api/places.php, or demo data). Text is escaped before insertion.
 */
(function () {
  'use strict';

  var T = window.HotelI18n.t;
  var num = window.HotelI18n.num;
  var icon = HotelApp.icon;
  var P = window.HotelPlaces;
  var esc = P.esc;
  var places = null;
  var failed = false;

  function lang() {
    return document.documentElement.lang === 'fa' ? 'fa' : 'en';
  }

  function greeting() {
    var h = new Date().getHours();
    return T(h < 12 ? 'greet.m' : h < 17 ? 'greet.a' : 'greet.e');
  }

  function pill(p) {
    var o = P.isOpen(p, places);
    if (o === null) {
      return '';
    }
    return '<span class="app-pill ' + (o ? 'ok' : 'closed') + '">' + esc(T(o ? 'n.isOpen' : 'n.isClosed')) + '</span>';
  }

  function highlights() {
    if (failed) {
      return '';
    }
    if (!places) {
      return '<div class="app-hscroll" aria-busy="true" aria-label="' + esc(T('n.loading')) + '">' +
        '<div class="app-card app-mini app-skel"><i></i><i></i><i></i></div>' +
        '<div class="app-card app-mini app-skel"><i></i><i></i><i></i></div></div>';
    }
    var items = places.highlights.map(function (id) { return P.byId(places, id); }).filter(Boolean);
    if (!items.length) {
      items = places.places.slice(0, 3);
    }
    return '<div class="app-hscroll">' + items.map(function (p) {
      var rating = p.rating ? '<span class="app-star">' + icon('star') + num(p.rating, 1) + '</span>' : '';
      return '<a class="app-card app-mini" href="/app/nearby.html#place=' + encodeURIComponent(String(p.id)) + '">' +
        '<span class="app-mini-top"><span class="app-ic-square sm">' + icon(P.CAT_ICON[p.category]) + '</span>' +
        '<span class="app-label">' + esc(T(P.CAT_KEY[p.category])) + '</span></span>' +
        '<h3>' + esc(p.name[lang()]) + '</h3>' +
        '<span class="app-meta">' + rating + '<span>' + esc(P.distance(p.distance_m)) + '</span>' + pill(p) + '</span>' +
        '</a>';
    }).join('') + '</div>' + P.attribution(places);
  }

  var SERVICES = [['sparkle', 'qa.room'], ['bed', 'qa.house'], ['wifi', 'qa.wifi'], ['clock', 'qa.late'], ['key', 'qa.concierge'], ['leaf', 'qa.spa']];

  function render(main) {
    if (!main) {
      return;
    }
    main.innerHTML = '<div class="app-stack">' +
      '<section class="app-hero">' +
        '<img class="app-hero-img" src="/app/img/kowsar-hero.jpg" alt="" width="546" height="336" decoding="async">' +
        '<div class="app-hero-body">' +
          '<p class="app-greet">' + esc(greeting()) + '</p>' +
          '<span class="app-hero-mark">' + icon('mark') + '</span>' +
          HotelApp.brandNames(lang()) +
          '<p class="app-hero-place">' + icon('pin') + '<span>' + esc(T('brand.place')) + '</span></p>' +
        '</div>' +
      '</section>' +
      '<a class="app-card app-rate" href="' + HotelApp.SURVEY_URL + '">' +
        '<span class="app-ic-round">' + icon('star') + '</span>' +
        '<span class="app-rate-body"><h2>' + esc(T('home.rate.t')) + '</h2><p>' + esc(T('home.rate.d')) + '</p></span>' +
        '<span class="app-go hs-flip">' + icon('arrow') + '</span>' +
      '</a>' +
      '<div class="app-section-head"><h2>' + esc(T('home.services')) + '</h2></div>' +
      '<div class="app-qa-grid">' + SERVICES.map(function (s) {
        return '<button class="app-qa" type="button" data-soon><span class="app-qa-ic">' + icon(s[0]) + '</span>' + esc(T(s[1])) + '</button>';
      }).join('') + '</div>' +
      (failed ? '' :
        '<div class="app-section-head"><h2>' + esc(T('home.nearby')) + '</h2>' +
          '<a class="app-link" href="/app/nearby.html">' + esc(T('seeAll')) + '</a></div>' +
        highlights()) +
      '</div>';
  }

  HotelApp.renderShell('home');
  HotelApp.setScreen(render);
  HotelApp.applyLang(HotelShell.getLang());
  P.load().then(function (data) {
    places = data;
    render(document.getElementById('hs-main'));
  }).catch(function () {
    failed = true;
    render(document.getElementById('hs-main'));
  });
})();
