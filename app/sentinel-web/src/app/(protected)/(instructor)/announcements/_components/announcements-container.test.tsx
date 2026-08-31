import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementsContainer } from './announcements-container';
import { useAnnouncementsQuery } from '@sentinel/hooks';

vi.mock('@sentinel/hooks', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        useAnnouncementsQuery: vi.fn(),
    };
});

vi.mock('./announcements-list', () => ({
    AnnouncementsList: ({ announcements }: any) => (
        <div data-testid="announcements-list">
            Mocked List: {announcements.length} announcements
        </div>
    ),
}));

describe('AnnouncementsContainer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders skeleton loaders when loading', () => {
        vi.mocked(useAnnouncementsQuery).mockReturnValue({
            data: undefined,
            isLoading: true,
        } as any);

        const { container } = render(<AnnouncementsContainer />);
        const skeletons = container.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBe(5);
    });

    it('renders empty state when there are no announcements', () => {
        vi.mocked(useAnnouncementsQuery).mockReturnValue({
            data: {
                data: [],
                success: true,
                message: 'Success',
                meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
            },
            isLoading: false,
        } as any);

        render(<AnnouncementsContainer />);
        expect(screen.getByText('No announcements yet.')).toBeDefined();
    });

    it('renders list component when data is fetched successfully', () => {
        vi.mocked(useAnnouncementsQuery).mockReturnValue({
            data: {
                data: [
                    {
                        id: '1',
                        title: 'Ann 1',
                        slug: 'ann-1',
                        content: 'Content 1',
                        published_at: '2026-06-02T12:00:00Z',
                        unpublished_at: null,
                        created_at: '2026-06-02T12:00:00Z',
                        updated_at: '2026-06-02T12:00:00Z',
                        deleted_at: null,
                        author_id: 'auth-1',
                        institution_id: 'inst-1',
                    },
                ],
                success: true,
                message: 'Success',
                meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
            },
            isLoading: false,
        } as any);

        render(<AnnouncementsContainer />);
        expect(screen.getByTestId('announcements-list')).toBeDefined();
        expect(screen.getByText('Mocked List: 1 announcements')).toBeDefined();
    });
});
