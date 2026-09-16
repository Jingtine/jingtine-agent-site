(function () {
  'use strict';

  var DISCUSSIONS_URL = 'https://github.com/Jingtine/jingtine-agent-site/discussions';
  var GISCUS_CLIENT = 'https://giscus.app/client.js';
  var CONFIG_URL = 'config/comments.json';
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

  function createFallback(mount, message, retry) {
    mount.removeAttribute('aria-busy');
    var paragraph = document.createElement('p');
    paragraph.className = 'comments-fallback';
    paragraph.setAttribute('role', 'status');
    paragraph.appendChild(document.createTextNode(message + ' '));
    var link = document.createElement('a');
    link.href = DISCUSSIONS_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '前往 GitHub Discussions 留言';
    paragraph.appendChild(link);
    mount.replaceChildren(paragraph);
    if (retry) mount.appendChild(createButton('重试加载留言', 'comments-load', retry));
  }

  function appendGiscus(mount, config, term, record) {
    return new Promise(function (resolve) {
      var script = document.createElement('script');
      script.src = GISCUS_CLIENT;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-repo', config.repo);
      script.setAttribute('data-repo-id', config.repoId);
      script.setAttribute('data-category', config.category);
      script.setAttribute('data-category-id', config.categoryId);
      script.setAttribute('data-mapping', 'specific');
      script.setAttribute('data-term', term);
      script.setAttribute('data-strict', '1');
      script.setAttribute('data-reactions-enabled', '1');
      script.setAttribute('data-emit-metadata', '0');
      script.setAttribute('data-input-position', 'top');
      script.setAttribute('data-theme', config.theme);
      script.setAttribute('data-lang', config.lang);
      script.addEventListener('load', function () {
        var status = mount.querySelector('.comments-status');
        if (status) status.remove();
        mount.removeAttribute('aria-busy');
        mount.dataset.commentsState = 'loaded';
        record.state = 'loaded';
        resolve({ status: 'loaded' });
      }, { once: true });
      script.addEventListener('error', function () {
        record.state = 'failed';
        mount.dataset.commentsState = 'failed';
        createFallback(mount, '留言组件加载失败。', function () { beginLoading(mount, record); });
        resolve({ status: 'error' });
      }, { once: true });
      mount.appendChild(script);
    });
  }

  function showLoading(mount) {
    var status = document.createElement('p');
    status.className = 'comments-status';
    status.setAttribute('role', 'status');
    status.textContent = '正在加载留言…';
    mount.setAttribute('aria-busy', 'true');
    mount.replaceChildren(status);
  }

  function beginLoading(mount, record) {
    if (record.state === 'loading' || record.state === 'loaded') return record.loading;
    record.state = 'loading';
    mount.dataset.commentsState = 'loading';
    if (record.observer) {
      record.observer.disconnect();
      record.observer = null;
    }
    showLoading(mount);
    record.loading = loadConfig().then(function (config) {
      if (!config.enabled) {
        record.state = 'failed';
        mount.dataset.commentsState = 'failed';
        createFallback(mount, '留言功能暂未启用。');
        return { status: 'disabled' };
      }
      return appendGiscus(mount, config, record.term, record);
    }).catch(function () {
      record.state = 'failed';
      mount.dataset.commentsState = 'failed';
      createFallback(mount, '留言功能暂时不可用。', function () { beginLoading(mount, record); });
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

    var record = { term: term, state: 'ready', observer: null, loading: null };
    record.ready = Promise.resolve({ status: 'ready' });
    records.set(element, record);
    element.dataset.commentsState = 'ready';
    var start = function () { beginLoading(element, record); };
    var button = createButton('加载留言', 'comments-load', start);
    button.addEventListener('focus', start, { once: true });
    element.replaceChildren(button);

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
