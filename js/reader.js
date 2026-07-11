/**
 * reader.js — RSS Reader page logic
 *
 * Reuses Blog's CSS classes (blog-tag, article-card, etc.)
 * No reader-specific visual components.
 *
 * SECURITY: All external feed data is untrusted.
 * - Titles, descriptions, source names use textContent only
 * - No innerHTML for external content
 * - Links must be https://
 * - External links get rel="noopener noreferrer"
 */
(function () {
  var allItems = [];
  var currentCategory = '';
  var currentSource = '';

  var DATA_URL = 'public/data/rss-items.json';

  // ── Init ──────────────────────────────────────────────
  fetch(DATA_URL)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      allItems = data.items || [];
      initSourceFilter();
      setupCategoryFilter();
      render();
    })
    .catch(function () {
      var list = document.getElementById('reader-list');
      list.textContent = '';
      var p = document.createElement('p');
      p.setAttribute('style', 'text-align:center;color:var(--color-text-muted);padding:24px;');
      p.textContent = 'Failed to load articles.';
      list.appendChild(p);
    });

  // ── Source filter (dynamic, uses blog-tag classes) ────
  function initSourceFilter() {
    var sources = {};
    var order = [];
    for (var i = 0; i < allItems.length; i++) {
      var src = allItems[i].source;
      if (src && src.id && !sources[src.id]) {
        sources[src.id] = src.name;
        order.push(src.id);
      }
    }

    var container = document.getElementById('reader-source-tags');
    container.textContent = '';

    // "All" button
    var allBtn = document.createElement('button');
    allBtn.className = 'blog-tag blog-tag-active';
    allBtn.setAttribute('data-source', '');
    allBtn.textContent = 'All';
    container.appendChild(allBtn);

    // One button per source
    for (var j = 0; j < order.length; j++) {
      var sid = order[j];
      var btn = document.createElement('button');
      btn.className = 'blog-tag';
      btn.setAttribute('data-source', sid);
      btn.textContent = sources[sid];
      container.appendChild(btn);
    }

    // Click handlers
    var tags = container.querySelectorAll('.blog-tag');
    for (var k = 0; k < tags.length; k++) {
      tags[k].addEventListener('click', function () {
        currentSource = this.getAttribute('data-source');
        var all = container.querySelectorAll('.blog-tag');
        for (var m = 0; m < all.length; m++) {
          all[m].classList.remove('blog-tag-active');
        }
        this.classList.add('blog-tag-active');
        render();
      });
    }
  }

  // ── Category filter ────────────────────────────────────
  function setupCategoryFilter() {
    var tags = document.querySelectorAll('#reader-category-tags .blog-tag');
    for (var i = 0; i < tags.length; i++) {
      tags[i].addEventListener('click', function () {
        currentCategory = this.getAttribute('data-category');
        for (var j = 0; j < tags.length; j++) {
          tags[j].classList.remove('blog-tag-active');
        }
        this.classList.add('blog-tag-active');
        render();
      });
    }
  }

  // ── Render ─────────────────────────────────────────────
  function render() {
    var filtered = allItems;

    if (currentCategory) {
      filtered = filtered.filter(function (item) {
        return item.category === currentCategory;
      });
    }
    if (currentSource) {
      filtered = filtered.filter(function (item) {
        return item.source && item.source.id === currentSource;
      });
    }

    renderList(filtered);
  }

  function renderList(items) {
    var container = document.getElementById('reader-list');
    container.textContent = '';

    if (items.length === 0) {
      var p = document.createElement('p');
      p.setAttribute('style', 'text-align:center;color:var(--color-text-muted);padding:24px;');
      p.textContent = 'No articles found.';
      container.appendChild(p);
      return;
    }

    for (var i = 0; i < items.length; i++) {
      var card = createCard(items[i]);
      if (card) {
        container.appendChild(card);
      }
    }
  }

  // ── Secure card creation (reuses article-card classes) ─
  function createCard(item) {
    // Validate link — must be https
    if (!item.link || item.link.indexOf('https://') !== 0) {
      return null;
    }

    var card = document.createElement('a');
    card.className = 'article-card';
    card.href = item.link;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    // Header: source + date
    var header = document.createElement('div');
    header.className = 'article-card-header';

    var source = document.createElement('span');
    source.className = 'article-category';
    source.textContent = (item.source && item.source.name)
      ? item.source.name
      : 'Unknown';

    var date = document.createElement('span');
    date.className = 'article-date';
    date.textContent = formatDate(item.pubDate);

    header.appendChild(source);
    header.appendChild(date);

    // Title
    var title = document.createElement('h3');
    title.textContent = item.title || '';

    // Description
    var desc = document.createElement('p');
    desc.textContent = item.description || '';

    card.appendChild(header);
    card.appendChild(title);
    card.appendChild(desc);

    return card;
  }

  // ── Helpers ───────────────────────────────────────────
  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
})();
