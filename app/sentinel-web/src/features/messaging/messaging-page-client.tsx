'use client';

import {
    useConversationMessagesQuery,
    useConversationsQuery,
    useCreateDirectConversationMutation,
    useMarkConversationReadMutation,
    useMessageRealtime,
    usePresence,
    useProfileQuery,
    useSendMessageMutation,
    useMessageRecipientsQuery,
} from '@sentinel/hooks';
import type {
    ConversationDetail,
    ConversationSummary,
    MessageParticipant,
} from '@sentinel/shared/types';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Badge,
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    EmptyState,
    PageHeader,
    PermissionDeniedState,
    ScrollArea,
    Separator,
    Skeleton,
    Textarea,
    cn,
} from '@sentinel/ui';
import { format, isToday, isYesterday } from 'date-fns';
import {
    ArrowLeft,
    ChevronLeft,
    Loader2,
    MessageSquare,
    MoreVertical,
    Plus,
    Search,
    Send,
    SendHorizonal,
    Users,
} from 'lucide-react';
import {
    startTransition,
    useDeferredValue,
    useEffect,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
} from 'react';

import { useSearchParams, usePathname } from 'next/navigation';
import { ChatListHeader } from './components/chat-list/chat-list-standard';
import { ParticipantProfileDialog } from './components/participant-profile-dialog';
import {
    getParticipantActivity,
    getParticipantInitials,
    getPrimaryParticipant,
    matchesConversationSearch,
} from './lib/conversation-helpers';

type ConversationLike = ConversationSummary | ConversationDetail;
const EMPTY_CONVERSATIONS: ConversationSummary[] = [];
const EMPTY_MESSAGES: Array<{
    messageId: string;
    conversationId: string;
    senderId: string;
    content: string;
    status: string;
    createdAt: string;
}> = [];

/**
 * Connected messaging page for `sentinel-web`.
 */
