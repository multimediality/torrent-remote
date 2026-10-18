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

import type { ServerConfig } from "config";
import { ConfigContext, ServerConfigContext } from "config";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ModalState } from "./common";
import { SaveCancelModal } from "./common";
import { queryClient, useMutateSession, useRemoveTestPortQuery, useSessionFull, useTestPort, useUpdateBlocklist } from "queries";
import type { UseFormReturn } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { SessionInfo } from "rpc/client";
import type { BandwidthGroup } from "rpc/torrent";
import { notifications } from "notifications";
import type { InterfaceFormValues } from "./interfacepanel";
import { InterfaceSettigsPanel } from "./interfacepanel";
import * as Icon from "react-bootstrap-icons";
import { RhfCheckbox, RhfNumber, RhfSelect, RhfText } from "components/formfields";
import { Button } from "components/ui/button";
import { CheckboxField } from "components/ui/fields";
import { Loader, LoadingOverlay } from "components/ui/loader";
import { NumberInput } from "components/ui/number-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "components/ui/hover-card";
const { TAURI } = await import(/* webpackChunkName: "taurishim" */"taurishim");

interface FormValues extends InterfaceFormValues {
    intervals: ServerConfig["intervals"],
    session?: SessionInfo,
    bandwidthGroups?: BandwidthGroup[],
}

type Form = UseFormReturn<FormValues>;

function Grid({ children }: React.PropsWithChildren) {
    return <div className="grid grid-cols-12 items-center gap-2">{children}</div>;
}

function PollingPanel({ form }: { form: Form }) {
    return (
        <Grid>
            <div className="col-span-12">Update intervals (sec)</div>
            <div className="col-span-8">Session</div>
            <div className="col-span-2">
                <RhfNumber
                    control={form.control}
                    name="intervals.session"
                    min={1}
                    max={3600}
                />
            </div>
            <div className="col-span-2" />
            <div className="col-span-8">Torrent details</div>
            <div className="col-span-2">
                <RhfNumber
                    control={form.control}
                    name="intervals.details"
                    min={1}
                    max={3600}
                />
            </div>
            <div className="col-span-2" />
            <div className="col-span-8">Torrents active</div>
            <div className="col-span-2">
                <RhfNumber
                    control={form.control}
                    name="intervals.torrents"
                    min={1}
                    max={3600}
                />
            </div>
            <div className="col-span-2" />
            <div className="col-span-8">Torrents inactive/minimized</div>
            <div className="col-span-2">
                <RhfNumber
                    control={form.control}
                    name="intervals.torrentsMinimized"
                    min={1}
                    max={3600}
                />
            </div>
            <div className="col-span-2" />
        </Grid>
    );
}

export function HelpHint({ children, width = 280 }: React.PropsWithChildren<{ width?: number }>) {
    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                <span className="ml-1 inline-flex cursor-help text-muted-foreground"><Icon.Question /></span>
            </HoverCardTrigger>
            <HoverCardContent style={{ width }}>
                {children}
            </HoverCardContent>
        </HoverCard>
    );
}

function DownloadPanel({ form, session }: { form: Form, session: SessionInfo }) {
    return (
        <Grid>
            <div className="col-span-12">
                <RhfText
                    control={form.control}
                    name="session.download-dir"
                    label="Default download folder (server setting)"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                />
            </div>
            <div className="col-span-12">
                <RhfCheckbox
                    control={form.control}
                    name="session.start-added-torrents"
                    className="mt-3"
                    label={<span>
                        <span>Start added torrents</span>
                        <HelpHint>
                            This setting only applies to torrents added via the
                            watch directory or by other clients that do not specify
                            the start parameter. Torrent Remote sets the start parameter
                            based on your selection in the add torrent/magnet dialog.
                        </HelpHint>
                    </span>}
                />
            </div>
            {session["rpc-version"] as number >= 18
                && <div className="col-span-12">
                    <RhfCheckbox
                        control={form.control}
                        name="session.sequential_download"
                        className="mt-3"
                        label="Download torrents sequentially"
                    />
                </div>}
            <div className="col-span-12">
                <RhfCheckbox
                    control={form.control}
                    name="session.rename-partial-files"
                    className="mt-3"
                    label="Add .part extension to incomplete files"
                />
            </div>
            <div className="col-span-12">
                <RhfCheckbox
                    control={form.control}
                    name="session.incomplete-dir-enabled"
                    className="mt-3"
                    label="Use separate directory for incomplete files"
                />
            </div>
            <div className="col-span-12">
                <RhfText
                    control={form.control}
                    name="session.incomplete-dir"
                    label="Path for incomplete files"
                    disabled={session["incomplete-dir-enabled"] !== true}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                />
            </div>
            <div className="col-span-6">
                <RhfCheckbox
                    control={form.control}
                    name="session.seedRatioLimited"
                    label="Use default seed ratio limit"
                />
            </div>
            <div className="col-span-2">
                <RhfNumber
                    control={form.control}
                    name="session.seedRatioLimit"
                    min={0}
                    decimalScale={2}
                    fixedDecimalScale
                    step={0.05}
                    disabled={session.seedRatioLimited !== true}
                />
            </div>
            <div className="col-span-4"></div>
            <div className="col-span-6">
                <RhfCheckbox
                    control={form.control}
                    name="session.idle-seeding-limit-enabled"
                    label="Stop idle torrents after"
                />
            </div>
            <div className="col-span-2">
                <RhfNumber
                    control={form.control}
                    name="session.idle-seeding-limit"
                    min={0}
                    disabled={session["idle-seeding-limit-enabled"] !== true}
                />
            </div>
            <div className="col-span-4">minutes</div>
            <div className="col-span-6">Disk cache size</div>
            <div className="col-span-2">
                <RhfNumber
                    control={form.control}
                    name="session.cache-size-mb"
                    min={0}
                />
            </div>
            <div className="col-span-4">MB</div>
        </Grid>
    );
}

