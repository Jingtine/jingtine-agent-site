/**
 * wiki.js — Personal Wiki: search, filter, card render, detail view
 *
 * SECURITY: All wiki content uses textContent for titles/tags/summaries.
 * Markdown body rendered by marked.js (trusted local content).
 */
(function () {
  var allPages = [];
  var currentCategory = '';
  var listInitialized = false;

  // ── Hash routing ──────────────────────────────────────
  window.addEventListener('hashchange', function () {
    if (allPages.length === 0) return;
    syncViewFromHash();
  });

  function getPageIdFromHash() {
    var hash = location.hash;
    if (!hash || hash === '#') return null;
    return decodeURIComponent(hash.slice(1));
  }

  function getPageById(id) {
    for (var i = 0; i < allPages.length; i++) {
      if (allPages[i].id === id) return allPages[i];
    }
    return null;
  }

  function openPageById(id) {
    location.hash = encodeURIComponent(id);
  }

  function syncViewFromHash() {
    var id = getPageIdFromHash();
    if (id) {
      var page = getPageById(id);
      if (page) {
        showDetail(page);
        return;
      }
      console.warn('Wiki page not found: ' + id);
      showList();
      var container = document.getElementById('wiki-article-list');
      var msg = document.createElement('div');
      msg.setAttribute('style', 'text-align:center;color:var(--color-text-muted);padding:8px;font-size:13px;');
      msg.textContent = '"' + id + '" not found. Showing all pages.';
      if (container.firstChild) {
        container.insertBefore(msg, container.firstChild);
      } else {
        container.appendChild(msg);
      }
      return;
    }
    showList();
  }

  function showList() {
    document.getElementById('wiki-detail-view').style.display = 'none';
    document.getElementById('wiki-list-view').style.display = 'block';
    window.scrollTo(0, 0);
    if (!listInitialized) {
      listInitialized = true;
      filterAndRender();
    }
  }

  // ── Init ──────────────────────────────────────────────
  fetch('public/data/wiki.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var pages = Array.isArray(data) ? data : (data && data.pages) || [];
      if (!Array.isArray(pages)) throw new Error('wiki.json: pages is not an array');
      allPages = pages;
      setupCategoryFilter();
      setupSearch();
      if (allPages.length === 0) {
        showEmpty('No wiki pages yet.');
      } else {
        syncViewFromHash();
      }
    })
    .catch(function (error) {
      console.error('Failed to load wiki:', error);
      showEmpty('Failed to load wiki.');
    });

  // ── Category filter ────────────────────────────────────
  function setupCategoryFilter() {
    var cats = {};
    for (var i = 0; i < allPages.length; i++) {
      var c = allPages[i].category;
      if (c) cats[c] = true;
    }
    var container = document.getElementById('wiki-category-tags');
    container.textContent = '';

    var allBtn = document.createElement('button');
    allBtn.className = 'blog-tag blog-tag-active';
    allBtn.setAttribute('data-category', '');
    allBtn.textContent = 'All';
    allBtn.addEventListener('click', function () {
      currentCategory = '';
      setActiveTag('');
      filterAndRender();
    });
    container.appendChild(allBtn);

    var keys = Object.keys(cats).sort();
    for (var j = 0; j < keys.length; j++) {
      var btn = document.createElement('button');
      btn.className = 'blog-tag';
      btn.setAttribute('data-category', keys[j]);
      btn.textContent = keys[j];
      btn.addEventListener('click', function () {
        currentCategory = this.getAttribute('data-category');
        setActiveTag(currentCategory);
        filterAndRender();
      });
      container.appendChild(btn);
    }
  }

  function setActiveTag(cat) {
    var tags = document.querySelectorAll('#wiki-category-tags .blog-tag');
    for (var i = 0; i < tags.length; i++) {
      var t = tags[i].getAttribute('data-category');
      if (t === cat) {
        tags[i].classList.add('blog-tag-active');
      } else {
        tags[i].classList.remove('blog-tag-active');
      }
    }
  }

  // ── Search ────────────────────────────────────────────
  function setupSearch() {
    var input = document.getElementById('wiki-search');
    if (!input) return;
    input.addEventListener('input', function () {
      filterAndRender();
    });
  }

  function filterAndRender() {
    var query = '';
    var input = document.getElementById('wiki-search');
    if (input) query = input.value.toLowerCase().trim();

    var filtered = allPages;
    if (currentCategory) {
      filtered = filtered.filter(function (p) {
        return p.category === currentCategory;
      });
    }
    if (query) {
      filtered = filtered.filter(function (p) {
        return (p.title || '').toLowerCase().indexOf(query) !== -1
          || (p.summary || '').toLowerCase().indexOf(query) !== -1;
      });
    }
    renderList(filtered);
  }

  // ── Card list ─────────────────────────────────────────
  function renderList(pages) {
    listInitialized = true;
    var container = document.getElementById('wiki-article-list');
    if (!container) return;
    container.textContent = '';

    if (!pages || pages.length === 0) {
      showEmpty('No pages found.');
      return;
    }

    for (var i = 0; i < pages.length; i++) {
      var card = createCard(pages[i]);
      if (card) container.appendChild(card);
    }

    try {
      if (window.SiteMotion) window.SiteMotion.revealNewElements(container);
    } catch (motionError) {
      console.warn('Motion enhancement failed:', motionError);
    }
  }

  function createCard(page) {
    var card = document.createElement('div');
    card.className = 'article-card';
    card.style.cursor = 'pointer';
    card.addEventListener('click', function () {
      openPageById(page.id);
    });

    // Header: category badge + updated date
    var header = document.createElement('div');
    header.className = 'article-card-header';

    var cat = document.createElement('span');
    cat.className = 'article-category';
    cat.textContent = page.category || '';

    var date = document.createElement('span');
    date.className = 'article-date';
    date.textContent = page.updated || '';

    header.appendChild(cat);
    header.appendChild(date);

    // Title
    var title = document.createElement('h3');
    title.textContent = page.title || '';

    // Summary
    var summary = document.createElement('p');
    summary.textContent = page.summary || '';

    // Tags
    var tagsDiv = document.createElement('div');
    tagsDiv.setAttribute('style', 'margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;');
    var tags = page.tags || [];
    for (var t = 0; t < tags.length; t++) {
      var tag = document.createElement('span');
      tag.className = 'article-date';
      tag.textContent = '#' + tags[t];
      tagsDiv.appendChild(tag);
    }

    card.appendChild(header);
    card.appendChild(title);
    card.appendChild(summary);
    card.appendChild(tagsDiv);

    return card;
  }

  // ── Detail view ───────────────────────────────────────
  function showDetail(page) {
    document.getElementById('wiki-list-view').style.display = 'none';
    var detail = document.getElementById('wiki-detail-view');
    detail.style.display = 'block';

    document.getElementById('wiki-detail-title').textContent = page.title || '';
    document.getElementById('wiki-detail-meta').textContent =
      (page.category || '') + '  ' + (page.updated || '');

    var body = document.getElementById('wiki-detail-body');
    body.textContent = '';
    body.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:24px;">Loading...</p>';

    fetch(page.path)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (md) {
        body.innerHTML = marked.parse(cleanMarkdown(md));
        renderWikiLinks(body, page);
        try {
          if (window.SiteMotion) window.SiteMotion.revealNewElements(body);
        } catch (motionError) {
          console.warn('Motion enhancement failed:', motionError);
        }
      })
      .catch(function (error) {
        console.error('Failed to load wiki page:', error);
        body.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:24px;">Failed to load page.</p>';
      });
  }

  function renderWikiLinks(body, currentPage) {
    // Find rendered [[page-name]] text and convert to clickable spans
    // marked.js renders [[...]] as literal text in paragraphs
    // We'll walk text nodes and replace the pattern
    walkAndReplace(body, /\[\[([^\]]+)\]\]/g);
  }

  function walkAndReplace(node, regex) {
    var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
    var textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }
    for (var i = 0; i < textNodes.length; i++) {
      var tn = textNodes[i];
      var text = tn.textContent;
      if (regex.test(text)) {
        regex.lastIndex = 0;
        var frag = document.createDocumentFragment();
        var lastIdx = 0;
        var match;
        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIdx) {
            frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
          }
          var span = document.createElement('span');
          span.className = 'wiki-link';
          span.setAttribute('data-page', match[1].toLowerCase().replace(/\s+/g, '-').trim());
          span.textContent = match[1];
          span.style.cssText = 'color:var(--accent-purple);cursor:pointer;text-decoration:underline;';
          span.addEventListener('click', function () {
            var pid = this.getAttribute('data-page');
            for (var k = 0; k < allPages.length; k++) {
              if (allPages[k].id === pid || allPages[k].id.endsWith('/' + pid)) {
                openPageById(allPages[k].id);
                return;
              }
            }
          });
          frag.appendChild(span);
          lastIdx = match.index + match[0].length;
        }
        if (lastIdx < text.length) {
          frag.appendChild(document.createTextNode(text.slice(lastIdx)));
        }
        tn.parentNode.replaceChild(frag, tn);
      }
    }
  }

  // ── Back button ───────────────────────────────────────
  document.getElementById('wiki-back').addEventListener('click', function () {
    location.hash = '';
  });

  // ── Helpers ──────────────────────────────────────────
  function cleanMarkdown(md) {
    return md.replace(/^---[\s\S]*?---\n?/m, '');
  }

  function showEmpty(msg) {
    var container = document.getElementById('wiki-article-list');
    container.textContent = '';
    var p = document.createElement('p');
    p.setAttribute('style', 'text-align:center;color:var(--color-text-muted);padding:24px;');
    p.textContent = msg;
    container.appendChild(p);
  }
})();
