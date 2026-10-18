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

import "css/torrenttable.css";
import React, { memo, useCallback, useContext, useEffect, useMemo } from "react";
import type { Torrent } from "rpc/torrent";
import { useServerTorrentData, useServerRpcVersion, useServerSelectedTorrents } from "rpc/torrent";
import type { TorrentAllFieldsType, TorrentFieldsType } from "rpc/transmission";
import { PriorityColors, PriorityStrings, Status, StatusStrings, TorrentMinimumFields } from "rpc/transmission";
import type { ColumnDef, ColumnVisibilityState } from "@tanstack/react-table";
import { bytesToHumanReadableStr, fileSystemSafeName, modKeyString, pathMapFromServer, secondsToHumanReadableStr, timestampToDateString, torrentProgressbarStyle } from "trutil";
import { ProgressBar } from "../progressbar";
import type { AccessorFn, CellContext } from "@tanstack/table-core";
import type { TableSelectReducer, TrguiTableFeatures } from "./common";
import { EditableNameField, TrguiTable } from "./common";
import { ConfigContext, ServerConfigContext } from "config";
import { StatusIconMap, Error as StatusIconError, Magnetizing, CompletedStopped } from "components/statusicons";
import { useMutateTorrentPath, useSession, useTorrentAction } from "queries";
import { notifications } from "notifications";
import type { ContextMenuInfo } from "components/contextmenu";
import { ContextMenu, MenuDivider, MenuItem, MenuSub, MenuSubContent, MenuSubTrigger, useContextMenu } from "components/contextmenu";
import { Badge } from "components/ui/badge";
import { Kbd } from "components/ui/kbd";
import { Palette, paletteColor } from "palette";
import type { ModalCallbacks } from "components/modals/servermodals";
import type { TorrentActionMethodsType } from "rpc/client";
import * as Icon from "react-bootstrap-icons";
import { useHotkeysContext } from "hotkeys";
const { TAURI, invoke, copyToClipboard } = await import(/* webpackChunkName: "taurishim" */"taurishim");

interface TableFieldProps {
    torrent: Torrent,
    fieldName: TorrentAllFieldsType,
}

interface TableFieldSimple {
    name: TorrentFieldsType,
    label: string,
    component: React.FunctionComponent<TableFieldProps> | React.NamedExoticComponent<TableFieldProps>,
    requiredFields?: TorrentFieldsType[],
}

interface TableFieldWithAccessor extends TableFieldSimple {
    columnId: string,
    accessorFn: AccessorFn<Torrent>,
}

type TableField = TableFieldSimple | TableFieldWithAccessor;

function isTableFieldWithAccessor(f: TableField): f is TableFieldWithAccessor {
    return (f as TableFieldWithAccessor).accessorFn !== undefined;
}

const TimeField = memo(function TimeField(props: TableFieldProps) {
    if (props.fieldName in props.torrent) {
        return <div>{secondsToHumanReadableStr(props.torrent[props.fieldName])}</div>;
    } else {
        return <></>;
    }
}, (prev, next) => {
    const previousValue = prev.torrent[prev.fieldName] as number;
    const nextValue = next.torrent[next.fieldName] as number;
    return Math.abs((previousValue - nextValue) / nextValue) < 1 / 60 / 60;
});

