/* Non-modal navigation; HTML links remain available without JavaScript. */
(function () {
  'use strict';
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (!toggle || !links) return;
  document.documentElement.classList.add('nav-ready');
  function setOpen(open, restore) {
    document.documentElement.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (restore) toggle.focus();
  }
  toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
  links.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav') && toggle.getAttribute('aria-expanded') === 'true') setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
  });
  window.matchMedia('(min-width:1200px)').addEventListener('change', function (e) { if (e.matches) setOpen(false); });
})();
