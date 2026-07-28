'use client';

import { AlertCircle } from 'lucide-react';
import type { ExamAttemptLifecycleEvent, Flag } from '@sentinel/shared/types';
import { FlagTimelineItem } from './flag-timeline-item';
import { LifecycleTimelineItem } from './lifecycle-timeline-item';

interface FlaggingTimelineProps {
    flags: Flag[];
    examId: string;
    studentId: string;
    lifecycleEvents?: ExamAttemptLifecycleEvent[];
}

/**
 * Merges flags and lifecycle events into a unified, reverse-chronological
 * timeline. Each entry is rendered by the appropriate sub-component.
 */
export function FlaggingTimeline({
    flags,
    examId,
    studentId,
    lifecycleEvents = [],
}: FlaggingTimelineProps) {
    const timelineItems = [
        ...flags.map((flag) => ({ kind: 'flag' as const, timestamp: flag.timestamp, flag })),
        ...lifecycleEvents.map((event) => ({
            kind: 'lifecycle' as const,
            timestamp: event.createdAt,
            event,
        })),
    ].sort(
        (left, right) =>
            new Date(right.timestamp ?? 0).getTime() - new Date(left.timestamp ?? 0).getTime(),
    );

    if (timelineItems.length === 0) {
        return (
            <div className="bg-muted/20 border-border/60 flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                    <AlertCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <h4 className="text-foreground text-sm font-semibold">All Clear</h4>
                <p className="text-muted-foreground mt-1 max-w-[200px] text-xs">
                    No flagging events recorded for this session yet.
                </p>
            </div>
        );
    }

    return (
        <div className="before:via-border relative space-y-8 before:pointer-events-none before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-[#323d8f]/20 before:to-transparent before:z-0">
            {timelineItems.map((item) => {
                if (item.kind === 'lifecycle') {
                    return (
                        <LifecycleTimelineItem key={item.event.eventId} event={item.event} />
                    );
                }

                return (
                    <FlagTimelineItem
                        key={item.flag.id}
                        flag={item.flag}
                        examId={examId}
                        studentId={studentId}
                    />
                );
            })}
        </div>
    );
}
