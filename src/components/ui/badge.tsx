import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "lib/utils";

const badgeVariants = cva(
    "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 py-px text-[0.6875rem] font-bold tracking-wide whitespace-nowrap uppercase",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground",
                secondary: "bg-secondary text-secondary-foreground",
                destructive: "bg-destructive text-white",
                outline: "border-border text-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

function Badge({
    className,
    variant = "default",
    ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
    return (
        <span
            data-slot="badge"
            data-variant={variant}
            className={cn(badgeVariants({ variant }), className)}
            {...props}
        />
    );
}

export { Badge, badgeVariants };
