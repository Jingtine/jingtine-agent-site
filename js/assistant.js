/**
 * assistant.js — AI Assistant based on personal wiki
 *
 * Pipeline: Search wiki.json → Retrieve pages → Generate answer with sources.
 * All external data uses textContent. No innerHTML for external content.
 */
(function () {
  var wikiPages = [];
  var WIKI_URL = 'public/data/wiki.json';
  var TOP_K = 5;

  fetch(WIKI_URL)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      wikiPages = data.pages || [];
    });

  // ── Event handlers ───────────────────────────────────
  document.getElementById('assistant-ask').addEventListener('click', function () {
    askQuestion();
  });
  document.getElementById('assistant-input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') askQuestion();
  });

  function askQuestion() {
    var input = document.getElementById('assistant-input');
    var question = input.value.trim();
    if (!question || wikiPages.length === 0) return;
    input.disabled = true;
    document.getElementById('assistant-ask').disabled = true;

    resetSteps();
    showSteps(true);

    // Step 1: Search
    setStep('step-search', 'Searching Wiki...', true);
    setTimeout(function () {
      var results = searchWiki(question, TOP_K);
      setStep('step-search', 'Found ' + results.length + ' related pages', false);

      if (results.length === 0) {
        finish('\u5f53\u524d Wiki \u4e2d\u6ca1\u6709\u8db3\u591f\u4fe1\u606f\u56de\u7b54\u8fd9\u4e2a\u95ee\u9898\u3002', []);
      }

      // Step 2: Retrieve page content
      setStep('step-retrieve', 'Retrieving page content...', true);
      loadPages(results, function (loadedPages, failedCount) {
        setStep('step-retrieve',
          'Loaded ' + results.length + ' pages'
          + (failedCount > 0 ? ' (' + failedCount + ' failed)' : ''),
          false);

        // Step 3: Generate
        setStep('step-generate', 'Generating Answer...', true);
        setTimeout(function () {
          var answer = generateAnswer(question, loadedPages);
          finish(answer.text, answer.sources);
        }, 300);
      });

    }, 400);
  }

  // ── Search ────────────────────────────────────────────
  function searchWiki(query, k) {
    var terms = query.toLowerCase().split(/\s+/).filter(function (t) {
      return t.length >= 2;
    });
    if (terms.length === 0) return [];

    var scored = [];
    for (var i = 0; i < wikiPages.length; i++) {
      var page = wikiPages[i];
      var score = 0;
      for (var j = 0; j < terms.length; j++) {
        var term = terms[j];
        if ((page.title || '').toLowerCase().indexOf(term) !== -1) score += 5;
        if ((page.summary || '').toLowerCase().indexOf(term) !== -1) score += 3;
        var tags = page.tags || [];
        for (var t = 0; t < tags.length; t++) {
          if (tags[t].toLowerCase().indexOf(term) !== -1) score += 2;
        }
      }
      if (score > 0) scored.push({ page: page, score: score });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, k).map(function (s) { return s.page; });
  }

  // ── Load page contents ────────────────────────────────
  function loadPages(pages, callback) {
    var expected = pages.length;
    var loaded = 0;
    var failed = 0;

    for (var i = 0; i < pages.length; i++) {
      (function (page, idx) {
        fetch(page.path)
          .then(function (res) { return res.text(); })
          .then(function (md) {
            page._content = cleanMarkdown(md);
            loaded++;
            checkDone();
          })
          .catch(function () {
            page._content = page.summary || '';
            loaded++;
            failed++;
            checkDone();
          });
      })(pages[i], i);
    }

    function checkDone() {
      if (loaded === expected) callback(pages, failed);
    }
  }

  function cleanMarkdown(md) {
    return md
      .replace(/^---[\s\S]*?---\n?/m, '')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n');
  }

  // ── Generate answer ───────────────────────────────────
  function generateAnswer(question, pages) {
    // Chunk each page into sentences
    var chunks = [];
    for (var i = 0; i < pages.length; i++) {
      var content = pages[i]._content || '';
      var sentences = content.split(/(?<=[.!?\u3002\uff01\uff1f])\s+/);
      for (var j = 0; j < sentences.length; j++) {
        var s = sentences[j].trim();
        if (s.length > 15) {
          chunks.push({ text: s, source: pages[i], score: 0 });
        }
      }
    }

    // Score by term overlap
    var terms = question.toLowerCase().split(/\s+/).filter(function (t) {
      return t.length > 2;
    });
    for (var k = 0; k < chunks.length; k++) {
      var lower = chunks[k].text.toLowerCase();
      var sc = 0;
      for (var m = 0; m < terms.length; m++) {
        if (lower.indexOf(terms[m]) !== -1) sc += 1;
      }
      chunks[k].score = sc;
    }

    // Select top chunks, max 3 per source
    chunks.sort(function (a, b) { return b.score - a.score; });
    var selected = [];
    var perSource = {};
    for (var n = 0; n < chunks.length; n++) {
      if (chunks[n].score === 0 || selected.length >= 8) break;
      var sid = chunks[n].source.id;
      if (!perSource[sid]) perSource[sid] = 0;
      if (perSource[sid] < 3) {
        selected.push(chunks[n]);
        perSource[sid]++;
      }
    }

    if (selected.length === 0) {
      return {
        text: '\u5f53\u524d Wiki \u4e2d\u6ca1\u6709\u8db3\u591f\u4fe1\u606f\u56de\u7b54\u8fd9\u4e2a\u95ee\u9898\u3002',
        sources: []
      };
    }

    var answer = selected.map(function (s) { return s.text; }).join(' ');
    var used = {};
    for (var p = 0; p < selected.length; p++) {
      used[selected[p].source.id] = selected[p].source;
    }
    return { text: answer, sources: Object.values(used) };
  }

  // ── UI helpers ────────────────────────────────────────
  function resetSteps() {
    document.getElementById('step-search').textContent = '';
    document.getElementById('step-retrieve').textContent = '';
    document.getElementById('step-generate').textContent = '';
    document.getElementById('assistant-answer').style.display = 'none';
  }

  function setStep(id, text, loading) {
    var el = document.getElementById(id);
    el.textContent = (loading ? '\u25cf ' : '\u2713 ') + text;
  }

  function showSteps(show) {
    document.getElementById('assistant-steps').style.display = show ? 'block' : 'none';
  }

  function finish(text, sources) {
    setStep('step-generate', sources.length > 0 ? 'Answer ready' : 'No results found', false);
    showAnswer(text, sources);
    document.getElementById('assistant-input').disabled = false;
    document.getElementById('assistant-ask').disabled = false;
    document.getElementById('assistant-input').focus();
  }

  function showAnswer(text, sources) {
    var container = document.getElementById('assistant-answer');
    container.style.display = 'block';

    var answerEl = document.getElementById('assistant-answer-text');
    answerEl.textContent = text;

    var sourcesDiv = document.getElementById('assistant-sources');
    sourcesDiv.style.display = sources.length > 0 ? 'block' : 'none';

    var list = document.getElementById('assistant-source-list');
    list.textContent = '';
    for (var i = 0; i < sources.length; i++) {
      var card = document.createElement('div');
      card.className = 'article-card';
      card.style.cursor = 'pointer';
      card.addEventListener('click', function (s) {
        return function () {
          window.open('wiki.html', '_blank');
        };
      }(sources[i]));

      var header = document.createElement('div');
      header.className = 'article-card-header';

      var cat = document.createElement('span');
      cat.className = 'article-category';
      cat.textContent = sources[i].category || '';

      header.appendChild(cat);

      var title = document.createElement('h3');
      title.textContent = sources[i].title || '';

      var summary = document.createElement('p');
      summary.textContent = sources[i].summary || '';

      card.appendChild(header);
      card.appendChild(title);
      card.appendChild(summary);
      list.appendChild(card);
    }
    if (window.SiteMotion) window.SiteMotion.revealNewElements(list);
  }
})();
