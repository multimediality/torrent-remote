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

import type { ColorSetting } from "config";
import React, { useState } from "react";
import { Palette, PaletteColorNames, paletteShade } from "palette";
import { Popover, PopoverContent, PopoverTrigger } from "components/ui/popover";
import { Button } from "components/ui/button";

interface ColorChooserProps {
    value: ColorSetting,
    onChange: (value: ColorSetting | undefined) => void,
}

const shades = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function ColorSwatch({ color }: { color: string }) {
    return (
        <span
            className="inline-block size-5 rounded-full border border-border"
            style={{ backgroundColor: color }}
        />
    );
}

export default function ColorChooser(props: ColorChooserProps) {
    const [opened, setOpened] = useState(false);

    return (
        <Popover open={opened} onOpenChange={setOpened}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-sm" title="Choose color">
                    <ColorSwatch color={paletteShade(props.value.color, props.value.shade)} />
                </Button>
            </PopoverTrigger>
            <PopoverContent side="right" align="start" className="w-auto p-2">
                <Button
                    variant="ghost"
                    className="px-3"
                    onClick={() => {
                        props.onChange(undefined);
                        setOpened(false);
                    }}
                >
                    Reset
                </Button>
                {PaletteColorNames.map((color) =>
                    <div key={color} className="flex flex-nowrap">
                        {shades.map((shade) =>
                            <Button
                                key={shade}
                                variant="ghost"
                                size="icon-sm"
                                className="m-[0.1rem]"
                                title={`${color}.${shade}`}
                                onClick={() => {
                                    props.onChange({ color, shade, computed: Palette[color][shade] });
                                    setOpened(false);
                                }}
                            >
                                <ColorSwatch color={Palette[color][shade]} />
                            </Button>)}
                    </div>)}
            </PopoverContent>
        </Popover>
    );
}
