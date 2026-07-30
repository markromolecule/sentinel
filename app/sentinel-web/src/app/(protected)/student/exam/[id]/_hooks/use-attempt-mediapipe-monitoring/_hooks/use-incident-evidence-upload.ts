import { useCallback, useRef } from 'react';
import type { ApiClientType } from '@sentinel/services';
import {
    completeEvidenceUpload,
    type IngestMediaPipeEvidenceCandidateResponse,
} from '@sentinel/services';
import { createSupabaseClient } from '@/data/supabase/client';

const SAFE_RETRY_ATTEMPTS = 2;

export type StartIncidentEvidenceUploadArgs = {
    apiClient: ApiClientType;
    upload: NonNullable<IngestMediaPipeEvidenceCandidateResponse['upload']>;
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
 * Uploads a browser-captured frame to the server-authorized signed target and
 * completes the evidence lifecycle without re-initializing evidence on the client.
 */
export function useIncidentEvidenceUpload() {
    const supabaseRef = useRef(createSupabaseClient());

    const startIncidentEvidenceUpload = useCallback(
        async ({ apiClient, upload, blob }: StartIncidentEvidenceUploadArgs) => {
            await retry(
                async () => {
                    const path = new URL(upload.uploadUrl).pathname
                        .replace(/^\/storage\/v1\/object\/upload\/sign\//, '')
                        .replace(/^\/object\/upload\/sign\//, '');
                    const [bucket, ...pathParts] = path.split('/');
                    const filePath = pathParts.join('/');

                    if (!bucket || !filePath) {
                        throw new Error(
                            'Evidence upload target did not include a valid storage path.',
                        );
                    }

                    const { error } = await supabaseRef.current.storage
                        .from(bucket)
                        .uploadToSignedUrl(filePath, upload.uploadToken, blob, {
                            contentType: blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp',
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

            await completeEvidenceUpload(apiClient, upload.evidenceId);
        },
        [],
    );

    return {
        startIncidentEvidenceUpload,
    };
}