const AllFields: readonly TableField[] = [
    {
        name: "name",
        label: "Name",
        component: NameField,
        requiredFields: ["name", "error", "trackerStats", "leftUntilDone"] as TorrentFieldsType[],
    },
    { name: "totalSize", label: "Size", component: ByteSizeField },
    { name: "sizeWhenDone", label: "Size to download", component: ByteSizeField },
    { name: "leftUntilDone", label: "Size left", component: ByteSizeField },
    { name: "haveValid", label: "Have", component: ByteSizeField },
    { name: "downloadedEver", label: "Downloaded", component: ByteSizeField },
    { name: "uploadedEver", label: "Uploaded", component: ByteSizeField },
    {
        name: "uploadedEver",
        label: "U/D",
        component: UploadRatioField,
        accessorFn: (t) => t.uploadedEver === 0 ? 0 : t.uploadedEver / t.downloadedEver,
        columnId: "simpleRatio",
        requiredFields: ["uploadedEver", "downloadedEver"] as TorrentFieldsType[],
    },
    {
        name: "percentDone",
        label: "Done",
        component: PercentBarField,
        requiredFields: ["percentDone", "rateDownload", "rateUpload"] as TorrentFieldsType[],
    },
    { name: "rateDownload", label: "Down speed", component: ByteRateField },
    { name: "rateUpload", label: "Up speed", component: ByteRateField },
    {
        name: "status",
        label: "Status",
        component: StatusField,
        requiredFields: ["status", "sequential_download"],
    },
    { name: "addedDate", label: "Added on", component: DateField },
    {
        name: "peersSendingToUs",
        label: "Seeds",
        component: SeedsField,
        columnId: "peersSendingToUs",
        accessorFn: (t) => t.peersSendingToUs * 1e+6 + t.cachedSeedsTotal,
    },
    {
        name: "peersGettingFromUs",
        label: "Peers",
        component: PeersField,
        columnId: "peersGettingFromUs",
        accessorFn: (t) => t.peersGettingFromUs * 1e+6 + t.cachedPeersTotal,
    },
    { name: "eta", label: "ETA", component: EtaField },
    { name: "uploadRatio", label: "Ratio", component: FixedDecimalField },
    {
        name: "uploadRatio",
        label: "Ratio progress",
        component: RatioProgressField,
        columnId: "uploadRatioProgress",
        accessorFn: (t) => t.uploadRatio,
    },
    {
        name: "trackerStats",
        label: "Tracker",
        component: TrackerField,
        columnId: "tracker",
        accessorFn: (t) => t.cachedMainTracker,
    },
    {
        name: "trackerStats",
        label: "Tracker status",
        component: TrackerStatusField,
        columnId: "trackerStatus",
        accessorFn: (t) => t.cachedTrackerStatus,
    },
    {
        name: "trackerStats",
        label: "Tracker downloads",
        component: TrackerDownloadsField,
        columnId: "trackerDownloads",
        accessorFn: (t) => t.cachedTrackerDlCount,
    },
    {
        name: "errorString",
        label: "Error",
        component: ErrorField,
        columnId: "error",
        accessorFn: (t) => t.cachedError,
    },
    { name: "doneDate", label: "Completed on", component: DateField },
    { name: "activityDate", label: "Last active", component: DateDiffField },
    { name: "downloadDir", label: "Path", component: StringField },
    { name: "bandwidthPriority", label: "Priority", component: PriorityField },
    { name: "id", label: "ID", component: PositiveNumberField },
    { name: "queuePosition", label: "Queue position", component: PositiveNumberField },
    { name: "secondsSeeding", label: "Seeding time", component: TimeField },
    { name: "isPrivate", label: "Private", component: BoolField },
    { name: "labels", label: "Labels", component: LabelsField },
    { name: "group", label: "Bandwidth group", component: StringField },
    { name: "file-count", label: "File count", component: PositiveNumberField },
    { name: "pieceCount", label: "Piece count", component: PositiveNumberField },
    { name: "metadataPercentComplete", label: "Metadata", component: PercentBarField },
] as const;

function NameField(props: TableFieldProps) {
    let StatusIcon = StatusIconMap[props.torrent.status];
    if (props.torrent.status === Status.downloading && props.torrent.pieceCount === 0) {
        StatusIcon = Magnetizing;
    }
    if (props.torrent.status === Status.stopped
        && props.torrent.sizeWhenDone > 0
        && props.torrent.leftUntilDone === 0) {
        StatusIcon = CompletedStopped;
    }

    if ((props.torrent.error !== undefined && props.torrent.error > 0)
        || props.torrent.cachedError !== "") {
        StatusIcon = StatusIconError;
    }

    const currentName = useMemo(() => props.torrent[props.fieldName], [props.fieldName, props.torrent]);

    const mutation = useMutateTorrentPath();

    const updateTorrentName = useCallback((name: string, onStart: () => void, onEnd: () => void) => {
        onStart();
        const path = fileSystemSafeName(props.torrent.name);
        name = fileSystemSafeName(name);
        if (name === path) {
            onEnd();
        } else {
            mutation.mutate(
                { torrentId: props.torrent.id, path, name },
                {
                    onSettled: onEnd,
                    onError: () => { notifications.show({ color: "red", message: "Failed to rename torrent" }); },
                });
        }
    }, [mutation, props.torrent.id, props.torrent.name]);

    const rpcVersion = useServerRpcVersion();

    return (
        <EditableNameField currentName={currentName} onUpdate={rpcVersion >= 15 ? updateTorrentName : undefined}>
            <div className="icon-container pb-1">
                <StatusIcon />
            </div>
        </EditableNameField>
    );
}

