"""Writing quality gate regressions using isolated source/generated fixtures."""

from contextlib import redirect_stderr, redirect_stdout
import io
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from scripts import check
from scripts.article_content import build_public_records
from scripts.build_articles import build_rss


class ArticleSourceCheckTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        (self.root / 'articles').mkdir()
        (self.root / 'public/data').mkdir(parents=True)
        (self.root / 'config').mkdir()
        self.write_article('older', '2026-09-10')
        self.write_article('newer', '2026-09-11')
        self.config = {'featuredSlug': '', 'categories': {'life': '日常'},
                       'kinds': {'essay': '随笔', 'note': '短札', 'technical': '技术'}}
        self.write_json('config/writing.json', self.config)
        self.write_json('public/data/wiki.json', {'pages': [{'id': 'AI/agent', 'title': 'Agent'}]})
        self.rebuild()
        for name, value in {
            'PROJECT_DIR': str(self.root),
            'ARTICLES_JSON': str(self.root / 'public/data/articles.json'),
            'FEED_XML': str(self.root / 'feed.xml'),
            'WIKI_JSON': str(self.root / 'public/data/wiki.json'),
        }.items():
            patcher = patch.object(check, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def write_article(self, slug, date='2026-09-11', *, draft=False, body='[[agent]]', extra=''):
        path = self.root / 'articles' / (slug + '.md')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f'+++\ntitle = "Article"\ndate = {date}\nkind = "essay"\n'
                        f'category = "life"\nsummary = "Summary [[not-a-wiki-ref]]"\n'
                        f'draft = {str(draft).lower()}\n{extra}+++\n{body}\n', encoding='utf-8')

    def write_json(self, relative, value):
        (self.root / relative).write_text(json.dumps(value), encoding='utf-8')

    def rebuild(self):
        self.records = build_public_records(self.root / 'articles', self.root)
        self.write_json('public/data/articles.json', self.records)
        (self.root / 'feed.xml').write_text(build_rss(self.records), encoding='utf-8')

    def assert_check(self, expected, detail=''):
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            result = check.check_article_sources()
        self.assertIs(result, expected)
        output = stdout.getvalue() + stderr.getvalue()
        if detail:
            self.assertIn(detail, output)
        self.assertNotIn('Traceback', output)
        if not expected:
            self.assertTrue(stderr.getvalue())

    def test_valid_index_strips_front_matter_and_excludes_drafts(self):
        self.write_article('draft', draft=True, body='Draft body')
        self.rebuild()
        self.assertEqual(len(self.records), 2)
        self.assert_check(True)

    def test_stale_generated_title_fails(self):
        self.records[0]['title'] = 'Hand-edited title'
        self.write_json('public/data/articles.json', self.records)
        self.assert_check(False, 'build_articles.py')

    def test_extra_field_and_wrong_order_fail(self):
        for changed in [list(reversed(self.records)), [{**self.records[0], 'draft': False}, self.records[1]]]:
            with self.subTest(changed=changed):
                self.write_json('public/data/articles.json', changed)
                self.assert_check(False)

    def test_boolean_metrics_do_not_equal_integer_metrics(self):
        self.records[0]['readingMinutes'] = True
        self.write_json('public/data/articles.json', self.records)
        self.assert_check(False)

    def test_duplicate_slug_and_nested_unservable_source_fail(self):
        self.write_article('nested/newer')
        self.assert_check(False, 'slug')
        (self.root / 'articles/nested/newer.md').unlink()
        self.write_article('nested/unique')
        self.rebuild()
        self.assert_check(False, 'articles/unique.md')

    def test_missing_source_or_local_cover_fails(self):
        (self.root / 'articles/newer.md').unlink()
        self.assert_check(False)
        self.write_article('newer', extra='cover = "assets/images/covers/missing.svg"\ncover_alt = "Cover"\n')
        self.assert_check(False, 'cover')

    def test_unsafe_cover_fails(self):
        self.write_article('newer', extra='cover = "https://example.com/cover.svg"\ncover_alt = "Cover"\n')
        self.assert_check(False, 'cover')

    def test_config_validation_and_unknown_category_fallback(self):
        for invalid in [[], {**self.config, 'featuredSlug': []},
                        {**self.config, 'categories': {'life': ''}},
                        {**self.config, 'kinds': {'essay': '随笔'}},
                        {**self.config, 'extra': True}]:
            with self.subTest(invalid=invalid):
                self.write_json('config/writing.json', invalid)
                self.assert_check(False, 'writing.json')
        self.write_json('config/writing.json', {**self.config, 'categories': {}, 'featuredSlug': 'retired-slug'})
        self.assert_check(True)

    def test_unresolved_body_reference_fails_but_code_is_ignored(self):
        self.write_article('newer', body='[[unknown]]')
        self.rebuild()
        self.assert_check(False, 'unknown')
        self.write_article('newer', body='[[Agent]]\n`[[inline]]`\n```\n[[code]]\n```')
        self.rebuild()
        self.assert_check(True)

    def test_missing_and_malformed_files_fail_without_traceback(self):
        for relative in ['public/data/articles.json', 'config/writing.json', 'public/data/wiki.json', 'feed.xml']:
            path = self.root / relative
            original = path.read_bytes()
            with self.subTest(relative=relative, case='malformed'):
                path.write_text('{broken', encoding='utf-8')
                self.assert_check(False)
            with self.subTest(relative=relative, case='missing'):
                path.unlink()
                self.assert_check(False)
            path.write_bytes(original)

    def test_feed_count_mismatch_fails(self):
        (self.root / 'feed.xml').write_text(build_rss(self.records[:1]), encoding='utf-8')
        self.assert_check(False, 'feed.xml')

    def test_ambiguous_wiki_slug_fails_but_exact_id_works(self):
        self.write_json('public/data/wiki.json', {'pages': [
            {'id': 'AI/agent', 'title': 'AI agent'},
            {'id': 'Software/agent', 'title': 'Software agent'},
        ]})
        self.assert_check(False, 'agent')
        for slug in ['older', 'newer']:
            self.write_article(slug, body='[[AI/agent]]')
        self.rebuild()
        self.assert_check(True)


if __name__ == '__main__':
    unittest.main()
