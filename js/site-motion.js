/**
 * site-motion.js — Unified motion system for Jingtine's portfolio.
 *
 * Features:
 * - Homepage hero parallax (scroll-driven, .hero-bg + .hero-content)
 * - Global reveal on scroll (IntersectionObserver, .reveal → .revealed)
 * - Page load fade-in (.page-ready on body)
 * - window.SiteMotion.revealNewElements(container) for dynamic content
 * - Reduced-motion support (prefers-reduced-motion + JS check)
 *
 * Uses requestAnimationFrame + IntersectionObserver — zero dependencies.
 */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var EASING = 'cubic-bezier(.2,.8,.2,1)';
  var DURATION = '0.55s';
  var STAGGER = 70; // ms between cards

  // ── Page ready ─────────────────────────────────────────
  document.body.classList.add('page-ready');

  // ── Global Reveal Observer ────────────────────────────
  var revealObserver;

  function setupRevealObserver() {
    if (reduced) return;
    revealObserver = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('revealed');
          revealObserver.unobserve(entries[i].target);
        }
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });
  }

  function observeReveal(el, staggerIndex) {
    if (!revealObserver || reduced) return;
    el.classList.add('reveal');
    if (staggerIndex !== undefined) {
      el.style.transitionDelay = (staggerIndex * STAGGER) + 'ms';
    }
    revealObserver.observe(el);
  }

  function scanAndObserve(container) {
    var root = container || document;
    if (!root || !root.querySelectorAll) return;
    // Page header elements
    var pageHeader = root.querySelector ? root.querySelector('.page-header') : null;
    if (pageHeader) {
      var eyebrow = pageHeader.querySelector('.section-label');
      var title = pageHeader.querySelector('h1');
      var subtitle = pageHeader.querySelector('p');
      if (eyebrow && !eyebrow.classList.contains('revealed')) observeReveal(eyebrow, 0);
      if (title && !title.classList.contains('revealed')) observeReveal(title, 1);
      if (subtitle && !subtitle.classList.contains('revealed')) observeReveal(subtitle, 2);
    }

    // Section labels and titles
    var labels = root.querySelectorAll('.section-label');
    var titles = root.querySelectorAll('.section-title');
    for (var i = 0; i < labels.length; i++) { if (!labels[i].classList.contains('revealed')) observeReveal(labels[i]); }
    for (var j = 0; j < titles.length; j++) { if (!titles[j].classList.contains('revealed')) observeReveal(titles[j]); }

    // Cards
    var cardTypes = [
      '.article-card', '.project-detail-card', '.home-skill-card', '.home-project-card',
      '.contact-card', '.knowledge-feature-card', '.library-card',
      '.blog-category-card'
    ];
    for (var k = 0; k < cardTypes.length; k++) {
      var cards = root.querySelectorAll(cardTypes[k]);
      for (var m = 0; m < cards.length; m++) {
          if (!cards[m].classList.contains('revealed')) observeReveal(cards[m], m);
        }
      }
  }

  // ── Public API ─────────────────────────────────────────
  window.SiteMotion = {
    revealNewElements: function (container) {
      if (reduced) return;
      if (!container) return;
      if (!revealObserver) setupRevealObserver();
      scanAndObserve(container);
    }
  };

  // ── Homepage hero parallax ─────────────────────────────
  var isHome = document.querySelector('.hero-bg') && document.querySelector('.hero-content');

  if (isHome && !reduced) {
    var hero = document.querySelector('.hero');
    var heroBg = document.querySelector('.hero-bg');
    var heroContent = document.querySelector('.hero-content');
    var heroHeight;

    function updateHero() {
      heroHeight = hero.offsetHeight;
      var scrollY = window.pageYOffset;
      var progress = Math.min(scrollY / (heroHeight || 1), 1);

      if (heroBg) {
        heroBg.style.transform = 'translateY(' + (scrollY * 0.03) + 'px)';
      }

      var y = Math.min(scrollY * 0.2, 60);
      var opacity = 1 - progress * 0.55;
      var scale = 1 - progress * 0.025;

      heroContent.style.transform = 'translateY(-' + y + 'px) scale(' + scale.toFixed(3) + ')';
      heroContent.style.opacity = Math.max(opacity.toFixed(2), 0.4);
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          updateHero();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    updateHero();
  }

  // ── Init ───────────────────────────────────────────────
  if (!reduced) {
    setupRevealObserver();
    scanAndObserve(document);
  }
})();
