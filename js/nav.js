/**
 * nav.js — Mobile hamburger navigation toggle for Jingtine's site.
 *
 * - Toggles html.nav-open and the button's aria-expanded state.
 * - Closes on: link click, outside click, Escape, resize above 768px.
 * - Zero dependencies, no inline event handlers.
 */
(function () {
  'use strict';

  var nav = document.querySelector('.nav');
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (!nav || !toggle || !links) return;

  function setOpen(open) {
    document.documentElement.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  toggle.addEventListener('click', function () {
    setOpen(!document.documentElement.classList.contains('nav-open'));
  });

  links.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav') && document.documentElement.classList.contains('nav-open')) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 768) setOpen(false);
  });
})();
