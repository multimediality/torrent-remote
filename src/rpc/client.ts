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

import { Buffer } from "buffer";

import type { PriorityNumberType, SessionAllFieldsType, SessionStatistics, TorrentFieldsType } from "./transmission";
import { SessionAllFields, SessionFields, TorrentAllFields } from "./transmission";
import type { ServerConnection } from "../config";
import type { BandwidthGroup, TorrentBase } from "./torrent";
import React, { useContext } from "react";
import type { Batcher } from "@yornaath/batshit";
import { create, keyResolver } from "@yornaath/batshit";
import { mergeTrackerLists } from "trutil";

const { TAURI, tauriFetch, invoke } = await import(/* webpackChunkName: "taurishim" */"taurishim");

class ApiError extends Error { }

interface ApiResponse {
    result: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arguments?: any,
    tag?: number,
}

export type SessionInfo = Partial<Record<SessionAllFieldsType, unknown>>;

function isApiResponse(response: object): response is ApiResponse {
    return "result" in response && typeof response.result === "string";
}

export type TorrentActionMethodsType =
    | "torrent-start"
    | "torrent-start-now"
    | "torrent-stop"
    | "torrent-verify"
    | "torrent-reannounce"
    | "queue-move-top"
    | "queue-move-bottom"
    | "queue-move-up"
    | "queue-move-down";

export interface TorrentAddParams {
    url?: string,
    metainfo?: string,
    downloadDir: string,
    labels: string[],
    paused: boolean,
    sequential_download: boolean,
    bandwidthPriority: PriorityNumberType,
    unwanted?: number[],
}

interface IpLookupResult {
    ip: string,
    isoCode?: string,
    name?: string,
}

export class TransmissionClient {
    url: string;
    hostname: string;
    headers: Record<string, string>;
    timeout: number;
    sessionInfo: SessionInfo;
    insecure: boolean;
    toast: boolean;
    sound: boolean;
    ipsBatcher: Batcher<IpLookupResult[], string, IpLookupResult>;

    constructor(connection: ServerConnection, toastNotifications: boolean, toastNotificationSound: boolean, timeout = 15) {
        this.url = connection.url;
        this.headers = {
            "Content-Type": "application/json",
        };
        this.toast = toastNotifications;
        this.sound = toastNotificationSound;
        if (connection.username !== "" || connection.password !== "") {
            const auth = "Basic " + Buffer.from(connection.username + ":" + connection.password, "utf-8").toString("base64");
            this.headers.Authorization = auth;
        }
        this.timeout = timeout;
        this.insecure = connection.acceptInvalidCerts === true;
        this.sessionInfo = {};
        this.hostname = "unknown";
        try {
            this.hostname = connection.url === ""
                ? window.location.host
                : new URL(connection.url).hostname;
        } catch {
            // TODO handle errors
            // console.log("Invalid URL", connection.url);
        }
        this.ipsBatcher = create<IpLookupResult[], string, IpLookupResult>({
            fetcher: async (ips: string[]) => {
                return await this.lookupIps(ips);
            },
            resolver: keyResolver("ip"),
        });
    }

    getHeader(headers: Record<string, string>, header: string) {
        for (const h in headers) {
            if (header.toLowerCase() === h.toLowerCase()) {
                return headers[h];
            }
        }
        return null;
    }

    /**
     * One POST to the server. In the desktop app it goes through
     * tauri-plugin-http (Rust side), which allows any header and skips
     * certificate checks for servers marked as such. The web build talks to
     * the Transmission server that serves it.
     */
    async _post(body: string): Promise<Response> {
        const init: RequestInit = { method: "POST", headers: this.headers, body };
        if (this.url === "" || tauriFetch === undefined) {
            return await fetch("../rpc", { ...init, redirect: "manual" });
        }
        try {
            return await tauriFetch(this.url, {
                ...init,
                maxRedirections: 0,
                connectTimeout: 10_000,
                signal: AbortSignal.timeout(this.timeout * 1000),
                danger: { acceptInvalidCerts: this.insecure, acceptInvalidHostnames: this.insecure },
            });
        } catch (e) {
            throw new Error("Network error", { cause: e });
        }
    }

