import * as React from "react";
import { cn } from "lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
    return (
        <kbd
            data-slot="kbd"
            className={cn(
                "inline-flex h-5 items-center rounded-sm border border-b-2 bg-muted px-1.5 font-mono text-[0.6875rem] font-semibold text-muted-foreground",
                className,
            )}
            {...props}
        />
    );
}

export { Kbd };
