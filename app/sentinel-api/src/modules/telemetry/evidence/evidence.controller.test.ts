import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import telemetryEvidenceRoutes from './evidence.routes';
import { EvidenceUploadService } from './services/evidence-upload.service';
import { EvidenceQueryService } from './services/evidence-query.service';
import { EvidenceDeletionService } from './services/evidence-deletion.service';
import { EvidenceReconciliationService } from './services/evidence-reconciliation.service';

vi.mock('./services/evidence-upload.service', () => ({
    EvidenceUploadService: {
        initializeUpload: vi.fn(),
        completeUpload: vi.fn(),
    },
}));

vi.mock('./services/evidence-query.service', () => ({
    EvidenceQueryService: {
        getIncidentEvidence: vi.fn(),
    },
}));

vi.mock('./services/evidence-deletion.service', () => ({
    EvidenceDeletionService: {
        deleteEvidence: vi.fn(),
    },
}));

vi.mock('./services/evidence-reconciliation.service', () => ({
    EvidenceReconciliationService: {
        reconcileEvidence: vi.fn(),
    },
}));

// Mock auth middleware to pass user context
vi.mock('../../../middleware/auth', () => ({
    authMiddleware: async (c: any, next: any) => {
        c.set('user', { id: 'test-user-uuid', user_profiles: { department_id: null, course_id: null } });
        c.set('role', 'admin');
        c.set('institutionId', 'test-institution-uuid');
        c.set('activePermissionKeys', ['incidents:view', 'incidents:review']);
        await next();
    },
}));

describe('Telemetry Evidence Controllers', () => {
    const mockDb = {
        insertInto: vi.fn(() => {
            const query: any = {
                values: vi.fn(() => query),
                returningAll: vi.fn(() => query),
                returning: vi.fn(() => query),
                execute: vi.fn(async () => []),
                executeTakeFirst: vi.fn(async () => ({})),
                executeTakeFirstOrThrow: vi.fn(async () => ({})),
            };
            return query;
        }),
    };

    const app = new OpenAPIHono();
    app.use('*', async (c, next) => {
        c.set('dbClient', mockDb as any);
        await next();
    });
    app.route('/', telemetryEvidenceRoutes);

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.TELEMETRY_CRON_SECRET = 'cron-secret';
    });

    describe('POST /evidence/uploads', () => {
        it('returns signed upload target details', async () => {
            vi.mocked(EvidenceUploadService.initializeUpload).mockResolvedValue({
                evidenceId: 'evidence-uuid',
                uploadUrl: 'https://supabase.co/upload',
                uploadToken: 'token',
                expiresAt: new Date('2026-07-27T12:00:00.000Z'),
            });

            const response = await app.request('/evidence/uploads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer user-token',
                },
                body: JSON.stringify({
                    attemptId: '123e4567-e89b-12d3-a456-426614174000',
                    eventId: '987f6543-e89b-12d3-a456-426614174000',
                    eventType: 'FACE_NOT_VISIBLE',
                    capturedAt: '2026-07-27T12:00:00.000Z',
                    mimeType: 'image/webp',
                    sizeBytes: 45000,
                }),
            });

            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body).toEqual({
                evidenceId: 'evidence-uuid',
                uploadUrl: 'https://supabase.co/upload',
                uploadToken: 'token',
                expiresAt: '2026-07-27T12:00:00.000Z',
            });
            expect(EvidenceUploadService.initializeUpload).toHaveBeenCalled();
        });
    });

    describe('POST /evidence/:evidenceId/complete', () => {
        it('completes the evidence upload', async () => {
            vi.mocked(EvidenceUploadService.completeUpload).mockResolvedValue({
                evidenceId: 'evidence-uuid',
                state: 'AVAILABLE',
                expiresAt: new Date('2026-07-27T12:00:00.000Z'),
            });

            const response = await app.request('/evidence/123e4567-e89b-12d3-a456-426614174000/complete', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer user-token',
                },
            });

            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body).toEqual({
                evidenceId: 'evidence-uuid',
                state: 'AVAILABLE',
                expiresAt: '2026-07-27T12:00:00.000Z',
            });
            expect(EvidenceUploadService.completeUpload).toHaveBeenCalled();
        });
    });

    describe('GET /incidents/:incidentId/evidence', () => {
        it('returns incident evidence records', async () => {
            vi.mocked(EvidenceQueryService.getIncidentEvidence).mockResolvedValue([
                {
                    evidenceId: 'evidence-uuid',
                    attemptId: 'attempt-uuid',
                    incidentId: 'incident-uuid',
                    eventId: 'event-uuid',
                    eventType: 'FACE_NOT_VISIBLE' as any,
                    capturedAt: '2026-07-27T12:00:00.000Z',
                    state: 'AVAILABLE',
                    expiresAt: '2026-07-27T12:00:00.000Z',
                    signedUrl: 'https://supabase.co/view',
                },
            ]);

            const response = await app.request('/incidents/123e4567-e89b-12d3-a456-426614174000/evidence', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer user-token',
                },
            });

            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body).toHaveLength(1);
            expect(body[0]).toMatchObject({
                evidenceId: 'evidence-uuid',
                signedUrl: 'https://supabase.co/view',
            });
            expect(EvidenceQueryService.getIncidentEvidence).toHaveBeenCalled();
        });
    });

    describe('DELETE /evidence/:evidenceId', () => {
        it('deletes the evidence', async () => {
            const response = await app.request('/evidence/123e4567-e89b-12d3-a456-426614174000', {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer user-token',
                },
            });

            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body).toEqual({
                success: true,
                message: 'Evidence successfully marked as DELETED and storage objects converged.',
            });
            expect(EvidenceDeletionService.deleteEvidence).toHaveBeenCalled();
        });
    });

    describe('POST /internal/evidence/reconcile', () => {
        it('triggers reconciliation if cron secret is correct', async () => {
            vi.mocked(EvidenceReconciliationService.reconcileEvidence).mockResolvedValue({
                processedCount: 5,
                details: {
                    staleUploadsPurged: 2,
                    retentionExpiredPurged: 3,
                    deletedConverged: 0,
                    unlinkedPurged: 0,
                },
            });

            const response = await app.request('/internal/evidence/reconcile', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer cron-secret',
                },
            });

            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.processedCount).toBe(5);
            expect(EvidenceReconciliationService.reconcileEvidence).toHaveBeenCalled();
        });

        it('rejects request if cron secret is incorrect', async () => {
            const response = await app.request('/internal/evidence/reconcile', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer wrong-secret',
                },
            });

            expect(response.status).toBe(401);
            expect(EvidenceReconciliationService.reconcileEvidence).not.toHaveBeenCalled();
        });
    });
});
