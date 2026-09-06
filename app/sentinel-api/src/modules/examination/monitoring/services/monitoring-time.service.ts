export const DISCONNECTED_WINDOW_MS = 5 * 60 * 1000;

export function toIsoDate(value: Date | string | null | undefined): string | null {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function toDate(value: Date | string | null | undefined): Date | null {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

export function getRelativeTimeLabel(value: Date | null): string {
    if (!value) {
        return 'No recent activity';
    }

    const diffMs = Date.now() - value.getTime();
    const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

    if (diffMinutes <= 0) {
        return 'Just now';
    }

    if (diffMinutes === 1) {
        return '1 min ago';
    }

    if (diffMinutes < 60) {
        return `${diffMinutes} min ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);

    if (diffHours === 1) {
        return '1 hour ago';
    }

    if (diffHours < 24) {
        return `${diffHours} hours ago`;
    }

    const diffDays = Math.round(diffHours / 24);
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

export function formatMonitoringLastActivity(value: string | null | undefined): string {
    return getRelativeTimeLabel(toDate(value));
}
