import { describe, expect, it } from 'vitest';
import { filterClassmates, type StudentClassmate } from './lib/classmates-filter';

const mockClassmates: StudentClassmate[] = [
    {
        studentId: 'stud-1',
        fullName: 'Jerome Benitez',
        studentNumber: '2023-172329',
    },
    {
        studentId: 'stud-2',
        fullName: 'Mark Joseph Livado',
        studentNumber: '2023-172370',
    },
];

describe('classmates filter utility', () => {
    it('returns the entire list if query is empty', () => {
        expect(filterClassmates(mockClassmates, '')).toEqual(mockClassmates);
        expect(filterClassmates(mockClassmates, '   ')).toEqual(mockClassmates);
    });

    it('returns filtered list matching student full name case-insensitively', () => {
        const result = filterClassmates(mockClassmates, 'jerome');
        expect(result).toHaveLength(1);
        expect(result[0].studentId).toBe('stud-1');
    });

    it('returns filtered list matching student number', () => {
        const result = filterClassmates(mockClassmates, '172370');
        expect(result).toHaveLength(1);
        expect(result[0].studentId).toBe('stud-2');
    });

    it('returns empty array if no classmate matches', () => {
        expect(filterClassmates(mockClassmates, 'not-found')).toEqual([]);
    });

    it('handles null or undefined classmates list safely', () => {
        expect(filterClassmates(null as any, 'jerome')).toEqual([]);
        expect(filterClassmates(undefined as any, 'jerome')).toEqual([]);
    });
});
