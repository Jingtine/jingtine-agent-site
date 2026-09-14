"""Regression tests for the Links Directory source contract."""

import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from scripts import check


class LinksConfigCheckTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        (self.root / "config").mkdir()
        (self.root / "assets/images/avatars").mkdir(parents=True)
        (self.root / "assets/images/avatars/example.svg").write_text("<svg/>", encoding="utf-8")
        project_dir = patch.object(check, "PROJECT_DIR", str(self.root))
        project_dir.start()
        self.addCleanup(project_dir.stop)

    def write_links(self, value):
        (self.root / "config/links.json").write_text(
            json.dumps(value, ensure_ascii=False), encoding="utf-8"
        )

    def valid_link(self, **changes):
        link = {
            "name": "Example",
            "url": "https://example.com",
            "description": "个人站点。",
            "tags": ["设计"],
            "avatar": "assets/images/avatars/example.svg",
        }
        link.update(changes)
        return link

    def valid_config(self, **changes):
        config = {"groups": [{"id": "places", "name": "常去看看", "links": [self.valid_link()]}]}
        config.update(changes)
        return config

    def assert_check(self, expected):
        result = check.check_links_config()
        self.assertIs(result.passed, expected)
        self.assertIs(bool(result), expected)

    def test_accepts_empty_groups_and_valid_links(self):
        self.write_links({"groups": []})
        self.assert_check(True)
        self.write_links(self.valid_config())
        self.assert_check(True)

    def test_rejects_duplicate_group_ids(self):
        config = self.valid_config()
        config["groups"].append({"id": "places", "name": "重复", "links": []})
        self.write_links(config)
        self.assert_check(False)

    def test_rejects_whitespace_only_group_name(self):
        self.write_links(self.valid_config(groups=[{
            "id": "places", "name": "  ", "links": [self.valid_link()]
        }]))
        self.assert_check(False)

    def test_rejects_empty_required_text(self):
        for field in ("name", "description"):
            with self.subTest(field=field):
                self.write_links(self.valid_config(groups=[{
                    "id": "places", "name": "常去看看", "links": [self.valid_link(**{field: "  "})]
                }]))
                self.assert_check(False)

    def test_rejects_http_url(self):
        self.write_links({"groups": [{"id": "places", "name": "常去看看", "links": [{
            "name": "Example", "url": "http://example.com", "description": "个人站点。"
        }]}]})
        self.assert_check(False)

    def test_rejects_javascript_url(self):
        self.write_links(self.valid_config(groups=[{
            "id": "places", "name": "常去看看", "links": [self.valid_link(url="javascript:alert(1)")]
        }]))
        self.assert_check(False)

    def test_rejects_escaping_avatar(self):
        self.write_links({"groups": [{"id": "places", "name": "常去看看", "links": [{
            "name": "Example", "url": "https://example.com", "description": "个人站点。",
            "avatar": "assets/images/../../config/links.json"
        }]}]})
        self.assert_check(False)

    def test_rejects_remote_and_missing_avatars(self):
        for avatar in ("https://example.com/avatar.svg", "assets/images/avatars/missing.svg"):
            with self.subTest(avatar=avatar):
                self.write_links(self.valid_config(groups=[{
                    "id": "places", "name": "常去看看", "links": [self.valid_link(avatar=avatar)]
                }]))
                self.assert_check(False)

    def test_rejects_invalid_tags(self):
        for tags in ("design", [], [""], [1]):
            with self.subTest(tags=tags):
                self.write_links(self.valid_config(groups=[{
                    "id": "places", "name": "常去看看", "links": [self.valid_link(tags=tags)]
                }]))
                self.assert_check(False)

    def test_rejects_non_object_json(self):
        self.write_links([])
        self.assert_check(False)


if __name__ == "__main__":
    unittest.main()
