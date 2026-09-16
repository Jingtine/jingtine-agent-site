#!/usr/bin/env python3
"""Compatibility entry point for the Markdown Writing metadata and RSS build."""

if __package__:
    from .build_articles import main
else:
    from build_articles import main


if __name__ == "__main__":
    raise SystemExit(main())
