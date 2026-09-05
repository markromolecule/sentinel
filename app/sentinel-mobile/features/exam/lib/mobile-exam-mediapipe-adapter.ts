import { DEFAULT_TELEMETRY_SETTINGS } from '@sentinel/shared';
import type { Exam, TelemetryMediaPipeSandboxSettings } from '@sentinel/shared/types';

/**
 * Resolves the active MediaPipe sandbox configuration for mobile exam sessions,
 * mirroring web logic to automatically enable checkup calibration and session monitoring
 * whenever camera is required and AI rules (gaze, face, multi-face) are active.
 */
export function resolveStudentExamMediaPipeSandbox(args: {
    configuration?: Exam['configuration'];
    mediaPipeSandbox?: TelemetryMediaPipeSandboxSettings;
}): TelemetryMediaPipeSandboxSettings | undefined {
    const { configuration, mediaPipeSandbox } = args;
    const requiresStudentExamMediaPipe = Boolean(
        configuration?.cameraRequired !== false &&
        (configuration?.aiRules?.gaze_tracking ||
            configuration?.aiRules?.face_detection ||
            configuration?.aiRules?.multiple_faces_detection)
    );

    if (!requiresStudentExamMediaPipe) {
        return mediaPipeSandbox;
    }

    const baseSettings = mediaPipeSandbox ?? DEFAULT_TELEMETRY_SETTINGS.mediaPipeSandbox;

    return {
        ...baseSettings,
        enabled: true,
        captureDuringCheckup: true,
        emitDuringExam: true,
        calibrationRequired: true,
    };
}
