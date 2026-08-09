'use client';

import { cn, Avatar, AvatarFallback, AvatarImage, SearchBar, Button } from '@sentinel/ui';
import { formatDistanceToNow } from 'date-fns';
import { Conversation } from '@sentinel/shared/types';
import { Plus, ArrowLeft, Loader2 } from 'lucide-react';

interface MessageListProps {
    conversations: Conversation[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    searchTerm: string;
    onSearchChange: (value: string) => void;

    // Directory Props
    showDirectory: boolean;
    onToggleDirectory: () => void;
    directoryUsers: any[];
    onSelectUser: (userId: string) => void;
    isCreatingConversation?: boolean;
    isLoading?: boolean;
}

function getAvatarSrc(user: { avatar?: string | null; avatarUrl?: string | null }) {
    return user.avatarUrl ?? user.avatar ?? undefined;
}

function SkeletonRow() {
    return (
        <div
            data-testid="skeleton-row"
            className="border-border/50 flex w-full animate-pulse items-center gap-4 border-b p-4"
        >
            <div className="bg-muted h-10 w-10 shrink-0 rounded-full md:h-12 md:w-12" />
            <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="bg-muted h-4 w-28 rounded" />
                    <div className="bg-muted h-3 w-10 rounded" />
                </div>
                <div className="bg-muted h-3 w-44 rounded" />
            </div>
        </div>
    );
}

export function MessageList({
    conversations,
    selectedId,
    onSelect,
    searchTerm,
    onSearchChange,
    showDirectory,
    onToggleDirectory,
    directoryUsers,
    onSelectUser,
    isCreatingConversation = false,
    isLoading = false,
}: MessageListProps) {
    return (
        <div
            className={cn(
                'border-border bg-card flex h-full min-h-0 w-full shrink-0 flex-col border-r md:w-[320px] lg:w-[380px]',
                selectedId ? 'hidden md:flex' : 'flex',
            )}
        >
            {/* Header */}
            <div className="border-border shrink-0 border-b p-4">
                <div className="mb-4 flex items-center justify-between">
                    {showDirectory ? (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onToggleDirectory}
                                className="h-8 w-8 rounded-full"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <h2 className="text-lg font-bold">New Message</h2>
                        </div>
                    ) : (
                        <div className="flex w-full items-center justify-between">
                            <h2 className="text-xl font-bold">Messages</h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onToggleDirectory}
                                className="hover:bg-muted h-8 w-8 rounded-full"
                                title="New Message"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
                <SearchBar
                    value={searchTerm}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder={showDirectory ? 'Search people...' : 'Search messages...'}
                    className="bg-muted/50 border-input focus-visible:ring-primary"
                />
            </div>

            {/* List Body */}
            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                {showDirectory ? (
                    isCreatingConversation ? (
                        <div className="text-muted-foreground flex h-32 items-center justify-center gap-2 text-sm">
                            <Loader2 className="text-primary h-4 w-4 animate-spin" />
                            Starting conversation...
                        </div>
                    ) : directoryUsers.length === 0 ? (
                        <div className="text-muted-foreground p-8 text-center text-sm">
                            No users found. Try searching another name.
                        </div>
                    ) : (
                        directoryUsers.map((user) => {
                            const name =
                                [user.firstName, user.lastName].filter(Boolean).join(' ') ||
                                user.name ||
                                'Unknown User';
                            const initials = name.slice(0, 2).toUpperCase();

                            return (
                                <button
                                    key={user.id}
                                    onClick={() => onSelectUser(user.id)}
                                    className="hover:bg-muted/50 border-border/50 flex w-full items-center gap-4 border-b p-4 text-left transition-colors duration-150"
                                >
                                    <Avatar className="border-background h-10 w-10 border-2">
                                        <AvatarImage src={getAvatarSrc(user)} alt={name} />
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold md:text-base">
                                            {name}
                                        </p>
                                        <p className="text-muted-foreground truncate text-xs capitalize">
                                            {user.role}{' '}
                                            {user.institution ? `• ${user.institution}` : ''}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )
                ) : isLoading ? (
                    <>
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                    </>
                ) : conversations.length === 0 ? (
                    <div className="text-muted-foreground p-8 text-center text-sm">
                        No conversations yet. Click the '+' icon above to start one!
                    </div>
                ) : (
                    conversations.map((conversation) => {
                        const participant = conversation.participants[0];
                        if (!participant) return null;
                        return (
                            <button
                                key={conversation.id}
                                onClick={() => onSelect(conversation.id)}
                                className={cn(
                                    'hover:bg-muted/50 border-border/50 flex w-full items-start gap-4 border-b p-4 text-left transition-colors duration-150',
                                    selectedId === conversation.id && 'bg-muted',
                                )}
                            >
                                <div className="relative shrink-0">
                                    <Avatar className="border-background h-10 w-10 border-2 md:h-12 md:w-12">
                                        <AvatarImage
                                            src={getAvatarSrc(participant)}
                                            alt={participant.name}
                                        />
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {participant.name.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span
                                        className={cn(
                                            'border-background absolute right-0 bottom-0 h-3 w-3 rounded-full border-2',
                                            participant.status === 'online' && 'bg-emerald-500',
                                            participant.status === 'busy' && 'bg-amber-500',
                                            participant.status === 'offline' && 'bg-slate-500',
                                        )}
                                    />
                                </div>

                                <div className="flex-1 overflow-hidden">
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className="truncate text-sm font-semibold md:text-base">
                                            {participant.name}
                                        </span>
                                        {conversation.lastMessage && (
                                            <span className="text-muted-foreground ml-2 text-xs whitespace-nowrap">
                                                {formatDistanceToNow(
                                                    new Date(conversation.lastMessage.timestamp),
                                                    {
                                                        addSuffix: false,
                                                    },
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    {participant.institution?.name && (
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
                                            {conversation.lastMessage?.content || 'No messages yet'}
                                        </p>
                                        {conversation.unreadCount &&
                                        conversation.unreadCount > 0 ? (
                                            <span className="bg-primary text-primary-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                                                {conversation.unreadCount}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
