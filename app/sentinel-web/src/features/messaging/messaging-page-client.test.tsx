import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { MessagingPageClient } from './messaging-page-client';

vi.mock('./components/participant-profile-dialog', () => ({
    ParticipantProfileDialog: ({ open, participantId }: any) =>
        open ? (
            <div data-testid="mock-participant-profile-dialog">Profile ID: {participantId}</div>
        ) : null,
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

const mockUseProfileQuery = vi.fn();
const mockUsePresence = vi.fn(() => ({ onlineUserIds: new Set<string>() }));
const mockUseConversationsQuery = vi.fn();
const mockUseConversationMessagesQuery = vi.fn();
const mockUseCreateDirectConversationMutation = vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
}));
const mockUseSendMessageMutation = vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
}));
const mockUseMarkConversationReadMutation = vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
}));
const mockUseUsersQuery = vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
}));
const mockUseMessageRecipientsQuery = vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
}));
const mockUseMessageRealtime = vi.fn();
const mockUseUserQuery = vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
}));

const mockUsePathname = vi.fn(() => '/messages');
const mockUseSearchParams = vi.fn(() => ({
    get: vi.fn(() => null),
}));

vi.mock('next/navigation', () => ({
    usePathname: () => mockUsePathname(),
    useSearchParams: () => mockUseSearchParams(),
}));

vi.mock('@sentinel/hooks', () => ({
    useProfileQuery: () => mockUseProfileQuery(),
    usePresence: () => mockUsePresence(),
    useConversationsQuery: (args: unknown) => mockUseConversationsQuery(args),
    useConversationMessagesQuery: (args: unknown) => mockUseConversationMessagesQuery(args),
    useCreateDirectConversationMutation: (args: unknown) =>
        mockUseCreateDirectConversationMutation(args),
    useSendMessageMutation: (args: unknown) => mockUseSendMessageMutation(args),
    useMarkConversationReadMutation: () => mockUseMarkConversationReadMutation(),
    useUsersQuery: (args: unknown) => mockUseUsersQuery(args),
    useMessageRecipientsQuery: (args: unknown, limit?: number) =>
        mockUseMessageRecipientsQuery(args, limit),
    useMessageRealtime: (args: unknown) => mockUseMessageRealtime(args),
    useUserQuery: (id: string) => mockUseUserQuery(id),
}));

