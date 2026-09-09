/* Reading enhancements keep Markdown source and existing anchors intact. */
function prepareReading(body) {
  var old = body.previousElementSibling;
  if (old && old.classList.contains('reading-toc')) old.remove();
  body.querySelectorAll('h1').forEach(function (heading) {
    var replacement = document.createElement('h2');
    for (var attr of heading.attributes) replacement.setAttribute(attr.name, attr.value);
    while (heading.firstChild) replacement.appendChild(heading.firstChild);
    heading.replaceWith(replacement);
  });
  var toc = document.createElement('details'); toc.className = 'reading-toc';
  var summary = document.createElement('summary'); summary.textContent = '本页目录 / Contents'; toc.appendChild(summary);
  var headings = body.querySelectorAll('h2,h3');
  headings.forEach(function (heading, i) {
    if (!heading.id) heading.id = body.id + '-section-' + (i + 1);
    var link = document.createElement('a'); link.href = '#' + encodeURIComponent(heading.id); link.textContent = heading.textContent;
    if (body.id === 'wiki-detail-body') link.addEventListener('click', function (event) {
      event.preventDefault();
      heading.tabIndex = -1; heading.focus({preventScroll:true}); heading.scrollIntoView();
    });
    toc.appendChild(link);
  });
  if (headings.length) body.before(toc);
  body.querySelectorAll('pre,table').forEach(function (el) { el.tabIndex = 0; el.setAttribute('aria-label', el.tagName === 'PRE' ? '代码，可横向滚动' : '表格，可横向滚动'); });
  body.querySelectorAll('a[href]').forEach(function (a) {
    try { var url = new URL(a.getAttribute('href'), location.href);
      if (url.origin !== location.origin && url.protocol === 'https:') a.rel = 'noopener noreferrer';
    } catch (_) { /* Existing Markdown text remains readable. */ }
  });
}
