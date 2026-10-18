/**
 * Torrent Remote - remote GUI for transmission torrent daemon
 * Copyright (C) 2026  Steven Demanett
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// react-hook-form Controller wrappers around the ui field components, so
// forms can bind a path with one prop instead of repeating value/onChange.

import React from "react";
import type { Control, FieldPath, FieldValues, RegisterOptions } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { NativeSelectProps, PasswordInputProps, TextInputProps, TextareaFieldProps } from "components/ui/fields";
import { CheckboxField, NativeSelect, PasswordInput, TextInput, TextareaField } from "components/ui/fields";
import type { NumberInputProps } from "components/ui/number-input";
import { NumberInput } from "components/ui/number-input";

interface BindProps<T extends FieldValues> {
    control: Control<T>,
    name: FieldPath<T>,
    rules?: Omit<RegisterOptions<T, FieldPath<T>>, "valueAsNumber" | "valueAsDate" | "setValueAs" | "disabled">,
}

type Unbound<P> = Omit<P, "name" | "value" | "onChange" | "onBlur" | "error" | "checked">;

export function RhfText<T extends FieldValues>({ control, name, rules, ...props }: BindProps<T> & Unbound<TextInputProps>) {
    return (
        <Controller
            control={control}
            name={name}
            rules={rules}
            render={({ field, fieldState }) => (
                <TextInput
                    {...props}
                    ref={field.ref}
                    name={field.name}
                    value={(field.value as string | undefined) ?? ""}
                    onChange={(e) => { field.onChange(e.target.value); }}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                />
            )}
        />
    );
}

export function RhfPassword<T extends FieldValues>({ control, name, rules, ...props }: BindProps<T> & Unbound<PasswordInputProps>) {
    return (
        <Controller
            control={control}
            name={name}
            rules={rules}
            render={({ field, fieldState }) => (
                <PasswordInput
                    {...props}
                    ref={field.ref}
                    name={field.name}
                    value={(field.value as string | undefined) ?? ""}
                    onChange={(e) => { field.onChange(e.target.value); }}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                />
            )}
        />
    );
}

export function RhfTextarea<T extends FieldValues>({ control, name, rules, ...props }: BindProps<T> & Unbound<TextareaFieldProps>) {
    return (
        <Controller
            control={control}
            name={name}
            rules={rules}
            render={({ field, fieldState }) => (
                <TextareaField
                    {...props}
                    ref={field.ref}
                    name={field.name}
                    value={(field.value as string | undefined) ?? ""}
                    onChange={(e) => { field.onChange(e.target.value); }}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                />
            )}
        />
    );
}

export function RhfCheckbox<T extends FieldValues>({ control, name, rules, label, disabled, className }: BindProps<T> & {
    label?: React.ReactNode,
    disabled?: boolean,
    className?: string,
}) {
    return (
        <Controller
            control={control}
            name={name}
            rules={rules}
            render={({ field }) => (
                <CheckboxField
                    name={field.name}
                    label={label}
                    disabled={disabled}
                    className={className}
                    checked={field.value === true}
                    onChange={(checked) => { field.onChange(checked); }}
                />
            )}
        />
    );
}

export function RhfNumber<T extends FieldValues>({ control, name, rules, ...props }: BindProps<T> & Unbound<NumberInputProps>) {
    return (
        <Controller
            control={control}
            name={name}
            rules={rules}
            render={({ field, fieldState }) => (
                <NumberInput
                    {...props}
                    name={field.name}
                    value={field.value as number | undefined}
                    onChange={(v) => { field.onChange(v); }}
                    onBlur={field.onBlur}
                    aria-invalid={fieldState.error !== undefined}
                />
            )}
        />
    );
}

export function RhfSelect<T extends FieldValues>({ control, name, rules, ...props }: BindProps<T> & Unbound<NativeSelectProps>) {
    return (
        <Controller
            control={control}
            name={name}
            rules={rules}
            render={({ field, fieldState }) => (
                <NativeSelect
                    {...props}
                    ref={field.ref}
                    name={field.name}
                    value={(field.value as string | undefined) ?? ""}
                    onChange={(e) => { field.onChange(e.target.value); }}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                />
            )}
        />
    );
}
