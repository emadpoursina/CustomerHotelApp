/*
 * hotel-classic — welcome-screen language alignment (contracts/app-shell.md §6, research R-05).
 *
 * Runs only on the welcome screen (#welcome-container). The app drawer stores the guest's
 * language in localStorage['hotel.lang'] (shell.js). This script makes the survey match it:
 *   1. The URL has lang: store that language (the guest chose it on this screen). Stop.
 *   2. Otherwise, if the page language differs from the stored preference: reload the same URL
 *      with lang=<preference>. A reload, not a navigation, so Back does not loop.
 *   3. Otherwise: nothing.
 * It never reads, logs or sends answer content (FR-034). It starts no response by itself.
 */
(function () {
  'use strict';

  function align() {
    if (!document.getElementById('welcome-container')) {
      return;
    }
    var params = new URLSearchParams(window.location.search);
    var shell = window.HotelShell;
    if (!shell) {
      return;
    }
    if (params.has('lang')) {
      shell.setLang(document.documentElement.lang);
      return;
    }
    var pref = shell.getLang();
    if (document.documentElement.lang !== pref) {
      params.set('lang', pref);
      window.location.replace(window.location.pathname + '?' + params.toString() + window.location.hash);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', align);
  } else {
    align();
  }
})();
