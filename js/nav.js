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

/* Replace footer text with compact icons; the HTML remains the no-JS fallback. */
(function () {
  'use strict';
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var iconParts = {
    github: [
      ['path', {d:'M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.78.62-3.37-1.21-3.37-1.21-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05A9.34 9.34 0 0 1 12 6.62a9.3 9.3 0 0 1 2.5.35c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.36-.01 2.46-.01 2.8 0 .27.18.59.69.49A10.25 10.25 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z',fill:'currentColor'}]
    ],
    email: [
      ['rect', {x:'3',y:'5',width:'18',height:'14',rx:'2'}],
      ['path', {d:'m4 7 8 6 8-6'}]
    ],
    rss: [
      ['circle', {cx:'6',cy:'18',r:'1.5',fill:'currentColor',stroke:'none'}],
      ['path', {d:'M4.5 11.5a8 8 0 0 1 8 8'}],
      ['path', {d:'M4.5 5.5a14 14 0 0 1 14 14'}]
    ],
    status: [
      ['circle', {cx:'12',cy:'12',r:'9'}],
      ['path', {d:'M5.5 12h3l2-4.5 3 9 2-4.5h3'}]
    ]
  };

  document.querySelectorAll('.footer-links a').forEach(function (link) {
    var label = link.textContent.trim();
    var parts = iconParts[label.toLowerCase()];
    if (!parts) return;
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    parts.forEach(function (part) {
      var node = document.createElementNS(SVG_NS, part[0]);
      Object.keys(part[1]).forEach(function (name) { node.setAttribute(name, part[1][name]); });
      svg.appendChild(node);
    });
    link.textContent = '';
    link.classList.add('footer-icon-link');
    link.setAttribute('aria-label', label);
    link.title = label;
    link.appendChild(svg);
  });
})();
