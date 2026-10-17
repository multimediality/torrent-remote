// Torrent Remote - remote GUI for transmission torrent daemon
// Copyright (C) 2023  qu1ck (mail at qu1ck.org)
// Copyright (C) 2026  Steven Demanett
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::{sync::Arc, time::Duration};

use createtorrent::CreationRequestsHandle;
use geoip::MmdbReaderHandle;
use poller::PollerHandle;
use tauri::{async_runtime, App, AppHandle, Listener, Manager, State};
use tauri_plugin_cli::CliExt;
use tauri_plugin_window_state::{AppHandleExt, StateFlags};
use tokio::sync::RwLock;
use torrentcache::TorrentCacheHandle;

mod commands;
mod createtorrent;
mod geoip;
mod integrations;
mod ipc;
#[cfg(target_os = "macos")]
mod macos;
mod poller;
mod sound;
mod torrentcache;
mod tray;

struct ListenerHandle(Arc<RwLock<ipc::Ipc>>);

#[cfg(target_os = "macos")]
fn handle_uris(app: &AppHandle, uris: Vec<String>) {
    if uris.is_empty() {
        return;
    }
    let listener_state: State<ListenerHandle> = app.state();
    let listener_lock = listener_state.0.clone();
    let app_handle = app.clone();
    async_runtime::spawn(async move {
        {
            let mut listener = listener_lock.write().await;
            if !listener.listening {
                listener.push_pending(uris);
                return;
            }
        }
        ipc::deliver_args(&app_handle, uris);
    });
}

/// Window state persisted by tauri-plugin-window-state: size, position and
/// maximized state. Visibility is excluded on purpose, otherwise a window
/// hidden to the tray would be restored hidden on the next launch.
pub fn window_state_flags() -> StateFlags {
    StateFlags::all() & !StateFlags::VISIBLE
}

fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let mut torrents: Vec<String> = vec![];
    match app.cli().matches() {
        Ok(matches) => {
            if matches.args.contains_key("help") {
                println!("{}", matches.args["help"].value.as_str().unwrap());
                app.handle().exit(0);
                return Ok(());
            }
            if matches.args["torrent"].value.is_array() {
                torrents = matches.args["torrent"]
                    .value
                    .as_array()
                    .unwrap()
                    .iter()
                    .map(|v| v.as_str().unwrap().to_string())
                    .collect();
            }
        }
        Err(_) => {
            println!("Unable to read cli args");
            app.handle().exit(0);
        }
    }

    let app: AppHandle = app.handle().clone();

    async_runtime::spawn(async move {
        let poller_state: State<PollerHandle> = app.state();
        let mut poller = poller_state.0.lock().await;
        poller.set_app_handle(&app);

        let listener_state: State<ListenerHandle> = app.state();
        let listener_lock = listener_state.0.clone();

        let mut listener = listener_lock.write().await;
        listener.init().await;
        if let Some(addr) = listener.address() {
            let proxy_address: State<ipc::ProxyAddress> = app.state();
            proxy_address.0.set(addr).ok();
        }
        listener.listen(&app).await.ok();

        if listener.listening {
            let listener_lock1 = listener_lock.clone();
            let _ = app.listen("listener-start", move |_| {
                let listener_lock = listener_lock1.clone();
                async_runtime::spawn(async move {
                    let mut listener = listener_lock.write().await;
                    listener.start();
                });
            });
            let listener_lock2 = listener_lock.clone();
            let _ = app.listen("listener-pause", move |_| {
                let listener_lock = listener_lock2.clone();
                async_runtime::spawn(async move {
                    let mut listener = listener_lock.write().await;
                    listener.pause().await;
                });
            });
            tray::toggle_main_window(&app, None);
        } else {
            eprintln!("Unable to start the local proxy server");
            app.exit(1);
            return;
        }
        torrents.extend(listener.take_pending());
        drop(listener);

        ipc::deliver_args(&app, torrents);

        let app_clone = app.clone();
        app.listen("app-exit", move |_| {
            println!("Exiting");
            app_clone.exit(0);
        });

        let app_clone = app.clone();
        app.listen("window-hidden", move |_| {
            let _ = app_clone.save_window_state(window_state_flags());
            tray::set_tray_showhide_text(&app_clone, "Show");
        });
    });

    Ok(())
}

