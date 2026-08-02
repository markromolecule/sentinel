import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProctorExams } from './use-proctor-exams';

const mockUseExamsQuery = vi.fn();

vi.mock('@sentinel/hooks', async () => {
    const actual = await vi.importActual<typeof import('@sentinel/hooks')>('@sentinel/hooks');
    return {
        ...actual,
        useExamsQuery: (...args: Parameters<typeof actual.useExamsQuery>) =>
            mockUseExamsQuery(...args),
    };
});

describe('useProctorExams', () => {
    beforeEach(() => {
        mockUseExamsQuery.mockReset();
        mockUseExamsQuery.mockReturnValue({
            data: [],
            isLoading: false,
        });
    });

    it('requests the maximum dashboard page size so counts include all current exams', () => {
        renderHook(() => useProctorExams());

        expect(mockUseExamsQuery).toHaveBeenCalledWith({ limit: 100 });
    });
});
