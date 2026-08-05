export type MediaPipeFrameDiagnostics = {
    stage: 'checkup' | 'attempt';
    sessionToken: string | null;
    detectorToken: string;
    runtimeGeneration: number;
    frameTimestampMs: number;
    videoWidth: number;
    videoHeight: number;
    faceCount: number;
};

export function buildMediaPipeFrameDiagnostics(args: MediaPipeFrameDiagnostics) {
    return {
        stage: args.stage,
        sessionToken: args.sessionToken,
        detectorToken: args.detectorToken,
        runtimeGeneration: args.runtimeGeneration,
        frameTimestampMs: args.frameTimestampMs,
        videoWidth: args.videoWidth,
        videoHeight: args.videoHeight,
        faceCount: args.faceCount,
    };
}

export function recordMediaPipeFrameDiagnostics(args: MediaPipeFrameDiagnostics) {
    if (process.env.NODE_ENV === 'production') {
        return;
    }

    console.debug('[MediaPipe frame diagnostics]', buildMediaPipeFrameDiagnostics(args));
}
