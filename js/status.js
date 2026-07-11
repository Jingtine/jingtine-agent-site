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
      var el = document.getElementById('status-cards');
      el.textContent = '';
      var p = document.createElement('p');
      p.setAttribute('style', 'text-align:center;color:var(--color-text-muted);padding:24px;grid-column:1/-1;');
      p.textContent = 'Failed to load status.';
      el.appendChild(p);
    });

  function renderDashboard(data) {
    var container = document.getElementById('status-cards');
    container.textContent = '';

    container.appendChild(createBuildCard(data));
    container.appendChild(createContentCard(data));
    container.appendChild(createQualityCard(data));
    container.appendChild(createServicesCard(data));
  }

  function createBuildCard(data) {
    var card = document.createElement('div');
    card.className = 'home-skill-card';

    var title = document.createElement('h3');
    title.textContent = 'Build';
    card.appendChild(title);

    var list = document.createElement('ul');
    list.className = 'home-skill-list';
    addLi(list, 'Version: ' + safeGet(data, 'build.version'));
    addLi(list, 'Generated: ' + safeGet(data, 'build.generated'));
    card.appendChild(list);

    return card;
  }

  function createContentCard(data) {
    var card = document.createElement('div');
    card.className = 'home-skill-card';

    var title = document.createElement('h3');
    title.textContent = 'Content';
    card.appendChild(title);

    var list = document.createElement('ul');
    list.className = 'home-skill-list';
    addLi(list, 'Blog Articles: ' + safeGet(data, 'content.blogArticles'));
    addLi(list, 'Research Papers: ' + safeGet(data, 'content.researchPapers'));
    addLi(list, 'Wiki Pages: ' + safeGet(data, 'content.wikiPages'));
    card.appendChild(list);

    return card;
  }

  function createQualityCard(data) {
    var card = document.createElement('div');
    card.className = 'home-skill-card';

    var title = document.createElement('h3');
    title.textContent = 'Quality';
    card.appendChild(title);

    var list = document.createElement('ul');
    list.className = 'home-skill-list';

    var result = safeGet(data, 'quality.result');
    var passing = safeGet(data, 'quality.passing');
    var statusText = passing ? result : 'FAILED';
    addLi(list, statusText);

    addLi(list, 'Last Validation: ' + safeGet(data, 'quality.lastValidation'));
    card.appendChild(list);

    return card;
  }

  function createServicesCard(data) {
    var card = document.createElement('div');
    card.className = 'home-skill-card';

    var title = document.createElement('h3');
    title.textContent = 'Services';
    card.appendChild(title);

    var list = document.createElement('ul');
    list.className = 'home-skill-list';

    var services = data.services || {};
    var keys = Object.keys(services);
    for (var i = 0; i < keys.length; i++) {
      var svc = services[keys[i]];
      var icon = svc.enabled ? '\u2713' : '\u2717';
      addLi(list, icon + ' ' + safeGet(svc, 'name', keys[i]));
    }
    card.appendChild(list);

    return card;
  }

  function addLi(list, text) {
    var li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
  }

  function safeGet(obj, key, fallback) {
    fallback = fallback || '-';
    var keys = key.split('.');
    var val = obj;
    for (var i = 0; i < keys.length; i++) {
      if (val == null) return fallback;
      val = val[keys[i]];
    }
    return (val != null) ? val : fallback;
  }
})();
