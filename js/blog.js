/**
 * blog.js — Shared blog logic for Jingtine's portfolio
 * Handles: article list rendering, category filtering, article detail loading
 */

const CATEGORY_MAP = {
  'ai-agent': 'AI Agent',
  'ai-news': 'AI News',
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
 * Wiki index cache — loaded once, reused for all [[Wiki Link]] resolution
 */
var wikiPagesCache = null;
var wikiPagesLoaded = false;

function loadWikiIndex() {
  if (wikiPagesLoaded) return Promise.resolve(wikiPagesCache);
  wikiPagesLoaded = true;
  return fetch('public/data/wiki.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var pages = Array.isArray(data) ? data : (data && data.pages) || [];
      wikiPagesCache = pages;
      return pages;
    })
    .catch(function (err) {
      console.warn('Failed to load wiki.json, wiki links will not be rendered:', err.message);
      wikiPagesCache = [];
      return [];
    });
}

/**
 * Resolve a [[reference]] string to a wiki page object.
 * Priority: 1) exact page.id  2) page.id slug (last segment)  3) title (case-insensitive)
 * Returns null for ambiguous or unknown references.
 */
function resolveWikiReference(reference, pages) {
  var ref = reference.trim();

  for (var i = 0; i < pages.length; i++) {
    if (pages[i].id === ref) return pages[i];
  }

  var slugMatches = [];
  for (var j = 0; j < pages.length; j++) {
    var idSlug = pages[j].id.split('/').pop();
    if (idSlug === ref) slugMatches.push(pages[j]);
  }
  if (slugMatches.length === 1) return slugMatches[0];

  var titleMatches = [];
  var refLower = ref.toLowerCase();
  for (var k = 0; k < pages.length; k++) {
    if ((pages[k].title || '').toLowerCase() === refLower) titleMatches.push(pages[k]);
  }
  if (titleMatches.length === 1) return titleMatches[0];

  if (slugMatches.length > 1 || titleMatches.length > 1) {
    console.warn('Ambiguous wiki reference: [[' + reference + ']]');
  }
  return null;
}

var WIKI_LINK_SKIP_TAGS = { A: true, CODE: true, PRE: true, SCRIPT: true, STYLE: true, TEXTAREA: true };

function renderWikiLinks(container, pages) {
  if (!pages || pages.length === 0) return;
  walkAndReplace(container, /\[\[([^\]]+)\]\]/g, pages);
}

function walkAndReplace(root, regex, pages) {
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      var parent = node.parentNode;
      if (parent && WIKI_LINK_SKIP_TAGS[parent.nodeName]) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  }, false);

  var textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  for (var i = 0; i < textNodes.length; i++) {
    var tn = textNodes[i];
    var text = tn.textContent;
    regex.lastIndex = 0;
    if (!regex.test(text)) continue;
    regex.lastIndex = 0;

    var frag = document.createDocumentFragment();
    var lastIdx = 0;
    var match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
      }
      var page = resolveWikiReference(match[1], pages);
      if (page) {
        var a = document.createElement('a');
        a.href = 'wiki.html#' + encodeURIComponent(page.id);
        a.className = 'wiki-link';
        a.textContent = page.title || match[1];
        frag.appendChild(a);
      } else {
        frag.appendChild(document.createTextNode(match[0]));
      }
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
    tn.parentNode.replaceChild(frag, tn);
  }
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
  if (window.SiteMotion) window.SiteMotion.revealNewElements(container);
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
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.text();
  }).then(function (md) {
    var body = document.getElementById('article-body');
    body.innerHTML = marked.parse(md);
    loadWikiIndex().then(function (pages) {
      renderWikiLinks(body, pages);
    });
  }).catch(function () {
    document.getElementById('article-body').innerHTML =
      '<p style="text-align:center;color:var(--color-text-muted);padding:48px;">Failed to load article.</p>';
  });
}
