import * as React from "react";
import { cn } from "lib/utils";

export interface SegmentedControlItem {
    value: string,
    label: React.ReactNode,
}

interface SegmentedControlProps {
    data: ReadonlyArray<string | SegmentedControlItem>,
    value: string,
    onChange: (value: string) => void,
    disabled?: boolean,
    /** css color for the active segment background */
    color?: string,
    className?: string,
}

/** Exclusive button row, the Mantine SegmentedControl look. */
function SegmentedControl({ data, value, onChange, disabled, color, className }: SegmentedControlProps) {
    const items = data.map((item) => typeof item === "string" ? { value: item, label: item } : item);

    return (
        <div
            role="radiogroup"
            data-slot="segmented-control"
            className={cn(
                "inline-flex rounded-md bg-muted p-0.5 text-sm",
                disabled === true && "pointer-events-none opacity-60",
                className,
            )}
        >
            {items.map((item) => {
                const active = item.value === value;
                return (
                    <button
                        key={item.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={disabled}
                        onClick={() => { onChange(item.value); }}
                        className={cn(
                            "rounded-sm px-3 py-1 font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                            active
                                ? "bg-primary text-white shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                        style={active && color !== undefined ? { backgroundColor: color } : undefined}
                    >
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
}

export { SegmentedControl };
