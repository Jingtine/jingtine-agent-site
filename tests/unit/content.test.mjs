import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const expectedSlugs = [
  'building-agent', 'building-digital-garden', 'from-ui-to-product',
  'github-pages-dev-notes', 'hello-world', 'notewhale-why-started',
  'opencode-superpowers-workflow', 'product-thinking-101',
  'rebuilding-the-tea-house', 'why-se-matters'
];

test('migrates exactly the ten public posts to YAML front matter', async () => {
  const files = (await readdir('source/_posts')).filter(name => name.endsWith('.md')).sort();
  assert.deepEqual(files, expectedSlugs.map(slug => `${slug}.md`).sort());
  for (const file of files) {
    const text = await readFile(`source/_posts/${file}`, 'utf8');
    assert.match(text, /^---\r?\n/);
    assert.match(text, /^slug: [a-z0-9-]+$/m);
    assert.match(text, /^comments: false$/m);
    assert.match(text, /^toc: true$/m);
    assert.doesNotMatch(text, /\[\[[^\]]+\]\]/);
    assert.doesNotMatch(text, /^## Related Wiki\s*$/m);
  }
});

test('creates retained standalone pages without comments', async () => {
  for (const path of ['source/about/index.md', 'source/projects/index.md', 'source/friend/index.md', 'source/categories/index.md', 'source/tags/index.md']) {
    const text = await readFile(path, 'utf8');
    assert.match(text, /^comments: false$/m);
  }
});

const retainedLinks = {
  'building-digital-garden': ['projects/#personal-site', 'posts/hello-world/'],
  'from-ui-to-product': ['projects/#personal-site', 'posts/product-thinking-101/'],
  'github-pages-dev-notes': ['posts/building-digital-garden/'],
  'notewhale-why-started': ['projects/#notewhale', 'posts/building-agent/'],
  'opencode-superpowers-workflow': ['posts/why-se-matters/'],
};

for (const [slug, destinations] of Object.entries(retainedLinks)) {
  test(`${slug} preserves independent related links in the rendered post`, async () => {
    const html = await readFile(`public/posts/${slug}/index.html`, 'utf8');
    const article = html.match(/<div class="[^"]*\barticle-entry\b[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    assert.ok(article, 'Rendered article body exists');
    for (const destination of destinations) {
      assert.ok(article.includes(`href="/jingtine-agent-site/${destination}"`), `Missing retained link: ${destination}`);
    }
  });
}

const retainedProjects = {
  notewhale: ['Product Case Study',
    'AI-powered content classification and auto-tagging',
    'Semantic search across notes with vector embeddings',
    'Personalized knowledge graph generation',
    'Full-stack architecture with modern engineering practices'],
  street: ['Product Case Study',
    'Interactive map-based urban storytelling experience',
    'User-generated content with community curation',
    'Spatial data visualization and narrative design',
    'Cross-disciplinary collaboration between tech and design'],
  'agent-studio': ['Personal Lab',
    'Multi-step reasoning and autonomous task execution',
    'Tool-calling integration with external APIs',
    'RAG pipeline for knowledge-grounded responses',
    'Agent workflow design and evaluation framework'],
};

for (const [id, details] of Object.entries(retainedProjects)) {
  test(`${id} preserves its project type and unique highlights`, async () => {
    const html = await readFile('public/projects/index.html', 'utf8');
    const project = html.match(new RegExp(`<article[^>]*id="${id}"[^>]*>([\\s\\S]*?)</article>`))?.[1];
    assert.ok(project, `Rendered project ${id} exists`);
    for (const detail of details) assert.ok(project.includes(detail), `Missing preserved project detail: ${detail}`);
  });
}

test('lists the friend links', async () => {
  const data = await readFile('source/friend/_data.yml', 'utf8');
  assert.match(data, /- name: 江畔絮语\r?\n\s+url: https:\/\/water1i1y\.org\/\r?\n\s+desc: 一位文院学生思考的存档地\r?\n\s+image: https:\/\/water1i1y\.org\/img\/dia\.jpg/);
  assert.match(data, /- name: MellowBlog\r?\n\s+url: https:\/\/mellowwinds\.com\/\r?\n\s+desc: 纪念的螺壳里，仍存在着那年夏天的海\r?\n\s+image: https:\/\/mellowwinds\.com\/icon\/icon128\.png/);
  assert.doesNotMatch(data, /http:\/\//);
});

const taxonomy = {
  'building-agent': ['工程', 'AI 与 Agent'],
  'building-digital-garden': ['工程', '站点建设'],
  'from-ui-to-product': ['产品', '设计'],
  'github-pages-dev-notes': ['工程', '工具与流程'],
  'hello-world': ['工程', '站点建设'],
  'notewhale-why-started': ['产品', '项目复盘'],
  'opencode-superpowers-workflow': ['工程', '工具与流程'],
  'product-thinking-101': ['产品', '方法论'],
  'rebuilding-the-tea-house': ['工程', '站点建设'],
  'why-se-matters': ['工程', '软件工程'],
};

test('assigns the two-level category taxonomy to every post', async () => {
  for (const [slug, expected] of Object.entries(taxonomy)) {
    const text = await readFile(`source/_posts/${slug}.md`, 'utf8');
    const block = /^categories:\r?\n((?:\s+- .*\r?\n?)+)/m.exec(text);
    assert.ok(block, `${slug}: categories block`);
    const names = block[1].split(/\r?\n/).map(line => line.trim().replace(/^- /, '')).filter(Boolean);
    assert.deepEqual(names, expected, slug);
  }
});

test('pins the refactor story to the top', async () => {
  const text = await readFile('source/_posts/rebuilding-the-tea-house.md', 'utf8');
  assert.match(text, /^sticky: true$/m);
});
