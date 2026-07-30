import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstructorNotificationDropdown } from './instructor-notification-dropdown';
import { markNotificationRead } from '@sentinel/services';

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
        push: vi.fn(),
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

function createWrapper() {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    queryClient.setQueryDefaults(['notifications', 'instructor-header'], {
        queryFn: async () => null,
    });

    return function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    };
}

function buildNotification(overrides?: Record<string, unknown>) {
    return {
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Subject request approved',
        message: 'Alex approved 3 pending subject requests.',
        status: 'UNREAD',
        actionType: 'SUBJECT_ENROLLMENT_REQUEST_APPROVED',
        institutionId: '22222222-2222-2222-2222-222222222222',
        actor: {
            id: '33333333-3333-3333-3333-333333333333',
            name: 'Alex Admin',
        },
        resource: {
            type: 'SUBJECT_ENROLLMENT_REQUEST',
            id: '44444444-4444-4444-4444-444444444444',
            label: 'Programming Languages',
        },
        metadata: {
            requestIds: ['44444444-4444-4444-4444-444444444444'],
        },
        createdAt: '2026-05-10T08:00:00.000Z',
        readAt: null,
        ...overrides,
    };
}

describe('InstructorNotificationDropdown', () => {
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

    it('renders unread notifications from the API', async () => {
        mockUseNotificationsQuery.mockReturnValue({
            data: {
                items: [buildNotification()],
                unreadCount: 1,
            },
            isLoading: false,
        });

        render(<InstructorNotificationDropdown />, {
            wrapper: createWrapper(),
        });

        const trigger = await openNotifications();
        expect(trigger).toBeTruthy();

        expect(await screen.findByText('Subject request approved')).toBeTruthy();
        expect(screen.getByText('Alex approved 3 pending subject requests.')).toBeTruthy();
        expect(screen.getByText('1 new')).toBeTruthy();
    });

    it('marks an unread notification as read when the row is selected', async () => {
        mockUseNotificationsQuery.mockReturnValue({
            data: {
                items: [buildNotification()],
                unreadCount: 1,
            },
            isLoading: false,
        });

        render(<InstructorNotificationDropdown />, {
            wrapper: createWrapper(),
        });

        await openNotifications();

        const item = await screen.findByText('Subject request approved');
        fireEvent.click(item);

        await waitFor(() => {
            expect(markNotificationRead).toHaveBeenCalledWith(
                mockApiClient,
                '11111111-1111-1111-1111-111111111111',
            );
        });
    });

    it('renders an empty state when there are no notifications', async () => {
        render(<InstructorNotificationDropdown />, {
            wrapper: createWrapper(),
        });

        await openNotifications();

        expect(await screen.findByText('No notifications yet.')).toBeTruthy();
    });

    it('hides the notification surface when the role is forbidden', async () => {
        mockUseNotificationsQuery.mockReturnValue({
            data: {
                items: [],
                unreadCount: 0,
                forbidden: true,
            },
            isLoading: false,
        });

        render(<InstructorNotificationDropdown />, {
            wrapper: createWrapper(),
        });

        await waitFor(() => {
            expect(screen.queryByRole('button', { name: 'Open notifications' })).toBeNull();
        });
    });

    it('lets the user select notifications and remove them in bulk', async () => {
        mockUseNotificationsQuery.mockReturnValue({
            data: {
                items: [
                    buildNotification(),
                    buildNotification({
                        id: '22222222-2222-2222-2222-222222222222',
                        title: 'Subject request rejected',
                        message: 'A subject request was rejected after review.',
                    }),
                ],
                unreadCount: 2,
            },
            isLoading: false,
        });
        const mutate = vi.fn((ids: string[], options?: { onSuccess?: () => void }) => {
            options?.onSuccess?.();
        });
        mockUseDeleteNotificationsMutation.mockReturnValue({
            mutate,
            isPending: false,
        });

        render(<InstructorNotificationDropdown />, {
            wrapper: createWrapper(),
        });

        await openNotifications();

        const checkbox = await screen.findByRole('checkbox', {
            name: 'Select notification Subject request approved',
        });
        expect(screen.getByRole('button', { name: 'Remove selected notifications' }).disabled).toBe(
            true,
        );

        fireEvent.click(checkbox);

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Remove selected notifications' }).disabled,
            ).toBe(false);
        });

        fireEvent.click(screen.getByRole('button', { name: 'Remove selected notifications' }));

        expect(mutate).toHaveBeenCalledWith(['11111111-1111-1111-1111-111111111111'], {
            onSuccess: expect.any(Function),
        });

        await waitFor(() => {
            expect(
                screen.getByRole('button', { name: 'Remove selected notifications' }).disabled,
            ).toBe(true);
        });
    });
});
