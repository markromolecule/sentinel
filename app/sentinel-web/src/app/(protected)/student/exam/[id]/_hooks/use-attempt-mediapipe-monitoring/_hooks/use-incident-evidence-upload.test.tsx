import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIncidentEvidenceUpload } from './use-incident-evidence-upload';

const {
    mockCompleteEvidenceUpload,
    mockUploadToSignedUrl,
    mockCreateSupabaseClient,
} = vi.hoisted(() => ({
    mockCompleteEvidenceUpload: vi.fn(),
    mockUploadToSignedUrl: vi.fn(),
    mockCreateSupabaseClient: vi.fn(),
}));

vi.mock('@sentinel/services', () => ({
    completeEvidenceUpload: mockCompleteEvidenceUpload,
}));

vi.mock('@/data/supabase/client', () => ({
    createSupabaseClient: mockCreateSupabaseClient,
}));

describe('useIncidentEvidenceUpload', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockCreateSupabaseClient.mockReturnValue({
            storage: {
                from: vi.fn(() => ({
                    uploadToSignedUrl: mockUploadToSignedUrl,
                })),
            },
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('uploads and completes one server-authorized evidence frame', async () => {
        mockUploadToSignedUrl.mockResolvedValue({ error: null });
        mockCompleteEvidenceUpload.mockResolvedValue({
            evidenceId: 'evidence-1',
            state: 'AVAILABLE',
            expiresAt: '2026-08-03T12:00:00.000Z',
        });

        const { result } = renderHook(() => useIncidentEvidenceUpload());

        const promise = result.current.startIncidentEvidenceUpload({
            apiClient: vi.fn(),
            upload: {
                evidenceId: 'evidence-1',
                uploadUrl:
                    'https://project.supabase.co/storage/v1/object/upload/sign/sentinel-proctoring-evidence/a/b/c.webp',
                uploadToken: 'upload-token',
                expiresAt: '2026-07-27T12:00:00.000Z',
            },
            blob: new Blob(['frame'], { type: 'image/webp' }),
        });

        await expect(promise).resolves.toBeUndefined();

        expect(mockUploadToSignedUrl).toHaveBeenCalledWith(
            'a/b/c.webp',
            'upload-token',
            expect.any(Blob),
            {
                contentType: 'image/webp',
            },
        );
        expect(mockCompleteEvidenceUpload).toHaveBeenCalledWith(expect.any(Function), 'evidence-1');
    });

    it('retries a safe storage upload failure once before succeeding', async () => {
        mockUploadToSignedUrl
            .mockRejectedValueOnce(new TypeError('network failed'))
            .mockResolvedValue({ error: null });
        mockCompleteEvidenceUpload.mockResolvedValue({
            evidenceId: 'evidence-1',
            state: 'AVAILABLE',
            expiresAt: '2026-08-03T12:00:00.000Z',
        });

        const { result } = renderHook(() => useIncidentEvidenceUpload());

        await expect(
            result.current.startIncidentEvidenceUpload({
                apiClient: vi.fn(),
                upload: {
                    evidenceId: 'evidence-1',
                    uploadUrl:
                        'https://project.supabase.co/storage/v1/object/upload/sign/sentinel-proctoring-evidence/a/b/c.webp',
                    uploadToken: 'upload-token',
                    expiresAt: '2026-07-27T12:00:00.000Z',
                },
                blob: new Blob(['frame'], { type: 'image/webp' }),
            }),
        ).resolves.toBeUndefined();

        expect(mockUploadToSignedUrl).toHaveBeenCalledTimes(2);
    });

    it('surfaces a completion failure after a successful storage upload', async () => {
        mockUploadToSignedUrl.mockResolvedValue({ error: null });
        mockCompleteEvidenceUpload.mockRejectedValue(new Error('complete failed'));

        const { result } = renderHook(() => useIncidentEvidenceUpload());

        await expect(
            result.current.startIncidentEvidenceUpload({
                apiClient: vi.fn(),
                upload: {
                    evidenceId: 'evidence-1',
                    uploadUrl:
                        'https://project.supabase.co/storage/v1/object/upload/sign/sentinel-proctoring-evidence/a/b/c.webp',
                    uploadToken: 'upload-token',
                    expiresAt: '2026-07-27T12:00:00.000Z',
                },
                blob: new Blob(['frame'], { type: 'image/jpeg' }),
            }),
        ).rejects.toThrow('complete failed');
    });

    it('completes a background upload after the hook unmounts', async () => {
        let resolveUpload: (value: { error: null }) => void = () => {
            throw new Error('Upload resolver was not initialized.');
        };
        mockUploadToSignedUrl.mockImplementation(
            () => new Promise((resolve) => {
                resolveUpload = resolve;
            }),
        );
        mockCompleteEvidenceUpload.mockResolvedValue({
            evidenceId: 'evidence-1',
            state: 'AVAILABLE',
            expiresAt: '2026-08-03T12:00:00.000Z',
        });

        const { result, unmount } = renderHook(() => useIncidentEvidenceUpload());

        const pending = result.current.startIncidentEvidenceUpload({
            apiClient: vi.fn(),
            upload: {
                evidenceId: 'evidence-1',
                uploadUrl:
                    'https://project.supabase.co/storage/v1/object/upload/sign/sentinel-proctoring-evidence/a/b/c.webp',
                uploadToken: 'upload-token',
                expiresAt: '2026-07-27T12:00:00.000Z',
            },
            blob: new Blob(['frame'], { type: 'image/jpeg' }),
        });

        unmount();
        resolveUpload({ error: null });

        await expect(pending).resolves.toBeUndefined();
        expect(mockCompleteEvidenceUpload).toHaveBeenCalledWith(
            expect.any(Function),
            'evidence-1',
        );
    });
});
