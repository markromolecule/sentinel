import { cn } from '@sentinel/ui';
import { Clock } from 'lucide-react';
import type { Flag } from '@sentinel/shared/types';
import { flagIcons } from '@sentinel/shared/constants';
import { IncidentEvidenceGallery } from './incident-evidence-gallery';
import {
    AUDIO_ANOMALY_BADGE_STYLES,
    buildReviewNote,
    formatAudioAnomalyLabel,
    formatOccurrenceLabel,
    formatSeverityReason,
    formatTrigger,
    formatWindow,
    getNormalizationNote,
    getTimelineDescription,
    getTimelineTitle,
} from './flagging-timeline-utils';

interface FlagTimelineItemProps {
    flag: Flag;
    examId: string;
    studentId: string;
}

/**
 * Renders a single flagged-event entry on the flagging timeline,
 * including its severity dot, title, description, metadata badges,
 * and an optional evidence gallery.
 */
export function FlagTimelineItem({ flag, examId, studentId }: FlagTimelineItemProps) {
    const title = getTimelineTitle(flag);
    const description = getTimelineDescription(flag);
    const normalizationNote = getNormalizationNote(flag);
    const reviewNote = buildReviewNote(flag);
    const severityReasonLabel = formatSeverityReason(flag.severityReason);
    const triggerLabel = formatTrigger(flag.persistenceTrigger);
    const windowLabel = formatWindow(flag.matchingWindowSeconds);
    const occurrenceLabel = formatOccurrenceLabel(flag.occurrenceCount);
    const anomalyLabel = formatAudioAnomalyLabel(flag.anomalyType);
    const confidenceLabel =
        typeof flag.confidenceScore === 'number'
            ? `${Math.round(flag.confidenceScore * 100)}% confidence`
            : null;

    const hasMetaBadges =
        anomalyLabel || confidenceLabel || severityReasonLabel || triggerLabel || windowLabel;

    return (
        <div className="group relative flex items-start gap-6">
            {/* Timeline dot / severity icon */}
            <div
                className={cn(
                    'bg-background relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 shadow-sm transition-transform group-hover:scale-110',
                    flag.severity === 'high'
                        ? 'border-red-500 text-red-500'
                        : flag.severity === 'medium'
                          ? 'border-orange-500 text-orange-500'
                          : 'border-blue-500 text-blue-500',
                )}
            >
                {flagIcons[flag.type]}
            </div>

            {/* Content card */}
            <div className="min-w-0 flex-1 pt-1">
                {/* Header row */}
                <div className="mb-2 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                    <h4 className="text-foreground flex items-center gap-2 text-sm font-bold">
                        {title}
                        {occurrenceLabel ? (
                            <span className="bg-muted text-muted-foreground ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold">
                                {occurrenceLabel}
                            </span>
                        ) : null}
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
                                flag.severity === 'high'
                                    ? 'bg-red-100 text-red-600'
                                    : flag.severity === 'medium'
                                      ? 'bg-orange-100 text-orange-600'
                                      : 'bg-blue-100 text-blue-600',
                            )}
                        >
                            {flag.severity}
                        </span>
                    </h4>
                    <div className="text-muted-foreground flex items-center text-xs font-medium">
                        <Clock className="mr-1 h-3 w-3" />
                        {new Date(flag.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                        })}
                    </div>
                </div>

                {/* Body */}
                <div className="bg-muted/30 border-border/50 group-hover:border-border/80 rounded-xl border p-4 transition-colors">
                    <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>

                    {normalizationNote ? (
                        <p className="text-foreground/80 mt-2 text-xs leading-relaxed font-medium">
                            {normalizationNote}
                        </p>
                    ) : null}

                    {flag.rawEventType ? (
                        <div className="mt-3">
                            <span className="border-border/70 bg-background text-foreground/80 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase">
                                Trigger {flag.rawEventType}
                            </span>
                        </div>
                    ) : null}

                    {reviewNote ? (
                        <p className="text-foreground/80 mt-2 text-xs leading-relaxed font-medium">
                            {reviewNote}
                        </p>
                    ) : null}

                    {hasMetaBadges ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {anomalyLabel ? (
                                <span
                                    className={cn(
                                        'rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase',
                                        flag.anomalyType
                                            ? AUDIO_ANOMALY_BADGE_STYLES[
                                                  flag.anomalyType as keyof typeof AUDIO_ANOMALY_BADGE_STYLES
                                              ]
                                            : 'border-slate-200 bg-slate-100 text-slate-700',
                                    )}
                                >
                                    {anomalyLabel}
                                </span>
                            ) : null}
                            {confidenceLabel ? (
                                <span className="border-border/70 bg-background text-foreground/80 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase">
                                    {confidenceLabel}
                                </span>
                            ) : null}
                            {severityReasonLabel ? (
                                <span className="border-border/70 bg-background text-foreground/80 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase">
                                    {severityReasonLabel}
                                </span>
                            ) : null}
                            {triggerLabel ? (
                                <span className="border-border/70 bg-background text-muted-foreground rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase">
                                    {triggerLabel}
                                </span>
                            ) : null}
                            {windowLabel ? (
                                <span className="border-border/70 bg-background text-muted-foreground rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase">
                                    Window {windowLabel}
                                </span>
                            ) : null}
                        </div>
                    ) : null}

                    <IncidentEvidenceGallery flag={flag} examId={examId} studentId={studentId} />
                </div>
            </div>
        </div>
    );
}
