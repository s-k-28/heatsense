"""Validate local links in maintained HeatSense Markdown without third-party packages."""

import argparse
import re
import sys
from pathlib import Path
from urllib.parse import unquote

FENCED_CODE = re.compile(r"^```[^\n]*\n[\s\S]*?^```\s*$", re.MULTILINE)
LINKS = re.compile(
    r'\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)|(?:src|href)=["\']([^"\']+)["\']'
)
URL_SCHEME = re.compile(r"^[\w+.-]+:")


def markdown_files(directory):
    """Archives retain historical paths and are outside the maintained-link gate."""
    for entry in sorted(directory.iterdir()):
        if entry.is_dir():
            if entry.name != "archive":
                yield from markdown_files(entry)
        elif entry.suffix == ".md":
            yield entry


def check_links(root):
    files = [root / "README.md", root / "HANDOFF.md", *markdown_files(root / "docs")]
    broken = []
    checked = 0
    for file in files:
        source = FENCED_CODE.sub("", file.read_text(encoding="utf-8"))
        for match in LINKS.finditer(source):
            url = (match[1] or match[2]).removeprefix("<").removesuffix(">")
            if url.startswith(("#", "/")) or URL_SCHEME.match(url):
                continue
            target = unquote(re.split(r"[?#]", url, maxsplit=1)[0], errors="strict")
            if not target:
                continue
            checked += 1
            if not (file.parent / target).exists():
                broken.append(f"{file.relative_to(root)} → {target}")

    if broken:
        print("Broken local documentation links:\n" + "\n".join(broken), file=sys.stderr)
        return 1
    print(f"docs: {checked} local links checked across {len(files)} maintained documents")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--root", type=Path, default=Path(__file__).resolve().parent.parent,
        help="Project root; defaults to this script's repository",
    )
    return check_links(parser.parse_args().root.resolve())


if __name__ == "__main__":
    raise SystemExit(main())