static APP_USER_AGENT: &str = concat!(env!("CARGO_PKG_NAME"), "/", env!("CARGO_PKG_VERSION"));

pub struct HttpClients {
    pub default: reqwest::Client,
    pub insecure: reqwest::Client,
}

fn client_builder() -> reqwest::ClientBuilder {
    reqwest::Client::builder()
        .user_agent(APP_USER_AGENT)
        .connect_timeout(Duration::from_secs(10))
        .read_timeout(Duration::from_secs(40))
        .timeout(Duration::from_secs(60))
        .http1_only()
        .http1_title_case_headers()
}

fn http_clients() -> HttpClients {
    let default = client_builder()
        .build()
        .expect("Failed to initialize http client");

    let insecure = client_builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("Failed to initialize insecure http client");

    HttpClients { default, insecure }
}

fn main() {
    let context = tauri::generate_context!();
    let ipc = ipc::Ipc::new();

    let app_builder = tauri::Builder::default()
        // must be the first plugin. The lock is keyed by the app identifier,
        // so other Tauri apps never collide with it. A second launch exits
        // right away and its arguments arrive here in the running instance.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let args: Vec<String> = argv
                .into_iter()
                .skip(1)
                .filter(|a| !a.starts_with('-'))
                .collect();
            if args.is_empty() {
                match app.get_webview_window("main") {
                    Some(window) if window.is_visible().unwrap_or(false) => {
                        window.set_focus().ok();
                    }
                    window => tray::toggle_main_window(app, window),
                }
            } else {
                ipc::deliver_args(app, args);
            }
        }))
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(window_state_flags())
                // only the main window, the create torrent windows have random labels
                .with_filter(|label| label == "main")
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::read_file,
            commands::remove_file,
            commands::shell_open,
            commands::set_poller_config,
            commands::app_integration,
            commands::get_file_stats,
            commands::create_torrent,
            commands::check_create_torrent,
            commands::cancel_create_torrent,
            commands::save_create_torrent,
            commands::pass_to_window,
            commands::list_system_fonts,
            commands::create_tray,
            commands::save_text_file,
            commands::load_text_file,
            commands::backend_address,
        ])
        .manage(ListenerHandle(Arc::new(RwLock::new(ipc))))
        .manage(ipc::ProxyAddress::default())
        .manage(TorrentCacheHandle::default())
        .manage(PollerHandle::default())
        .manage(MmdbReaderHandle::default())
        .manage(CreationRequestsHandle::default())
        .manage(http_clients())
        .setup(setup);

    #[cfg(target_os = "macos")]
    let app_builder = app_builder
        .menu(macos::make_menu)
        .on_menu_event(|app, event| if event.id().as_ref() == "appquit" {
            tray::exit(app.clone());
        });

    let app = app_builder
        .build(context)
        .expect("error while running tauri application");

    #[allow(clippy::single_match)]
    app.run(move |app_handle, event| match event {
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Opened { urls } => {
            let urls: Vec<String> = urls.into_iter().map(|url| url.to_string()).collect();
            handle_uris(app_handle, urls);
        }
        #[cfg(target_os = "macos")]
        tauri::RunEvent::Reopen { has_visible_windows, .. }
        if !has_visible_windows => {
            tray::toggle_main_window(app_handle, app_handle.get_webview_window("main"));
        }
        // Closing the last window must not end the app, it keeps running in
        // the tray. An explicit app.exit() carries a code and goes through so
        // that the regular Tauri exit hooks run (window state is saved there).
        tauri::RunEvent::ExitRequested { api, code: None, .. } => {
            api.prevent_exit();
            tray::set_tray_showhide_text(app_handle, "Show");
        }
        _ => {}
    });
}