export function MessagingPageClient() {
    const pathname = usePathname();
    const isMessagesRoute = pathname === '/messages';
    const isStudentRoute = pathname.includes('/student');
    const isInstructorRoute = pathname.includes('/instructor');

    const searchParams = useSearchParams();
    const urlConversationId = searchParams ? searchParams.get('conversationId') : null;

    const { profile, isLoading: isProfileLoading, error: profileError } = useProfileQuery();
    const { onlineUserIds } = usePresence();
    const permissionKeys = profile?.activePermissionKeys ?? [];
    const canViewMessages = permissionKeys.length === 0 || permissionKeys.includes('messages:view');
    const canCreateMessages =
        permissionKeys.length === 0 || permissionKeys.includes('messages:create');

    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [pendingConversation, setPendingConversation] = useState<ConversationDetail | null>(null);
    const [conversationSearch, setConversationSearch] = useState('');
    const [directorySearch, setDirectorySearch] = useState('');
    const [messageDraft, setMessageDraft] = useState('');
    const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
    const deferredConversationSearch = useDeferredValue(conversationSearch);
    const deferredDirectorySearch = useDeferredValue(directorySearch);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const lastMarkedConversationIdRef = useRef<string | null>(null);

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (urlConversationId) {
            setSelectedConversationId(urlConversationId);
        }
    }, [urlConversationId]);

    const conversationsQuery = useConversationsQuery({
        enabled: canViewMessages && !!profile,
    });
    const createDirectConversationMutation = useCreateDirectConversationMutation({
        onSuccess: async (conversation) => {
            setPendingConversation(conversation);
            setDirectorySearch('');
            setIsDirectoryOpen(false);
            startTransition(() => {
                setSelectedConversationId(conversation.conversationId);
            });
        },
    });
    const sendMessageMutation = useSendMessageMutation({
        onSuccess: async () => {
            setMessageDraft('');
        },
    });
    const markConversationReadMutation = useMarkConversationReadMutation();
    const directoryQuery = useMessageRecipientsQuery(
        isDirectoryOpen ? deferredDirectorySearch : '',
        20,
    );

    useMessageRealtime({
        enabled: canViewMessages,
    });

    const conversations = conversationsQuery.data ?? EMPTY_CONVERSATIONS;
    const filteredConversations = conversations.filter((conversation) =>
        matchesConversationSearch(conversation, profile?.id, deferredConversationSearch),
    );
    const selectedConversationExists = conversations.some(
        (conversation) => conversation.conversationId === selectedConversationId,
    );
    const effectiveSelectedConversationId = isMobile
        ? (selectedConversationId ?? '')
        : selectedConversationId === null
          ? (conversations[0]?.conversationId ?? '')
          : selectedConversationId !== '' &&
              !selectedConversationExists &&
              pendingConversation?.conversationId !== selectedConversationId
            ? (conversations[0]?.conversationId ?? '')
            : selectedConversationId;
    useMessageRealtime({
        enabled: canViewMessages && !!effectiveSelectedConversationId,
        conversationId: effectiveSelectedConversationId || undefined,
        invalidateList: false,
    });
    const selectedConversation =
        conversations.find(
            (conversation) => conversation.conversationId === effectiveSelectedConversationId,
        ) ??
        (pendingConversation?.conversationId === effectiveSelectedConversationId
            ? pendingConversation
            : null);
    const messagesQuery = useConversationMessagesQuery({
        conversationId: effectiveSelectedConversationId,
        enabled: canViewMessages && !!effectiveSelectedConversationId,
    });
    const selectedMessages = messagesQuery.data ?? EMPTY_MESSAGES;

    const selectableUsers = (directoryQuery.data ?? [])
        .map((u) => ({
            id: u.userId,
            firstName: u.name,
            lastName: '',
            role: u.role ?? 'student',
            status: u.status,
            institution: u.institution?.name ?? undefined,
            avatarUrl: u.avatarUrl,
        }))
        .sort(
            (left, right) =>
                Number(onlineUserIds.has(right.id)) - Number(onlineUserIds.has(left.id)),
        );

    function selectConversation(conversation: ConversationSummary) {
        startTransition(() => {
            setSelectedConversationId(conversation.conversationId);
        });
        setMessageDraft('');
    }

    async function handleStartConversation(recipientId: string) {
        await createDirectConversationMutation.mutateAsync({ recipientId });
    }

    async function handleSendMessage() {
        if (
            !effectiveSelectedConversationId ||
            !canCreateMessages ||
            !messageDraft.trim() ||
            sendMessageMutation.isPending
        ) {
            return;
        }

        await sendMessageMutation.mutateAsync({
            conversationId: effectiveSelectedConversationId,
            content: messageDraft.trim(),
        });
    }

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            block: 'end',
        });
    }, [effectiveSelectedConversationId, selectedMessages.length]);

    useEffect(() => {
        if (
            !selectedConversation ||
            !('unreadCount' in selectedConversation) ||
            !effectiveSelectedConversationId
        ) {
            return;
        }

        if (selectedConversation.unreadCount === 0) {
            if (lastMarkedConversationIdRef.current === effectiveSelectedConversationId) {
                lastMarkedConversationIdRef.current = null;
            }

            return;
        }

        if (lastMarkedConversationIdRef.current === effectiveSelectedConversationId) {
            return;
        }

        lastMarkedConversationIdRef.current = effectiveSelectedConversationId;
        markConversationReadMutation.mutate({
            conversationId: effectiveSelectedConversationId,
        });
    }, [effectiveSelectedConversationId, markConversationReadMutation, selectedConversation]);

    const targetUserId = searchParams?.get('userId') ?? null;

    useEffect(() => {
        if (!targetUserId || !profile || conversationsQuery.isLoading) return;

        const existingConversation = conversations.find((c) =>
            c.participants.some((p) => p.userId === targetUserId),
        );

        if (existingConversation) {
            setTimeout(() => {
                setSelectedConversationId(existingConversation.conversationId);
            }, 0);
        } else {
            setTimeout(() => {
                handleStartConversation(targetUserId);
            }, 0);
        }
    }, [
        targetUserId,
        conversations,
        profile,
        conversationsQuery.isLoading,
        handleStartConversation,
    ]);

    if (isProfileLoading) {
        return <MessagingPageSkeleton />;
    }

    if (profileError || !profile) {
        return (
            <MessagingPageFrame
                title="Messages"
                description="Collaborate across your institution network in one thread-based inbox."
            >
                <EmptyState
                    icon={<MessageSquare className="size-10" />}
                    title="Unable to load your messaging profile"
                    description="Refresh the page or sign in again before opening the messages workspace."
                />
            </MessagingPageFrame>
        );
    }

    if (!canViewMessages) {
        return (
            <MessagingPageFrame
                title="Messages"
                description="Collaborate across your institution network in one thread-based inbox."
            >
                <PermissionDeniedState resourceName="messages" />
            </MessagingPageFrame>
        );
    }

    if (!profile.institutionId) {
        return (
            <MessagingPageFrame
                title="Messages"
                description="Collaborate across your institution network in one thread-based inbox."
            >
                <EmptyState
                    icon={<Users className="size-10" />}
                    title="Institution assignment required"
                    description="Your user profile needs an institution before you can access messaging."
                />
            </MessagingPageFrame>
        );
    }

    const content = (
        <div
            className={cn(
                isMessagesRoute
                    ? 'flex h-full min-h-0 flex-1 overflow-hidden'
                    : 'grid h-full min-h-0 gap-4 overflow-hidden md:h-[calc(100vh-20rem)] md:min-h-[520px] md:grid-cols-[22rem_minmax(0,1fr)] md:overflow-visible',
            )}
        >
            <aside
                className={cn(
                    isMessagesRoute
                        ? 'border-border bg-card h-full w-full shrink-0 flex-col border-r md:w-[320px] lg:w-[380px]'
                        : 'bg-muted/40 border-border/60 flex h-full min-h-0 w-full flex-col overflow-hidden md:rounded-3xl md:border',
                    effectiveSelectedConversationId
                        ? isMessagesRoute
                            ? 'hidden md:flex'
                            : 'md:flex'
                        : 'flex',
                    effectiveSelectedConversationId && !isMessagesRoute ? 'hidden md:flex' : '',
                )}
            >
                <ChatListHeader
                    title="Messages"
                    onNewChat={
                        canCreateMessages
                            ? () => setIsDirectoryOpen((current) => !current)
                            : undefined
                    }
                    searchValue={conversationSearch}
                    onSearchChange={setConversationSearch}
                />
                {isDirectoryOpen ? (
                    <NewConversationPanel
                        currentUserId={profile.id}
                        isLoading={directoryQuery.isLoading}
                        error={directoryQuery.error?.message}
                        users={selectableUsers}
                        onlineUserIds={onlineUserIds}
                        onStartConversation={handleStartConversation}
                        onClose={() => setIsDirectoryOpen(false)}
                        searchValue={directorySearch}
                        onSearchChange={setDirectorySearch}
                        isCreating={createDirectConversationMutation.isPending}
                        isMessagesRoute={isMessagesRoute}
                    />
                ) : (
                    <ConversationList
                        currentUserId={profile.id}
                        conversations={filteredConversations}
                        isLoading={conversationsQuery.isLoading}
                        error={conversationsQuery.error?.message}
                        onlineUserIds={onlineUserIds}
                        selectedConversationId={effectiveSelectedConversationId}
                        onSelectConversation={selectConversation}
                        isMessagesRoute={isMessagesRoute}
                    />
                )}
            </aside>

            <section
                className={cn(
                    isMessagesRoute
                        ? 'bg-background relative flex h-full w-full flex-1 flex-col overflow-hidden'
                        : 'bg-background border-border/60 h-full min-h-0 w-full overflow-hidden md:rounded-3xl md:border',
                    effectiveSelectedConversationId
                        ? 'flex'
                        : isMessagesRoute
                          ? 'bg-muted/10 hidden items-center justify-center p-8 text-center md:flex'
                          : 'hidden md:flex',
                    !isMessagesRoute ? 'flex-col' : '',
                )}
            >
                {selectedConversation ? (
                    <ConversationPanel
                        conversation={selectedConversation}
                        currentUserId={profile.id}
                        onlineUserIds={onlineUserIds}
                        messages={selectedMessages}
                        isLoadingMessages={messagesQuery.isLoading}
                        messagesError={messagesQuery.error?.message}
                        messageDraft={messageDraft}
                        onMessageDraftChange={setMessageDraft}
                        onSendMessage={handleSendMessage}
                        isSendingMessage={sendMessageMutation.isPending}
                        canCreateMessages={canCreateMessages}
                        onBack={() => {
                            setSelectedConversationId(isMessagesRoute ? null : '');
                            setMessageDraft('');
                        }}
                        messagesEndRef={messagesEndRef}
                        isMessagesRoute={isMessagesRoute}
                    />
                ) : isMessagesRoute ? (
                    <div className="bg-muted/10 flex h-full flex-1 flex-col items-center justify-center p-8 text-center">
                        <div className="bg-muted/50 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                            <MessageSquare className="text-muted-foreground h-8 w-8" />
                        </div>
                        <h3 className="mb-2 text-xl font-semibold">Select a conversation</h3>
                        <p className="text-muted-foreground max-w-sm">
                            Choose a contact from the list to start messaging or view previous
                            chats.
                        </p>
                    </div>
                ) : (
                    <EmptyState
                        icon={<MessageSquare className="size-10" />}
                        title="Your inbox is ready"
                        description="Select a conversation or start a new chat to message another user in the system."
                        action={
                            canCreateMessages ? (
                                <Button onClick={() => setIsDirectoryOpen(true)}>
                                    <Plus className="mr-2 size-4" />
                                    Start a conversation
                                </Button>
                            ) : null
                        }
                    />
                )}
            </section>
        </div>
    );

    if (isMessagesRoute) {
        return content;
    }

    return (
        <MessagingPageFrame
            title="Messages"
            description="Collaborate across your institution network in one thread-based inbox."
        >
            {content}
        </MessagingPageFrame>
    );
}

