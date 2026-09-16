/** Render generated GitHub activity and the local site health snapshot. */
(function () {
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
  function number(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
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
  function addStat(container, key, value, label) {
    var stat = element('div', 'github-number');
    stat.setAttribute('data-github-stat', key);
    stat.appendChild(element('strong', '', String(number(value))));
    stat.appendChild(element('span', '', label));
    container.appendChild(stat);
  }
  function renderMonthly(data) {
    var panel = element('section', 'github-chart-panel github-monthly-panel');
    var heading = element('div', 'github-panel-heading');
    heading.appendChild(element('h3', '', '月度活动'));
    heading.appendChild(element('span', '', '贡献'));
    panel.appendChild(heading);
    var chart = element('div', 'github-month-chart');
    var months = Array.isArray(data.months) ? data.months : [];
    var maximum = Math.max.apply(null, months.map(function (month) { return number(month.count); }).concat([1]));
    months.forEach(function (month) {
      var column = element('div', 'github-month-column');
      column.appendChild(element('span', 'github-month-count', String(number(month.count))));
      var bar = element('span', 'github-month-bar');
      bar.style.setProperty('--bar-height', Math.max(3, number(month.count) / maximum * 100) + '%');
      bar.setAttribute('title', number(month.count) + ' contributions in ' + String(month.label || month.key || 'month'));
      column.appendChild(bar);
      column.appendChild(element('span', 'github-month-label', String(month.label || month.key || '')));
      chart.appendChild(column);
    });
    panel.appendChild(chart);
    return panel;
  }
  function renderCalendar(data) {
    var panel = element('section', 'github-chart-panel github-calendar-panel');
    var heading = element('div', 'github-panel-heading');
    heading.appendChild(element('h3', '', '每日活动'));
    var calendar = Array.isArray(data.calendar) ? data.calendar : [];
    heading.appendChild(element('span', '', calendar.length ? calendar[0].date + ' — ' + calendar[calendar.length - 1].date : '最近一年'));
    panel.appendChild(heading);
    var scroll = element('div', 'github-calendar-scroll');
    var grid = element('div', 'github-calendar-grid');
    var firstWeekday = calendar.length ? new Date(String(calendar[0].date) + 'T00:00:00Z').getUTCDay() : 0;
    calendar.forEach(function (day, index) {
      var date = new Date(String(day.date) + 'T00:00:00Z');
      var cell = element('span', 'github-calendar-day');
      cell.setAttribute('data-level', String(Math.min(4, Math.max(0, number(day.level)))));
      cell.style.gridRow = String(date.getUTCDay() + 1);
      cell.style.gridColumn = String(Math.floor((index + firstWeekday) / 7) + 1);
      var description = number(day.count) + ' contributions on ' + String(day.date);
      cell.setAttribute('title', description);
      cell.setAttribute('aria-label', description);
      grid.appendChild(cell);
    });
    scroll.appendChild(grid);
    panel.appendChild(scroll);
    var legend = element('div', 'github-calendar-legend');
    legend.appendChild(element('span', '', '少'));
    for (var level = 0; level <= 4; level += 1) {
      var sample = element('i');
      sample.setAttribute('data-level', String(level));
      legend.appendChild(sample);
    }
    legend.appendChild(element('span', '', '多'));
    panel.appendChild(legend);
    return panel;
  }
  function renderRepositories(data) {
    var section = element('section', 'github-repositories');
    section.appendChild(element('h3', '', '最近维护的仓库'));
    var list = element('div', 'github-repo-list');
    (Array.isArray(data.repositories) ? data.repositories : []).slice(0, 4).forEach(function (repo) {
      var card = element('article', 'github-repo-card');
      card.appendChild(safeGitHubLink(repo.url, String(repo.name || 'Untitled repository') + ' ↗', 'github-repo-name'));
      card.appendChild(element('p', '', String(repo.description || 'Public GitHub repository')));
      var meta = element('div', 'github-repo-meta');
      meta.appendChild(element('span', '', String(repo.language || 'Code')));
      meta.appendChild(element('span', '', '★ ' + number(repo.stars)));
      meta.appendChild(element('span', '', '⑂ ' + number(repo.forks)));
      card.appendChild(meta);
      list.appendChild(card);
    });
    section.appendChild(list);
    return section;
  }
  function createSiteHealth(data) {
    var bar = element('aside', 'site-health');
    bar.appendChild(element('span', 'site-health-label', '档案馆运行 →'));
    var status = element('span', 'site-health-state', data.status === 'passing' ? '运行正常' : '部分异常');
    status.setAttribute('data-state', data.status === 'passing' ? 'passing' : 'degraded');
    bar.appendChild(status);
    bar.appendChild(element('span', '', number(data.content && data.content.blogArticles) + ' 篇随笔'));
    bar.appendChild(element('span', '', number(data.content && data.content.wikiPages) + ' 篇知识笔记'));
    bar.appendChild(element('span', '', String(data.quality && data.quality.result || '检查数据暂不可用')));
    return bar;
  }
  function renderGitHub(container, data, siteData) {
    container.textContent = '';
    var poster = element('article', 'github-poster');
    var hero = element('header', 'github-poster-hero');
    var titleGroup = element('div');
    titleGroup.appendChild(element('p', 'github-kicker', '公开实践 / 最近一年'));
    titleGroup.appendChild(element('h2', '', 'GitHub 活动'));
    titleGroup.appendChild(element('p', 'github-poster-note', '记录代码提交、实验，以及最近维护的项目。'));
    hero.appendChild(titleGroup);
    hero.appendChild(safeGitHubLink(data.profile && data.profile.url, '@' + String(data.profile && data.profile.login || 'Jingtine') + ' ↗', 'github-profile-link'));
    poster.appendChild(hero);
    var numbers = element('div', 'github-number-field');
    addStat(numbers, 'contributions', data.summary && data.summary.totalContributions, '贡献');
    addStat(numbers, 'repositories', data.profile && data.profile.publicRepos, '公开仓库');
    addStat(numbers, 'stars', data.summary && data.summary.stars, '获得的星标');
    addStat(numbers, 'active-days', data.summary && data.summary.activeDays, '活跃天数');
    poster.appendChild(numbers);
    poster.appendChild(renderMonthly(data));
    poster.appendChild(renderCalendar(data));
    poster.appendChild(renderRepositories(data));
    poster.appendChild(createSiteHealth(siteData));
    container.appendChild(poster);
    if (window.SiteMotion) window.SiteMotion.revealNewElements(container);
  }
  function loadStatus() {
    var container = document.getElementById('status-dashboard');
    container.textContent = '';
    container.appendChild(element('p', 'status-loading', '正在加载近况…'));
    fetchJSON('public/data/status.json').then(function (siteData) {
      if (!siteData || !siteData.build || !siteData.content || !siteData.quality) {
        container.textContent = '暂无完整状态数据。';
        return;
      }
      return fetchJSON('public/data/github-stats.json').then(function (githubData) {
        if (!githubData || !githubData.profile || !githubData.summary) throw new Error('Incomplete GitHub data');
        renderGitHub(container, githubData, siteData);
      }).catch(function () {
        container.textContent = '';
        container.appendChild(element('h2', 'status-section-title', 'GitHub 活动'));
        container.appendChild(element('p', 'github-unavailable', 'GitHub 数据暂时不可用。'));
        container.appendChild(createSiteHealth(siteData));
      });
    }).catch(function () {
      container.textContent = '';
      container.appendChild(element('p', 'status-loading', 'Failed to load status.'));
      var retry = element('button', 'btn', '重试');
      retry.type = 'button';
      retry.addEventListener('click', loadStatus);
      container.appendChild(retry);
    });
  }
  loadStatus();
})();
