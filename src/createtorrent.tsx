/**
 * Torrent Remote - remote GUI for transmission torrent daemon
 * Copyright (C) 2023  qu1ck (mail at qu1ck.org)
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

import React, { lazy, Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { suppressNativeContextMenu } from "trutil";
const { appWindow } = await import(/* webpackChunkName: "taurishim" */"taurishim");

const CreateTorrentForm = lazy(async () => await import(/* webpackChunkName: "createtorrentform" */ "components/createtorrentform"));
const ThemeProvider = lazy(
    async () => await import("components/theme"));

// The window is created hidden (see makeCreateTorrentView). RevealWindow is
// rendered next to the form inside the Suspense boundary, so it mounts only
// after the lazily loaded form has, and the user never sees a blank window.
function RevealWindow() {
    useEffect(() => {
        void appWindow.show().then(async () => await appWindow.setFocus());
    }, []);
    return null;
}

function run() {
    suppressNativeContextMenu();
    const appnode = document.getElementById("app") as HTMLElement;
    const app = createRoot(appnode);

    app.render(
        <React.StrictMode>
            <Suspense fallback={<div />}>
                <ThemeProvider>
                    <CreateTorrentForm />
                    <RevealWindow />
                </ThemeProvider>
            </Suspense>
        </React.StrictMode>,
    );
}

// the await above can outlast the page load, so do not rely on the load event
if (document.readyState === "complete") {
    run();
} else {
    window.addEventListener("load", run);
}
