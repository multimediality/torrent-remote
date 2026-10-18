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

import debounce from "lodash-es/debounce";
import classes from "./toolbar.module.css";
import clsx from "clsx";
import React, { forwardRef, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Icon from "react-bootstrap-icons";
import PriorityIcon from "svg/icons/priority.svg";
import type { PriorityNumberType } from "rpc/transmission";
import { BandwidthPriority } from "rpc/transmission";
import { useTorrentAction, useMutateSession, useMutateTorrent } from "queries";
import { notifications } from "notifications";
import type { TorrentActionMethodsType } from "rpc/client";
import type { ModalCallbacks } from "./modals/servermodals";
import type { HotkeyHandlers } from "hotkeys";
import { useHotkeysContext } from "hotkeys";
import { useHotkeys } from "hooks";
import { modKeyString } from "trutil";
import { useServerSelectedTorrents } from "rpc/torrent";
import { ConfigContext } from "config";
import { Palette } from "palette";
import { useComputedColorScheme } from "./theme";
import { Button } from "./ui/button";
import { Kbd } from "./ui/kbd";
import { TextInput } from "./ui/fields";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
    DropdownMenuShortcut, DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const { saveJsonFile, loadJsonFile } = await import(/* webpackChunkName: "taurishim" */"taurishim");

interface ToolbarButtonProps extends React.PropsWithChildren<React.ComponentPropsWithRef<"button">> {
    depressed?: boolean,
}

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(function ToolbarButton(
    { children, depressed, className, ...other }: ToolbarButtonProps, ref,
) {
    return (
        <Button
            variant="ghost"
            size="sm"
            {...other}
            ref={ref}
            className={clsx(classes.toolbarButton, { [classes.toolbarButtonDepressed]: depressed }, className)}
        >
            {children}
        </Button>
    );
});

interface ToolbarProps {
    setSearchTerms: (terms: string[]) => void,
    modals: React.RefObject<ModalCallbacks | null>,
    altSpeedMode: boolean,
    extra?: React.ReactNode,
    toggleFiltersPanel: () => void,
    toggleDetailsPanel: () => void,
    toggleMainSplit: () => void,
    toggleTabStrip: () => void,
}

function useButtonHandlers(
    props: ToolbarProps,
    altSpeedMode: boolean | undefined,
    setAltSpeedMode: React.Dispatch<boolean | undefined>,
) {
    const serverSelected = useServerSelectedTorrents();
    const actionMutate = useTorrentAction();
    const { mutate: mutateTorrent } = useMutateTorrent();

    const handlers = useMemo(() => {
        const checkSelected = (action?: () => void) => {
            return () => {
                if (serverSelected.size > 0) action?.();
            };
        };
        const action = (method: TorrentActionMethodsType) => () => {
            actionMutate(
                {
                    method,
                    torrentIds: Array.from(serverSelected),
                },
                {
                    onError: (e) => {
                        console.error("Error running torrent update method", method, e);
                        notifications.show({
                            message: "Error updating torrent",
                            color: "red",
                        });
                    },
                },
            );
        };
        const priority = (bandwidthPriority: PriorityNumberType) => () => {
            mutateTorrent(
                {
                    torrentIds: Array.from(serverSelected),
                    fields: { bandwidthPriority },
                },
                {
                    onSuccess: () => {
                        notifications.show({
                            message: "Priority is updated",
                            color: "green",
                        });
                    },
                    onError: (error) => {
                        notifications.show({
                            title: "Failed to update priority",
                            message: String(error),
                            color: "red",
                        });
                    },
                },
            );
        };

        return {
            start: checkSelected(action("torrent-start")),
            pause: checkSelected(action("torrent-stop")),
            remove: checkSelected(props.modals.current?.remove),
            queueDown: checkSelected(action("queue-move-down")),
            queueUp: checkSelected(action("queue-move-up")),
            move: checkSelected(props.modals.current?.move),
            setLabels: checkSelected(props.modals.current?.setLabels),
            setPriorityHigh: checkSelected(priority(BandwidthPriority.high)),
            setPriorityNormal: checkSelected(priority(BandwidthPriority.normal)),
            setPriorityLow: checkSelected(priority(BandwidthPriority.low)),
            daemonSettings: () => { props.modals.current?.daemonSettings(); },
        };
    }, [actionMutate, mutateTorrent, props.modals, serverSelected]);

    const sessionMutation = useMutateSession();

    const toggleAltSpeedMode = useCallback(() => {
        sessionMutation.mutate({ "alt-speed-enabled": altSpeedMode !== true }, {
            onError: (_, session) => {
                setAltSpeedMode(session["alt-speed-enabled"] !== true);
            },
        });
        setAltSpeedMode(altSpeedMode !== true);
    }, [altSpeedMode, sessionMutation, setAltSpeedMode]);

    const hk = useHotkeysContext();

    useEffect(() => {
        hk.handlers = { ...hk.handlers, ...handlers };
        return () => {
            Object.keys(handlers).forEach((k) => {
                hk.handlers[k as keyof HotkeyHandlers] = () => { };
            });
        };
    }, [hk, handlers]);

    return {
        ...handlers,
        toggleAltSpeedMode,
    };
}

function Toolbar(props: ToolbarProps) {
    const config = useContext(ConfigContext);

    const debouncedSetSearchTerms = useMemo(
        () => debounce(props.setSearchTerms, 500, { trailing: true, leading: false }),
        [props.setSearchTerms]);

    const [altSpeedMode, setAltSpeedMode] = useState<boolean>();

    useEffect(() => {
        if (props.altSpeedMode !== undefined) setAltSpeedMode(props.altSpeedMode);
    }, [props.altSpeedMode]);

    const onSearchInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
        debouncedSetSearchTerms(
            e.currentTarget.value
                .split(" ")
                .map((s) => s.trim().toLowerCase())
                .filter((s) => s !== ""));
    }, [debouncedSetSearchTerms]);

    const [searchPlaceholder, setSearchPlaceholder] = useState<string>(`search (${modKeyString()} + f)`);

    const searchRef = useRef<HTMLInputElement>(null);

    const onSearchClear = useCallback(() => {
        if (searchRef.current != null) searchRef.current.value = "";
        props.setSearchTerms([]);
    }, [props]);

    const handlers = useButtonHandlers(props, altSpeedMode, setAltSpeedMode);

    const hk = useHotkeysContext();

    useEffect(() => {
        hk.handlers.focusSearch = () => searchRef.current?.focus();
        hk.handlers.addTorrent = () => props.modals.current?.addTorrent();
        hk.handlers.addMagnet = () => props.modals.current?.addMagnet();
        return () => {
            hk.handlers.focusSearch = () => { };
        };
    }, [hk, props.modals]);

    useHotkeys([
        ["mod + P", props.toggleMainSplit],
        ["mod + Y", props.toggleFiltersPanel],
        ["mod + I", props.toggleDetailsPanel],
        ["mod + [", props.toggleTabStrip],
    ]);

    const onSettingsExport = useCallback(() => {
        void saveJsonFile(config.getExportedInterfaceSettings(), "torrent-remote-interface.json");
    }, [config]);

    const onSettingsImport = useCallback(async () => {
        try {
            const settings = await loadJsonFile();
            await config.tryMergeInterfaceSettings(JSON.parse(settings));
            window.location.reload();
        } catch (e) {
            let msg = "";
            if (typeof e === "string") {
                msg = e;
            } else if (e instanceof Error) {
                msg = e.message;
            }
            notifications.show({
                title: "Error importing settings",
                message: msg,
                color: "red",
            });
        }
    }, [config]);

    const colorScheme = useComputedColorScheme();

    return (
        <div className="flex w-full items-stretch">
            <div className={classes.toolbarGroup}>
                <ToolbarButton
                    title={`Add torrent file (${modKeyString()} O)`}
                    onClick={() => { props.modals.current?.addTorrent(); }}
                >
                    <Icon.FileArrowDownFill size="1.5rem" color={Palette.green[8]} />
                </ToolbarButton>
                <ToolbarButton
                    title={`Add magnet link (${modKeyString()} M)`}
                    onClick={() => { props.modals.current?.addMagnet(); }}
                >
                    <Icon.MagnetFill size="1.5rem" color={Palette.green[8]} />
                </ToolbarButton>
            </div>

            <div className={classes.toolbarGroup}>
                <ToolbarButton
                    title="Start torrent (F3)"
                    onClick={handlers.start}
                >
                    <Icon.PlayCircleFill size="1.5rem" color={Palette.blue[6]} />
                </ToolbarButton>
                <ToolbarButton
                    title="Pause torrent (F4)"
                    onClick={handlers.pause}
                >
                    <Icon.PauseCircleFill size="1.5rem" color={Palette.blue[6]} />
                </ToolbarButton>
                <ToolbarButton
                    title="Remove torrent (del)"
                    onClick={handlers.remove}
                >
                    <Icon.XCircleFill size="1.5rem" color={Palette.red[6]} />
                </ToolbarButton>
            </div>

            <div className={classes.toolbarGroup}>
                <ToolbarButton
                    title="Move up in queue"
                    onClick={handlers.queueUp}
                >
                    <Icon.ArrowUpCircleFill size="1.5rem" color={Palette.green[8]} />
                </ToolbarButton>
                <ToolbarButton
                    title="Move down in queue"
                    onClick={handlers.queueDown}
                >
                    <Icon.ArrowDownCircleFill size="1.5rem" color={Palette.green[8]} />
                </ToolbarButton>
            </div>

            <div className={classes.toolbarGroup}>
                <ToolbarButton
                    title="Move torrent (F6)"
                    onClick={handlers.move}
                >
                    <Icon.FolderFill size="1.5rem" color={Palette.yellow[4]} stroke={Palette.yellow[5]} />
                </ToolbarButton>
                <ToolbarButton
                    title="Set labels (F7)"
                    onClick={handlers.setLabels}
                >
                    <Icon.TagsFill size="1.5rem" color={Palette.blue[6]} />
                </ToolbarButton>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <ToolbarButton title="Set priority">
                            <PriorityIcon
                                width="1.5rem"
                                height="1.5rem"
                                fill={colorScheme === "light" ? Palette.yellow[6] : Palette.yellow[4]}
                            />
                        </ToolbarButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="w-40" align="start">
                        <DropdownMenuItem onClick={handlers.setPriorityHigh}>
                            <Icon.CircleFill color={Palette.orange[7]} />
                            High
                            <DropdownMenuShortcut><Kbd>{`${modKeyString()} H`}</Kbd></DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handlers.setPriorityNormal}>
                            <Icon.CircleFill color={Palette.teal[9]} />
                            Normal
                            <DropdownMenuShortcut><Kbd>{`${modKeyString()} N`}</Kbd></DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handlers.setPriorityLow}>
                            <Icon.CircleFill color={Palette.yellow[6]} />
                            Low
                            <DropdownMenuShortcut><Kbd>{`${modKeyString()} L`}</Kbd></DropdownMenuShortcut>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <ToolbarButton
                title={`Turn alternative bandwidth mode ${altSpeedMode === true ? "off" : "on"} (F8)`}
                onClick={handlers.toggleAltSpeedMode}
                depressed={altSpeedMode}
            >
                <Icon.Speedometer2 size="1.5rem" />
            </ToolbarButton>

            <TextInput
                ref={searchRef}
                wrapperClassName="mx-1.5 min-w-0 flex-grow justify-center"
                inputClassName="h-full"
                className="h-full"
                leftSection={<Icon.Search size="1rem" />}
                placeholder={searchPlaceholder}
                rightSection={<Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={onSearchClear}
                    title="Clear"
                >
                    <Icon.XLg size="1rem" color={Palette.red[6]} />
                </Button>}
                onInput={onSearchInput}
                onFocus={() => setSearchPlaceholder("search by name or path:somepath or label:somelabel")}
                onBlur={() => setSearchPlaceholder(`search (${modKeyString()} + f)`)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
            />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <ToolbarButton title="Layout">
                        <Icon.Grid1x2Fill size="1.5rem" style={{ transform: "rotate(-90deg)" }} />
                    </ToolbarButton>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-48" align="end">
                    <DropdownMenuItem onClick={props.toggleMainSplit}>
                        Change layout
                        <DropdownMenuShortcut><Kbd>{`${modKeyString()} P`}</Kbd></DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={props.toggleFiltersPanel}>
                        Toggle filters
                        <DropdownMenuShortcut><Kbd>{`${modKeyString()} Y`}</Kbd></DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={props.toggleDetailsPanel}>
                        Toggle details
                        <DropdownMenuShortcut><Kbd>{`${modKeyString()} I`}</Kbd></DropdownMenuShortcut>
                    </DropdownMenuItem>
                    {props.extra !== undefined
                        && <DropdownMenuItem onClick={props.toggleTabStrip}>
                            Toggle tab strip
                            <DropdownMenuShortcut><Kbd>{`${modKeyString()} [`}</Kbd></DropdownMenuShortcut>
                        </DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Interface settings</DropdownMenuLabel>
                    <DropdownMenuItem onClick={onSettingsExport}>
                        Export
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { void onSettingsImport(); }}>
                        Import
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ToolbarButton
                title="Polling intervals and server settings (F9)"
                onClick={handlers.daemonSettings}
            >
                <Icon.Tools size="1.5rem" />
            </ToolbarButton>

            {props.extra}
        </div>
    );
}

export const MemoizedToolbar = memo(Toolbar) as typeof Toolbar;
