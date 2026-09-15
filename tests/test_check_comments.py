"""Regression tests for the comments configuration contract."""

import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from scripts import check


class CommentsConfigCheckTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        (self.root / "config").mkdir()
        project_dir = patch.object(check, "PROJECT_DIR", str(self.root))
        project_dir.start()
        self.addCleanup(project_dir.stop)

    def write_comments(self, value):
        (self.root / "config/comments.json").write_text(
            json.dumps(value, ensure_ascii=False), encoding="utf-8"
        )

    def valid_config(self, **changes):
        config = {
            "enabled": False,
            "repo": "Jingtine/jingtine-agent-site",
            "repoId": "",
            "category": "茶客留言",
            "categoryId": "",
            "theme": "light",
            "lang": "zh-CN",
        }
        config.update(changes)
        return config

    def assert_check(self, expected):
        result = check.check_comments_config()
        self.assertIs(result.passed, expected)
        self.assertIs(bool(result), expected)

    def test_accepts_disabled_and_provisioned_configurations(self):
        self.write_comments(self.valid_config())
        self.assert_check(True)
        self.write_comments(self.valid_config(enabled=True, repoId="R_kgDOExample", categoryId="DIC_kwDOExample"))
        self.assert_check(True)

    def test_rejects_non_boolean_enabled(self):
        for value in ("false", 0, 1, None):
            with self.subTest(value=value):
                self.write_comments(self.valid_config(enabled=value))
                self.assert_check(False)

    def test_enabled_requires_nonempty_ids(self):
        for repo_id, category_id in (("", ""), ("R_kgDOExample", ""), ("", "DIC_kwDOExample"), ("  ", "DIC_kwDOExample")):
            with self.subTest(repo_id=repo_id, category_id=category_id):
                self.write_comments(self.valid_config(enabled=True, repoId=repo_id, categoryId=category_id))
                self.assert_check(False)

    def test_rejects_unexpected_repository_or_category(self):
        for changes in (
            {"repo": "other/site"},
            {"category": "留言"},
        ):
            with self.subTest(changes=changes):
                self.write_comments(self.valid_config(**changes))
                self.assert_check(False)

    def test_rejects_unsupported_theme_or_language(self):
        for changes in (
            {"theme": "system"},
            {"lang": "ja"},
        ):
            with self.subTest(changes=changes):
                self.write_comments(self.valid_config(**changes))
                self.assert_check(False)

    def test_rejects_unknown_or_missing_keys(self):
        self.write_comments(self.valid_config(extra=True))
        self.assert_check(False)
        config = self.valid_config()
        del config["lang"]
        self.write_comments(config)
        self.assert_check(False)

    def test_rejects_non_object_json(self):
        self.write_comments([])
        self.assert_check(False)


if __name__ == "__main__":
    unittest.main()
