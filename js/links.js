/* Links directory: untrusted configuration is rendered with DOM APIs only. */
(function () {
  'use strict';

  var DATA_URL = 'config/links.json';

  function isSafeExternalUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return false;
    try {
      var url = new URL(value);
      return url.protocol === 'https:' && Boolean(url.hostname);
    } catch (error) {
      return false;
    }
  }

  function normalizeAvatarPath(value) {
    if (typeof value !== 'string' || !value || value.indexOf('\\') !== -1 || value.indexOf('?') !== -1 || value.indexOf('#') !== -1) return null;
    var parts = value.split('/');
    if (parts.length < 3 || parts[0] !== 'assets' || parts[1] !== 'images' || parts.some(function (part) { return !part || part === '.' || part === '..'; })) return null;
    try {
      var resolved = new URL(value, window.location.href);
      var avatarRoot = new URL('assets/images/', window.location.href);
      if (resolved.origin !== avatarRoot.origin || resolved.pathname.indexOf(avatarRoot.pathname) !== 0) return null;
    } catch (error) {
      return null;
    }
    return value;
  }

  function textInitial(name) {
    return String(name || '').trim().charAt(0).toUpperCase() || '·';
  }

  function isNonemptyString(value) {
    return typeof value === 'string' && Boolean(value.trim());
  }

  function acceptedLinks(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.groups)) return [];
    return data.groups.reduce(function (groups, group) {
      if (!group || typeof group !== 'object' || !isNonemptyString(group.name) || !Array.isArray(group.links)) return groups;
      var links = group.links.filter(function (link) {
        return link && typeof link === 'object' && isNonemptyString(link.name) && isNonemptyString(link.description) && isSafeExternalUrl(link.url);
      });
      if (links.length) groups.push({ name: group.name.trim(), links: links });
      return groups;
    }, []);
  }

  function makeAvatar(name, avatar) {
    var wrapper = document.createElement('div');
    wrapper.className = 'link-avatar';
    var path = normalizeAvatarPath(avatar);
    if (!path) {
      wrapper.textContent = textInitial(name);
      return wrapper;
    }
    var image = document.createElement('img');
    image.src = path;
    image.alt = '';
    image.addEventListener('error', function () {
      wrapper.textContent = textInitial(name);
    }, { once: true });
    wrapper.appendChild(image);
    return wrapper;
  }

  function makeEntry(link) {
    var entry = document.createElement('article');
    entry.className = 'link-entry';
    entry.appendChild(makeAvatar(link.name, link.avatar));

    var copy = document.createElement('div');
    copy.className = 'link-copy';
    var title = document.createElement('h3');
    var anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.name.trim();
    title.appendChild(anchor);
    var description = document.createElement('p');
    description.textContent = link.description.trim();
    copy.appendChild(title);
    copy.appendChild(description);

    if (Array.isArray(link.tags)) {
      var tags = link.tags.filter(isNonemptyString);
      if (tags.length) {
        var list = document.createElement('ul');
        list.className = 'link-tags';
        tags.forEach(function (tag) {
          var item = document.createElement('li');
          item.textContent = tag.trim();
          list.appendChild(item);
        });
        copy.appendChild(list);
      }
    }
    entry.appendChild(copy);
    return entry;
  }

  function setStatus(message) {
    var status = document.getElementById('links-status');
    if (status) status.textContent = message;
  }

  function render(data) {
    var container = document.getElementById('links-groups');
    if (!container) return;
    container.textContent = '';
    var groups = acceptedLinks(data);
    var total = 0;
    groups.forEach(function (group) {
      var section = document.createElement('section');
      section.className = 'links-group';
      var heading = document.createElement('h2');
      heading.textContent = group.name;
      var grid = document.createElement('div');
      grid.className = 'links-grid';
      group.links.forEach(function (link) { grid.appendChild(makeEntry(link)); });
      total += group.links.length;
      section.appendChild(heading);
      section.appendChild(grid);
      container.appendChild(section);
    });
    if (!total) {
      var empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = '暂时还没有收录链接。';
      container.appendChild(empty);
      setStatus('暂时没有链接。');
      return;
    }
    setStatus('共收录 ' + total + ' 个链接。');
    if (window.SiteMotion) window.SiteMotion.revealNewElements(container);
  }

  function showFailure() {
    var container = document.getElementById('links-groups');
    if (!container) return;
    container.textContent = '';
    var message = document.createElement('p');
    message.className = 'empty-state';
    message.textContent = '链接目录暂时无法读取。';
    var retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn';
    retry.textContent = '重试';
    retry.addEventListener('click', load);
    container.appendChild(message);
    container.appendChild(retry);
    setStatus('链接目录加载失败。');
  }

  function load() {
    var container = document.getElementById('links-groups');
    if (!container) return Promise.resolve();
    container.textContent = '';
    setStatus('正在取出茶单……');
    return fetch(DATA_URL, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(render)
      .catch(showFailure);
  }

  window.LinksPage = { load: load, isSafeExternalUrl: isSafeExternalUrl, normalizeAvatarPath: normalizeAvatarPath };
  document.addEventListener('DOMContentLoaded', load);
}());
