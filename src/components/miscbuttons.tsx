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

import * as Icon from "react-bootstrap-icons";
import FontSizeIcon from "svg/icons/fontsize.svg";
import React from "react";
import { VersionModal } from "components/modals/version";
import { useDisclosure, useHotkeys } from "hooks";
import { modKeyString } from "trutil";
import { useFontSize } from "themehooks";
import { useColorScheme } from "components/theme";
import { Button } from "components/ui/button";

export type IconButtonSize = "md" | "lg";

function buttonSize(size?: IconButtonSize) {
    return size === "lg" ? "icon-lg" : "icon-sm";
}

export function ColorSchemeToggle(props: { sz?: string, btn?: IconButtonSize }) {
    const { computedColorScheme, toggleColorScheme } = useColorScheme();
    const dark = computedColorScheme === "dark";

    useHotkeys([
        ["mod + U", () => { toggleColorScheme(); }],
    ]);

    return (
        <Button
            variant="outline"
            size={buttonSize(props.btn)}
            onClick={() => { toggleColorScheme(); }}
            title={`Toggle color scheme (${modKeyString()} + U)`}
            className="my-auto"
        >
            {dark
                ? <Icon.Sun size={props.sz} color="yellow" />
                : <Icon.MoonStars size={props.sz} color="blue" />}
        </Button>
    );
}

export function ShowVersion(props: { sz?: string, btn?: IconButtonSize }) {
    const [showVersionModal, { open: openVersionModal, close: closeVersionModal }] = useDisclosure(false);

    return (
        <>
            <VersionModal opened={showVersionModal} close={closeVersionModal} />
            <Button
                variant="ghost"
                size={buttonSize(props.btn)}
                onClick={openVersionModal}
                title="Show version information"
                className="my-auto ml-auto"
            >
                <Icon.InfoCircle size={props.sz} />
            </Button>
        </>
    );
}

export function FontSizeToggle() {
    const { toggle } = useFontSize();

    useHotkeys([
        ["mod + =", () => { toggle(); }],
    ]);

    return (
        <Button
            variant="outline"
            size="icon-lg"
            onClick={() => { toggle(); }}
            title={`Toggle font size (${modKeyString()} + =)`}
            className="my-auto"
        >
            <FontSizeIcon width="1.1rem" height="1.1rem" fill="currentColor" />
        </Button>
    );
}
