/* Reuse the blog index and ordering; never embed changing counts. */
(function () {
  var categoryLabels = { 'ai-agent': 'AI Agent', 'ai-news': 'AI News', 'software-engineering': 'Software Engineering', 'product-thinking': 'Product Thinking' };
  function renderArticleList(containerId, articles, limit) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var list = articles;
    if (limit) {
      list = list.slice(0, limit);
    }

    container.textContent = '';
    if (!list.length) { container.textContent = 'No articles yet.'; return; }
    list.forEach(function (article) {
      var card = document.createElement('a'); card.className = 'article-card';
      card.href = ArticleData.articleHref(article.slug);
      var header = document.createElement('div'); header.className = 'article-card-header';
      var category = document.createElement('span'); category.className = 'article-category';
      category.textContent = categoryLabels[article.category] || article.category;
      var date = document.createElement('span'); date.className = 'article-date'; date.textContent = ArticleData.formatDate(article.date);
      header.append(category, date);
      var title = document.createElement('h3'); title.textContent = article.title;
      var summary = document.createElement('p'); summary.textContent = article.summary;
      card.append(header, title, summary); container.appendChild(card);
    });
    if (window.SiteMotion) window.SiteMotion.revealNewElements(container);
  }

  function load() {
    var list = document.getElementById('latest-posts');
    list.textContent = '正在加载随笔…';
    ArticleData.load().then(function (articles) {
      renderArticleList('latest-posts', articles, 3);
    }).catch(function () {
      list.textContent = '随笔加载失败。';
      var retry = document.createElement('button');
      retry.className = 'btn'; retry.textContent = '重试';
      retry.addEventListener('click', load); list.appendChild(retry);
    });
  }
  load();
})();
