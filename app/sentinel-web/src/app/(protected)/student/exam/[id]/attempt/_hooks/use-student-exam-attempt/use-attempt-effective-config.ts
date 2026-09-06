import { useMemo } from 'react';
import { useAudioSettingsQuery } from '@sentinel/hooks';
import { DEFAULT_AUDIO_ANOMALY_CONFIG, DEFAULT_TELEMETRY_SETTINGS } from '@sentinel/shared';
import type {
    AudioAnomalySettings,
    ExamConfiguration,
    TelemetryMediaPipeSandboxSettings,
} from '@sentinel/shared/types';
import { resolveStudentExamMediaPipeSandbox } from '@/app/(protected)/student/exam/[id]/_lib/student-exam-flow';

export type UseAttemptEffectiveConfigArgs = {
    configuration?: ExamConfiguration;
    sessionConfiguration?: ExamConfiguration;
    mediaPipeSandbox?: TelemetryMediaPipeSandboxSettings;
    examAttemptId?: string | null;
    sessionAttemptId?: string | null;
    sessionId?: string | null;
    isBlocked: boolean;
    isRedirectingToTurnIn: boolean;
    isRedirectingToHistory: boolean;
    isTerminalAttempt: boolean;
};

/**
 * Resolves effective configuration snapshot, MediaPipe sandbox profile,
 * canonical attempt ID, inspection eligibility, and audio settings.
 */
export function useAttemptEffectiveConfig({
    configuration,
    sessionConfiguration,
    mediaPipeSandbox = DEFAULT_TELEMETRY_SETTINGS.mediaPipeSandbox,
    examAttemptId,
    sessionAttemptId,
    sessionId,
    isBlocked,
    isRedirectingToTurnIn,
    isRedirectingToHistory,
    isTerminalAttempt,
}: UseAttemptEffectiveConfigArgs) {
    const effectiveConfiguration = useMemo(
        () => sessionConfiguration ?? configuration,
        [configuration, sessionConfiguration],
    );

    const effectiveMediaPipeSandbox = useMemo(
        () =>
            resolveStudentExamMediaPipeSandbox({
                configuration: effectiveConfiguration,
                mediaPipeSandbox,
            }),
        [effectiveConfiguration, mediaPipeSandbox],
    );

    const canonicalAttemptId = sessionAttemptId ?? examAttemptId ?? null;
    const effectiveCameraRequired = Boolean(effectiveConfiguration?.cameraRequired);

    const isLiveInspectionEligible =
        Boolean(sessionId) &&
        Boolean(canonicalAttemptId) &&
        effectiveCameraRequired &&
        !isBlocked &&
        !isRedirectingToTurnIn &&
        !isRedirectingToHistory &&
        !isTerminalAttempt;

    const audioSettingsQuery = useAudioSettingsQuery();
    const effectiveAudioSettings = useMemo<AudioAnomalySettings | null>(() => {
        if (!effectiveConfiguration?.aiRules?.audio_anomaly_detection) {
            return null;
        }

        if (audioSettingsQuery.data?.value) {
            return audioSettingsQuery.data.value;
        }

        if (audioSettingsQuery.isLoading) {
            return null;
        }

        return DEFAULT_AUDIO_ANOMALY_CONFIG;
    }, [
        audioSettingsQuery.data?.value,
        audioSettingsQuery.isLoading,
        effectiveConfiguration?.aiRules?.audio_anomaly_detection,
    ]);

    return {
        effectiveConfiguration,
        effectiveMediaPipeSandbox,
        canonicalAttemptId,
        effectiveCameraRequired,
        isLiveInspectionEligible,
        effectiveAudioSettings,
    };
}