    async _sendRpc(data: Record<string, unknown>) {
        const body = JSON.stringify(data);
        let response = await this._post(body);

        if (response.status === 409) {
            const sid = response.headers.get("X-Transmission-Session-Id");
            if (sid == null) {
                throw new ApiError("Got 409 response without session id header");
            }
            this.headers["X-Transmission-Session-Id"] = sid;

            response = await this._post(body);
        }

        if (response.ok) {
            const text = await response.text();
            if (TAURI && data.method === "torrent-get") {
                // finished-download detection lives on the Rust side
                void invoke("process_torrents", { url: this.url, body: text, toast: this.toast, sound: this.sound });
            }
            const responseJson = JSON.parse(text);

            if (responseJson.result !== "success") {
                console.log("Full response with error:", responseJson);
                throw new ApiError(responseJson.result as string);
            }

            return responseJson;
        } else if (response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400)) {
            throw new Error("Server makes a redirect");
        } else if (response.type === "error") {
            throw new Error("Network error");
        } else {
            console.log(response);
            throw new Error(`Server returned error: ${response.status} (${response.statusText})`);
        }
    }

    async getTorrents(fields: TorrentFieldsType[]): Promise<TorrentBase[]> {
        const request = {
            method: "torrent-get",
            arguments: { fields },
        };

        const response = await this._sendRpc(request);

        if (!isApiResponse(response)) {
            throw new ApiError("torrent-get response is not torrents");
        }

        return response.arguments.torrents as TorrentBase[];
    }

    async getTorrentDetails(id: number): Promise<TorrentBase> {
        const request = {
            method: "torrent-get",
            arguments: {
                fields: TorrentAllFields,
                ids: [id],
            },
        };

        const response = await this._sendRpc(request);

        if (!isApiResponse(response)) {
            throw new ApiError("torrent-get response is not torrents");
        }

        const torrent = response.arguments.torrents.find((torrent: TorrentBase) => torrent.id === id);

        if (torrent === undefined) {
            throw new ApiError(`Torrent with id ${id} was not found`);
        }

        return torrent;
    }

    async _getSession(fields: Readonly<string[]>): Promise<SessionInfo> {
        const request = {
            method: "session-get",
            arguments: { fields },
        };

        const response = await this._sendRpc(request);

        if (!isApiResponse(response)) {
            throw new ApiError("session-get response is not a session");
        }

        return response.arguments;
    }

    async getSession(): Promise<SessionInfo> {
        const fields = this.sessionInfo["rpc-version"] === undefined ? SessionAllFields : SessionFields;
        const session = await this._getSession(fields);
        this.sessionInfo = { ...this.sessionInfo, ...session };
        return this.sessionInfo;
    }

    async getSessionFull(): Promise<SessionInfo> {
        const session = await this._getSession(SessionAllFields);
        this.sessionInfo = session;
        return this.sessionInfo;
    }

    async setSession(fields: Record<string, unknown>) {
        const request = {
            method: "session-set",
            arguments: fields,
        };

        await this._sendRpc(request);
    }

    async getSessionStats(): Promise<SessionStatistics> {
        const request = {
            method: "session-stats",
        };

        const response = await this._sendRpc(request);

        return response.arguments;
    }

    async setTorrents(torrentIds: number[], fields: Record<string, unknown>) {
        const request = {
            method: "torrent-set",
            arguments: { ...fields, ids: torrentIds },
        };

        await this._sendRpc(request);
    }

    async torrentAction(method: TorrentActionMethodsType, torrentIds: number[]) {
        const request = {
            method,
            arguments: { ids: torrentIds },
        };

        await this._sendRpc(request);
    }

    async torrentRemove(torrentIds: number[], deleteLocalData: boolean) {
        const request = {
            method: "torrent-remove",
            arguments: { ids: torrentIds, "delete-local-data": deleteLocalData },
        };

        await this._sendRpc(request);
    }

    /**
     * Moves torrent(s)
     * @param torrentIds id's of torrents to move
     * @param location the new torrent location
     * @param move if true, move from previous location. otherwise, search "location" for files
     */
    async torrentMove(torrentIds: number[], location: string, move: boolean) {
        const request = {
            method: "torrent-set-location",
            arguments: {
                ids: torrentIds,
                location,
                move,
            },
        };

        await this._sendRpc(request);
    }

    async torrentRenamePath(torrentId: number, path: string, name: string) {
        const request = {
            method: "torrent-rename-path",
            arguments: {
                ids: [torrentId],
                path,
                name,
            },
        };

        await this._sendRpc(request);
    }

    async torrentAdd(params: TorrentAddParams) {
        const { url, unwanted, downloadDir, ...other } = params;
        const request = {
            method: "torrent-add",
            arguments: {
                filename: url,
                "download-dir": downloadDir !== "" ? downloadDir : undefined,
                "files-unwanted": unwanted,
                ...other,
            },
        };

        return await this._sendRpc(request);
    }

    async testPort() {
        const request = {
            method: "port-test",
        };

        return await this._sendRpc(request);
    }

    async updateBlocklist() {
        const request = {
            method: "blocklist-update",
        };

        const response = await this._sendRpc(request);

        return response.arguments["blocklist-size"] as number;
    }

    async getBandwidthGroups(): Promise<BandwidthGroup[]> {
        const request = {
            method: "group-get",
        };

        const response = await this._sendRpc(request);

        return response.arguments.group;
    }

    async setBandwidthGroup(group: BandwidthGroup) {
        const request = {
            method: "group-set",
            arguments: group,
        };

        return await this._sendRpc(request);
    }

    async addTrackers(id: number, trackers: string[]) {
        const getRequest = {
            method: "torrent-get",
            arguments: {
                fields: ["trackerList"],
                ids: [id],
            },
        };

        const response = await this._sendRpc(getRequest);
        if (!isApiResponse(response)) {
            throw new ApiError("torrent-get response is not torrents");
        }

        const torrents = response.arguments.torrents;

        if (!Array.isArray(torrents) || torrents.length < 1) {
            throw new ApiError("Torrent not found");
        }

        const currentTrackers = (torrents[0].trackerList as string)
            .split("\n\n")
            .map((tier) => tier.split("\n").filter((s) => s !== ""));

        const newTrackers = trackers.join("\n").split("\n\n").map((tier) => tier.split("\n"));

        const mergedTrackers = mergeTrackerLists(currentTrackers, newTrackers);

        await this.setTorrents([id], {
            trackerList: mergedTrackers.map((tier) => tier.join("\n")).join("\n\n"),
        });
    }

    async lookupIps(ips: string[]): Promise<IpLookupResult[]> {
        if (!TAURI) throw new Error("IP lookup is only available in the desktop app");
        return await invoke<IpLookupResult[]>("lookup_ips", { ips });
    }
}

export const ClientContext = React.createContext(
    new TransmissionClient({ url: "", username: "", password: "" }, false, false));

export function useTransmissionClient() {
    return useContext(ClientContext);
}
