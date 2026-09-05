import {
    analyzeMediaPipeFrame,
    evaluateMediaPipeCalibrationCandidate,
    buildMediaPipeCalibrationProfile,
    type MediaPipeCalibrationProfile,
    type MediaPipeFrameAnalysis,
    type MediaPipeLandmark,
    type MediaPipeCalibrationEvaluationResult,
    type MediaPipeCalibrationSample,
} from '@sentinel/shared';

/**
 * Arguments for evaluateMobileCheckupFrame.
 */
export type EvaluateMobileCheckupFrameArgs = {
    landmarksByFace: MediaPipeLandmark[][];
    confidenceThreshold: number;
    calibrationProfile?: MediaPipeCalibrationProfile | null;
};

/**
 * Result of evaluateMobileCheckupFrame.
 */
export type EvaluateMobileCheckupFrameResult = {
    analysis: MediaPipeFrameAnalysis;
    evaluation: MediaPipeCalibrationEvaluationResult;
};

/**
 * Wraps @sentinel/shared functions to analyze a mobile video frame and evaluate its suitability
 * as a calibration candidate.
 *
 * @param args.landmarksByFace - Landmarker results by detected face.
 * @param args.confidenceThreshold - Minimum confidence score required to consider a face candidate.
 * @param args.calibrationProfile - Active calibration profile, if any, to use for gaze direction comparison.
 * @returns Object containing the frame analysis and calibration evaluation results.
 */
export function evaluateMobileCheckupFrame(
    args: EvaluateMobileCheckupFrameArgs,
): EvaluateMobileCheckupFrameResult {
    const analysis = analyzeMediaPipeFrame({
        landmarksByFace: args.landmarksByFace,
        confidenceThreshold: args.confidenceThreshold,
        tolerateDownwardGaze: true,
        calibrationProfile: args.calibrationProfile,
    });

    const landmarks = args.landmarksByFace[0] ?? [];
    const evaluation = evaluateMediaPipeCalibrationCandidate({
        analysis,
        landmarks,
        confidenceThreshold: args.confidenceThreshold,
    });

    return { analysis, evaluation };
}

/**
 * Compares two calibration samples to determine if they are stable.
 * This checks that horizontal and vertical deltas for face bounds, head pose, and iris positions
 * do not exceed specific tolerances, ensuring the user is holding still.
 *
 * @param previousSample - The last stored calibration sample, if any.
 * @param nextSample - The newly captured calibration candidate sample.
 * @returns True if the position delta is within stable boundaries; otherwise false.
 */
export function isMobileCalibrationStable(
    previousSample: MediaPipeCalibrationSample | null,
    nextSample: MediaPipeCalibrationSample,
): boolean {
    if (!previousSample) {
        return true;
    }

    const faceCenterDelta =
        Math.abs(nextSample.faceBounds.centerX - previousSample.faceBounds.centerX) +
        Math.abs(nextSample.faceBounds.centerY - previousSample.faceBounds.centerY);

    const headDelta =
        nextSample.gaze.headHorizontalOffset !== null &&
            previousSample.gaze.headHorizontalOffset !== null &&
            nextSample.gaze.headVerticalOffset !== null &&
            previousSample.gaze.headVerticalOffset !== null
            ? Math.abs(
                nextSample.gaze.headHorizontalOffset - previousSample.gaze.headHorizontalOffset,
            ) +
            Math.abs(nextSample.gaze.headVerticalOffset - previousSample.gaze.headVerticalOffset)
            : 0;

    const irisDelta =
        nextSample.gaze.irisHorizontalOffset !== null &&
            previousSample.gaze.irisHorizontalOffset !== null &&
            nextSample.gaze.irisVerticalOffset !== null &&
            previousSample.gaze.irisVerticalOffset !== null
            ? Math.abs(
                nextSample.gaze.irisHorizontalOffset - previousSample.gaze.irisHorizontalOffset,
            ) +
            Math.abs(nextSample.gaze.irisVerticalOffset - previousSample.gaze.irisVerticalOffset)
            : 0;

    return faceCenterDelta <= 0.08 && headDelta <= 0.12 && irisDelta <= 0.28;
}

/**
 * Builds a calibration profile from a set of stable calibration samples.
 *
 * @param args.samples - A list of stable MediaPipe calibration samples.
 * @param args.createdAt - Optional creation ISO string.
 * @returns The generated calibration profile, or null if sample set is empty.
 */
export function buildMobileCalibrationProfile(args: {
    samples: MediaPipeCalibrationSample[];
    createdAt?: string;
}): MediaPipeCalibrationProfile | null {
    return buildMediaPipeCalibrationProfile(args);
}
