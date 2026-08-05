'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from '@sentinel/ui';
import { Popover, PopoverContent, PopoverAnchor } from '@sentinel/ui';
import { useUserSearch } from '@sentinel/hooks';
import { Command as CommandPrimitive } from 'cmdk';

interface UserSearchBarProps {
    redirectPath: string;
    className?: string;
}

interface RecentUser {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string | null;
}

const colors = [
    'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
];

const getColorIndex = (id: string) => {
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
        sum += id.charCodeAt(i);
    }
    return sum % colors.length;
};

/**
 * Versioned localStorage key for recent user searches.
 * Bumped to v2 to invalidate stale entries that were persisted without avatarUrl.
 */
const RECENT_SEARCHES_KEY = 'sentinel_recent_searches_v2';

/**
 * UserSearchBar — debounced user search with recent-search history and avatar display.
 * Uses a versioned localStorage key so stale entries (without avatarUrl) are automatically
 * discarded on first load.
 */
export function UserSearchBar({ redirectPath, className }: UserSearchBarProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { users, isLoading } = useUserSearch(searchQuery);
    const [recentSearches, setRecentSearches] = useState<RecentUser[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open && typeof window !== 'undefined' && window.localStorage) {
            const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
            if (stored) {
                try {
                    setRecentSearches(JSON.parse(stored));
                } catch {
                    // Ignore parsing errors — stale or malformed data
                }
            }
        }
    }, [open]);

    /**
     * Adds a user to the front of the recent searches list (max 5 entries)
     * and persists the updated list to the versioned localStorage key.
     */
    const addRecentSearch = (user: RecentUser) => {
        const updated = [user, ...recentSearches.filter((u) => u.id !== user.id)].slice(0, 5);
        setRecentSearches(updated);
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        }
    };

    const clearRecentSearches = () => {
        setRecentSearches([]);
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(RECENT_SEARCHES_KEY);
        }
    };

    return (
        <CommandPrimitive shouldFilter={false} className="w-full">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverAnchor asChild>
                    <div
                        onClick={() => inputRef.current?.focus()}
                        className={`bg-muted/50 text-muted-foreground hover:bg-muted/70 flex w-72 cursor-text items-center gap-2 rounded-none border px-3 py-1.5 text-sm transition-colors md:w-[480px] ${className || ''}`}
                    >
                        <Search className="text-muted-foreground h-4 w-4 shrink-0" />
                        <CommandPrimitive.Input
                            ref={inputRef}
                            placeholder="Search users by name..."
                            value={searchQuery}
                            onValueChange={(val) => {
                                setSearchQuery(val);
                                if (!open) setOpen(true);
                            }}
                            onFocus={() => setOpen(true)}
                            className="text-foreground placeholder:text-muted-foreground w-full bg-transparent text-xs outline-none md:text-sm"
                        />
                    </div>
                </PopoverAnchor>
                <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0"
                    align="center"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md">
                        <CommandList>
                            {isLoading && searchQuery.length >= 2 ? (
                                <div className="text-muted-foreground p-4 text-center text-xs">
                                    Searching...
                                </div>
                            ) : searchQuery.length < 2 ? (
                                recentSearches.length === 0 ? (
                                    <div className="text-muted-foreground p-4 text-center text-xs">
                                        Type at least 2 characters to search...
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        <div className="bg-muted/20 flex items-center justify-between border-b px-4 py-2">
                                            <span className="text-muted-foreground text-xs font-semibold">
                                                People
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    clearRecentSearches();
                                                }}
                                                className="cursor-pointer text-[10px] font-bold text-red-500 uppercase transition-colors hover:text-red-600"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        <div className="scrollbar-none flex items-center gap-6 overflow-x-auto p-4">
                                            {recentSearches.map((user) => {
                                                const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
                                                const bgIndex = getColorIndex(user.id);
                                                const pastelBgClass = colors[bgIndex];

                                                return (
                                                    <div
                                                        key={user.id}
                                                        onClick={() => {
                                                            addRecentSearch(user);
                                                            router.push(
                                                                `${redirectPath}?userId=${user.id}`,
                                                            );
                                                            setOpen(false);
                                                            setSearchQuery('');
                                                        }}
                                                        className="group flex w-20 flex-shrink-0 cursor-pointer flex-col items-center gap-2 select-none"
                                                    >
                                                        <Avatar className="h-12 w-12 transition-transform group-hover:scale-105">
                                                            {user.avatarUrl ? (
                                                                <AvatarImage
                                                                    src={user.avatarUrl}
                                                                    alt={`${user.firstName} ${user.lastName}`}
                                                                />
                                                            ) : null}
                                                            <AvatarFallback
                                                                className={`${pastelBgClass} text-sm font-bold`}
                                                            >
                                                                {initials}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex w-full flex-col items-center text-center">
                                                            <span className="text-foreground line-clamp-1 text-[11px] leading-tight font-medium group-hover:underline">
                                                                {user.firstName}
                                                            </span>
                                                            <span className="text-muted-foreground line-clamp-1 text-[9px] leading-tight capitalize">
                                                                {user.role}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )
                            ) : users.length === 0 ? (
                                <CommandEmpty>No users found.</CommandEmpty>
                            ) : (
                                <CommandGroup heading="Search Results">
                                    {users.map((user) => {
                                        const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`;
                                        const bgIndex = getColorIndex(user.id);
                                        const pastelBgClass = colors[bgIndex];
                                        const recentUser = {
                                            id: user.id,
                                            firstName: user.firstName ?? '',
                                            lastName: user.lastName ?? '',
                                            role: user.role ?? '',
                                            avatarUrl: user.avatarUrl ?? null,
                                        };
                                        return (
                                            <CommandItem
                                                key={user.id}
                                                value={user.id}
                                                onSelect={() => {
                                                    addRecentSearch(recentUser);
                                                    router.push(
                                                        `${redirectPath}?userId=${user.id}`,
                                                    );
                                                    setOpen(false);
                                                    setSearchQuery('');
                                                }}
                                                className="flex cursor-pointer items-center gap-3 p-2"
                                            >
                                                <Avatar className="h-8 w-8">
                                                    {user.avatarUrl ? (
                                                        <AvatarImage
                                                            src={user.avatarUrl}
                                                            alt={`${user.firstName} ${user.lastName}`}
                                                        />
                                                    ) : null}
                                                    <AvatarFallback
                                                        className={`${pastelBgClass} text-xs font-bold`}
                                                    >
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-foreground text-sm font-semibold">
                                                        {user.firstName} {user.lastName}
                                                    </span>
                                                    <span className="text-muted-foreground text-xs capitalize">
                                                        {user.role}
                                                    </span>
                                                </div>
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </div>
                </PopoverContent>
            </Popover>
        </CommandPrimitive>
    );
}
