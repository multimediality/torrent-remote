import React from "react";
import {
    CircleCheckIcon,
    InfoIcon,
    Loader2Icon,
    OctagonXIcon,
    TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useComputedColorScheme } from "components/theme";

const Toaster = ({ ...props }: ToasterProps) => {
    const theme = useComputedColorScheme();

    return (
        <Sonner
            theme={theme}
            className="toaster group"
            position="bottom-right"
            offset={{ bottom: "2.5rem", right: "1rem" }}
            visibleToasts={5}
            expand
            gap={8}
            icons={{
                success: <CircleCheckIcon className="size-4" />,
                info: <InfoIcon className="size-4" />,
                warning: <TriangleAlertIcon className="size-4" />,
                error: <OctagonXIcon className="size-4" />,
                loading: <Loader2Icon className="size-4 animate-spin" />,
            }}
            toastOptions={{
                classNames: {
                    toast: "!rounded-md !border !shadow-md",
                    description: "!text-muted-foreground",
                },
            }}
            style={
                {
                    "--normal-bg": "var(--popover)",
                    "--normal-text": "var(--popover-foreground)",
                    "--normal-border": "var(--border)",
                    "--success-bg": "var(--popover)",
                    "--success-text": "var(--popover-foreground)",
                    "--success-border": "var(--border)",
                    "--error-bg": "var(--popover)",
                    "--error-text": "var(--popover-foreground)",
                    "--error-border": "var(--border)",
                    "--info-bg": "var(--popover)",
                    "--info-text": "var(--popover-foreground)",
                    "--info-border": "var(--border)",
                    "--border-radius": "4px",
                } as React.CSSProperties
            }
            {...props}
        />
    );
};

export { Toaster };
