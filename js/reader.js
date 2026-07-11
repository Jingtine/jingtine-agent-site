/**
 * reader.js — RSS Reader page logic
 *
 * Reuses Blog's CSS classes (blog-tag, article-card, btn, etc.)
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
  var currentSource = '';

  var DATA_URL = 'public/data/rss-items.json';

  var CATEGORY_MAP = {
    'ai-agent': 'AI Agent',
    'software-engineering': 'Software Engineering',
    'product-thinking': 'Product Thinking'
  };

  // ── Init ──────────────────────────────────────────────
  fetch(DATA_URL)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      allItems = data.items || [];
      initSourceFilter();
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

  // ── Source filter ──────────────────────────────────── ─────────────────────────────────────────────
  function render() {
    var filtered = allItems;

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

  // ── Secure card creation (reuses article-card + btn) ─
  function createCard(item) {
    // Validate link — must be https
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
    cat.textContent = CATEGORY_MAP[item.category] || item.category || '';

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

    // Footer: source + read original button
    var footer = document.createElement('div');
    footer.setAttribute(
      'style',
      'display:flex;align-items:center;justify-content:space-between;margin-top:14px;'
    );

    var source = document.createElement('span');
    source.setAttribute(
      'style',
      'font-size:12px;color:var(--color-text-muted);'
    );
    source.textContent = (item.source && item.source.name)
      ? item.source.name
      : 'Unknown';

    var btn = document.createElement('a');
    btn.className = 'btn btn-outline';
    btn.href = item.link;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.textContent = 'Read Original \u2192';

    footer.appendChild(source);
    footer.appendChild(btn);

    card.appendChild(header);
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(footer);

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