interface PortTestResult {
    label: string,
    color: "green" | "red",
}

function NetworkPanel(
    { opened, form, session }: {
        opened: boolean,
        form: Form,
        session: SessionInfo,
    },
) {
    const [testPortQueryEnbaled, setTestPortQueryEnabled] = useState(false);
    const [testPortResult, setTestPortResult] = useState<PortTestResult>({ label: "", color: "green" });

    const { data: testPort, status, fetchStatus } = useTestPort(testPortQueryEnbaled);
    const removeQuery = useRemoveTestPortQuery();

    const onTestPort = useCallback(() => {
        setTestPortQueryEnabled(true);
    }, [setTestPortQueryEnabled]);

    useEffect(() => {
        if (fetchStatus !== "fetching") {
            setTestPortQueryEnabled(false);
        }
        if (status === "success") {
            setTestPortResult(testPort.arguments["port-is-open"] === true
                ? {
                    label: "Port is open",
                    color: "green",
                }
                : {
                    label: "Port unreachable",
                    color: "red",
                });
        } else if (status === "pending") {
            setTestPortResult({
                label: "",
                color: "green",
            });
        } else {
            setTestPortResult({
                label: "API error",
                color: "red",
            });
        }
    }, [fetchStatus, status, testPort]);

    useEffect(() => {
        if (!opened) {
            setTestPortResult({
                label: "",
                color: "green",
            });
            removeQuery();
        }
    }, [opened, setTestPortResult, removeQuery]);

    const { mutate: updateBlocklist, isPending: updatePending } = useUpdateBlocklist();
    const onUpdateBlocklist = useCallback(() => {
        updateBlocklist(undefined, {
            onError: (e) => {
                console.log(e);
                notifications.show({
                    title: "Error updating blocklist",
                    message: e.message,
                    color: "red",
                });
            },
        });
    }, [updateBlocklist]);

    return (
        <Grid>
            <div className="col-span-3">
                Incoming port:
            </div>
            <div className="col-span-3">
                <RhfNumber
                    control={form.control}
                    name="session.peer-port"
                    min={1}
                    max={65535}
                    disabled={session["peer-port-random-on-start"] === true}
                />
            </div>
            <div className="col-span-3">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            className="w-full"
                            onClick={onTestPort}
                            title="Test port"
                        >
                            Test port
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        Checks currently configured port. If you made changes save them before testing.
                    </TooltipContent>
                </Tooltip>
            </div>
            <div className="col-span-3">
                {fetchStatus === "fetching"
                    ? <Loader key="pt" size="1.5rem" />
                    : <span key="pt" className={testPortResult.color === "red" ? "text-destructive" : "text-success"}>{testPortResult.label}</span>}
            </div>
            <div className="col-span-12">
                <RhfCheckbox
                    control={form.control}
                    name="session.peer-port-random-on-start"
                    className="mt-3"
                    label="Let daemon pick a random port"
                />
            </div>
            <div className="col-span-12">
                <RhfCheckbox
                    control={form.control}
                    name="session.port-forwarding-enabled"
                    className="mt-3"
                    label="Enable UPnP port forwarding"
                />
            </div>
            <div className="col-span-3">
                Encryption:
            </div>
            <div className="col-span-3">
                <RhfSelect
                    control={form.control}
                    name="session.encryption"
                    data={["tolerated", "preferred", "required"]}
                />
            </div>
            <div className="col-span-6"></div>
            <div className="col-span-3">
                Global peer limit:
            </div>
            <div className="col-span-3">
                <RhfNumber
                    control={form.control}
                    name="session.peer-limit-global"
                    min={0}
                />
            </div>
            <div className="col-span-3">
                per torrent:
            </div>
            <div className="col-span-3">
                <RhfNumber
                    control={form.control}
                    name="session.peer-limit-per-torrent"
                    min={0}
                />
            </div>
            <div className="col-span-6">
                <RhfCheckbox
                    control={form.control}
                    name="session.pex-enabled"
                    className="mt-3"
                    label="Enable peer exchange"
                />
            </div>
            <div className="col-span-6">
                <RhfCheckbox
                    control={form.control}
                    name="session.dht-enabled"
                    className="mt-3"
                    label="Enable DHT"
                />
            </div>
            <div className="col-span-6">
                <RhfCheckbox
                    control={form.control}
                    name="session.lpd-enabled"
                    className="my-3"
                    label="Enable local discovery"
                />
            </div>
            <div className="col-span-6">
                <RhfCheckbox
                    control={form.control}
                    name="session.utp-enabled"
                    className="my-3"
                    label="Enable uTP"
                />
            </div>
            <div className="col-span-6">
                <RhfCheckbox
                    control={form.control}
                    name="session.blocklist-enabled"
                    label="Enable blocklist:"
                />
            </div>
            <div className="col-span-6">
                <RhfText
                    control={form.control}
                    name="session.blocklist-url"
                    disabled={session["blocklist-enabled"] !== true}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                />
            </div>
            <div className="col-span-6">
                <span>
                    {`Blocklist contains ${session["blocklist-size"] as number} entries`}
                </span>
            </div>
            <div className="col-span-3">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            className="w-full"
                            onClick={onUpdateBlocklist}
                            title="Update blocklist"
                        >
                            Update
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        Fetches currently configured blocklist. If you made changes save them before updating.
                    </TooltipContent>
                </Tooltip>
            </div>
            <div className="col-span-3">
                {updatePending && <Loader size="1.5rem" />}
            </div>
        </Grid>
    );
}

