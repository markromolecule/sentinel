'use client';

import { ExamAttemptLifecycleEvent, Flag } from '@sentinel/shared/types';
import { Button } from '@sentinel/ui';
import { Camera, ShieldAlert } from 'lucide-react';
import { FlaggingTimeline } from './flagging-timeline';

interface IntegrityTimelineCardProps {
    flags: Flag[];
    examId: string;
    lifecycleEvents?: ExamAttemptLifecycleEvent[];
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

export function IntegrityTimelineCard({
    flags,
    examId,
    lifecycleEvents = [],
    onRefresh,
    isRefreshing = false,
}: IntegrityTimelineCardProps) {
    return (
        <div className="flex min-h-full flex-col gap-4">
            <div className="border-border/50 sticky top-0 z-20 flex shrink-0 flex-col gap-4 border-b bg-background pb-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                    <h3 className="text-foreground text-base font-bold">Integrity Timeline</h3>
                    <p className="text-muted-foreground text-xs">
                        Chronological log of flagged incidents
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground mr-1 hidden font-mono text-[10px] opacity-60 sm:inline">
                        EXAM ID: {examId.slice(0, 8)}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-3 text-xs font-bold text-[#323d8f] hover:bg-slate-100/50"
                        onClick={onRefresh}
                        disabled={!onRefresh || isRefreshing}
                    >
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                    <Button variant="outline" size="sm" className="border-border/50 h-9 text-xs">
                        <Camera className="mr-1.5 h-3.5 w-3.5" />
                        Capture Frame
                    </Button>
                    <Button
                        className="h-9 border-none bg-red-600 text-xs font-semibold text-white shadow-lg shadow-red-500/20 hover:bg-red-700"
                        size="sm"
                    >
                        <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />
                        Force Submit
                    </Button>
                </div>
            </div>
            <div className="py-1 pl-4">
                <FlaggingTimeline flags={flags} lifecycleEvents={lifecycleEvents} />
            </div>
        </div>
    );
}
