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

import { useForm } from "react-hook-form";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { appVersion } from "./modals/version";
import { ProgressBar } from "./progressbar";
import { bytesToHumanReadableStr } from "trutil";
import classes from "./createtorrentform.module.css";
import "css/custom.css";
import { useColorScheme } from "./theme";
import { RhfCheckbox, RhfText } from "./formfields";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { TextareaField } from "./ui/fields";
import { Label } from "./ui/label";
const { appWindow, invoke, dialogOpen, dialogSave } = await import(/* webpackChunkName: "taurishim" */"taurishim");

interface FormValues {
    path: string,
    name: string,
    pieceLength: number,
    announceList: string[],
    comment: string,
    source: string,
    private: boolean,
    urlList: string[],
    version: string,
}

const byteLabel = (b: number) => {
    if (b >= 1024 * 1024) return `${b / 1024 / 1024} MB`;
    if (b >= 1024) return `${b / 1024} KB`;
    return `${b} B`;
};

interface PassEventData {
    from: string,
    payload: string,
}

interface CreateCheckResult {
    notFound?: boolean,
    error?: string,
    complete?: string,
    inProgress?: {
        hashed: number,
        total: number,
    },
}

interface GetFileStatsResult {
    files: number,
    size: number,
}

interface InfobarState {
    state: "idle" | "calculating" | "sizes" | "error" | "generating" | "done",
    sizes?: GetFileStatsResult,
    error: string,
    hash: string,
}

