import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { XIcon } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "lib/utils";
import { Label } from "./label";

export interface TagsInputProps {
    /** suggestions shown in the dropdown */
    data?: readonly string[],
    value: string[],
    onChange: (value: string[]) => void,
    label?: React.ReactNode,
    placeholder?: string,
    error?: React.ReactNode,
    disabled?: boolean,
    /** open the suggestion list as soon as the component mounts */
    defaultDropdownOpened?: boolean,
    /** keep the typed text as a tag when focus leaves the input */
    acceptValueOnBlur?: boolean,
    className?: string,
}

/**
 * Chips + free text input with a suggestion list. Enter or comma adds the
 * typed text, Backspace on an empty input removes the last tag.
 */
function TagsInput({
    data = [], value, onChange, label, placeholder, error, disabled,
    defaultDropdownOpened = false, acceptValueOnBlur = true, className,
}: TagsInputProps) {
    const id = React.useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [text, setText] = useState("");
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (defaultDropdownOpened) {
            inputRef.current?.focus();
            setOpen(true);
        }
    }, [defaultDropdownOpened]);

    const suggestions = useMemo(() => {
        const needle = text.trim().toLowerCase();
        return data.filter((item) => !value.includes(item) && (needle === "" || item.toLowerCase().includes(needle)));
    }, [data, value, text]);

    const add = useCallback((tag: string) => {
        const trimmed = tag.trim();
        if (trimmed === "") return;
        if (!value.includes(trimmed)) onChange([...value, trimmed]);
        setText("");
        setActive(-1);
    }, [value, onChange]);

    const remove = useCallback((tag: string) => {
        onChange(value.filter((v) => v !== tag));
    }, [value, onChange]);

    const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            if (open && active >= 0 && active < suggestions.length) {
                add(suggestions[active]);
            } else {
                add(text);
            }
        } else if (e.key === "Backspace" && text === "" && value.length > 0) {
            onChange(value.slice(0, -1));
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, suggestions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, -1));
        } else if (e.key === "Escape") {
            if (open) {
                e.stopPropagation();
                setOpen(false);
            }
        }
    }, [open, active, suggestions, add, text, value, onChange]);

    const onBlur = useCallback(() => {
        setFocused(false);
        setOpen(false);
        if (acceptValueOnBlur) add(text);
    }, [acceptValueOnBlur, add, text]);

    const showDropdown = open && suggestions.length > 0 && disabled !== true;

    return (
        <div data-slot="tags-input" className={cn("flex w-full flex-col gap-1", className)}>
            {label !== undefined && <Label htmlFor={id}>{label}</Label>}
            <PopoverPrimitive.Root open={showDropdown}>
                <PopoverPrimitive.Anchor asChild>
                    <div
                        className={cn(
                            "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-card px-2 py-1 text-sm",
                            focused && "border-ring ring-2 ring-ring/40",
                            error !== undefined && error !== false && "border-destructive",
                            disabled === true && "cursor-not-allowed opacity-60",
                        )}
                        onMouseDown={(e) => {
                            if (e.target === e.currentTarget) {
                                e.preventDefault();
                                inputRef.current?.focus();
                            }
                        }}
                    >
                        {value.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-[#1c7ed6] pr-1 pl-2 text-xs font-medium text-white"
                            >
                                <span className="truncate">{tag}</span>
                                {disabled !== true && (
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        aria-label={`Remove ${tag}`}
                                        className="rounded-sm p-0.5 hover:bg-white/20"
                                        onMouseDown={(e) => { e.preventDefault(); }}
                                        onClick={() => { remove(tag); }}
                                    >
                                        <XIcon className="size-3" />
                                    </button>
                                )}
                            </span>
                        ))}
                        <input
                            ref={inputRef}
                            id={id}
                            type="text"
                            value={text}
                            disabled={disabled}
                            placeholder={value.length === 0 ? placeholder : undefined}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            className="h-6 min-w-16 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                            onChange={(e) => {
                                setText(e.target.value);
                                setOpen(true);
                                setActive(-1);
                            }}
                            onFocus={() => {
                                setFocused(true);
                                setOpen(true);
                            }}
                            onBlur={onBlur}
                            onKeyDown={onKeyDown}
                        />
                    </div>
                </PopoverPrimitive.Anchor>
                <PopoverPrimitive.Portal>
                    <PopoverPrimitive.Content
                        align="start"
                        sideOffset={4}
                        onOpenAutoFocus={(e) => { e.preventDefault(); }}
                        onCloseAutoFocus={(e) => { e.preventDefault(); }}
                        className="z-[60] max-h-60 w-(--radix-popover-trigger-width) overflow-y-auto rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md outline-hidden"
                    >
                        {suggestions.map((item, index) => (
                            <div
                                key={item}
                                role="option"
                                aria-selected={index === active}
                                className={cn(
                                    "cursor-default rounded-sm px-2 py-1.5 select-none",
                                    index === active ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground",
                                )}
                                onMouseDown={(e) => { e.preventDefault(); }}
                                onClick={() => {
                                    add(item);
                                    inputRef.current?.focus();
                                }}
                            >
                                {item}
                            </div>
                        ))}
                    </PopoverPrimitive.Content>
                </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
            {error !== undefined && error !== false && error !== null
                && <div className="text-xs text-destructive">{error}</div>}
        </div>
    );
}

export { TagsInput };
