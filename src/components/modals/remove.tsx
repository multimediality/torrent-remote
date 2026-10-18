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
import { HkModal, TorrentsNames } from "./common";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useRemoveTorrents } from "queries";
import { notifications } from "notifications";
import { useServerSelectedTorrents } from "rpc/torrent";
import { ConfigContext } from "config";
import { Button } from "components/ui/button";
import { CheckboxField } from "components/ui/fields";
import { Separator } from "components/ui/separator";

export function RemoveModal(props: ModalState) {
    const config = useContext(ConfigContext);
    const serverSelected = useServerSelectedTorrents();
    const [deleteData, setDeleteData] = useState<boolean>(false);

    useEffect(() => {
        if (props.opened) {
            if (config.values.interface.deleteTorrentData !== "remember selection") {
                setDeleteData(config.values.interface.deleteTorrentData === "default on");
            } else {
                setDeleteData(config.values.interface.deleteTorrentDataSelection);
            }
        }
    }, [config, props.opened]);

    const onDeleteDataChanged = useCallback((value: boolean) => {
        setDeleteData(value);
        config.values.interface.deleteTorrentDataSelection = value;
    }, [config]);

    const remove = useRemoveTorrents();

    const onDelete = useCallback(() => {
        remove(
            {
                torrentIds: Array.from(serverSelected),
                deleteData,
            },
            {
                onError: (e) => {
                    console.error("Error removing torrents", e);
                    notifications.show({
                        message: "Error removing torrents",
                        color: "red",
                    });
                },
            },
        );
        props.close();
    }, [remove, serverSelected, deleteData, props]);

    return (
        <HkModal
            opened={props.opened}
            onClose={props.close}
            title="Remove torrents"
            size="lg"
        >
            <Separator className="my-1.5" />
            <div className="mb-2">Are you sure you want to remove following torrents?</div>
            <TorrentsNames />
            <CheckboxField
                label="Delete torrent data"
                checked={deleteData}
                onChange={onDeleteDataChanged}
                className="my-4"
            />
            <Separator className="my-1.5" />
            <div className="flex justify-center gap-2">
                <Button
                    onClick={onDelete}
                    variant="destructive"
                    data-autofocus
                >
                    {deleteData ? "Delete" : "Remove"}
                </Button>
                <Button onClick={props.close} variant="light">Cancel</Button>
            </div>
        </HkModal>
    );
}
