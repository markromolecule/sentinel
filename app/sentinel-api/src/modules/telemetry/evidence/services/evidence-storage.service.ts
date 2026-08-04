import { supabaseAdmin } from '../../../../lib/supabase-admin';

export interface StorageObjectMetadata {
    sizeBytes: number;
    mimeType: string;
}

export type EvidenceBucketReadinessIssueCode =
    | 'BUCKET_MISSING'
    | 'BUCKET_INACCESSIBLE'
    | 'BUCKET_PUBLIC'
    | 'MIME_TYPES_MISMATCH'
    | 'FILE_SIZE_LIMIT_TOO_SMALL';

export type EvidenceBucketReadinessIssue = {
    code: EvidenceBucketReadinessIssueCode;
    message: string;
};

export type EvidenceBucketReadinessResult = {
    bucketName: string;
    exists: boolean;
    isPublic: boolean | null;
    fileSizeLimitBytes: number | null;
    allowedMimeTypes: string[];
    ready: boolean;
    issues: EvidenceBucketReadinessIssue[];
};

/**
 * Storage service to manage private evidence assets in Supabase Storage.
 * Restricts client operations via short-lived signed upload and view targets.
 */
export class EvidenceStorageService {
    /**
     * Generates a short-lived signed upload target (URL and token) for a private path.
     *
     * @param bucket The private storage bucket
     * @param path The generated private path
     * @returns The signed URL and upload token
     */
    static async createSignedUploadTarget(
        bucket: string,
        path: string,
    ): Promise<{ signedUrl: string; token: string }> {
        try {
            const { data, error } = await supabaseAdmin.storage
                .from(bucket)
                .createSignedUploadUrl(path);

            if (error || !data?.signedUrl || !data?.token) {
                throw new Error(error?.message || 'Failed to generate signed upload URL');
            }

            return {
                signedUrl: data.signedUrl,
                token: data.token,
            };
        } catch (err: any) {
            throw new Error(`Storage signed upload target generation error: ${err.message}`);
        }
    }

    /**
     * Inspects a single object in a bucket to verify its existence and retrieve metadata.
     * Maps missing or incomplete files to errors.
     *
     * @param bucket The storage bucket
     * @param path The exact object path
     * @returns The object's verified size and MIME type
     */
    static async inspectObject(bucket: string, path: string): Promise<StorageObjectMetadata> {
        try {
            const lastSlash = path.lastIndexOf('/');
            const folder = lastSlash === -1 ? '' : path.substring(0, lastSlash);
            const filename = lastSlash === -1 ? path : path.substring(lastSlash + 1);

            const { data, error } = await supabaseAdmin.storage
                .from(bucket)
                .list(folder || undefined, {
                    limit: 100, // Safe bound to locate filename
                    search: filename,
                });

            if (error) {
                throw new Error(`List error: ${error.message}`);
            }

            const file = data?.find((f) => f.name === filename);
            if (!file) {
                throw new Error('Object not found in storage');
            }

            const sizeBytes = file.metadata?.size;
            const mimeType = file.metadata?.mimetype;

            if (sizeBytes === undefined || !mimeType) {
                throw new Error('Missing file metadata in storage');
            }

            return {
                sizeBytes,
                mimeType,
            };
        } catch (err: any) {
            throw new Error(`Storage object inspection error: ${err.message}`);
        }
    }