export default function CreateTorrentForm() {
    const { setColorScheme } = useColorScheme();
    const [defaultTrackers, setDefaultTrackers] = useState<string[]>([]);
    const [pieces, setPieces] = useState({
        done: 0,
        total: 0,
    });
    const [state, setState] = useState<InfobarState>({
        state: "idle",
        error: "",
        hash: "",
    });

    const form = useForm<FormValues>({
        defaultValues: {
            path: "",
            name: "",
            pieceLength: 2 ** 18,
            comment: "",
            source: "",
            private: false,
            announceList: [],
            urlList: [],
            version: appVersion.gitVersion,
        },
    });

    const values = form.watch();

    useEffect(() => {
        void appWindow.once<PassEventData>("pass-from-window", ({ payload: data }) => {
            const { colorScheme, defaultTrackers } = JSON.parse(data.payload);
            setColorScheme(colorScheme);
            setDefaultTrackers(defaultTrackers);
        });
        void invoke("pass_to_window", { to: "main", payload: "ready" });
    }, [setColorScheme]);

    const { setValue } = form;

    const setPathAndCalculate = useCallback((path: string[] | string | null) => {
        if (typeof path !== "string") return;
        setValue("path", path);
        const name = path.split(/[\\/]/).pop() ?? "";
        setValue("name", name);
        setState({
            state: "calculating",
            error: "",
            hash: "",
        });
        invoke<GetFileStatsResult>("get_file_stats", { path }).then((sizes) => {
            if (sizes.files === -1) {
                setState({
                    state: "error",
                    error: "Failed to calculate file sizes",
                    hash: "",
                });
                return;
            }
            setState({
                state: "sizes",
                sizes,
                error: "",
                hash: "",
            });
            // suggest appropriate piece size
            let pieceLength = Math.ceil(Math.log2(sizes.size / 2000));
            if (pieceLength < 18) pieceLength = 18; // at least 256KB
            if (pieceLength > 24) pieceLength = 24; // at most 16MB
            setValue("pieceLength", 2 ** pieceLength);
        }).catch((error) => {
            setState({ state: "error", error, hash: "" });
            clearInterval(timer.current);
        });
    }, [setValue]);

    const onBrowseFile = useCallback(() => {
        dialogOpen({
            title: "Select file",
            defaultPath: values.path === "" ? undefined : values.path,
            multiple: false,
        }).then(setPathAndCalculate).catch(console.error);
    }, [values.path, setPathAndCalculate]);

    const onBrowseDirectory = useCallback(() => {
        dialogOpen({
            title: "Select directory",
            defaultPath: values.path === "" ? undefined : values.path,
            directory: true,
        }).then(setPathAndCalculate).catch(console.error);
    }, [values.path, setPathAndCalculate]);

    const timer = useRef(0);

    const onGenerate = useCallback(() => {
        invoke("create_torrent", { info: form.getValues() }).then(() => {
            clearInterval(timer.current);

            timer.current = window.setInterval(() => {
                invoke<CreateCheckResult>("check_create_torrent").then((result) => {
                    setState({ state: "generating", error: "", hash: "" });
                    if (result.error !== undefined) {
                        setState({ state: "error", error: result.error, hash: "" });
                        clearInterval(timer.current);
                    }
                    if (result.complete !== undefined) {
                        setState({ state: "done", error: "", hash: result.complete });
                        clearInterval(timer.current);
                    }
                    if (result.notFound !== undefined) {
                        setState({ state: "error", error: "Torrent create request not found on backend", hash: "" });
                        clearInterval(timer.current);
                    }
                    if (result.inProgress !== undefined) {
                        setPieces({ done: result.inProgress.hashed, total: result.inProgress.total });
                    }
                }).catch((error) => {
                    setState({ state: "error", error, hash: "" });
                    clearInterval(timer.current);
                });
            }, 500);
        }).catch((error) => {
            setState({ state: "error", error, hash: "" });
        });
    }, [form]);

    const onCancel = useCallback(() => {
        clearInterval(timer.current);
        invoke("cancel_create_torrent").then(() => {
            setState({ state: "idle", error: "", hash: "" });
        }).catch((error) => {
            setState({ state: "error", error, hash: "" });
        });
    }, []);

    const onSave = useCallback(() => {
        dialogSave({
            title: "Save torrent file",
            defaultPath: values.name,
            filters: [{
                name: "Torrent",
                extensions: ["torrent"],
            }],
        }).then((path) => {
            if (path != null) {
                invoke("save_create_torrent", { path }).then(() => {
                    setState({ state: "idle", error: "", hash: "" });
                }).catch((error) => {
                    setState({ state: "error", error, hash: "" });
                });
            }
        }).catch(console.error);
    }, [values.name]);

    const addDefaultTrackers = useCallback(() => {
        let list = form.getValues("announceList");
        list = [...list, ...defaultTrackers];
        form.setValue("announceList", list);
    }, [defaultTrackers, form]);

    const browseDisabled = ["calculating", "generating"].includes(state.state);

    return (
        <div className="flex h-full w-full flex-col gap-2 p-3">
            <div className="flex items-end gap-2">
                <RhfText
                    control={form.control}
                    name="path"
                    label="Select file or directory"
                    wrapperClassName="flex-grow"
                    readOnly
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                />
                <Button onClick={onBrowseFile} disabled={browseDisabled}>File</Button>
                <Button onClick={onBrowseDirectory} disabled={browseDisabled}>Directory</Button>
            </div>
            <RhfText
                control={form.control}
                name="name"
                label="Torrent name"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
            />
            <Label>Piece size</Label>
            <div className="px-4 pt-8 pb-2">
                <Slider
                    step={1}
                    min={14}
                    max={28}
                    label={(v) => byteLabel(2 ** v)}
                    value={Math.log2(values.pieceLength)}
                    onValueChange={([value]) => { form.setValue("pieceLength", 2 ** value); }}
                />
            </div>
            <RhfText
                control={form.control}
                name="comment"
                label="Comment"
            />
            <RhfText
                control={form.control}
                name="source"
                label="Source (leave empty unless required by a private tracker)"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
            />
            <RhfCheckbox
                control={form.control}
                name="private"
                label="Private torrent"
            />
            <div className="flex items-end gap-2">
                <div className="flex-grow text-sm">Tracker list, one per line, empty line between tiers</div>
                <Button onClick={addDefaultTrackers}>Add default list</Button>
            </div>
            <TextareaField
                wrapperClassName={classes.textAreaRoot}
                className={classes.textAreaInput}
                value={values.announceList.join("\n")}
                onChange={(e) => { form.setValue("announceList", e.target.value.split("\n")); }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
            />
            <TextareaField
                wrapperClassName={classes.textAreaRoot}
                className={classes.textAreaInput}
                label="Web seed URLs, one per line"
                value={values.urlList.join("\n")}
                onChange={(e) => { form.setValue("urlList", e.target.value.split("\n")); }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
            />
            <div className="h-6">
                {state.state === "error"
                    && <span className="text-destructive">{state.error}</span>}
                {state.state === "calculating"
                    && <span>Calculating sizes...</span>}
                {state.state === "sizes"
                    && <span>
                        {`${state.sizes?.files ?? 1} file${(state.sizes?.files ?? 1) > 1 ? "s" : ""}, `}
                        {`${bytesToHumanReadableStr(state.sizes?.size ?? 0)}, `}
                        {`${Math.ceil((state.sizes?.size ?? 0) / values.pieceLength)} pieces`}
                    </span>}
                {state.state === "generating"
                    && <ProgressBar
                        now={pieces.done}
                        max={Math.max(pieces.total, 1)}
                        label={`Hashing, done ${pieces.done} of ${pieces.total}`}
                        animate
                    />}
                {state.state === "done"
                    && <span>{`Torrent infohash: ${state.hash}`}</span>}
            </div>
            <div className="flex justify-center gap-2">
                {(["idle", "error", "calculating", "sizes"].includes(state.state))
                    && <Button className="min-w-40" onClick={onGenerate} disabled={state.state === "calculating"}>Generate</Button>}
                {state.state === "generating"
                    && <Button className="min-w-40" onClick={onCancel} variant="destructive">Cancel</Button>}
                {state.state === "done"
                    && <Button className="min-w-40" onClick={onSave} variant="success">Save</Button>}
            </div>
        </div>
    );
}
