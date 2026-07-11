/**
 * reader.js — RSS Reader: source list + per-source article view
 *
 * Features: stats bar, search, reading time, enhanced source cards.
 *
 * SECURITY: All external feed data is untrusted.
 * - Titles, descriptions, source names use textContent only.
 * - Links must be https://
 * - External links get rel="noopener noreferrer"
 */
(function () {
  var allItems = [];
  var sourceMap = {};
  var feedDescriptions = {};
  var STATUS_URL = 'public/data/status.json';
  var DATA_URL = 'public/data/rss-items.json';
  var FEEDS_URL = 'config/feeds.json';

  // ── Init ──────────────────────────────────────────────
  Promise.all([
    fetch(DATA_URL).then(function (r) { return r.json(); }),
    fetch(FEEDS_URL).then(function (r) { return r.json(); }),
    fetch(STATUS_URL).then(function (r) { return r.json(); }).catch(function () { return null; })
  ]).then(function (results) {
    allItems = results[0].items || [];
    var feeds = results[1];
    var status = results[2];
    for (var i = 0; i < feeds.length; i++) {
      feedDescriptions[feeds[i].id] = feeds[i].description || '';
    }
    buildSourceMap();
    renderSourceList();
    updateStats(status);
  }).catch(function () {
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

  // ── Stats bar ─────────────────────────────────────────
  function updateStats(status) {
    var keys = Object.keys(sourceMap);
    document.getElementById('stats-sources').textContent = keys.length + ' Sources';
    document.getElementById('stats-articles').textContent = allItems.length + ' Articles';
    if (status && status.generated) {
      document.getElementById('stats-updated').textContent = 'Updated ' + status.generated.slice(0, 16).replace('T', ' ');
    }
  }

  // ── View 1: Source List ───────────────────────────────
  function renderSourceList() {
    document.getElementById('reader-source-view').style.display = 'block';
    document.getElementById('reader-article-view').style.display = 'none';

    var container = document.getElementById('source-cards');
    container.textContent = '';

    var keys = Object.keys(sourceMap);
    if (keys.length === 0) { showEmpty('No sources found.', 'source-cards'); return; }

    keys.sort(function (a, b) {
      var da = sourceMap[a].items[0] ? sourceMap[a].items[0].pubDate : '';
      var db = sourceMap[b].items[0] ? sourceMap[b].items[0].pubDate : '';
      return db.localeCompare(da);
    });

    for (var i = 0; i < keys.length; i++) {
      var card = createSourceCard(sourceMap[keys[i]]);
      container.appendChild(card);
    }

    // Search handler
    var search = document.getElementById('source-search');
    search.value = '';
    search.oninput = function () {
      var q = search.value.toLowerCase().trim();
      var cards = container.querySelectorAll('.home-skill-card');
      for (var j = 0; j < cards.length; j++) {
        var name = cards[j].getAttribute('data-source-name') || '';
        cards[j].style.display = !q || name.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
      }
    };
  }

  function createSourceCard(src) {
    var card = document.createElement('div');
    card.className = 'home-skill-card';
    card.style.cursor = 'pointer';
    card.setAttribute('data-source-name', src.name);
    card.addEventListener('click', function () { showArticleList(src); });

    var title = document.createElement('h3');
    title.textContent = src.name;

    var meta = document.createElement('p');
    meta.setAttribute('style', 'font-size:13px;color:var(--color-text-muted);margin-bottom:10px;line-height:1.5;');
    var latest = src.items[0] ? formatDate(src.items[0].pubDate) : '';
    meta.textContent = src.items.length + ' articles | Latest: ' + latest;

    var desc = document.createElement('p');
    desc.setAttribute('style', 'font-size:13px;color:var(--color-text-secondary);line-height:1.5;');
    desc.textContent = feedDescriptions[src.id] || '';

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(desc);
    return card;
  }

  // ── View 2: Article List ──────────────────────────────
  function showArticleList(src) {
    document.getElementById('reader-source-view').style.display = 'none';
    document.getElementById('reader-article-view').style.display = 'block';
    window.scrollTo(0, 0);

    document.getElementById('reader-source-name').textContent = src.name;
    var descText = feedDescriptions[src.id] || '';
    document.getElementById('reader-source-stats').textContent =
      src.items.length + ' articles' + (descText ? ' | ' + descText : '');

    var container = document.getElementById('reader-list');
    container.textContent = '';

    if (src.items.length === 0) { showEmpty('No articles found.', 'reader-list'); return; }

    for (var i = 0; i < src.items.length; i++) {
      var card = createArticleCard(src.items[i]);
      if (card) container.appendChild(card);
    }
  }

  function createArticleCard(item) {
    if (!item.link || item.link.indexOf('https://') !== 0) return null;

    var card = document.createElement('div');
    card.className = 'article-card';

    var header = document.createElement('div');
    header.className = 'article-card-header';

    var cat = document.createElement('span');
    cat.className = 'article-category';
    cat.textContent = CATEGORY_MAP[item.category] || item.category || '';

    var date = document.createElement('span');
    date.className = 'article-date';
    var pubDate = formatDate(item.pubDate);
    date.textContent = 'Published ' + pubDate;

    header.appendChild(cat);
    header.appendChild(date);

    var title = document.createElement('h3');
    title.textContent = item.title || '';

    var desc = document.createElement('p');
    desc.textContent = item.description || '';

    var footer = document.createElement('div');
    footer.setAttribute('style', 'display:flex;align-items:center;justify-content:space-between;margin-top:14px;');

    var readTime = document.createElement('span');
    readTime.className = 'article-date';
    var min = Math.max(1, Math.round(((item.description || '').length) / 200));
    readTime.textContent = '\u2248 ' + min + ' min read';

    var btn = document.createElement('a');
    btn.className = 'btn btn-outline';
    btn.href = item.link;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.textContent = 'Read Original \u2192';

    footer.appendChild(readTime);
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
    'ai-news': 'AI News',
    'software-engineering': 'Software Engineering',
    'product-thinking': 'Product Thinking'
  };

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    var m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    return m + ' ' + d.getDate();
  }

  function showEmpty(msg, id) {
    var el = document.getElementById(id);
    el.textContent = '';
    var p = document.createElement('p');
    p.setAttribute('style', 'text-align:center;color:var(--color-text-muted);padding:24px;grid-column:1/-1;');
    p.textContent = msg;
    el.appendChild(p);
  }

  document.getElementById('reader-back').addEventListener('click', function () {
    renderSourceList();
    window.scrollTo(0, 0);
  });
})();
