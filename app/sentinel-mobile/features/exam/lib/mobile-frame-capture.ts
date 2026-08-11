import type { ApiClientType } from '@sentinel/services';
import { ingestMediaPipeEvidenceCandidate, completeEvidenceUpload } from '@sentinel/services';

export type UploadEvidenceFrameArgs = {
    cameraRef: any;
    attemptId: string;
    examSessionId: string;
    studentId: string;
    eventType: 'GAZE_OFF_SCREEN' | 'MULTIPLE_FACES' | 'NO_FACE_DETECTED';
    apiClient: ApiClientType;
    supabase: any;
};

/**
 * Captures a picture from expo-camera, converts it, and uploads it to the backend.
 * Uses the candidate-ingestion & Supabase upload flow first, with a fallback to the
 * direct incident evidence route.
 */
export async function captureAndUploadEvidenceFrame({
    cameraRef,
    attemptId,
    examSessionId,
    studentId,
    eventType,
    apiClient,
    supabase,
}: UploadEvidenceFrameArgs): Promise<boolean> {
    if (!cameraRef?.current) {
        console.warn('Camera reference is not available for frame capture.');
        return false;
    }

    // 1. Take snapshot picture
    const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
    });

    if (!photo || !photo.uri) {
        throw new Error('Failed to capture photo from camera.');
    }

    const timestamp = new Date().toISOString();
    const base64Image = photo.base64 || '';

    // Convert local URI to blob
    const fileRes = await fetch(photo.uri);
    const blob = await fileRes.blob();

    let flowSuccess = false;

    // A. Attempt Candidate-Ingestion + Supabase flow
    try {
        const eventId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const candidate = await ingestMediaPipeEvidenceCandidate(apiClient, {
            examSessionId,
            studentId,
            timestamp,
            platform: 'WEB', // Match schema literal requirement
            source: 'AI',
            ruleKey: `aiRules.${
                eventType === 'GAZE_OFF_SCREEN'
                    ? 'gaze_tracking'
                    : eventType === 'MULTIPLE_FACES'
                      ? 'multiple_faces_detection'
                      : 'face_detection'
            }`,
            eventType,
            metadata: {
                eventId,
                dedupeKey: `${examSessionId}:${eventType}:${eventId}`,
                clientActionAt: timestamp,
            },
            capture: {
                capturedAt: timestamp,
                mimeType: 'image/jpeg',
                sizeBytes: blob.size,
            },
        });

        if (candidate?.evidenceDecision === 'UPLOAD' && candidate.upload) {
            const { uploadUrl, uploadToken } = candidate.upload;
            const path = new URL(uploadUrl).pathname
                .replace(/^\/storage\/v1\/object\/upload\/sign\//, '')
                .replace(/^\/object\/upload\/sign\//, '');
            const [bucket, ...pathParts] = path.split('/');
            const filePath = pathParts.join('/');

            const { error } = await supabase.storage
                .from(bucket)
                .uploadToSignedUrl(filePath, uploadToken, blob, {
                    contentType: 'image/jpeg',
                });

            if (error) throw error;

            await completeEvidenceUpload(apiClient, candidate.upload.evidenceId);
            flowSuccess = true;
        } else if (
            candidate?.evidenceDecision === 'NOT_ELIGIBLE' ||
            candidate?.evidenceDecision === 'ALREADY_AVAILABLE'
        ) {
            flowSuccess = true; // No upload needed
        }
    } catch (err) {
        console.warn('Candidate ingestion flow failed, attempting fallback endpoint...', err);
    }

    // B. Fallback: post directly to the attempt evidence endpoint
    try {
        await apiClient(`/student/exam-attempts/${attemptId}/incidents/evidence`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                base64Image,
                eventType,
                timestamp,
            }),
        });
        flowSuccess = true;
    } catch (err) {
        if (!flowSuccess) {
            console.error('Direct fallback endpoint upload failed.', err);
            throw err;
        }
    }

    return flowSuccess;
}
