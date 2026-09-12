from pathlib import Path
from tempfile import TemporaryDirectory
import json
import shutil
import subprocess
import sys
import unittest
import xml.etree.ElementTree as ET

from scripts.article_content import (
    ArticleError,
    build_public_records,
    parse_article,
    reading_metrics,
)


REQUIRED_FIELDS = ("title", "date", "kind", "category", "summary", "draft")
PUBLIC_RECORD_KEYS = [
    "slug",
    "title",
    "date",
    "kind",
    "category",
    "tags",
    "summary",
    "cover",
    "coverAlt",
    "wordCount",
    "readingMinutes",
]


def article_text(
    title="Article",
    date="2026-09-11",
    *,
    kind="essay",
    category="life",
    summary="A summary.",
    draft=False,
    tags=None,
    extra_lines=None,
    omitted_fields=(),
):
    values = {
        "title": f'title = "{title}"',
        "date": f"date = {date}",
        "kind": f'kind = "{kind}"',
        "category": f'category = "{category}"',
        "summary": f'summary = "{summary}"',
        "draft": f"draft = {'true' if draft else 'false'}",
    }
    lines = [values[field] for field in REQUIRED_FIELDS if field not in omitted_fields]
    if tags is not None:
        rendered_tags = ", ".join(f'"{tag}"' for tag in tags)
        lines.append(f"tags = [{rendered_tags}]")
    lines.extend(extra_lines or [])
    return "+++\n" + "\n".join(lines) + "\n+++\n# Heading\n\nBody text."


class ArticleContentTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        self.articles = self.root / "articles"
        self.articles.mkdir()

    def tearDown(self):
        self.temporary_directory.cleanup()

    def write_article(self, name, content, directory=None):
        target_dir = directory or self.articles
        target_dir.mkdir(parents=True, exist_ok=True)
        path = target_dir / name
        path.write_text(content, encoding="utf-8", newline="")
        return path

    def assert_article_error(self, path, context, action):
        with self.assertRaises(ArticleError) as caught:
            action()
        message = str(caught.exception)
        self.assertIn(str(path), message)
        self.assertIn(context, message)

    def test_parse_article_builds_public_record(self):
        cover = self.root / "assets/images/covers/morning.jpg"
        cover.parent.mkdir(parents=True)
        cover.write_bytes(b"cover")
        path = self.write_article(
            "morning.md",
            '''+++
title = "清晨"
date = 2026-09-11
kind = "essay"
category = "life"
tags = ["校园"]
summary = "一次散步。"
cover = "assets/images/covers/morning.jpg"
cover_alt = "清晨校园里的树。"
draft = false
+++
# 清晨

这是正文。''',
        )

        record, body = parse_article(path, self.root)

        self.assertEqual(list(record), PUBLIC_RECORD_KEYS)
        self.assertEqual(record, {
            "slug": "morning",
            "title": "清晨",
            "date": "2026-09-11",
            "kind": "essay",
            "category": "life",
            "tags": ["校园"],
            "summary": "一次散步。",
            "cover": "assets/images/covers/morning.jpg",
            "coverAlt": "清晨校园里的树。",
            "wordCount": 6,
            "readingMinutes": 1,
        })
        self.assertTrue(body.startswith("# 清晨"))

    def test_reading_metrics_strip_markdown_and_count_cjk_characters_and_latin_words(self):
        markdown = "# 标题\n\n**你好** world again."

        self.assertEqual(reading_metrics(markdown), (6, 1))
        self.assertEqual(reading_metrics(" ".join(["word"] * 301)), (301, 2))

    def test_reading_metrics_keep_punctuation_joined_latin_text_as_one_word(self):
        self.assertEqual(reading_metrics("one/two three-four five.six"), (3, 1))

    def test_reading_metrics_count_cjk_next_to_latin_as_one_latin_token(self):
        self.assertEqual(reading_metrics("one中two"), (2, 1))

    def test_missing_required_fields_are_rejected_with_the_field_name(self):
        for field in REQUIRED_FIELDS:
            with self.subTest(field=field):
                path = self.write_article(
                    f"missing-{field}.md",
                    article_text(omitted_fields=(field,)),
                )
                self.assert_article_error(
                    path,
                    field,
                    lambda path=path: parse_article(path, self.root),
                )

    def test_unsupported_kind_is_rejected(self):
        path = self.write_article("unsupported.md", article_text(kind="review"))

        self.assert_article_error(
            path, "kind", lambda: parse_article(path, self.root)
        )

    def test_cover_outside_cover_directory_is_rejected(self):
        outside = self.root / "assets/images/outside.jpg"
        outside.parent.mkdir(parents=True)
        outside.write_bytes(b"cover")
        path = self.write_article(
            "outside-cover.md",
            article_text(extra_lines=[
                'cover = "assets/images/outside.jpg"',
                'cover_alt = "Outside."',
            ]),
        )

        self.assert_article_error(
            path, "cover", lambda: parse_article(path, self.root)
        )

    def test_missing_cover_file_is_rejected(self):
        path = self.write_article(
            "missing-cover.md",
            article_text(extra_lines=[
                'cover = "assets/images/covers/missing.jpg"',
                'cover_alt = "Missing."',
            ]),
        )

        self.assert_article_error(
            path, "cover", lambda: parse_article(path, self.root)
        )

    def test_cover_without_cover_alt_is_rejected(self):
        cover = self.root / "assets/images/covers/plain.jpg"
        cover.parent.mkdir(parents=True)
        cover.write_bytes(b"cover")
        path = self.write_article(
            "cover-without-alt.md",
            article_text(extra_lines=['cover = "assets/images/covers/plain.jpg"']),
        )

        self.assert_article_error(
            path, "cover_alt", lambda: parse_article(path, self.root)
        )

    def test_cover_alt_without_cover_is_rejected(self):
        path = self.write_article(
            "alt-without-cover.md",
            article_text(extra_lines=['cover_alt = "No cover."']),
        )

        self.assert_article_error(
            path, "cover", lambda: parse_article(path, self.root)
        )

    def test_declared_cover_fields_must_both_be_non_empty(self):
        cover = self.root / "assets/images/covers/plain.jpg"
        cover.parent.mkdir(parents=True)
        cover.write_bytes(b"cover")
        cases = [
            (
                "empty-cover",
                ['cover = ""', 'cover_alt = "Alt text."'],
                "cover",
            ),
            (
                "empty-cover-alt",
                [
                    'cover = "assets/images/covers/plain.jpg"',
                    'cover_alt = ""',
                ],
                "cover_alt",
            ),
            (
                "both-empty",
                ['cover = ""', 'cover_alt = ""'],
                "cover",
            ),
            (
                "whitespace-cover",
                ['cover = "   "', 'cover_alt = "Alt text."'],
                "cover",
            ),
            (
                "whitespace-cover-alt",
                [
                    'cover = "assets/images/covers/plain.jpg"',
                    'cover_alt = "   "',
                ],
                "cover_alt",
            ),
        ]
        for name, extra_lines, field in cases:
            with self.subTest(name=name):
                path = self.write_article(
                    f"{name}.md",
                    article_text(extra_lines=extra_lines),
                )
                self.assert_article_error(
                    path,
                    field,
                    lambda path=path: parse_article(path, self.root),
                )

    def test_noncanonical_cover_paths_are_rejected(self):
        cover = self.root / "assets/images/covers/canonical.jpg"
        cover.parent.mkdir(parents=True)
        cover.write_bytes(b"cover")
        nested_cover = self.root / "assets/images/covers/nested/canonical.jpg"
        nested_cover.parent.mkdir(parents=True)
        nested_cover.write_bytes(b"nested cover")
        absolute = cover.as_posix()
        cases = [
            ("dot-prefix", "./assets/images/covers/canonical.jpg"),
            ("duplicate-separator", "assets/images/covers//canonical.jpg"),
            ("dot-segment", "assets/images/covers/./canonical.jpg"),
            (
                "traversal-segment",
                "assets/images/covers/nested/../canonical.jpg",
            ),
            ("backslash", r"assets\images\covers\canonical.jpg"),
            (
                "mixed-separators",
                r"assets/images/covers/nested\canonical.jpg",
            ),
            ("absolute", absolute),
        ]
        for name, cover_value in cases:
            with self.subTest(name=name):
                path = self.write_article(
                    f"noncanonical-{name}.md",
                    article_text(extra_lines=[
                        f"cover = '{cover_value}'",
                        'cover_alt = "Canonical cover."',
                    ]),
                )
                self.assert_article_error(
                    path,
                    "cover",
                    lambda path=path: parse_article(path, self.root),
                )

    def test_duplicate_slugs_are_rejected(self):
        self.write_article("same.md", article_text(title="First"), self.articles / "a")
        duplicate = self.write_article(
            "same.md", article_text(title="Second"), self.articles / "b"
        )

        self.assert_article_error(
            duplicate,
            "slug",
            lambda: build_public_records(self.articles, self.root),
        )

    def test_malformed_toml_names_front_matter_context(self):
        path = self.write_article(
            "malformed.md",
            '''+++
title = [
+++
# Body''',
        )

        self.assert_article_error(
            path, "front_matter", lambda: parse_article(path, self.root)
        )

    def test_missing_opening_delimiter_names_front_matter_context(self):
        path = self.write_article("missing-opening.md", "# Body")

        self.assert_article_error(
            path, "front_matter", lambda: parse_article(path, self.root)
        )

    def test_missing_closing_delimiter_names_front_matter_context(self):
        path = self.write_article(
            "unclosed.md",
            "+++\n" + "\n".join([
                'title = "Unclosed"',
                "date = 2026-09-11",
                'kind = "essay"',
                'category = "life"',
                'summary = "No closing marker."',
                "draft = false",
                "# Body",
            ]),
        )

        self.assert_article_error(
            path, "front_matter", lambda: parse_article(path, self.root)
        )

    def test_public_records_exclude_drafts_and_sort_newest_first_deterministically(self):
        self.write_article("old.md", article_text("Old", "2026-01-01", draft=False))
        self.write_article("z-new.md", article_text("Z New", "2026-09-11", draft=False))
        self.write_article("a-new.md", article_text("A New", "2026-09-11", draft=False))
        self.write_article("secret.md", article_text("Secret", "2026-09-12", draft=True))

        records = build_public_records(self.articles, self.root)

        self.assertEqual(
            [item["slug"] for item in records],
            ["a-new", "z-new", "old"],
        )


class ArticleBuildTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        self.addCleanup(self.temporary_directory.cleanup)
        self.articles = self.root / "articles"
        self.articles.mkdir()
        scripts = self.root / "scripts"
        scripts.mkdir()
        for source in (Path(__file__).resolve().parents[1] / "scripts").glob("*.py"):
            shutil.copy2(source, scripts / source.name)

    def write_article(self, slug, **metadata):
        (self.articles / f"{slug}.md").write_text(
            article_text(**metadata), encoding="utf-8", newline="\n"
        )

    def run_build(self, entry="build_articles.py"):
        return subprocess.run(
            [sys.executable, "-X", "utf8", str(self.root / "scripts" / entry)],
            cwd=self.root, capture_output=True, text=True, encoding="utf-8",
        )

    def test_build_outputs_are_stable_and_publish_only_sorted_public_articles(self):
        self.write_article("old", date="2026-01-01")
        self.write_article("z-new", title="清晨 & <trees>", summary="A & B < C")
        self.write_article("a-new")
        self.write_article("secret", date="2026-09-12", draft=True)
        # Stale compatibility metadata must never be used as a source.
        (self.articles / "index.json").write_text("not JSON", encoding="utf-8")

        first = self.run_build()
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(first.stderr, "")
        self.assertIn("3 articles", first.stdout)
        index = self.root / "public/data/articles.json"
        feed = self.root / "feed.xml"
        index_first, feed_first = index.read_bytes(), feed.read_bytes()
        records = json.loads(index_first)
        self.assertEqual([record["slug"] for record in records], ["a-new", "z-new", "old"])
        self.assertIn("清晨".encode("utf-8"), index_first)
        self.assertTrue(index_first.endswith(b"\n"))
        self.assertNotIn(b"\r", index_first)
        self.assertIn(b'\n  {\n    "slug":', index_first)
        channel = ET.fromstring(feed_first).find("channel")
        self.assertEqual(channel.findtext("lastBuildDate"), "Fri, 11 Sep 2026 00:00:00 +0800")
        items = channel.findall("item")
        self.assertEqual([item.findtext("link").split("slug=")[1] for item in items], ["a-new", "z-new", "old"])
        self.assertEqual(items[1].findtext("title"), "清晨 & <trees>")
        self.assertEqual(items[1].findtext("description"), "A & B < C")
        self.assertEqual(items[0].findtext("category"), "life")
        self.assertEqual(items[0].findtext("pubDate"), channel.findtext("lastBuildDate"))
        self.assertTrue(items[0].findtext("link").startswith("https://jingtine.github.io/jingtine-agent-site/article.html?slug="))

        second = self.run_build()
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual(index_first, index.read_bytes())
        self.assertEqual(feed_first, feed.read_bytes())
        compatibility = self.run_build("generate_feed.py")
        self.assertEqual(compatibility.returncode, 0, compatibility.stderr)
        self.assertEqual(index_first, index.read_bytes())
        self.assertEqual(feed_first, feed.read_bytes())

    def test_invalid_source_reports_error_and_does_not_replace_outputs(self):
        self.write_article("broken", kind="unsupported")
        feed = self.root / "feed.xml"
        feed.write_bytes(b"existing feed")
        result = self.run_build()
        self.assertEqual(result.returncode, 1)
        self.assertEqual(result.stdout, "")
        self.assertIn("broken.md", result.stderr)
        self.assertIn("kind", result.stderr)
        self.assertEqual(feed.read_bytes(), b"existing feed")
        self.assertFalse((self.root / "public/data/articles.json").exists())

    def test_output_filesystem_error_returns_one(self):
        self.write_article("valid")
        (self.root / "public").write_text("blocking file", encoding="utf-8")
        result = self.run_build()
        self.assertEqual(result.returncode, 1)
        self.assertIn("ERROR:", result.stderr)
        self.assertEqual(result.stdout, "")

    def test_empty_publication_has_no_wall_clock_timestamp(self):
        self.write_article("secret", draft=True)
        result = self.run_build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / "public/data/articles.json").read_bytes(), b"[]\n")
        channel = ET.parse(self.root / "feed.xml").find("channel")
        self.assertEqual(channel.findall("item"), [])
        self.assertIsNone(channel.find("lastBuildDate"))


if __name__ == "__main__":
    unittest.main()