function BoolField(props: TableFieldProps) {
    return (
        <div>
            {props.torrent[props.fieldName] ? "Yes" : "No"}
        </div>
    );
}

function StringField(props: TableFieldProps) {
    return (
        <div>
            {props.torrent[props.fieldName]}
        </div>
    );
}

function PositiveNumberField(props: TableFieldProps) {
    const num = props.torrent[props.fieldName];
    return (
        <div style={{ width: "100%", textAlign: "right" }}>
            {num < 0 ? "" : num}
        </div>
    );
}

function FixedDecimalField(props: TableFieldProps) {
    const num = props.torrent[props.fieldName];
    return (
        <div style={{ width: "100%", textAlign: "right" }}>
            {num < 0 ? "" : Number(num).toFixed(2)}
        </div>
    );
}

function RatioProgressField(props: TableFieldProps) {
    const { data: session } = useSession(false);
    const ratio = props.torrent[props.fieldName];
    const label = ratio < 0 ? "" : Number(ratio).toFixed(2);
    let lim = Number(session?.seedRatioLimit ?? 2);
    if (lim <= 0) lim = 2;
    const now = Math.max(0, Math.min(1, ratio / lim)) * 100;
    return <ProgressBar
        now={now}
        className="white-outline"
        label={label}
        variant={ratio >= lim ? "green" : "default"}
    />;
}

function UploadRatioField(props: TableFieldProps) {
    return (
        <div style={{ width: "100%", textAlign: "right" }}>
            {props.torrent.uploadedEver === 0
                ? "-"
                : props.torrent.downloadedEver === 0
                    ? "∞"
                    : (props.torrent.uploadedEver / props.torrent.downloadedEver).toFixed(2)}
        </div>
    );
}

function SeedsField(props: TableFieldProps) {
    const sending = props.torrent.peersSendingToUs as number;
    const totalSeeds = props.torrent.cachedSeedsTotal;
    return (
        <div style={{ width: "100%", textAlign: "right" }}>
            {totalSeeds < 0 ? `${sending}` : `${sending} / ${totalSeeds}`}
        </div>
    );
}

function PeersField(props: TableFieldProps) {
    const getting = props.torrent.peersGettingFromUs as number;
    const totalPeers = props.torrent.cachedPeersTotal;
    return (
        <div style={{ width: "100%", textAlign: "right" }}>
            {totalPeers < 0 ? `${getting}` : `${getting} / ${totalPeers}`}
        </div>
    );
}

export function EtaField(props: TableFieldProps) {
    const seconds = props.torrent[props.fieldName];
    if (seconds >= 0) return <TimeField {...props} />;
    else if (seconds === -1) return <></>;
    else return <div>∞</div>;
}

export function TrackerField(props: TableFieldProps) {
    return <div>{props.torrent.cachedMainTracker}</div>;
}

function TrackerStatusField(props: TableFieldProps) {
    return <div>{props.torrent.cachedTrackerStatus}</div>;
}

function TrackerDownloadsField(props: TableFieldProps) {
    return <div style={{ width: "100%", textAlign: "right" }}>
        {props.torrent.cachedTrackerDlCount >= 0 ? props.torrent.cachedTrackerDlCount : ""}
    </div>;
}

function ErrorField(props: TableFieldProps) {
    return <div>{props.torrent.cachedError}</div>;
}

function PriorityField(props: TableFieldProps) {
    const priority = props.torrent[props.fieldName];
    const color = PriorityColors.get(priority);
    return <Badge style={{ backgroundColor: color === undefined ? undefined : paletteColor(color) }}>{PriorityStrings.get(priority)}</Badge>;
}

export function LabelsField(props: TableFieldProps) {
    const labels: string[] | undefined = props.torrent.labels;
    return <>
        {labels?.map((label) => <Badge
            key={label}
            className="torrent-label white-outline"
        >
            {label}
        </Badge>)}
    </>;
}

export function StatusField(props: TableFieldProps) {
    let status: string = StatusStrings[props.torrent.status];
    if (props.torrent.status === Status.downloading && props.torrent.pieceCount === 0) status = "Magnetizing";

    const sequential = (props.torrent.status === Status.downloading && props.torrent.sequential_download === true) ? " sequentially" : "";
    return <div>{status + sequential}</div>;
}

