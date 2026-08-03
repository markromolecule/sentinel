import type { LlmFile, QuestionGeneratorLlmProvider } from '../types';

/**
 * Step 1: Uploads files to Gemini File API using the injected provider.
 * Automatically handles cleaning up already uploaded files in this call if a subsequent upload fails.
 */
export async function uploadFilesStep(
    files: File[],
    provider: QuestionGeneratorLlmProvider,
): Promise<LlmFile[]> {
    const uploadResults = await Promise.allSettled(
        files.map(async (file) => {
            const buffer = Buffer.from(await file.arrayBuffer());
            return await provider.uploadFile({
                buffer,
                mimeType: file.type || 'application/pdf',
                displayName: file.name,
            });
        }),
    );
    const uploadedFiles = uploadResults.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
    );
    const failedUpload = uploadResults.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    if (failedUpload) {
        await deleteUploadedFilesStep(uploadedFiles, provider);
        throw failedUpload.reason;
    }

    return uploadedFiles;
}

/**
 * Cleans up and deletes uploaded PDF references from Gemini storage.
 */
export async function deleteUploadedFilesStep(
    files: LlmFile[],
    provider: QuestionGeneratorLlmProvider,
): Promise<void> {
    const results = await Promise.allSettled(files.map((file) => provider.deleteFile(file.name)));

    results.forEach((result) => {
        if (result.status === 'rejected') {
            console.error('Failed to delete Gemini uploaded file:', result.reason);
        }
    });
}
