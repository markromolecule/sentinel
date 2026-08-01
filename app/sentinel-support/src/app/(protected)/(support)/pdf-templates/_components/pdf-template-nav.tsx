'use client';

import Link from 'next/link';
import { cn, Separator } from '@sentinel/ui';

export type PdfTemplateSection = 'reports' | 'examinations' | 'examination-reports' | 'branding';

type PdfTemplateNavProps = {
    activeSection: PdfTemplateSection;
};

const NAV_ITEMS = [
    {
        id: 'branding' as const,
        title: 'Branding',
        href: '/pdf-templates/branding',
    },
    {
        id: 'reports' as const,
        title: 'Overall Report',
        href: '/pdf-templates/reports',
    },
    {
        id: 'examinations' as const,
        title: 'Examination Answer Key',
        href: '/pdf-templates/examinations',
    },
    {
        id: 'examination-reports' as const,
        title: 'Examination Report',
        href: '/pdf-templates/examination-reports',
    },
];

export function PdfTemplateNav({ activeSection }: PdfTemplateNavProps) {
    return (
        <nav className="mt-1 flex flex-col gap-2">
            <div className="flex flex-col">
                <h3 className="text-muted-foreground/60 mb-2 px-4 text-xs font-semibold tracking-wider uppercase">
                    Templates
                </h3>

                <div className="flex flex-col gap-0.5">
                    {NAV_ITEMS.map((item) => {
                        const isActive = item.id === activeSection;

                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={cn(
                                    'group flex items-center px-4 py-2 text-left text-sm transition-colors',
                                    isActive
                                        ? 'bg-accent/50 border-r-2 border-[#323d8f] font-semibold text-[#323d8f]'
                                        : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
                                )}
                            >
                                <span className="truncate">{item.title}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <Separator className="bg-border/40 my-3" />
        </nav>
    );
}
