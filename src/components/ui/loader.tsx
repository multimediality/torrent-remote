import * as React from "react";
import { cn } from "lib/utils";

/** Spinning ring, sized through the `size` css length (defaults to 2rem). */
function Loader({ size = "2rem", color, className }: { size?: string, color?: string, className?: string }) {
    return (
        <span
            role="status"
            aria-label="Loading"
            data-slot="loader"
            className={cn("inline-block shrink-0 animate-spin rounded-full border-[0.2em] border-current border-t-transparent", className)}
            style={{ width: size, height: size, fontSize: size, color: color ?? "var(--primary)" }}
        />
    );
}

/**
 * Covers the nearest positioned ancestor with a translucent layer and a
 * centered loader while `visible` is set.
 */
function LoadingOverlay({ visible, blur = 0, loaderSize = "2.5rem", className }: {
    visible: boolean,
    blur?: number,
    loaderSize?: string,
    className?: string,
}) {
    if (!visible) return null;
    return (
        <div
            data-slot="loading-overlay"
            className={cn("absolute inset-0 z-[400] flex items-center justify-center bg-background/65", className)}
            style={blur > 0 ? { backdropFilter: `blur(${blur}px)` } : undefined}
        >
            <Loader size={loaderSize} />
        </div>
    );
}

/** Dark translucent, optionally blurred, cover for a positioned container. */
function Overlay({ blur = 0, className, children }: React.PropsWithChildren<{ blur?: number, className?: string }>) {
    return (
        <div
            data-slot="overlay"
            className={cn("absolute inset-0 z-[200] bg-black/60", className)}
            style={blur > 0 ? { backdropFilter: `blur(${blur}px)` } : undefined}
        >
            {children}
        </div>
    );
}

export { Loader, LoadingOverlay, Overlay };
