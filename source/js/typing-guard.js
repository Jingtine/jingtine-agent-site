// Keep the typing subtitle still for users who request reduced motion.
(() => {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!media.matches) return;
  const showStaticLine = () => {
    const line = (window.subtitleTypingConfig?.strings ?? [])[0] || '';
    const target = document.querySelector('#subtitle span');
    if (target && line) target.textContent = line;
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showStaticLine);
  } else {
    showStaticLine();
  }
  Object.defineProperty(window, 'Typed', {
    configurable: true,
    get: () => function Typed() {
      showStaticLine();
      return { destroy() {}, stop() {} };
    },
    set: () => {},
  });
})();
