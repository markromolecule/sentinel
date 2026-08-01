import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
    getExamReportExportDownloadRoute,
    getExamReportExportDownloadHandler,
} from './get-exam-report-export-download.controller';
import { getReportingExamContext } from '../../../../examination/reporting/services/get-reporting-exam-context';
import { PdfStorageService } from '../../storage/pdf-storage.service';

const EXAM_UUID = '123e4567-e89b-12d3-a456-426614174000';
const EXPORT_UUID = '123e4567-e89b-12d3-a456-426614174001';
const INST_UUID = '123e4567-e89b-12d3-a456-426614174002';
const USER_UUID = '123e4567-e89b-12d3-a456-426614174003';

vi.mock('../../../../examination/reporting/services/get-reporting-exam-context', () => ({
    getReportingExamContext: vi.fn(),
}));

vi.mock('../../../../examination/assessment/assessment-access', () => ({
    resolveAssessmentActorRole: vi.fn().mockResolvedValue('superadmin'),
    assertAssessmentAccess: vi.fn(),
    resolveAssessmentInstitutionId: vi.fn((args) => args.contextInstitutionId),
}));

vi.mock('../../storage/pdf-storage.service', () => ({
    PdfStorageService: {
        createSignedUrl: vi.fn().mockResolvedValue('https://supabase.co/signed-url'),
    },
}));

vi.mock('../../../logs/logs.service', () => ({
    LogsService: {
        createLog: vi.fn().mockResolvedValue(undefined),
    },
}));

describe('getExamReportExportDownloadHandler', () => {
    let mockDb: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDb = {
            selectFrom: vi.fn().mockReturnThis(),
            selectAll: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockResolvedValue({
                export_id: EXPORT_UUID,
                exam_id: EXAM_UUID,
                institution_id: INST_UUID,
                status: 'READY',
                storage_bucket: 'test-bucket',
                storage_path: 'test-path',
                expires_at: new Date(Date.now() + 1000 * 3600), // 1 hour from now
            }),
        };
    });

    function createApp(permissions: string[]) {
        const app = new OpenAPIHono();
        app.use('*', async (c, next) => {
            c.set('dbClient', mockDb);
            c.set('user', { id: USER_UUID, role: 'superadmin' });
            c.set('role', 'superadmin');
            c.set('activePermissionKeys', permissions);
            c.set('institutionId', INST_UUID);
            await next();
        });
        app.openapi(getExamReportExportDownloadRoute, getExamReportExportDownloadHandler);
        return app;
    }

    it('rejects with 403 when missing permission', async () => {
        const app = createApp([]);
        const res = await app.request(`/exam-reports/${EXPORT_UUID}/download`);
        expect(res.status).toBe(403);
    });

    it('returns 410 when export is expired', async () => {
        vi.mocked(getReportingExamContext).mockResolvedValue({} as any);
        mockDb.executeTakeFirst.mockResolvedValueOnce({
            export_id: EXPORT_UUID,
            exam_id: EXAM_UUID,
            institution_id: INST_UUID,
            status: 'EXPIRED',
        });

        const app = createApp(['examinations:export_results_report']);
        const res = await app.request(`/exam-reports/${EXPORT_UUID}/download`);

        expect(res.status).toBe(410);
    });

    it('returns 400 when export is not READY', async () => {
        vi.mocked(getReportingExamContext).mockResolvedValue({} as any);
        mockDb.executeTakeFirst.mockResolvedValueOnce({
            export_id: EXPORT_UUID,
            exam_id: EXAM_UUID,
            institution_id: INST_UUID,
            status: 'GENERATING',
        });

        const app = createApp(['examinations:export_results_report']);
        const res = await app.request(`/exam-reports/${EXPORT_UUID}/download`);

        expect(res.status).toBe(400);
    });

    it('returns 200 with signed download URL successfully', async () => {
        vi.mocked(getReportingExamContext).mockResolvedValue({} as any);

        const app = createApp(['examinations:export_results_report']);
        const res = await app.request(`/exam-reports/${EXPORT_UUID}/download`);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.downloadUrl).toBe('https://supabase.co/signed-url');

        expect(PdfStorageService.createSignedUrl).toHaveBeenCalledWith(
            'test-bucket',
            'test-path',
            300,
        );
    });
});
