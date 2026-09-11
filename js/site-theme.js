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

  function clearBackground(root) {
    [
      '--site-bg-image', '--site-bg-blur', '--site-bg-saturation',
      '--site-bg-overlay', '--site-bg-overlay-opacity', '--site-bg-position'
    ].forEach(function (name) {
      root.style.removeProperty(name);
    });
    root.classList.remove('site-background-ready');
  }

  function loadImage(image) {
    return new Promise(function (resolve, reject) {
      var asset = new Image();
      asset.onload = function () {
        if (typeof asset.decode === 'function') {
          asset.decode().then(resolve, reject);
          return;
        }
        resolve();
      };
      asset.onerror = reject;
      asset.src = image;
    });
  }

  function applyBackground(root, image, background) {
    root.style.setProperty('--site-bg-image', 'url("' + image + '")');
    root.style.setProperty('--site-bg-blur', finite(background.blur, 0, 40, 14) + 'px');
    root.style.setProperty('--site-bg-saturation', String(finite(background.saturation, 0, 2, 0.72)));
    root.style.setProperty('--site-bg-overlay', /^#[0-9a-fA-F]{6}$/.test(background.overlay || '') ? background.overlay : '#f4f0e8');
    root.style.setProperty('--site-bg-overlay-opacity', String(finite(background.overlayOpacity, 0, 1, 0.82)));
    root.style.setProperty('--site-bg-position', /^(center|top|bottom|left|right)( (center|top|bottom|left|right))?$/.test(background.position || '') ? background.position : 'center');
    root.classList.add('site-background-ready');
  }

  function load() {
    var root = document.documentElement;
    clearBackground(root);
    return fetch('config/site.json').then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (site) {
      var background = site.background || {};
      var image = localBackground(background.image);
      if (!image) return site;
      return loadImage(image).then(function () {
        applyBackground(root, image, background);
        return site;
      });
    }).catch(function () {
      clearBackground(root);
      return null;
    });
  }

  window.SiteTheme = { load: load };
  load();
})();
