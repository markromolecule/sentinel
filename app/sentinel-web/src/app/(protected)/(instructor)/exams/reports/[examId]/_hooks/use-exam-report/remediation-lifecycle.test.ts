import { describe, expect, it, vi } from 'vitest';
import type { ExamReportActionItem } from '@sentinel/shared/types';
import {
    buildGrantSuccessMessage,
    grantLifecycleOverride,
    grantLifecycleOverridesBatch,
} from './remediation-lifecycle';

describe('remediation-lifecycle', () => {
    const mockApiClient = vi.fn();

    const sampleItem: ExamReportActionItem = {
        id: 'queue-1',
        studentId: 'student-123',
        attemptId: 'attempt-456',
        studentNo: '2024-0001',
        firstName: 'Jane',
        lastName: 'Doe',
        reason: 'Needs Makeup',
    };

    describe('grantLifecycleOverride', () => {
        it('dispatches to makeup endpoint with correct payload', async () => {
            mockApiClient.mockResolvedValueOnce({ success: true });

            await grantLifecycleOverride({
                apiClient: mockApiClient as any,
                examId: 'exam-1',
                item: sampleItem,
                overrideType: 'MAKEUP',
                availableFrom: '2026-09-10T08:00:00.000Z',
                availableUntil: '2026-09-10T10:00:00.000Z',
                notes: 'Makeup notes',
            });

            expect(mockApiClient).toHaveBeenCalledWith(
                '/exams/exam-1/students/student-123/lifecycle/grant-makeup',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        availableFrom: '2026-09-10T08:00:00.000Z',
                        availableUntil: '2026-09-10T10:00:00.000Z',
                        allowedAttempts: 1,
                        sourceAttemptId: undefined,
                        notes: 'Makeup notes',
                    }),
                },
            );
        });

        it('dispatches to retake endpoint with sourceAttemptId', async () => {
            mockApiClient.mockResolvedValueOnce({ success: true });

            await grantLifecycleOverride({
                apiClient: mockApiClient as any,
                examId: 'exam-1',
                item: sampleItem,
                overrideType: 'RETAKE',
                availableFrom: '2026-09-10T08:00:00.000Z',
                availableUntil: '2026-09-10T10:00:00.000Z',
                notes: 'Retake notes',
            });

            expect(mockApiClient).toHaveBeenCalledWith(
                '/exams/exam-1/students/student-123/lifecycle/grant-retake',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        availableFrom: '2026-09-10T08:00:00.000Z',
                        availableUntil: '2026-09-10T10:00:00.000Z',
                        allowedAttempts: 1,
                        sourceAttemptId: 'attempt-456',
                        notes: 'Retake notes',
                    }),
                },
            );
        });
    });

    describe('buildGrantSuccessMessage', () => {
        it('formats schedule date and title when both are present', () => {
            const message = buildGrantSuccessMessage({
                overrideType: 'MAKEUP',
                response: {
                    remediationExam: { title: 'Midterm Makeup' },
                    remediationSchedule: { scheduledDate: '2026-09-10T08:00:00.000Z' },
                },
            });

            expect(message).toContain('Makeup scheduled for');
            expect(message).toContain('as "Midterm Makeup".');
        });

        it('returns fallback message when remediationExam is missing', () => {
            const message = buildGrantSuccessMessage({
                overrideType: 'RETAKE',
                response: null,
            });

            expect(message).toBe('Retake window granted successfully.');
        });
    });

    describe('grantLifecycleOverridesBatch', () => {
        it('processes all items and categorizes successes and failures', async () => {
            const item1: ExamReportActionItem = { ...sampleItem, studentId: 'student-1' };
            const item2: ExamReportActionItem = { ...sampleItem, studentId: 'student-2' };

            mockApiClient
                .mockResolvedValueOnce({ success: true })
                .mockRejectedValueOnce(new Error('Network failure'));

            const result = await grantLifecycleOverridesBatch({
                apiClient: mockApiClient as any,
                examId: 'exam-1',
                items: [item1, item2],
                overrideType: 'MAKEUP',
                availableFrom: '2026-09-10T08:00:00.000Z',
                availableUntil: '2026-09-10T10:00:00.000Z',
                notes: null,
            });

            expect(result.succeeded).toHaveLength(1);
            expect(result.succeeded[0]?.item.studentId).toBe('student-1');
            expect(result.failed).toHaveLength(1);
            expect(result.failed[0]?.item.studentId).toBe('student-2');
            expect(result.failed[0]?.reason).toBe('Network failure');
        });
    });
});
