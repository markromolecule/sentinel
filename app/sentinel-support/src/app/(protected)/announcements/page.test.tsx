import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AnnouncementsPage from './page';
import { useActivePermissions } from '@sentinel/hooks';

vi.mock('@sentinel/hooks', () => ({
    useActivePermissions: vi.fn(),
}));

vi.mock('@sentinel/ui', async (importOriginal) => {
    const actual = (await importOriginal()) as any;

    return {
        ...actual,
        PageHeader: ({ title, description, children }: any) => (
            <div>
                <h1>{title}</h1>
                <p>{description}</p>
                {children}
            </div>
        ),
        Separator: () => <div data-testid="separator" />,
    };
});

vi.mock('./_components/add-announcement-dialog', () => ({
    AddAnnouncementDialog: () => <button>Post Announcement</button>,
}));

vi.mock('./_components/announcements-container', () => ({
    AnnouncementsContainer: () => <div data-testid="announcements-container" />,
}));

describe('AnnouncementsPage', () => {
    beforeEach(() => {
        vi.mocked(useActivePermissions).mockReturnValue({
            hasPermission: (permissionKey: string) => permissionKey === 'announcement:create',
        } as any);
    });

    it('renders the post announcement button when the user can create announcements', () => {
        render(<AnnouncementsPage />);

        expect(screen.getByRole('button', { name: /Post Announcement/i })).toBeTruthy();
    });

    it('hides the post announcement button when the user lacks create permission', () => {
        vi.mocked(useActivePermissions).mockReturnValue({
            hasPermission: () => false,
        } as any);

        render(<AnnouncementsPage />);

        expect(screen.queryByRole('button', { name: /Post Announcement/i })).toBeNull();
    });
});
