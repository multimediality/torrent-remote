#!/usr/bin/env python3
"""Builds the tauri-plugin-updater manifest from the signed release artifacts.

Usage: make_latest_json.py <artifacts dir> <tag> <owner/repo>

Walks the artifacts directory for the .sig files Tauri writes next to the
updater bundles (bundle.createUpdaterArtifacts) and prints latest.json with
one entry per platform, pointing at the release asset of the same name.
The MSI is skipped in favour of the NSIS installer on Windows.
"""

import json
import os
import sys
from datetime import datetime, timezone
from urllib.parse import quote


def platform_key(dir_name: str, asset: str) -> str | None:
    if asset.endswith(".msi"):
        return None
    if asset.endswith(".exe"):
        return "windows-aarch64" if "arm64" in asset or "aarch64" in dir_name else "windows-x86_64"
    if asset.endswith(".AppImage"):
        return "linux-aarch64" if "aarch64" in dir_name else "linux-x86_64"
    if asset.endswith(".app.tar.gz"):
        return "darwin-aarch64" if "aarch64" in dir_name else "darwin-x86_64"
    return None


def main() -> int:
    artifacts, tag, repo = sys.argv[1:4]
    version = tag[1:] if tag.startswith("v") else tag
    platforms = {}

    for root, _dirs, files in os.walk(artifacts):
        for name in sorted(files):
            if not name.endswith(".sig"):
                continue
            asset = name[: -len(".sig")]
            key = platform_key(os.path.relpath(root, artifacts), asset)
            if key is None or key in platforms:
                continue
            with open(os.path.join(root, name), encoding="utf-8") as f:
                signature = f.read().strip()
            # GitHub replaces spaces in release asset names with dots
            url = f"https://github.com/{repo}/releases/download/{tag}/{quote(asset.replace(' ', '.'))}"
            platforms[key] = {"signature": signature, "url": url}

    if not platforms:
        print("no .sig files found", file=sys.stderr)
        return 1

    manifest = {
        "version": version,
        "notes": f"Torrent Remote {version}",
        "pub_date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "platforms": dict(sorted(platforms.items())),
    }
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
