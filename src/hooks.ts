/**
 * Torrent Remote - remote GUI for transmission torrent daemon
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

// Small local replacements for the handful of @mantine/hooks the app used.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface DisclosureHandlers {
    open: () => void,
    close: () => void,
    toggle: () => void,
}

export function useDisclosure(initialState = false): [boolean, DisclosureHandlers] {
    const [opened, setOpened] = useState(initialState);

    const handlers = useMemo<DisclosureHandlers>(() => ({
        open: () => { setOpened(true); },
        close: () => { setOpened(false); },
        toggle: () => { setOpened((o) => !o); },
    }), []);

    return [opened, handlers];
}

/**
 * Cycles through `options`. Calling the toggle with a value jumps to that value,
 * calling it without arguments advances to the next option (wrapping around).
 */
export function useToggle<T = boolean>(options: readonly T[] = [false, true] as unknown as readonly T[]) {
    const [[option], setOption] = useState<readonly T[]>(options.slice());

    // Like Mantine's useToggle: an explicit value selects that option, anything
    // that is not one of the options just advances to the next one. That matters
    // because toggles are wired straight to onClick and hotkey handlers, which
    // pass their event object as the argument.
    const toggle = useCallback((value?: unknown) => {
        setOption((current) => {
            const next = typeof value === "function" ? (value as (prev: T) => T)(current[0]) : value;
            const index = current.indexOf(next as T);
            if (index >= 0) {
                return [...current.slice(index), ...current.slice(0, index)];
            }
            return [...current.slice(1), current[0]];
        });
    }, []);

    return [option, toggle] as const;
}

export type HotkeyItem = [string, (event: KeyboardEvent) => void, { preventDefault?: boolean }?];

interface ParsedHotkey {
    alt: boolean,
    ctrl: boolean,
    meta: boolean,
    mod: boolean,
    shift: boolean,
    key?: string,
}

const isMac = typeof navigator !== "undefined" && /mac|iphone|ipad|ipod/i.test(navigator.platform);

function parseHotkey(hotkey: string): ParsedHotkey {
    const keys = hotkey.toLowerCase().split("+").map((part) => part.trim());

    const modifiers = {
        alt: keys.includes("alt"),
        ctrl: keys.includes("ctrl"),
        meta: keys.includes("meta"),
        mod: keys.includes("mod"),
        shift: keys.includes("shift"),
    };

    const reserved = ["alt", "ctrl", "meta", "shift", "mod"];
    const freeKey = keys.find((key) => !reserved.includes(key));

    return { ...modifiers, key: freeKey };
}

function hotkeyMatches(hotkey: ParsedHotkey, event: KeyboardEvent): boolean {
    const { alt, ctrl, meta, mod, shift, key } = hotkey;
    const { altKey, ctrlKey, metaKey, shiftKey, key: pressedKey, code } = event;

    if (alt !== altKey) return false;
    if (mod) {
        if (!ctrlKey && !metaKey) return false;
    } else {
        if (ctrl !== ctrlKey) return false;
        if (meta !== metaKey) return false;
    }
    if (shift !== shiftKey) return false;

    if (key === undefined) return false;
    if (pressedKey.toLowerCase() === key) return true;
    if (code.replace("Key", "").toLowerCase() === key) return true;
    if (code.replace("Digit", "").toLowerCase() === key) return true;
    return false;
}

const ignoredTags = ["INPUT", "TEXTAREA", "SELECT"];

function shouldFireEvent(event: KeyboardEvent) {
    if (event.target instanceof HTMLElement) {
        if (event.target.isContentEditable) return false;
        return !ignoredTags.includes(event.target.tagName);
    }
    return true;
}

/**
 * Document-level hotkeys in the "mod + shift + K" format. "mod" is Cmd on
 * macOS and Ctrl everywhere else; events from text inputs are ignored.
 */
export function useHotkeys(hotkeys: HotkeyItem[]) {
    const hotkeysRef = useRef(hotkeys);
    hotkeysRef.current = hotkeys;

    useEffect(() => {
        const listener = (event: KeyboardEvent) => {
            for (const [hotkey, handler, options] of hotkeysRef.current) {
                const parsed = parseHotkey(hotkey);
                if (parsed.mod && isMac && !event.metaKey) continue;
                if (parsed.mod && !isMac && !event.ctrlKey) continue;
                if (hotkeyMatches(parsed, event) && shouldFireEvent(event)) {
                    if (options?.preventDefault !== false) event.preventDefault();
                    handler(event);
                }
            }
        };

        document.documentElement.addEventListener("keydown", listener);
        return () => {
            document.documentElement.removeEventListener("keydown", listener);
        };
    }, []);
}

export interface ObservedRect {
    x: number,
    y: number,
    width: number,
    height: number,
    top: number,
    left: number,
    bottom: number,
    right: number,
}

const emptyRect: ObservedRect = { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 };

export function useResizeObserver<T extends HTMLElement = HTMLDivElement>(): [React.RefObject<T | null>, ObservedRect] {
    const ref = useRef<T>(null);
    const frame = useRef(0);
    const [rect, setRect] = useState<ObservedRect>(emptyRect);

    useEffect(() => {
        const element = ref.current;
        if (element === null) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry === undefined) return;
            cancelAnimationFrame(frame.current);
            frame.current = requestAnimationFrame(() => {
                const { x, y, width, height, top, left, bottom, right } = entry.contentRect;
                setRect({ x, y, width, height, top, left, bottom, right });
            });
        });

        observer.observe(element);
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame.current);
        };
    }, []);

    return [ref, rect];
}

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

    useEffect(() => {
        const mql = window.matchMedia(query);
        const listener = (e: MediaQueryListEvent) => {
            setMatches(e.matches);
        };
        setMatches(mql.matches);
        mql.addEventListener("change", listener);
        return () => {
            mql.removeEventListener("change", listener);
        };
    }, [query]);

    return matches;
}
