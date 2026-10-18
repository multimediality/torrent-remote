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

import React, { useCallback, useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import ColorChooser from "components/colorchooser";
import { useGlobalStyleOverrides } from "themehooks";
import { AddTorrentPriorityOptions, AddTorrentStartOptions, DateFormatOptions, DeleteTorrentDataOptions, TimeFormatOptions } from "config";
import type {
    AddTorrentPriorityOption, AddTorrentStartOption, ColorScheme, ColorSetting, DateFormatOption,
    DeleteTorrentDataOption, StyleOverrides, TimeFormatOption,
} from "config";
import { ColorSchemeToggle } from "components/miscbuttons";
import { useComputedColorScheme } from "components/theme";
import { Palette } from "palette";
import { RhfCheckbox, RhfNumber } from "components/formfields";
import { NativeSelect, TextareaField } from "components/ui/fields";
import { TagsInput } from "components/ui/tags-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "components/ui/tabs";
import { HelpHint } from "./daemon";
const { TAURI, invoke } = await import(/* webpackChunkName: "taurishim" */"taurishim");

export interface InterfaceFormValues {
    interface: {
        theme?: ColorScheme,
        styleOverrides: StyleOverrides,
        skipAddDialog: boolean,
        addTorrentStart: AddTorrentStartOption,
        addTorrentPriority: AddTorrentPriorityOption,
        deleteTorrentData: DeleteTorrentDataOption,
        animatedProgressbars: boolean,
        colorfulProgressbars: boolean,
        numLastSaveDirs: number,
        sortLastSaveDirs: boolean,
        preconfiguredLabels: string[],
        preconfiguredDirs: string[],
        ignoredTrackerPrefixes: string[],
        defaultTrackers: string[],
        useCustomDateTimeFormat: boolean,
        dateFormat: DateFormatOption,
        timeFormat: TimeFormatOption,
    },
}

function Grid({ children }: React.PropsWithChildren) {
    // capped so controls stay next to their labels when the dialog is enlarged
    return <div className="mx-auto grid w-full max-w-[48rem] grid-cols-12 items-center gap-2">{children}</div>;
}

export function InterfaceSettigsPanel({ form }: { form: UseFormReturn<InterfaceFormValues> }) {
    const colorScheme = useComputedColorScheme();
    const { style, setStyle } = useGlobalStyleOverrides();
    const [systemFonts, setSystemFonts] = useState<string[]>(["Default"]);

    useEffect(() => {
        if (TAURI) {
            invoke<string[]>("list_system_fonts").then((fonts) => {
                fonts.sort();
                setSystemFonts(["Default"].concat(fonts));
            }).catch(console.error);
        } else {
            setSystemFonts(["Default", "Arial", "Verdana", "Tahoma", "Roboto"]);
        }
    }, []);

    const { setValue, setError, clearErrors } = form;
    const values = form.watch("interface");

    useEffect(() => {
        setValue("interface.theme", colorScheme);
    }, [setValue, colorScheme]);

    const setTextColor = useCallback((color: ColorSetting | undefined) => {
        const newStyle = { dark: { ...style.dark }, light: { ...style.light }, font: style.font };
        newStyle[colorScheme].color = color;
        setStyle(newStyle);
        setValue("interface.styleOverrides", newStyle);
    }, [style, colorScheme, setStyle, setValue]);

    const setBgColor = useCallback((backgroundColor: ColorSetting | undefined) => {
        const newStyle = { dark: { ...style.dark }, light: { ...style.light }, font: style.font };
        newStyle[colorScheme].backgroundColor = backgroundColor;
        setStyle(newStyle);
        setValue("interface.styleOverrides", newStyle);
    }, [style, colorScheme, setStyle, setValue]);

    const setFont = useCallback((font: string) => {
        const newStyle = {
            dark: { ...style.dark },
            light: { ...style.light },
            font: font === "Default" ? undefined : font,
        };
        setStyle(newStyle);
        setValue("interface.styleOverrides", newStyle);
    }, [style, setStyle, setValue]);

    const defaultColor = colorScheme === "dark"
        ? { color: "dark", shade: 0, computed: Palette.dark[0] }
        : { color: "dark", shade: 9, computed: Palette.dark[9] };

    const defaultBg = colorScheme === "dark"
        ? { color: "dark", shade: 7, computed: Palette.dark[7] }
        : { color: "gray", shade: 0, computed: Palette.gray[0] };

    const setPreconfiguredLabels = useCallback((labels: string[]) => {
        setValue("interface.preconfiguredLabels", labels);
    }, [setValue]);

    const setIgnoredTrackerPrefixes = useCallback((prefixes: string[]) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _ = new RegExp(`^(?<prefix>(${prefixes.join("|")})\\d*)\\.[^.]+\\.[^.]+$`, "i");
            setValue("interface.ignoredTrackerPrefixes", prefixes);
            clearErrors("interface.ignoredTrackerPrefixes");
        } catch {
            setError("interface.ignoredTrackerPrefixes", { type: "manual", message: "Invalid regex" });
        }
    }, [setValue, setError, clearErrors]);

    const ignoredTrackerPrefixesError = form.getFieldState("interface.ignoredTrackerPrefixes", form.formState).error?.message;

    return (
        <Tabs defaultValue="appearance" orientation="vertical" className="min-h-[29rem] grow">
            <TabsList className="min-w-[11rem]">
                <TabsTrigger value="appearance" className="px-4 py-2.5">Appearance</TabsTrigger>
                <TabsTrigger value="downloads" className="px-4 py-2.5">Downloads</TabsTrigger>
                <TabsTrigger value="miscellaneous" className="px-4 py-2.5">Miscellaneous</TabsTrigger>
            </TabsList>
            <TabsContent value="appearance" className="p-3">
                <Grid>
                    <div className="col-span-6">
                        Theme
                    </div>
                    <div className="col-span-6">
                        <ColorSchemeToggle />
                    </div>
                    <div className="col-span-6">
                        Font
                    </div>
                    <div className="col-span-6">
                        <NativeSelect
                            data={systemFonts}
                            value={style.font ?? "Default"}
                            onChange={(e) => { setFont(e.currentTarget.value); }}
                        />
                    </div>
                    <div className="col-span-6">
                        Text color
                    </div>
                    <div className="col-span-6">
                        <ColorChooser value={style[colorScheme].color ?? defaultColor} onChange={setTextColor} />
                    </div>
                    <div className="col-span-6">
                        Background
                    </div>
                    <div className="col-span-6">
                        <ColorChooser value={style[colorScheme].backgroundColor ?? defaultBg} onChange={setBgColor} />
                    </div>
                    <div className="col-span-6">Progress bars</div>
                    <div className="col-span-3">
                        <RhfCheckbox control={form.control} name="interface.colorfulProgressbars" label="Colorful" />
                    </div>
                    <div className="col-span-3">
                        <RhfCheckbox control={form.control} name="interface.animatedProgressbars" label="Animated" />
                    </div>
                    <div className="col-span-12">
                        <RhfCheckbox
                            control={form.control}
                            name="interface.useCustomDateTimeFormat"
                            className="mt-3"
                            label="Custom date/time format"
                        />
                    </div>
                    <div className="col-span-6">
                        <NativeSelect
                            data={[...DateFormatOptions]}
                            disabled={!values.useCustomDateTimeFormat}
                            value={values.dateFormat}
                            onChange={(e) => { setValue("interface.dateFormat", e.target.value as DateFormatOption); }}
                        />
                    </div>
                    <div className="col-span-6">
                        <NativeSelect
                            data={[...TimeFormatOptions]}
                            disabled={!values.useCustomDateTimeFormat}
                            value={values.timeFormat}
                            onChange={(e) => { setValue("interface.timeFormat", e.target.value as TimeFormatOption); }}
                        />
                    </div>
                </Grid>
            </TabsContent>
            <TabsContent value="downloads" className="p-3">
                <Grid>
                    <div className="col-span-12">
                        <RhfCheckbox control={form.control} name="interface.skipAddDialog" label="Skip add torrent dialog" />
                    </div>
                    <div className="col-span-6">
                        New torrent start
                    </div>
                    <div className="col-span-6">
                        <NativeSelect
                            data={AddTorrentStartOptions}
                            value={values.addTorrentStart}
                            onChange={(e) => { setValue("interface.addTorrentStart", e.target.value as AddTorrentStartOption); }}
                        />
                    </div>
                    <div className="col-span-6">
                        New torrent priority
                    </div>
                    <div className="col-span-6">
                        <NativeSelect
                            data={AddTorrentPriorityOptions}
                            value={values.addTorrentPriority}
                            onChange={(e) => { setValue("interface.addTorrentPriority", e.target.value as AddTorrentPriorityOption); }}
                        />
                    </div>
                    <div className="col-span-12">
                        <RhfCheckbox
                            control={form.control}
                            name="interface.sortLastSaveDirs"
                            className="my-3"
                            label="Sort download directories history alphabetically"
                        />
                    </div>
                    <div className="col-span-9">Max number of saved download directories</div>
                    <div className="col-span-3">
                        <RhfNumber
                            control={form.control}
                            name="interface.numLastSaveDirs"
                            min={1}
                            max={100}
                        />
                    </div>
                    <div className="col-span-12">
                        <TextareaField
                            minRows={6}
                            label="Preconfigured directories (one per line)"
                            value={values.preconfiguredDirs.join("\n")}
                            onChange={(e) => {
                                setValue("interface.preconfiguredDirs", e.currentTarget.value.split("\n"));
                            }}
                        />
                    </div>
                    <div className="col-span-12">
                        <TagsInput
                            data={values.preconfiguredLabels}
                            value={values.preconfiguredLabels}
                            onChange={setPreconfiguredLabels}
                            label={<span>
                                <span>Preconfigured labels</span>
                                <HelpHint>
                                    These labels will always be present in the suggestions list
                                    and filters even if no existing torrents have them.
                                </HelpHint>
                            </span>}
                        />
                    </div>
                </Grid>
            </TabsContent>
            <TabsContent value="miscellaneous" className="flex flex-col p-3">
                <Grid>
                    <div className="col-span-8">
                        Remove torrent dialog delete data option
                    </div>
                    <div className="col-span-4">
                        <NativeSelect
                            data={DeleteTorrentDataOptions}
                            value={values.deleteTorrentData}
                            onChange={(e) => { setValue("interface.deleteTorrentData", e.target.value as DeleteTorrentDataOption); }}
                        />
                    </div>
                    <div className="col-span-12">
                        <TagsInput
                            data={values.ignoredTrackerPrefixes}
                            value={values.ignoredTrackerPrefixes}
                            onChange={setIgnoredTrackerPrefixes}
                            label={<span>
                                <span>Ignored tracker prefixes</span>
                                <HelpHint width={380}>
                                    When subdomain of the tracker looks like one of these strings + (optional) digits,
                                    it will be omitted. This affects grouping in filters and display in table columns.
                                    You can use regex here for more advanced filtering, the list will be combined
                                    using &quot;|&quot;.
                                </HelpHint>
                            </span>}
                            error={ignoredTrackerPrefixesError}
                        />
                    </div>
                </Grid>
                <div className="flex min-h-0 grow flex-col pt-2">
                    <TextareaField
                        wrapperClassName="min-h-0 grow"
                        className="grow"
                        minRows={10}
                        label="Default tracker list"
                        value={values.defaultTrackers.join("\n")}
                        onChange={(e) => {
                            setValue("interface.defaultTrackers", e.currentTarget.value.split("\n"));
                        }}
                    />
                </div>
            </TabsContent>
        </Tabs>
    );
}
