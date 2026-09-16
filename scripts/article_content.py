"""Parse article front matter and build deterministic public records."""

from datetime import date, datetime
from math import ceil
from pathlib import Path, PurePosixPath
import re
import tomllib


REQUIRED_FIELDS = ("title", "date", "kind", "category", "summary", "draft")
SUPPORTED_KINDS = frozenset({"essay", "note", "technical"})
STRING_FIELDS = ("title", "kind", "category", "summary")
CJK_PATTERN = re.compile(
    "[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff"
    "\u3040-\u30ff\u31f0-\u31ff\uac00-\ud7af]"
)
LATIN_CHARACTER_PATTERN = re.compile(r"[A-Za-z]")


class ArticleError(ValueError):
    """A source article failed validation."""

    def __init__(self, path: Path, context: str, detail: str):
        self.path = Path(path)
        self.context = context
        super().__init__(f"{self.path}: {context}: {detail}")


def _split_front_matter(path: Path, source: str) -> tuple[str, str]:
    if not source.startswith("+++\n"):
        raise ArticleError(path, "front_matter", "document must begin with +++")

    lines = source.splitlines(keepends=True)
    for index, line in enumerate(lines[1:], start=1):
        if line.rstrip("\r\n") == "+++":
            return "".join(lines[1:index]), "".join(lines[index + 1:])
    raise ArticleError(path, "front_matter", "missing closing +++")


def _read_metadata(path: Path) -> tuple[dict, str]:
    source = path.read_text(encoding="utf-8")
    front_matter, body = _split_front_matter(path, source)
    try:
        metadata = tomllib.loads(front_matter)
    except tomllib.TOMLDecodeError as error:
        raise ArticleError(path, "front_matter", f"invalid TOML: {error}") from error
    return metadata, body


def _validate_metadata(path: Path, project_dir: Path, metadata: dict) -> None:
    for field in REQUIRED_FIELDS:
        if field not in metadata:
            raise ArticleError(path, field, "required field is missing")

    for field in STRING_FIELDS:
        if not isinstance(metadata[field], str) or not metadata[field].strip():
            raise ArticleError(path, field, "must be a non-empty string")

    article_date = metadata["date"]
    if not isinstance(article_date, date) or isinstance(article_date, datetime):
        raise ArticleError(path, "date", "must be a TOML local date")
    if not isinstance(metadata["draft"], bool):
        raise ArticleError(path, "draft", "must be a boolean")
    if metadata["kind"] not in SUPPORTED_KINDS:
        allowed = ", ".join(sorted(SUPPORTED_KINDS))
        raise ArticleError(path, "kind", f"must be one of: {allowed}")

    tags = metadata.get("tags", [])
    if not isinstance(tags, list) or any(not isinstance(tag, str) for tag in tags):
        raise ArticleError(path, "tags", "must be an array of strings")

    cover_declared = "cover" in metadata
    cover_alt_declared = "cover_alt" in metadata
    cover = metadata.get("cover", "")
    cover_alt = metadata.get("cover_alt", "")
    if cover_declared and (not isinstance(cover, str) or not cover.strip()):
        raise ArticleError(path, "cover", "must be a non-empty string")
    if cover_alt_declared and (
        not isinstance(cover_alt, str) or not cover_alt.strip()
    ):
        raise ArticleError(path, "cover_alt", "must be a non-empty string")
    if cover_declared and not cover_alt_declared:
        raise ArticleError(path, "cover_alt", "is required when cover is set")
    if cover_alt_declared and not cover_declared:
        raise ArticleError(path, "cover", "is required when cover_alt is set")

    if cover_declared:
        normalized_cover = PurePosixPath(cover).as_posix()
        cover_parts = PurePosixPath(cover).parts
        if (
            "\\" in cover
            or normalized_cover != cover
            or PurePosixPath(cover).is_absolute()
            or cover_parts[:3] != ("assets", "images", "covers")
            or ".." in cover_parts
        ):
            raise ArticleError(
                path,
                "cover",
                "must be a canonical repository-relative POSIX path under "
                "assets/images/covers/",
            )
        cover_root = (project_dir / "assets/images/covers").resolve()
        cover_path = (project_dir / Path(*cover_parts)).resolve()
        try:
            cover_path.relative_to(cover_root)
        except ValueError as error:
            raise ArticleError(
                path, "cover", "must resolve under assets/images/covers/"
            ) from error
        if not cover_path.is_file():
            raise ArticleError(path, "cover", f"file does not exist: {cover}")
        metadata["cover"] = normalized_cover


def _strip_markdown(markdown: str) -> str:
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", markdown)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"`+([^`]*)`+", r"\1", text)
    text = re.sub(r"(?m)^\s{0,3}(?:#{1,6}\s*|>\s*|[-+*]\s+|\d+[.)]\s+)", "", text)
    return re.sub(r"[*_~]", "", text)


def reading_metrics(markdown: str) -> tuple[int, int]:
    """Return visible word/character count and 300-word reading minutes."""
    text = _strip_markdown(markdown)
    latin_words = sum(
        1 for token in text.split() if LATIN_CHARACTER_PATTERN.search(token)
    )
    word_count = len(CJK_PATTERN.findall(text)) + latin_words
    return word_count, max(1, ceil(word_count / 300))


def _parse_article(path: Path, project_dir: Path) -> tuple[dict, str, bool]:
    metadata, body = _read_metadata(path)
    _validate_metadata(path, project_dir, metadata)
    word_count, reading_minutes = reading_metrics(body)
    record = {
        "slug": path.stem,
        "title": metadata["title"],
        "date": metadata["date"].isoformat(),
        "kind": metadata["kind"],
        "category": metadata["category"],
        "tags": metadata.get("tags", []),
        "summary": metadata["summary"],
        "cover": metadata.get("cover", ""),
        "coverAlt": metadata.get("cover_alt", ""),
        "wordCount": word_count,
        "readingMinutes": reading_minutes,
    }
    return record, body, metadata["draft"]


def parse_article(path: Path, project_dir: Path) -> tuple[dict, str]:
    """Parse and validate one Markdown article."""
    record, body, _draft = _parse_article(path, project_dir)
    return record, body


def build_public_records(article_dir: Path, project_dir: Path) -> list[dict]:
    """Build all non-draft article records in deterministic newest-first order."""
    records = []
    slugs = {}
    paths = sorted(article_dir.rglob("*.md"), key=lambda path: path.as_posix())
    for path in paths:
        record, _body, draft = _parse_article(path, project_dir)
        slug = record["slug"]
        if slug in slugs:
            raise ArticleError(path, "slug", f"duplicates {slugs[slug]}")
        slugs[slug] = path
        if not draft:
            records.append(record)

    records.sort(key=lambda item: item["slug"])
    records.sort(key=lambda item: item["date"], reverse=True)
    return records
