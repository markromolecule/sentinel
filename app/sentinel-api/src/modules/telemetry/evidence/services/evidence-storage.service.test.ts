import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { EvidenceStorageService } from './evidence-storage.service';

vi.mock('../../../../lib/supabase-admin', () => ({
    supabaseAdmin: {
        storage: {
            from: vi.fn(),
        },
    },
}));

describe('EvidenceStorageService', () => {
    const mockBucket = 'test-evidence-bucket';
    const mockPath = 'inst-1/exam-1/attempt-1/event-1.webp';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createSignedUploadTarget', () => {
        it('returns signedUrl and token on success', async () => {
            const mockStorageFrom = {
                createSignedUploadUrl: vi.fn().mockResolvedValue({
                    data: {
                        signedUrl: 'https://supabase.co/upload-url',
                        token: 'test-upload-token',
                    },
                    error: null,
                }),
            };
            vi.mocked(supabaseAdmin.storage.from).mockReturnValue(mockStorageFrom as any);

            const result = await EvidenceStorageService.createSignedUploadTarget(
                mockBucket,
                mockPath,
            );

            expect(supabaseAdmin.storage.from).toHaveBeenCalledWith(mockBucket);
            expect(mockStorageFrom.createSignedUploadUrl).toHaveBeenCalledWith(mockPath);
            expect(result).toEqual({
                signedUrl: 'https://supabase.co/upload-url',
                token: 'test-upload-token',
            });
        });

        it('throws descriptive error on provider error', async () => {
            const mockStorageFrom = {
                createSignedUploadUrl: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Provider connection failure' },
                }),
            };
            vi.mocked(supabaseAdmin.storage.from).mockReturnValue(mockStorageFrom as any);

            await expect(
                EvidenceStorageService.createSignedUploadTarget(mockBucket, mockPath),
            ).rejects.toThrow(
                'Storage signed upload target generation error: Provider connection failure',
            );
        });
    });

    describe('inspectObject', () => {
        it('returns size and mime type on successful find', async () => {
            const mockStorageFrom = {
                list: vi.fn().mockResolvedValue({
                    data: [
                        {
                            name: 'event-1.webp',
                            metadata: {
                                size: 12345,
                                mimetype: 'image/webp',
                            },
                        },
                    ],
                    error: null,
                }),
            };
            vi.mocked(supabaseAdmin.storage.from).mockReturnValue(mockStorageFrom as any);

            const result = await EvidenceStorageService.inspectObject(mockBucket, mockPath);

            expect(supabaseAdmin.storage.from).toHaveBeenCalledWith(mockBucket);
            expect(mockStorageFrom.list).toHaveBeenCalledWith('inst-1/exam-1/attempt-1', {
                limit: 100,
                search: 'event-1.webp',
            });
            expect(result).toEqual({
                sizeBytes: 12345,
                mimeType: 'image/webp',
            });
        });

        it('throws error if file is not in list', async () => {
            const mockStorageFrom = {
                list: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                }),
            };
            vi.mocked(supabaseAdmin.storage.from).mockReturnValue(mockStorageFrom as any);

            await expect(
                EvidenceStorageService.inspectObject(mockBucket, mockPath),
            ).rejects.toThrow('Storage object inspection error: Object not found in storage');
        });

        it('throws error if metadata is missing', async () => {
            const mockStorageFrom = {
                list: vi.fn().mockResolvedValue({
                    data: [
                        {
                            name: 'event-1.webp',
                            metadata: {}, // Missing size and mimetype
                        },
                    ],
                    error: null,
                }),
            };
            vi.mocked(supabaseAdmin.storage.from).mockReturnValue(mockStorageFrom as any);

            await expect(
                EvidenceStorageService.inspectObject(mockBucket, mockPath),
            ).rejects.toThrow('Storage object inspection error: Missing file metadata in storage');
        });
    });

    describe('createSignedViewUrl', () => {
        it('returns signed view URL on success', async () => {
            const mockStorageFrom = {
                createSignedUrl: vi.fn().mockResolvedValue({
                    data: { signedUrl: 'https://supabase.co/view-url' },
                    error: null,
                }),
            };
            vi.mocked(supabaseAdmin.storage.from).mockReturnValue(mockStorageFrom as any);

            const result = await EvidenceStorageService.createSignedViewUrl(
                mockBucket,
                mockPath,
                300,
            );

            expect(mockStorageFrom.createSignedUrl).toHaveBeenCalledWith(mockPath, 300);
            expect(result).toBe('https://supabase.co/view-url');
        });

        it('throws descriptive error on failure', async () => {
            const mockStorageFrom = {
                createSignedUrl: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Expired or invalid URL parameters' },
                }),
            };
            vi.mocked(supabaseAdmin.storage.from).mockReturnValue(mockStorageFrom as any);

            await expect(
                EvidenceStorageService.createSignedViewUrl(mockBucket, mockPath, 300),
            ).rejects.toThrow(
                'Storage signed view URL generation error: Expired or invalid URL parameters',
            );
        });
    });

    describe('deleteObject', () => {
        it('resolves on successful deletion', async () => {
            const mockStorageFrom = {
                remove: vi.fn().mockResolvedValue({
                    data: [{ name: mockPath }],
                    error: null,
                }),
            };
            vi.mocked(supabaseAdmin.storage.from).mockReturnValue(mockStorageFrom as any);

            await expect(
                EvidenceStorageService.deleteObject(mockBucket, mockPath),
            ).resolves.not.toThrow();

            expect(mockStorageFrom.remove).toHaveBeenCalledWith([mockPath]);
        });

        it('throws on deletion error', async () => {
            const mockStorageFrom = {
                remove: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Network Timeout' },
                }),
            };
            vi.mocked(supabaseAdmin.storage.from).mockReturnValue(mockStorageFrom as any);

            await expect(EvidenceStorageService.deleteObject(mockBucket, mockPath)).rejects.toThrow(
                'Storage file deletion error: Network Timeout',
            );
        });
    });
});
