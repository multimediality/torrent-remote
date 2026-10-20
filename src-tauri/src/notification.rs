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

//! Desktop notifications. On Windows the toast is built here instead of by
//! tauri-plugin-notification, which can neither put the app logo beside the
//! title and body nor open the app from a click on a toast in the Action
//! Center. Other platforms, and Windows when the toast fails, use the plugin.

use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// URL scheme a toast click launches the app with. A second instance passes
/// it on to the running one through tauri-plugin-single-instance. The hyphen
/// matters: registry keys ignore case, so "torrentremote" would be the
/// TorrentRemote ProgID of the .torrent association (integrations.rs).
#[cfg(windows)]
const SCHEME: &str = "torrent-remote";
const SCHEME_PREFIX: &str = "torrent-remote:";

/// True for the URL a toast click launches the app with. It only asks for
/// the main window and must never reach the frontend as a torrent.
pub fn is_activation_url(arg: &str) -> bool {
    arg.get(..SCHEME_PREFIX.len())
        .is_some_and(|prefix| prefix.eq_ignore_ascii_case(SCHEME_PREFIX))
}

/// Registers the app as a toast sender and the activation URL scheme
/// (Windows only). Runs on every start so both follow the exe if it moves.
pub fn init(app: &AppHandle) {
    #[cfg(windows)]
    win::init(app);
    #[cfg(not(windows))]
    let _ = app;
}

pub fn show_download_complete(app: &AppHandle, name: &str) {
    show(app, "Download complete", name);
}

fn show(app: &AppHandle, title: &str, body: &str) {
    #[cfg(windows)]
    match win::show_toast(app, title, body) {
        Ok(()) => return,
        Err(e) => log::warn!("Cannot show toast, falling back to the notification plugin: {e}"),
    }

    if let Err(e) = app.notification().builder().title(title).body(body).show() {
        log::warn!("Cannot show notification: {e:?}");
    }
}

#[cfg(windows)]
mod win {
    use std::path::{Path, PathBuf};
    use std::sync::OnceLock;

    use tauri::{AppHandle, Manager};
    use windows::core::HSTRING;
    use windows::Data::Xml::Dom::XmlDocument;
    use windows::UI::Notifications::{ToastNotification, ToastNotificationManager};
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    use super::SCHEME;

    const DISPLAY_NAME: &str = "Torrent Remote";

    /// Shown in the toast header, in Settings > Notifications and beside
    /// the title and body. Windows reads it from a file, so it is written
    /// to the app's local data folder on start.
    const LOGO_PNG: &[u8] = include_bytes!("../icons/128x128@2x.png");

    static LOGO_PATH: OnceLock<PathBuf> = OnceLock::new();

    pub fn init(app: &AppHandle) {
        let logo = match write_logo(app) {
            Ok(path) => Some(path),
            Err(e) => {
                log::warn!("Cannot write the toast logo: {e}");
                None
            }
        };
        if let Err(e) = register_app_user_model_id(app, logo.as_deref()) {
            log::warn!("Cannot register the app as a toast sender: {e}");
        }
        if let Err(e) = register_scheme() {
            log::warn!("Cannot register the {SCHEME}: URL scheme: {e}");
        }
        if let Some(logo) = logo {
            let _ = LOGO_PATH.set(logo);
        }
    }

    pub fn show_toast(app: &AppHandle, title: &str, body: &str) -> windows::core::Result<()> {
        let xml = toast_xml(title, body, LOGO_PATH.get().map(PathBuf::as_path));
        let doc = XmlDocument::new()?;
        doc.LoadXml(&HSTRING::from(xml))?;
        let toast = ToastNotification::CreateToastNotification(&doc)?;
        let notifier = ToastNotificationManager::CreateToastNotifierWithId(&HSTRING::from(
            app.config().identifier.as_str(),
        ))?;
        notifier.Show(&toast)
    }

    /// The click launches `torrent-remote://show` through the registered
    /// scheme (activationType="protocol"). With the default "foreground"
    /// activation Windows only raises an event in the process that sent the
    /// toast, so a click does nothing once the toast is in the Action Center
    /// or the app was closed. The toast is silent, the app plays its own
    /// sound when that is enabled.
    pub(super) fn toast_xml(title: &str, body: &str, logo: Option<&Path>) -> String {
        let logo = logo
            .map(|path| {
                format!(
                    r#"<image placement="appLogoOverride" src="{}" alt="{DISPLAY_NAME}"/>"#,
                    escape(&file_uri(path))
                )
            })
            .unwrap_or_default();
        format!(
            concat!(
                r#"<toast launch="{scheme}://show" activationType="protocol">"#,
                r#"<visual><binding template="ToastGeneric">"#,
                r#"{logo}<text>{title}</text><text>{body}</text>"#,
                r#"</binding></visual>"#,
                r#"<audio silent="true"/>"#,
                r#"</toast>"#,
            ),
            scheme = SCHEME,
            logo = logo,
            title = escape(title),
            body = escape(body),
        )
    }

