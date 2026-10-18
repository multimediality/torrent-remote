# Torrent Remote
**Remote GUI for Transmission torrent daemon**

![Lint status](https://img.shields.io/github/actions/workflow/status/scdemanett/torrent-remote/lint.yml?label=Lint&event=push)

`Torrent Remote` is a fork of [TrguiNG](https://github.com/openscopeproject/TrguiNG)
by qu1ck, itself a rewrite of the [transgui](https://github.com/transmission-remote-gui/transgui)
project using [tauri](https://tauri.app).
Frontend is written in typescript with [react.js](https://react.dev/) and
[shadcn/ui](https://ui.shadcn.com/) components on [Tailwind CSS](https://tailwindcss.com/). Backend for the app is written in
[rust](https://www.rust-lang.org/).

You can use this program in 2 ways: as a native Windows/Linux/Mac app and as a web gui
served by transmission itself by setting `$TRANSMISSION_WEB_HOME` environment variable
to point to Torrent Remote web assets.

Some differentiating features:

* Multi tabbed interface for concurrent server connections (native app only)
* Torrent creation with fast multi threaded hashing (native app only)
* Powerful torrent filtering options
* Latest transmission features support: labels, bandwidth groups, sequential download
* Dark and white theme

Transmission v2.40 or later is required.

## Downloads

Releases are published on the
[releases page](https://github.com/scdemanett/torrent-remote/releases).

Builds of the current development version are available from github
[build workflows](https://github.com/scdemanett/torrent-remote/actions/workflows/build.yml).
Pick the latest successful run and scroll down to the artifacts section.

If you previously used TrguiNG, its settings file (`trguing.json` in your OS config folder)
is imported automatically the first time Torrent Remote starts.

## Compiling

Prerequisites:
- [Node.js 22](https://nodejs.org/) or later
- [rust 1.92](https://www.rust-lang.org/) or later
- Geoip lookup database in mmdb format, put it in `src-tauri`
   ```
   wget -nv -O src-tauri/dbip.mmdb "https://github.com/openscopeproject/TrguiNG/releases/latest/download/dbip.mmdb"
   ```
   You can get latest db from [db-ip.com](https://db-ip.com/db/download/ip-to-country-lite).

To compile simply run

```
$ npm install
$ npm run build
```

This will generate optimized bundle in `dist` and a release binary in `src-tauri/target/release` folder.
Also installer package will be available in `src-tauri/target/release/bundle/...`.

The binary is statically linked and embeds all necessary assets except for the geoip database.
It is completely self sufficient and can be used as a portable executable but for geoip lookup to work you
need to install the app with provided installer.

For development run in parallel

```
$ npm run webpack-serve
$ npm run tauri-dev
```

Webpack will automatically watch changes in `src/` and refresh the app view, tauri will watch changes
in `src-tauri/` and rebuild/restart the app as needed.

## Releasing

Tagged releases (`v*`) are built by `.github/workflows/build.yml`, which signs the updater
bundles with a minisign key and publishes `latest.json` for the in-app updater. The public key is
in `src-tauri/tauri.conf.json`; the private key lives in the gitignored `.tauri/torrent-remote.key`
and its password in 1Password. GitHub Actions needs the repository secrets
`TAURI_SIGNING_PRIVATE_KEY` (the key file contents) and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

For a local release build, load both into the shell first:

```powershell
. .\scripts\signing-key.ps1; Initialize-SigningKey -WorkspaceRoot (Get-Location)
npm run build
```

## How to use Torrent Remote as a web interface

Transmission supports custom web interfaces, all you have to do is run the daemon with
`$TRANSMISSION_WEB_HOME` variable pointing to the web assets that transmission will serve
over its `.../transmission/web/` endpoint.

Example steps for debian:
1. Download latest `torrent-remote-web-xxxx.zip` zip from the
   [build workflows](https://github.com/scdemanett/torrent-remote/actions/workflows/build.yml)
   artifacts or the [releases](https://github.com/scdemanett/torrent-remote/releases) page.
2. Unpack it anywhere, make sure that the user transmission runs under (by default `debian-transmission`)
   has read permissions.
3. Edit transmission daemon systemd unit file `/etc/systemd/system/multi-user.target.wants/transmission-daemon.service`
   and add following to `[Service]` section:
   ```
   Environment=TRANSMISSION_WEB_HOME=/path/to/extracted/torrent-remote/zip
   ```
4. Reload the unit file with `sudo systemctl daemon-reload`
   and restart the service `sudo systemctl restart transmission-daemon`

## License
Project is distributed under GNU Affero General Public License v3, see `LICENSE.txt` for details.

Copyright (C) 2023 qu1ck (original TrguiNG author), Copyright (C) 2026 Steven Demanett.
