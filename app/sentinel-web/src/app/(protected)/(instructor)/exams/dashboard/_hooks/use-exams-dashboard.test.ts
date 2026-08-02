import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useExamsDashboard } from './use-exams-dashboard';

const mockUseProctorExams = vi.fn();

vi.mock('next/navigation', () => ({
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@sentinel/hooks', () => ({
    useStableValue: (factory: () => unknown) => factory(),
}));

vi.mock('@/features/exams', () => ({
    useProctorExams: () => mockUseProctorExams(),
}));

function makeExam(id: string, status: string) {
    return { id, status };
}

describe('useExamsDashboard', () => {
    beforeEach(() => {
        mockUseProctorExams.mockReturnValue({
            exams: [
                makeExam('published-1', 'published'),
                makeExam('active-1', 'active'),
                makeExam('draft-1', 'draft'),
                makeExam('archived-1', 'archived'),
            ],
            isLoading: false,
        });
    });

    it('counts All as every fetched exam while keeping status tabs segmented', () => {
        const { result } = renderHook(() => useExamsDashboard());

        expect(result.current.examsByTab.all).toHaveLength(4);
        expect(result.current.examsByTab.published).toHaveLength(2);
        expect(result.current.examsByTab.drafts).toHaveLength(1);
        expect(result.current.examsByTab.archived).toHaveLength(1);
    });
});