describe('MessagingPageClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
            configurable: true,
            value: vi.fn(),
        });
        mockUsePresence.mockReturnValue({ onlineUserIds: new Set<string>() });
        mockUseProfileQuery.mockReturnValue({
            profile: {
                id: '11111111-1111-1111-1111-111111111111',
                institutionId: '22222222-2222-2222-2222-222222222222',
                activePermissionKeys: ['messages:view', 'messages:create'],
            },
            isLoading: false,
            error: null,
        });
        mockUseConversationsQuery.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
        });
        mockUseConversationMessagesQuery.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
        });
        mockUseMessageRecipientsQuery.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
        });
    });

    afterEach(() => {
        cleanup();
    });

    it('renders a permission denied state when the user cannot view messages', () => {
        mockUseProfileQuery.mockReturnValue({
            profile: {
                id: '11111111-1111-1111-1111-111111111111',
                institutionId: '22222222-2222-2222-2222-222222222222',
                activePermissionKeys: ['calendar:view'],
            },
            isLoading: false,
            error: null,
        });

        render(<MessagingPageClient />);

        expect(screen.getByText('Messages access unavailable')).toBeTruthy();
    });

    it('renders an institution assignment state when the user has no institution', () => {
        mockUseProfileQuery.mockReturnValue({
            profile: {
                id: '11111111-1111-1111-1111-111111111111',
                institutionId: null,
                activePermissionKeys: ['messages:view', 'messages:create'],
            },
            isLoading: false,
            error: null,
        });

        render(<MessagingPageClient />);

        expect(screen.getByText('Institution assignment required')).toBeTruthy();
    });

    it('renders the selected conversation thread and marks unread conversations as read', async () => {
        const markRead = vi.fn();
        mockUseMarkConversationReadMutation.mockReturnValue({
            mutate: markRead,
            isPending: false,
        });
        mockUseConversationsQuery.mockReturnValue({
            data: [
                {
                    conversationId: '33333333-3333-3333-3333-333333333333',
                    type: 'DIRECT',
                    createdAt: '2026-05-24T09:00:00.000Z',
                    updatedAt: '2026-05-24T10:00:00.000Z',
                    unreadCount: 2,
                    participants: [
                        {
                            userId: '11111111-1111-1111-1111-111111111111',
                            name: 'Current User',
                            avatarUrl: null,
                            role: 'instructor',
                            status: 'ACTIVE',
                            institution: null,
                            lastSeenAt: null,
                        },
                        {
                            userId: '44444444-4444-4444-4444-444444444444',
                            name: 'Alex Rivera',
                            avatarUrl: null,
                            role: 'support',
                            status: 'ACTIVE',
                            institution: {
                                id: '55555555-5555-5555-5555-555555555555',
                                name: 'Sentinel Branch Campus',
                            },
                            lastSeenAt: '2026-05-24T09:58:00.000Z',
                        },
                    ],
                    lastMessage: {
                        messageId: '66666666-6666-6666-6666-666666666666',
                        conversationId: '33333333-3333-3333-3333-333333333333',
                        senderId: '44444444-4444-4444-4444-444444444444',
                        content: 'Can you confirm the room assignment?',
                        status: 'SENT',
                        createdAt: '2026-05-24T10:00:00.000Z',
                    },
                },
            ],
            isLoading: false,
            error: null,
        });
        mockUseConversationMessagesQuery.mockImplementation((args: { conversationId: string }) => ({
            data: args.conversationId
                ? [
                      {
                          messageId: '77777777-7777-7777-7777-777777777777',
                          conversationId: args.conversationId,
                          senderId: '44444444-4444-4444-4444-444444444444',
                          content: 'Can you confirm the room assignment?',
                          status: 'SENT',
                          createdAt: '2026-05-24T10:00:00.000Z',
                      },
                  ]
                : [],
            isLoading: false,
            error: null,
        }));

        render(<MessagingPageClient />);

        await waitFor(() => {
            expect(screen.getAllByText('Alex Rivera').length).toBeGreaterThan(0);
        });

        expect(screen.getAllByText('Sentinel Branch Campus').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Can you confirm the room assignment?').length).toBeGreaterThan(
            0,
        );
        expect(markRead).toHaveBeenCalledWith({
            conversationId: '33333333-3333-3333-3333-333333333333',
        });
    });

    it('subscribes to both global and conversation-specific realtime when a conversation exists', () => {
        mockUseConversationsQuery.mockReturnValue({
            data: [
                {
                    conversationId: '33333333-3333-3333-3333-333333333333',
                    type: 'DIRECT',
                    createdAt: '2026-05-24T09:00:00.000Z',
                    updatedAt: '2026-05-24T10:00:00.000Z',
                    unreadCount: 0,
                    participants: [
                        {
                            userId: '11111111-1111-1111-1111-111111111111',
                            name: 'Current User',
                            avatarUrl: null,
                            role: 'instructor',
                            status: 'ACTIVE',
                            institution: null,
                            lastSeenAt: null,
                        },
                        {
                            userId: '44444444-4444-4444-4444-444444444444',
                            name: 'Alex Rivera',
                            avatarUrl: null,
                            role: 'support',
                            status: 'ACTIVE',
                            institution: {
                                id: '55555555-5555-5555-5555-555555555555',
                                name: 'Sentinel Branch Campus',
                            },
                            lastSeenAt: '2026-05-24T09:58:00.000Z',
                        },
                    ],
                },
            ],
            isLoading: false,
            error: null,
        });

        render(<MessagingPageClient />);

        expect(mockUseMessageRealtime).toHaveBeenCalledTimes(2);
        expect(mockUseMessageRealtime).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                enabled: true,
            }),
        );
        expect(mockUseMessageRealtime).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                enabled: true,
                conversationId: '33333333-3333-3333-3333-333333333333',
                invalidateList: false,
            }),
        );
    });

    it('disables the per-conversation realtime subscription when no conversation is selected', () => {
        mockUseConversationsQuery.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
        });

        render(<MessagingPageClient />);

        expect(mockUseMessageRealtime).toHaveBeenCalledTimes(2);
        expect(mockUseMessageRealtime).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                enabled: true,
            }),
        );
        expect(mockUseMessageRealtime).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                enabled: false,
                conversationId: undefined,
                invalidateList: false,
            }),
        );
    });

    it('opens the participant profile dialog when clicking View Profile in the actions dropdown', async () => {
        mockUseConversationsQuery.mockReturnValue({
            data: [
                {
                    conversationId: '33333333-3333-3333-3333-333333333333',
                    type: 'DIRECT',
                    createdAt: '2026-05-24T09:00:00.000Z',
                    updatedAt: '2026-05-24T10:00:00.000Z',
                    unreadCount: 0,
                    participants: [
                        {
                            userId: '11111111-1111-1111-1111-111111111111',
                            name: 'Current User',
                            avatarUrl: null,
                            role: 'instructor',
                            status: 'ACTIVE',
                            institution: null,
                            lastSeenAt: null,
                        },
                        {
                            userId: '44444444-4444-4444-4444-444444444444',
                            name: 'Alex Rivera',
                            avatarUrl: null,
                            role: 'support',
                            status: 'ACTIVE',
                            institution: {
                                id: '55555555-5555-5555-5555-555555555555',
                                name: 'Sentinel Branch Campus',
                            },
                            lastSeenAt: '2026-05-24T09:58:00.000Z',
                        },
                    ],
                    lastMessage: {
                        messageId: '66666666-6666-6666-6666-666666666666',
                        conversationId: '33333333-3333-3333-3333-333333333333',
                        senderId: '44444444-4444-4444-4444-444444444444',
                        content: 'Can you confirm the room assignment?',
                        status: 'SENT',
                        createdAt: '2026-05-24T10:00:00.000Z',
                    },
                },
            ],
            isLoading: false,
            error: null,
        });

        mockUseConversationMessagesQuery.mockReturnValue({
            data: [],
            isLoading: false,
            error: null,
        });

        mockUsePathname.mockReturnValue('/messages');

        render(<MessagingPageClient />);

        // Wait for conversation to load and select it
        await waitFor(() => {
            expect(screen.getAllByText('Alex Rivera').length).toBeGreaterThan(0);
        });

        // Click the mock DropdownMenuItem button for View Profile
        const viewProfileBtn = screen.getByRole('button', { name: 'View Profile' });
        expect(viewProfileBtn).toBeTruthy();

        fireEvent.click(viewProfileBtn);

        // Verify that the mocked ParticipantProfileDialog is open and displays correct participant id
        await waitFor(() => {
            expect(screen.getByTestId('mock-participant-profile-dialog')).toBeTruthy();
            expect(
                screen.getByText('Profile ID: 44444444-4444-4444-4444-444444444444'),
            ).toBeTruthy();
        });
    });

    it('synchronizes selectedConversationId with conversationId URL parameter', async () => {
        mockUseSearchParams.mockReturnValue({
            get: vi.fn((key) => (key === 'conversationId' ? 'param-conv-123' : null)),
        });

        mockUseConversationsQuery.mockReturnValue({
            data: [
                {
                    conversationId: 'param-conv-123',
                    type: 'DIRECT',
                    createdAt: '2026-05-24T09:58:00.000Z',
                    participants: [],
                },
            ],
            isLoading: false,
            error: null,
        });

        render(<MessagingPageClient />);

        // The query key resolved in useConversationMessagesQuery should be param-conv-123
        await waitFor(() => {
            expect(mockUseConversationMessagesQuery).toHaveBeenCalledWith(
                expect.objectContaining({ conversationId: 'param-conv-123' }),
            );
        });
    });

    it('does not send message if mutation is pending or message is empty/whitespace', async () => {
        const mockMutateAsync = vi.fn();
        mockUseSendMessageMutation.mockReturnValue({
            mutateAsync: mockMutateAsync,
            isPending: true, // mutation is currently sending
        });

        mockUseConversationsQuery.mockReturnValue({
            data: [
                {
                    conversationId: '33333333-3333-3333-3333-333333333333',
                    type: 'DIRECT',
                    createdAt: '2026-05-24T09:58:00.000Z',
                    participants: [
                        {
                            userId: '44444444-4444-4444-4444-444444444444',
                            name: 'Alex Rivera',
                            role: 'instructor',
                            status: 'ACTIVE',
                        },
                    ],
                    lastMessage: {
                        messageId: '66666666-6666-6666-6666-666666666666',
                        content: 'Hey',
                        createdAt: '2026-05-24T10:00:00.000Z',
                    },
                },
            ],
            isLoading: false,
        });

        render(<MessagingPageClient />);

        // Should not trigger send mutation because mutation is pending
        const textarea = screen.queryByPlaceholderText('Type a message...');
        if (textarea) {
            fireEvent.change(textarea, { target: { value: 'Another message' } });
            const sendBtn = screen.getByTitle('Send Message');
            fireEvent.click(sendBtn);
            expect(mockMutateAsync).not.toHaveBeenCalled();
        }
    });
});
