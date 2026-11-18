/*
 * Inbox screen (contracts/inbox-stories-ui.md §2). Classic script, vanilla DOM.
 * List view shows scores and metadata only — no comment text.
 * Detail view shows comments and allows Publish / Keep private transitions.
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

  function getReadMap() {
    var map = {};
    try {
      var raw = window.localStorage.getItem('hotel.inbox.read');
      var arr = JSON.parse(raw || '[]');
      if (Array.isArray(arr)) {
        for (var i = 0; i < arr.length; i++) {
          map[arr[i]] = true;
        }
      }
    } catch (e) {}
    return map;
  }

  function markRead(id) {
    try {
      var raw = window.localStorage.getItem('hotel.inbox.read');
      var arr = JSON.parse(raw || '[]');
      if (!Array.isArray(arr)) {
        arr = [];
      }
      if (arr.indexOf(id) === -1) {
        arr.push(id);
        window.localStorage.setItem('hotel.inbox.read', JSON.stringify(arr));
      }
    } catch (e) {}
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

  function getQueryId() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('id');
    if (id && /^\d+$/.test(id)) {
      return parseInt(id, 10);
    }
    var hash = window.location.hash || '';
    var m = hash.match(/id=(\d+)/);
    if (m) {
      return parseInt(m[1], 10);
    }
    return null;
  }

  var state = {
    deptFilter: 'all',
    statusFilter: 'all',
    items: [],
    loading: true,
    error: null,
    detailItem: null,
    detailLoading: false,
    detailError: null
  };

  function renderList(main) {
    var readMap = getReadMap();
    var depts = [
      { id: 'all', label: T('inbox.all') },
      { id: 'restaurant', label: T('dept.restaurant') },
      { id: 'reception', label: T('dept.reception') },
      { id: 'facilities', label: T('dept.facilities') },
      { id: 'housekeeping', label: T('dept.housekeeping') }
    ];
    var statuses = [
      { id: 'all', label: T('inbox.all') },
      { id: 'unread', label: T('inbox.unread') },
      { id: 'pending', label: T('inbox.pending') },
      { id: 'published', label: T('inbox.published') },
      { id: 'private', label: T('inbox.private') }
    ];

    var deptChips = depts.map(function (d) {
      var act = state.deptFilter === d.id ? ' is-active' : '';
      return '<button class="app-chip' + act + '" type="button" data-dept="' + d.id + '">' + esc(d.label) + '</button>';
    }).join('');

    var statusChips = statuses.map(function (s) {
      var act = state.statusFilter === s.id ? ' is-active' : '';
      return '<button class="app-chip' + act + '" type="button" data-status="' + s.id + '">' + esc(s.label) + '</button>';
    }).join('');

    var filtered = state.items.filter(function (it) {
      if (state.deptFilter !== 'all' && it.department !== state.deptFilter) {
        return false;
      }
      if (state.statusFilter === 'unread' && readMap[it.id]) {
        return false;
      }
      if (state.statusFilter === 'pending' && it.state !== 'pending') {
        return false;
      }
      if (state.statusFilter === 'published' && it.state !== 'published') {
        return false;
      }
      if (state.statusFilter === 'private' && it.state !== 'private') {
        return false;
      }
      return true;
    });

    var bodyHtml = '';
    if (state.loading) {
      bodyHtml = '<div class="app-inbox-loading" aria-busy="true">' + icon('refresh') + '</div>';
    } else if (state.error) {
      bodyHtml = '<div class="app-empty"><p>' + esc(state.error) + '</p></div>';
    } else if (state.items.length === 0) {
      bodyHtml = '<div class="app-empty"><p>' + esc(T('inbox.empty')) + '</p></div>';
    } else if (filtered.length === 0) {
      bodyHtml = '<div class="app-empty"><p>' + esc(T('inbox.noMatch')) + '</p></div>';
    } else {
      bodyHtml = '<div class="app-inbox-list">' + filtered.map(function (it) {
        var isUnread = !readMap[it.id];
        var dLabel = deptLabel(it.department) || T('inbox.all');
        var timeStr = formatRelativeTime(it.submittedAt);
        var deptClass = it.department ? ' dept-' + it.department : '';
        var scoreHtml = (it.overall != null || it.nps != null)
          ? '<div class="app-inbox-scores">' + esc(T('inbox.score', it.overall != null ? num(it.overall) : '-', it.nps != null ? num(it.nps) : '-')) + '</div>'
          : '';
        return '<a class="app-inbox-row' + deptClass + (isUnread ? ' is-unread' : '') + '" href="/app/inbox.html?id=' + it.id + '">' +
          '<div class="app-inbox-stripe"></div>' +
          '<div class="app-inbox-content">' +
            '<div class="app-inbox-head">' +
              '<span class="app-inbox-dept">' + esc(dLabel) + '</span>' +
              (isUnread ? '<span class="app-inbox-dot" aria-label="' + esc(T('inbox.unread')) + '"></span>' : '') +
              '<span class="app-inbox-time">' + esc(timeStr) + '</span>' +
            '</div>' +
            scoreHtml +
          '</div>' +
          '<span class="app-go hs-flip">' + icon('arrow') + '</span>' +
        '</a>';
      }).join('') + '</div>';
    }

    main.innerHTML = '<div class="app-stack">' +
      '<div class="app-chips-wrap">' +
        '<div class="app-chips" role="group" aria-label="Department filters">' + deptChips + '</div>' +
        '<div class="app-chips" role="group" aria-label="Status filters">' + statusChips + '</div>' +
      '</div>' +
      bodyHtml +
    '</div>';

    var deptBtns = main.querySelectorAll('[data-dept]');
    for (var i = 0; i < deptBtns.length; i++) {
      deptBtns[i].addEventListener('click', function () {
        state.deptFilter = this.getAttribute('data-dept');
        renderList(main);
      });
    }

    var statusBtns = main.querySelectorAll('[data-status]');
    for (var j = 0; j < statusBtns.length; j++) {
      statusBtns[j].addEventListener('click', function () {
        state.statusFilter = this.getAttribute('data-status');
        renderList(main);
      });
    }
  }

  function handleAction(action, detailId, main) {
    fetch('/app/api/inbox.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'action', id: detailId, action: action })
    })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        return res.json();
      })
      .then(function (res) {
        if (res && res.ok && res.state) {
          if (state.detailItem) {
            state.detailItem.state = res.state;
          }
          renderDetail(main);
        }
      })
      .catch(function (err) {
        alert(err.message || 'Action failed');
      });
  }

  function renderDetail(main) {
    if (state.detailLoading) {
      main.innerHTML = '<div class="app-stack"><div class="app-inbox-loading" aria-busy="true">' + icon('refresh') + '</div></div>';
      return;
    }
    if (state.detailError || !state.detailItem) {
      main.innerHTML = '<div class="app-stack">' +
        '<a class="app-inbox-back" href="/app/inbox.html">' + icon('arrow') + '<span>' + esc(T('title.inbox')) + '</span></a>' +
        '<div class="app-empty"><p>' + esc(state.detailError || T('inbox.noMatch')) + '</p></div>' +
      '</div>';
      return;
    }

    var it = state.detailItem;
    var dLabel = deptLabel(it.department) || T('inbox.all');
    var scoreStr = (it.overall != null || it.nps != null)
      ? T('inbox.score', it.overall != null ? num(it.overall) : '-', it.nps != null ? num(it.nps) : '-')
      : '';
    var timeStr = T('inbox.submitted', formatRelativeTime(it.submittedAt));
    var comment = (it.praise || '') + ((it.praise && it.complaint) ? '\n\n' : '') + (it.complaint || '');
    var deptClass = it.department ? ' dept-' + it.department : '';

    var actionsHtml = '';
    if (it.state === 'pending') {
      actionsHtml = '<div class="app-detail-actions">' +
        '<button class="app-btn app-btn-primary" type="button" id="btn-publish">' + esc(T('inbox.publish')) + '</button>' +
        '<button class="app-btn app-btn-secondary" type="button" id="btn-private">' + esc(T('inbox.keepPrivate')) + '</button>' +
      '</div>';
    } else if (it.state === 'published') {
      actionsHtml = '<div class="app-detail-actions">' +
        '<span class="app-pill ok">' + esc(T('inbox.published')) + '</span>' +
        '<button class="app-btn app-btn-secondary" type="button" id="btn-private">' + esc(T('inbox.keepPrivate')) + '</button>' +
      '</div>';
    } else if (it.state === 'private') {
      actionsHtml = '<div class="app-detail-actions">' +
        '<span class="app-pill closed">' + esc(T('inbox.private')) + '</span>' +
      '</div>';
    }

    main.innerHTML = '<div class="app-stack app-detail' + deptClass + '">' +
      '<a class="app-inbox-back" href="/app/inbox.html">' +
        '<span class="hs-flip">' + icon('arrow') + '</span>' +
        '<span>' + esc(T('title.inbox')) + '</span>' +
      '</a>' +
      '<div class="app-detail-card">' +
        '<div class="app-detail-head">' +
          '<span class="app-detail-dept">' + esc(dLabel) + '</span>' +
          '<span class="app-detail-time">' + esc(timeStr) + '</span>' +
        '</div>' +
        (scoreStr ? '<div class="app-detail-scores">' + esc(scoreStr) + '</div>' : '') +
        '<div class="app-detail-section">' +
          '<h3>' + esc(T('inbox.comment')) + '</h3>' +
          '<div class="app-comment-body">' + (comment ? esc(comment) : '<span class="app-text-muted">' + esc(T('inbox.noComment')) + '</span>') + '</div>' +
        '</div>' +
        actionsHtml +
      '</div>' +
    '</div>';

    var pubBtn = main.querySelector('#btn-publish');
    if (pubBtn) {
      pubBtn.addEventListener('click', function () {
        handleAction('publish', it.id, main);
      });
    }
    var privBtn = main.querySelector('#btn-private');
    if (privBtn) {
      privBtn.addEventListener('click', function () {
        handleAction('private', it.id, main);
      });
    }
  }

  function render(main) {
    if (!main) return;
    var detailId = getQueryId();
    if (detailId) {
      renderDetail(main);
    } else {
      renderList(main);
    }
  }

  HotelApp.renderShell('inbox');
  HotelApp.setScreen(render);
  HotelApp.applyLang(HotelShell.getLang());

  var detailId = getQueryId();
  if (detailId) {
    markRead(detailId);
    state.detailLoading = true;
    render(document.getElementById('hs-main'));
    fetch('/app/api/inbox.php?id=' + detailId, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        state.detailLoading = false;
        if (data && data.ok) {
          state.detailItem = data;
        } else {
          state.detailError = 'Feedback not found';
        }
        render(document.getElementById('hs-main'));
      })
      .catch(function (err) {
        state.detailLoading = false;
        state.detailError = err.message || 'Error loading feedback';
        render(document.getElementById('hs-main'));
      });
  } else {
    state.loading = true;
    render(document.getElementById('hs-main'));
    fetch('/app/api/inbox.php', { cache: 'no-store' })
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
        }
        render(document.getElementById('hs-main'));
      })
      .catch(function (err) {
        state.loading = false;
        state.error = err.message || 'Error loading inbox';
        render(document.getElementById('hs-main'));
      });
  }
})();
