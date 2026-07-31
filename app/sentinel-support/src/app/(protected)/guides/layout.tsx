'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn, Separator } from '@sentinel/ui';

type GuideSection = 'steps' | 'rubric' | 'tos';

const GUIDE_NAV_ITEMS = [
    { id: 'steps' as GuideSection, label: 'Guide Steps', href: '/guides' },
    { id: 'rubric' as GuideSection, label: 'Essay Rubric', href: '/guides/rubric' },
    { id: 'tos' as GuideSection, label: 'TOS Guide', href: '/guides/tos' },
];

/**
 * SupportGuideLayout wraps the guide steps, rubric, and TOS pages with a persistent sidebar layout.
 *
 * @param props - Layout props containing children ReactNode
 */
export default function SupportGuideLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname() || '';

    // Derive active section based on the current pathname
    let activeSection: GuideSection = 'steps';
    if (pathname.includes('/guides/rubric')) {
        activeSection = 'rubric';
    } else if (pathname.includes('/guides/tos')) {
        activeSection = 'tos';
    }

    return (
        <div className="relative flex min-h-[calc(100vh-64px)] flex-col lg:-m-6 lg:flex-row lg:items-stretch">
            {/* Desktop Sidebar */}
            <div className="bg-background sticky top-0 z-30 hidden w-64 shrink-0 flex-col border-r lg:flex">
                <div className="flex h-14 shrink-0 items-center px-4">
                    <h1 className="text-foreground text-[1.1rem] font-bold tracking-tight">
                        System Guide
                    </h1>
                </div>
                <Separator className="bg-border/40 shrink-0" />
                <div className="flex-1 overflow-y-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <nav className="mt-1 flex flex-col gap-0.5">
                        {GUIDE_NAV_ITEMS.map((item) => {
                            const isActive = activeSection === item.id;

                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={cn(
                                        'group flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors',
                                        isActive
                                            ? 'bg-accent/50 border-primary text-primary border-r-2 font-semibold'
                                            : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
                                    )}
                                >
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Mobile Navigation */}
            <div className="relative z-30 px-4 pt-6 lg:hidden">
                <div className="bg-card/20 rounded-xl border p-1.5 shadow-sm backdrop-blur-sm">
                    <nav className="flex gap-1">
                        {GUIDE_NAV_ITEMS.map((item) => {
                            const isActive = activeSection === item.id;

                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={cn(
                                        'flex-1 rounded-lg px-3 py-1.5 text-center text-xs font-medium transition-colors',
                                        isActive
                                            ? 'text-primary bg-accent/50 font-semibold'
                                            : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
                                    )}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <main className="min-w-0 flex-1 space-y-8 overflow-y-auto p-6 pb-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {children}
            </main>
        </div>
    );
}
