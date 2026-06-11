#!/usr/bin/env python3
"""Convert an image file to a CSS-ready data URI."""

from __future__ import annotations

import base64
import mimetypes
import pathlib
import sys


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: image_to_data_uri.py <image>", file=sys.stderr)
        return 2

    path = pathlib.Path(sys.argv[1])
    mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    print(f"data:{mime_type};base64,{encoded}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
