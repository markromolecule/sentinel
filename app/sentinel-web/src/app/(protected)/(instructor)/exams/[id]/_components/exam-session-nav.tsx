'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn, Separator } from '@sentinel/ui';
import { useExamQuery } from '@sentinel/hooks';
import { resolveExamReportSection } from '../../reports/[examId]/_constants';

type ExamSessionSection = 'lobby' | 'monitoring' | 'overview' | 'report' | 'queue' | 'logs';

type ExamSessionNavItem = {
    id: ExamSessionSection;
    label: string;
    href: string;
};

type ExamSessionNavProps = {
    examId: string;
};

function resolveActiveSection(
    pathname: string,
    searchParams: URLSearchParams | ReturnType<typeof useSearchParams>,
): ExamSessionSection | null {
    const parts = pathname.split('/').filter(Boolean);
    const section = parts[2];
    const reportSection = searchParams.get('section');

    if (parts[0] === 'exams' && parts[1] === 'reports' && parts[2]) {
        const resolved = resolveExamReportSection(reportSection, pathname);
        if (resolved === 'attempts') {
            return 'report';
        }
        return resolved;
    }

    if (parts[0] !== 'exams' || !parts[1]) {
        return null;
    }

    if (section === 'lobby') {
        return 'lobby';
    }

    if (section === 'monitoring') {
        return 'monitoring';
    }

    if (section === 'logs') {
        return 'logs';
    }

    return null;
}

/**
 * ExamSessionNav renders local Lobby and Monitoring navigation for one exam runtime.
 *
 * @param props - ExamSessionNavProps containing the current examId.
 */
export function ExamSessionNav({ examId }: ExamSessionNavProps) {
    const pathname = usePathname() || '';
    const searchParams = useSearchParams();
    const activeSection = resolveActiveSection(pathname, searchParams);
    const { data: exam } = useExamQuery(examId);

    const isReportPage = pathname.startsWith('/exams/reports');
    const isCompleted = exam?.status === 'completed' || exam?.status === 'archived';
    const showReportSectionSidebar = isReportPage && isCompleted;

    const items: ExamSessionNavItem[] = showReportSectionSidebar
        ? [
              {
                  id: 'overview',
                  label: 'Overview',
                  href: `/exams/reports/${examId}?section=overview`,
              },
              {
                  id: 'report',
                  label: 'Summary',
                  href: `/exams/reports/${examId}?section=attempts`,
              },
              {
                  id: 'queue',
                  label: 'Actions',
                  href: `/exams/reports/${examId}?section=queue`,
              },
              {
                  id: 'logs',
                  label: 'Incident Logs',
                  href: `/exams/reports/${examId}?section=logs`,
              },
          ]
        : [
              {
                  id: 'lobby',
                  label: 'Lobby',
                  href: `/exams/${examId}/lobby`,
              },
              {
                  id: 'monitoring',
                  label: 'Monitoring',
                  href: `/exams/${examId}/monitoring`,
              },
              {
                  id: 'overview',
                  label: 'Overview',
                  href: `/exams/reports/${examId}?section=overview`,
              },
              {
                  id: 'report',
                  label: 'Summary',
                  href: `/exams/reports/${examId}?section=attempts`,
              },
              {
                  id: 'queue',
                  label: 'Actions',
                  href: `/exams/reports/${examId}?section=queue`,
              },
              {
                  id: 'logs',
                  label: 'Incident Logs',
                  href: `/exams/${examId}/logs`,
              },
          ];

    return (
        <nav className="mt-1 flex flex-col gap-1">
            {!showReportSectionSidebar && (
                <h3 className="text-muted-foreground/60 mb-2 px-4 text-xs font-semibold tracking-wider uppercase">
                    Runtime
                </h3>
            )}

            {items.map((item, index) => {
                const isActive = activeSection === item.id;
                const showSeparator = !showReportSectionSidebar && index === 2;

                return (
                    <Fragment key={item.id}>
                        {showSeparator && (
                            <div className="px-4 py-1">
                                <Separator className="bg-border/40" />
                            </div>
                        )}
                        <Link
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
                    </Fragment>
                );
            })}
        </nav>
    );
}