    fn escape(text: &str) -> String {
        let mut escaped = String::with_capacity(text.len());
        for c in text.chars() {
            match c {
                '&' => escaped.push_str("&amp;"),
                '<' => escaped.push_str("&lt;"),
                '>' => escaped.push_str("&gt;"),
                '"' => escaped.push_str("&quot;"),
                '\'' => escaped.push_str("&apos;"),
                _ => escaped.push(c),
            }
        }
        escaped
    }

    fn file_uri(path: &Path) -> String {
        format!("file:///{}", path.display().to_string().replace('\\', "/"))
    }

    /// Rewrites the logo only when it changed, so an update with new
    /// artwork replaces it.
    fn write_logo(app: &AppHandle) -> std::io::Result<PathBuf> {
        let dir = app
            .path()
            .app_local_data_dir()
            .map_err(std::io::Error::other)?;
        std::fs::create_dir_all(&dir)?;
        let path = dir.join("toast-logo.png");
        if std::fs::read(&path).ok().as_deref() != Some(LOGO_PNG) {
            std::fs::write(&path, LOGO_PNG)?;
        }
        Ok(path)
    }

    /// Names the toast sender. Installed builds also get this from the
    /// Start menu shortcut the installer tags with the identifier, dev and
    /// portable builds only from here.
    fn register_app_user_model_id(app: &AppHandle, logo: Option<&Path>) -> std::io::Result<()> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (key, _) = hkcu.create_subkey(format!(
            r"Software\Classes\AppUserModelId\{}",
            app.config().identifier
        ))?;
        key.set_value("DisplayName", &DISPLAY_NAME)?;
        if let Some(logo) = logo {
            key.set_value("IconUri", &file_uri(logo))?;
            // transparent tile background
            key.set_value("IconBackgroundColor", &"0")?;
        }
        Ok(())
    }

    fn register_scheme() -> std::io::Result<()> {
        let exe = std::env::current_exe()?;
        let exe = exe.to_string_lossy();
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (key, _) = hkcu.create_subkey(format!(r"Software\Classes\{SCHEME}"))?;
        key.set_value("", &format!("URL:{DISPLAY_NAME} notification"))?;
        key.set_value("URL Protocol", &"")?;

        let (key, _) = hkcu.create_subkey(format!(r"Software\Classes\{SCHEME}\DefaultIcon"))?;
        key.set_value("", &format!("\"{exe}\",0"))?;

        let (key, _) =
            hkcu.create_subkey(format!(r"Software\Classes\{SCHEME}\shell\open\command"))?;
        key.set_value("", &format!("\"{exe}\" \"%1\""))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn activation_url_is_recognized() {
        assert!(is_activation_url("torrent-remote://show"));
        assert!(is_activation_url("torrent-remote://show/"));
        assert!(is_activation_url("Torrent-Remote://show"));
        // the .torrent ProgID (integrations.rs), not the scheme
        assert!(!is_activation_url("TorrentRemote://show"));
        assert!(!is_activation_url("magnet:?xt=urn:btih:abc"));
        assert!(!is_activation_url("C:\\Downloads\\file.torrent"));
        assert!(!is_activation_url("torrent"));
        assert!(!is_activation_url("ä"));
    }

    #[cfg(windows)]
    #[test]
    fn toast_xml_escapes_and_activates_by_protocol() {
        let xml = win::toast_xml(
            "Download complete",
            "Tom & Jerry <1080p> \"S01\"",
            Some(std::path::Path::new(
                r"C:\Users\me\AppData\Local\app\toast-logo.png",
            )),
        );
        assert!(xml.contains(r#"launch="torrent-remote://show" activationType="protocol""#));
        assert!(xml.contains("Tom &amp; Jerry &lt;1080p&gt; &quot;S01&quot;"));
        assert!(xml.contains(r#"src="file:///C:/Users/me/AppData/Local/app/toast-logo.png""#));
        assert!(xml.contains(r#"placement="appLogoOverride""#));
        assert!(xml.contains(r#"<audio silent="true"/>"#));
    }

    #[cfg(windows)]
    #[test]
    fn toast_xml_without_logo_has_no_image() {
        let xml = win::toast_xml("Title", "Body", None);
        assert!(!xml.contains("<image"));
    }

    /// A toast that fails to load falls back to the plugin, so a broken
    /// template would go unnoticed without this.
    #[cfg(windows)]
    #[test]
    fn toast_xml_loads() {
        use windows::core::HSTRING;
        use windows::Data::Xml::Dom::XmlDocument;

        let logo = std::path::Path::new(r"C:\Program Files\app\toast-logo.png");
        for xml in [
            win::toast_xml("Download complete", "<&'\"> ünïcode 名前", Some(logo)),
            win::toast_xml("Download complete", "plain", None),
        ] {
            let doc = XmlDocument::new().unwrap();
            doc.LoadXml(&HSTRING::from(xml.as_str()))
                .unwrap_or_else(|e| panic!("{e:?}: {xml}"));
        }
    }
}
