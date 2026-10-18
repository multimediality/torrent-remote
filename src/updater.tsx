/**
 * Torrent Remote - remote GUI for transmission torrent daemon
 * Copyright (C) 2026  Steven Demanett
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { Button } from "components/ui/button";
import { notifications } from "notifications";
import type { Update } from "@tauri-apps/plugin-updater";
import React from "react";
import { isDevBuild } from "trutil";

const { TAURI } = await import(/* webpackChunkName: "taurishim" */"taurishim");

const NOTIFICATION_ID = "app-update";

/**
 * Asks the GitHub release feed (tauri-plugin-updater) for a newer version.
 * A found update is offered in a notification with an install button.
 * With `manual` the result is always reported, otherwise only an available
 * update is shown and failures (no network, dev build) are just logged.
 * Automatic checks are skipped in dev builds: their manifests carry the last
 * release's version, so every newer release would be offered and installing
 * it would replace the installed app.
 */
export async function checkForUpdates(manual: boolean) {
    if (!TAURI) return;
    if (!manual && isDevBuild) return;

    const { check } = await import(/* webpackMode: "lazy-once" */ "@tauri-apps/plugin-updater");

    let update: Update | null;
    try {
        update = await check();
    } catch (e) {
        console.warn("Update check failed:", e);
        if (manual) {
            notifications.show({
                title: "Update check failed",
                message: String(e),
                color: "red",
            });
        }
        return;
    }

    if (update === null) {
        if (manual) {
            notifications.show({
                title: "Torrent Remote is up to date",
                message: "No newer version has been released.",
            });
        }
        return;
    }

    notifications.show({
        id: NOTIFICATION_ID,
        title: `Torrent Remote ${update.version} is available`,
        message: (
            <Button size="xs" className="mt-1" onClick={() => { void installUpdate(update); }}>
                Download and restart
            </Button>
        ),
        autoClose: false,
        withCloseButton: true,
    });
}

async function installUpdate(update: Update) {
    notifications.update({
        id: NOTIFICATION_ID,
        title: `Downloading Torrent Remote ${update.version}`,
        message: "The app restarts once the update is installed.",
        loading: true,
        autoClose: false,
        withCloseButton: false,
    });

    try {
        await update.downloadAndInstall();
        const { relaunch } = await import(/* webpackMode: "lazy-once" */ "@tauri-apps/plugin-process");
        await relaunch();
    } catch (e) {
        console.error("Update failed:", e);
        notifications.update({
            id: NOTIFICATION_ID,
            title: "Update failed",
            message: String(e),
            color: "red",
            loading: false,
            autoClose: false,
            withCloseButton: true,
        });
    }
}
