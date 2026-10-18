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

import type { ModalState } from "./common";
import { HkModal } from "./common";
import appVersionJson from "build/version.json";
import React, { useEffect, useState } from "react";
import ReactLogo from "svg/reactjs.svg";
import TauriLogo from "svg/tauri.svg";
import AppLogo from "svg/app.svg";
import { Github } from "react-bootstrap-icons";
import { UAParser } from "ua-parser-js";
import { checkForUpdates } from "updater";
import { Button } from "components/ui/button";
import { Separator } from "components/ui/separator";
const { TAURI } = await import(/* webpackChunkName: "taurishim" */"taurishim");

interface AppVersion {
    readonly gitVersion: string,
    readonly backendVersion: string,
    readonly buildDate: number,
}

export const appVersion: AppVersion = appVersionJson;

export function VersionModal({ opened, close }: ModalState) {
    const [frontend, setFrontend] = useState<string>();

    useEffect(() => {
        if (opened && frontend === undefined) {
            const { browser, engine, os } = UAParser();
            let frontend = `${browser.name ?? "unknown"} ${browser.version ?? ""} `;
            frontend += `(${engine.name ?? "unknown"} ${engine.version ?? ""}) `;
            frontend += `on ${os.name ?? "unknown"} ${os.version ?? ""}`;
            setFrontend(frontend);
        }
    }, [opened, frontend]);

    return (
        <HkModal
            opened={opened}
            onClose={close}
            size="lg"
            title={<span className="text-[2em] font-bold">Torrent Remote</span>}
            className="p-2"
        >
            <div>
                Remote interface for&nbsp;
                <a href="https://transmissionbt.com/" target="_blank" rel="noreferrer">Transmission</a>
                &nbsp;torrent daemon
            </div>
            <Separator className="my-4" />
            <div className="flex items-center gap-2">
                <AppLogo width={128} height={128} style={{ flexShrink: 0 }} />
                <div className="grid flex-grow grid-cols-12 gap-x-2 gap-y-1">
                    <div className="col-span-4">Version</div>
                    <div className="col-span-8">
                        {appVersion.gitVersion}
                        {TAURI && <Button
                            variant="light"
                            size="xs"
                            className="ml-2"
                            onClick={() => { void checkForUpdates(true); }}
                        >
                            Check for updates
                        </Button>}
                    </div>
                    <div className="col-span-4">Frontend</div>
                    <div className="col-span-8">{frontend}</div>
                    <div className="col-span-4">Build date</div>
                    <div className="col-span-8">{new Date(appVersion.buildDate).toLocaleString()}</div>
                    <div className="col-span-4">Source code</div>
                    <div className="col-span-8">
                        <span className="mr-1.5"><Github /></span>
                        <a href="https://github.com/scdemanett/torrent-remote/" target="_blank" rel="noreferrer">github</a>
                    </div>
                    <div className="col-span-12 mt-4">
                        {TAURI && <a href="https://db-ip.com" target="_blank" rel="noreferrer">IP Geolocation by DB-IP</a>}
                    </div>
                </div>
            </div>
            <Separator className="my-4" />
            <div className="text-center">
                powered by
            </div>
            <div className="flex justify-center">
                <a href="https://react.dev/" target="_blank" rel="noreferrer"><ReactLogo /></a>
                <a href="https://tauri.app/" target="_blank" rel="noreferrer"><TauriLogo /></a>
            </div>
        </HkModal>
    );
}
