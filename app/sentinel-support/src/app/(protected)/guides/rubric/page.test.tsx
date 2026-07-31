import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SupportGuideRubricPage from './page';

const mockUseAccessControlEssayRubricQuery = vi.fn();
const mockUseAccessControlEssayRubricMutation = vi.fn();

vi.mock('@sentinel/hooks', () => ({
    useAccessControlEssayRubricQuery: () => mockUseAccessControlEssayRubricQuery(),
    useAccessControlEssayRubricMutation: (args: any) => mockUseAccessControlEssayRubricMutation(args),
}));

vi.mock('@sentinel/ui', async (importOriginal) => {
    const original = await importOriginal<typeof import('@sentinel/ui')>();
    return {
        ...original,
        EssayRubricEditor: ({ initialCriteria, onSave }: any) => (
            <div data-testid="rubric-editor">
                Rubric Editor with {initialCriteria?.length || 0} criteria
                <button onClick={() => onSave([])}>Save</button>
            </div>
        ),
    };
});

describe('SupportGuideRubricPage (Global Baseline)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAccessControlEssayRubricQuery.mockReturnValue({
            isLoading: false,
            data: undefined,
        });
        mockUseAccessControlEssayRubricMutation.mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders loading state for baseline rubric correctly', () => {
        mockUseAccessControlEssayRubricQuery.mockReturnValue({
            isLoading: true,
        });

        render(<SupportGuideRubricPage />);
        expect(screen.getByText('Loading system baseline rubric...')).toBeTruthy();
    });

    it('renders error state when loading baseline fails', () => {
        mockUseAccessControlEssayRubricQuery.mockReturnValue({
            isError: true,
            error: new Error('Network error'),
        });

        render(<SupportGuideRubricPage />);
        expect(screen.getByText('Failed to load system baseline rubric')).toBeTruthy();
        expect(screen.getByText('Network error')).toBeTruthy();
    });

    it('renders rubric editor workspace when baseline is loaded', async () => {
        mockUseAccessControlEssayRubricQuery.mockReturnValue({
            isLoading: false,
            data: {
                rubricVersionId: 'baseline-version-1',
                versionNumber: 1,
                source: 'BASELINE',
                definition: {
                    criteria: [
                        {
                            key: 'c1',
                            name: 'Criterion 1',
                            weight: 1.0,
                            description: '',
                            levels: {},
                        },
                    ],
                },
                canOverride: true,
            },
        });

        mockUseAccessControlEssayRubricMutation.mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        });

        render(<SupportGuideRubricPage />);
        expect(screen.getByText('Global Essay Rubric Baseline')).toBeTruthy();
        expect(screen.getByTestId('rubric-editor')).toBeTruthy();
        expect(screen.getByText('Rubric Editor with 1 criteria')).toBeTruthy();
    });
});
