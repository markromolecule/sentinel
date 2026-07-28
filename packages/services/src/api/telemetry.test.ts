import { describe, expect, it, vi } from 'vitest';
import {
    completeEvidenceUpload,
    getIncidentEvidence,
    initializeEvidenceUpload,
} from './telemetry';

describe('telemetry evidence API helpers', () => {
    it('accepts raw initialize-upload responses from the telemetry evidence controllers', async () => {
        const apiClient = vi.fn().mockResolvedValue({
            evidenceId: 'evidence-1',
            uploadUrl: 'https://example.com/upload',
            uploadToken: 'token-1',
            expiresAt: '2026-07-28T04:00:00.000Z',
        });

        const result = await initializeEvidenceUpload(apiClient as never, {
            attemptId: 'attempt-1',
            eventId: 'event-1',
            eventType: 'FACE_NOT_VISIBLE',
            capturedAt: '2026-07-28T03:59:00.000Z',
            mimeType: 'image/webp',
            sizeBytes: 1024,
        });

        expect(result).toEqual({
            evidenceId: 'evidence-1',
            uploadUrl: 'https://example.com/upload',
            uploadToken: 'token-1',
            expiresAt: '2026-07-28T04:00:00.000Z',
        });
    });

    it('accepts raw complete-upload responses from the telemetry evidence controllers', async () => {
        const apiClient = vi.fn().mockResolvedValue({
            evidenceId: 'evidence-1',
            state: 'AVAILABLE',
            expiresAt: '2026-07-28T04:00:00.000Z',
        });

        const result = await completeEvidenceUpload(apiClient as never, 'evidence-1');

        expect(result).toEqual({
            evidenceId: 'evidence-1',
            state: 'AVAILABLE',
            expiresAt: '2026-07-28T04:00:00.000Z',
        });
    });

    it('accepts raw incident-evidence list responses from the telemetry evidence controllers', async () => {
        const apiClient = vi.fn().mockResolvedValue([
            {
                evidenceId: 'evidence-1',
                attemptId: 'attempt-1',
                incidentId: 'incident-1',
                eventId: 'event-1',
                eventType: 'FACE_NOT_VISIBLE',
                capturedAt: '2026-07-28T03:59:00.000Z',
                state: 'AVAILABLE',
                expiresAt: '2026-07-28T04:00:00.000Z',
                signedUrl: 'https://example.com/frame.webp',
            },
        ]);

        const result = await getIncidentEvidence(apiClient as never, 'incident-1');

        expect(result).toHaveLength(1);
        expect(result[0]?.signedUrl).toBe('https://example.com/frame.webp');
    });
});
