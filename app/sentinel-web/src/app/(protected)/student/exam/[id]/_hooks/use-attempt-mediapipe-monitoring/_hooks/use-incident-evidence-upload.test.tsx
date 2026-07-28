import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useIncidentEvidenceUpload } from './use-incident-evidence-upload';

const {
    mockInitializeEvidenceUpload,
    mockCompleteEvidenceUpload,
    mockUploadToSignedUrl,
    mockCreateSupabaseClient,
} = vi.hoisted(() => ({
    mockInitializeEvidenceUpload: vi.fn(),
    mockCompleteEvidenceUpload: vi.fn(),
    mockUploadToSignedUrl: vi.fn(),
    mockCreateSupabaseClient: vi.fn(),
}));

vi.mock('@sentinel/services', () => ({
    initializeEvidenceUpload: mockInitializeEvidenceUpload,
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

    it('initializes, uploads, and completes one evidence frame', async () => {
        mockInitializeEvidenceUpload.mockResolvedValue({
            evidenceId: 'evidence-1',
            uploadUrl:
                'https://project.supabase.co/storage/v1/object/upload/sign/sentinel-proctoring-evidence/a/b/c.webp',
            uploadToken: 'upload-token',
            expiresAt: '2026-07-27T12:00:00.000Z',
        });
        mockUploadToSignedUrl.mockResolvedValue({ error: null });
        mockCompleteEvidenceUpload.mockResolvedValue({
            evidenceId: 'evidence-1',
            state: 'AVAILABLE',
            expiresAt: '2026-08-03T12:00:00.000Z',
        });

        const { result } = renderHook(() => useIncidentEvidenceUpload());

        const promise = result.current.startIncidentEvidenceUpload({
            apiClient: vi.fn(),
            attemptId: 'attempt-1',
            eventId: 'event-1',
            eventType: 'GAZE_OFF_SCREEN',
            capturedAt: '2026-07-27T12:00:00.000Z',
            blob: new Blob(['frame'], { type: 'image/webp' }),
        });

        await expect(promise).resolves.toBeUndefined();

        expect(mockInitializeEvidenceUpload).toHaveBeenCalledWith(
            expect.any(Function),
            expect.objectContaining({
                attemptId: 'attempt-1',
                eventId: 'event-1',
                eventType: 'GAZE',
            }),
        );
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

    it('retries a safe initialization failure once before succeeding', async () => {
        mockInitializeEvidenceUpload
            .mockRejectedValueOnce(new TypeError('network failed'))
            .mockResolvedValue({
                evidenceId: 'evidence-1',
                uploadUrl:
                    'https://project.supabase.co/storage/v1/object/upload/sign/sentinel-proctoring-evidence/a/b/c.webp',
                uploadToken: 'upload-token',
                expiresAt: '2026-07-27T12:00:00.000Z',
            });
        mockUploadToSignedUrl.mockResolvedValue({ error: null });
        mockCompleteEvidenceUpload.mockResolvedValue({
            evidenceId: 'evidence-1',
            state: 'AVAILABLE',
            expiresAt: '2026-08-03T12:00:00.000Z',
        });

        const { result } = renderHook(() => useIncidentEvidenceUpload());

        await expect(
            result.current.startIncidentEvidenceUpload({
                apiClient: vi.fn(),
                attemptId: 'attempt-1',
                eventId: 'event-1',
                eventType: 'NO_FACE_DETECTED',
                capturedAt: '2026-07-27T12:00:00.000Z',
                blob: new Blob(['frame'], { type: 'image/webp' }),
            }),
        ).resolves.toBeUndefined();

        expect(mockInitializeEvidenceUpload).toHaveBeenCalledTimes(2);
    });

    it('caches a quota denial and skips the next initialization attempt during backoff', async () => {
        mockInitializeEvidenceUpload.mockRejectedValue({
            status: 400,
            message: 'quota reached',
        });

        const { result } = renderHook(() => useIncidentEvidenceUpload());

        await expect(
            result.current.startIncidentEvidenceUpload({
                apiClient: vi.fn(),
                attemptId: 'attempt-1',
                eventId: 'event-1',
                eventType: 'MULTIPLE_FACES',
                capturedAt: '2026-07-27T12:00:00.000Z',
                blob: new Blob(['frame'], { type: 'image/jpeg' }),
            }),
        ).rejects.toMatchObject({
            status: 400,
        });

        const secondAttempt = result.current.startIncidentEvidenceUpload({
            apiClient: vi.fn(),
            attemptId: 'attempt-1',
            eventId: 'event-2',
            eventType: 'MULTIPLE_FACES',
            capturedAt: '2026-07-27T12:00:01.000Z',
            blob: new Blob(['frame'], { type: 'image/jpeg' }),
        });

        await expect(secondAttempt).resolves.toBeUndefined();
        expect(mockInitializeEvidenceUpload).toHaveBeenCalledTimes(1);
        expect(mockUploadToSignedUrl).not.toHaveBeenCalled();
    });
});
