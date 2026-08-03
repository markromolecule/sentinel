import { describe, expect, it, vi } from 'vitest';
import { uploadFilesStep, deleteUploadedFilesStep } from './upload-files';
import type { QuestionGeneratorLlmProvider } from '../types';

describe('uploadFilesStep and deleteUploadedFilesStep', () => {
    describe('uploadFilesStep', () => {
        it('uploads files and returns LlmFile metadata', async () => {
            const mockFile = new File(['pdf-data'], 'test.pdf', { type: 'application/pdf' });
            const mockProvider: Partial<QuestionGeneratorLlmProvider> = {
                uploadFile: vi.fn().mockResolvedValue({
                    name: 'files/test-123',
                    uri: 'https://gemini/test-123',
                    mimeType: 'application/pdf',
                }),
                deleteFile: vi.fn(),
            };

            const uploaded = await uploadFilesStep(
                [mockFile],
                mockProvider as QuestionGeneratorLlmProvider,
            );
            expect(uploaded).toHaveLength(1);
            expect(uploaded[0].name).toBe('files/test-123');
            expect(mockProvider.uploadFile).toHaveBeenCalled();
        });

        it('cleans up already uploaded files if subsequent upload fails', async () => {
            const mockFile1 = new File(['pdf-1'], 'file1.pdf', { type: 'application/pdf' });
            const mockFile2 = new File(['pdf-2'], 'file2.pdf', { type: 'application/pdf' });
            const mockProvider: Partial<QuestionGeneratorLlmProvider> = {
                uploadFile: vi
                    .fn()
                    .mockResolvedValueOnce({
                        name: 'files/file1',
                        uri: 'https://gemini/file1',
                        mimeType: 'application/pdf',
                    })
                    .mockRejectedValueOnce(new Error('Upload failed')),
                deleteFile: vi.fn().mockResolvedValue(undefined),
            };

            await expect(
                uploadFilesStep(
                    [mockFile1, mockFile2],
                    mockProvider as QuestionGeneratorLlmProvider,
                ),
            ).rejects.toThrow('Upload failed');

            expect(mockProvider.deleteFile).toHaveBeenCalledWith('files/file1');
        });

        it('uploads multiple files concurrently', async () => {
            const files = [
                new File(['pdf-1'], 'file1.pdf', { type: 'application/pdf' }),
                new File(['pdf-2'], 'file2.pdf', { type: 'application/pdf' }),
            ];
            let activeCalls = 0;
            let maxActiveCalls = 0;
            const mockProvider: Partial<QuestionGeneratorLlmProvider> = {
                uploadFile: vi.fn().mockImplementation(async ({ displayName }) => {
                    activeCalls++;
                    maxActiveCalls = Math.max(maxActiveCalls, activeCalls);
                    await Promise.resolve();
                    activeCalls--;
                    return {
                        name: `files/${displayName}`,
                        uri: `https://gemini/${displayName}`,
                        mimeType: 'application/pdf',
                    };
                }),
                deleteFile: vi.fn(),
            };

            const uploaded = await uploadFilesStep(
                files,
                mockProvider as QuestionGeneratorLlmProvider,
            );

            expect(uploaded).toHaveLength(2);
            expect(maxActiveCalls).toBe(2);
        });
    });

    describe('deleteUploadedFilesStep', () => {
        it('calls provider.deleteFile for each file', async () => {
            const mockProvider: Partial<QuestionGeneratorLlmProvider> = {
                deleteFile: vi.fn().mockResolvedValue(undefined),
            };
            const files = [
                { name: 'files/file1', uri: 'https://gemini/file1', mimeType: 'pdf' },
                { name: 'files/file2', uri: 'https://gemini/file2', mimeType: 'pdf' },
            ];

            await deleteUploadedFilesStep(files, mockProvider as QuestionGeneratorLlmProvider);
            expect(mockProvider.deleteFile).toHaveBeenCalledTimes(2);
            expect(mockProvider.deleteFile).toHaveBeenCalledWith('files/file1');
            expect(mockProvider.deleteFile).toHaveBeenCalledWith('files/file2');
        });
    });
});
