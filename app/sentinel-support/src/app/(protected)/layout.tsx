'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset, cn } from '@sentinel/ui';
import { SuperAdminSidebar } from '@/components/sidebar/support/support-sidebar';
import { SupportHeader } from '@/components/sidebar/support/support-header';

/**
 * Protected layout for the sentinel-support portal.
 * Renders the sidebar and header immediately without blocking on auth state.
 * Route-level authentication and RBAC are handled server-side in proxy.ts.
 * The DashboardProfileDropdown self-manages its loading state via DashboardProfileDropdownFallback.
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isFullScreen = pathname === '/messages' || pathname === '/institutions/new';

    return (
        <SidebarProvider
            defaultOpen={false}
            className={cn(
                'flex-col [&_[data-slot=sidebar-gap]]:w-[var(--sidebar-width-icon)]',
                isFullScreen && 'h-screen !min-h-0 overflow-hidden',
            )}
        >
            <SupportHeader />
            <div className="relative flex min-h-0 w-full flex-1 overflow-hidden">
                <Suspense
                    fallback={<div className="bg-background w-[var(--sidebar-width-icon)]" />}
                >
                    <SuperAdminSidebar />
                </Suspense>
                <SidebarInset
                    className={cn('relative !ml-0', isFullScreen && 'min-h-0 flex-1 overflow-hidden')}
                >
                    <main
                        data-app-scroll-container="support"
                        className={cn(
                            'flex-1',
                            isFullScreen
                                ? 'flex min-h-0 flex-1 flex-col overflow-hidden p-0'
                                : 'scrollbar-hidden overflow-auto p-6',
                        )}
                    >
                        {children}
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}
