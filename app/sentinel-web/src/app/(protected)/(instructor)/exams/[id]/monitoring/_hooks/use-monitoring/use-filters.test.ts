import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilters } from './use-filters';
import type { StudentSession } from '@sentinel/shared/types';

describe('useFilters', () => {
    const mockStudents: StudentSession[] = [
        {
            id: 'student-1',
            attemptId: 'attempt-1',
            studentNo: '2024-0001',
            firstName: 'Mark',
            lastName: 'Livado',
            status: 'flagged',
            lifecycleState: 'SUBMITTED',
            progress: 100,
            incidentCount: 5,
            openIncidentCount: 2,
            lastActivity: '1 min ago',
        },
        {
            id: 'student-2',
            attemptId: 'attempt-2',
            studentNo: '2024-0002',
            firstName: 'Jane',
            lastName: 'Doe',
            status: 'submitted',
            lifecycleState: 'SUBMITTED',
            progress: 100,
            incidentCount: 0,
            openIncidentCount: 0,
            lastActivity: '5 min ago',
        },
        {
            id: 'student-3',
            attemptId: 'attempt-3',
            studentNo: '2024-0003',
            firstName: 'Active',
            lastName: 'Taking',
            status: 'active',
            lifecycleState: 'IN_PROGRESS',
            progress: 40,
            incidentCount: 0,
            openIncidentCount: 0,
            lastActivity: 'Just now',
        },
        {
            id: 'student-4',
            attemptId: 'attempt-4',
            studentNo: '2024-0004',
            firstName: 'Offline',
            lastName: 'User',
            status: 'disconnected',
            lifecycleState: 'IN_PROGRESS',
            progress: 20,
            incidentCount: 0,
            openIncidentCount: 0,
            lastActivity: '10 min ago',
        },
    ];

    it('returns all students when filterStatus is "all"', () => {
        const { result } = renderHook(() => useFilters(mockStudents));
        expect(result.current.filteredStudents).toHaveLength(4);
    });

    it('includes flagged students with SUBMITTED lifecycle in "submitted" filter', () => {
        const { result } = renderHook(() => useFilters(mockStudents));

        act(() => {
            result.current.handleFilterChange('submitted');
        });

        const ids = result.current.filteredStudents.map((s) => s.id);
        expect(ids).toContain('student-1'); // Mark (flagged + submitted)
        expect(ids).toContain('student-2'); // Jane (clean + submitted)
        expect(ids).not.toContain('student-3');
        expect(ids).not.toContain('student-4');
        expect(result.current.filteredStudents).toHaveLength(2);
    });

    it('includes students with incident flags in "flagged" filter', () => {
        const { result } = renderHook(() => useFilters(mockStudents));

        act(() => {
            result.current.handleFilterChange('flagged');
        });

        const ids = result.current.filteredStudents.map((s) => s.id);
        expect(ids).toContain('student-1'); // Mark has 5 flags
        expect(ids).not.toContain('student-2');
        expect(ids).not.toContain('student-3');
        expect(ids).not.toContain('student-4');
        expect(result.current.filteredStudents).toHaveLength(1);
    });

    it('filters active students and excludes submitted students', () => {
        const { result } = renderHook(() => useFilters(mockStudents));

        act(() => {
            result.current.handleFilterChange('active');
        });

        const ids = result.current.filteredStudents.map((s) => s.id);
        expect(ids).toEqual(['student-3']);
    });

    it('filters disconnected students', () => {
        const { result } = renderHook(() => useFilters(mockStudents));

        act(() => {
            result.current.handleFilterChange('disconnected');
        });

        const ids = result.current.filteredStudents.map((s) => s.id);
        expect(ids).toEqual(['student-4']);
    });
});
