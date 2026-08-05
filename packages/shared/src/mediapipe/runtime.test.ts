import { describe, expect, it } from 'vitest';
import {
    createMediaPipeSignalTrackerState,
    createMediaPipeMultipleFacesConfirmationState,
    evaluateMediaPipeSignalDispatch,
    evaluateMediaPipeMultipleFacesConfirmation,
    resolveMediaPipeThresholds,
} from './runtime';

const thresholds = resolveMediaPipeThresholds({
    sandbox: {
        enabled: true,
        captureDuringCheckup: true,
        emitDuringExam: true,
        confidenceThreshold: 0.6,
        frameIntervalMs: 500,
        offScreenDurationMs: 1000,
        calibrationRequired: false,
        debugOverlayEnabled: false,
    },
});

describe('evaluateMediaPipeSignalDispatch', () => {
    it('emits once the active signal reaches the duration threshold', () => {
        let tracker = createMediaPipeSignalTrackerState();

        tracker = evaluateMediaPipeSignalDispatch({
            currentSignal: 'GAZE_OFF_SCREEN',
            tracker,
            nowMs: 500,
            thresholds,
            signalGapGraceMs: 500,
        }).tracker;

        const dispatch = evaluateMediaPipeSignalDispatch({
            currentSignal: 'GAZE_OFF_SCREEN',
            tracker,
            nowMs: 1500,
            thresholds,
            signalGapGraceMs: 500,
        });

        expect(dispatch.shouldEmit).toBe(true);
        expect(dispatch.durationMs).toBe(1000);
        expect(dispatch.aggregation).toMatchObject({
            trigger: 'duration-threshold',
            threshold: 1000,
        });
    });

    it('preserves a sustained signal across a one-frame interruption inside the grace window', () => {
        let tracker = evaluateMediaPipeSignalDispatch({
            currentSignal: 'GAZE_OFF_SCREEN',
            tracker: createMediaPipeSignalTrackerState(),
            nowMs: 500,
            thresholds,
            signalGapGraceMs: 500,
        }).tracker;

        tracker = evaluateMediaPipeSignalDispatch({
            currentSignal: null,
            tracker,
            nowMs: 1000,
            thresholds,
            signalGapGraceMs: 500,
        }).tracker;

        const dispatch = evaluateMediaPipeSignalDispatch({
            currentSignal: 'GAZE_OFF_SCREEN',
            tracker,
            nowMs: 1500,
            thresholds,
            signalGapGraceMs: 500,
        });

        expect(dispatch.shouldEmit).toBe(true);
        expect(dispatch.durationMs).toBe(1000);
        expect(dispatch.tracker.activeSinceMs).toBe(500);
    });

    it('resets the tracker after the interruption exceeds the bounded grace window', () => {
        let tracker = evaluateMediaPipeSignalDispatch({
            currentSignal: 'GAZE_OFF_SCREEN',
            tracker: createMediaPipeSignalTrackerState(),
            nowMs: 500,
            thresholds,
            signalGapGraceMs: 500,
        }).tracker;

        tracker = evaluateMediaPipeSignalDispatch({
            currentSignal: null,
            tracker,
            nowMs: 1501,
            thresholds,
            signalGapGraceMs: 500,
        }).tracker;

        expect(tracker).toEqual(createMediaPipeSignalTrackerState());
    });

    it('keeps repeated frames suppressed after the first emission until the signal clears', () => {
        let tracker = evaluateMediaPipeSignalDispatch({
            currentSignal: 'GAZE_OFF_SCREEN',
            tracker: createMediaPipeSignalTrackerState(),
            nowMs: 500,
            thresholds,
            signalGapGraceMs: 500,
        }).tracker;

        tracker = evaluateMediaPipeSignalDispatch({
            currentSignal: 'GAZE_OFF_SCREEN',
            tracker,
            nowMs: 1500,
            thresholds,
            signalGapGraceMs: 500,
        }).tracker;

        const dispatch = evaluateMediaPipeSignalDispatch({
            currentSignal: 'GAZE_OFF_SCREEN',
            tracker,
            nowMs: 2000,
            thresholds,
            signalGapGraceMs: 500,
        });

        expect(dispatch.shouldEmit).toBe(false);
        expect(dispatch.tracker.lastEmittedAtMs).toBe(1500);
    });
});

describe('evaluateMediaPipeMultipleFacesConfirmation', () => {
    const multipleFacesAnalysis = {
        status: 'multiple-faces' as const,
        signal: 'MULTIPLE_FACES' as const,
        faceCount: 2,
        confidenceScore: 0.92,
        gazeDirection: null,
        eyeState: 'unknown' as const,
        faceBounds: null,
        reasons: ['More than one face was detected in the active camera frame.'],
    };

    it('keeps a single duplicate frame transient until the confirmation window is met', () => {
        const firstFrame = evaluateMediaPipeMultipleFacesConfirmation({
            analysis: multipleFacesAnalysis,
            state: createMediaPipeMultipleFacesConfirmationState(),
            minimumConsecutiveFrames: 2,
        });

        expect(firstFrame.isConfirmed).toBe(false);
        expect(firstFrame.analysis.status).toBe('ready');
        expect(firstFrame.analysis.signal).toBeNull();
        expect(firstFrame.state.consecutiveMultipleFacesFrames).toBe(1);

        const secondFrame = evaluateMediaPipeMultipleFacesConfirmation({
            analysis: multipleFacesAnalysis,
            state: firstFrame.state,
            minimumConsecutiveFrames: 2,
        });

        expect(secondFrame.isConfirmed).toBe(true);
        expect(secondFrame.analysis.status).toBe('multiple-faces');
        expect(secondFrame.state.consecutiveMultipleFacesFrames).toBe(2);
    });

    it('resets confirmation state after a single-face frame appears', () => {
        const confirmedFrame = evaluateMediaPipeMultipleFacesConfirmation({
            analysis: multipleFacesAnalysis,
            state: createMediaPipeMultipleFacesConfirmationState(),
            minimumConsecutiveFrames: 2,
        });

        const resetFrame = evaluateMediaPipeMultipleFacesConfirmation({
            analysis: {
                status: 'ready',
                signal: null,
                faceCount: 1,
                confidenceScore: 0.9,
                gazeDirection: 'center',
                eyeState: 'open',
                faceBounds: null,
                reasons: ['Single-face tracking is stable and aligned with the active thresholds.'],
            },
            state: confirmedFrame.state,
            minimumConsecutiveFrames: 2,
        });

        expect(resetFrame.isConfirmed).toBe(false);
        expect(resetFrame.state).toEqual(createMediaPipeMultipleFacesConfirmationState());
    });
});
