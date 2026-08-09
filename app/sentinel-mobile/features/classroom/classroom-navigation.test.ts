import { describe, expect, it } from 'vitest';
import {
    getClassroomExamsRoute,
    getClassroomClassmatesRoute,
} from './lib/classroom-navigation';

describe('classroom navigation route path builders', () => {
    it('returns exams subroute path for a valid classroom ID', () => {
        expect(getClassroomExamsRoute('class-123')).toBe('/classroom/class-123/exams');
    });

    it('returns empty string if classroom ID is empty for exams route', () => {
        expect(getClassroomExamsRoute('')).toBe('');
    });

    it('returns classmates subroute path for a valid classroom ID', () => {
        expect(getClassroomClassmatesRoute('class-123')).toBe('/classroom/class-123/classmates');
    });

    it('returns empty string if classroom ID is empty for classmates route', () => {
        expect(getClassroomClassmatesRoute('')).toBe('');
    });
});
