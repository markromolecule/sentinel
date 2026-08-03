import { format } from 'date-fns';

export const YEAR_LEVEL_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

export function formatTermLabel(academicYear: string, semester: string) {
    return `${academicYear} • ${semester}`;
}

export function formatDateRange(startDate?: Date | string | null, endDate?: Date | string | null) {
    if (!startDate && !endDate) {
        return 'Dates not set';
    }

    const formattedStartDate = startDate ? format(new Date(startDate), 'MMM d, yyyy') : 'TBD';
    const formattedEndDate = endDate ? format(new Date(endDate), 'MMM d, yyyy') : 'TBD';

    return `${formattedStartDate} - ${formattedEndDate}`;
}

export function summarizeSelection(items: string[], emptyLabel: string, limit = 3) {
    if (items.length === 0) {
        return emptyLabel;
    }

    const visibleItems = items.slice(0, limit);
    const remainder = items.length - visibleItems.length;

    return remainder > 0
        ? `${visibleItems.join(', ')} +${remainder} more`
        : visibleItems.join(', ');
}
