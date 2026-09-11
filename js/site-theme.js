(function () {
  'use strict';

  function finite(value, min, max, fallback) {
    var number = Number(value);
    return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
  }

  function localBackground(value) {
    return typeof value === 'string' &&
      /^assets\/images\/backgrounds\/[a-zA-Z0-9._/-]+$/.test(value) &&
      value.indexOf('..') === -1 && value.indexOf('//') === -1 ? value : '';
  }

  function load() {
    return fetch('config/site.json').then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (site) {
      var image = localBackground(site.background && site.background.image);
      if (!image) return site;
      var root = document.documentElement;
      root.style.setProperty('--site-bg-image', 'url("' + image + '")');
      root.style.setProperty('--site-bg-blur', finite(site.background.blur, 0, 40, 14) + 'px');
      root.style.setProperty('--site-bg-saturation', String(finite(site.background.saturation, 0, 2, 0.72)));
      root.style.setProperty('--site-bg-overlay', /^#[0-9a-fA-F]{6}$/.test(site.background.overlay || '') ? site.background.overlay : '#f4f0e8');
      root.style.setProperty('--site-bg-overlay-opacity', String(finite(site.background.overlayOpacity, 0, 1, 0.82)));
      root.style.setProperty('--site-bg-position', /^(center|top|bottom|left|right)( (center|top|bottom|left|right))?$/.test(site.background.position || '') ? site.background.position : 'center');
      root.classList.add('site-background-ready');
      return site;
    }).catch(function () {
      return null;
    });
  }

  window.SiteTheme = { load: load };
  load();
})();
