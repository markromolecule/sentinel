import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EvidenceStorageService } from './evidence-storage.service';
import { EvidenceReadinessService } from './evidence-readiness.service';

vi.mock('./evidence-storage.service', () => ({
    EvidenceStorageService: {
        verifyBucketReadiness: vi.fn(),
    },
}));

describe('EvidenceReadinessService', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env = { ...originalEnv };
        process.env.SUPABASE_URL = 'https://api-project.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://api-project.supabase.co';
        process.env.TELEMETRY_EVIDENCE_ENABLED = 'true';
        process.env.TELEMETRY_EVIDENCE_INSTITUTION_ALLOWLIST = 'institution-1';
        process.env.TELEMETRY_EVIDENCE_BUCKET = 'sentinel-proctoring-evidence';
        vi.clearAllMocks();
    });

    it('reports missing enablement and allowlist as readiness blockers', async () => {
        process.env.TELEMETRY_EVIDENCE_ENABLED = 'false';
        process.env.TELEMETRY_EVIDENCE_INSTITUTION_ALLOWLIST = '';

        const result = await EvidenceReadinessService.check();

        expect(result.ready).toBe(false);
        expect(result.issues).toEqual([
            {
                code: 'EVIDENCE_DISABLED',
                message: 'Telemetry evidence must be enabled before rollout verification can pass.',
            },
            {
                code: 'ALLOWLIST_EMPTY',
                message: 'Telemetry evidence allowlist is empty.',
            },
        ]);
        expect(EvidenceStorageService.verifyBucketReadiness).not.toHaveBeenCalled();
    });

    it('reports project alignment mismatches and bucket readiness failures', async () => {
        process.env.SUPABASE_URL = 'https://api-project.supabase.co';
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://web-project.supabase.co';
        vi.mocked(EvidenceStorageService.verifyBucketReadiness).mockResolvedValue({
            bucketName: 'sentinel-proctoring-evidence',
            exists: true,
            isPublic: true,
            fileSizeLimitBytes: 1024,
            allowedMimeTypes: ['image/jpeg'],
            ready: false,
            issues: [
                {
                    code: 'BUCKET_PUBLIC',
                    message: 'Evidence bucket must remain private.',
                },
            ],
        } as any);

        const result = await EvidenceReadinessService.check();

        expect(result.ready).toBe(false);
        expect(result.issues).toEqual([
            {
                code: 'SUPABASE_PROJECT_MISMATCH',
                message: 'API and web Supabase URLs point to different projects.',
            },
            {
                code: 'BUCKET_NOT_READY',
                message: 'Evidence bucket metadata does not satisfy the rollout contract.',
            },
        ]);
        expect(EvidenceStorageService.verifyBucketReadiness).toHaveBeenCalledWith({
            bucketName: 'sentinel-proctoring-evidence',
            requiredMimeTypes: ['image/webp', 'image/jpeg'],
            minFileSizeLimitBytes: 524288,
        });
    });

    it('returns ready when the environment and bucket contract match', async () => {
        vi.mocked(EvidenceStorageService.verifyBucketReadiness).mockResolvedValue({
            bucketName: 'sentinel-proctoring-evidence',
            exists: true,
            isPublic: false,
            fileSizeLimitBytes: 1048576,
            allowedMimeTypes: ['image/webp', 'image/jpeg'],
            ready: true,
            issues: [],
        } as any);

        const result = await EvidenceReadinessService.check();

        expect(result.ready).toBe(true);
        expect(result.issues).toEqual([]);
        expect(result.bucketReadiness).toEqual({
            bucketName: 'sentinel-proctoring-evidence',
            exists: true,
            isPublic: false,
            fileSizeLimitBytes: 1048576,
            allowedMimeTypes: ['image/webp', 'image/jpeg'],
            ready: true,
            issues: [],
        });
    });
});
