// Keep the click firework off for users who request reduced motion.
(() => {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let implementation;
  Object.defineProperty(window, 'firework', {
    configurable: true,
    get: () => (media.matches ? () => {} : implementation),
    set: value => { implementation = value; },
  });
})();
