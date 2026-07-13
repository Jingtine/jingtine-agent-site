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

  // ── Homepage hero intro transition ────────────────────
  var isHome = document.querySelector('.hero-content');

  if (isHome && !reduced) {
    var avatarStage = document.querySelector('.hero-avatar-stage');
    var avatarWrap = document.querySelector('.hero-avatar-wrap');
    var decoLayer = document.querySelector('.hero-intro-deco');
    var greeting = document.querySelector('.hero-greeting');
    var nameEl = document.querySelector('.hero-name');
    var identity = document.querySelector('.hero-identity');
    var tags = document.querySelector('.hero-tags');
    var desc = document.querySelector('.hero-desc');

    var isMobile = window.matchMedia('(max-width: 768px)').matches;
    var TRANSITION_DIST = isMobile ? 260 : 360;
    var INITIAL_SCALE = isMobile ? 1.58 : 1.5;
    var cachedInitialTY = 0;

    function computeInitialTY() {
      if (!avatarStage) return;
      var rect = avatarStage.getBoundingClientRect();
      var normalCenter = rect.top + rect.height / 2;
      var targetCenter = window.innerHeight * 0.35;
      cachedInitialTY = Math.max(targetCenter - normalCenter, 0);
    }

    function rangeProgress(p, start, end) {
      return Math.min(Math.max((p - start) / (end - start), 0), 1);
    }

    function applyIntroState(progress) {
      var avatarScale = INITIAL_SCALE + (1 - INITIAL_SCALE) * progress;
      var avatarTY = cachedInitialTY * (1 - progress);
      avatarWrap.style.transform = 'translate3d(0,' + avatarTY.toFixed(2) + 'px,0) scale(' + avatarScale.toFixed(4) + ')';

      var decoOpacity = Math.max(1 - progress / 0.75, 0);
      var decoScale = 1 + (1 - progress) * 0.15;
      if (decoLayer) {
        decoLayer.style.opacity = decoOpacity.toFixed(3);
        decoLayer.style.transform = 'translate(-50%, -50%) scale(' + decoScale.toFixed(3) + ')';
        decoLayer.style.visibility = decoOpacity > 0 ? 'visible' : 'hidden';
      }

      var greetingP = rangeProgress(progress, 0.15, 0.40);
      var nameP = rangeProgress(progress, 0.15, 0.40);
      var identityP = rangeProgress(progress, 0.30, 0.60);
      var tagsP = rangeProgress(progress, 0.45, 0.75);
      var descP = rangeProgress(progress, 0.60, 0.90);

      if (greeting) {
        greeting.style.opacity = (0.2 + 0.8 * greetingP).toFixed(3);
        greeting.style.transform = 'translateY(' + (30 * (1 - greetingP)).toFixed(1) + 'px)';
      }
      if (nameEl) {
        nameEl.style.opacity = (0.5 + 0.5 * nameP).toFixed(3);
        nameEl.style.transform = 'translateY(' + (25 * (1 - nameP)).toFixed(1) + 'px)';
      }
      if (identity) {
        identity.style.opacity = (0.15 + 0.85 * identityP).toFixed(3);
        identity.style.transform = 'translateY(' + (35 * (1 - identityP)).toFixed(1) + 'px)';
      }
      if (tags) {
        tags.style.opacity = (0.15 + 0.85 * tagsP).toFixed(3);
        tags.style.transform = 'translateY(' + (35 * (1 - tagsP)).toFixed(1) + 'px)';
      }
      if (desc) {
        desc.style.opacity = (0.15 + 0.85 * descP).toFixed(3);
        desc.style.transform = 'translateY(' + (40 * (1 - descP)).toFixed(1) + 'px)';
      }
    }

    function applyFinalState() {
      avatarWrap.style.transform = '';
      if (decoLayer) {
        decoLayer.style.opacity = '0';
        decoLayer.style.transform = '';
        decoLayer.style.visibility = 'hidden';
      }
      if (greeting) { greeting.style.opacity = ''; greeting.style.transform = ''; }
      if (nameEl) { nameEl.style.opacity = ''; nameEl.style.transform = ''; }
      if (identity) { identity.style.opacity = ''; identity.style.transform = ''; }
      if (tags) { tags.style.opacity = ''; tags.style.transform = ''; }
      if (desc) { desc.style.opacity = ''; desc.style.transform = ''; }
    }

    function updateIntro() {
      var scrollY = window.pageYOffset;
      if (scrollY >= TRANSITION_DIST) {
        applyFinalState();
        document.documentElement.classList.remove('hero-intro');
        return;
      }
      if (!document.documentElement.classList.contains('hero-intro')) {
        document.documentElement.classList.add('hero-intro');
      }
      if (decoLayer) decoLayer.style.visibility = 'visible';
      var progress = Math.min(scrollY / TRANSITION_DIST, 1);
      applyIntroState(progress);
    }

    // Cancel CSS fallback animations — JS is taking over
    var introEls = [avatarWrap, decoLayer, greeting, nameEl, identity, tags, desc];
    for (var i = 0; i < introEls.length; i++) {
      if (introEls[i]) introEls[i].style.animation = 'none';
    }

    // Compute initial position from real layout (getBoundingClientRect allowed here, not in scroll frame)
    computeInitialTY();

    // Apply state immediately for current scrollY (handles refresh at mid-scroll)
    updateIntro();

    // Scroll handler (passive + RAF)
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          updateIntro();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    // Resize handler (throttled with RAF)
    var resizeTicking = false;
    window.addEventListener('resize', function () {
      if (!resizeTicking) {
        requestAnimationFrame(function () {
          isMobile = window.matchMedia('(max-width: 768px)').matches;
          TRANSITION_DIST = isMobile ? 260 : 360;
          INITIAL_SCALE = isMobile ? 1.58 : 1.5;
          computeInitialTY();
          updateIntro();
          resizeTicking = false;
        });
        resizeTicking = true;
      }
    }, { passive: true });
  }

  // ── Global meteor layer (fixed background decoration) ──
  var meteorLayer = document.createElement('div');
  meteorLayer.className = 'meteor-layer';
  meteorLayer.setAttribute('aria-hidden', 'true');
  for (var mi = 1; mi <= 3; mi++) {
    var meteor = document.createElement('div');
    meteor.className = 'meteor meteor-' + mi;
    meteorLayer.appendChild(meteor);
  }
  document.body.appendChild(meteorLayer);

  // ── Init ───────────────────────────────────────────────
  if (!reduced) {
    setupRevealObserver();
    scanAndObserve(document);
  }
})();
