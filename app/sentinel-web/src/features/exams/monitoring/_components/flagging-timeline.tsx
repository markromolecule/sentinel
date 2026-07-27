'use client';

import { cn } from '@sentinel/ui';
import {
    Clock,
    AlertCircle,
    Lock,
    LockOpen,
    RotateCcw,
    CheckCircle2,
    Award,
} from 'lucide-react';
import type { ExamAttemptLifecycleEvent, Flag } from '@sentinel/shared/types';
import { flagIcons, flagLabels } from '@sentinel/shared/constants';
import { IncidentEvidenceGallery } from './incident-evidence-gallery';

interface FlaggingTimelineProps {
    flags: Flag[];
    examId: string;
    studentId: string;
    lifecycleEvents?: ExamAttemptLifecycleEvent[];
}

const AUDIO_ANOMALY_BADGE_STYLES = {
    TALKING: 'bg-red-100 text-red-700 border-red-200',
    TYPING: 'bg-amber-100 text-amber-700 border-amber-200',
    TAPPING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    MOUTH_BREATHING: 'bg-sky-100 text-sky-700 border-sky-200',
    BACKGROUND_NOISE: 'bg-slate-100 text-slate-700 border-slate-200',
    SILENCE_DETECTED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
} as const;

function formatAudioAnomalyLabel(anomalyType?: Flag['anomalyType']) {
    if (!anomalyType) {
        return null;
    }

    switch (anomalyType) {
        case 'SILENCE_DETECTED':
            return 'Silence Detected';
        case 'BACKGROUND_NOISE':
            return 'Background Noise';
        case 'MOUTH_BREATHING':
            return 'Mouth Breathing';
        default:
            return anomalyType.charAt(0) + anomalyType.slice(1).toLowerCase().replaceAll('_', ' ');
    }
}

function formatWindow(seconds?: number | null) {
    if (!seconds || seconds <= 0) {
        return null;
    }

    if (seconds < 60) {
        return `${seconds}s`;
    }

    if (seconds % 60 === 0) {
        const minutes = seconds / 60;
        return `${minutes}m`;
    }

    return `${Math.round(seconds / 60)}m`;
}

function formatTrigger(trigger?: Flag['persistenceTrigger']) {
    switch (trigger) {
        case 'confidence-threshold':
            return 'confidence threshold';
        case 'duration-threshold':
            return 'duration threshold';
        case 'repeat-threshold':
            return 'repeat threshold';
        case 'immediate':
            return 'immediate trigger';
        default:
            return null;
    }
}

function formatSeverityReason(reason?: Flag['severityReason']) {
    switch (reason) {
        case 'repeat-escalated':
            return 'Repeat escalated';
        case 'forced-override':
            return 'Forced override';
        case 'immediate-high':
            return 'Immediate high';
        case 'threshold-fixed':
            return 'Threshold fixed';
        case 'default-ladder':
            return 'Threshold triggered';
        default:
            return null;
    }
}

function formatOccurrenceLabel(occurrenceCount?: number) {
    return occurrenceCount && occurrenceCount > 1 ? `x${occurrenceCount}` : null;
}

const rawEventDetails: Partial<
    Record<
        NonNullable<Flag['rawEventType']>,
        {
            title: string;
            description: string;
        }
    >
> = {
    FULL_SCREEN_EXIT: {
        title: 'Fullscreen Exit Detected',
        description:
            'The student exited required fullscreen mode while the exam attempt was active.',
    },
    TAB_SWITCH: {
        title: 'Tab Switch Detected',
        description:
            'The exam tab or browser window lost focus, or the page became hidden during the attempt.',
    },
    NO_FACE_DETECTED: {
        title: 'Face Not Visible',
        description:
            'The camera feed did not contain a visible face after the configured persistence threshold.',
    },
    MULTIPLE_FACES: {
        title: 'Multiple Faces Detected',
        description:
            'The camera feed detected more than one face after the configured persistence threshold.',
    },
    GAZE_OFF_SCREEN: {
        title: 'Eyes Off Screen Detected',
        description:
            'MediaPipe detected sustained gaze or head-position movement away from the calibrated exam posture.',
    },
    CLIPBOARD_ATTEMPT: {
        title: 'Clipboard Attempt',
        description:
            'Copy, cut, or paste activity was attempted while clipboard control was active.',
    },
    RIGHT_CLICK_ATTEMPT: {
        title: 'Right Click Attempt',
        description: 'The student opened or attempted to open the browser context menu.',
    },
    PRINT_SCREEN_ATTEMPT: {
        title: 'Screen Capture Attempt',
        description: 'A screenshot or screen-capture shortcut was attempted during the exam.',
    },
    AUDIO_ANOMALY: {
        title: 'Audio Anomaly Detected',
        description: 'The student audio worker detected a reviewable anomaly during the attempt.',
    },
    APP_BACKGROUNDING: {
        title: 'App Backgrounding',
        description: 'The mobile exam app moved to the background during an active attempt.',
    },
    SCREENSHOT_ATTEMPT: {
        title: 'Screenshot Attempt',
        description: 'The student attempted to capture the exam screen on a mobile device.',
    },
    ROOT_JAILBREAK_DETECTED: {
        title: 'Root / Jailbreak Detected',
        description: 'The mobile device reported root or jailbreak indicators during the attempt.',
    },
    APP_PINNING_VIOLATION: {
        title: 'App Pinning Violation',
        description: 'The mobile app pinning requirement was violated during the attempt.',
    },
    NOTIFICATION_BLOCK_VIOLATION: {
        title: 'Notification Block Violation',
        description: 'The mobile notification-blocking requirement reported a violation.',
    },
};

