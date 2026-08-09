/**
 * Formats an exam start date string or Date object for Sentinel Mobile.
 *
 * @param dateVal The date value to format.
 * @param fallback Fallback string if the date is invalid or missing.
 */
export function formatExamStartDate(dateVal?: string | Date | null, fallback = 'TBD'): string {
    if (!dateVal) {
        return fallback;
    }

    const date = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;

    if (Number.isNaN(date.getTime())) {
        return fallback;
    }

    // Format consistently as "MMM d, yyyy, h:mm a"
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(date);
}