function TimeInput({ value, onChange, disabled }: { value: unknown, onChange: (v: number) => void, disabled?: boolean }) {
    const [hours, minutes] = useMemo(() => {
        const intVal = Number(value);
        return [Math.floor(intVal / 60), intVal % 60];
    }, [value]);

    const onHoursChange = useCallback((h: number) => {
        onChange(60 * h + minutes);
    }, [minutes, onChange]);
    const onMinutesChange = useCallback((m: number) => {
        onChange(60 * hours + m);
    }, [hours, onChange]);

    return (
        <div className="flex gap-1">
            <NumberInput
                min={0}
                max={23}
                step={1}
                value={hours}
                onChange={onHoursChange}
                disabled={disabled}
            />
            <NumberInput
                min={0}
                max={59}
                step={1}
                value={minutes}
                onChange={onMinutesChange}
                disabled={disabled}
            />
        </div>
    );
}

const DaysOfTheWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function DayOfWeekCheckbox({ form, day, session }: { form: Form, day: number, session: SessionInfo }) {
    return <CheckboxField
        className="my-3"
        label={DaysOfTheWeek[day]}
        checked={((session["alt-speed-time-day"] as number) & (1 << day)) > 0}
        onChange={(checked) => {
            const val = session["alt-speed-time-day"] as number;
            form.setValue(
                "session.alt-speed-time-day",
                checked ? val | (1 << day) : val & ~(1 << day));
        }}
        disabled={session["alt-speed-time-enabled"] !== true}
    />;
}

