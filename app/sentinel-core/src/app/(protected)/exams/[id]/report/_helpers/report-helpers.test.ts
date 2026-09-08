import { describe, expect, it, vi } from 'vitest';
import type { ExamReportActionItem } from '@sentinel/shared/types';
import {
    grantLifecycleOverride,
    grantLifecycleOverridesBatch,
    paginateItems,
    buildGrantSuccessMessage,
} from './report-helpers';

const mockStudents: ExamReportActionItem[] = [
    {
        id: 'act-1',
        studentId: 'stud-1',
        attemptId: null,
        firstName: 'Alice',
        lastName: 'Smith',
        studentNo: 'S1001',
        reason: 'Absent from scheduled exam',
        sectionId: 'sec-1',
    },
    {
        id: 'act-2',
        studentId: 'stud-2',
        attemptId: 'att-2',
        firstName: 'Bob',
        lastName: 'Jones',
        studentNo: 'S1002',
        reason: 'Below passing score',
        sectionId: 'sec-1',
    },
];

describe('report-helpers in sentinel-core', () => {
    describe('paginateItems', () => {
        const items = Array.from({ length: 25 }, (_, i) => `item-${i + 1}`);

        it('paginates correctly on page 1', () => {
            const result = paginateItems(items, 1, 10);
            expect(result.items.length).toBe(10);
            expect(result.items[0]).toBe('item-1');
            expect(result.items[9]).toBe('item-10');
            expect(result.pagination).toEqual({
                page: 1,
                pageSize: 10,
                total: 25,
                totalPages: 3,
                hasMore: true,
            });
        });

        it('paginates correctly on final page', () => {
            const result = paginateItems(items, 3, 10);
            expect(result.items.length).toBe(5);
            expect(result.items[0]).toBe('item-21');
            expect(result.items[4]).toBe('item-25');
            expect(result.pagination.hasMore).toBe(false);
        });

        it('clamps out of bounds page numbers', () => {
            const result = paginateItems(items, 99, 10);
            expect(result.pagination.page).toBe(3);
            expect(result.items.length).toBe(5);
        });
    });

    describe('grantLifecycleOverridesBatch', () => {
        it('executes batch requests and segregates fulfilled and rejected results', async () => {
            const mockApiClient = vi.fn().mockImplementation((endpoint: string) => {
                if (endpoint.includes('stud-2')) {
                    return Promise.reject(new Error('Network failure on stud-2'));
                }
                return Promise.resolve({
                    remediationExam: { id: 'rem-1', title: 'Makeup Exam' },
                });
            });

            const result = await grantLifecycleOverridesBatch({
                apiClient: mockApiClient as any,
                examId: 'exam-100',
                items: mockStudents,
                overrideType: 'MAKEUP',
                availableFrom: '2026-09-08T09:00:00.000Z',
                availableUntil: '2026-09-08T11:00:00.000Z',
                notes: 'Batch makeup approved',
            });

            expect(mockApiClient).toHaveBeenCalledTimes(2);
            expect(result.succeeded.length).toBe(1);
            expect(result.succeeded[0]?.item.studentId).toBe('stud-1');
            expect(result.failed.length).toBe(1);
            expect(result.failed[0]?.item.studentId).toBe('stud-2');
            expect(result.failed[0]?.reason).toBe('Network failure on stud-2');
        });
    });

    describe('buildGrantSuccessMessage', () => {
        it('returns descriptive title and schedule date when provided', () => {
            const message = buildGrantSuccessMessage({
                overrideType: 'MAKEUP',
                response: {
                    remediationExam: { title: 'Midterm Makeup' },
                    remediationSchedule: { scheduledDate: '2026-09-10T10:00:00.000Z' },
                },
            });
            expect(message).toContain('Makeup scheduled');
            expect(message).toContain('"Midterm Makeup"');
        });

        it('returns fallback message when response lacks exam or schedule', () => {
            const message = buildGrantSuccessMessage({
                overrideType: 'RETAKE',
                response: {},
            });
            expect(message).toBe('Retake window granted successfully.');
        });
    });
});
