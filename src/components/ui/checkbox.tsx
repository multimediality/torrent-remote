import * as React from "react";
import { cn } from "lib/utils";
import { CheckIcon, MinusIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

function Checkbox({
    className,
    indeterminate,
    checked,
    ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & { indeterminate?: boolean }) {
    return (
        <CheckboxPrimitive.Root
            data-slot="checkbox"
            checked={indeterminate === true ? "indeterminate" : checked}
            className={cn(
                "peer size-4 shrink-0 rounded-sm border border-input bg-card transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
                className,
            )}
            {...props}
        >
            <CheckboxPrimitive.Indicator
                data-slot="checkbox-indicator"
                className="grid place-content-center text-current transition-none"
            >
                {indeterminate === true
                    ? <MinusIcon className="size-3.5" strokeWidth={3} />
                    : <CheckIcon className="size-3.5" strokeWidth={3} />}
            </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>
    );
}

export { Checkbox };