function BandwidthPanel({ form, session }: { form: Form, session: SessionInfo }) {
    return (
        <Grid>
            <div className="col-span-6"></div>
            <div className="col-span-3">Normal</div>
            <div className="col-span-3">Alternate</div>
            <div className="col-span-6">
                <RhfCheckbox
                    control={form.control}
                    name="session.speed-limit-down-enabled"
                    label="Maximum download speed (KB/s):"
                />
            </div>
            <div className="col-span-3">
                <RhfNumber
                    control={form.control}
                    name="session.speed-limit-down"
                    min={0}
                    disabled={session["speed-limit-down-enabled"] !== true}
                />
            </div>
            <div className="col-span-3">
                <RhfNumber
                    control={form.control}
                    name="session.alt-speed-down"
                    min={0}
                />
            </div>
            <div className="col-span-6">
                <RhfCheckbox
                    control={form.control}
                    name="session.speed-limit-up-enabled"
                    label="Maximum upload speed (KB/s):"
                />
            </div>
            <div className="col-span-3">
                <RhfNumber
                    control={form.control}
                    name="session.speed-limit-up"
                    min={0}
                    disabled={session["speed-limit-up-enabled"] !== true}
                />
            </div>
            <div className="col-span-3">
                <RhfNumber
                    control={form.control}
                    name="session.alt-speed-up"
                    min={0}
                />
            </div>
            <div className="col-span-12">
                <RhfCheckbox
                    control={form.control}
                    name="session.alt-speed-enabled"
                    className="mt-3"
                    label="Use alternate bandwidth settings"
                />
            </div>
            <div className="col-span-12">
                <RhfCheckbox
                    control={form.control}
                    name="session.alt-speed-time-enabled"
                    className="my-3"
                    label="Apply alternate bandwidth settings automatically"
                />
            </div>
            <div className="col-span-2">From:</div>
            <div className="col-span-3">
                <TimeInput
                    value={session["alt-speed-time-begin"]}
                    onChange={(v) => { form.setValue("session.alt-speed-time-begin", v); }}
                    disabled={session["alt-speed-time-enabled"] !== true}
                />
            </div>
            <div className="col-span-1">to:</div>
            <div className="col-span-3">
                <TimeInput
                    value={session["alt-speed-time-end"]}
                    onChange={(v) => { form.setValue("session.alt-speed-time-end", v); }}
                    disabled={session["alt-speed-time-enabled"] !== true}
                />
            </div>
            <div className="col-span-3"></div>
            <div className="col-span-2">Days:</div>
            <div className="col-span-10">
                <div className="flex flex-wrap gap-3">
                    {DaysOfTheWeek.map((_, day) =>
                        (<DayOfWeekCheckbox
                            key={day}
                            form={form}
                            day={day}
                            session={session}
                        />))}
                </div>
            </div>
        </Grid>
    );
}

function QueuePanel({ form, session }: { form: Form, session: SessionInfo }) {
    return (
        <Grid>
            <div className="col-span-8">
                <RhfCheckbox
                    control={form.control}
                    name="session.download-queue-enabled"
                    label="Download queue size"
                />
            </div>
            <div className="col-span-2">
                <RhfNumber
                    control={form.control}
                    name="session.download-queue-size"
                    min={0}
                    disabled={session["download-queue-enabled"] !== true}
                />
            </div>
            <div className="col-span-2"></div>
            <div className="col-span-8">
                <RhfCheckbox
                    control={form.control}
                    name="session.seed-queue-enabled"
                    label="Seed queue size"
                />
            </div>
            <div className="col-span-2">
                <RhfNumber
                    control={form.control}
                    name="session.seed-queue-size"
                    min={0}
                    disabled={session["seed-queue-enabled"] !== true}
                />
            </div>
            <div className="col-span-2"></div>
            <div className="col-span-8">
                <RhfCheckbox
                    control={form.control}
                    name="session.queue-stalled-enabled"
                    label="Consider torrents as stalled when idle for"
                />
            </div>
            <div className="col-span-2">
                <RhfNumber
                    control={form.control}
                    name="session.queue-stalled-minutes"
                    min={0}
                    disabled={session["queue-stalled-enabled"] !== true}
                />
            </div>
            <div className="col-span-2">minutes</div>
        </Grid>
    );
}

function MagnetHandlerPanel() {
    const handlerUrl = useMemo(() => {
        const handlerUrl = new URL(window.location.href);
        handlerUrl.search = "add=%s";
        return handlerUrl;
    }, []);

    const registerHandler = useCallback(() => {
        navigator.registerProtocolHandler("magnet", handlerUrl.toString());
    }, [handlerUrl]);

    // Unregister handler only exists in some browsers
    const unregisterHandler = useCallback(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).unregisterProtocolHandler?.("magnet", handlerUrl.toString());
    }, [handlerUrl]);

    return (
        <Grid>
            {window.location.protocol === "https:"
                ? <>
                    <div className="col-span-6">
                        <span>Register magnet protocol handler</span>
                    </div>
                    <div className="col-span-6">
                        <div className="flex justify-around">
                            <Button onClick={registerHandler}>Register</Button>
                            {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                typeof (navigator as any).unregisterProtocolHandler === "function"
                                && <Button onClick={unregisterHandler}>Unregister</Button>
                            }
                        </div>
                    </div>
                </>
                : <div className="col-span-12">
                    <p className="mb-2">
                        Registering magnet protocol handler is currently not available.
                        Browsers support this feature only in secure contexts, i.e. https websites.
                    </p>
                    <p>
                        Transmission does not natively support serving the web interface with https but you can
                        setup a reverse proxy with ssl termination in front of it and use a self signed or letsencrypt
                        provided free certificate to secure your transmission web endpoint.
                    </p>
                </div>}
        </Grid>
    );
}

