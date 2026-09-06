import { describe, expect, it, vi } from 'vitest';
import {
    applyMonitoringAttemptOrdering,
    getMonitoringAttemptLifecyclePriority,
} from './attempt-selection.helper';

describe('applyMonitoringAttemptOrdering', () => {
    it('applies student_id, operational state case, and created_at desc ordering', () => {
        const mockQuery = {
            orderBy: vi.fn().mockReturnThis(),
        };

        const result = applyMonitoringAttemptOrdering(mockQuery as any);

        expect(mockQuery.orderBy).toHaveBeenCalledTimes(3);
        expect(mockQuery.orderBy).toHaveBeenNthCalledWith(1, 'ea.student_id');
        expect(mockQuery.orderBy).toHaveBeenNthCalledWith(2, expect.anything(), 'asc');
        expect(mockQuery.orderBy).toHaveBeenNthCalledWith(3, 'ea.created_at', 'desc');
        expect(result).toBe(mockQuery);
    });

    it('prioritizes operational attempts over completed, reset, superseded, and retry attempts', () => {
        const attempts = [
            {
                attemptId: 'completed-attempt',
                lifecycleState: 'SUBMITTED',
                createdAt: '2026-07-23T10:00:00.000Z',
            },
            {
                attemptId: 'superseded-attempt',
                lifecycleState: 'SUPERSEDED',
                createdAt: '2026-07-23T10:20:00.000Z',
            },
            {
                attemptId: 'newer-retry-attempt',
                lifecycleState: 'IN_PROGRESS',
                createdAt: '2026-07-23T10:25:00.000Z',
            },
            {
                attemptId: 'locked-attempt',
                lifecycleState: 'LOCKED',
                createdAt: '2026-07-23T10:15:00.000Z',
            },
            {
                attemptId: 'reset-source-attempt',
                lifecycleState: 'CLOSED',
                createdAt: '2026-07-23T10:05:00.000Z',
            },
        ];

        const orderedAttemptIds = attempts
            .toSorted((left, right) => {
                const priorityDifference =
                    getMonitoringAttemptLifecyclePriority(left.lifecycleState) -
                    getMonitoringAttemptLifecyclePriority(right.lifecycleState);

                if (priorityDifference !== 0) {
                    return priorityDifference;
                }

                return right.createdAt.localeCompare(left.createdAt);
            })
            .map((attempt) => attempt.attemptId);

        expect(orderedAttemptIds).toEqual([
            'newer-retry-attempt',
            'locked-attempt',
            'superseded-attempt',
            'reset-source-attempt',
            'completed-attempt',
        ]);
    });
});
