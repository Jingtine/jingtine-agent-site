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
