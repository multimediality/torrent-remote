import * as React from "react";
import { cn } from "lib/utils";

export const inputClassName = "h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-sm transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-destructive/30 read-only:focus-visible:ring-0";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
    return (
        <input
            type={type}
            data-slot="input"
            className={cn(inputClassName, className)}
            {...props}
        />
    );
}

export { Input };
