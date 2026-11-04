/*
 * Home screen (contracts/app-screens.md §2). Classic script, vanilla DOM.
 * Data: app/data/places.json (demo data). Strings: HotelI18n. Text is escaped before insertion.
 */
(function () {
  'use strict';

  var T = window.HotelI18n.t;
  var num = window.HotelI18n.num;
  var icon = HotelApp.icon;
  var places = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var CAT_ICON = { restaurant: 'food', cafe: 'cafe', poi: 'poi' };
  var CAT_KEY = { restaurant: 'n.restaurant', cafe: 'n.cafe', poi: 'n.poi' };

  function lang() {
    return document.documentElement.lang === 'fa' ? 'fa' : 'en';
  }

  function distance(m) {
    return m < 1000 ? T('n.m', num(m)) : T('n.km', num(m / 1000, 1));
  }

  function greeting() {
    var h = new Date().getHours();
    return T(h < 12 ? 'greet.m' : h < 17 ? 'greet.a' : 'greet.e');
  }

  function highlights() {
    if (!places) {
      return '';
    }
    var byId = {};
    places.places.forEach(function (p) { byId[p.id] = p; });
    var items = places.highlights.map(function (id) { return byId[id]; }).filter(Boolean);
    return '<div class="app-hscroll">' + items.map(function (p) {
      return '<a class="app-card app-mini" href="/app/nearby.html#place=' + esc(p.id) + '">' +
        '<span class="app-pill">' + icon(CAT_ICON[p.category]) + esc(T(CAT_KEY[p.category])) + '</span>' +
        '<h3>' + esc(p.name[lang()]) + '</h3>' +
        '<div class="app-meta"><span class="app-star">' + icon('star') + num(p.rating, 1) + '</span><span>' + esc(distance(p.distance_m)) + '</span></div>' +
        '</a>';
    }).join('') + '</div>';
  }

  var SERVICES = [['sparkle', 'qa.room'], ['bed', 'qa.house'], ['wifi', 'qa.wifi'], ['clock', 'qa.late'], ['key', 'qa.concierge'], ['leaf', 'qa.spa']];

  function render(main) {
    if (!main) {
      return;
    }
    main.innerHTML = '<div class="app-stack">' +
      '<section class="app-hero">' +
        '<p class="app-greet">' + esc(greeting()) + '</p>' +
        '<div class="app-wordmark" lang="en" dir="ltr">' + esc(T('brand.en')) + '</div>' +
        '<div class="app-faname" lang="fa">' + esc(T('brand.fa')) + '</div>' +
        '<p class="app-tagline">' + esc(T('tagline')) + '</p>' +
      '</section>' +
      '<a class="app-card app-rate" href="' + HotelApp.SURVEY_URL + '">' +
        '<span class="app-ic-round">' + icon('star') + '</span>' +
        '<span class="app-rate-body"><h2>' + esc(T('home.rate.t')) + '</h2><p>' + esc(T('home.rate.d')) + '</p></span>' +
        '<span class="app-chev hs-flip">' + icon('chev') + '</span>' +
      '</a>' +
      '<div class="app-section-head"><h2>' + esc(T('home.services')) + '</h2></div>' +
      '<div class="app-qa-grid">' + SERVICES.map(function (s) {
        return '<button class="app-qa" type="button" data-soon>' + icon(s[0]) + esc(T(s[1])) + '</button>';
      }).join('') + '</div>' +
      '<div class="app-section-head"><h2>' + esc(T('home.nearby')) + '</h2>' +
        '<a class="app-link" href="/app/nearby.html">' + esc(T('seeAll')) + '</a></div>' +
      highlights() +
      '</div>';
  }

  HotelApp.renderShell('home');
  HotelApp.setScreen(render);
  HotelApp.applyLang(HotelShell.getLang());
  HotelApp.loadJSON('/app/data/places.json').then(function (data) {
    places = data;
    render(document.getElementById('hs-main'));
  }).catch(function () {
    places = null;
  });
})();
