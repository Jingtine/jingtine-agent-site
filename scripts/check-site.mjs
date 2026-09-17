import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = '/jingtine-agent-site/';
const canonicalRoot = `https://jingtine.github.io${projectRoot}`;
const approvedSlugs = ['building-agent', 'building-digital-garden', 'from-ui-to-product', 'github-pages-dev-notes', 'hello-world', 'notewhale-why-started', 'opencode-superpowers-workflow', 'product-thinking-101', 'rebuilding-the-tea-house', 'why-se-matters'];
const routes = ['index.html', 'archives/index.html', 'categories/index.html', 'tags/index.html', 'about/index.html', 'projects/index.html', 'friend/index.html', 'atom.xml'];
const forbidden = /article\.html\?slug=|(?:reader|papers|wiki|assistant|status|guestbook)\.html|giscus\.app|@waline|valine|twikoo|gitalk|disqus|utterances|beaudar|data-repo-id/gi;

// Sorted paths make both diagnostics and tests deterministic. Never follow symlinks.
export async function walkFiles(root) {
  const files = [];
  for (const entry of (await readdir(root, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(file));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}

function ignored(url) {
  return !url || /^(?:#|https:\/\/|mailto:|tel:|data:)/i.test(url);
}

// Relative paths are relative to the project root; main rebases page-relative URLs.
// Return a portable public path, without reading the filesystem or evaluating HTML.
export function resolveLocalTarget(url) {
  url = url.trim();
  if (ignored(url)) return null;
  if (/^[a-z][a-z\d+.-]*:|^\/\//i.test(url)) throw new Error(`unsupported local URL: ${url}`);
  let pathname = decodeURIComponent(url.split(/[?#]/, 1)[0]);
  if (/[\\\x00-\x1f]/.test(pathname)) throw new Error(`invalid local path: ${url}`);
  if (pathname.startsWith('/')) {
    if (!pathname.startsWith(projectRoot)) throw new Error(`URL must use project root ${projectRoot}: ${url}`);
    pathname = pathname.slice(projectRoot.length);
  }
  const normalized = path.posix.normalize(pathname || '.');
  if (normalized === '..' || normalized.startsWith('../') || normalized.startsWith('/') || normalized.includes(':')) throw new Error(`path escapes public: ${url}`);
  const target = normalized === '.' ? '' : normalized;
  return `public/${target}${!target || target.endsWith('/') ? 'index.html' : ''}`;
}

function decodeEntities(value) {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (entity, name) => {
    if (!name.startsWith('#')) return named[name.toLowerCase()];
    const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
}

export function collectLocalReferences(html) {
  const references = [];
  // Ignore comments and raw-text bodies, retaining script opening tags for their src.
  const markup = html.replace(/<!--[\s\S]*?-->/g, '').replace(/(<(?:script|style)\b[^>]*>)[\s\S]*?<\/(?:script|style)\s*>/gi, '$1');
  for (const tag of markup.matchAll(/<[a-z][\w:-]*\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi)) {
    const attributes = tag[0].replace(/^<[\w:-]+/, '').replace(/\/?\s*>$/, '');
    for (const attr of attributes.matchAll(/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      if (!/^(?:href|src)$/i.test(attr[1])) continue;
      const url = decodeEntities(attr[2] ?? attr[3] ?? attr[4] ?? '').trim();
      if (!ignored(url)) references.push(url);
    }
  }
  return references;
}

async function isFile(file) {
  try { return (await stat(file)).isFile(); } catch { return false; }
}

async function main() {
  const errors = [];
  let files;
  try { files = await walkFiles('public'); } catch {
    console.error('FAIL: public/ is missing; run npm run build first.');
    process.exitCode = 1;
    return;
  }
  for (const route of routes) {
    if (!await isFile(path.join('public', route))) errors.push(`Missing route: public/${route}; run npm run build.`);
  }
  const postFiles = files.map(file => file.replaceAll('\\', '/')).filter(file => /^public\/posts\/[^/]+\/index\.html$/.test(file));
  const actualSlugs = postFiles.map(file => file.split('/')[2]).sort();
  if (JSON.stringify(actualSlugs) !== JSON.stringify(approvedSlugs)) errors.push(`Expected exactly ten approved post slugs; found: ${actualSlugs.join(', ') || '(none)'}.`);

  if (await isFile('public/atom.xml')) {
    const feed = await readFile('public/atom.xml', 'utf8');
    const entries = [...feed.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry\s*>/g)];
    if (entries.length !== 10 || (feed.match(/<entry\b/g) || []).length !== 10) errors.push(`public/atom.xml: expected 10 Atom entries, found ${entries.length}.`);
    const postUrls = new Set(approvedSlugs.map(slug => `${canonicalRoot}posts/${slug}/`));
    const entryIds = entries.map(entry => entry[1].match(/<id>([^<]+)<\/id>/)?.[1]);
    if (entryIds.length !== postUrls.size || new Set(entryIds).size !== postUrls.size || entryIds.some(id => !postUrls.has(id))) errors.push('public/atom.xml: entries must use the ten project-root canonical post URLs.');
    for (const match of feed.matchAll(/<id>([^<]+)<\/id>|<link\b[^>]*\bhref=["']([^"']+)["']/g)) {
      if (!(match[1] || match[2]).startsWith(canonicalRoot)) errors.push(`public/atom.xml: URL is outside canonical project root: ${match[1] || match[2]}`);
    }
    for (const entry of entries) {
      const id = entry[1].match(/<id>([^<]+)<\/id>/)?.[1];
      const links = [...entry[1].matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/g)].map(match => match[1]);
      if (!links.includes(id)) errors.push(`public/atom.xml: missing canonical entry link for ${id || '(missing id)'}.`);
    }
  }

  const htmlFiles = files.filter(file => file.endsWith('.html'));
  let referenceCount = 0;
  for (const file of htmlFiles) {
    const label = file.replaceAll('\\', '/');
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(forbidden)) errors.push(`${label}: forbidden reference ${match[0]}.`);
    for (const url of collectLocalReferences(html)) {
      referenceCount++;
      try {
        let targetUrl = url;
        if (!url.startsWith('/') && !/^[a-z][a-z\d+.-]*:/i.test(url)) {
          const pageUrl = new URL(label.slice('public/'.length), canonicalRoot);
          targetUrl = new URL(url, pageUrl).pathname;
        }
        const target = resolveLocalTarget(targetUrl);
        if (target && !await isFile(target) && !await isFile(path.join(target, 'index.html'))) errors.push(`${label}: broken local reference ${url} -> ${target}.`);
      } catch (error) {
        errors.push(`${label}: ${url}: ${error.message}`);
      }
    }
  }
  if (errors.length) {
    console.error(errors.map(error => `FAIL: ${error}`).join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${routes.length} routes, 10 posts, 10 Atom entries; ${htmlFiles.length} HTML files and ${referenceCount} local references checked.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  });
}
