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

