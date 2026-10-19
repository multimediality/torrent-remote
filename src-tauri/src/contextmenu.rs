// Torrent Remote - remote GUI for transmission torrent daemon
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

//! Trims the WebView2 context menu down to the edit commands. The frontend
//! already hides the native menu outside text fields in release builds (see
//! suppressNativeContextMenu in src/trutil.ts), but text fields still got the
//! whole browser menu: Emoji, Import passwords, Writing direction, More tools
//! and Inspect.

use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime, Webview,
};
use webview2_com::{
    take_pwstr, ContextMenuRequestedEventHandler,
    Microsoft::Web::WebView2::Win32::{
        ICoreWebView2ContextMenuItemCollection, ICoreWebView2_11,
        COREWEBVIEW2_CONTEXT_MENU_ITEM_KIND, COREWEBVIEW2_CONTEXT_MENU_ITEM_KIND_SEPARATOR,
    },
};
use windows::core::{Interface, PWSTR};

/// WebView2 names of the menu items that are kept
const KEPT_ITEMS: &[&str] = &[
    "undo",
    "redo",
    "cut",
    "copy",
    "paste",
    "selectAll",
    // dev builds keep Inspect so the devtools stay reachable
    #[cfg(debug_assertions)]
    "inspectElement",
];

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("context-menu")
        .on_webview_ready(|webview| filter_context_menu(&webview))
        .build()
}

fn filter_context_menu<R: Runtime>(webview: &Webview<R>) {
    let result = webview.with_webview(|platform| unsafe {
        let attach = || -> windows::core::Result<()> {
            let core: ICoreWebView2_11 = platform.controller().CoreWebView2()?.cast()?;
            let handler = ContextMenuRequestedEventHandler::create(Box::new(|_, args| {
                let Some(args) = args else { return Ok(()) };
                let items = args.MenuItems()?;
                if !retain_kept_items(&items)? {
                    // nothing left to show, so suppress the menu entirely
                    args.SetHandled(true)?;
                }
                Ok(())
            }));
            let mut token = 0;
            core.add_ContextMenuRequested(&handler, &mut token)
        };
        if let Err(e) = attach() {
            log::warn!("Could not filter the webview context menu: {e}");
        }
    });
    if let Err(e) = result {
        log::warn!("Could not reach the webview to filter its context menu: {e}");
    }
}

/// Removes every item not in KEPT_ITEMS along with the separators that end
/// up leading, trailing or doubled. Returns whether any item is left.
unsafe fn retain_kept_items(
    items: &ICoreWebView2ContextMenuItemCollection,
) -> windows::core::Result<bool> {
    let mut count = 0;
    items.Count(&mut count)?;

    // walk backwards so removals do not shift the indexes still to visit
    let mut separator_below = true;
    let mut index = count;
    while index > 0 {
        index -= 1;
        let item = items.GetValueAtIndex(index)?;
        let mut kind = COREWEBVIEW2_CONTEXT_MENU_ITEM_KIND::default();
        item.Kind(&mut kind)?;
        let keep = if kind == COREWEBVIEW2_CONTEXT_MENU_ITEM_KIND_SEPARATOR {
            let keep = !separator_below;
            separator_below = true;
            keep
        } else {
            let mut name = PWSTR::null();
            item.Name(&mut name)?;
            let keep = KEPT_ITEMS.contains(&take_pwstr(name).as_str());
            if keep {
                separator_below = false;
            }
            keep
        };
        if !keep {
            items.RemoveValueAtIndex(index)?;
        }
    }

    // a separator can still be left on top
    items.Count(&mut count)?;
    if count > 0 {
        let mut kind = COREWEBVIEW2_CONTEXT_MENU_ITEM_KIND::default();
        items.GetValueAtIndex(0)?.Kind(&mut kind)?;
        if kind == COREWEBVIEW2_CONTEXT_MENU_ITEM_KIND_SEPARATOR {
            items.RemoveValueAtIndex(0)?;
            count -= 1;
        }
    }
    Ok(count > 0)
}
