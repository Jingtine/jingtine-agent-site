/* Reuse the blog index and ordering; never embed changing counts. */
(function () {
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
