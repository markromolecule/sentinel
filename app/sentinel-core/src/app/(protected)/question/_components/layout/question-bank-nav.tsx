'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, Separator } from '@sentinel/ui';

export type QuestionBankSection = 'questions' | 'collections' | 'tos';

type QuestionBankNavItem = {
    id: QuestionBankSection;
    label: string;
    href: string;
};

const QUESTION_BANK_NAV_GROUPS: Array<{ title: string; items: QuestionBankNavItem[] }> = [
    {
        title: 'Management',
        items: [
            {
                id: 'questions',
                label: 'Questions',
                href: '/question/bank',
            },
            {
                id: 'collections',
                label: 'Collections',
                href: '/question/bank/collections',
            },
            {
                id: 'tos',
                label: 'Table of Specifications',
                href: '/question/bank/tos',
            },
        ],
    },
];

function resolveActiveSection(pathname: string): QuestionBankSection {
    if (pathname.startsWith('/question/bank/collections')) {
        return 'collections';
    }

    if (pathname.startsWith('/question/bank/tos')) {
        return 'tos';
    }

    return 'questions';
}

/**
 * QuestionBankNav renders the local navigation for the instructor question bank pages.
 *
 * @returns JSX navigation links for question bank routes.
 */
export function QuestionBankNav() {
    const pathname = usePathname() || '';
    const activeSection = resolveActiveSection(pathname);

    return (
        <nav className="mt-1 flex flex-col gap-2">
            {QUESTION_BANK_NAV_GROUPS.map((group, groupIndex) => (
                <div key={group.title} className="flex flex-col">
                    {groupIndex > 0 && <Separator className="bg-border/40 my-3" />}

                    <h3 className="text-muted-foreground/60 mb-2 px-4 text-xs font-semibold tracking-wider uppercase">
                        {group.title}
                    </h3>

                    <div className="flex flex-col gap-0.5">
                        {group.items.map((item) => {
                            const isActive = activeSection === item.id;

                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className={cn(
                                        'group flex items-center gap-3 px-4 py-2 text-left text-sm transition-colors',
                                        isActive
                                            ? 'bg-accent/50 border-r-2 border-[#323d8f] font-semibold text-[#323d8f]'
                                            : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
                                    )}
                                >
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}
