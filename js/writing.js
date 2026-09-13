/* Writing shares one article index across the feature, list and archive. */
(function () {
  'use strict';

  var data = window.ArticleData;
  var items = [];
  var config = {};
  var search = document.getElementById('writing-search');
  var kind = document.getElementById('writing-kind');
  var category = document.getElementById('writing-category');
  var results = document.getElementById('writing-results');
  var feature = document.getElementById('writing-featured');
  var archive = document.getElementById('writing-archive');
  var count = document.getElementById('writing-count');
  if (!results) return;

  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function label(group, slug) {
    var labels = config[group];
    return labels && Object.prototype.hasOwnProperty.call(labels, slug)
      && typeof labels[slug] === 'string' && labels[slug] ? labels[slug] : slug;
  }

  function applyWritingFilters(records, state) {
    var query = (state.query || '').trim().toLocaleLowerCase('zh-CN');
    return records.filter(function (item) {
      var haystack = [item.title, item.summary].concat(item.tags || []).join(' ').toLocaleLowerCase('zh-CN');
      return (!query || haystack.indexOf(query) !== -1)
        && (!state.kind || item.kind === state.kind)
        && (!state.category || item.category === state.category);
    });
  }

  function coverPath(path) {
    if (typeof path !== 'string' || path.indexOf('assets/images/covers/') !== 0
      || /[\\?#\u0000-\u001f\u007f]/.test(path)) return '';
    var parts = path.split('/');
    return parts.every(function (part) { return part && part !== '.' && part !== '..'; })
      ? parts.map(encodeURIComponent).join('/') : '';
  }

  function cover(item) {
    var element = node('div', 'writing-cover');
    var fallback = node('span', 'writing-cover-label', label('categories', item.category));
    fallback.setAttribute('aria-hidden', 'true');
    element.appendChild(fallback);
    var path = coverPath(item.cover);
    if (path) {
      var image = node('img');
      image.alt = item.coverAlt || '';
      image.addEventListener('load', function () { fallback.hidden = true; });
      image.addEventListener('error', function () { image.remove(); fallback.hidden = false; });
      image.src = path;
      element.appendChild(image);
    }
    return element;
  }

  function dateNode(value) {
    var date = data.formatDate(value);
    var time = node('time', 'article-date', date);
    time.setAttribute('datetime', date);
    return time;
  }

  function card(item, featured) {
    var link = node('a', featured ? 'writing-feature' : 'article-card writing-card');
    link.href = data.articleHref(item.slug);
    link.setAttribute('aria-label', item.title);
    link.appendChild(cover(item));
    var body = node('div', 'writing-card-body');
    if (featured) body.appendChild(node('span', 'section-label', '推荐阅读 / Featured'));
    var meta = node('div', 'article-card-header');
    meta.appendChild(node('span', 'article-category', label('categories', item.category)));
    meta.appendChild(dateNode(item.date));
    body.appendChild(meta);
    body.appendChild(node('h3', '', item.title));
    body.appendChild(node('p', '', item.summary));
    body.appendChild(node('p', 'writing-meta', label('kinds', item.kind) + ' · ' + item.readingMinutes + ' 分钟阅读'));
    var tags = node('div', 'blog-tags');
    (item.tags || []).forEach(function (tag) { tags.appendChild(node('span', 'blog-tag', tag)); });
    body.appendChild(tags);
    link.appendChild(body);
    return link;
  }

  function renderArchive(visible) {
    archive.replaceChildren();
    var year = '';
    var month = '';
    var section;
    var list;
    visible.forEach(function (item) {
      var date = data.formatDate(item.date);
      if (!date) return;
      if (date.slice(0, 4) !== year) {
        year = date.slice(0, 4);
        month = '';
        section = node('section', 'writing-archive-year');
        section.appendChild(node('h3', '', year));
        archive.appendChild(section);
      }
      if (date.slice(5, 7) !== month) {
        month = date.slice(5, 7);
        section.appendChild(node('h4', '', month + ' 月'));
        list = node('ul');
        section.appendChild(list);
      }
      var entry = node('li');
      var link = node('a', '', item.title);
      link.href = data.articleHref(item.slug);
      entry.appendChild(dateNode(date));
      entry.appendChild(link);
      list.appendChild(entry);
    });
    if (!visible.length) archive.appendChild(node('p', 'writing-empty', '暂无匹配的归档。'));
  }

  function renderWriting(records) {
    var visible = records.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    results.replaceChildren();
    feature.replaceChildren();
    feature.hidden = !visible.length;
    count.textContent = visible.length + ' 篇文章';
    if (visible.length) {
      var featured = visible.find(function (item) { return item.slug === config.featuredSlug; }) || visible[0];
      feature.appendChild(card(featured, true));
      visible.forEach(function (item) { results.appendChild(card(item, false)); });
    } else {
      results.appendChild(node('p', 'writing-empty', '没有找到匹配的文章。试试其他关键词或分类。'));
    }
    renderArchive(visible);
  }

  function update() {
    renderWriting(applyWritingFilters(items, { query: search.value, kind: kind.value, category: category.value }));
  }

  function populate(select, field, group) {
    // Keep the initial all-items option and include unknown slugs from the index.
    select.replaceChildren(select.options[0]);
    var slugs = Object.keys(config[group] || {});
    items.forEach(function (item) { if (slugs.indexOf(item[field]) === -1) slugs.push(item[field]); });
    slugs.forEach(function (slug) {
      var option = node('option', '', label(group, slug));
      option.value = slug;
      select.appendChild(option);
    });
  }

  var configRequest = data.loadConfig().catch(function () { return {}; });
  function load() {
    results.setAttribute('aria-busy', 'true');
    count.textContent = '正在加载文章…';
    results.replaceChildren();
    Promise.all([data.load(), configRequest]).then(function (values) {
      items = values[0];
      config = values[1] && typeof values[1] === 'object' ? values[1] : {};
      populate(kind, 'kind', 'kinds');
      populate(category, 'category', 'categories');
      [search, kind, category].forEach(function (control) { control.disabled = false; });
      update();
    }).catch(function () {
      count.textContent = '文章加载失败';
      results.appendChild(node('p', 'writing-empty', '文章加载失败，请稍后重试。'));
      var retry = node('button', 'btn', '重试');
      retry.type = 'button';
      retry.addEventListener('click', function () {
        load();
        // A replaced retry button must not leave keyboard focus on the body.
        count.tabIndex = -1;
        count.focus();
      });
      results.appendChild(retry);
    }).finally(function () { results.setAttribute('aria-busy', 'false'); });
  }

  search.addEventListener('input', update);
  kind.addEventListener('change', update);
  category.addEventListener('change', update);
  window.applyWritingFilters = applyWritingFilters;
  window.renderWriting = renderWriting;
  load();
})();
