'use client';

import { useTheme } from 'next-themes';
import { User, Sun, Moon, Monitor, LogOut, Check } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@sentinel/ui';
import { useProfileQuery } from '@sentinel/hooks';
import { useInstructorNav } from './hooks/use-instructor-nav';

/**
 * Renders the profile dropdown menu for instructors, including theme selection, profile link, and logout.
 */
export function InstructorProfileDropdown() {
    const { theme, setTheme } = useTheme();
    const { handleLogout } = useInstructorNav();
    const { profile, isLoading } = useProfileQuery();

    const themeOptions = [
        { name: 'Light', value: 'light', icon: Sun },
        { name: 'Dark', value: 'dark', icon: Moon },
        { name: 'System', value: 'system', icon: Monitor },
    ];

    if (isLoading) {
        return <InstructorProfileDropdownFallback />;
    }

    const initials = `${profile?.firstName?.[0] || ''}${profile?.lastName?.[0] || ''}`;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <div className="bg-primary text-primary-foreground relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full text-xs font-bold shadow-sm transition-opacity hover:opacity-90">
                    {profile?.avatarUrl ? (
                        <Image
                            src={profile.avatarUrl}
                            alt={`${profile?.firstName || ''} avatar`}
                            fill
                            sizes="32px"
                            className="object-cover"
                        />
                    ) : (
                        initials
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-2 w-56 p-1">
                <DropdownMenuLabel className="p-2 font-normal">
                    <div className="flex flex-col space-y-0.5">
                        <p className="text-sm leading-none font-semibold">
                            {profile?.firstName} {profile?.lastName}
                        </p>
                        <p className="text-muted-foreground text-xs leading-none">
                            {profile?.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1" />

                <div className="space-y-0.5">
                    <DropdownMenuItem className="cursor-pointer gap-2 py-1.5" asChild>
                        <Link href="/profile" className="flex w-full items-center gap-2">
                            <User className="text-muted-foreground h-3.5 w-3.5" />
                            <span className="text-sm">Profile</span>
                        </Link>
                    </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="my-1" />

                <div className="px-2 py-1.5">
                    <p className="text-muted-foreground mb-2 px-2 text-xs font-semibold">Theme</p>
                    <div className="space-y-0.5">
                        {themeOptions.map((opt) => (
                            <DropdownMenuItem
                                key={opt.value}
                                className="focus:bg-accent cursor-pointer justify-between px-2 py-1.5"
                                onClick={() => setTheme(opt.value)}
                            >
                                <div className="flex items-center gap-2">
                                    <opt.icon className="h-3.5 w-3.5" />
                                    <span className="text-sm">{opt.name}</span>
                                </div>
                                {theme === opt.value && <Check className="text-primary h-3 w-3" />}
                            </DropdownMenuItem>
                        ))}
                    </div>
                </div>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuItem
                    className="text-foreground focus:text-foreground focus:bg-accent cursor-pointer px-2 py-1.5"
                    onClick={handleLogout}
                >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    <span className="text-sm">Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Renders a pulsing loading skeleton fallback for the InstructorProfileDropdown.
 */
export function InstructorProfileDropdownFallback() {
    return (
        <div className="bg-primary text-primary-foreground flex h-8 w-8 animate-pulse cursor-pointer items-center justify-center rounded-full text-xs font-bold shadow-sm" />
    );
}
