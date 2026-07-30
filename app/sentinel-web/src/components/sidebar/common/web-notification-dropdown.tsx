'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Trash2 } from 'lucide-react';
import {
    useApi,
    useDeleteNotificationsMutation,
    useNotificationRealtime,
    useNotificationsQuery,
} from '@sentinel/hooks';
import { formatDistanceToNow } from 'date-fns';
import { markAllNotificationsRead, markNotificationRead } from '@sentinel/services';
import type { NotificationList } from '@sentinel/shared/types';
import { Button, Checkbox, cn } from '@sentinel/ui';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@sentinel/ui';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type NotificationQueryResult = NotificationList & {
    forbidden?: boolean;
};

/**
 * Props for the WebNotificationDropdown component.
 */
export interface WebNotificationDropdownProps {
    /**
     * The stable query key for React Query and Supabase Realtime subscriptions.
     */
    queryKey: readonly string[];
    /**
     * Optional URL to link the "View all notifications" footer action.
     */
    viewAllHref?: string;
    /**
     * Optional styling overrides for the trigger button.
     */
    triggerClassName?: string;
    /**
     * Optional function to resolve custom navigation paths for clicked notifications.
     */
    resolveNotificationHref?: (notification: any) => string | undefined;
}

/**
 * A shared dropdown component for displaying and managing user notifications.
 * Displays unread counts, supports marking individual/all as read, selecting, and bulk-deleting notifications.
 */
export function WebNotificationDropdown({
    queryKey,
    viewAllHref,
    triggerClassName,
    resolveNotificationHref,
}: WebNotificationDropdownProps) {
    const apiClient = useApi();
    const queryClient = useQueryClient();
    const router = useRouter();
    useNotificationRealtime({ queryKey });
    const [selectedNotificationIds, setSelectedNotificationIds] = useState<string[]>([]);

    const { data, isLoading } = useNotificationsQuery({
        queryKey,
        params: { limit: 5 },
    }) as { data?: NotificationQueryResult; isLoading: boolean };

    const deleteNotificationsMutation = useDeleteNotificationsMutation({
        queryKey,
    });

    const markReadMutation = useMutation({
        mutationFn: (notificationId: string) => markNotificationRead(apiClient, notificationId),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey,
            });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => markAllNotificationsRead(apiClient),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey,
            });
        },
    });

    if (isLoading || data?.forbidden) {
        return null;
    }

    const unreadCount = data?.unreadCount ?? 0;
    const recentNotifications = data?.items ?? [];
    const selectedCount = selectedNotificationIds.length;

    const toggleSelectedNotification = (notificationId: string) => {
        setSelectedNotificationIds((current) =>
            current.includes(notificationId)
                ? current.filter((selectedId) => selectedId !== notificationId)
                : [...current, notificationId],
        );
    };

    const handleDeleteSelectedNotifications = () => {
        if (selectedNotificationIds.length === 0) {
            return;
        }

        deleteNotificationsMutation.mutate(selectedNotificationIds, {
            onSuccess: () => {
                setSelectedNotificationIds([]);
            },
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Open notifications"
                    className={triggerClassName}
                >
                    <div className="relative">
                        <Bell className="h-[22px] w-[22px]" />
                        {unreadCount > 0 && (
                            <span className="bg-destructive ring-background animate-in fade-in zoom-in-75 absolute top-0 right-0 flex h-4 min-w-4 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1 text-[9px] leading-none font-bold text-white shadow-sm ring-2 duration-200">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 sm:w-96">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-semibold">Notifications</span>
                        {unreadCount > 0 && (
                            <span className="bg-primary/10 text-primary flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            className="text-muted-foreground hover:text-foreground text-xs transition-colors outline-none"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markAllReadMutation.mutate();
                            }}
                            disabled={markAllReadMutation.isPending}
                        >
                            {markAllReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
                        </button>
                    )}
                </div>
                <DropdownMenuSeparator className="mx-0" />
                <div className="max-h-72 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {recentNotifications.length === 0 ? (
                        <div className="text-muted-foreground p-4 text-center text-sm">
                            No notifications yet.
                        </div>
                    ) : (
                        recentNotifications.map((notification) => {
                            const isSelected = selectedNotificationIds.includes(notification.id);
                            const href = resolveNotificationHref?.(notification);

                            return (
                                <DropdownMenuItem
                                    key={notification.id}
                                    className={cn(
                                        'flex cursor-pointer items-start gap-3 p-4 transition-colors',
                                        notification.status === 'UNREAD'
                                            ? 'bg-background hover:bg-accent'
                                            : 'hover:bg-accent opacity-80',
                                    )}
                                    onSelect={(event) => {
                                        event.preventDefault();
                                        if (notification.status === 'UNREAD') {
                                            markReadMutation.mutate(notification.id);
                                        }
                                        if (href) {
                                            router.push(href);
                                        }
                                    }}
                                >
                                    <Checkbox
                                        checked={isSelected}
                                        aria-label={`Select notification ${notification.title}`}
                                        onCheckedChange={() =>
                                            toggleSelectedNotification(notification.id)
                                        }
                                        onClick={(event) => event.stopPropagation()}
                                        onPointerDownCapture={(event) => event.stopPropagation()}
                                    />
                                    <div className="flex w-full min-w-0 items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-2">
                                            {notification.status === 'UNREAD' && (
                                                <span className="bg-primary mt-1 h-2 w-2 flex-shrink-0 rounded-full" />
                                            )}
                                            <div className="min-w-0">
                                                <span
                                                    className={cn(
                                                        'text-sm font-semibold',
                                                        notification.status === 'UNREAD'
                                                            ? 'text-foreground'
                                                            : 'text-foreground/80',
                                                    )}
                                                >
                                                    {notification.title}
                                                </span>
                                                <p className="text-muted-foreground line-clamp-2 text-xs">
                                                    {notification.message}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                                            {formatDistanceToNow(new Date(notification.createdAt), {
                                                addSuffix: true,
                                            })}
                                        </span>
                                    </div>
                                </DropdownMenuItem>
                            );
                        })
                    )}
                </div>
                {recentNotifications.length > 0 && (
                    <>
                        <DropdownMenuSeparator className="mx-0" />
                        <div className="flex items-center justify-between gap-3 px-4 py-3">
                            <span className="text-muted-foreground text-xs">
                                {selectedCount} selected
                            </span>
                            <Button
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={handleDeleteSelectedNotifications}
                                disabled={
                                    selectedCount === 0 || deleteNotificationsMutation.isPending
                                }
                                aria-label="Remove selected notifications"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">
                                    {deleteNotificationsMutation.isPending
                                        ? 'Removing selected notifications'
                                        : 'Remove selected notifications'}
                                </span>
                            </Button>
                        </div>
                    </>
                )}
                {viewAllHref && (
                    <>
                        <DropdownMenuSeparator className="mx-0" />
                        <DropdownMenuItem
                            asChild
                            className="text-primary cursor-pointer justify-center text-center font-medium"
                        >
                            <Link href={viewAllHref} className="w-full">
                                View all notifications
                            </Link>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