export function DateField(props: TableFieldProps) {
    const config = useContext(ConfigContext);
    const date = props.torrent[props.fieldName] > 0
        ? timestampToDateString(props.torrent[props.fieldName], config)
        : "";
    return <div>{date}</div>;
}

export function DateDiffField(props: TableFieldProps) {
    const config = useContext(ConfigContext);
    const date = props.torrent[props.fieldName] > 0
        ? timestampToDateString(props.torrent[props.fieldName], config)
        : "";
    const seconds = Math.floor(Date.now() / 1000) - props.torrent[props.fieldName];
    return <div title={date} style={{ width: "100%", textAlign: "right" }}>
        {seconds < 30
            ? "now"
            : date === "" ? "" : `${secondsToHumanReadableStr(seconds)} ago`}
    </div>;
}

function ByteSizeField(props: TableFieldProps) {
    const field = props.torrent[props.fieldName];
    const stringValue = useMemo(() => {
        return bytesToHumanReadableStr(field);
    }, [field]);

    return <div style={{ width: "100%", textAlign: "right" }}>{stringValue}</div>;
}

function ByteRateField(props: TableFieldProps) {
    const field = props.torrent[props.fieldName];
    const stringValue = useMemo(() => {
        return field > 0 ? `${bytesToHumanReadableStr(field)}/s` : "";
    }, [field]);

    return <div style={{ width: "100%", textAlign: "right" }}>{stringValue}</div>;
}

function PercentBarField(props: TableFieldProps) {
    const config = useContext(ConfigContext);
    const now = props.torrent[props.fieldName] * 100;
    const progressbarStyle = torrentProgressbarStyle(props.torrent, config);

    return <ProgressBar
        now={now}
        className="white-outline"
        {...progressbarStyle}
    />;
}

const Columns = AllFields.map((f): ColumnDef<TrguiTableFeatures, Torrent> => {
    const cell = (props: CellContext<TrguiTableFeatures, Torrent, unknown>) => {
        return <f.component fieldName={f.name} torrent={props.row.original} />;
    };
    if (isTableFieldWithAccessor(f)) {
        return {
            header: f.label,
            accessorFn: f.accessorFn,
            id: f.columnId,
            cell,
        };
    }
    return {
        header: f.label,
        accessorKey: f.name,
        cell,
    };
});

const ColumnRequiredFields = AllFields.map(
    (f) => ({
        id: (f as TableFieldWithAccessor).columnId ?? f.name,
        requires: f.requiredFields ?? [f.name],
    }),
);

function getRequiredFields(visibilityState: ColumnVisibilityState): TorrentFieldsType[] {
    const set = ColumnRequiredFields.reduce(
        (set: Set<TorrentFieldsType>, f) => {
            if (!(f.id in visibilityState) || visibilityState[f.id]) {
                f.requires.forEach((r) => set.add(r));
            }
            return set;
        },
        new Set<TorrentFieldsType>());

    // add bare minimum fields
    TorrentMinimumFields.forEach((f) => set.add(f));
    if (TAURI) set.add("hashString");

    return Array.from(set).sort();
}

export function useInitialTorrentRequiredFields() {
    const config = useContext(ConfigContext);

    return useMemo(
        () => getRequiredFields(config.getTableColumnVisibility("torrents")),
        [config]);
}

