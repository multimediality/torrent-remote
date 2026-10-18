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

import React, { useCallback, useEffect, useMemo } from "react";
import type { ModalState } from "./common";
import { SaveCancelModal, TorrentsNames } from "./common";
import { useForm } from "react-hook-form";
import { useMutateTorrent, useTorrentDetails } from "queries";
import { notifications } from "notifications";
import { useServerRpcVersion, useServerSelectedTorrents, useServerTorrentData } from "rpc/torrent";
import { RhfCheckbox, RhfNumber } from "components/formfields";
import { CheckboxField } from "components/ui/fields";
import { LoadingOverlay } from "components/ui/loader";

interface FormValues {
    downloadLimited?: boolean,
    downloadLimit: number,
    uploadLimited?: boolean,
    uploadLimit: number,
    peerLimit: number,
    seedRatioMode: number,
    seedRatioLimit: number,
    seedIdleMode: number,
    seedIdleLimit: number,
    honorsSessionLimits: boolean,
    sequentialDownload: boolean,
}

export function EditTorrent(props: ModalState) {
    const rpcVersion = useServerRpcVersion();
    const serverData = useServerTorrentData();
    const selected = useServerSelectedTorrents();

    const torrentId = useMemo(() => {
        if (serverData.current === undefined || !selected.has(serverData.current)) {
            return [...selected][0];
        }
        return serverData.current;
    }, [selected, serverData]);

    const { data: torrent, isPending } = useTorrentDetails(
        torrentId ?? -1, torrentId !== undefined && props.opened, false, true);

    const form = useForm<FormValues>();
    const values = form.watch();

    const { reset } = form;
    useEffect(() => {
        if (torrent === undefined) return;
        reset({
            downloadLimited: torrent.downloadLimited,
            downloadLimit: torrent.downloadLimit,
            uploadLimited: torrent.uploadLimited,
            uploadLimit: torrent.uploadLimit,
            peerLimit: torrent["peer-limit"],
            seedRatioMode: torrent.seedRatioMode,
            seedRatioLimit: torrent.seedRatioLimit,
            seedIdleMode: torrent.seedIdleMode,
            seedIdleLimit: torrent.seedIdleLimit,
            honorsSessionLimits: torrent.honorsSessionLimits,
            sequentialDownload: torrent.sequential_download,
        });
    }, [reset, torrent]);

    const { mutate } = useMutateTorrent();

    const onSave = useCallback(() => {
        if (torrentId === undefined || torrent === undefined) return;

        const values = form.getValues();
        mutate(
            {
                torrentIds: [...selected],
                fields: {
                    ...values,
                    "peer-limit": values.peerLimit,
                    sequential_download: values.sequentialDownload,
                },
            },
            {
                onError: (e) => {
                    console.error("Failed to update torrent properties", e);
                    notifications.show({
                        message: "Error updating torrent",
                        color: "red",
                    });
                },
            },
        );
        props.close();
    }, [torrentId, torrent, mutate, selected, form, props]);

    return <>
        {props.opened
            && <SaveCancelModal
                opened={props.opened}
                size="lg"
                onClose={props.close}
                onSave={onSave}
                title="Edit torrent properties"
                bodyClassName="relative min-h-[25rem]"
            >
                <LoadingOverlay visible={isPending} />
                <div className="grid grid-cols-12 items-center gap-2">
                    <div className="col-span-12">
                        <TorrentsNames />
                    </div>
                    <div className="col-span-8">
                        <RhfCheckbox
                            control={form.control}
                            name="honorsSessionLimits"
                            className="my-1.5"
                            label="Honor session upload limit"
                        />
                    </div>
                    <div className="col-span-4">
                        {rpcVersion >= 18
                            && <RhfCheckbox
                                control={form.control}
                                name="sequentialDownload"
                                className="my-1.5"
                                label="Sequential download"
                            />}
                    </div>
                    <div className="col-span-8">
                        <RhfCheckbox control={form.control} name="downloadLimited" label="Maximum download speed" />
                    </div>
                    <div className="col-span-2">
                        <RhfNumber
                            control={form.control}
                            name="downloadLimit"
                            min={0}
                            disabled={values.downloadLimited !== true}
                        />
                    </div>
                    <div className="col-span-2">
                        KB/s
                    </div>
                    <div className="col-span-8">
                        <RhfCheckbox control={form.control} name="uploadLimited" label="Maximum upload speed" />
                    </div>
                    <div className="col-span-2">
                        <RhfNumber
                            control={form.control}
                            name="uploadLimit"
                            min={0}
                            disabled={values.uploadLimited !== true}
                        />
                    </div>
                    <div className="col-span-2">
                        KB/s
                    </div>
                    <div className="col-span-8">
                        Peer limit
                    </div>
                    <div className="col-span-2">
                        <RhfNumber control={form.control} name="peerLimit" min={0} />
                    </div>
                    <div className="col-span-2" />
                    <div className="col-span-8">
                        <CheckboxField
                            label="Seed ratio"
                            checked={values.seedRatioMode < 2}
                            indeterminate={values.seedRatioMode === 0}
                            onChange={() => { form.setValue("seedRatioMode", (values.seedRatioMode + 1) % 3); }}
                        />
                    </div>
                    <div className="col-span-2">
                        <RhfNumber
                            control={form.control}
                            name="seedRatioLimit"
                            min={0}
                            step={0.05}
                            decimalScale={2}
                            fixedDecimalScale
                            disabled={values.seedRatioMode !== 1}
                        />
                    </div>
                    <div className="col-span-2" />
                    <div className="col-span-8">
                        <CheckboxField
                            label="Stop seeding when inactive for"
                            checked={values.seedIdleMode < 2}
                            indeterminate={values.seedIdleMode === 0}
                            onChange={() => { form.setValue("seedIdleMode", (values.seedIdleMode + 1) % 3); }}
                        />
                    </div>
                    <div className="col-span-2">
                        <RhfNumber
                            control={form.control}
                            name="seedIdleLimit"
                            min={0}
                            disabled={values.seedIdleMode !== 1}
                        />
                    </div>
                    <div className="col-span-2">
                        minutes
                    </div>
                </div>
            </SaveCancelModal>}
    </>;
}
