/* Shared generated article index helpers. */
(function () {
  'use strict';

  var cache;

  function load() {
    if (cache) return cache;

    var request = fetch('public/data/articles.json')
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (items) {
        if (!Array.isArray(items)) throw new Error('Invalid article index');
        return items.slice();
      });

    cache = request;
    request.catch(function () {
      if (cache === request) cache = null;
    });
    return request;
  }

  function loadConfig() {
    return fetch('config/writing.json').then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    });
  }

  function formatDate(value) {
    if (typeof value !== 'string') return '';

    var match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value);
    if (!match || isNaN(Date.parse(value))) return '';

    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var calendarDate = new Date(Date.UTC(year, month - 1, day));
    if (calendarDate.getUTCFullYear() !== year
      || calendarDate.getUTCMonth() !== month - 1
      || calendarDate.getUTCDate() !== day) return '';

    return match[1] + '-' + match[2] + '-' + match[3];
  }

  function articleHref(slug) {
    return 'article.html?slug=' + encodeURIComponent(slug);
  }

  window.ArticleData = {
    load: load,
    loadConfig: loadConfig,
    formatDate: formatDate,
    articleHref: articleHref
  };
})();
