import { useRef, useCallback } from 'react';
import { attachMediaPipeStreamToVideo } from '../_utils';

export type UseCameraStreamResult = {
    streamRef: React.MutableRefObject<MediaStream | null>;
    ownsStreamRef: React.MutableRefObject<boolean>;
    startStream: (
        sharedStream: MediaStream | null,
        videoElement: HTMLVideoElement | null,
    ) => Promise<MediaStream>;
    stopStream: (videoElement: HTMLVideoElement | null) => void;
};

/**
 * Custom hook to manage the camera stream lifecycle.
 * Handles acquiring the stream (either using a shared stream or calling getUserMedia),
 * binding the stream to the HTMLVideoElement, and cleaning up tracks on stop.
 */
export function useCameraStream(): UseCameraStreamResult {
    const streamRef = useRef<MediaStream | null>(null);
    const ownsStreamRef = useRef(false);

    const startStream = useCallback(
        async (
            sharedStream: MediaStream | null,
            videoElement: HTMLVideoElement | null,
        ): Promise<MediaStream> => {
            const stream =
                sharedStream ??
                (await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                }));

            streamRef.current = stream;
            ownsStreamRef.current = !sharedStream;

            attachMediaPipeStreamToVideo(videoElement, stream);
            return stream;
        },
        [],
    );

    const stopStream = useCallback((videoElement: HTMLVideoElement | null) => {
        if (streamRef.current && ownsStreamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
        }

        streamRef.current = null;
        ownsStreamRef.current = false;

        if (videoElement) {
            videoElement.srcObject = null;
        }
    }, []);

    return {
        streamRef,
        ownsStreamRef,
        startStream,
        stopStream,
    };
}
