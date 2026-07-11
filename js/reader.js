/**
 * reader.js — RSS Reader: source list + per-source article view
 *
 * Reuses Blog's CSS classes (article-card, home-skill-card, btn, etc.)
 *
 * SECURITY: All external feed data is untrusted.
 * - Titles, descriptions, source names use textContent only
 * - No innerHTML for external content
 * - Links must be https://
 * - External links get rel="noopener noreferrer"
 */
(function () {
  var allItems = [];
  var sourceMap = {};

  var DATA_URL = 'public/data/rss-items.json';

  // ── Init ──────────────────────────────────────────────
  fetch(DATA_URL)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      allItems = data.items || [];
      buildSourceMap();
      renderSourceList();
    })
    .catch(function () {
      showEmpty('Failed to load data.', 'source-cards');
    });

  function buildSourceMap() {
    for (var i = 0; i < allItems.length; i++) {
      var src = allItems[i].source;
      if (!src || !src.id) continue;
      if (!sourceMap[src.id]) {
        sourceMap[src.id] = { id: src.id, name: src.name, items: [] };
      }
      sourceMap[src.id].items.push(allItems[i]);
    }
  }

  // ── View 1: Source List ────────────────────────────────
  function renderSourceList() {
    document.getElementById('reader-source-view').style.display = 'block';
    document.getElementById('reader-article-view').style.display = 'none';

    var container = document.getElementById('source-cards');
    container.textContent = '';

    var keys = Object.keys(sourceMap);
    if (keys.length === 0) {
      showEmpty('No sources found.', 'source-cards');
      return;
    }

    // Sort by most recent article per source
    keys.sort(function (a, b) {
      var da = sourceMap[a].items[0] ? sourceMap[a].items[0].pubDate : '';
      var db = sourceMap[b].items[0] ? sourceMap[b].items[0].pubDate : '';
      return db.localeCompare(da);
    });

    for (var i = 0; i < keys.length; i++) {
      var src = sourceMap[keys[i]];
      var card = createSourceCard(src);
      container.appendChild(card);
    }
  }

  function createSourceCard(src) {
    var card = document.createElement('div');
    card.className = 'home-skill-card';
    card.style.cursor = 'pointer';
    card.addEventListener('click', function () {
      showArticleList(src);
    });

    var title = document.createElement('h3');
    title.textContent = src.name;

    var meta = document.createElement('p');
    meta.setAttribute('style', 'font-size:13px;color:var(--color-text-muted);margin-bottom:14px;line-height:1.5;');
    meta.textContent = src.items.length + ' articles';

    // Latest update date
    if (src.items.length > 0 && src.items[0].pubDate) {
      meta.textContent += ' | Latest: ' + formatDate(src.items[0].pubDate);
    }

    var btn = document.createElement('span');
    btn.className = 'btn btn-outline';
    btn.textContent = 'View Articles \u2192';
    btn.setAttribute('style', 'margin-top:auto;');

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(btn);
    return card;
  }

  // ── View 2: Article List ──────────────────────────────
  function showArticleList(src) {
    document.getElementById('reader-source-view').style.display = 'none';
    document.getElementById('reader-article-view').style.display = 'block';
    window.scrollTo(0, 0);

    document.getElementById('reader-source-name').textContent = src.name;
    document.getElementById('reader-source-stats').textContent = src.items.length + ' articles';

    var container = document.getElementById('reader-list');
    container.textContent = '';

    if (src.items.length === 0) {
      showEmpty('No articles found.', 'reader-list');
      return;
    }

    for (var i = 0; i < src.items.length; i++) {
      var card = createArticleCard(src.items[i]);
      if (card) container.appendChild(card);
    }
  }

  // ── Secure article card ───────────────────────────────
  function createArticleCard(item) {
    if (!item.link || item.link.indexOf('https://') !== 0) {
      return null;
    }

    var card = document.createElement('div');
    card.className = 'article-card';

    // Header: category badge + date
    var header = document.createElement('div');
    header.className = 'article-card-header';

    var cat = document.createElement('span');
    cat.className = 'article-category';
    var catLabel = CATEGORY_MAP[item.category] || item.category || '';
    cat.textContent = catLabel;

    var date = document.createElement('span');
    date.className = 'article-date';
    date.textContent = formatDate(item.pubDate);

    header.appendChild(cat);
    header.appendChild(date);

    // Title
    var title = document.createElement('h3');
    title.textContent = item.title || '';

    // Summary
    var desc = document.createElement('p');
    desc.textContent = item.description || '';

    // Footer: read original button
    var footer = document.createElement('div');
    footer.setAttribute('style', 'display:flex;justify-content:flex-end;margin-top:14px;');

    var btn = document.createElement('a');
    btn.className = 'btn btn-outline';
    btn.href = item.link;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.textContent = 'Read Original \u2192';

    footer.appendChild(btn);

    card.appendChild(header);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(footer);

    return card;
  }

  // ── Helpers ───────────────────────────────────────────
  var CATEGORY_MAP = {
    'ai-agent': 'AI Agent',
    'software-engineering': 'Software Engineering',
    'product-thinking': 'Product Thinking'
  };

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function showEmpty(msg, id) {
    var el = document.getElementById(id);
    el.textContent = '';
    var p = document.createElement('p');
    p.setAttribute('style', 'text-align:center;color:var(--color-text-muted);padding:24px;grid-column:1/-1;');
    p.textContent = msg;
    el.appendChild(p);
  }

  // Back button
  document.getElementById('reader-back').addEventListener('click', function () {
    renderSourceList();
    window.scrollTo(0, 0);
  });
})();
