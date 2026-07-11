/**
 * home-motion.js — Subtle scroll-based animations for the homepage.
 *
 * Features: hero parallax, foreground fade, section reveal, reduced-motion support.
 * Uses requestAnimationFrame and IntersectionObserver — zero dependencies.
 */
(function () {
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  var hero = document.querySelector('.hero');
  var heroBg = document.querySelector('.hero-bg');
  var heroContent = document.querySelector('.hero-content');
  if (!hero || !heroContent) return;

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

  // ── Reveal on scroll ──────────────────────────────────
  var observer = new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) {
        entries[i].target.classList.add('revealed');
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -20px 0px' });

  var sections = document.querySelectorAll('.section');
  for (var i = 0; i < sections.length; i++) {
    var s = sections[i];
    var label = s.querySelector('.section-label');
    var title = s.querySelector('.section-title');
    if (label) { label.classList.add('reveal'); observer.observe(label); }
    if (title) { title.classList.add('reveal'); observer.observe(title); }

    var cards = s.querySelectorAll('.home-skill-card, .home-project-card, .article-card');
    for (var j = 0; j < cards.length; j++) {
      cards[j].classList.add('reveal');
      cards[j].style.transitionDelay = (j * 80) + 'ms';
      observer.observe(cards[j]);
    }
  }

  // ── Scroll handler ────────────────────────────────────
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
})();
