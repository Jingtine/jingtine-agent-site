/**
 * Site-local Hexo tag plugins.
 *
 * Hexo 8 exposes `list_categories` as an EJS helper, not a tag, so the
 * taxonomy index pages cannot use it directly. This tag delegates to the
 * built-in helper with the matching site collection.
 */

const { createHash } = require("crypto");
const { readFileSync } = require("fs");
const path = require("path");

// GitHub Pages and the theme service worker both cache the injected assets.
// A content fingerprint in the URL keeps a stale custom.css or accessibility.js
// from being paired with freshly generated HTML after a deploy.
let assetVersion;
const getAssetVersion = () => {
  if (!assetVersion) {
    const hash = createHash("sha256");
    for (const file of ["source/css/custom.css", "source/js/accessibility.js"]) {
      hash.update(readFileSync(path.join(hexo.base_dir, file)));
    }
    assetVersion = hash.digest("hex").slice(0, 10);
  }
  return assetVersion;
};

const parseArgs = (args) => {
  const options = {};
  for (const arg of args) {
    const colon = arg.indexOf(":");
    if (colon === -1) {
      options[arg] = true;
      continue;
    }
    const key = arg.slice(0, colon);
    const raw = arg.slice(colon + 1);
    if (!key) continue;
    if (raw === "true") options[key] = true;
    else if (raw === "false") options[key] = false;
    else if (raw !== "" && !Number.isNaN(Number(raw))) options[key] = Number(raw);
    else options[key] = raw;
  }
  return options;
};

const renderHelper = (helperName, collectionName, args) => {
  const helper = hexo.extend.helper.get(helperName);
  if (typeof helper !== "function") {
    hexo.log.error(`[scripts/tags.js] helper not found: ${helperName}`);
    return "";
  }
  const collection = hexo.locals.get(collectionName);
  return helper.call(hexo, collection, parseArgs(args));
};

/**
 * {% list_categories show_count:true %}
 */
hexo.extend.tag.register("list_categories", function (args) {
  return renderHelper("list_categories", "categories", args);
});

/**
 * Butterfly-style tag cloud for the tags index page.
 *
 * Mirrors hexo-theme-butterfly's `cloudTags` helper: font sizes bucket by
 * post count, a fixed multicolor palette, and inline font-size and
 * background-color. Order is random per build; colors stay stable per name.
 */
const TAG_PALETTE = ['#6d4fc4', '#3b6fc9', '#2f7d7a', '#b23a7a', '#b5542f', '#3f7f4f', '#5a5fc7', '#4a6b8a'];

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const paletteColor = name => {
  let hash = 0;
  for (const char of String(name)) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return TAG_PALETTE[hash % TAG_PALETTE.length];
};

const renderCloudTags = (tags, urlFor) => {
  if (!tags || !tags.length) return '';
  const sizes = [...new Set(tags.map(tag => tag.length).sort((a, b) => a - b))];
  const span = sizes.length - 1;
  return tags.random().map(tag => {
    const ratio = span ? sizes.indexOf(tag.length) / span : 0;
    const fontSize = parseFloat((1.2 + 0.3 * ratio).toFixed(2));
    return `<a href="${urlFor(tag.path)}" class="tag-cloud-item" style="font-size: ${fontSize}em; background-color: ${paletteColor(tag.name)};">${escapeHtml(tag.name)}</a>`;
  }).join('');
};

hexo.extend.tag.register("cloud_tags", function () {
  const urlFor = hexo.extend.helper.get("url_for");
  return renderCloudTags(hexo.locals.get("tags"), path => urlFor.call(hexo, path));
});

// Reimu 1.12.5 hardcodes host-root 404 links and a protocol-relative icon font.
// These supported output filters touch only the exact generated attributes/URL.
hexo.extend.filter.register("after_render:html", function (html) {
  const iconFontUrl = `//at.alicdn.com/t/c/font_${hexo.theme.config.icon_font}.woff2`;
  const version = getAssetVersion();
  return html
    .replace(/<a href="\/" id="(logo|subtitle)">/g, (_, id) => `<a href="${hexo.config.root}" id="${id}">`)
    .replace(/<a id="nav-rss-link"[^>]*><\/a>\s*/g, "")
    .replace(/(<span class="footer-info-sep[^>]*><\/span>\s*)[^<]+?(\s*<\/div>)/g, "$1Jingtine$2")
    .replaceAll(`href="${hexo.config.root}css/custom.css"`, `href="${hexo.config.root}css/custom.css?v=${version}"`)
    .replaceAll(`src="${hexo.config.root}js/accessibility.js"`, `src="${hexo.config.root}js/accessibility.js?v=${version}"`)
    .replaceAll(`href="${iconFontUrl}"`, `href="https:${iconFontUrl}"`);
});
hexo.extend.filter.register("after_render:css", function (css) {
  const iconFontUrl = `//at.alicdn.com/t/c/font_${hexo.theme.config.icon_font}.woff2`;
  return css.replaceAll(`url("${iconFontUrl}")`, `url("https:${iconFontUrl}")`)
    .replaceAll(`url('${iconFontUrl}')`, `url('https:${iconFontUrl}')`);
});
