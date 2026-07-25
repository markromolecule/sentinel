'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@sentinel/ui';
import { BOTTOM_NAV_ITEMS } from '@sentinel/shared/constants';
import { useLogoutMutation, useProfileQuery } from '@sentinel/hooks';
import { User, Settings, LogOut } from 'lucide-react';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerFooter,
    DrawerHeader,
    DrawerTrigger,
} from '@sentinel/ui';
import { Button } from '@sentinel/ui';

export default function StudentBottomNav() {
    const pathname = usePathname();
    const { profile, isLoading } = useProfileQuery();

    const { mutate: logout, isPending: isLoggingOut } = useLogoutMutation({
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
        <div className="bg-background border-border/40 pb-safe fixed right-0 bottom-0 left-0 z-50 border-t md:hidden">
            <div className="flex items-center justify-between px-6 py-2">
                {BOTTOM_NAV_ITEMS.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (pathname.startsWith(item.href) && item.href !== '/student/exam');
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1 rounded-lg py-2 transition-colors',
                                isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <item.icon className={cn('h-6 w-6', isActive && 'fill-current')} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}

                <Drawer>
                    <DrawerTrigger asChild>
                        <div className="text-muted-foreground hover:text-foreground flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg py-2 transition-colors">
                            <div className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] text-[8px] font-bold text-white ring-2 ring-white/10 shadow-sm">
                                {isLoading ? (
                                    '...'
                                ) : profile?.avatarUrl ? (
                                    <img
                                        src={profile.avatarUrl}
                                        alt={`${profile.firstName || ''} avatar`}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    initials
                                )}
                            </div>
                            <span className="text-[10px] font-medium">Profile</span>
                        </div>
                    </DrawerTrigger>
                    <DrawerContent className="bg-background border-border/40 text-foreground border-t">
                        <div className="mx-auto w-full max-w-sm">
                            <DrawerHeader className="flex flex-col items-center gap-4 py-6">
                                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#323d8f] to-[#4a5bb8] text-2xl font-bold text-white ring-4 ring-white/10 shadow-md">
                                    {isLoading ? (
                                        '...'
                                    ) : profile?.avatarUrl ? (
                                        <img
                                            src={profile.avatarUrl}
                                            alt={`${profile.firstName || ''} avatar`}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        initials
                                    )}
                                </div>
                                <div className="space-y-1 text-center">
                                    <div className="text-foreground text-sm font-semibold">
                                        {isLoading ? 'Loading...' : fullName}
                                    </div>
                                    <p className="text-muted-foreground text-sm">
                                        {isLoading ? '' : email}
                                    </p>
                                </div>
                            </DrawerHeader>

                            <div className="space-y-2 p-4">
                                <Link
                                    href="/student/profile"
                                    className="hover:bg-accent hover:text-accent-foreground text-foreground/80 flex items-center gap-3 rounded-xl p-3 transition-colors"
                                >
                                    <div className="bg-accent flex h-10 w-10 items-center justify-center rounded-full">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-foreground font-medium">My Profile</p>
                                        <p className="text-muted-foreground text-xs">
                                            View personal details
                                        </p>
                                    </div>
                                    <div className="text-muted-foreground">→</div>
                                </Link>

                                <Link
                                    href="/student/setting"
                                    className="hover:bg-accent hover:text-accent-foreground text-foreground/80 flex items-center gap-3 rounded-xl p-3 transition-colors"
                                >
                                    <div className="bg-accent flex h-10 w-10 items-center justify-center rounded-full">
                                        <Settings className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-foreground font-medium">Settings</p>
                                        <p className="text-muted-foreground text-xs">
                                            Manage your account
                                        </p>
                                    </div>
                                    <div className="text-muted-foreground">→</div>
                                </Link>
                            </div>

                            <DrawerFooter className="pt-2 pb-8">
                                <Button
                                    variant="destructive"
                                    className="bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20 h-12 w-full border"
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    {isLoggingOut ? 'Logging out...' : 'Log out'}
                                </Button>
                                <DrawerClose asChild>
                                    <Button
                                        variant="ghost"
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        Cancel
                                    </Button>
                                </DrawerClose>
                            </DrawerFooter>
                        </div>
                    </DrawerContent>
                </Drawer>
            </div>
        </div>
    );
}
