/* Article bodies are trusted repository Markdown; index metadata is always text. */
(function () {
  'use strict';
  var data = window.ArticleData;
  var body = document.getElementById('article-body');
  if (!body) return;

  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function stripFrontMatter(markdown) {
    // Git checkouts may serve either LF or CRLF. Delimiters must remain exact lines.
    var normalized = markdown.replace(/\r\n/g, '\n');
    if (!normalized.startsWith('+++\n')) throw new Error('Missing article front matter');
    var end = normalized.indexOf('\n+++\n', 4);
    if (end === -1) throw new Error('Unclosed article front matter');
    return normalized.slice(end + 5);
  }

  function selectRelated(current, items, limit) {
    var tags = new Set(current.tags || []);
    return items.filter(function (item) { return item.slug !== current.slug; })
      .map(function (item) {
        var shared = Array.from(new Set(item.tags || [])).filter(function (tag) { return tags.has(tag); }).length;
        return { item: item, score: 2 * shared + (item.category === current.category ? 1 : 0) };
      })
      .filter(function (entry) { return entry.score > 0; })
      .sort(function (a, b) {
        if (a.score !== b.score) return b.score - a.score;
        if (a.item.date !== b.item.date) return a.item.date > b.item.date ? -1 : 1;
        return a.item.slug < b.item.slug ? -1 : a.item.slug > b.item.slug ? 1 : 0;
      })
      .slice(0, limit === undefined ? 3 : Math.max(0, limit))
      .map(function (entry) { return entry.item; });
  }

  function label(config, group, value) {
    var labels = config[group];
    return labels && Object.prototype.hasOwnProperty.call(labels, value)
      && typeof labels[value] === 'string' && labels[value] ? labels[value] : value;
  }

  function dateNode(value) {
    var date = data.formatDate(value);
    var time = node('time', 'article-date', date);
    time.dateTime = date;
    return time;
  }

  function renderCover(record) {
    var cover = document.getElementById('article-cover');
    cover.replaceChildren();
    cover.hidden = true;
    var path = record.cover;
    if (typeof path !== 'string' || !path.startsWith('assets/images/covers/')
      || /[%\\?#:\s\u0000-\u001f\u007f]/.test(path)
      || !path.split('/').every(function (part) { return part && part !== '.' && part !== '..'; })) return;
    var image = node('img');
    image.alt = record.coverAlt || '';
    image.addEventListener('load', function () { cover.hidden = false; });
    image.addEventListener('error', function () { image.remove(); cover.hidden = true; });
    image.src = path;
    cover.appendChild(image);
  }

  function renderMetadata(record, config) {
    document.title = record.title + ' — Jingtine';
    document.getElementById('article-title').textContent = record.title;
    var summary = document.getElementById('article-summary');
    summary.textContent = record.summary || '';
    summary.hidden = !record.summary;
    var meta = document.getElementById('article-meta');
    meta.replaceChildren(dateNode(record.date));
    [label(config, 'kinds', record.kind), label(config, 'categories', record.category),
      record.wordCount + ' 字', record.readingMinutes + ' 分钟阅读'].forEach(function (text) {
      meta.appendChild(node('span', '', text));
    });
    var tags = document.getElementById('article-tags');
    tags.replaceChildren();
    (record.tags || []).forEach(function (tag) { tags.appendChild(node('span', 'blog-tag', tag)); });
    renderCover(record);
  }

  function renderRelated(record, items, config) {
    var related = selectRelated(record, items, 3);
    var container = document.getElementById('related-articles');
    container.replaceChildren();
    document.getElementById('related-section').hidden = !related.length;
    related.forEach(function (item) {
      var card = node('a', 'article-card');
      card.href = data.articleHref(item.slug);
      var meta = node('div', 'article-card-header');
      meta.append(node('span', 'article-category', label(config, 'categories', item.category)), dateNode(item.date));
      card.append(meta, node('h3', '', item.title), node('p', '', item.summary));
      container.appendChild(card);
    });
  }

  async function loadArticleDetail() {
    var status = document.getElementById('article-status');
    var slug = new URLSearchParams(location.search).get('slug');
    body.setAttribute('aria-busy', 'true');
    status.hidden = false;
    status.setAttribute('role', 'status');
    status.textContent = '正在加载正文…';
    try {
      if (!slug) throw new Error('not-found');
      var items = await data.load();
      var record = items.find(function (item) { return item.slug === slug; });
      // Only an indexed, repository-local slug can form the trusted Markdown path.
      if (!record || /[/\\\u0000-\u001f\u007f]/.test(record.slug)
        || record.slug === '.' || record.slug === '..') throw new Error('not-found');
      var results = await Promise.all([
        fetch('articles/' + encodeURIComponent(record.slug) + '.md').then(function (response) {
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response.text();
        }),
        data.loadConfig().catch(function () { return {}; }),
        loadWikiIndex()
      ]);
      var config = results[1] && typeof results[1] === 'object' ? results[1] : {};
      body.innerHTML = marked.parse(stripFrontMatter(results[0]));
      prepareReading(body);
      renderWikiLinks(body, results[2]);
      renderMetadata(record, config);
      renderRelated(record, items, config);
      status.hidden = true;
      body.setAttribute('aria-busy', 'false');
      document.dispatchEvent(new CustomEvent('article:ready', { detail: { slug: record.slug, title: record.title } }));
    } catch (error) {
      body.replaceChildren();
      document.getElementById('article-title').textContent = error.message === 'not-found' ? '文章不存在' : '文章加载失败';
      status.setAttribute('role', 'alert');
      status.textContent = error.message === 'not-found'
        ? '文章不存在或尚未公开。请返回随笔浏览其他文章。'
        : '文章加载失败，请刷新页面重试，或返回随笔浏览其他文章。';
      body.setAttribute('aria-busy', 'false');
    }
  }

  window.stripFrontMatter = stripFrontMatter;
  window.selectRelated = selectRelated;
  window.loadArticleDetail = loadArticleDetail;
  loadArticleDetail();
})();
