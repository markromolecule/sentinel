import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProctorGuideRubricPage from './page';

const mockUseExamsQuery = vi.fn();
const mockUseEssayRubricQuery = vi.fn();
const mockUseUpdateExamEssayRubricMutation = vi.fn();
const mockUseResetExamEssayRubricMutation = vi.fn();

vi.mock('@sentinel/hooks', () => ({
    useExamsQuery: () => mockUseExamsQuery(),
    useEssayRubricQuery: (examId: string) => mockUseEssayRubricQuery(examId),
    useUpdateExamEssayRubricMutation: (args: any) => mockUseUpdateExamEssayRubricMutation(args),
    useResetExamEssayRubricMutation: (args: any) => mockUseResetExamEssayRubricMutation(args),
}));

vi.mock('next/navigation', () => ({
    useSearchParams: () => ({
        get: () => null,
    }),
    useParams: () => ({
        id: 'exam-1',
    }),
}));

vi.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({
        invalidateQueries: vi.fn(),
    }),
}));

vi.mock('@sentinel/ui', async (importOriginal) => {
    const original = await importOriginal<typeof import('@sentinel/ui')>();
    return {
        ...original,
        EssayRubricEditor: ({ initialCriteria, onSave, onReset }: any) => (
            <div data-testid="rubric-editor">
                Rubric Editor with {initialCriteria?.length || 0} criteria
                <button onClick={() => onSave([])}>Save</button>
                {onReset && <button onClick={onReset}>Reset</button>}
            </div>
        ),
    };
});

describe('ProctorGuideRubricPage (Instructor)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseExamsQuery.mockReturnValue({
            isLoading: false,
            data: [],
        });
        mockUseEssayRubricQuery.mockReturnValue({
            isLoading: false,
            data: undefined,
        });
        mockUseUpdateExamEssayRubricMutation.mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        });
        mockUseResetExamEssayRubricMutation.mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders loading state for exams correctly', () => {
        mockUseExamsQuery.mockReturnValue({
            isLoading: true,
        });

        render(<ProctorGuideRubricPage />);
        expect(screen.getByText('Loading exams list...')).toBeTruthy();
    });

    it('renders empty state when instructor has no exams', () => {
        mockUseExamsQuery.mockReturnValue({
            isLoading: false,
            data: [],
        });

        render(<ProctorGuideRubricPage />);
        expect(screen.getByText('No exams found')).toBeTruthy();
    });

    it('renders exam selector and rubric editor when exams are loaded', async () => {
        mockUseExamsQuery.mockReturnValue({
            isLoading: false,
            data: [
                { id: 'exam-1', title: 'English Exam', subject: 'English' },
                { id: 'exam-2', title: 'Math Exam', subject: 'Math' },
            ],
        });

        mockUseEssayRubricQuery.mockReturnValue({
            isLoading: false,
            data: {
                rubricVersionId: 'version-1',
                versionNumber: 2,
                source: 'EXAM_OVERRIDE',
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

        mockUseUpdateExamEssayRubricMutation.mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        });
        mockUseResetExamEssayRubricMutation.mockReturnValue({
            mutateAsync: vi.fn(),
            isPending: false,
        });

        render(<ProctorGuideRubricPage />);
        expect(screen.getByText('Custom Essay Rubrics')).toBeTruthy();
        expect(screen.getByText('Active Selection')).toBeTruthy();
        expect(screen.getByTestId('rubric-editor')).toBeTruthy();
        expect(screen.getByText('Custom Rubric (Version v2)')).toBeTruthy();
    });
});
