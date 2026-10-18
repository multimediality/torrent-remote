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

import "css/theme.css";

import type { ColorScheme, ComputedColorScheme } from "config";
import { ConfigContext } from "config";
import { FontsizeContextProvider, GlobalStyleOverridesContext, useFontSize, useGlobalStyleOverrides } from "themehooks";
import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { TooltipProvider } from "components/ui/tooltip";

interface ColorSchemeContextValue {
    colorScheme: ColorScheme,
    computedColorScheme: ComputedColorScheme,
    setColorScheme: (scheme: ColorScheme) => void,
    toggleColorScheme: () => void,
}

const ColorSchemeContext = React.createContext<ColorSchemeContextValue>({
    colorScheme: "auto",
    computedColorScheme: "light",
    setColorScheme: () => { },
    toggleColorScheme: () => { },
});

export function useColorScheme() {
    return useContext(ColorSchemeContext);
}

export function useComputedColorScheme(): ComputedColorScheme {
    return useContext(ColorSchemeContext).computedColorScheme;
}

const darkQuery = "(prefers-color-scheme: dark)";

function useSystemColorScheme(): ComputedColorScheme {
    const [scheme, setScheme] = useState<ComputedColorScheme>(
        () => window.matchMedia(darkQuery).matches ? "dark" : "light");

    useEffect(() => {
        const mql = window.matchMedia(darkQuery);
        const listener = (e: MediaQueryListEvent) => {
            setScheme(e.matches ? "dark" : "light");
        };
        mql.addEventListener("change", listener);
        return () => {
            mql.removeEventListener("change", listener);
        };
    }, []);

    return scheme;
}

function GlobalStyles() {
    const colorScheme = useComputedColorScheme();
    const fontSize = useFontSize();
    const { style } = useGlobalStyleOverrides();
    const overrides = style[colorScheme];

    const bodyColor = overrides.color?.computed;
    const bodyBgColor = overrides.backgroundColor?.computed;
    const font = style.font;

    useLayoutEffect(() => {
        const root = document.documentElement;
        root.style.setProperty("--font-size", `${fontSize.value}em`);
        if (bodyColor === undefined) root.style.removeProperty("--body-color");
        else root.style.setProperty("--body-color", bodyColor);
        if (bodyBgColor === undefined) root.style.removeProperty("--body-bg-color");
        else root.style.setProperty("--body-bg-color", bodyBgColor);
        if (font === undefined || font === "") root.style.removeProperty("--font-family");
        else root.style.setProperty("--font-family", `"${font}", system-ui, sans-serif`);
    }, [fontSize.value, bodyColor, bodyBgColor, font]);

    return null;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
    const config = useContext(ConfigContext);
    const [style, setStyle] = useState(config.values.interface.styleOverrides);
    const [colorScheme, setColorSchemeState] = useState<ColorScheme>(config.getTheme());
    const systemScheme = useSystemColorScheme();

    const computedColorScheme: ComputedColorScheme = colorScheme === "auto" ? systemScheme : colorScheme;

    useEffect(() => {
        config.values.interface.styleOverrides = style;
    }, [config, style]);

    useEffect(() => {
        config.setTheme(colorScheme);
    }, [config, colorScheme]);

    useLayoutEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("dark", computedColorScheme === "dark");
        root.dataset.colorScheme = computedColorScheme;
    }, [computedColorScheme]);

    const setColorScheme = useCallback((scheme: ColorScheme) => {
        setColorSchemeState(scheme);
    }, []);

    const toggleColorScheme = useCallback(() => {
        setColorSchemeState(computedColorScheme === "dark" ? "light" : "dark");
    }, [computedColorScheme]);

    const colorSchemeValue = useMemo<ColorSchemeContextValue>(() => ({
        colorScheme,
        computedColorScheme,
        setColorScheme,
        toggleColorScheme,
    }), [colorScheme, computedColorScheme, setColorScheme, toggleColorScheme]);

    return (
        <FontsizeContextProvider>
            <GlobalStyleOverridesContext.Provider value={{ style, setStyle }}>
                <ColorSchemeContext.Provider value={colorSchemeValue}>
                    <TooltipProvider delayDuration={300}>
                        <GlobalStyles />
                        {children}
                    </TooltipProvider>
                </ColorSchemeContext.Provider>
            </GlobalStyleOverridesContext.Provider>
        </FontsizeContextProvider>
    );
}
