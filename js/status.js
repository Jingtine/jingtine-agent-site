/**
 * status.js — Render website status dashboard from public/data/status.json
 *
 * SECURITY: All data uses textContent. No innerHTML for external content.
 */
(function () {
  fetch('public/data/status.json')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      renderDashboard(data);
    })
    .catch(function () {
      var el = document.getElementById('status-dashboard');
      el.textContent = '';
      var p = document.createElement('p');
      p.setAttribute('style', 'text-align:center;color:var(--color-text-muted);padding:24px;');
      p.textContent = 'Failed to load status.';
      el.appendChild(p);
    });

  function renderDashboard(data) {
    var container = document.getElementById('status-dashboard');
    container.textContent = '';

    // Overview bar
    container.appendChild(createOverview(data));

    // 2x2 grid: Build, Content, Quality, Services
    var grid = document.createElement('div');
    grid.setAttribute('style', 'display:grid;grid-template-columns:1fr 1fr;gap:16px;');
    grid.appendChild(createCard('Build', [['Version', data.build.version || ''], ['Generated', data.build.generated || '']]));
    grid.appendChild(createCard('Content', [['Blog', data.content.blogArticles + ' articles'], ['Research', data.content.researchPapers + ' papers'], ['Wiki', data.content.wikiPages + ' pages']]));
    grid.appendChild(createCard('Quality', [['Result', data.quality.result || ''], ['Last Validated', data.quality.lastValidation || '']]));
    grid.appendChild(createServicesCard(data.services));
    container.appendChild(grid);
    if (window.SiteMotion) window.SiteMotion.revealNewElements(container);
  }

  function createOverview(data) {
    var bar = document.createElement('div');
    bar.className = 'contact-card';
    bar.setAttribute('style', 'padding:20px 28px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;');

    var left = document.createElement('div');

    var badge = document.createElement('span');
    badge.textContent = data.status === 'passing' ? 'System Healthy' : 'Degraded';
    badge.className = 'article-category';
    badge.setAttribute('style', 'font-size:13px;padding:4px 14px;');

    var ver = document.createElement('span');
    ver.setAttribute('style', 'margin-left:12px;font-size:13px;color:var(--color-text-muted);font-family:var(--font-mono);');
    ver.textContent = 'v' + (data.build.version || '');

    left.appendChild(badge);
    left.appendChild(ver);

    var right = document.createElement('div');
    right.setAttribute('style', 'display:flex;gap:20px;font-size:13px;color:var(--color-text-muted);');

    var gen = document.createElement('span');
    gen.textContent = 'Generated: ' + (data.build.generated || '');
    var checks = document.createElement('span');
    checks.textContent = (data.quality.result || '');

    right.appendChild(gen);
    right.appendChild(checks);

    bar.appendChild(left);
    bar.appendChild(right);
    return bar;
  }

  function createCard(title, rows) {
    var card = document.createElement('div');
    card.className = 'home-skill-card';

    var h3 = document.createElement('h3');
    h3.textContent = title;
    card.appendChild(h3);

    var list = document.createElement('ul');
    list.className = 'home-skill-list';
    for (var i = 0; i < rows.length; i++) {
      var li = document.createElement('li');
      li.textContent = rows[i][0] + ': ' + rows[i][1];
      list.appendChild(li);
    }
    card.appendChild(list);
    return card;
  }

  function createServicesCard(services) {
    var card = document.createElement('div');
    card.className = 'home-skill-card';

    var h3 = document.createElement('h3');
    h3.textContent = 'Services';
    card.appendChild(h3);

    var list = document.createElement('ul');
    list.className = 'home-skill-list';
    var keys = Object.keys(services || {});
    for (var i = 0; i < keys.length; i++) {
      var svc = services[keys[i]];
      var li = document.createElement('li');
      li.textContent = (svc.enabled ? '\u2713' : '\u2717') + ' ' + (svc.name || keys[i]);
      list.appendChild(li);
    }
    card.appendChild(list);
    return card;
  }
})();