function MessagingPageFrame({
    children,
}: {
    title?: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden md:overflow-visible">
            {children}
        </div>
    );
}

export function MessagingPageSkeleton() {
    return (
        <MessagingPageFrame
            title="Messages"
            description="Collaborate across your institution network in one thread-based inbox."
        >
            <div className="grid h-full gap-4 md:h-[calc(100vh-20rem)] md:min-h-[520px] md:grid-cols-[22rem_minmax(0,1fr)]">
                <div className="space-y-3 p-4 md:rounded-3xl md:border">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
                <div className="space-y-4 p-4 md:rounded-3xl md:border">
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-[60%] w-full rounded-2xl" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                </div>
            </div>
        </MessagingPageFrame>
    );
}

function ConversationList({
    conversations,
    currentUserId,
    error,
    isLoading,
    onlineUserIds,
    onSelectConversation,
    selectedConversationId,
    isMessagesRoute = false,
}: {
    conversations: ConversationSummary[];
    currentUserId: string;
    error?: string;
    isLoading: boolean;
    onlineUserIds: Set<string>;
    onSelectConversation: (conversation: ConversationSummary) => void;
    selectedConversationId: string;
    isMessagesRoute?: boolean;
}) {
    if (isLoading && conversations.length === 0) {
        return (
            <div className="space-y-3 p-4">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="space-y-2 rounded-2xl border p-4">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-3 w-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <EmptyState
                icon={<MessageSquare className="size-10" />}
                title="Unable to load conversations"
                description={error}
                className="m-4 h-full"
            />
        );
    }

    if (conversations.length === 0) {
        return (
            <EmptyState
                icon={<MessageSquare className="size-10" />}
                title="No conversations yet"
                description="Start a new chat to connect with another user across Sentinel."
                className="m-4 h-full"
            />
        );
    }

    return (
        <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-2 p-3">
                {conversations.map((conversation) => {
                    const participant = getPrimaryParticipant(conversation, currentUserId);
                    const activity = getParticipantActivity(participant, onlineUserIds);

                    return (
                        <button
                            key={conversation.conversationId}
                            type="button"
                            onClick={() => onSelectConversation(conversation)}
                            className={cn(
                                isMessagesRoute
                                    ? 'hover:bg-muted/50 border-border/50 flex w-full items-start gap-4 border-b p-4 text-left transition-colors duration-150'
                                    : 'w-full rounded-2xl border p-4 text-left transition-colors',
                                isMessagesRoute &&
                                    selectedConversationId === conversation.conversationId &&
                                    'bg-muted',
                                !isMessagesRoute &&
                                    selectedConversationId === conversation.conversationId
                                    ? 'border-[#323d8f] bg-[#323d8f]/5'
                                    : !isMessagesRoute &&
                                          'hover:bg-muted/60 border-border/60 bg-background',
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <ParticipantAvatar
                                    participant={participant}
                                    isActive={activity.isActive}
                                />
                                <div className="min-w-0 flex-1">
                                    {isMessagesRoute ? (
                                        <>
                                            <div className="mb-1 flex items-center justify-between">
                                                <span className="truncate text-sm font-semibold md:text-base">
                                                    {participant?.name ?? 'Unknown participant'}
                                                </span>
                                                {conversation.lastMessage && (
                                                    <span className="text-muted-foreground ml-2 text-xs whitespace-nowrap">
                                                        {formatConversationTimestamp(
                                                            conversation.lastMessage.createdAt,
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                            {participant?.institution?.name && (
                                                <div className="text-muted-foreground/80 mb-1 truncate text-xs font-medium">
                                                    {participant.institution.name}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <p
                                                    className={cn(
                                                        'truncate pr-2 text-xs md:text-sm',
                                                        conversation.unreadCount &&
                                                            conversation.unreadCount > 0
                                                            ? 'text-foreground font-medium'
                                                            : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {conversation.lastMessage?.content ||
                                                        'No messages yet'}
                                                </p>
                                                {conversation.unreadCount &&
                                                conversation.unreadCount > 0 ? (
                                                    <span className="bg-primary text-primary-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                                                        {conversation.unreadCount}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold">
                                                        {participant?.name ?? 'Unknown participant'}
                                                    </p>
                                                    <p className="text-muted-foreground truncate text-xs">
                                                        {participant?.institution?.name ??
                                                            'No institution assigned'}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    {conversation.unreadCount > 0 ? (
                                                        <Badge className="rounded-full bg-[#323d8f] px-2 py-0 text-[10px] text-white">
                                                            {conversation.unreadCount}
                                                        </Badge>
                                                    ) : null}
                                                    <span className="text-muted-foreground text-[11px]">
                                                        {formatConversationTimestamp(
                                                            conversation.lastMessage?.createdAt ??
                                                                conversation.createdAt,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <span className="text-muted-foreground truncate text-sm">
                                                    {conversation.lastMessage?.content ??
                                                        'No messages yet'}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </ScrollArea>
    );
}

function NewConversationPanel({
    currentUserId,
    error,
    isCreating,
    isLoading,
    onlineUserIds,
    onClose,
    onSearchChange,
    onStartConversation,
    searchValue,
    users,
    isMessagesRoute = false,
}: {
    currentUserId: string;
    error?: string;
    isCreating: boolean;
    isLoading: boolean;
    onlineUserIds: Set<string>;
    onClose: () => void;
    onSearchChange: (value: string) => void;
    onStartConversation: (recipientId: string) => Promise<void>;
    searchValue: string;
    users: Array<{
        id: string;
        firstName: string;
        lastName: string;
        role: string;
        institution?: string;
        status: string;
        avatarUrl?: string | null;
    }>;
    isMessagesRoute?: boolean;
}) {
    return (
        <>
            <div className="border-border/60 border-b p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="font-semibold">Start a conversation</p>
                        <p className="text-muted-foreground text-sm">
                            Search users across the system.
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        Close
                    </Button>
                </div>
                <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <input
                        value={searchValue}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Search by name or email"
                        className="bg-background border-input w-full rounded-xl border py-2 pr-3 pl-9 text-sm outline-none"
                    />
                </div>
            </div>
            <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-2 p-3">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="space-y-2 rounded-2xl border p-4">
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-3 w-1/3" />
                            </div>
                        ))
                    ) : error ? (
                        <EmptyState
                            icon={<Users className="size-10" />}
                            title="Unable to load the user directory"
                            description={error}
                            className="h-full"
                        />
                    ) : users.length === 0 ? (
                        <EmptyState
                            icon={<Users className="size-10" />}
                            title="No matching users"
                            description="Try another search term to find someone to message."
                            className="h-full"
                        />
                    ) : (
                        users.map((user) => {
                            const participant: MessageParticipant = {
                                userId: user.id,
                                name: [user.firstName, user.lastName].filter(Boolean).join(' '),
                                avatarUrl: user.avatarUrl || null,
                                role: user.role,
                                status:
                                    user.status?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
                                institution: user.institution
                                    ? {
                                          id: '00000000-0000-0000-0000-000000000000',
                                          name: user.institution,
                                      }
                                    : null,
                                lastSeenAt: null,
                            };
                            const activity = getParticipantActivity(participant, onlineUserIds);

                            return (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => onStartConversation(user.id)}
                                    disabled={isCreating || user.id === currentUserId}
                                    className={cn(
                                        isMessagesRoute
                                            ? 'hover:bg-muted/50 border-border/50 flex w-full items-center gap-4 border-b p-4 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60'
                                            : 'hover:bg-muted/60 flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                                    )}
                                >
                                    <ParticipantAvatar
                                        participant={participant}
                                        isActive={activity.isActive}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold">{participant.name}</p>
                                        <p className="text-muted-foreground truncate text-xs">
                                            {participant.institution?.name ??
                                                'No institution assigned'}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </>
    );
}

function ConversationPanel({
    canCreateMessages,
    conversation,
    currentUserId,
    isLoadingMessages,
    isSendingMessage,
    messageDraft,
    messages,
    messagesEndRef,
    messagesError,
    onBack,
    onMessageDraftChange,
    onSendMessage,
    onlineUserIds,
    isMessagesRoute = false,
}: {
    canCreateMessages: boolean;
    conversation: ConversationLike;
    currentUserId: string;
    isLoadingMessages: boolean;
    isSendingMessage: boolean;
    messageDraft: string;
    messages: Array<{
        messageId: string;
        conversationId: string;
        senderId: string;
        content: string;
        status: string;
        createdAt: string;
    }>;
    messagesEndRef: RefObject<HTMLDivElement | null>;
    messagesError?: string;
    onBack: () => void;
    onMessageDraftChange: (value: string) => void;
    onSendMessage: () => Promise<void>;
    onlineUserIds: Set<string>;
    isMessagesRoute?: boolean;
}) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const participant = getPrimaryParticipant(conversation, currentUserId);
    const activity = getParticipantActivity(participant, onlineUserIds);

    return (
        <>
            <div
                className={cn(
                    'bg-background/80 border-border/60 flex shrink-0 items-center justify-between border-b px-4 py-3 md:px-6',
                    isMessagesRoute ? 'bg-card h-16 px-4 py-0 md:h-20 md:px-6' : '',
                )}
            >
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(isMessagesRoute ? '-ml-2 md:hidden' : 'md:hidden')}
                        onClick={onBack}
                    >
                        {isMessagesRoute ? (
                            <ChevronLeft className="h-5 w-5" />
                        ) : (
                            <ArrowLeft className="size-4" />
                        )}
                    </Button>
                    <ParticipantAvatar
                        participant={participant}
                        isActive={activity.isActive}
                        size={isMessagesRoute ? 'default' : 'lg'}
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2
                                className={cn(
                                    'truncate font-semibold',
                                    isMessagesRoute ? 'text-sm md:text-base' : 'text-lg',
                                )}
                            >
                                {participant?.name ?? 'Conversation'}
                            </h2>
                        </div>
                        {isMessagesRoute ? (
                            participant?.institution?.name && (
                                <div className="text-muted-foreground/80 mt-0.5 max-w-[250px] truncate text-xs font-medium">
                                    {participant.institution.name}
                                </div>
                            )
                        ) : (
                            <p className="text-muted-foreground truncate text-sm">
                                {participant?.institution?.name ?? 'No institution assigned'}
                            </p>
                        )}
                    </div>
                </div>

                {isMessagesRoute && (
                    <div className="flex items-center gap-1 md:gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <MoreVertical className="text-muted-foreground h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                                    View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem>Search in Conversation</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive">
                                    Block User
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>
            <ScrollArea className="bg-muted/20 min-h-0 flex-1 px-4 py-5 md:px-6">
                <div className="space-y-4">
                    {isLoadingMessages ? (
                        Array.from({ length: 4 }).map((_, index) => (
                            <div
                                key={index}
                                className={cn(
                                    'flex',
                                    index % 2 === 0 ? 'justify-end' : 'justify-start',
                                )}
                            >
                                <Skeleton className="h-16 w-[70%] rounded-3xl" />
                            </div>
                        ))
                    ) : messagesError ? (
                        <EmptyState
                            icon={<MessageSquare className="size-10" />}
                            title="Unable to load messages"
                            description={messagesError}
                            className="h-full"
                        />
                    ) : messages.length === 0 ? (
                        <EmptyState
                            icon={<MessageSquare className="size-10" />}
                            title="No messages yet"
                            description="Send the first message to start this conversation."
                            className="h-full"
                        />
                    ) : (
                        messages.map((message) => {
                            const isCurrentUser = message.senderId === currentUserId;

                            return (
                                <div
                                    key={message.messageId}
                                    className={cn(
                                        'flex',
                                        isCurrentUser ? 'justify-end' : 'justify-start',
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'max-w-[80%] rounded-3xl px-4 py-3 shadow-sm',
                                            isCurrentUser
                                                ? 'bg-[#323d8f] text-white'
                                                : 'bg-background border-border/60 border',
                                        )}
                                    >
                                        <p className="text-sm leading-6 whitespace-pre-wrap">
                                            {message.content}
                                        </p>
                                        <p
                                            className={cn(
                                                'mt-2 text-[11px]',
                                                isCurrentUser
                                                    ? 'text-white/75'
                                                    : 'text-muted-foreground',
                                            )}
                                        >
                                            {formatMessageTimestamp(message.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>
            <Separator className="shrink-0" />
            <div
                className={cn(
                    'shrink-0',
                    isMessagesRoute
                        ? 'bg-card border-border mt-auto border-t p-4 md:p-6'
                        : 'bg-background p-4 md:p-6',
                )}
            >
                <div className="flex items-end gap-2">
                    {isMessagesRoute ? (
                        <textarea
                            value={messageDraft}
                            onChange={(event) => onMessageDraftChange(event.target.value)}
                            onKeyDown={(event) => {
                                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                                    event.preventDefault();
                                    void onSendMessage();
                                }
                            }}
                            placeholder={
                                canCreateMessages
                                    ? `Message ${participant?.name ?? 'this user'}`
                                    : 'You can view this conversation, but sending is disabled.'
                            }
                            disabled={!canCreateMessages || isSendingMessage}
                            rows={1}
                            className="bg-muted/50 border-input focus:ring-primary focus-visible:ring-primary custom-scrollbar max-h-32 flex-1 resize-none rounded-md border px-4 py-3 text-sm transition-[color,box-shadow] focus-visible:ring-1 focus-visible:outline-none"
                            ref={(el) => {
                                if (el) {
                                    el.style.height = 'auto';
                                    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
                                }
                            }}
                        />
                    ) : (
                        <Textarea
                            value={messageDraft}
                            onChange={(event) => onMessageDraftChange(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    void onSendMessage();
                                }
                            }}
                            placeholder={
                                canCreateMessages
                                    ? `Message ${participant?.name ?? 'this user'}`
                                    : 'You can view this conversation, but sending is disabled.'
                            }
                            disabled={!canCreateMessages || isSendingMessage}
                            className="h-11 min-h-0 resize-none rounded-2xl px-4 py-3"
                            style={{ fieldSizing: 'fixed' }}
                        />
                    )}
                    <Button
                        onClick={() => void onSendMessage()}
                        disabled={!canCreateMessages || isSendingMessage || !messageDraft.trim()}
                        size="icon"
                        className={cn(
                            isMessagesRoute
                                ? 'bg-primary hover:bg-primary/90 h-12 w-12 shrink-0 rounded-md transition-colors'
                                : 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                        )}
                    >
                        {isSendingMessage ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : isMessagesRoute ? (
                            <Send className="h-5 w-5" />
                        ) : (
                            <SendHorizonal className="size-4" />
                        )}
                    </Button>
                </div>
                {isMessagesRoute && (
                    <p className="text-muted-foreground mt-2 text-xs">
                        Press `Ctrl` + `Enter` or `Cmd` + `Enter` to send quickly.
                    </p>
                )}
            </div>

            <ParticipantProfileDialog
                open={isProfileOpen}
                onOpenChange={setIsProfileOpen}
                participantId={participant?.userId || null}
                connectionStatus={activity.isActive ? 'online' : 'offline'}
            />
        </>
    );
}

function ParticipantAvatar({
    participant,
    isActive,
    size = 'default',
}: {
    participant: MessageParticipant | null;
    isActive: boolean;
    size?: 'default' | 'lg';
}) {
    return (
        <div className="relative">
            <Avatar size={size}>
                <AvatarImage
                    src={participant?.avatarUrl ?? undefined}
                    alt={participant?.name ?? 'User'}
                />
                <AvatarFallback>{getParticipantInitials(participant?.name)}</AvatarFallback>
            </Avatar>
            <span
                className={cn(
                    'ring-background absolute right-0 bottom-0 size-3 rounded-full ring-2',
                    isActive ? 'bg-green-500' : 'bg-slate-300',
                )}
            />
        </div>
    );
}

function formatConversationTimestamp(dateValue: string) {
    const date = new Date(dateValue);

    if (isToday(date)) {
        return format(date, 'h:mm a');
    }

    if (isYesterday(date)) {
        return 'Yesterday';
    }

    return format(date, 'MMM d');
}

function formatMessageTimestamp(dateValue: string) {
    const date = new Date(dateValue);

    if (isToday(date)) {
        return format(date, 'h:mm a');
    }

    return format(date, 'MMM d, h:mm a');
}