export function DaemonSettingsModal(props: ModalState) {
    const { data: session, fetchStatus } = useSessionFull(props.opened);
    const mutation = useMutateSession();
    const config = useContext(ConfigContext);
    const serverConfig = useContext(ServerConfigContext);

    const form = useForm<FormValues>({
        defaultValues: {
            intervals: serverConfig.intervals,
            session,
            interface: config.values.interface,
        },
    });

    const { setValue } = form;
    useEffect(() => {
        setValue("session", session);
    }, [session, setValue]);

    useEffect(() => {
        if (props.opened) {
            setValue("interface", config.values.interface);
        }
    }, [config, props.opened, setValue]);

    const formSession = form.watch("session");

    const onSave = useCallback(() => {
        const values = form.getValues();
        serverConfig.intervals = { ...values.intervals };
        config.values.interface = { ...config.values.interface, ...values.interface };
        config.cleanup();
        void config.save();
        if (values.session !== undefined) {
            mutation.mutate(values.session, {
                onSuccess: () => {
                    notifications.show({
                        message: "Session saved successfully",
                        color: "green",
                    });
                    props.close();
                    if (!TAURI) {
                        // clear client cache to make sure new interface settings are applied
                        queryClient.clear();
                    }
                },
                onError: (error) => {
                    notifications.show({
                        title: "Failed to update daemon settings",
                        message: String(error),
                        color: "red",
                    });
                },
            });
        } else {
            props.close();
        }
    }, [form, mutation, props, config, serverConfig]);

    return (
        <SaveCancelModal
            opened={props.opened}
            size="lg"
            onClose={props.close}
            onSave={onSave}
            saveLoading={mutation.isPending}
            title="Server Settings"
        >
            <div className="relative">
                <LoadingOverlay visible={fetchStatus === "fetching"} blur={2} />
                <Tabs defaultValue="polling" className="min-h-[33rem]">
                    <TabsList>
                        <TabsTrigger value="polling" className="px-4 py-2.5">Polling</TabsTrigger>
                        <TabsTrigger value="download" className="px-4 py-2.5">Download</TabsTrigger>
                        <TabsTrigger value="network" className="px-4 py-2.5">Network</TabsTrigger>
                        <TabsTrigger value="bandwidth" className="px-4 py-2.5">Bandwidth</TabsTrigger>
                        <TabsTrigger value="queue" className="px-4 py-2.5">Queue</TabsTrigger>
                        {!TAURI && <>
                            <TabsTrigger value="interface" className="px-4 py-2.5">Interface</TabsTrigger>
                            <TabsTrigger value="magnethandler" className="px-4 py-2.5">Magnet links</TabsTrigger>
                        </>}
                    </TabsList>
                    {formSession !== undefined
                        ? <>
                            <TabsContent value="polling" className="p-3">
                                <PollingPanel form={form} />
                            </TabsContent>

                            <TabsContent value="download" className="p-3">
                                <DownloadPanel form={form} session={formSession} />
                            </TabsContent>

                            <TabsContent value="network" className="p-3">
                                <NetworkPanel opened={props.opened} form={form} session={formSession} />
                            </TabsContent>

                            <TabsContent value="bandwidth" className="p-3">
                                <BandwidthPanel form={form} session={formSession} />
                            </TabsContent>

                            <TabsContent value="queue" className="p-3">
                                <QueuePanel form={form} session={formSession} />
                            </TabsContent>

                            {!TAURI && <>
                                <TabsContent value="interface" className="p-3">
                                    <InterfaceSettigsPanel form={form as unknown as UseFormReturn<InterfaceFormValues>} />
                                </TabsContent>
                                <TabsContent value="magnethandler" className="p-3">
                                    <MagnetHandlerPanel />
                                </TabsContent>
                            </>}
                        </>
                        : <></>}
                </Tabs>
            </div>
        </SaveCancelModal>
    );
}