export function TorrentTable(props: {
    modals: React.RefObject<ModalCallbacks | null>,
    torrents: Torrent[],
    setCurrentTorrent: (id: string) => void,
    selectedTorrents: Set<number>,
    selectedReducer: TableSelectReducer,
    onColumnVisibilityChange: React.Dispatch<TorrentFieldsType[]>,
    scrollToRow?: { id: string },
}) {
    const serverConfig = useContext(ServerConfigContext);

    const getRowId = useCallback((t: Torrent) => String(t.id), []);

    const { onColumnVisibilityChange } = props;
    const onVisibilityChange = useCallback(
        (visibility: ColumnVisibilityState) => { onColumnVisibilityChange(getRequiredFields(visibility)); },
        [onColumnVisibilityChange],
    );

    const onRowDoubleClick = useCallback((torrent: Torrent, reveal: boolean = false) => {
        if (TAURI) {
            if (torrent.downloadDir === undefined || torrent.downloadDir === "") return;
            let path = torrent.downloadDir as string;
            if (!path.endsWith("/") && !path.endsWith("\\")) {
                path = path + "/";
            }
            path = path + fileSystemSafeName(torrent.name);
            path = pathMapFromServer(path, serverConfig);
            invoke("shell_open", { path, reveal }).catch(() => {
                notifications.show({
                    title: "Error opening path",
                    message: path,
                    color: "red",
                });
            });
        } else {
            props.modals.current?.editTorrent();
        }
    }, [props.modals, serverConfig]);

    const serverSelected = useServerSelectedTorrents();
    const selected = useMemo(() => Array.from(serverSelected).map(String), [serverSelected]);

    const [info, setInfo, handler] = useContextMenu();

    return (
        <div className="h-full w-full" onContextMenu={handler}>
            <MemoizedTorrentContextMenu
                contextMenuInfo={info}
                setContextMenuInfo={setInfo}
                modals={props.modals}
                onRowDoubleClick={onRowDoubleClick}
            />
            <TrguiTable<Torrent> {...{
                tablename: "torrents",
                columns: Columns,
                data: props.torrents,
                getRowId,
                selected,
                selectedReducer: props.selectedReducer,
                setCurrent: props.setCurrentTorrent,
                onVisibilityChange,
                onRowDoubleClick,
                scrollToRow: props.scrollToRow,
            }}
            />
        </div>
    );
}

