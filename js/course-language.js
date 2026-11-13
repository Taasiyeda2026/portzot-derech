/* Adapted from spin-off/challenge/challenges-lang.js: pretranslated pages,
   synchronous preference bootstrap. Login and untranslated routes are excluded. */
(function () {
  'use strict';
  var KEY = 'portzot-derech-course-language';
  var root = new URL('../', document.currentScript.src);
  var pages = ['strongermenu-2026.html', 'start/quiz.html', 'domains/alldomains.html',
    'domains/d1.html', 'domains/d2.html', 'domains/d3.html', 'domains/d4.html',
    'domains/d5.html', 'domains/d6.html', 'domains/d7.html', 'domains/d8.html',
    'domains/d9.html', 'domains/d10.html', 'pairing/pairing.html',
    'pairing/questionnaire.html', 'pairing/waiting.html', 'pairing/admin.html', 'pairing/matching.html'];
  var relative = location.pathname.slice(root.pathname.length);
  var isArabic = relative.indexOf('ar/') === 0;
  var page = isArabic ? relative.slice(3) : relative;
  if (pages.indexOf(page) === -1) return;
  var language = isArabic ? 'ar' : 'he';
  var explicit = new URLSearchParams(location.search).get('lang');
  var requested = language;
  if (explicit === 'he' || explicit === 'ar') {
    requested = explicit;
    try { localStorage.setItem(KEY, explicit); } catch (_) {}
  } else {
    try {
      var saved = localStorage.getItem(KEY);
      if (saved === 'ar' || saved === 'he') requested = saved;
    } catch (_) {}
  }
  function destination(path, lang, from) {
    var url = new URL((lang === 'ar' ? 'ar/' : '') + path, root);
    url.search = from.search;
    url.searchParams.set('lang', lang);
    url.hash = from.hash;
    return url;
  }
  if (requested !== language) {
    location.replace(destination(page, requested, new URL(location.href)).href);
    return;
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-course-language]').forEach(function (link) {
      link.href = destination(page, link.dataset.courseLanguage, new URL(location.href)).href;
      if (link.dataset.courseLanguage === language) link.setAttribute('aria-current', 'true');
      link.addEventListener('click', function (event) {
        // Avoid interrupting the response write/increment pair when changing language.
        if (window.courseLanguageBusy) { event.preventDefault(); return; }
        try { localStorage.setItem(KEY, link.dataset.courseLanguage); } catch (_) {}
        // A domain chapter hash may have changed after the page was loaded.
        link.href = destination(page, link.dataset.courseLanguage, new URL(location.href)).href;
      });
    });
    // Rewrite only the explicit allowlist. Other course sections keep their original URLs.
    document.querySelectorAll('a[href]:not([data-course-language]):not([data-reader-language])').forEach(function (link) {
      var url = new URL(link.href, location.href);
      if (url.origin !== root.origin || !url.pathname.startsWith(root.pathname)) return;
      var path = url.pathname.slice(root.pathname.length).replace(/^ar\//, '');
      if (pages.indexOf(path) === -1 || url.pathname === location.pathname) return;
      var target = destination(path, language, url);
      // Carry meeting/activity parameters without overriding the link's own parameters.
      new URL(location.href).searchParams.forEach(function (value, key) {
        if (key !== 'lang' && !target.searchParams.has(key)) target.searchParams.append(key, value);
      });
      link.href = target.href;
    });
  });
})();
