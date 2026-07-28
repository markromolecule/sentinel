import type { Flag } from '@sentinel/shared/types';
import { flagLabels } from '@sentinel/shared/constants';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const AUDIO_ANOMALY_BADGE_STYLES = {
    TALKING: 'bg-red-100 text-red-700 border-red-200',
    TYPING: 'bg-amber-100 text-amber-700 border-amber-200',
    TAPPING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    MOUTH_BREATHING: 'bg-sky-100 text-sky-700 border-sky-200',
    BACKGROUND_NOISE: 'bg-slate-100 text-slate-700 border-slate-200',
    SILENCE_DETECTED: 'bg-indigo-100 text-indigo-700 border-indigo-200',
} as const;

export const RAW_EVENT_DETAILS: Partial<
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

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable label for an audio anomaly type.
 */
export function formatAudioAnomalyLabel(anomalyType?: Flag['anomalyType']) {
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

/**
 * Formats a duration window (in seconds) as a human-readable label.
 */
export function formatWindow(seconds?: number | null) {
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

/**
 * Returns a human-readable label for a persistence trigger value.
 */
export function formatTrigger(trigger?: Flag['persistenceTrigger']) {
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

/**
 * Returns a human-readable label for a severity reason.
 */
export function formatSeverityReason(reason?: Flag['severityReason']) {
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

/**
 * Returns an occurrence label (e.g. "x3") when an event has repeated more than once.
 */
export function formatOccurrenceLabel(occurrenceCount?: number) {
    return occurrenceCount && occurrenceCount > 1 ? `x${occurrenceCount}` : null;
}

// ---------------------------------------------------------------------------
// Flag text derivation helpers
// ---------------------------------------------------------------------------

/**
 * Derives the display title for a flag timeline item.
 */
export function getTimelineTitle(flag: Flag) {
    if (flag.type === 'AUDIO_DETECTED' && flag.anomalyType) {
        return `${formatAudioAnomalyLabel(flag.anomalyType)} detected`;
    }

    const rawEventDetail = flag.rawEventType ? RAW_EVENT_DETAILS[flag.rawEventType] : null;

    return rawEventDetail?.title ?? flagLabels[flag.type];
}

/**
 * Derives the display description for a flag timeline item.
 */
export function getTimelineDescription(flag: Flag) {
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
    const rawEventDetail = flag.rawEventType ? RAW_EVENT_DETAILS[flag.rawEventType] : null;

    if (flag.description && flag.description !== normalizedLabel) {
        return flag.description;
    }

    return rawEventDetail?.description ?? flag.description;
}

/**
 * Derives an optional normalization note explaining why a raw event was
 * grouped under a different flag type bucket.
 */
export function getNormalizationNote(flag: Flag) {
    const rawEventDetail = flag.rawEventType ? RAW_EVENT_DETAILS[flag.rawEventType] : null;
    const rawEventTitle = rawEventDetail?.title;
    const normalizedLabel = flagLabels[flag.type];

    if (!rawEventTitle || rawEventTitle === normalizedLabel) {
        return null;
    }

    return `Normalized as ${normalizedLabel} for policy grouping.`;
}

/**
 * Builds a contextual review note explaining the severity decision for a flag.
 */
export function buildReviewNote(flag: Flag) {
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
