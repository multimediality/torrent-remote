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

// The 10-shade palette TrguiNG used (Mantine defaults plus a custom turquoise).
// Stored interface settings reference these colors by name and shade, so the
// table has to stay stable for existing configs to keep resolving.

export type PaletteShades = readonly [string, string, string, string, string, string, string, string, string, string];

export const Palette = {
    dark: ["#C1C2C5", "#A6A7AB", "#909296", "#5c5f66", "#373A40", "#2C2E33", "#25262b", "#1A1B1E", "#141517", "#101113"],
    gray: ["#f8f9fa", "#f1f3f5", "#e9ecef", "#dee2e6", "#ced4da", "#adb5bd", "#868e96", "#495057", "#343a40", "#212529"],
    red: ["#fff5f5", "#ffe3e3", "#ffc9c9", "#ffa8a8", "#ff8787", "#ff6b6b", "#fa5252", "#f03e3e", "#e03131", "#c92a2a"],
    pink: ["#fff0f6", "#ffdeeb", "#fcc2d7", "#faa2c1", "#f783ac", "#f06595", "#e64980", "#d6336c", "#c2255c", "#a61e4d"],
    grape: ["#f8f0fc", "#f3d9fa", "#eebefa", "#e599f7", "#da77f2", "#cc5de8", "#be4bdb", "#ae3ec9", "#9c36b5", "#862e9c"],
    violet: ["#f3f0ff", "#e5dbff", "#d0bfff", "#b197fc", "#9775fa", "#845ef7", "#7950f2", "#7048e8", "#6741d9", "#5f3dc4"],
    indigo: ["#edf2ff", "#dbe4ff", "#bac8ff", "#91a7ff", "#748ffc", "#5c7cfa", "#4c6ef5", "#4263eb", "#3b5bdb", "#364fc7"],
    blue: ["#e7f5ff", "#d0ebff", "#a5d8ff", "#74c0fc", "#4dabf7", "#339af0", "#228be6", "#1c7ed6", "#1971c2", "#1864ab"],
    cyan: ["#e3fafc", "#c5f6fa", "#99e9f2", "#66d9e8", "#3bc9db", "#22b8cf", "#15aabf", "#1098ad", "#0c8599", "#0b7285"],
    teal: ["#e6fcf5", "#c3fae8", "#96f2d7", "#63e6be", "#38d9a9", "#20c997", "#12b886", "#0ca678", "#099268", "#087f5b"],
    green: ["#ebfbee", "#d3f9d8", "#b2f2bb", "#8ce99a", "#69db7c", "#51cf66", "#40c057", "#37b24d", "#2f9e44", "#2b8a3e"],
    lime: ["#f4fce3", "#e9fac8", "#d8f5a2", "#c0eb75", "#a9e34b", "#94d82d", "#82c91e", "#74b816", "#66a80f", "#5c940d"],
    yellow: ["#fff9db", "#fff3bf", "#ffec99", "#ffe066", "#ffd43b", "#fcc419", "#fab005", "#f59f00", "#f08c00", "#e67700"],
    orange: ["#fff4e6", "#ffe8cc", "#ffd8a8", "#ffc078", "#ffa94d", "#ff922b", "#fd7e14", "#f76707", "#e8590c", "#d9480f"],
    turquoise: ["#dcfdff", "#b2f4fd", "#85ebf9", "#58e3f6", "#36d9f3", "#25c0d9", "#1696aa", "#066b7a", "#00404a", "#00171b"],
} as const satisfies Record<string, PaletteShades>;

export type PaletteColorName = keyof typeof Palette;
export const PaletteColorNames = Object.keys(Palette) as PaletteColorName[];

/** "blue" (shade 6 implied) or "yellow.6" */
export type PaletteColorRef = PaletteColorName | `${PaletteColorName}.${number}`;

export function isPaletteColorName(name: string): name is PaletteColorName {
    return Object.prototype.hasOwnProperty.call(Palette, name);
}

export function paletteShade(color: string, shade: number): string {
    const shades: PaletteShades = isPaletteColorName(color) ? Palette[color] : Palette.gray;
    const index = Math.min(Math.max(Math.round(shade), 0), shades.length - 1);
    return shades[index];
}

export function paletteColor(ref: PaletteColorRef | string): string {
    const [name, shade] = ref.split(".");
    return paletteShade(name, shade === undefined ? 6 : Number(shade));
}