function TorrentContextMenu(props: {
    contextMenuInfo: ContextMenuInfo,
    setContextMenuInfo: (i: ContextMenuInfo) => void,
    modals: React.RefObject<ModalCallbacks | null>,
    onRowDoubleClick: (t: Torrent, reveal: boolean) => void,
}) {
    const serverData = useServerTorrentData();
    const serverSelected = useServerSelectedTorrents();
    const rpcVersion = useServerRpcVersion();

    const { onRowDoubleClick } = props;
    const onOpen = useCallback((reveal: boolean) => {
        const torrent = serverData.torrents.find((t) => t.id === serverData.current);
        if (torrent === undefined) return;
        onRowDoubleClick(torrent, reveal);
    }, [onRowDoubleClick, serverData]);

    const mutate = useTorrentAction();

    const torrentAction = useCallback((method: TorrentActionMethodsType, successMessage: string) => {
        mutate(
            {
                method,
                torrentIds: Array.from(serverSelected),
            },
            {
                onSuccess: () => {
                    notifications.show({
                        message: successMessage,
                        color: "green",
                    });
                },
            },
        );
    }, [mutate, serverSelected]);

    const copyMagnetLinks = useCallback(() => {
        if (serverSelected.size === 0) return;

        const links = serverData.torrents
            .filter((t) => serverSelected.has(t.id))
            .map((t) => t.magnetLink);

        copyToClipboard(links.join("\n"));

        notifications.show({
            message: `Magnet ${serverSelected.size > 1 ? "links" : "link"} copied to clipboard`,
            color: "green",
        });
    }, [serverData.torrents, serverSelected]);

    const hk = useHotkeysContext();

    useEffect(() => {
        hk.handlers.copyToClipboard = copyMagnetLinks;
        return () => {
            hk.handlers.copyToClipboard = () => { };
        };
    }, [copyMagnetLinks, hk]);

    return (
        <ContextMenu
            contextMenuInfo={props.contextMenuInfo}
            setContextMenuInfo={props.setContextMenuInfo}
            className="min-w-[14rem]"
        >
            <div>
                {TAURI && <>
                    <MenuItem
                        onClick={() => { onOpen(false); }}
                        leftSection={<Icon.BoxArrowUpRight size="1.1rem" />}
                        disabled={serverData.current === undefined}
                    >
                        <span className="font-bold">Open</span>
                    </MenuItem>
                    <MenuItem
                        onClick={() => { onOpen(true); }}
                        leftSection={<Icon.Folder2Open size="1.1rem" />}
                        disabled={serverData.current === undefined}
                    >
                        Open folder
                    </MenuItem>
                    <MenuDivider />
                </>}
                <MenuItem
                    onClick={() => { torrentAction("torrent-start-now", "Torrents started"); }}
                    leftSection={<Icon.LightningFill size="1.1rem" />}
                    disabled={serverSelected.size === 0}
                >
                    Force start
                </MenuItem>
                <MenuItem
                    onClick={() => { torrentAction("torrent-start", "Torrents started"); }}
                    leftSection={<Icon.PlayCircleFill size="1.1rem" />}
                    rightSection={<Kbd>F3</Kbd>}
                    disabled={serverSelected.size === 0}
                >
                    Start
                </MenuItem>
                <MenuItem
                    onClick={() => { torrentAction("torrent-stop", "Torrents stopped"); }}
                    leftSection={<Icon.PauseCircleFill size="1.1rem" />}
                    rightSection={<Kbd>F4</Kbd>}
                    disabled={serverSelected.size === 0}
                >
                    Pause
                </MenuItem>
                <MenuItem
                    onClick={() => { torrentAction("torrent-verify", "Torrents verification started"); }}
                    leftSection={<Icon.CheckAll size="1.1rem" />}
                    disabled={serverSelected.size === 0}
                >
                    Verify
                </MenuItem>
                <MenuItem
                    onClick={() => { torrentAction("torrent-reannounce", "Torrents are reannounced"); }}
                    leftSection={<Icon.Wifi size="1.1rem" />}
                    disabled={serverSelected.size === 0}
                >
                    Reannounce
                </MenuItem>
                <MenuItem
                    onClick={copyMagnetLinks}
                    leftSection={<Icon.MagnetFill size="1.1rem" />}
                    disabled={serverSelected.size === 0}
                    rightSection={<Kbd>{`${modKeyString()} C`}</Kbd>}
                >
                    Copy magnet
                    {" "}
                    {serverSelected.size > 1 ? "links" : "link"}
                </MenuItem>
                <MenuSub>
                    <MenuSubTrigger
                        leftSection={<Icon.ThreeDots size="1.1rem" />}
                        disabled={serverSelected.size === 0}
                    >
                        Queue
                    </MenuSubTrigger>

                    <MenuSubContent>
                        <MenuItem
                            onClick={() => { torrentAction("queue-move-top", "Torrents queue updated"); }}
                            leftSection={<Icon.ChevronDoubleUp size="1.1rem" />}
                        >
                            Move to top
                        </MenuItem>
                        <MenuItem
                            onClick={() => { torrentAction("queue-move-up", "Torrents queue updated"); }}
                            leftSection={<Icon.ChevronUp size="1.1rem" />}
                        >
                            Move up
                        </MenuItem>
                        <MenuItem
                            onClick={() => { torrentAction("queue-move-down", "Torrents queue updated"); }}
                            leftSection={<Icon.ChevronDown size="1.1rem" />}
                        >
                            Move down
                        </MenuItem>
                        <MenuItem
                            onClick={() => { torrentAction("queue-move-bottom", "Torrents queue updated"); }}
                            leftSection={<Icon.ChevronDoubleDown size="1.1rem" />}
                        >
                            Move to bottom
                        </MenuItem>
                    </MenuSubContent>
                </MenuSub>

                <MenuItem
                    onClick={() => props.modals.current?.move()}
                    leftSection={<Icon.FolderFill size="1.1rem" />}
                    disabled={serverSelected.size === 0}
                    rightSection={<Kbd>F6</Kbd>}
                >
                    Move...
                </MenuItem>
                <MenuItem
                    onClick={() => props.modals.current?.setLabels()}
                    leftSection={<Icon.TagsFill size="1.1rem" />}
                    disabled={serverSelected.size === 0}
                    rightSection={<Kbd>F7</Kbd>}
                >
                    Set labels...
                </MenuItem>
                <MenuItem
                    onClick={() => props.modals.current?.remove()}
                    leftSection={<Icon.XCircleFill size="1.1rem" color={Palette.red[6]} />}
                    disabled={serverSelected.size === 0}
                    rightSection={<Kbd>del</Kbd>}
                >
                    Remove...
                </MenuItem>
                <MenuDivider />
                <MenuItem
                    onClick={() => props.modals.current?.editTrackers()}
                    leftSection={<Icon.Wifi size="1.1rem" />}
                    disabled={serverSelected.size === 0 || (serverSelected.size > 1 && rpcVersion < 17)}
                >
                    Trackers...
                </MenuItem>
                <MenuItem
                    onClick={() => props.modals.current?.editTorrent()}
                    leftSection={<Icon.GearFill size="1.1rem" />}
                    disabled={serverSelected.size === 0}
                >
                    Properties...
                </MenuItem>
            </div>
        </ContextMenu>
    );
}

const MemoizedTorrentContextMenu = memo(TorrentContextMenu);
