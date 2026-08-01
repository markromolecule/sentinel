import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
    getExamReportExportStatusRoute,
    getExamReportExportStatusHandler,
} from './get-exam-report-export-status.controller';
import { getReportingExamContext } from '../../../../examination/reporting/services/get-reporting-exam-context';

const EXAM_UUID = '123e4567-e89b-12d3-a456-426614174000';
const EXPORT_UUID = '123e4567-e89b-12d3-a456-426614174001';
const INST_UUID = '123e4567-e89b-12d3-a456-426614174002';
const USER_UUID = '123e4567-e89b-12d3-a456-426614174003';
const TEMPLATE_UUID = '123e4567-e89b-12d3-a456-426614174004';

vi.mock('../../../../examination/reporting/services/get-reporting-exam-context', () => ({
    getReportingExamContext: vi.fn(),
}));

vi.mock('../../../../examination/assessment/assessment-access', () => ({
    resolveAssessmentActorRole: vi.fn().mockResolvedValue('superadmin'),
    assertAssessmentAccess: vi.fn(),
    resolveAssessmentInstitutionId: vi.fn((args) => args.contextInstitutionId),
}));

describe('getExamReportExportStatusHandler', () => {
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
                template_id: TEMPLATE_UUID,
                status: 'GENERATING',
                retry_count: 1,
                created_by: USER_UUID,
                created_at: new Date(),
                updated_at: new Date(),
                completed_at: null,
                expires_at: null,
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
        app.openapi(getExamReportExportStatusRoute, getExamReportExportStatusHandler);
        return app;
    }

    it('rejects with 403 when missing permission', async () => {
        const app = createApp([]);
        const res = await app.request(`/exam-reports/${EXPORT_UUID}/status`);
        expect(res.status).toBe(403);
    });

    it('returns 404 when export record is missing', async () => {
        mockDb.executeTakeFirst.mockResolvedValueOnce(undefined);
        const app = createApp(['examinations:export_results_report']);
        const res = await app.request(`/exam-reports/${EXPORT_UUID}/status`);
        expect(res.status).toBe(404);
    });

    it('returns 404 when exam scope/visibility fails', async () => {
        vi.mocked(getReportingExamContext).mockRejectedValueOnce(new Error('Out of scope'));
        const app = createApp(['examinations:export_results_report']);
        const res = await app.request(`/exam-reports/${EXPORT_UUID}/status`);
        expect(res.status).toBe(404);
    });

    it('returns 200 with export details successfully', async () => {
        vi.mocked(getReportingExamContext).mockResolvedValue({} as any);
        const app = createApp(['examinations:export_results_report']);
        const res = await app.request(`/exam-reports/${EXPORT_UUID}/status`);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.status).toBe('GENERATING');
    });
});
