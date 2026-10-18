import * as React from "react";
import { cn } from "lib/utils";
import { Tabs as TabsPrimitive } from "radix-ui";

function Tabs({
    className,
    orientation = "horizontal",
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            data-orientation={orientation}
            orientation={orientation}
            className={cn(
                "group/tabs flex data-[orientation=horizontal]:flex-col",
                className,
            )}
            {...props}
        />
    );
}

function TabsList({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
    return (
        <TabsPrimitive.List
            data-slot="tabs-list"
            className={cn(
                "flex shrink-0 items-stretch text-muted-foreground group-data-[orientation=horizontal]/tabs:flex-wrap group-data-[orientation=horizontal]/tabs:border-b group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=vertical]/tabs:border-r",
                className,
            )}
            {...props}
        />
    );
}

function TabsTrigger({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            data-slot="tabs-trigger"
            className={cn(
                "relative inline-flex items-center justify-center gap-1.5 border-transparent px-3 py-2 text-sm whitespace-nowrap text-muted-foreground transition-colors outline-none hover:bg-accent/60 hover:text-foreground focus-visible:bg-accent/60 focus-visible:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
                "group-data-[orientation=horizontal]/tabs:-mb-px group-data-[orientation=horizontal]/tabs:border-b-2 group-data-[orientation=horizontal]/tabs:data-[state=active]:border-b-primary",
                "group-data-[orientation=vertical]/tabs:-mr-px group-data-[orientation=vertical]/tabs:justify-start group-data-[orientation=vertical]/tabs:border-r-2 group-data-[orientation=vertical]/tabs:data-[state=active]:border-r-primary",
                className,
            )}
            {...props}
        />
    );
}

function TabsContent({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            data-slot="tabs-content"
            className={cn("flex-1 outline-none", className)}
            {...props}
        />
    );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
