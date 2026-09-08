import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useExamReport } from './index';
import type { ExamReportActionItem } from '@sentinel/shared/types';
import { toast } from 'sonner';

// Mocks
const mockApiClient = vi.fn();
const mockRefetch = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@sentinel/hooks', () => ({
    useApi: () => mockApiClient,
    useExamReportQuery: () => ({
        data: {
            summary: {
                totalAssignedStudents: 10,
                totalStarted: 8,
                totalSubmitted: 7,
                totalAbsent: 2,
                averageScore: 80,
                passRate: 75,
                flaggedStudentsCount: 1,
                needsReviewCount: 1,
                needsMakeupCount: 2,
                needsRetakeCount: 1,
            },
            exam: {
                id: 'exam-123',
                title: 'Test Exam',
                subject: 'Science',
                scheduledDate: '2026-09-07T08:00:00.000Z',
            },
            sections: [{ id: 'sec-1', name: 'Section 1' }],
            students: [],
            actionItems: {
                review: [],
                makeup: [
                    {
                        studentId: 'stud-1',
                        firstName: 'Alice',
                        lastName: 'Smith',
                        studentNo: 'S1001',
                        reason: 'Absent',
                        sectionId: 'sec-1',
                    },
                    {
                        studentId: 'stud-2',
                        firstName: 'Bob',
                        lastName: 'Jones',
                        studentNo: 'S1002',
                        reason: 'Absent',
                        sectionId: 'sec-1',
                    },
                ],
                retake: [],
            },
        },
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
        isFetching: false,
    }),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        warning: vi.fn(),
        error: vi.fn(),
    },
}));

describe('useExamReport - Remediation Granting', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('grants override for a single student successfully', async () => {
        mockApiClient.mockResolvedValueOnce({
            remediationExam: { title: 'Remediation Science' },
            remediationSchedule: { scheduledDate: '2026-09-07T12:00:00.000Z' },
        });

        const { result } = renderHook(() => useExamReport({ examId: 'exam-123' }));

        const singleStudent: ExamReportActionItem = {
            id: 'act-1',
            studentId: 'stud-1',
            attemptId: null,
            firstName: 'Alice',
            lastName: 'Smith',
            studentNo: 'S1001',
            reason: 'Absent',
        };

        await act(async () => {
            await result.current.handleGrantOverride(
                singleStudent,
                'MAKEUP',
                '2026-09-07T10:00:00.000Z',
                '2026-09-07T12:00:00.000Z',
                'Approved makeup',
            );
        });

        expect(mockApiClient).toHaveBeenCalledTimes(1);
        expect(mockApiClient).toHaveBeenCalledWith(
            '/exams/exam-123/students/stud-1/lifecycle/grant-makeup',
            expect.objectContaining({
                method: 'POST',
            }),
        );
        expect(toast.success).toHaveBeenCalledWith(
            expect.stringContaining('Makeup scheduled for'),
        );
        expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('grants overrides for multiple students in batch with all succeeding', async () => {
        mockApiClient
            .mockResolvedValueOnce({ success: true })
            .mockResolvedValueOnce({ success: true });

        const { result } = renderHook(() => useExamReport({ examId: 'exam-123' }));

        const students: ExamReportActionItem[] = [
            {
                id: 'act-1',
                studentId: 'stud-1',
                attemptId: null,
                firstName: 'Alice',
                lastName: 'Smith',
                studentNo: 'S1001',
                reason: 'Absent',
            },
            {
                id: 'act-2',
                studentId: 'stud-2',
                attemptId: null,
                firstName: 'Bob',
                lastName: 'Jones',
                studentNo: 'S1002',
                reason: 'Absent',
            },
        ];

        await act(async () => {
            await result.current.handleGrantOverride(
                students,
                'MAKEUP',
                '2026-09-07T10:00:00.000Z',
                '2026-09-07T12:00:00.000Z',
                'Batch makeup approved',
            );
        });

        expect(mockApiClient).toHaveBeenCalledTimes(2);
        expect(toast.success).toHaveBeenCalledWith(
            'Successfully scheduled makeup for all 2 students.',
        );
        expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('handles partial batch failure gracefully and shows warning toast', async () => {
        mockApiClient
            .mockResolvedValueOnce({ success: true })
            .mockRejectedValueOnce(new Error('Student ineligible'));

        const { result } = renderHook(() => useExamReport({ examId: 'exam-123' }));

        const students: ExamReportActionItem[] = [
            {
                id: 'act-1',
                studentId: 'stud-1',
                attemptId: null,
                firstName: 'Alice',
                lastName: 'Smith',
                studentNo: 'S1001',
                reason: 'Absent',
            },
            {
                id: 'act-2',
                studentId: 'stud-2',
                attemptId: null,
                firstName: 'Bob',
                lastName: 'Jones',
                studentNo: 'S1002',
                reason: 'Absent',
            },
        ];

        await act(async () => {
            await result.current.handleGrantOverride(
                students,
                'MAKEUP',
                '2026-09-07T10:00:00.000Z',
                '2026-09-07T12:00:00.000Z',
                'Batch makeup',
            );
        });

        expect(mockApiClient).toHaveBeenCalledTimes(2);
        expect(toast.warning).toHaveBeenCalledWith(
            'Scheduled makeup for 1 student(s). 1 failed.',
        );
        expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('handles total batch failure (all fail) and shows error toast', async () => {
        mockApiClient
            .mockRejectedValueOnce(new Error('Student 1 ineligible'))
            .mockRejectedValueOnce(new Error('Student 2 ineligible'));

        const { result } = renderHook(() => useExamReport({ examId: 'exam-123' }));

        const students: ExamReportActionItem[] = [
            {
                id: 'act-1',
                studentId: 'stud-1',
                attemptId: null,
                firstName: 'Alice',
                lastName: 'Smith',
                studentNo: 'S1001',
                reason: 'Absent',
            },
            {
                id: 'act-2',
                studentId: 'stud-2',
                attemptId: null,
                firstName: 'Bob',
                lastName: 'Jones',
                studentNo: 'S1002',
                reason: 'Absent',
            },
        ];

        await act(async () => {
            await result.current.handleGrantOverride(
                students,
                'MAKEUP',
                '2026-09-07T10:00:00.000Z',
                '2026-09-07T12:00:00.000Z',
                'Batch makeup',
            );
        });

        expect(mockApiClient).toHaveBeenCalledTimes(2);
        expect(toast.error).toHaveBeenCalledWith('Failed to schedule makeup for selected students.');
        expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
});
