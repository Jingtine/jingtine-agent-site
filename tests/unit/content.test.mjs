import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const expectedSlugs = [
  'building-agent', 'building-digital-garden', 'from-ui-to-product',
  'github-pages-dev-notes', 'hello-world', 'notewhale-why-started',
  'opencode-superpowers-workflow', 'product-thinking-101', 'why-se-matters'
];

test('migrates exactly the nine public posts to YAML front matter', async () => {
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

test('lists the classmate blog as a friend link', async () => {
  const data = await readFile('source/friend/_data.yml', 'utf8');
  assert.match(data, /- name: 江畔絮语\r?\n\s+url: https:\/\/water1i1y\.org\/\r?\n\s+desc: 一位文院学生思考的存档地\r?\n\s+image: https:\/\/water1i1y\.org\/img\/dia\.jpg/);
});
