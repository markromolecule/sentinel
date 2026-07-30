import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebNotificationDropdown } from './web-notification-dropdown';
import { markNotificationRead, markAllNotificationsRead } from '@sentinel/services';

const mockPush = vi.fn();

const { mockApiClient, mockUseNotificationsQuery, mockUseDeleteNotificationsMutation } = vi.hoisted(
    () => ({
        mockApiClient: vi.fn(),
        mockUseNotificationsQuery: vi.fn(),
        mockUseDeleteNotificationsMutation: vi.fn(),
    }),
);

vi.mock('@sentinel/hooks', () => ({
    useApi: () => mockApiClient,
    useNotificationRealtime: vi.fn(),
    useNotificationsQuery: (...args: any[]) => mockUseNotificationsQuery(...args),
    useDeleteNotificationsMutation: (...args: any[]) => mockUseDeleteNotificationsMutation(...args),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
    }),
}));

vi.mock('@sentinel/services', async () => {
    const actual = await vi.importActual<typeof import('@sentinel/services')>('@sentinel/services');

    return {
        ...actual,
        markNotificationRead: vi.fn(),
        markAllNotificationsRead: vi.fn(),
    };
});

function createWrapper(queryKey: readonly string[]) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    queryClient.setQueryDefaults(queryKey as any, {
        queryFn: async () => null,
    });

    return function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

function buildNotification(overrides?: Record<string, unknown>) {
    return {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Notification title',
        message: 'Notification message details.',
        status: 'UNREAD',
        actionType: 'ANNOUNCEMENT_CREATED',
        institutionId: '22222222-2222-2222-2222-222222222222',
        actor: {
            id: '33333333-3333-3333-3333-333333333333',
            name: 'Actor name',
        },
        resource: {
            type: 'ANNOUNCEMENT',
            id: '44444444-4444-4444-4444-444444444444',
            label: 'Announcement label',
        },
        createdAt: '2026-05-10T08:00:00.000Z',
        readAt: null,
        ...overrides,
    };
}

