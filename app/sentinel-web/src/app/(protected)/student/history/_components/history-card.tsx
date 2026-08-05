import { cn } from '@sentinel/ui';
import { AlertTriangle, Calendar, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { HistoryCardProps } from '@sentinel/shared/types';
import { formatDateTimeLabel } from '@/app/(protected)/student/_lib/student-exam-listing';
import {
    buildStudentHistoryAttemptHref,
    buildStudentHistoryExamHref,
} from '@/lib/routes/student-history-routes';

function getHistoryHref(item: HistoryCardProps['item']) {
    if (item.status === 'available' || item.status === 'in-progress') {
        return `/student/exam/${item.examId}`;
    }

    if (item.attemptId) {
        return buildStudentHistoryAttemptHref(item.attemptId);
    }

    return buildStudentHistoryExamHref(item.examId);
}

export function HistoryCard({ item }: HistoryCardProps) {
    const href = getHistoryHref(item);
    const isActive = item.status === 'available' || item.status === 'in-progress';
    const isUpcoming = item.status === 'upcoming';
    const displayTimestamp = item.completedAt ?? item.availableAt ?? item.dueAt;

    const cardClasses = cn(
        'bg-card border-border/50 flex items-center gap-3 rounded-none border px-3 py-2 transition-all duration-200 sm:min-h-[80px] sm:gap-5 sm:px-4 sm:py-3',
        isUpcoming
            ? 'border-border/40 bg-card cursor-default'
            : 'group hover:border-primary/30 hover:bg-accent/5',
    );

    const content = (
        <>
            {/* Unified Score Box - Sharp Edge */}
            <div className="border-border bg-muted/50 group-hover:bg-muted group-hover:border-primary/20 flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-none border transition-colors sm:h-14 sm:w-14">
                <span className="text-foreground text-lg leading-none font-bold sm:text-xl">
                    {item.score ?? '--'}
                </span>
                <span className="text-muted-foreground mt-1 text-[8px] leading-none font-bold tracking-tight whitespace-nowrap uppercase sm:text-[9px]">
                    Score
                </span>
            </div>

            {/* Main Info - Flexible Layout */}
            <div className="min-w-0 flex-1 pr-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <h3 className="text-foreground group-hover:text-primary line-clamp-2 text-base leading-[1.2] font-bold transition-colors sm:text-lg">
                            {item.examTitle}
                        </h3>

                        {/* Desktop Cheating Flag */}
                        {item.cheated && (
                            <div className="text-destructive hidden items-center gap-1.5 px-1 sm:flex">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span className="line-clamp-1 text-[10px] font-bold tracking-tighter uppercase">
                                    Flagged
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Mobile Status Label (Moved here for better layout) */}
                    <div className="flex items-center justify-between gap-3 sm:hidden">
                        <span
                            className={cn(
                                'text-[10px] font-bold tracking-widest whitespace-nowrap uppercase',
                                item.status === 'turned_in'
                                    ? 'text-green-500'
                                    : item.status === 'past_due'
                                      ? 'text-destructive'
                                      : 'text-primary',
                            )}
                        >
                            {isActive ? 'Open Exam' : item.status.replace('_', ' ')}
                        </span>
                    </div>
                </div>

                <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-[13px]">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        {formatDateTimeLabel(displayTimestamp)}
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        {typeof item.timeSpent === 'number' ? `${item.timeSpent} min` : 'Pending'}
                    </span>
                    {/* Mobile Only: Cheating Indicator (Text Only) */}
                    {item.cheated && (
                        <span className="text-destructive flex items-center gap-1 font-semibold sm:hidden">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            Flagged
                        </span>
                    )}
                </div>
            </div>

            {/* Right Side Status (Desktop Only) & Action Indicator */}
            <div className="flex items-center gap-2 px-2 sm:gap-6 sm:px-4">
                <span
                    className={cn(
                        'hidden text-[12px] font-bold tracking-widest whitespace-nowrap uppercase sm:block',
                        item.status === 'turned_in'
                            ? 'text-green-500'
                            : item.status === 'past_due'
                              ? 'text-destructive'
                              : 'text-primary',
                    )}
                >
                    {isActive ? 'Open Exam' : item.status.replace('_', ' ')}
                </span>

                {!isUpcoming ? (
                    <ChevronRight
                        data-testid="history-card-chevron"
                        className="text-muted-foreground/30 group-hover:text-primary h-5 w-5 transition-all duration-300 group-hover:translate-x-1"
                    />
                ) : null}
            </div>
        </>
    );

    if (isUpcoming) {
        return <div className={cardClasses}>{content}</div>;
    }

    return (
        <Link href={href} className={cardClasses}>
            {content}
        </Link>
    );
}
