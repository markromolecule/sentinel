import { vi, describe, it, expect, beforeEach } from 'vitest';
import { captureAndUploadEvidenceFrame } from './mobile-frame-capture';

// Mock services
const mockIngestCandidate = vi.fn();
const mockCompleteUpload = vi.fn();
vi.mock('@sentinel/services', () => ({
    ingestMediaPipeEvidenceCandidate: (client: any, payload: any) =>
        mockIngestCandidate(client, payload),
    completeEvidenceUpload: (client: any, id: string) => mockCompleteUpload(client, id),
}));

describe('mobile-frame-capture', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock global fetch
        global.fetch = vi.fn().mockResolvedValue({
            blob: vi.fn().mockResolvedValue({ size: 1024 }),
        } as any);
    });

    it('captures picture and uploads via candidate ingestion and Supabase storage', async () => {
        const mockCameraRef = {
            current: {
                takePictureAsync: vi.fn().mockResolvedValue({
                    uri: 'ph://test-photo-uri',
                    base64: 'mock-base-64-data',
                }),
            },
        };

        mockIngestCandidate.mockResolvedValue({
            evidenceDecision: 'UPLOAD',
            upload: {
                evidenceId: 'evidence-123',
                uploadUrl:
                    'https://supabase.co/storage/v1/object/upload/sign/bucket-name/file-path.jpg',
                uploadToken: 'token-xyz',
            },
        });

        const mockUploadToSignedUrl = vi.fn().mockResolvedValue({ error: null });
        const mockSupabase = {
            storage: {
                from: vi.fn().mockReturnValue({
                    uploadToSignedUrl: mockUploadToSignedUrl,
                }),
            },
        };

        const mockApiClient = vi.fn().mockResolvedValue({ success: true });

        const result = await captureAndUploadEvidenceFrame({
            cameraRef: mockCameraRef,
            attemptId: 'attempt-1',
            examSessionId: 'session-1',
            studentId: 'student-1',
            eventType: 'GAZE_OFF_SCREEN',
            apiClient: mockApiClient as any,
            supabase: mockSupabase as any,
        });

        expect(result).toBe(true);
        expect(mockCameraRef.current.takePictureAsync).toHaveBeenCalledWith({
            quality: 0.5,
            base64: true,
        });
        expect(mockIngestCandidate).toHaveBeenCalled();
        expect(mockSupabase.storage.from).toHaveBeenCalledWith('bucket-name');
        expect(mockUploadToSignedUrl).toHaveBeenCalledWith(
            'file-path.jpg',
            'token-xyz',
            expect.any(Object),
            {
                contentType: 'image/jpeg',
            },
        );
        expect(mockCompleteUpload).toHaveBeenCalledWith(mockApiClient, 'evidence-123');
    });

    it('falls back to direct POST endpoint if candidate flow fails', async () => {
        const mockCameraRef = {
            current: {
                takePictureAsync: vi.fn().mockResolvedValue({
                    uri: 'ph://test-photo-uri',
                    base64: 'mock-base-64-data',
                }),
            },
        };

        mockIngestCandidate.mockRejectedValue(new Error('Ingestion failed'));

        const mockApiClient = vi.fn().mockResolvedValue({ success: true });
        const mockSupabase = {};

        const result = await captureAndUploadEvidenceFrame({
            cameraRef: mockCameraRef,
            attemptId: 'attempt-1',
            examSessionId: 'session-1',
            studentId: 'student-1',
            eventType: 'MULTIPLE_FACES',
            apiClient: mockApiClient as any,
            supabase: mockSupabase as any,
        });

        expect(result).toBe(true);
        expect(mockApiClient).toHaveBeenCalledWith(
            '/student/exam-attempts/attempt-1/incidents/evidence',
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('mock-base-64-data'),
            }),
        );
    });
});
