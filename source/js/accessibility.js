// Keep Reimu's theme cycle and persistence, adding semantics to its click-only anchor.
(() => {
  const control = document.querySelector('.dark-mode-btn');
  if (!control) return;
  control.tabIndex = 0;
  control.setAttribute('role', 'button');
  const sync = () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const mode = control.id === 'nav-moon-btn' ? '深色'
      : control.id === 'nav-sun-btn' ? '浅色' : `跟随系统（${dark ? '深色' : '浅色'}）`;
    control.setAttribute('aria-label', `主题模式：${mode}；切换主题`);
    control.setAttribute('aria-pressed', String(dark));
  };
  control.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (!event.repeat) control.click();
  });
  sync();
  document.body.addEventListener('reimu:theme-set', sync);
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('pjax:complete', sync);
})();

// Add keyboard semantics to Reimu's existing mobile menu without replacing it.
(() => {
  const toggle = document.getElementById('main-nav-toggle');
  if (!toggle) return;
  toggle.tabIndex = 0;
  toggle.setAttribute('aria-controls', 'mobile-nav');
  const isOpen = () => document.body.classList.contains('mobile-nav-on');
  let wasOpen = isOpen();
  const sync = () => {
    const open = isOpen();
    toggle.setAttribute('aria-expanded', String(open));
    const menu = document.getElementById('mobile-nav');
    if (menu) {
      menu.inert = !open;
      if (open && !wasOpen) menu.querySelector('a[href]')?.focus();
      if (!open && wasOpen && menu.contains(document.activeElement)) toggle.focus();
    }
    wasOpen = open;
  };
  sync();
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('pjax:complete', sync);
  document.addEventListener('keydown', event => {
    if (event.target === toggle && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      toggle.click();
      return;
    }
    if (!isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      toggle.click();
    } else if (event.key === 'Tab') {
      const links = [...document.querySelectorAll('#mobile-nav a[href]')].filter(link => link.getClientRects().length);
      if (!links.length) return;
      const first = links[0];
      const last = links[links.length - 1];
      if (event.shiftKey && event.target === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && event.target === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
})();

// Add a prominent GitHub action while keeping Reimu's native social links.
(() => {
  const enhanceSidebars = () => {
    document.querySelectorAll('.sidebar-social').forEach(social => {
      if (social.previousElementSibling?.classList.contains('sidebar-follow-github')) return;
      const github = social.querySelector('.icon-github a');
      if (!github || github.protocol !== 'https:') return;
      const follow = document.createElement('a');
      follow.className = 'sidebar-follow-github';
      follow.href = github.href;
      follow.target = '_blank';
      follow.rel = 'noopener noreferrer';
      follow.setAttribute('aria-label', 'Follow Me On GitHub');
      const icon = document.createElement('span');
      icon.className = 'sidebar-follow-github-icon';
      icon.setAttribute('aria-hidden', 'true');
      follow.append(icon, document.createTextNode('Follow Me On GitHub'));
      social.before(follow);
    });
  };
  enhanceSidebars();
  window.addEventListener('pjax:complete', enhanceSidebars);
})();
