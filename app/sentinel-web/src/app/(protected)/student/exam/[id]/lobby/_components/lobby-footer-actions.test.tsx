import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LobbyFooterActions } from './lobby-footer-actions';
import type { LobbyFooterActionsProps } from './lobby-footer-actions';

vi.mock('../../../_components/student-flow-primitives', () => ({
    StudentFlowFooterActions: ({
        primaryLabel,
        primaryDisabled,
    }: {
        primaryLabel: string;
        primaryDisabled?: boolean;
    }) => (
        <button type="button" disabled={primaryDisabled}>
            {primaryLabel}
        </button>
    ),
}));

function renderFooter(overrides?: Partial<LobbyFooterActionsProps>) {
    const props = {
        examId: 'exam-1',
        isStartingSession: false,
        runtimeAccess: {
            state: 'lobby_approved',
            reasonCode: 'LOBBY_APPROVED',
            message: 'Approved.',
            canStart: true,
            canResume: false,
            hasActiveAttempt: false,
            startsAt: null,
            endsAt: null,
            reopenedUntil: null,
        },
        admissionStatus: 'APPROVED',
        storedSession: null,
        hasCompletedFlow: true,
        canEnterExam: true,
        onEnterExam: vi.fn(),
        ...overrides,
    } satisfies LobbyFooterActionsProps;

    render(<LobbyFooterActions {...props} />);
}

describe('LobbyFooterActions', () => {
    it('enables continuing to a fresh approved attempt when entry checks pass', () => {
        renderFooter();

        const button = screen.getByRole<HTMLButtonElement>('button', {
            name: 'Continue to Attempt',
        });

        expect(button.disabled).toBe(false);
    });

    it('labels approved resumable runtime access as resume exam', () => {
        renderFooter({
            runtimeAccess: {
                state: 'lobby_approved',
                reasonCode: 'LOBBY_APPROVED',
                message: 'Approved to resume.',
                canStart: false,
                canResume: true,
                hasActiveAttempt: true,
                startsAt: null,
                endsAt: null,
                reopenedUntil: null,
            },
        });

        const button = screen.getByRole<HTMLButtonElement>('button', { name: 'Resume Exam' });

        expect(button.disabled).toBe(false);
    });
});
