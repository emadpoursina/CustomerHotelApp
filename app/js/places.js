/*
 * Nearby places data for Home and Nearby. Classic script, exposes window.HotelPlaces only.
 *
 * Source order: /app/api/places.php (Google Places through the server, or the demo data when no key is set),
 * then the static demo file if the endpoint itself is unreachable. Both return the same shape:
 *   { source: 'google' | 'demo', timezone, places: [...], highlights: [...], providers?: [...] }
 * Opening hours are evaluated in the complex's time zone, not the guest phone's.
 */
(function () {
  'use strict';

  var API_URL = '/app/api/places.php';
  var DEMO_URL = '/app/data/places.json';
  var WEEK = 10080;
  var DAY = 1440;
  var CAT_ICON = { restaurant: 'food', cafe: 'cafe', poi: 'poi', all: 'all' };
  var CAT_KEY = { restaurant: 'n.restaurant', cafe: 'n.cafe', poi: 'n.poi', all: 'n.all' };
  var promise = null;

  function T() { return window.HotelI18n.t.apply(null, arguments); }
  function num(x, d) { return window.HotelI18n.num(x, d); }

  function valid(d) {
    return !!(d && typeof d === 'object' && Array.isArray(d.places));
  }

  function load() {
    if (!promise) {
      promise = HotelApp.loadJSON(API_URL).then(function (d) {
        if (!valid(d)) {
          throw new Error('bad places payload');
        }
        return d;
      }).catch(function () {
        return HotelApp.loadJSON(DEMO_URL).then(function (d) {
          if (!valid(d)) {
            throw new Error('bad demo payload');
          }
          d.source = 'demo';
          return d;
        });
      }).then(function (d) {
        d.highlights = Array.isArray(d.highlights) ? d.highlights : [];
        return d;
      });
      promise.catch(function () { promise = null; });
    }
    return promise;
  }

  // Current day (0 = Sunday) and minute of the day in the given IANA time zone.
  function zonedNow(tz) {
    var d = new Date();
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz || undefined, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).formatToParts(d);
      var map = {};
      parts.forEach(function (x) { map[x.type] = x.value; });
      var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(map.weekday);
      var h = parseInt(map.hour, 10) % 24;
      var m = parseInt(map.minute, 10);
      if (day >= 0 && !isNaN(h) && !isNaN(m)) {
        return { day: day, min: h * 60 + m };
      }
    } catch (e) {
      // Unknown time zone: fall back to the device clock.
    }
    return { day: d.getDay(), min: d.getHours() * 60 + d.getMinutes() };
  }

  // Opening periods for both sources: Google gives p.opening, the demo file gives p.hours = [open, close] in hours.
  function opening(p) {
    if (p.opening && (p.opening.always || Array.isArray(p.opening.periods))) {
      return p.opening;
    }
    if (Array.isArray(p.hours) && p.hours.length === 2) {
      if (p.hours[0] === 0 && p.hours[1] >= 24) {
        return { always: true, periods: [] };
      }
      var o = Math.round(p.hours[0] * 60);
      var c = Math.round(p.hours[1] * 60);
      if (c <= o) {
        c += DAY;
      }
      var periods = [];
      for (var d = 0; d < 7; d++) {
        periods.push([d * DAY + o, d * DAY + c]);
      }
      return { always: false, periods: periods };
    }
    return null;
  }

  // true, false, or null when the hours are unknown.
  function isOpen(p, data) {
    var op = opening(p);
    if (!op) {
      return null;
    }
    if (op.always) {
      return true;
    }
    var now = zonedNow(data && data.timezone);
    var t = now.day * DAY + now.min;
    return op.periods.some(function (r) {
      return (r[0] <= t && t < r[1]) || (r[0] <= t + WEEK && t + WEEK < r[1]);
    });
  }

  function clock(min) {
    var m = ((min % DAY) + DAY) % DAY;
    var h = Math.floor(m / 60);
    var mm = m % 60;
    return (h < 10 ? num(0) : '') + num(h) + ':' + (mm < 10 ? num(0) : '') + num(mm);
  }

  // Today's hours as display text, e.g. "09:00 – 23:30", in the complex's time zone.
  function todayHours(p, data) {
    var op = opening(p);
    if (!op) {
      return T('n.hoursUnknown');
    }
    if (op.always) {
      return T('n.24h');
    }
    var today = zonedNow(data && data.timezone).day;
    var spans = op.periods.filter(function (r) {
      return Math.floor(r[0] / DAY) % 7 === today;
    }).map(function (r) {
      return clock(r[0]) + '–' + clock(r[1]);
    });
    var sep = document.documentElement.lang === 'fa' ? '، ' : ', ';
    return spans.length ? spans.join(sep) : T('n.closedToday');
  }

  function distance(m) {
    return m < 1000 ? T('n.m', num(m)) : T('n.km', num(m / 1000, 1));
  }

  function walkMinutes(m) {
    return Math.max(1, Math.round(m / 80));
  }

  function price(p) {
    return p.price ? new Array(p.price + 1).join('$') : '';
  }

  // Only absolute https links are used as hrefs; anything else is dropped.
  function safeUrl(u) {
    if (typeof u !== 'string') {
      return null;
    }
    try {
      var parsed = new URL(u);
      return parsed.protocol === 'https:' ? parsed.href : null;
    } catch (e) {
      return null;
    }
  }

  function safeTel(s) {
    return (typeof s === 'string' && /^\+?[0-9]{5,16}$/.test(s)) ? s : null;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Google Maps attribution (Places API policies): not translated, not wrapped, sans-serif 400, grey.
  // Third-party providers, when Google names any, are credited next to it.
  function attribution(data) {
    if (!data || data.source !== 'google') {
      return '';
    }
    var providers = Array.isArray(data.providers) && data.providers.length
      ? '<span class="app-attrib-providers">' + esc(T('n.dataBy')) + ': ' + data.providers.map(esc).join(', ') + '</span>'
      : '';
    return '<p class="app-attrib"><span class="app-attrib-gm" translate="no" lang="en" dir="ltr">Google Maps</span>' + providers + '</p>';
  }

  function byId(data, id) {
    var key = String(id);
    for (var i = 0; i < data.places.length; i++) {
      if (String(data.places[i].id) === key) {
        return data.places[i];
      }
    }
    return null;
  }

  window.HotelPlaces = {
    CAT_ICON: CAT_ICON,
    CAT_KEY: CAT_KEY,
    load: load,
    isOpen: isOpen,
    todayHours: todayHours,
    distance: distance,
    walkMinutes: walkMinutes,
    price: price,
    safeUrl: safeUrl,
    safeTel: safeTel,
    attribution: attribution,
    byId: byId,
    esc: esc
  };
})();
