import * as React from "react";
import { cn } from "lib/utils";
import { Slider as SliderPrimitive } from "radix-ui";

/**
 * Single-thumb Radix slider. `label` renders a value bubble above the thumb
 * (the Mantine labelAlwaysOn behaviour the create torrent window used).
 */
function Slider({
    className,
    value,
    min = 0,
    max = 100,
    label,
    ...props
}: Omit<React.ComponentProps<typeof SliderPrimitive.Root>, "value" | "defaultValue"> & {
    value: number,
    label?: (value: number) => React.ReactNode,
}) {
    const percent = max > min ? ((value - min) / (max - min)) * 100 : 0;

    return (
        <SliderPrimitive.Root
            data-slot="slider"
            value={[value]}
            min={min}
            max={max}
            className={cn(
                "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50",
                className,
            )}
            {...props}
        >
            <SliderPrimitive.Track
                data-slot="slider-track"
                className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted"
            >
                <SliderPrimitive.Range
                    data-slot="slider-range"
                    className="absolute h-full bg-primary"
                />
            </SliderPrimitive.Track>
            {label !== undefined && (
                <div
                    className="pointer-events-none absolute -top-9 -translate-x-1/2 rounded-sm bg-foreground px-2 py-1 text-sm font-medium whitespace-nowrap text-background"
                    style={{ left: `calc(${percent}% + ${(50 - percent) * 0.16}px)` }}
                >
                    {label(value)}
                </div>
            )}
            <SliderPrimitive.Thumb
                data-slot="slider-thumb"
                className="block size-5 shrink-0 rounded-full border-2 border-primary bg-white shadow-sm transition-[box-shadow] hover:ring-4 hover:ring-ring/30 focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-hidden disabled:pointer-events-none"
            />
        </SliderPrimitive.Root>
    );
}

export { Slider };