function getTimelineTitle(flag: Flag) {
    if (flag.type === 'AUDIO_DETECTED' && flag.anomalyType) {
        return `${formatAudioAnomalyLabel(flag.anomalyType)} detected`;
    }

    const rawEventDetail = flag.rawEventType ? rawEventDetails[flag.rawEventType] : null;

    return rawEventDetail?.title ?? flagLabels[flag.type];
}

function getTimelineDescription(flag: Flag) {
    if (flag.type === 'AUDIO_DETECTED') {
        const anomalyLabel = formatAudioAnomalyLabel(flag.anomalyType);
        const confidenceLabel =
            typeof flag.confidenceScore === 'number'
                ? `${Math.round(flag.confidenceScore * 100)}% confidence`
                : null;

        if (flag.anomalyType === 'SILENCE_DETECTED') {
            return 'Sustained silence detected. The audio stream may be inactive or intentionally muted.';
        }

        if (flag.anomalyType === 'BACKGROUND_NOISE') {
            return 'Persistent background noise or environmental interference was detected.';
        }

        if (anomalyLabel && confidenceLabel) {
            return `${anomalyLabel} was identified as a reviewable anomaly (${confidenceLabel}).`;
        }

        if (anomalyLabel) {
            return `${anomalyLabel} crossed the configured audio anomaly threshold.`;
        }
    }

    const normalizedLabel = flagLabels[flag.type];
    const rawEventDetail = flag.rawEventType ? rawEventDetails[flag.rawEventType] : null;

    if (flag.description && flag.description !== normalizedLabel) {
        return flag.description;
    }

    return rawEventDetail?.description ?? flag.description;
}

function getNormalizationNote(flag: Flag) {
    const rawEventDetail = flag.rawEventType ? rawEventDetails[flag.rawEventType] : null;
    const rawEventTitle = rawEventDetail?.title;
    const normalizedLabel = flagLabels[flag.type];

    if (!rawEventTitle || rawEventTitle === normalizedLabel) {
        return null;
    }

    return `Normalized as ${normalizedLabel} for policy grouping.`;
}

function buildReviewNote(flag: Flag) {
    if (flag.wasSeverityForced) {
        return 'Severity was pinned by a support override for this rule.';
    }

    if (flag.severityReason === 'repeat-escalated') {
        const windowLabel = formatWindow(flag.matchingWindowSeconds);

        return windowLabel
            ? `Escalated after repeated matching behavior inside a ${windowLabel} rule window.`
            : 'Escalated after repeated matching behavior for the same telemetry rule.';
    }

    if (flag.severityReason === 'immediate-high') {
        return 'This rule stays high on first persistence because the behavior is immediately severe.';
    }

    if (flag.severityReason === 'threshold-fixed') {
        return 'This incident crossed its persistence threshold and kept its fixed severity.';
    }

    if (flag.severityReason === 'default-ladder') {
        return 'This is the first reviewable occurrence after the event crossed its persistence threshold.';
    }

    return null;
}

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
        <div className="before:via-border relative space-y-8 before:pointer-events-none before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-[#323d8f]/20 before:to-transparent">
            {timelineItems.map((item) => {
                if (item.kind === 'lifecycle') {
                    const icon =
                        item.event.eventType === 'LOCKED' ? (
                            <Lock className="h-4 w-4" />
                        ) : item.event.eventType === 'REOPENED' ? (
                            <LockOpen className="h-4 w-4" />
                        ) : item.event.eventType === 'RESET' ? (
                            <RotateCcw className="h-4 w-4" />
                        ) : item.event.eventType === 'CLOSED' ? (
                            <AlertCircle className="h-4 w-4" />
                        ) : item.event.eventType === 'FINALIZED' ? (
                            <Award className="h-4 w-4" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4" />
                        );

                    return (
                        <div
                            key={item.event.eventId}
                            className="group relative flex items-start gap-6"
                        >
                            <div className="bg-background relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#323d8f] text-[#323d8f] shadow-sm">
                                {icon}
                            </div>
                            <div className="min-w-0 flex-1 pt-1">
                                <div className="mb-2 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                                    <h4 className="text-foreground text-sm font-bold">
                                        {item.event.eventType.replaceAll('_', ' ')}
                                    </h4>
                                    <div className="text-muted-foreground flex items-center text-xs font-medium">
                                        <Clock className="mr-1 h-3 w-3" />
                                        {item.event.createdAt
                                            ? new Date(item.event.createdAt).toLocaleTimeString(
                                                  [],
                                                  {
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                      second: '2-digit',
                                                  },
                                              )
                                            : 'No timestamp'}
                                    </div>
                                </div>
                                <div className="bg-muted/30 border-border/50 rounded-xl border p-4">
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {item.event.notes ||
                                            item.event.reasonCode ||
                                            'Lifecycle event recorded for this attempt.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                }

                const flag = item.flag;
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

                return (
                    <div key={flag.id} className="group relative flex items-start gap-6">
                        {/* Timeline dot/icon */}
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

                        {/* Content */}
                        <div className="min-w-0 flex-1 pt-1">
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

                            <div className="bg-muted/30 border-border/50 group-hover:border-border/80 rounded-xl border p-4 transition-colors">
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    {description}
                                </p>

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

                                {anomalyLabel ||
                                confidenceLabel ||
                                severityReasonLabel ||
                                triggerLabel ||
                                windowLabel ? (
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

                                <IncidentEvidenceGallery
                                    flag={flag}
                                    examId={examId}
                                    studentId={studentId}
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
