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

// Thin adapter over sonner that keeps the notification call shape the rest of
// the app grew up with: show({ title, message, color }) and update({ id, ... }).

import type React from "react";
import { toast } from "sonner";
import type { ExternalToast } from "sonner";

export interface NotificationData {
    id?: string,
    title?: React.ReactNode,
    message: React.ReactNode,
    color?: "red" | "green" | "blue" | "yellow" | string,
    autoClose?: boolean | number,
    loading?: boolean,
    withCloseButton?: boolean,
}

const DefaultDuration = 4000;

let counter = 0;

function toToastOptions(data: NotificationData, id: string): ExternalToast {
    const duration = data.autoClose === false
        ? Infinity
        : typeof data.autoClose === "number" ? data.autoClose : DefaultDuration;

    return {
        id,
        description: data.title !== undefined ? data.message : undefined,
        duration,
        closeButton: data.withCloseButton,
    };
}

function toastKind(data: NotificationData) {
    if (data.loading === true) return toast.loading;
    switch (data.color) {
        case "red": return toast.error;
        case "green": return toast.success;
        case "blue": return toast.info;
        case "yellow": return toast.warning;
        default: return toast;
    }
}

export const notifications = {
    show(data: NotificationData): string {
        const id = data.id ?? `notification-${++counter}`;
        const title = data.title ?? data.message;
        toastKind(data)(title, toToastOptions(data, id));
        return id;
    },
    update(data: NotificationData & { id: string }) {
        const title = data.title ?? data.message;
        toastKind(data)(title, toToastOptions(data, data.id));
    },
    hide(id: string) {
        toast.dismiss(id);
    },
};
