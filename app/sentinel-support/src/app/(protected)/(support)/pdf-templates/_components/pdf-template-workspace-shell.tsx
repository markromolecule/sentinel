'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Separator } from '@sentinel/ui';
import { PdfTemplateNav, type PdfTemplateSection } from './pdf-template-nav';

type PdfTemplateWorkspaceShellProps = {
    children: ReactNode;
};

export function PdfTemplateWorkspaceShell({ children }: PdfTemplateWorkspaceShellProps) {
    const pathname = usePathname() || '';

    const activeSection: PdfTemplateSection = pathname.includes('/examinations')
        ? 'examinations'
        : pathname.includes('/branding')
          ? 'branding'
          : 'reports';

    return (
        <div className="relative flex min-h-[calc(100vh-64px)] flex-col lg:-m-6 lg:h-[calc(100vh-64px)] lg:min-h-[calc(100vh-64px)] lg:flex-row lg:items-stretch">
            <div className="bg-background sticky -top-6 hidden w-72 shrink-0 flex-col border-r lg:flex">
                <div className="flex h-14 shrink-0 items-center px-4">
                    <h1 className="text-foreground text-[1.1rem] font-bold tracking-tight">
                        PDF Templates
                    </h1>
                </div>
                <Separator className="bg-border/40 shrink-0" />
                <div className="flex-1 overflow-y-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <PdfTemplateNav activeSection={activeSection} />
                </div>
            </div>

            <div className="px-4 pt-6 lg:hidden">
                <div className="bg-background rounded-xl border p-3">
                    <PdfTemplateNav activeSection={activeSection} />
                </div>
            </div>

            <main className="min-w-0 flex-1 space-y-8 overflow-y-auto p-6 pb-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {children}
            </main>
        </div>
    );
}
