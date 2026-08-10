/**
 * Configuration options for the mobile audio level evaluation.
 */
export type AudioLevelEvaluationConfig = {
    /**
     * Decibel level representing absolute silence (noise floor).
     * Defaults to -60 dB.
     */
    silenceFloorDb?: number;
    /**
     * Decibel level representing maximum peak volume.
     * Defaults to 0 dB.
     */
    peakDb?: number;
    /**
     * Threshold (0-1 normalized range) below which audio is considered silent.
     * Defaults to 0.02.
     */
    silenceThreshold?: number;
    /**
     * Threshold (0-1 normalized range) above which audio is considered active voice/noise.
     * Defaults to 0.15.
     */
    voiceThreshold?: number;
};

/**
 * Result of evaluating the mobile audio level.
 */
export type AudioLevelEvaluationResult = {
    /**
     * Normalized audio level on a scale from 0 to 1.
     */
    normalizedLevel: number;
    /**
     * Whether the audio level is classified as silence.
     */
    isSilence: boolean;
    /**
     * Whether the audio level indicates voice or significant room activity.
     */
    isVoiceActivity: boolean;
};

/**
 * Mobile Audio Analyzer state.
 */
export type MobileAudioAnalyzer = {
    sampleRate: number;
    numberOfChannels: number;
    isMeteringEnabled: boolean;
    silenceFloorDb: number;
    peakDb: number;
};

/**
 * Creates a mock WebAudio / microphone analyzer configuration for mobile compatibility.
 * Holds audio settings and thresholds for level metering.
 *
 * @param options - Custom options to override default analyzer parameters.
 * @returns The initialized MobileAudioAnalyzer object.
 */
export function createMobileAudioAnalyzer(
    options?: Partial<MobileAudioAnalyzer>,
): MobileAudioAnalyzer {
    return {
        sampleRate: options?.sampleRate ?? 44100,
        numberOfChannels: options?.numberOfChannels ?? 1,
        isMeteringEnabled: options?.isMeteringEnabled ?? true,
        silenceFloorDb: options?.silenceFloorDb ?? -60,
        peakDb: options?.peakDb ?? 0,
    };
}

/**
 * Normalizes a raw decibel metering value and evaluates whether it represents
 * silence or active room/voice activity.
 *
 * @param meteringDb - Raw decibel level (usually -160 to 0).
 * @param config - Thresholds and boundaries for evaluation.
 * @returns Evaluation result containing normalized level, isSilence, and isVoiceActivity flags.
 */
export function evaluateMobileAudioLevel(
    meteringDb: number,
    config?: AudioLevelEvaluationConfig,
): AudioLevelEvaluationResult {
    const silenceFloor = config?.silenceFloorDb ?? -60;
    const peak = config?.peakDb ?? 0;
    const silenceThreshold = config?.silenceThreshold ?? 0.02;
    const voiceThreshold = config?.voiceThreshold ?? 0.15;

    // Guard against values below floor or invalid inputs
    const dbValue = Math.max(silenceFloor, Math.min(peak, meteringDb));

    // Normalize dB range: (db - floor) / (peak - floor)
    const range = peak - silenceFloor;
    const normalizedLevel = range > 0 ? (dbValue - silenceFloor) / range : 0;

    const isSilence = normalizedLevel < silenceThreshold;
    const isVoiceActivity = normalizedLevel > voiceThreshold;

    return {
        normalizedLevel,
        isSilence,
        isVoiceActivity,
    };
}
