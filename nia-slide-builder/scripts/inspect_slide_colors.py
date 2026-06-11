#!/usr/bin/env python3
"""Extract hex color usage from HTML/CSS slide files."""

from __future__ import annotations

import collections
import pathlib
import re
import sys


HEX_RE = re.compile(r"#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b")


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: inspect_slide_colors.py <slide.html> [more.html ...]", file=sys.stderr)
        return 2

    counts: collections.Counter[str] = collections.Counter()
    for arg in sys.argv[1:]:
        path = pathlib.Path(arg)
        text = path.read_text(encoding="utf-8")
        counts.update(match.group(0).upper() for match in HEX_RE.finditer(text))

    for color, count in counts.most_common():
        print(f"{color}\t{count}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
