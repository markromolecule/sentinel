import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import RetiredQuestionsPage from './page';
import type { QuestionTableItem } from '../../_components/tables/columns';

const mockPush = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

vi.mock('@sentinel/ui', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        DropdownMenu: ({ children }: any) => <div>{children}</div>,
        DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
        DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
        DropdownMenuItem: ({ children, onClick }: any) => (
            <button onClick={onClick}>{children}</button>
        ),
    };
});

const mockUpdateMutateAsync = vi.hoisted(() => vi.fn());
const mockDeleteMutateAsync = vi.hoisted(() => vi.fn());

const mockRetiredQuestions = vi.hoisted(() => [
    {
        id: 'q-1',
        prompt: 'What is 2+2?',
        type: 'MULTIPLE_CHOICE' as const,
        difficulty: 'EASY' as const,
        points: 1,
        status: 'RETIRED' as const,
        tags: ['Math'],
        content: {
            prompt: 'What is 2+2?',
            choices: [
                { id: 'c-1', text: '4', isCorrect: true },
                { id: 'c-2', text: '5', isCorrect: false },
            ],
        },
        sourceOrigin: 'MANUAL' as const,
        createdAt: '2026-06-10T12:00:00Z',
        updatedAt: '2026-06-10T12:00:00Z',
    },
]);

vi.mock('@sentinel/hooks', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        useQuestionsQuery: vi.fn().mockReturnValue({
            data: {
                items: mockRetiredQuestions,
                total: 1,
                totalPages: 1,
            },
            isLoading: false,
            isFetching: false,
        }),
        useUpdateQuestionMutation: vi.fn().mockReturnValue({
            mutateAsync: mockUpdateMutateAsync,
            isPending: false,
        }),
        useDeleteQuestionMutation: vi.fn().mockReturnValue({
            mutateAsync: mockDeleteMutateAsync,
            isPending: false,
        }),
        useActivePermissions: vi.fn().mockReturnValue({
            hasPermission: vi.fn().mockReturnValue(true),
            permissions: [],
            isLoading: false,
        }),
        useStableValue: (fn: () => any) => fn(),
        useServerPagination: vi.fn((watchDeps, initialState = { pageIndex: 0, pageSize: 10 }) => {
            const [pagination, setPagination] = require('react').useState(initialState);
            return { pagination, setPagination };
        }),
    };
});

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('RetiredQuestionsPage', () => {
    it('renders the header and table with retired questions', () => {
        render(<RetiredQuestionsPage />);

        expect(screen.getByText('Retired Questions')).toBeDefined();
        expect(screen.getByText(/Manage questions that have been retired/)).toBeDefined();
        expect(screen.getByText('What is 2+2?')).toBeDefined();
    });

    it('navigates back to TOS Matrix on back button click', () => {
        render(<RetiredQuestionsPage />);

        const backBtn = screen.getByRole('button', { name: /Back to TOS Matrix/i });
        fireEvent.click(backBtn);

        expect(mockPush).toHaveBeenCalledWith('/question/bank/tos');
    });

    it('triggers update mutation with ACTIVE status when restoring a question', async () => {
        render(<RetiredQuestionsPage />);

        // DropdownMenu is mocked inline, so the Restore button is immediately visible
        const restoreOption = screen.getByRole('button', { name: 'Restore' });
        expect(restoreOption).toBeDefined();

        fireEvent.click(restoreOption);

        expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
            id: 'q-1',
            payload: { status: 'ACTIVE' },
        });
    });
});
