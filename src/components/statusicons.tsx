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

import React from "react";
import * as Icon from "react-bootstrap-icons";
import { Status } from "rpc/transmission";
import { Palette } from "palette";
import ActiveIcon from "svg/icons/active.svg";
import PausedIcon from "svg/icons/paused.svg";

export function All() {
    return <Icon.Asterisk size="1rem" stroke={Palette.orange[3]} fill={Palette.yellow[3]} />;
}

export function Downloading() {
    return <Icon.CaretDownSquareFill size="1rem" fill={Palette.indigo[4]} />;
}

export function Completed() {
    return <Icon.CaretUpSquareFill size="1rem" fill={Palette.green[7]} />;
}

export function Active() {
    return <ActiveIcon width="1rem" height="1rem" fill={Palette.red[6]} />;
}

export function Inactive() {
    return <Icon.Snow size="1rem" fill={Palette.cyan[4]} />;
}

export function Running() {
    return <Icon.CaretRightSquareFill size="1rem" fill={Palette.lime[7]} />;
}

export function Stopped() {
    return <PausedIcon width="1rem" height="1rem" fill={Palette.yellow[6]} />;
}

export function Error() {
    return <Icon.XSquareFill size="1rem" fill={Palette.red[6]} />;
}

export function Waiting() {
    return <Icon.ClockFill size="1rem" fill={Palette.cyan[4]} />;
}

export function Label() {
    return <Icon.TagsFill size="1rem" stroke={Palette.indigo[9]} fill={Palette.blue[4]} />;
}

export function Tracker() {
    return <Icon.Wifi size="1rem" stroke={Palette.indigo[9]} fill={Palette.blue[4]} />;
}

export function Magnetizing() {
    return <Icon.MagnetFill size="1rem" fill={Palette.indigo[4]} />;
}

export function CompletedStopped() {
    return <Icon.CheckSquareFill size="1rem" fill={Palette.green[9]} />;
}

export const StatusIconMap: Record<number, React.FC> = {
    [Status.stopped]: Stopped,
    [Status.queuedToVerify]: Waiting,
    [Status.queuedToDownload]: Waiting,
    [Status.queuedToSeed]: Waiting,
    [Status.verifying]: Waiting,
    [Status.downloading]: Downloading,
    [Status.seeding]: Completed,
} as const;
