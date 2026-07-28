import { supabaseAdmin } from '../../../../lib/supabase-admin';

export interface StorageObjectMetadata {
    sizeBytes: number;
    mimeType: string;
}

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
    static async inspectObject(
        bucket: string,
        path: string,
    ): Promise<StorageObjectMetadata> {
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
