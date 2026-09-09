/** Render public GitHub data with the generated local status as a fallback. */
(function () {
  var GITHUB_USER = 'Jingtine';
  var API_ROOT = 'https://api.github.com/users/' + GITHUB_USER;

  function fetchJSON(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    });
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string') node.textContent = text;
    return node;
  }

  function safeGitHubLink(url, text, className) {
    var link = element('a', className, text);
    try {
      var parsed = new URL(url);
      if (parsed.protocol === 'https:' && parsed.hostname === 'github.com') link.href = parsed.href;
    } catch (error) {
      link.removeAttribute('href');
    }
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function loadStatus() {
    var container = document.getElementById('status-dashboard');
    container.textContent = '';
    container.appendChild(element('p', 'status-loading', 'Loading status...'));

    fetchJSON('public/data/status.json').then(function (data) {
      if (!data || !data.build || !data.content || !data.quality) {
        container.textContent = '暂无完整状态数据。';
        return;
      }
      renderDashboard(container, data);
    }).catch(function () {
      container.textContent = '';
      container.appendChild(element('p', 'status-loading', 'Failed to load status.'));
      var retry = element('button', 'btn', '重试');
      retry.type = 'button';
      retry.addEventListener('click', loadStatus);
      container.appendChild(retry);
    });
  }

  function renderDashboard(container, siteData) {
    container.textContent = '';
    var github = element('div', 'github-dashboard');
    github.appendChild(element('p', 'status-loading', 'Loading GitHub data...'));
    container.appendChild(github);
    container.appendChild(createSiteHealth(siteData));

    Promise.all([
      fetchJSON(API_ROOT),
      fetchJSON(API_ROOT + '/repos?per_page=100&sort=updated')
    ]).then(function (results) {
      renderGitHub(github, results[0], results[1]);
      if (window.SiteMotion) window.SiteMotion.revealNewElements(container);
    }).catch(function () {
      github.textContent = '';
      github.appendChild(element('h2', 'status-section-title', 'GitHub Stats'));
      github.appendChild(element('p', 'github-unavailable', 'GitHub 数据暂时不可用。'));
      github.appendChild(safeGitHubLink('https://github.com/' + GITHUB_USER, 'View @' + GITHUB_USER + ' on GitHub \u2197', 'github-profile-link'));
    });
  }

  function renderGitHub(container, profile, repositories) {
    container.textContent = '';
    var header = element('div', 'github-heading');
    var titleGroup = element('div');
    titleGroup.appendChild(element('div', 'section-label', 'Public activity'));
    titleGroup.appendChild(element('h2', 'status-section-title', 'GitHub Stats'));
    header.appendChild(titleGroup);
    header.appendChild(safeGitHubLink(profile.html_url, '@' + (profile.login || GITHUB_USER) + ' \u2197', 'github-profile-link'));
    container.appendChild(header);

    var ownedRepositories = Array.isArray(repositories) ? repositories.filter(function (repo) {
      return repo && !repo.fork && !repo.archived;
    }) : [];
    var stars = ownedRepositories.reduce(function (total, repo) {
      return total + (Number(repo.stargazers_count) || 0);
    }, 0);
    var stats = [
      ['repositories', 'Repositories', Number(profile.public_repos) || 0],
      ['stars', 'Stars', stars],
      ['followers', 'Followers', Number(profile.followers) || 0],
      ['following', 'Following', Number(profile.following) || 0]
    ];
    var grid = element('div', 'github-stat-grid');
    stats.forEach(function (stat) {
      var card = element('div', 'github-stat');
      card.setAttribute('data-github-stat', stat[0]);
      card.appendChild(element('strong', '', String(stat[2])));
      card.appendChild(element('span', '', stat[1]));
      grid.appendChild(card);
    });
    container.appendChild(grid);

    if (ownedRepositories.length) {
      container.appendChild(element('h3', 'github-repos-title', 'Recently updated'));
      var list = element('div', 'github-repo-list');
      ownedRepositories.slice(0, 4).forEach(function (repo) {
        var card = element('article', 'github-repo-card');
        card.appendChild(safeGitHubLink(repo.html_url, repo.name || 'Untitled repository', 'github-repo-name'));
        card.appendChild(element('p', '', repo.description || 'Public GitHub repository'));
        var meta = element('div', 'github-repo-meta');
        meta.appendChild(element('span', '', repo.language || 'Code'));
        meta.appendChild(element('span', '', '\u2605 ' + (Number(repo.stargazers_count) || 0)));
        card.appendChild(meta);
        list.appendChild(card);
      });
      container.appendChild(list);
    }
  }

  function createSiteHealth(data) {
    var bar = element('div', 'site-health');
    var status = element('span', 'site-health-state', data.status === 'passing' ? 'Site healthy' : 'Site degraded');
    status.setAttribute('data-state', data.status === 'passing' ? 'passing' : 'degraded');
    bar.appendChild(status);
    bar.appendChild(element('span', '', data.content.blogArticles + ' articles'));
    bar.appendChild(element('span', '', data.content.wikiPages + ' wiki pages'));
    bar.appendChild(element('span', '', data.quality.result || 'Checks unavailable'));
    bar.appendChild(element('span', '', 'Updated ' + (data.build.generated || '')));
    return bar;
  }

  loadStatus();
})();
