import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProctorExam } from '@sentinel/shared/types';
import { toast } from 'sonner';
import { useExamCard } from './index';

const { mockHasPermission } = vi.hoisted(() => ({
    mockHasPermission: vi.fn(),
}));

vi.mock('@sentinel/hooks', () => ({
    useActivePermissions: () => ({
        hasPermission: mockHasPermission,
    }),
    useDeleteExamMutation: () => ({
        mutate: vi.fn(),
    }),
    useUpdateExamStatusMutation: () => ({
        mutate: vi.fn(),
        isPending: false,
    }),
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const baseExam: ProctorExam = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Algorithms Final',
    description: '',
    duration: 90,
    passingScore: 75,
    status: 'published',
    questions: [],
    questionSections: [],
    createdAt: '2026-04-22T00:00:00.000Z',
    updatedAt: '2026-04-22T00:00:00.000Z',
    subject: 'Data Structures',
    questionCount: 0,
    studentsCount: 0,
};

function renderActions(status: ProctorExam['status'], canExportAnswerKey: boolean) {
    mockHasPermission.mockImplementation((permission: string) => {
        if (permission === 'examinations:export_answer_key') {
            return canExportAnswerKey;
        }

        return false;
    });

    const { result } = renderHook(() =>
        useExamCard({
            exam: {
                ...baseExam,
                status,
            },
        }),
    );

    return result.current.primaryActions;
}

describe('useExamCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it.each(['draft', 'published', 'active', 'archived', 'scheduled'] as ProctorExam['status'][])(
        'shows the canonical answer-key export action for %s exams when permission is granted',
        (status) => {
            const actions = renderActions(status, true);
            const exportAction = actions.find((action) => action.href?.endsWith('/export'));

            expect(exportAction).toMatchObject({
                label: 'Export Answer Key PDF',
                href: `/exams/${baseExam.id}/export`,
                variant: 'outline',
            });
            expect(exportAction?.onClick).toBeUndefined();
            expect(toast.success).not.toHaveBeenCalledWith('Preparing PDF export.');
        },
    );

    it.each(['draft', 'published', 'active', 'archived', 'scheduled'] as ProctorExam['status'][])(
        'hides the answer-key export action for %s exams when permission is revoked',
        (status) => {
            const actions = renderActions(status, false);

            expect(actions.some((action) => action.href === `/exams/${baseExam.id}/export`)).toBe(
                false,
            );
            expect(actions.map((action) => action.label)).not.toContain('Export PDF');
            expect(actions.map((action) => action.label)).not.toContain('Export Answer Key PDF');
        },
    );
});
