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

  // ── Homepage hero intro transition (sticky-stage) ─────────────────────────
  var isHome = document.querySelector('.hero-intro-section');

  if (isHome && !reduced) {
    var stage = document.getElementById('hero-intro-stage');
    var content = document.getElementById('hero-intro-content');
    var avatarWrap = document.querySelector('.hero-avatar-wrap');
    var decoLayer = document.querySelector('.hero-intro-deco');
    var outerGlowWrap = document.querySelector('.hero-intro-glow-outer-wrap');
    var innerGlowWrap = document.querySelector('.hero-intro-glow-inner-wrap');
    var ringWrap = document.querySelector('.hero-intro-ring-wrap');
    var particlesLayer = document.querySelector('.hero-intro-particles');
    var scrollHint = document.querySelector('.hero-scroll-hint');
    var greeting = document.querySelector('.hero-greeting');
    var nameEl = document.querySelector('.hero-name');
    var identity = document.querySelector('.hero-identity');
    var tags = document.querySelector('.hero-tags');
    var desc = document.querySelector('.hero-desc');

    var isMobile = window.matchMedia('(max-width: 768px)').matches;
    var INTRO_DIST = isMobile ? 260 : 360;
    var AVATAR_INITIAL_SCALE = 1.5;
    var NAME_INITIAL_SCALE = isMobile ? 1.18 : 1.22;
    var NAME_INITIAL_OPACITY = 0.6;
    var TARGET_CENTER = 0.35;

    var initialContentTY = 0;
    var handledFinal = false;

    // ── Particle presets (deterministic, reproducible) ──
    var PARTICLE_PRESETS = [
      { angle: 15,  radius: 110, size: 5, opacity: 0.50, duration: 7.0, delay: 0.0 },
      { angle: 55,  radius: 130, size: 4, opacity: 0.40, duration: 8.0, delay: 1.5 },
      { angle: 95,  radius: 100, size: 6, opacity: 0.45, duration: 7.5, delay: 0.8 },
      { angle: 135, radius: 140, size: 3, opacity: 0.35, duration: 9.0, delay: 2.5 },
      { angle: 175, radius: 120, size: 5, opacity: 0.45, duration: 7.2, delay: 1.0 },
      { angle: 215, radius: 135, size: 4, opacity: 0.40, duration: 8.5, delay: 2.0 },
      { angle: 255, radius: 105, size: 6, opacity: 0.50, duration: 6.8, delay: 0.3 },
      { angle: 295, radius: 125, size: 3, opacity: 0.35, duration: 8.8, delay: 2.2 },
      { angle: 335, radius: 115, size: 5, opacity: 0.45, duration: 7.8, delay: 1.2 },
      { angle: 355, radius: 130, size: 4, opacity: 0.40, duration: 8.2, delay: 2.8 }
    ];

    function createParticles() {
      if (!particlesLayer) return;
      var count = isMobile ? 6 : PARTICLE_PRESETS.length;
      var radiusScale = isMobile ? 0.8 : 1.0;
      for (var i = 0; i < count; i++) {
        var p = PARTICLE_PRESETS[i];
        var el = document.createElement('div');
        el.className = 'hero-intro-particle';
        var rad = p.angle * Math.PI / 180;
        var x = Math.cos(rad) * p.radius * radiusScale;
        var y = Math.sin(rad) * p.radius * radiusScale;
        var fx = (Math.cos(rad) * 1.5).toFixed(1);
        var fy = (Math.sin(rad) * 3).toFixed(1);
        el.style.left = 'calc(50% + ' + x.toFixed(1) + 'px)';
        el.style.top = 'calc(50% + ' + y.toFixed(1) + 'px)';
        el.style.width = p.size + 'px';
        el.style.height = p.size + 'px';
        el.style.setProperty('--p-opacity', p.opacity.toFixed(2));
        el.style.animationDuration = p.duration + 's';
        el.style.animationDelay = p.delay + 's';
        el.style.setProperty('--fx', fx + 'px');
        el.style.setProperty('--fy', fy + 'px');
        particlesLayer.appendChild(el);
      }
    }

    function computeInitialContentTY() {
      if (!stage || !avatarWrap) return;
      var stageH = stage.offsetHeight;
      var avatarRect = avatarWrap.getBoundingClientRect();
      var stageRect = stage.getBoundingClientRect();
      var avatarCenterInStage = avatarRect.top + avatarRect.height / 2 - stageRect.top;
      var targetCenter = stageH * TARGET_CENTER;
      initialContentTY = Math.max(targetCenter - avatarCenterInStage, 0);
    }

    function rangeProgress(p, start, end) {
      return Math.min(Math.max((p - start) / (end - start), 0), 1);
    }

    function applyIntroState(progress) {
      // ── Content: single translateY from centered → normal ──
      var contentTY = initialContentTY * (1 - progress);
      content.style.transform = 'translateY(' + contentTY.toFixed(2) + 'px)';

      // ── Avatar: only scale (no translateY) ──
      var avatarScale = AVATAR_INITIAL_SCALE + (1 - AVATAR_INITIAL_SCALE) * progress;
      avatarWrap.style.transform = 'scale(' + avatarScale.toFixed(4) + ')';

      // ── Name: scale + opacity + typography (no translateY) ──
      var nameP = rangeProgress(progress, 0.08, 0.55);
      var nameScale = NAME_INITIAL_SCALE + (1 - NAME_INITIAL_SCALE) * nameP;
      var nameOpacity = NAME_INITIAL_OPACITY + (1 - NAME_INITIAL_OPACITY) * nameP;
      var nameSpacing = 0.5 + (-1.0 - 0.5) * nameP;
      var nameWeight = 600 + (700 - 600) * nameP;
      nameEl.style.transform = 'scale(' + nameScale.toFixed(4) + ')';
      nameEl.style.opacity = nameOpacity.toFixed(3);
      nameEl.style.letterSpacing = nameSpacing.toFixed(2) + 'px';
      nameEl.style.fontWeight = Math.round(nameWeight).toString();

      // ── Text: opacity only ──
      var greetP = rangeProgress(progress, 0.05, 0.35);
      greeting.style.opacity = (0.25 + 0.75 * greetP).toFixed(3);

      var identP = rangeProgress(progress, 0.20, 0.55);
      identity.style.opacity = (0.2 + 0.8 * identP).toFixed(3);

      var tagsP = rangeProgress(progress, 0.35, 0.70);
      tags.style.opacity = (0.2 + 0.8 * tagsP).toFixed(3);

      var descP = rangeProgress(progress, 0.50, 0.85);
      desc.style.opacity = (0.2 + 0.8 * descP).toFixed(3);

      // ── Decoration exit (opacity only, no parallax transform) ──
      var pP = rangeProgress(progress, 0.00, 0.65);
      var pOp = 1 - pP;
      if (particlesLayer) {
        particlesLayer.style.opacity = pOp.toFixed(3);
        particlesLayer.style.visibility = pOp > 0.001 ? 'visible' : 'hidden';
      }

      var rP = rangeProgress(progress, 0.05, 0.75);
      var rOp = 1 - rP;
      if (ringWrap) {
        ringWrap.style.opacity = rOp.toFixed(3);
        ringWrap.style.visibility = rOp > 0.001 ? 'visible' : 'hidden';
      }

      var igP = rangeProgress(progress, 0.00, 0.85);
      var igOp = 1 - igP;
      if (innerGlowWrap) {
        innerGlowWrap.style.opacity = igOp.toFixed(3);
        innerGlowWrap.style.visibility = igOp > 0.001 ? 'visible' : 'hidden';
      }

      var ogP = rangeProgress(progress, 0.00, 1.00);
      var ogOp = 1 - ogP;
      if (outerGlowWrap) {
        outerGlowWrap.style.opacity = ogOp.toFixed(3);
        outerGlowWrap.style.visibility = ogOp > 0.001 ? 'visible' : 'hidden';
      }

      var hP = rangeProgress(progress, 0.00, 0.08);
      var hOp = 0.6 * (1 - hP);
      if (scrollHint) {
        scrollHint.style.opacity = hOp.toFixed(3);
        scrollHint.style.visibility = hOp > 0.001 ? 'visible' : 'hidden';
      }
    }

    function applyFinalState() {
      // Clear content transform
      content.style.transform = '';
      // Clear avatar inline styles
      avatarWrap.style.transform = '';
      // Clear name inline styles
      nameEl.style.transform = '';
      nameEl.style.opacity = '';
      nameEl.style.letterSpacing = '';
      nameEl.style.fontWeight = '';
      // Clear text opacity
      var textEls = [greeting, identity, tags, desc];
      for (var i = 0; i < textEls.length; i++) {
        if (textEls[i]) textEls[i].style.opacity = '';
      }
      // Hide and clear all decoration wrappers
      var decoEls = [particlesLayer, ringWrap, innerGlowWrap, outerGlowWrap, scrollHint];
      for (var j = 0; j < decoEls.length; j++) {
        if (decoEls[j]) {
          decoEls[j].style.opacity = '0';
          decoEls[j].style.visibility = 'hidden';
        }
      }
      // Remove intro class
      document.documentElement.classList.remove('hero-intro-active');
      handledFinal = true;
    }

    function updateIntro() {
      var scrollY = window.pageYOffset;
      if (scrollY >= INTRO_DIST && !handledFinal) {
        applyFinalState();
        return;
      }
      if (handledFinal && scrollY < INTRO_DIST) {
        handledFinal = false;
      }
      if (scrollY >= INTRO_DIST) return;
      var rawProgress = Math.min(scrollY / INTRO_DIST, 1);
      var progress = 1 - Math.pow(1 - rawProgress, 2);
      applyIntroState(progress);
    }

    // Generate particles once at init
    createParticles();

    // Cancel CSS fallback animations — JS is taking over
    var introEls = [avatarWrap, decoLayer, scrollHint, greeting, nameEl, identity, tags, desc];
    for (var i = 0; i < introEls.length; i++) {
      if (introEls[i]) introEls[i].style.animation = 'none';
    }

    // Compute initial content offset (getBoundingClientRect at init only)
    computeInitialContentTY();

    // Apply state immediately
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
          INTRO_DIST = isMobile ? 260 : 360;
          NAME_INITIAL_SCALE = isMobile ? 1.18 : 1.22;
          computeInitialContentTY();
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