describe('WebNotificationDropdown', () => {
    const testQueryKey = ['notifications', 'test-header'] as const;

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseNotificationsQuery.mockReturnValue({
            data: {
                items: [],
                unreadCount: 0,
            },
            isLoading: false,
        });
        mockUseDeleteNotificationsMutation.mockReturnValue({
            mutate: vi.fn((ids: string[], options?: { onSuccess?: () => void }) => {
                options?.onSuccess?.();
            }),
            isPending: false,
        });
    });

    afterEach(() => {
        cleanup();
    });

    async function openNotifications() {
        const trigger = await screen.findByRole('button', { name: 'Open notifications' });
        fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
        fireEvent.click(trigger);
        return trigger;
    }

    it('renders null when loading', () => {
        mockUseNotificationsQuery.mockReturnValue({
            data: undefined,
            isLoading: true,
        });

        const { container } = render(<WebNotificationDropdown queryKey={testQueryKey} />, {
            wrapper: createWrapper(testQueryKey),
        });

        expect(container.firstChild).toBeNull();
    });

    it('renders null when forbidden', () => {
        mockUseNotificationsQuery.mockReturnValue({
            data: {
                items: [],
                unreadCount: 0,
                forbidden: true,
            },
            isLoading: false,
        });

        const { container } = render(<WebNotificationDropdown queryKey={testQueryKey} />, {
            wrapper: createWrapper(testQueryKey),
        });

        expect(container.firstChild).toBeNull();
    });

    it('renders empty state when there are no notifications', async () => {
        render(<WebNotificationDropdown queryKey={testQueryKey} />, {
            wrapper: createWrapper(testQueryKey),
        });

        await openNotifications();
        expect(await screen.findByText('No notifications yet.')).toBeTruthy();
    });

    it('renders list of notifications with unread badge count', async () => {
        mockUseNotificationsQuery.mockReturnValue({
            data: {
                items: [buildNotification()],
                unreadCount: 1,
            },
            isLoading: false,
        });

        render(<WebNotificationDropdown queryKey={testQueryKey} />, {
            wrapper: createWrapper(testQueryKey),
        });

        const trigger = await openNotifications();
        expect(trigger.querySelector('.bg-destructive')?.textContent).toBe('1');
        expect(await screen.findByText('Notification title')).toBeTruthy();
        expect(screen.getByText('Notification message details.')).toBeTruthy();
        expect(screen.getByText('1 new')).toBeTruthy();
    });

    it('displays 99+ when unread count exceeds 99', async () => {
        mockUseNotificationsQuery.mockReturnValue({
            data: {
                items: [buildNotification()],
                unreadCount: 150,
            },
            isLoading: false,
        });

        render(<WebNotificationDropdown queryKey={testQueryKey} />, {
            wrapper: createWrapper(testQueryKey),
        });

        const trigger = await screen.findByRole('button', { name: 'Open notifications' });
        expect(trigger.querySelector('.bg-destructive')?.textContent).toBe('99+');
    });

    it('marks notification as read on click and routes to destination if resolved', async () => {
        const resolveNotificationHref = vi.fn().mockReturnValue('/student/classroom');
        mockUseNotificationsQuery.mockReturnValue({
            data: {
                items: [buildNotification()],
                unreadCount: 1,
            },
            isLoading: false,
        });

        render(
            <WebNotificationDropdown
                queryKey={testQueryKey}
                resolveNotificationHref={resolveNotificationHref}
            />,
            {
                wrapper: createWrapper(testQueryKey),
            },
        );

        await openNotifications();
        const item = await screen.findByText('Notification title');
        fireEvent.click(item);

        await waitFor(() => {
            expect(markNotificationRead).toHaveBeenCalledWith(
                mockApiClient,
                '11111111-1111-1111-1111-111111111111',
            );
        });
        expect(resolveNotificationHref).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/student/classroom');
    });

    it('marks all as read when button is clicked', async () => {
        mockUseNotificationsQuery.mockReturnValue({
            data: {
                items: [buildNotification()],
                unreadCount: 1,
            },
            isLoading: false,
        });

        render(<WebNotificationDropdown queryKey={testQueryKey} />, {
            wrapper: createWrapper(testQueryKey),
        });

        await openNotifications();
        const markAllBtn = await screen.findByRole('button', { name: 'Mark all as read' });
        fireEvent.click(markAllBtn);

        await waitFor(() => {
            expect(markAllNotificationsRead).toHaveBeenCalledWith(mockApiClient);
        });
    });

    it('supports selecting and bulk-deleting notifications', async () => {
        mockUseNotificationsQuery.mockReturnValue({
            data: {
                items: [
                    buildNotification(),
                    buildNotification({
                        id: '22222222-2222-2222-2222-222222222222',
                        title: 'Second Notification',
                    }),
                ],
                unreadCount: 2,
            },
            isLoading: false,
        });

        render(<WebNotificationDropdown queryKey={testQueryKey} />, {
            wrapper: createWrapper(testQueryKey),
        });

        await openNotifications();

        const checkbox = await screen.findByRole('checkbox', {
            name: 'Select notification Notification title',
        });
        const deleteBtn = screen.getByRole('button', { name: 'Remove selected notifications' });
        expect((deleteBtn as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(checkbox);
        expect((deleteBtn as HTMLButtonElement).disabled).toBe(false);

        fireEvent.click(deleteBtn);
        expect(mockUseDeleteNotificationsMutation().mutate).toHaveBeenCalledWith(
            ['11111111-1111-1111-1111-111111111111'],
            expect.any(Object),
        );
    });

    it('renders view all link if viewAllHref is provided', async () => {
        mockUseNotificationsQuery.mockReturnValue({
            data: {
                items: [buildNotification()],
                unreadCount: 1,
            },
            isLoading: false,
        });

        render(
            <WebNotificationDropdown
                queryKey={testQueryKey}
                viewAllHref="/student/notifications"
            />,
            {
                wrapper: createWrapper(testQueryKey),
            },
        );

        await openNotifications();
        const viewAllLink = await screen.findByRole('menuitem', { name: 'View all notifications' });
        expect(viewAllLink.getAttribute('href')).toBe('/student/notifications');
    });
});
