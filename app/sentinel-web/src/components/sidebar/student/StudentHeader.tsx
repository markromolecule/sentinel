'use client';

import { useLogoutMutation, useProfileQuery } from '@sentinel/hooks';
import Link from 'next/link';
import NextImage from 'next/image';
import { usePathname } from 'next/navigation';
import { Bell, Menu, User, Settings, LogOut, Sun, Moon, Monitor, Check } from 'lucide-react';
import { Button } from '@sentinel/ui';
import { cn } from '@sentinel/ui';
import { HEADER_NAV_ITEMS } from '@sentinel/shared/constants';
import { useTheme } from 'next-themes';
import { UserSearchBar } from '@/components/common/user-search-bar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@sentinel/ui';
import { WebNotificationDropdown } from '../common/web-notification-dropdown';
import { resolveStudentNotificationHref } from '@/app/(protected)/student/notifications/_lib/map-app-notification-to-student-notification';

const STUDENT_HEADER_NOTIFICATION_QUERY_KEY = ['notifications', 'student-header'] as const;

export default function StudentHeader() {
    const pathname = usePathname();
    const { profile, isLoading } = useProfileQuery();
    const { theme, setTheme } = useTheme();

    const themeOptions = [
        { name: 'Light', value: 'light', icon: Sun },
        { name: 'Dark', value: 'dark', icon: Moon },
        { name: 'System', value: 'system', icon: Monitor },
    ];

    const { mutate: logout } = useLogoutMutation({
        onSuccess: () => {
            window.location.href = '/auth/login';
        },
    });

    const handleLogout = () => {
        logout(undefined);
    };

    const initials = profile ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}` : '';
    const fullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}` : '';
    const email = profile?.email || '';

    return (
        <header className="border-border/40 bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-md">
            <div className="text-foreground relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <div className="relative z-10 -ml-3.5 flex shrink-0 items-center gap-2">
                    <Link href="/student/classroom" className="flex items-center gap-2">
                        <div className="relative h-12 w-40">
                            {/* Light Mode Logo (Dark Text) */}
                            <NextImage
                                src="/icons/light-sentinel-logo.svg"
                                alt="Sentinel"
                                fill
                                className="object-contain dark:hidden"
                            />
                            {/* Dark Mode Logo (Light Text) */}
                            <NextImage
                                src="/icons/dark-sentinel-logo.svg"
                                alt="Sentinel"
                                fill
                                className="hidden object-contain dark:block"
                            />
                        </div>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <div className="absolute left-1/2 z-0 hidden -translate-x-1/2 items-center gap-8 md:flex">
                    <nav className="flex items-center gap-6">
                        {HEADER_NAV_ITEMS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'hover:text-foreground text-sm font-medium transition-colors',
                                    pathname === item.href ||
                                        (pathname.startsWith(item.href) &&
                                            item.href !== '/student/exam')
                                        ? 'text-foreground'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                {/* Actions & Profile */}
                <div className="relative z-10 flex shrink-0 items-center gap-2 pr-1 sm:pr-0 md:gap-4">
                    <UserSearchBar redirectPath="/student/message" iconOnly={true} />

                    <WebNotificationDropdown
                        queryKey={STUDENT_HEADER_NOTIFICATION_QUERY_KEY}
                        viewAllHref="/student/notifications"
                        resolveNotificationHref={resolveStudentNotificationHref}
                        triggerClassName="text-muted-foreground hover:text-foreground hidden sm:flex"
                    />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <div className="relative ml-2 flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] text-xs font-bold text-white transition-all">
                                {isLoading ? (
                                    '...'
                                ) : profile?.avatarUrl ? (
                                    <NextImage
                                        src={profile.avatarUrl}
                                        alt={`${profile.firstName || ''} avatar`}
                                        fill
                                        sizes="32px"
                                        className="object-cover"
                                    />
                                ) : (
                                    initials
                                )}
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm leading-none font-medium">
                                        {isLoading ? 'Loading...' : fullName}
                                    </p>
                                    <p className="text-muted-foreground text-xs leading-none">
                                        {isLoading ? '' : email}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href="/student/profile" className="flex w-full items-center">
                                    <User className="mr-2 h-4 w-4" />
                                    <span>Profile</span>
                                </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href="/student/setting" className="flex w-full items-center">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Settings</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5">
                                <p className="text-muted-foreground mb-2 px-2 text-xs font-semibold">
                                    Theme
                                </p>
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
                                            {theme === opt.value && (
                                                <Check className="text-primary h-3 w-3" />
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </div>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="cursor-pointer text-red-500 focus:bg-red-500/10 focus:text-red-500"
                                onClick={handleLogout}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
