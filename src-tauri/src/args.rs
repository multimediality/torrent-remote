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

//! Torrent files and magnet links handed to the app (command line, a second
//! instance, macOS open events) are queued here until the frontend is ready
//! to receive them.

use std::sync::Arc;

use tauri::{async_runtime, AppHandle, Emitter, Manager, State};
use tokio::sync::{OwnedSemaphorePermit, Semaphore};

use crate::tray::toggle_main_window;
use crate::ArgsHandle;

/// Delivers torrent files and magnet links to the frontend, opening the
/// main window first if needed. Waits until the frontend signalled that its
/// listener is ready (listener-start).
pub fn deliver_args(app: &AppHandle, args: Vec<String>) {
    if args.is_empty() {
        return;
    }
    let app = app.clone();
    async_runtime::spawn(async move {
        let args_sem = {
            let state: State<ArgsHandle> = app.state();
            let queue = state.0.read().await;
            queue.args_sem.clone()
        };
        if app.get_webview_window("main").is_none() {
            toggle_main_window(&app, None);
        }
        let lock = args_sem.acquire().await.unwrap();
        send_payload(&app, args);
        drop(lock);
    });
}

fn send_payload(app: &AppHandle, args: Vec<String>) {
    let Some(window) = app.get_webview_window("main") else {
        log::warn!("No main window to deliver arguments to");
        return;
    };
    if let Err(e) = window.emit("app-arg", serde_json::to_string(&args).unwrap_or_default()) {
        log::warn!("Unable to deliver arguments to the frontend: {e}");
    }
}

pub struct StartupArgs {
    /// Set once setup() initialised the queue. Arguments that arrive earlier
    /// are kept in `pending` and delivered by setup().
    pub ready: bool,
    args_sem: Arc<Semaphore>,
    args_lock: Option<OwnedSemaphorePermit>,
    pending: Vec<String>,
}

impl StartupArgs {
    pub fn new() -> Self {
        Self {
            ready: false,
            args_sem: Semaphore::new(1).into(),
            args_lock: None,
            pending: Vec::new(),
        }
    }

    #[cfg(target_os = "macos")]
    pub fn push_pending(&mut self, uris: Vec<String>) {
        self.pending.extend(uris);
    }

    pub fn take_pending(&mut self) -> Vec<String> {
        std::mem::take(&mut self.pending)
    }

    /// Holds argument delivery back until the frontend calls start().
    pub async fn init(&mut self) {
        self.args_lock = self.args_sem.clone().acquire_owned().await.ok();
        self.ready = true;
    }

    pub fn start(&mut self) {
        drop(self.args_lock.take());
    }

    pub async fn pause(&mut self) {
        if self.args_lock.is_none() {
            self.args_lock = self.args_sem.clone().acquire_owned().await.ok();
        }
    }
}
