/**
 * blog.js — Shared blog logic for Jingtine's portfolio
 * Handles: article list rendering, category filtering, article detail loading
 */

const CATEGORY_MAP = {
  'ai-agent': 'AI Agent',
  'software-engineering': 'Software Engineering',
  'product-thinking': 'Product Thinking'
};

/**
 * Format ISO date string to readable format
 */
function formatDate(dateStr) {
  var d = new Date(dateStr);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/**
 * Load article index from articles/index.json
 */
function loadArticleIndex() {
  return fetch('articles/index.json')
    .then(function (res) { return res.json(); })
    .then(function (articles) {
      articles.sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
      });
      return articles;
    });
}

/**
 * Render article list into a container element
 */
function renderArticleList(containerId, articles, limit) {
  var container = document.getElementById(containerId);
  if (!container) return;

  var list = articles;
  if (limit) {
    list = list.slice(0, limit);
  }

  if (list.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:24px;">No articles yet.</p>';
    return;
  }

  var html = '';
  for (var i = 0; i < list.length; i++) {
    var a = list[i];
    var cat = CATEGORY_MAP[a.category] || a.category;
    html +=
      '<a href="article.html?slug=' + a.slug + '" class="article-card">' +
        '<div class="article-card-header">' +
          '<span class="article-category">' + cat + '</span>' +
          '<span class="article-date">' + formatDate(a.date) + '</span>' +
        '</div>' +
        '<h3>' + a.title + '</h3>' +
        '<p>' + a.summary + '</p>' +
      '</a>';
  }
  container.innerHTML = html;
}

/**
 * Filter articles by category
 */
function filterByCategory(articles, category) {
  if (!category) return articles;
  return articles.filter(function (a) {
    return a.category === category;
  });
}

/**
 * Get URL parameter value
 */
function getParam(name) {
  var params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Load a single article by slug and render with marked
 * Used on article.html
 */
function loadArticleDetail() {
  var slug = getParam('slug');
  if (!slug) {
    document.getElementById('article-body').innerHTML =
      '<p style="text-align:center;color:var(--color-text-muted);padding:48px;">Article not found.</p>';
    return;
  }

  loadArticleIndex().then(function (articles) {
    var meta = null;
    for (var i = 0; i < articles.length; i++) {
      if (articles[i].slug === slug) {
        meta = articles[i];
        break;
      }
    }

    if (meta) {
      document.title = meta.title + ' — Jingtine';
      document.getElementById('article-title').textContent = meta.title;
      document.getElementById('article-meta').textContent =
        formatDate(meta.date) + ' · ' + (CATEGORY_MAP[meta.category] || meta.category);
    }

    return fetch('articles/' + slug + '.md');
  }).then(function (res) {
    return res.text();
  }).then(function (md) {
    document.getElementById('article-body').innerHTML = marked.parse(md);
  }).catch(function () {
    document.getElementById('article-body').innerHTML =
      '<p style="text-align:center;color:var(--color-text-muted);padding:48px;">Failed to load article.</p>';
  });
}
