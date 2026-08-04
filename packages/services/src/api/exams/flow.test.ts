import { describe, expect, it, vi } from 'vitest';
import { getExamSessionStatus } from './flow';

describe('exam flow service client', () => {
    it('fetches session status from the lightweight status endpoint', async () => {
        const status = {
            sessionId: 'session-1',
            attemptId: 'attempt-1',
            examId: 'exam-1',
            status: 'IN_PROGRESS',
            lifecycleState: 'IN_PROGRESS',
            completedAt: null,
            closedReason: null,
            terminalMessage: null,
        };
        const apiClient = vi.fn().mockResolvedValue({ data: status });

        await expect(getExamSessionStatus(apiClient as any, 'session-1')).resolves.toBe(status);

        expect(apiClient).toHaveBeenCalledWith('/examination/flow/sessions/session-1/status');
    });
});
