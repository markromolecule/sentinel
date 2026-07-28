import { useCallback, useEffect, useRef } from 'react';
import type { ApiClientType } from '@sentinel/services';
import {
    completeEvidenceUpload,
    initializeEvidenceUpload,
    type InitializeEvidenceUploadPayload,
} from '@sentinel/services';
import { createSupabaseClient } from '@/data/supabase/client';

const SAFE_RETRY_ATTEMPTS = 2;
const QUOTA_DENIAL_BACKOFF_MS = 60_000;

const MEDIA_PIPE_EVENT_TO_EVIDENCE_EVENT = {
    GAZE_OFF_SCREEN: 'GAZE',
    NO_FACE_DETECTED: 'FACE_NOT_VISIBLE',
    MULTIPLE_FACES: 'MULTIPLE_FACES',
} as const;

type MediaPipeEvidenceEventType = keyof typeof MEDIA_PIPE_EVENT_TO_EVIDENCE_EVENT;

export type StartIncidentEvidenceUploadArgs = {
    apiClient: ApiClientType;
    attemptId: string;
    eventId: string;
    eventType: MediaPipeEvidenceEventType;
    capturedAt: string;
    blob: Blob;
};

function isRetryableHttpStatus(status: number) {
    return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function isRetryableError(error: unknown) {
    if (error instanceof TypeError) {
        return true;
    }

    if (error instanceof Error) {
        return /network|fetch|timeout|temporary/i.test(error.message);
    }

    return false;
}

async function retry<T>(
    operation: () => Promise<T>,
    canRetry: (error: unknown) => boolean,
    attempts = SAFE_RETRY_ATTEMPTS,
) {
    let lastError: unknown;

    for (let attempt = 0; attempt <= attempts; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt === attempts || !canRetry(error)) {
                throw error;
            }
        }
    }

    throw lastError;
}

/**
 * Coordinates evidence initialization, direct storage upload, and completion
 * without blocking the MediaPipe animation loop.
 */
export function useIncidentEvidenceUpload() {
    const supabaseRef = useRef(createSupabaseClient());
    const quotaDeniedUntilRef = useRef<number | null>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const startIncidentEvidenceUpload = useCallback(
        async ({
            apiClient,
            attemptId,
            eventId,
            eventType,
            capturedAt,
            blob,
        }: StartIncidentEvidenceUploadArgs) => {
            const now = Date.now();

            if (
                quotaDeniedUntilRef.current !== null &&
                quotaDeniedUntilRef.current > now
            ) {
                return;
            }

            const payload: InitializeEvidenceUploadPayload = {
                attemptId,
                eventId,
                eventType: MEDIA_PIPE_EVENT_TO_EVIDENCE_EVENT[eventType],
                capturedAt,
                mimeType:
                    blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp',
                sizeBytes: blob.size,
            };

            const initialized = await retry(
                async () => initializeEvidenceUpload(apiClient, payload),
                (error) => {
                    if (
                        typeof error === 'object' &&
                        error !== null &&
                        'status' in error &&
                        typeof (error as { status?: unknown }).status === 'number'
                    ) {
                        const status = (error as { status: number }).status;

                        if (status === 400 || status === 403) {
                            quotaDeniedUntilRef.current = now + QUOTA_DENIAL_BACKOFF_MS;
                            return false;
                        }

                        return isRetryableHttpStatus(status);
                    }

                    return isRetryableError(error);
                },
            );

            await retry(
                async () => {
                    const path = new URL(initialized.uploadUrl).pathname
                        .replace(/^\/storage\/v1\/object\/upload\/sign\//, '')
                        .replace(/^\/object\/upload\/sign\//, '');
                    const [bucket, ...pathParts] = path.split('/');
                    const filePath = pathParts.join('/');

                    if (!bucket || !filePath) {
                        throw new Error('Evidence upload target did not include a valid storage path.');
                    }

                    const { error } = await supabaseRef.current.storage
                        .from(bucket)
                        .uploadToSignedUrl(filePath, initialized.uploadToken, blob, {
                            contentType: payload.mimeType,
                        });

                    if (error) {
                        throw error;
                    }
                },
                (error) => {
                    if (
                        typeof error === 'object' &&
                        error !== null &&
                        'statusCode' in error &&
                        typeof (error as { statusCode?: unknown }).statusCode === 'number'
                    ) {
                        return isRetryableHttpStatus((error as { statusCode: number }).statusCode);
                    }

                    return isRetryableError(error);
                },
            );

            if (!isMountedRef.current) {
                return;
            }

            await completeEvidenceUpload(apiClient, initialized.evidenceId);
        },
        [],
    );

    return {
        startIncidentEvidenceUpload,
    };
}
