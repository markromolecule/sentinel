'use client';

import { type ExamAttemptLifecycleEvent, Flag } from '@sentinel/shared/types';
import { Card, Button } from '@sentinel/ui';
import { FlaggingTimeline } from './flagging-timeline';

interface IntegrityTimelineCardProps {
    flags: Flag[];
    examId: string;
    studentId: string;
    lifecycleEvents?: ExamAttemptLifecycleEvent[];
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

export function IntegrityTimelineCard({
    flags,
    examId,
    studentId,
    lifecycleEvents,
    onRefresh,
    isRefreshing = false,
}: IntegrityTimelineCardProps) {
    return (
        <Card className="border-border/50 bg-card min-h-full rounded-xl border-0 p-0 shadow-sm md:border">
            <div className="border-border/50 bg-card sticky top-0 z-20 flex shrink-0 items-center justify-between rounded-t-xl border-b px-6 py-4">
                <div className="space-y-0.5">
                    <h3 className="text-foreground text-base font-bold">Integrity Timeline</h3>
                    <p className="text-muted-foreground text-xs">
                        Chronological log of flagged incidents
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs font-bold text-[#323d8f]"
                        onClick={onRefresh}
                        disabled={!onRefresh || isRefreshing}
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                </div>
            </div>
            <div className="p-6">
                <FlaggingTimeline
                    flags={flags}
                    examId={examId}
                    studentId={studentId}
                    lifecycleEvents={lifecycleEvents}
                />
            </div>
        </Card>
    );
}
