import {
    DEFAULT_TELEMETRY_SETTINGS,
    type MediaPipeCalibrationProfile,
    type MediaPipeFaceBounds,
} from '@sentinel/shared';
import type {
    StudentExamMediaPipeConfigurationLike,
    StudentExamMediaPipeSandboxLike,
    StudentExamMediaPipeActivationSource,
} from '../_types';

export function normalizeStoredDate(value: unknown): string | null {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function normalizeStoredActivationSource(
    value: unknown,
): StudentExamMediaPipeActivationSource | null {
    return value === 'checkup' ? value : null;
}

export function normalizeNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function normalizeNullableNumber(value: unknown): number | null {
    return value === null ? null : normalizeNumber(value);
}

export function normalizeFaceBounds(value: unknown): MediaPipeFaceBounds | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const faceBounds = value as Partial<Record<keyof MediaPipeFaceBounds, unknown>>;
    const minX = normalizeNumber(faceBounds.minX);
    const minY = normalizeNumber(faceBounds.minY);
    const maxX = normalizeNumber(faceBounds.maxX);
    const maxY = normalizeNumber(faceBounds.maxY);
    const width = normalizeNumber(faceBounds.width);
    const height = normalizeNumber(faceBounds.height);
    const centerX = normalizeNumber(faceBounds.centerX);
    const centerY = normalizeNumber(faceBounds.centerY);

    if (
        minX === null ||
        minY === null ||
        maxX === null ||
        maxY === null ||
        width === null ||
        height === null ||
        centerX === null ||
        centerY === null
    ) {
        return null;
    }

    return { minX, minY, maxX, maxY, width, height, centerX, centerY };
}

export function normalizeMediaPipeCalibrationProfile(
    value: unknown,
): MediaPipeCalibrationProfile | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const profile = value as Partial<MediaPipeCalibrationProfile>;
    const createdAt = normalizeStoredDate(profile.createdAt);
    const sampleCount = normalizeNumber(profile.sampleCount);
    const confidenceScore = normalizeNullableNumber(profile.confidenceScore);
    const faceBounds = normalizeFaceBounds(profile.faceBounds);
    const neutralGaze = profile.neutralGaze;
    const thresholds = profile.thresholds;

    if (
        profile.version !== 1 ||
        !createdAt ||
        sampleCount === null ||
        !faceBounds ||
        !neutralGaze ||
        !thresholds
    ) {
        return null;
    }

    return {
        version: 1,
        createdAt,
        sampleCount,
        confidenceScore,
        faceBounds,
        neutralGaze: {
            irisHorizontalOffset: normalizeNullableNumber(neutralGaze.irisHorizontalOffset),
            irisVerticalOffset: normalizeNullableNumber(neutralGaze.irisVerticalOffset),
            headHorizontalOffset: normalizeNullableNumber(neutralGaze.headHorizontalOffset),
            headVerticalOffset: normalizeNullableNumber(neutralGaze.headVerticalOffset),
            eyeAspectRatio: normalizeNullableNumber(neutralGaze.eyeAspectRatio),
        },
        thresholds: {
            irisHorizontalDelta: normalizeNumber(thresholds.irisHorizontalDelta)!,
            irisVerticalDeltaUp: normalizeNumber(thresholds.irisVerticalDeltaUp)!,
            irisVerticalDeltaDown: normalizeNumber(thresholds.irisVerticalDeltaDown)!,
            headHorizontalDelta: normalizeNumber(thresholds.headHorizontalDelta)!,
            headVerticalDeltaUp: normalizeNumber(thresholds.headVerticalDeltaUp)!,
            headVerticalDeltaDown: normalizeNumber(thresholds.headVerticalDeltaDown)!,
        },
    };
}

export function resolveStudentExamMediaPipeSandbox(args: {
    configuration: StudentExamMediaPipeConfigurationLike | undefined;
    mediaPipeSandbox?: StudentExamMediaPipeSandboxLike;
}): StudentExamMediaPipeSandboxLike {
    const {
        configuration,
        mediaPipeSandbox = DEFAULT_TELEMETRY_SETTINGS.mediaPipeSandbox,
    } = args;
    const requiresStudentExamMediaPipe = Boolean(
        configuration?.cameraRequired &&
        (configuration.aiRules?.gaze_tracking ||
            configuration.aiRules?.face_detection ||
            configuration.aiRules?.multiple_faces_detection),
    );

    if (!requiresStudentExamMediaPipe) {
        return mediaPipeSandbox;
    }

    return {
        ...mediaPipeSandbox,
        enabled: true,
        captureDuringCheckup: true,
        emitDuringExam: true,
        calibrationRequired: true,
    };
}
