import * as React from "react";
import { cn } from "lib/utils";
import { Separator as SeparatorPrimitive } from "radix-ui";

function Separator({
    className,
    orientation = "horizontal",
    decorative = true,
    ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
    return (
        <SeparatorPrimitive.Root
            data-slot="separator"
            decorative={decorative}
            orientation={orientation}
            className={cn(
                "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
                className,
            )}
            {...props}
        />
    );
}

/** Horizontal rule with a centered caption, like Mantine's Divider with label. */
function LabeledSeparator({ label, className }: { label: React.ReactNode, className?: string }) {
    return (
        <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
            <div className="h-px flex-1 bg-border" />
            <span>{label}</span>
            <div className="h-px flex-1 bg-border" />
        </div>
    );
}

export { Separator, LabeledSeparator };
