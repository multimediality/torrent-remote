import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "lib/utils";
import { inputClassName } from "./input";

export interface NumberInputProps {
    value?: number | string,
    onChange?: (value: number) => void,
    min?: number,
    max?: number,
    step?: number,
    /** number of decimals kept; integers only when omitted */
    decimalScale?: number,
    /** always pad to decimalScale decimals */
    fixedDecimalScale?: boolean,
    disabled?: boolean,
    className?: string,
    id?: string,
    name?: string,
    onBlur?: () => void,
    "aria-invalid"?: boolean,
}

function format(value: number, decimalScale: number, fixed: boolean) {
    if (!Number.isFinite(value)) return "";
    return fixed ? value.toFixed(decimalScale) : String(Number(value.toFixed(decimalScale)));
}

/** Text input for numbers with step buttons, min/max clamping and decimal formatting. */
function NumberInput({
    value, onChange, min, max, step = 1, decimalScale = 0, fixedDecimalScale = false,
    disabled, className, id, name, onBlur, ...rest
}: NumberInputProps) {
    const numeric = typeof value === "string" ? Number(value) : value;
    const [text, setText] = useState(() => numeric === undefined ? "" : format(numeric, decimalScale, fixedDecimalScale));
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        if (focused) return;
        setText(numeric === undefined || Number.isNaN(numeric) ? "" : format(numeric, decimalScale, fixedDecimalScale));
    }, [numeric, decimalScale, fixedDecimalScale, focused]);

    const clamp = useCallback((v: number) => {
        let result = v;
        if (min !== undefined) result = Math.max(min, result);
        if (max !== undefined) result = Math.min(max, result);
        return Number(result.toFixed(decimalScale));
    }, [min, max, decimalScale]);

    const commit = useCallback((v: number) => {
        const clamped = clamp(v);
        setText(format(clamped, decimalScale, fixedDecimalScale));
        onChange?.(clamped);
    }, [clamp, decimalScale, fixedDecimalScale, onChange]);

    const onInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        if (!/^-?\d*([.,]\d*)?$/.test(next)) return;
        setText(next);
        const parsed = Number(next.replace(",", "."));
        if (next !== "" && next !== "-" && !Number.isNaN(parsed)) {
            onChange?.(clamp(parsed));
        }
    }, [clamp, onChange]);

    const stepBy = useCallback((direction: 1 | -1) => {
        const base = Number.isFinite(numeric) && numeric !== undefined ? numeric : (min ?? 0);
        commit(base + direction * step);
    }, [numeric, min, step, commit]);

    const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowUp") {
            e.preventDefault();
            stepBy(1);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            stepBy(-1);
        }
    }, [stepBy]);

    const handleBlur = useCallback(() => {
        setFocused(false);
        const parsed = Number(text.replace(",", "."));
        if (text !== "" && !Number.isNaN(parsed)) {
            commit(parsed);
        } else if (numeric !== undefined && Number.isFinite(numeric)) {
            setText(format(numeric, decimalScale, fixedDecimalScale));
        }
        onBlur?.();
    }, [text, numeric, commit, decimalScale, fixedDecimalScale, onBlur]);

    return (
        <div data-slot="number-input" className={cn("relative flex w-full", className)}>
            <input
                id={id}
                name={name}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={text}
                disabled={disabled}
                onChange={onInput}
                onFocus={() => { setFocused(true); }}
                onBlur={handleBlur}
                onKeyDown={onKeyDown}
                aria-invalid={rest["aria-invalid"]}
                className={cn(inputClassName, "pr-6 text-right tabular-nums")}
            />
            <div className="absolute inset-y-px right-px flex w-5 flex-col overflow-hidden rounded-r-md border-l border-input">
                <button
                    type="button"
                    tabIndex={-1}
                    disabled={disabled}
                    aria-label="Increment"
                    onClick={() => { stepBy(1); }}
                    className="flex flex-1 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none"
                >
                    <ChevronUpIcon className="size-3" />
                </button>
                <button
                    type="button"
                    tabIndex={-1}
                    disabled={disabled}
                    aria-label="Decrement"
                    onClick={() => { stepBy(-1); }}
                    className="flex flex-1 items-center justify-center border-t border-input text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none"
                >
                    <ChevronDownIcon className="size-3" />
                </button>
            </div>
        </div>
    );
}

export { NumberInput };
