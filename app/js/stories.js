/*
 * Guest stories wall (contracts/inbox-stories-ui.md §3). Classic script, vanilla DOM.
 * Renders approved anonymous guest comments from /app/api/stories.php.
 */
(function () {
  'use strict';

  var T = window.HotelI18n.t;
  var num = window.HotelI18n.num;
  var icon = HotelApp.icon;

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    var clean = dateStr.replace(' ', 'T');
    var ts = Date.parse(clean.indexOf('Z') === -1 ? clean + 'Z' : clean);
    if (isNaN(ts)) {
      ts = Date.parse(clean);
    }
    if (isNaN(ts)) {
      return dateStr;
    }
    var diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) {
      return T('time.now');
    }
    var mins = Math.floor(diffSec / 60);
    if (mins < 60) {
      return T('time.mins', num(mins));
    }
    var hours = Math.floor(mins / 60);
    if (hours < 24) {
      return T('time.hours', num(hours));
    }
    var days = Math.floor(hours / 24);
    return T('time.days', num(days));
  }

  function deptLabel(dept) {
    if (dept === 'restaurant') return T('dept.restaurant');
    if (dept === 'reception') return T('dept.reception');
    if (dept === 'facilities') return T('dept.facilities');
    if (dept === 'housekeeping') return T('dept.housekeeping');
    return dept || '';
  }

  var state = {
    items: [],
    loading: true,
    error: false
  };

  function loadStories(main) {
    state.loading = true;
    state.error = false;
    render(main);

    fetch('/app/api/stories.php', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        state.loading = false;
        if (data && data.ok && Array.isArray(data.items)) {
          state.items = data.items;
        } else {
          state.items = [];
        }
        render(main);
      })
      .catch(function () {
        state.loading = false;
        state.error = true;
        render(main);
      });
  }

  function render(main) {
    if (!main) return;

    if (state.loading) {
      main.innerHTML = '<div class="app-stack"><div class="app-inbox-loading" aria-busy="true">' + icon('refresh') + '</div></div>';
      return;
    }

    if (state.error) {
      main.innerHTML = '<div class="app-stack">' +
        '<div class="app-empty">' +
          '<h3>' + esc(T('stories.error.t')) + '</h3>' +
          '<p>' + esc(T('stories.error.d')) + '</p>' +
          '<button class="app-btn app-btn-primary" type="button" id="btn-retry">' + esc(T('stories.retry')) + '</button>' +
        '</div>' +
      '</div>';
      var retryBtn = main.querySelector('#btn-retry');
      if (retryBtn) {
        retryBtn.addEventListener('click', function () {
          loadStories(main);
        });
      }
      return;
    }

    if (state.items.length === 0) {
      main.innerHTML = '<div class="app-stack">' +
        '<div class="app-empty">' +
          '<h3>' + esc(T('stories.empty.t')) + '</h3>' +
          '<p>' + esc(T('stories.empty.d')) + '</p>' +
        '</div>' +
      '</div>';
      return;
    }

    var cardsHtml = state.items.map(function (it, idx) {
      var dLabel = deptLabel(it.department);
      var timeStr = formatRelativeTime(it.submittedAt);
      var deptClass = it.department ? ' dept-' + it.department : '';

      var comment = [it.praise, it.complaint].filter(Boolean).join('\n\n');
      var sections = comment
        ? ['<div class="app-story-section"><p class="app-story-text">' + esc(comment) + '</p></div>']
        : [];
      var combinedLen = comment.length;
      var needsToggle = combinedLen > 240;

      return '<article class="app-card app-story-card' + deptClass + (needsToggle ? ' is-collapsible' : '') + '" data-card-idx="' + idx + '">' +
        '<div class="app-story-head">' +
          '<span class="app-story-dept">' + esc(dLabel) + '</span>' +
          '<span class="app-story-time">' + esc(timeStr) + '</span>' +
        '</div>' +
        '<div class="app-story-body">' + sections.join('') + '</div>' +
        (needsToggle ?
          '<button class="app-story-toggle" type="button" aria-expanded="false">' +
            '<span class="app-story-more">' + esc(T('stories.more')) + '</span>' +
            '<span class="app-story-less">' + esc(T('stories.less')) + '</span>' +
          '</button>' : '') +
      '</article>';
    }).join('');

    main.innerHTML = '<div class="app-stack">' +
      '<div class="app-stories-list">' + cardsHtml + '</div>' +
    '</div>';

    var toggleBtns = main.querySelectorAll('.app-story-toggle');
    for (var i = 0; i < toggleBtns.length; i++) {
      toggleBtns[i].addEventListener('click', function () {
        var card = this.closest('.app-story-card');
        var expanded = card.classList.toggle('is-expanded');
        this.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      });
    }
  }

  HotelApp.renderShell('stories');
  HotelApp.setScreen(render);
  HotelApp.applyLang(HotelShell.getLang());
  loadStories(document.getElementById('hs-main'));
})();
