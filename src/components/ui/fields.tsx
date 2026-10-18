import * as React from "react";
import { useId, useState } from "react";
import { ChevronDownIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { cn } from "lib/utils";
import { Input, inputClassName } from "./input";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { Checkbox } from "./checkbox";

/** Label + error wrapper shared by the field components. */
function FieldWrapper({ id, label, error, className, children }: React.PropsWithChildren<{
    id: string,
    label?: React.ReactNode,
    error?: React.ReactNode,
    className?: string,
}>) {
    const hasError = error !== undefined && error !== null && error !== false && error !== "";
    return (
        <div data-slot="field" className={cn("flex w-full flex-col gap-1", className)}>
            {label !== undefined && <Label htmlFor={id}>{label}</Label>}
            {children}
            {hasError && <div className="text-xs text-destructive">{error}</div>}
        </div>
    );
}

export interface TextInputProps extends Omit<React.ComponentProps<"input">, "size"> {
    label?: React.ReactNode,
    error?: React.ReactNode,
    leftSection?: React.ReactNode,
    rightSection?: React.ReactNode,
    /** class for the outer wrapper */
    wrapperClassName?: string,
    inputClassName?: string,
}

/** Input with optional label, error text and icon/button sections inside the border. */
export function TextInput({
    label, error, leftSection, rightSection, wrapperClassName, inputClassName: extraInputClassName, className, id: idProp, ref, ...props
}: TextInputProps) {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const hasError = error !== undefined && error !== null && error !== false && error !== "";

    return (
        <FieldWrapper
            id={id}
            label={label}
            error={error}
            className={wrapperClassName}
        >
            <div className={cn("relative flex w-full items-center", className)}>
                {leftSection !== undefined
                    && <div className="pointer-events-none absolute left-2.5 flex items-center text-muted-foreground">{leftSection}</div>}
                <Input
                    ref={ref}
                    id={id}
                    aria-invalid={hasError || undefined}
                    className={cn(leftSection !== undefined && "pl-8", rightSection !== undefined && "pr-8", extraInputClassName)}
                    {...props}
                />
                {rightSection !== undefined
                    && <div className="absolute right-1 flex items-center">{rightSection}</div>}
            </div>
        </FieldWrapper>
    );
}

export interface TextareaFieldProps extends React.ComponentProps<"textarea"> {
    label?: React.ReactNode,
    error?: React.ReactNode,
    minRows?: number,
    maxRows?: number,
    wrapperClassName?: string,
}

/** Textarea with optional label and error text. */
export function TextareaField({
    label, error, minRows, maxRows, wrapperClassName, className, id: idProp, ...props
}: TextareaFieldProps) {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const hasError = error !== undefined && error !== null && error !== false && error !== "";
    const style: React.CSSProperties = {};
    if (minRows !== undefined) style.minHeight = `calc(${minRows} * 1.55em + 1rem)`;
    if (maxRows !== undefined) style.maxHeight = `calc(${maxRows} * 1.55em + 1rem)`;

    return (
        <FieldWrapper
            id={id}
            label={label}
            error={error}
            className={wrapperClassName}
        >
            <Textarea
                id={id}
                rows={minRows}
                aria-invalid={hasError || undefined}
                style={{ ...style, ...props.style }}
                className={className}
                {...props}
            />
        </FieldWrapper>
    );
}

export type PasswordInputProps = Omit<TextInputProps, "type" | "rightSection">;

export function PasswordInput(props: PasswordInputProps) {
    const [visible, setVisible] = useState(false);
    return (
        <TextInput
            {...props}
            type={visible ? "text" : "password"}
            autoComplete="off"
            rightSection={
                <button
                    type="button"
                    tabIndex={-1}
                    aria-label={visible ? "Hide password" : "Show password"}
                    className="flex size-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => { setVisible((v) => !v); }}
                >
                    {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
            }
        />
    );
}

export interface NativeSelectProps extends Omit<React.ComponentProps<"select">, "size"> {
    data: ReadonlyArray<string | { value: string, label: string }>,
    label?: React.ReactNode,
    error?: React.ReactNode,
    wrapperClassName?: string,
}

/** Styled native select element. */
export function NativeSelect({
    data, label, error, wrapperClassName, className, id: idProp, ...props
}: NativeSelectProps) {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    return (
        <FieldWrapper
            id={id}
            label={label}
            error={error}
            className={wrapperClassName}
        >
            <div className="relative flex w-full items-center">
                <select
                    id={id}
                    data-slot="native-select"
                    className={cn(inputClassName, "appearance-none pr-8", className)}
                    {...props}
                >
                    {data.map((item) => {
                        const option = typeof item === "string" ? { value: item, label: item } : item;
                        return <option key={option.value} value={option.value}>{option.label}</option>;
                    })}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-2.5 size-4 text-muted-foreground" />
            </div>
        </FieldWrapper>
    );
}

export interface CheckboxFieldProps {
    label?: React.ReactNode,
    checked?: boolean,
    indeterminate?: boolean,
    onChange?: (checked: boolean) => void,
    disabled?: boolean,
    className?: string,
    id?: string,
    name?: string,
    /** stop click events from bubbling to the row behind the checkbox */
    stopPropagation?: boolean,
}

/** Checkbox with a clickable label to its right. */
export function CheckboxField({
    label, checked, indeterminate, onChange, disabled, className, id: idProp, name, stopPropagation,
}: CheckboxFieldProps) {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const stop = stopPropagation === true
        ? (e: React.SyntheticEvent) => {
            e.stopPropagation();
        }
        : undefined;

    return (
        <div
            className={cn("flex items-center gap-2", disabled === true && "opacity-60", className)}
            onClick={stop}
            onDoubleClick={stop}
        >
            <Checkbox
                id={id}
                name={name}
                checked={checked ?? false}
                indeterminate={indeterminate}
                disabled={disabled}
                onCheckedChange={(state) => { onChange?.(state === true); }}
            />
            {label !== undefined
                && <Label htmlFor={id} className="cursor-default font-normal">{label}</Label>}
        </div>
    );
}
