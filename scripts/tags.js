/**
 * Site-local Hexo tag plugins.
 *
 * Hexo 8 exposes `list_categories` and `tagcloud` as EJS helpers, not tags,
 * so the taxonomy index pages cannot use them directly. These tags delegate
 * to the built-in helpers with the matching site collections.
 */

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
 * {% tagcloud %}
 */
hexo.extend.tag.register("tagcloud", function (args) {
  return renderHelper("tagcloud", "tags", args);
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
  return html
    .replace(/<a href="\/" id="(logo|subtitle)">/g, (_, id) => `<a href="${hexo.config.root}" id="${id}">`)
    .replace(/<a id="nav-rss-link"[^>]*><\/a>\s*/g, "")
    .replaceAll(`href="${iconFontUrl}"`, `href="https:${iconFontUrl}"`);
});
hexo.extend.filter.register("after_render:css", function (css) {
  const iconFontUrl = `//at.alicdn.com/t/c/font_${hexo.theme.config.icon_font}.woff2`;
  return css.replaceAll(`url("${iconFontUrl}")`, `url("https:${iconFontUrl}")`)
    .replaceAll(`url('${iconFontUrl}')`, `url('https:${iconFontUrl}')`);
});
