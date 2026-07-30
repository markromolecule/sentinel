import { Clock, Lock, LockOpen, RotateCcw, CheckCircle2, AlertCircle, Award } from 'lucide-react';
import type { ExamAttemptLifecycleEvent } from '@sentinel/shared/types';

interface LifecycleTimelineItemProps {
    event: ExamAttemptLifecycleEvent;
}

/** Maps a lifecycle event type to its corresponding icon. */
function getLifecycleIcon(eventType: ExamAttemptLifecycleEvent['eventType']) {
    if (eventType === 'LOCKED') return <Lock className="h-4 w-4" />;
    if (eventType === 'REOPENED') return <LockOpen className="h-4 w-4" />;
    if (eventType === 'RESET') return <RotateCcw className="h-4 w-4" />;
    if (eventType === 'CLOSED') return <AlertCircle className="h-4 w-4" />;
    if (eventType === 'FINALIZED') return <Award className="h-4 w-4" />;
    return <CheckCircle2 className="h-4 w-4" />;
}

/**
 * Renders a single lifecycle event entry on the flagging timeline,
 * showing its icon, formatted event type, timestamp, and optional notes.
 */
export function LifecycleTimelineItem({ event }: LifecycleTimelineItemProps) {
    const icon = getLifecycleIcon(event.eventType);

    return (
        <div key={event.eventId} className="group relative flex items-start gap-6">
            <div className="bg-background relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#323d8f] text-[#323d8f] shadow-sm">
                {icon}
            </div>
            <div className="min-w-0 flex-1 pt-1">
                <div className="mb-2 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                    <h4 className="text-foreground text-sm font-bold">
                        {event.eventType.replaceAll('_', ' ')}
                    </h4>
                    <div className="text-muted-foreground flex items-center text-xs font-medium">
                        <Clock className="mr-1 h-3 w-3" />
                        {event.createdAt
                            ? new Date(event.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                              })
                            : 'No timestamp'}
                    </div>
                </div>
                <div className="bg-muted/30 border-border/50 rounded-xl border p-4">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {event.notes ||
                            event.reasonCode ||
                            'Lifecycle event recorded for this attempt.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
