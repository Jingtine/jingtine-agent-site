/**
 * papers.js — Load and render research papers from public/data/papers.json
 *
 * SECURITY: All external data (titles, authors, summaries) use textContent only.
 * No innerHTML for external content.
 * Links must be https://
 * External links get rel="noopener noreferrer"
 */
(function () {
  fetch('public/data/papers.json')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var papers = data.papers || [];
      renderPapers(papers);
    })
    .catch(function () {
      var el = document.getElementById('papers-list');
      el.textContent = '';
      var p = document.createElement('p');
      p.setAttribute('style', 'text-align:center;color:var(--color-text-muted);padding:24px;');
      p.textContent = 'Failed to load papers.';
      el.appendChild(p);
    });

  function renderPapers(papers) {
    var container = document.getElementById('papers-list');
    container.textContent = '';

    if (papers.length === 0) {
      var p = document.createElement('p');
      p.setAttribute('style', 'text-align:center;color:var(--color-text-muted);padding:24px;');
      p.textContent = 'No papers found.';
      container.appendChild(p);
      return;
    }

    for (var i = 0; i < papers.length; i++) {
      var card = createCard(papers[i]);
      if (card) {
        container.appendChild(card);
      }
    }
  }

  function createCard(paper) {
    if (!paper.url || paper.url.indexOf('https://') !== 0) {
      return null;
    }

    var card = document.createElement('div');
    card.className = 'article-card';

    // Header: source badge + published date
    var header = document.createElement('div');
    header.className = 'article-card-header';

    var source = document.createElement('span');
    source.className = 'article-category';
    source.textContent = paper.source || 'arXiv';

    var date = document.createElement('span');
    date.className = 'article-date';
    date.textContent = paper.published || '';

    header.appendChild(source);
    header.appendChild(date);

    // Title
    var title = document.createElement('h3');
    title.textContent = paper.title || '';

    // Authors
    var authors = document.createElement('p');
    var authorStr = '';
    if (paper.authors && paper.authors.length > 0) {
      authorStr = paper.authors.slice(0, 3).join(', ');
      if (paper.authors.length > 3) {
        authorStr += ' et al.';
      }
    }
    authors.textContent = authorStr;

    // Summary
    var summary = document.createElement('p');
    summary.textContent = paper.summary || '';

    // Footer: read paper button
    var footer = document.createElement('div');
    footer.setAttribute('style', 'display:flex;align-items:center;justify-content:space-between;margin-top:14px;');

    var label = document.createElement('span');
    label.setAttribute('style', 'font-size:12px;color:var(--color-text-muted);');
    label.textContent = paper.id || '';

    var btn = document.createElement('a');
    btn.className = 'btn btn-outline';
    btn.href = paper.url;
    btn.target = '_blank';
    btn.rel = 'noopener noreferrer';
    btn.textContent = 'Read Paper \u2192';

    footer.appendChild(label);
    footer.appendChild(btn);

    card.appendChild(header);
    card.appendChild(title);
    card.appendChild(authors);
    card.appendChild(summary);
    card.appendChild(footer);

    return card;
  }
})();
