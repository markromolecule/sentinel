import { useRef, useCallback } from 'react';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { MEDIAPIPE_MODEL_PATH, MEDIAPIPE_WASM_PATH } from '../_constants';
import type { ResolvedMediaPipeSandbox } from '../_types';

export type UseMediapipeFaceLandmarkerResult = {
    faceLandmarkerRef: React.MutableRefObject<FaceLandmarker | null>;
    initFaceLandmarker: (
        preLoadedFaceLandmarker: FaceLandmarker | null,
        sandbox: ResolvedMediaPipeSandbox,
        isDisposed: () => boolean,
    ) => Promise<FaceLandmarker | null>;
    closeFaceLandmarker: (preLoadedFaceLandmarker: FaceLandmarker | null) => void;
};

/**
 * Custom hook to manage the lifecycle of the MediaPipe FaceLandmarker.
 * Handles lazy loading and setup of FaceLandmarker, and closes/releases its resources.
 */
export function useMediapipeFaceLandmarker(): UseMediapipeFaceLandmarkerResult {
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);

    const initFaceLandmarker = useCallback(
        async (
            preLoadedFaceLandmarker: FaceLandmarker | null,
            sandbox: ResolvedMediaPipeSandbox,
            isDisposed: () => boolean,
        ): Promise<FaceLandmarker | null> => {
            if (preLoadedFaceLandmarker) {
                faceLandmarkerRef.current = preLoadedFaceLandmarker;
                return preLoadedFaceLandmarker;
            }

            const visionModule = await import('@mediapipe/tasks-vision');
            const resolver = await visionModule.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);

            if (isDisposed()) return null;

            const landmarker = await visionModule.FaceLandmarker.createFromOptions(resolver, {
                baseOptions: { modelAssetPath: MEDIAPIPE_MODEL_PATH },
                runningMode: 'VIDEO',
                numFaces: 2,
                minFaceDetectionConfidence: Math.max(0.35, sandbox.confidenceThreshold - 0.2),
                minFacePresenceConfidence: Math.max(0.35, sandbox.confidenceThreshold - 0.2),
                minTrackingConfidence: Math.max(0.35, sandbox.confidenceThreshold - 0.2),
            });

            if (isDisposed()) {
                if (landmarker && typeof landmarker.close === 'function') {
                    landmarker.close();
                }
                return null;
            }

            faceLandmarkerRef.current = landmarker;
            return landmarker;
        },
        [],
    );

    const closeFaceLandmarker = useCallback((preLoadedFaceLandmarker: FaceLandmarker | null) => {
        if (faceLandmarkerRef.current && typeof faceLandmarkerRef.current.close === 'function') {
            // Only close if we initialized it locally; otherwise, let the provider manage it.
            if (faceLandmarkerRef.current !== preLoadedFaceLandmarker) {
                faceLandmarkerRef.current.close();
            }
        }
        faceLandmarkerRef.current = null;
    }, []);

    return {
        faceLandmarkerRef,
        initFaceLandmarker,
        closeFaceLandmarker,
    };
}