    /**
     * Verifies that a private evidence bucket exists and exposes the expected
     * server-side metadata without enumerating user objects.
     *
     * This readiness probe only reads bucket metadata and never lists objects,
     * so it is safe to run during deploy verification.
     */
    static async verifyBucketReadiness(args: {
        bucketName: string;
        requiredMimeTypes: readonly string[];
        minFileSizeLimitBytes: number;
    }): Promise<EvidenceBucketReadinessResult> {
        const issues: EvidenceBucketReadinessIssue[] = [];

        try {
            const { data, error } = await (supabaseAdmin.storage as any).getBucket(args.bucketName);

            if (error) {
                issues.push({
                    code: 'BUCKET_INACCESSIBLE',
                    message:
                        'Unable to read evidence bucket metadata with the service-role client.',
                });

                return {
                    bucketName: args.bucketName,
                    exists: false,
                    isPublic: null,
                    fileSizeLimitBytes: null,
                    allowedMimeTypes: [],
                    ready: false,
                    issues,
                };
            }

            if (!data) {
                issues.push({
                    code: 'BUCKET_MISSING',
                    message: 'Evidence bucket metadata was not returned.',
                });

                return {
                    bucketName: args.bucketName,
                    exists: false,
                    isPublic: null,
                    fileSizeLimitBytes: null,
                    allowedMimeTypes: [],
                    ready: false,
                    issues,
                };
            }

            const isPublic = Boolean(data.public);
            const allowedMimeTypes = Array.isArray(data.allowed_mime_types)
                ? (data.allowed_mime_types as unknown[]).filter(
                      (value: unknown): value is string => typeof value === 'string',
                  )
                : [];
            const fileSizeLimitBytes =
                typeof data.file_size_limit === 'number' ? data.file_size_limit : null;

            if (isPublic) {
                issues.push({
                    code: 'BUCKET_PUBLIC',
                    message: 'Evidence bucket must remain private.',
                });
            }

            const requiredMimeTypes = [...args.requiredMimeTypes];
            const missingMimeTypes = requiredMimeTypes.filter(
                (mimeType) => !allowedMimeTypes.includes(mimeType),
            );

            if (missingMimeTypes.length > 0) {
                issues.push({
                    code: 'MIME_TYPES_MISMATCH',
                    message: 'Evidence bucket MIME policy is missing one or more required types.',
                });
            }

            if (
                fileSizeLimitBytes === null ||
                Number.isNaN(fileSizeLimitBytes) ||
                fileSizeLimitBytes < args.minFileSizeLimitBytes
            ) {
                issues.push({
                    code: 'FILE_SIZE_LIMIT_TOO_SMALL',
                    message: 'Evidence bucket file size limit is smaller than the configured max.',
                });
            }

            return {
                bucketName: args.bucketName,
                exists: true,
                isPublic,
                fileSizeLimitBytes,
                allowedMimeTypes,
                ready: issues.length === 0,
                issues,
            };
        } catch (err: any) {
            issues.push({
                code: 'BUCKET_INACCESSIBLE',
                message: 'Unable to read evidence bucket metadata with the service-role client.',
            });

            return {
                bucketName: args.bucketName,
                exists: false,
                isPublic: null,
                fileSizeLimitBytes: null,
                allowedMimeTypes: [],
                ready: false,
                issues,
            };
        }
    }

    /**
     * Generates a temporary signed URL for viewing a private evidence image.
     *
     * @param bucket The storage bucket
     * @param path The exact object path
     * @param expiresInSeconds The URL validity duration
     * @returns The signed view URL
     */
    static async createSignedViewUrl(
        bucket: string,
        path: string,
        expiresInSeconds: number,
    ): Promise<string> {
        try {
            const { data, error } = await supabaseAdmin.storage
                .from(bucket)
                .createSignedUrl(path, expiresInSeconds);

            if (error || !data?.signedUrl) {
                throw new Error(error?.message || 'Failed to generate signed view URL');
            }

            return data.signedUrl;
        } catch (err: any) {
            throw new Error(`Storage signed view URL generation error: ${err.message}`);
        }
    }

    /**
     * Idempotently deletes a private evidence image.
     * Treats a not-found file as successfully deleted (convergence).
     *
     * @param bucket The storage bucket
     * @param path The exact object path
     */
    static async deleteObject(bucket: string, path: string): Promise<void> {
        try {
            const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
            if (error) {
                throw new Error(error.message);
            }
        } catch (err: any) {
            throw new Error(`Storage file deletion error: ${err.message}`);
        }
    }
}
