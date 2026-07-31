import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EssayRubricSettingsView } from './essay-rubric-settings-view';

const mockUseAccessControlEssayRubricQuery = vi.fn();
const mockUseAccessControlEssayRubricMutation = vi.fn();

vi.mock('@sentinel/hooks', () => ({
    useAccessControlEssayRubricQuery: () => mockUseAccessControlEssayRubricQuery(),
    useAccessControlEssayRubricMutation: () => mockUseAccessControlEssayRubricMutation(),
}));

// Mock the child component EssayRubricEditor to simplify test
vi.mock('@sentinel/ui', async (importOriginal) => {
    const original = await importOriginal<typeof import('@sentinel/ui')>();
    return {
        ...original,
        EssayRubricEditor: ({ initialCriteria }: any) => (
            <div data-testid="rubric-editor">
                Rubric Editor with {initialCriteria?.length || 0} criteria
            </div>
        ),
    };
});

describe('EssayRubricSettingsView', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state correctly', () => {
        mockUseAccessControlEssayRubricQuery.mockReturnValue({
            isLoading: true,
        });
        mockUseAccessControlEssayRubricMutation.mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        });

        render(<EssayRubricSettingsView />);
        expect(screen.getByText('Loading baseline rubric...')).toBeTruthy();
    });

    it('renders error state correctly', () => {
        mockUseAccessControlEssayRubricQuery.mockReturnValue({
            isLoading: false,
            isError: true,
            error: new Error('Database connection failed'),
        });
        mockUseAccessControlEssayRubricMutation.mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        });

        render(<EssayRubricSettingsView />);
        expect(screen.getByText('Failed to load baseline essay rubric')).toBeTruthy();
        expect(screen.getByText('Database connection failed')).toBeTruthy();
    });

    it('renders rubric editor when data is loaded successfully', () => {
        mockUseAccessControlEssayRubricQuery.mockReturnValue({
            isLoading: false,
            isError: false,
            data: {
                rubricVersionId: 'version-1',
                versionNumber: 1,
                source: 'BASELINE',
                definition: {
                    criteria: [
                        {
                            key: 'c1',
                            name: 'Criterion 1',
                            weight: 0.5,
                            description: 'Desc 1',
                            levels: {},
                        },
                        {
                            key: 'c2',
                            name: 'Criterion 2',
                            weight: 0.5,
                            description: 'Desc 2',
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

        render(<EssayRubricSettingsView />);
        expect(screen.getByText('Global Baseline Essay Rubric Definition')).toBeTruthy();
        expect(screen.getByTestId('rubric-editor')).toBeTruthy();
        expect(screen.getByText('Rubric Editor with 2 criteria')).toBeTruthy();
    });
});
