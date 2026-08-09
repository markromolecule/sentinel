import { describe, expect, it } from 'vitest';
import { mergeEvents } from '../lib/calendar-helpers';
import { CalendarEvent } from '@/data/calendar';

describe('user note scoping and filtering (mergeEvents)', () => {
    const mockGlobalData: Record<string, CalendarEvent[]> = {
        '2026-08-10': [
            {
                id: 'exam-1',
                type: 'exam',
                title: 'Math Exam',
                time: '10:00 AM',
                date: '2026-08-10',
            },
            {
                id: 'note-1',
                type: 'note',
                title: 'Global Note (should be ignored)',
                time: '11:00 AM',
                date: '2026-08-10',
            },
        ],
    };

    const mockUserNotes: Record<string, CalendarEvent[]> = {
        '2026-08-10': [
            {
                id: 'note-2',
                type: 'note',
                title: 'My Physics Note',
                time: '01:00 PM',
                date: '2026-08-10',
            },
        ],
        '2026-08-11': [
            {
                id: 'note-3',
                type: 'note',
                title: 'My Chemistry Note',
                time: '02:00 PM',
                date: '2026-08-11',
            },
            {
                id: 'exam-2',
                type: 'exam',
                title: 'User Exam (should be ignored from userNotes)',
                time: '03:00 PM',
                date: '2026-08-11',
            },
        ],
    };

    it('should keep exams from globalData and user notes from userNotes', () => {
        const result = mergeEvents(mockGlobalData, mockUserNotes);

        // check 2026-08-10 has the Math Exam (from globalData) and My Physics Note (from userNotes)
        expect(result['2026-08-10']).toHaveLength(2);
        expect(result['2026-08-10'].find((e) => e.id === 'exam-1')).toBeDefined();
        expect(result['2026-08-10'].find((e) => e.id === 'note-2')).toBeDefined();

        // check global note is ignored
        expect(result['2026-08-10'].find((e) => e.id === 'note-1')).toBeUndefined();

        // check 2026-08-11 has only the Chemistry Note
        expect(result['2026-08-11']).toHaveLength(1);
        expect(result['2026-08-11'][0].id).toBe('note-3');
    });

    it('should handle empty userNotes gracefully', () => {
        const result = mergeEvents(mockGlobalData, {});
        expect(result['2026-08-10']).toHaveLength(1);
        expect(result['2026-08-10'][0].id).toBe('exam-1');
    });

    it('should handle empty globalData gracefully', () => {
        const result = mergeEvents({}, mockUserNotes);
        expect(result['2026-08-10']).toHaveLength(1);
        expect(result['2026-08-10'][0].id).toBe('note-2');
        expect(result['2026-08-11']).toHaveLength(1);
        expect(result['2026-08-11'][0].id).toBe('note-3');
    });
});
