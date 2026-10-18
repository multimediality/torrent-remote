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

import React, { useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
    DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "components/ui/dropdown-menu";
import { cn } from "lib/utils";
import classes from "./contextmenu.module.css";

export interface ContextMenuInfo {
    x: number,
    y: number,
    opened: boolean,
}

export function useContextMenu(): [ContextMenuInfo, React.Dispatch<ContextMenuInfo>, React.MouseEventHandler<HTMLElement>] {
    const [info, setInfo] = useState<ContextMenuInfo>({ x: 0, y: 0, opened: false });

    const contextMenuHandler = useCallback<React.MouseEventHandler<HTMLElement>>((e) => {
        e.preventDefault();
        e.stopPropagation();
        setInfo({ x: e.clientX, y: e.clientY, opened: true });
    }, [setInfo]);

    return [info, setInfo, contextMenuHandler];
}

const KeepOpenContext = React.createContext(false);

export interface ContextMenuProps extends React.PropsWithChildren {
    contextMenuInfo: ContextMenuInfo,
    setContextMenuInfo: (i: ContextMenuInfo) => void,
    /** keep the menu open after an item was activated (toggle lists) */
    closeOnItemClick?: boolean,
    /** limit height to the viewport and scroll */
    autosize?: boolean,
    className?: string,
}

/**
 * Dropdown menu anchored to the pointer position recorded by useContextMenu.
 * A zero-size trigger is placed at the click point so the usual collision
 * handling keeps the menu inside the window.
 */
export function ContextMenu({
    contextMenuInfo,
    setContextMenuInfo,
    closeOnItemClick = true,
    autosize,
    className,
    children,
}: ContextMenuProps) {
    const onOpenChange = useCallback((open: boolean) => {
        if (!open) setContextMenuInfo({ ...contextMenuInfo, opened: false });
    }, [contextMenuInfo, setContextMenuInfo]);

    return (
        <DropdownMenu open={contextMenuInfo.opened} onOpenChange={onOpenChange} modal={false}>
            {createPortal(
                <DropdownMenuTrigger asChild>
                    <span
                        aria-hidden
                        className={classes.contextMenuAnchor}
                        style={{ left: contextMenuInfo.x, top: contextMenuInfo.y }}
                    />
                </DropdownMenuTrigger>,
                document.body,
            )}
            <DropdownMenuContent
                side="right"
                align="start"
                sideOffset={0}
                collisionPadding={4}
                className={cn(autosize === true && "max-h-[calc(100vh-0.5rem)]", className)}
                onCloseAutoFocus={(e) => { e.preventDefault(); }}
            >
                <KeepOpenContext.Provider value={!closeOnItemClick}>
                    {children}
                </KeepOpenContext.Provider>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export interface MenuItemProps extends React.ComponentProps<typeof DropdownMenuItem> {
    leftSection?: React.ReactNode,
    rightSection?: React.ReactNode,
}

/** Menu item with Mantine-style left/right sections; honours the ContextMenu closeOnItemClick setting. */
export function MenuItem({ leftSection, rightSection, children, onSelect, className, ...props }: MenuItemProps) {
    const keepOpen = useContext(KeepOpenContext);

    return (
        <DropdownMenuItem
            {...props}
            className={cn("gap-2.5", className)}
            onSelect={(e) => {
                if (keepOpen) e.preventDefault();
                onSelect?.(e);
            }}
        >
            {leftSection !== undefined
                && <span className="flex w-[1.1rem] shrink-0 items-center justify-center">{leftSection}</span>}
            <span className="min-w-0 flex-grow">{children}</span>
            {rightSection !== undefined
                && <span className="ml-auto flex shrink-0 items-center pl-3">{rightSection}</span>}
        </DropdownMenuItem>
    );
}

export interface MenuSubItemProps extends React.ComponentProps<typeof DropdownMenuSubTrigger> {
    leftSection?: React.ReactNode,
}

export function MenuSubTrigger({ leftSection, children, className, ...props }: MenuSubItemProps) {
    return (
        <DropdownMenuSubTrigger {...props} className={cn("gap-2.5", className)}>
            {leftSection !== undefined
                && <span className="flex w-[1.1rem] shrink-0 items-center justify-center">{leftSection}</span>}
            <span className="min-w-0 flex-grow">{children}</span>
        </DropdownMenuSubTrigger>
    );
}

export function MenuSubContent({ children, ...props }: React.ComponentProps<typeof DropdownMenuSubContent>) {
    const keepOpen = useContext(KeepOpenContext);
    return (
        <DropdownMenuSubContent {...props}>
            <KeepOpenContext.Provider value={keepOpen}>
                {children}
            </KeepOpenContext.Provider>
        </DropdownMenuSubContent>
    );
}

export const MenuSub = DropdownMenuSub;
export const MenuDivider = DropdownMenuSeparator;

/** Empty left section placeholder so labels line up with checked items. */
export const MenuSpacer = () => <span className="inline-block w-4" />;
