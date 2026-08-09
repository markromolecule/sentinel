import { CalendarEvent } from '@/data/calendar';

/**
 * Merges global/shared calendar events (like exams) with user-scoped private notes.
 *
 * @param globalData The global mock or API events.
 * @param userNotes The user-scoped private notes.
 */
export function mergeEvents(
    globalData: Record<string, CalendarEvent[]>,
    userNotes: Record<string, CalendarEvent[]>
): Record<string, CalendarEvent[]> {
    const merged: Record<string, CalendarEvent[]> = {};

    // 1. Add exams from globalData
    if (globalData) {
        Object.keys(globalData).forEach((dateKey) => {
            const examsOnly = globalData[dateKey].filter((e) => e.type === 'exam');
            if (examsOnly.length > 0) {
                merged[dateKey] = examsOnly;
            }
        });
    }

    // 2. Add user-scoped notes
    if (userNotes) {
        Object.keys(userNotes).forEach((dateKey) => {
            const notes = userNotes[dateKey].filter((e) => e.type === 'note');
            if (notes.length > 0) {
                merged[dateKey] = [...(merged[dateKey] || []), ...notes];
            }
        });
    }

    return merged;
}
