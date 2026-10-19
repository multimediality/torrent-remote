# Contributing to Torrent Remote

Thanks for helping out. Bug reports, feature ideas and pull requests are all welcome.

## Reporting bugs and requesting features

Open an [issue](https://github.com/scdemanett/torrent-remote/issues/new/choose) and pick the bug
report or feature request form. For bugs, the app version, your OS and the Transmission version
matter most. Logs help too:

- Windows: `%LOCALAPPDATA%\io.github.scdemanett.torrentremote\logs`
- macOS: `~/Library/Logs/io.github.scdemanett.torrentremote`
- Linux: `~/.local/share/io.github.scdemanett.torrentremote/logs`

Check that a log doesn't contain server addresses or credentials you'd rather keep private
before you attach it.

## Branches

`main` is the only long-lived branch. It should always build, and releases are tagged from it.

1. Fork the repository, or create a branch if you have write access.
2. Name the branch after the change: `fix/tracker-list-resize`, `feat/update-channel`,
   `docs/web-interface`.
3. Keep each branch to one change and open a pull request against `main`.
4. Pull requests are squash-merged or rebased, so the history stays linear. Rebase onto `main`
   rather than merging `main` into your branch.

For a larger change, open an issue first so we can agree on the approach before you spend
time on it.

## Building

See [Compiling](README.md#compiling) in the README for the prerequisites (Node.js, Rust and the
geoip database). For development, run these two in parallel:

```
npm run webpack-serve
npm run tauri-dev
```

## Checks

CI runs eslint on `src/` and clippy on `src-tauri/` for every push and pull request, and
reports problems as review comments. Run them locally before you push:

```
npx eslint src/
npx tsc --noEmit -p .
cd src-tauri && cargo clippy --all-targets
```

Clippy needs `src-tauri/dbip.mmdb` and a `dist/` folder to exist. An empty file and an empty
folder are enough.

## Commit messages

- The first line is a short summary in the imperative: "Let the tracker list be resized",
  not "Fixed resizing".
- After a blank line, explain what was wrong and why the change fixes it. Wrap at about 72
  characters.
- Mention user-visible behavior in plain words. The release notes are generated from pull
  request titles, so give the pull request a title a user would understand too.

## Releases

Maintainers release by tagging `main`:

```
python ci/set_version.py 2.2.0
git commit -am "Bump version to 2.2.0"
git tag -a v2.2.0 -m "Torrent Remote 2.2.0"
git push origin main v2.2.0
```

The [build workflow](.github/workflows/build.yml) builds every platform from the tag, signs
the files and publishes the release, and the in-app updater picks it up. A tag with a
pre-release suffix such as `v2.2.0-rc.1` is published as a pre-release, which the updater
never offers.

## License

Torrent Remote is licensed under the [GNU AGPL v3](LICENSE.txt). By submitting a contribution,
you agree that it is licensed under the same terms.
