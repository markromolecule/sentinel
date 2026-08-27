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
 * Generates an RFC4122 v4 compliant UUID string.
 */
export function generateUUID(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Captures a picture from cameraRef, converts it to a blob, and uploads it to the backend
 * via authoritative candidate-ingestion and direct signed Supabase storage upload.
 */
export async function captureAndUploadEvidenceFrame({
    cameraRef,
    attemptId: _attemptId,
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

    // Convert local URI to blob
    const fileRes = await fetch(photo.uri);
    const blob = await fileRes.blob();

    // 2. Candidate-Ingestion + Supabase Storage upload flow
    try {
        const eventId = generateUUID();
        const candidate = await ingestMediaPipeEvidenceCandidate(apiClient, {
            examSessionId,
            studentId,
            timestamp,
            platform: 'WEB', // Match backend schema literal requirement
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
            const { uploadUrl, uploadToken, evidenceId } = candidate.upload;
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

            await completeEvidenceUpload(apiClient, evidenceId);
            return true;
        }

        if (
            candidate?.evidenceDecision === 'NOT_ELIGIBLE' ||
            candidate?.evidenceDecision === 'ALREADY_AVAILABLE'
        ) {
            return true; // Handled per server policy without needing upload
        }

        return false;
    } catch (err) {
        console.warn('MediaPipe candidate ingestion or evidence upload failed:', err);
        return false;
    }
}
