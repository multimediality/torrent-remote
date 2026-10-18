import * as React from "react";
import { cn } from "lib/utils";
import { Switch as SwitchPrimitive } from "radix-ui";

/**
 * Radix switch. The "lg" size renders onLabel/offLabel inside the track,
 * matching the big ON/OFF toggles of the integrations settings panel.
 */
function Switch({
    className,
    size = "default",
    onLabel,
    offLabel,
    ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
    size?: "default" | "lg",
    onLabel?: React.ReactNode,
    offLabel?: React.ReactNode,
}) {
    return (
        <SwitchPrimitive.Root
            data-slot="switch"
            data-size={size}
            className={cn(
                "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
                size === "default" ? "h-5 w-9" : "h-7 min-w-14 w-full text-xs font-semibold",
                className,
            )}
            {...props}
        >
            {size === "lg" && (
                <>
                    <span className="pointer-events-none absolute left-2.5 text-primary-foreground opacity-0 transition-opacity group-data-[state=checked]/switch:opacity-100">
                        {onLabel}
                    </span>
                    <span className="pointer-events-none absolute right-2.5 text-muted-foreground opacity-0 transition-opacity group-data-[state=unchecked]/switch:opacity-100">
                        {offLabel}
                    </span>
                </>
            )}
            <SwitchPrimitive.Thumb
                data-slot="switch-thumb"
                className={cn(
                    "pointer-events-none block rounded-full bg-white shadow-sm ring-0",
                    size === "default"
                        ? "size-4 transition-transform data-[state=unchecked]:translate-x-0.5 data-[state=checked]:translate-x-[calc(100%+0.1rem)]"
                        // the large track stretches to its column, so the thumb is
                        // positioned against the track edges instead of translated
                        : "absolute top-1/2 size-5 -translate-y-1/2 transition-[left] data-[state=unchecked]:left-0.5 data-[state=checked]:left-[calc(100%-1.375rem)]",
                )}
            />
        </SwitchPrimitive.Root>
    );
}

export { Switch };
