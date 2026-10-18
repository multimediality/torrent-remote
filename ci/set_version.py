#!/usr/bin/env python3
"""Writes one version into every manifest that carries it.

Usage: set_version.py <version>      e.g. set_version.py 2.0.0-rc.5

Touches package.json, package-lock.json, src-tauri/tauri.conf.json and
src-tauri/Cargo.toml (Cargo.lock follows on the next cargo build). CI runs it
for tag builds so a pre-release build really reports its pre-release version,
which is what lets the updater move from 2.0.0-rc.5 to 2.0.0 later.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSION_RE = re.compile(r"\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?")


def write_json(path: Path, mutate) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    mutate(data)
    # same formatting npm and tauri use: two spaces, raw unicode, LF, trailing newline
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


def main() -> int:
    if len(sys.argv) != 2 or VERSION_RE.fullmatch(sys.argv[1]) is None:
        print(__doc__, file=sys.stderr)
        return 2
    version = sys.argv[1]

    def set_root(data):
        data["version"] = version

    def set_lock(data):
        data["version"] = version
        data["packages"][""]["version"] = version

    write_json(ROOT / "package.json", set_root)
    write_json(ROOT / "package-lock.json", set_lock)
    write_json(ROOT / "src-tauri" / "tauri.conf.json", set_root)

    cargo = ROOT / "src-tauri" / "Cargo.toml"
    text = cargo.read_text(encoding="utf-8")
    text, n = re.subn(r'^version = "[^"]+"$', f'version = "{version}"', text, count=1, flags=re.M)
    if n != 1:
        print("package version not found in Cargo.toml", file=sys.stderr)
        return 1
    cargo.write_text(text, encoding="utf-8", newline="\n")
    print(f"version set to {version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
