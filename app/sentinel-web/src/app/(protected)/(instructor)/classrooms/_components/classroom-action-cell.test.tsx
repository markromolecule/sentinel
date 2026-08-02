import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { ClassroomActionCell } from './classroom-action-cell';
import { useActivePermissions } from '@sentinel/hooks';
import React from 'react';

vi.mock('@sentinel/hooks', () => ({
    useDeleteClassroomMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useArchiveClassroomMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useUnarchiveClassroomMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
    useActivePermissions: vi.fn(),
}));

const mockClassroom = {
    id: 'classroom-1',
    className: 'Test Classroom',
    isConfigured: true,
    subjectOfferingId: null,
    subjectId: null,
    subjectCode: 'CS101',
    subjectTitle: 'Intro to CS',
    sectionId: null,
    sectionName: 'A',
    termId: null,
    termAcademicYear: '2025-2026',
    termSemester: '1st Semester',
    departmentId: null,
    departmentCode: 'CS',
    departmentName: 'Computer Science',
    courseId: null,
    courseCode: null,
    courseTitle: null,
    yearLevel: 1,
    institutionId: null,
    studentCount: 5,
    examCount: 2,
    createdAt: null,
    updatedAt: null,
    updatedBy: null,
    updatedByName: null,
    canManage: true,
    instructors: [],
    scopeSummary: {
        subjectLabel: 'CS101 - Intro to CS',
        sectionLabel: 'A',
        termLabel: '2025-2026 • 1st Semester',
        departmentLabel: 'CS - Computer Science',
        courseLabel: null,
        yearLevelLabel: 'Year 1',
    },
};

afterEach(() => {
    cleanup();
});

describe('ClassroomActionCell', () => {
    it('renders trigger button', () => {
        vi.mocked(useActivePermissions).mockReturnValue({
            hasPermission: () => true,
            hasAnyPermission: () => true,
            hasAllPermissions: () => true,
            activePermissionKeys: [],
            isLoading: false,
        });

        render(<ClassroomActionCell classroom={mockClassroom} />);
        expect(screen.getByRole('button', { name: /open classroom actions/i })).toBeTruthy();
    });
});
