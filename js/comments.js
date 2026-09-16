(function () {
  'use strict';

  var DISCUSSIONS_URL = 'https://github.com/Jingtine/jingtine-agent-site/discussions';
  var GISCUS_CLIENT = 'https://giscus.app/client.js';
  var GISCUS_ORIGIN = 'https://giscus.app';
  var CONFIG_URL = 'config/comments.json';
  var WIDGET_READY_TIMEOUT = 10000;
  var REQUIRED_KEYS = ['enabled', 'repo', 'repoId', 'category', 'categoryId', 'theme', 'lang'];
  var THEMES = ['light', 'dark', 'preferred_color_scheme'];
  var LANGUAGES = ['zh-CN', 'en'];
  var records = new WeakMap();
  var configPromise = null;

  function validateConfig(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    var keys = Object.keys(value).sort();
    if (keys.length !== REQUIRED_KEYS.length
      || keys.some(function (key, index) { return key !== REQUIRED_KEYS.slice().sort()[index]; })) return null;
    if (typeof value.enabled !== 'boolean'
      || value.repo !== 'Jingtine/jingtine-agent-site'
      || value.category !== 'General'
      || typeof value.repoId !== 'string'
      || typeof value.categoryId !== 'string'
      || THEMES.indexOf(value.theme) === -1
      || LANGUAGES.indexOf(value.lang) === -1) return null;
    if (value.enabled && (!value.repoId.trim() || !value.categoryId.trim())) return null;
    return value;
  }

  function validTerm(term) {
    return term === 'guestbook' || /^article:[a-z0-9-]+$/.test(term);
  }

  function loadConfig() {
    if (configPromise) return configPromise;
    configPromise = fetch(CONFIG_URL, { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (value) {
        var config = validateConfig(value);
        if (!config) throw new Error('Invalid comments configuration');
        return config;
      })
      .catch(function (error) {
        configPromise = null;
        throw error;
      });
    return configPromise;
  }

  function createButton(label, className, listener) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', listener);
    return button;
  }

  function createDiscussionsLink() {
    var link = document.createElement('a');
    link.href = DISCUSSIONS_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '前往 GitHub Discussions 留言';
    return link;
  }

  function setStatus(record, message) {
    record.status.textContent = message;
  }

  function setControl(record, label, disabled) {
    record.control.textContent = label;
    record.control.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  }

  function clearWidgetWatch(record) {
    if (record.widgetTimer) {
      window.clearTimeout(record.widgetTimer);
      record.widgetTimer = null;
    }
    if (record.widgetObserver) {
      record.widgetObserver.disconnect();
      record.widgetObserver = null;
    }
    if (record.messageListener) {
      window.removeEventListener('message', record.messageListener);
      record.messageListener = null;
    }
    if (record.frame) {
      record.frame.removeEventListener('load', record.frameLoad);
      record.frame.removeEventListener('error', record.frameError);
      record.frame = null;
      record.frameLoad = null;
      record.frameError = null;
    }
  }

  function settle(record, result) {
    if (record.resolveWidget) {
      var resolve = record.resolveWidget;
      record.resolveWidget = null;
      resolve(result);
    }
  }

  function failWidget(record, message, retryable) {
    if (record.state !== 'loading') return;
    clearWidgetWatch(record);
    record.widget.replaceChildren();
    record.mount.removeAttribute('aria-busy');
    record.state = 'failed';
    record.retryable = retryable;
    record.mount.dataset.commentsState = 'failed';
    setStatus(record, message);
    setControl(record, retryable ? '重试加载留言' : '留言功能暂未启用', !retryable);
    settle(record, { status: retryable ? 'error' : 'disabled' });
  }

  function finishWidget(record) {
    if (record.state !== 'loading') return;
    clearWidgetWatch(record);
    record.mount.removeAttribute('aria-busy');
    record.state = 'loaded';
    record.retryable = false;
    record.mount.dataset.commentsState = 'loaded';
    setStatus(record, '留言已加载。');
    setControl(record, '留言已加载', true);
    settle(record, { status: 'loaded' });
  }

  function watchForFrame(record) {
    if (record.frame) return;
    var frame = record.widget.querySelector('iframe.giscus-frame');
    if (!frame) return;
    record.frame = frame;
    record.frameLoad = function () { finishWidget(record); };
    record.frameError = function () { failWidget(record, '留言组件加载失败。', true); };
    frame.addEventListener('load', record.frameLoad, { once: true });
    frame.addEventListener('error', record.frameError, { once: true });
  }

  function beginWidgetWatch(record) {
    record.widgetObserver = new MutationObserver(function () { watchForFrame(record); });
    record.widgetObserver.observe(record.widget, { childList: true, subtree: true });
    record.messageListener = function (event) {
      if (event.origin !== GISCUS_ORIGIN
        || !event.data || typeof event.data !== 'object'
        || !event.data.giscus || typeof event.data.giscus !== 'object'
        || typeof event.data.giscus.error !== 'string') return;
      failWidget(record, '留言组件加载失败。', true);
    };
    window.addEventListener('message', record.messageListener);
    record.widgetTimer = window.setTimeout(function () {
      failWidget(record, '留言组件未能就绪。', true);
    }, WIDGET_READY_TIMEOUT);
    watchForFrame(record);
  }

  function appendGiscus(config, record) {
    return new Promise(function (resolve) {
      var script = document.createElement('script');
      record.resolveWidget = resolve;
      script.src = GISCUS_CLIENT;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-repo', config.repo);
      script.setAttribute('data-repo-id', config.repoId);
      script.setAttribute('data-category', config.category);
      script.setAttribute('data-category-id', config.categoryId);
      script.setAttribute('data-mapping', 'specific');
      script.setAttribute('data-term', record.term);
      script.setAttribute('data-strict', '1');
      script.setAttribute('data-reactions-enabled', '1');
      script.setAttribute('data-emit-metadata', '0');
      script.setAttribute('data-input-position', 'top');
      script.setAttribute('data-theme', config.theme);
      script.setAttribute('data-lang', config.lang);
      script.addEventListener('load', function () { watchForFrame(record); }, { once: true });
      script.addEventListener('error', function () {
        failWidget(record, '留言组件加载失败。', true);
      }, { once: true });
      beginWidgetWatch(record);
      record.widget.appendChild(script);
    });
  }

  function beginLoading(record) {
    if (record.state === 'loading' || record.state === 'loaded') return record.loading;
    if (record.state === 'failed' && !record.retryable) return record.loading;
    record.state = 'loading';
    record.retryable = false;
    record.mount.dataset.commentsState = 'loading';
    if (record.observer) {
      record.observer.disconnect();
      record.observer = null;
    }
    clearWidgetWatch(record);
    record.widget.replaceChildren();
    record.mount.setAttribute('aria-busy', 'true');
    setStatus(record, '正在加载留言…');
    setControl(record, '正在加载留言…', true);
    record.loading = loadConfig().then(function (config) {
      if (!config.enabled) {
        failWidget(record, '留言功能暂未启用。', false);
        return { status: 'disabled' };
      }
      return appendGiscus(config, record);
    }).catch(function () {
      failWidget(record, '留言功能暂时不可用。', true);
      return { status: 'error' };
    });
    return record.loading;
  }

  function mount(element, term) {
    if (!element || element.nodeType !== 1 || !validTerm(term)) {
      return Promise.resolve({ status: 'invalid' });
    }
    var existing = records.get(element);
    if (existing) {
      return existing.term === term ? existing.ready : Promise.resolve({ status: 'invalid' });
    }

    var record = {
      term: term,
      mount: element,
      state: 'ready',
      observer: null,
      loading: null,
      retryable: false,
      widgetTimer: null,
      widgetObserver: null,
      messageListener: null,
      frame: null,
      frameLoad: null,
      frameError: null,
      resolveWidget: null,
    };
    record.ready = Promise.resolve({ status: 'ready' });
    records.set(element, record);
    element.dataset.commentsState = 'ready';
    var start = function () { beginLoading(record); };
    record.control = createButton('加载留言', 'comments-load', start);
    record.control.addEventListener('focus', start, { once: true });
    record.status = document.createElement('p');
    record.status.className = 'comments-status';
    record.status.setAttribute('role', 'status');
    record.direct = document.createElement('p');
    record.direct.className = 'comments-direct';
    record.direct.appendChild(document.createTextNode('也可直接 '));
    record.direct.appendChild(createDiscussionsLink());
    record.widget = document.createElement('div');
    record.widget.className = 'comments-widget';
    element.replaceChildren(record.control, record.status, record.direct, record.widget);

    if (typeof window.IntersectionObserver === 'function') {
      record.observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) start();
      }, { rootMargin: '400px 0px' });
      record.observer.observe(element);
    }
    return record.ready;
  }

  window.SiteComments = { mount: mount };
})();
