import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    buildMediaPipeFrameDiagnostics,
    recordMediaPipeFrameDiagnostics,
} from './mediapipe-diagnostics';

describe('mediapipe diagnostics', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('builds a redacted frame diagnostics payload', () => {
        expect(
            buildMediaPipeFrameDiagnostics({
                stage: 'attempt',
                sessionToken: 'session-1',
                detectorToken: 'attempt:4',
                runtimeGeneration: 4,
                frameTimestampMs: 1234,
                videoWidth: 1280,
                videoHeight: 720,
                faceCount: 2,
            }),
        ).toEqual({
            stage: 'attempt',
            sessionToken: 'session-1',
            detectorToken: 'attempt:4',
            runtimeGeneration: 4,
            frameTimestampMs: 1234,
            videoWidth: 1280,
            videoHeight: 720,
            faceCount: 2,
        });
    });

    it('writes the diagnostics payload to console in non-production builds', () => {
        const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
        vi.stubEnv('NODE_ENV', 'development');

        recordMediaPipeFrameDiagnostics({
            stage: 'checkup',
            sessionToken: null,
            detectorToken: 'checkup:2',
            runtimeGeneration: 2,
            frameTimestampMs: 250,
            videoWidth: 1920,
            videoHeight: 1080,
            faceCount: 1,
        });

        expect(debugSpy).toHaveBeenCalledWith('[MediaPipe frame diagnostics]', {
            stage: 'checkup',
            sessionToken: null,
            detectorToken: 'checkup:2',
            runtimeGeneration: 2,
            frameTimestampMs: 250,
            videoWidth: 1920,
            videoHeight: 1080,
            faceCount: 1,
        });
    });
});
