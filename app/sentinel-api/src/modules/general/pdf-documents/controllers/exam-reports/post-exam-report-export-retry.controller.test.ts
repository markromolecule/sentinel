import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
    postExamReportExportRetryRoute,
    postExamReportExportRetryHandler,
} from './post-exam-report-export-retry.controller';
import { pdfGenerationQueueService } from '../../queue/pdf-generation-queue.service';
import { getReportingExamContext } from '../../../../examination/reporting/services/get-reporting-exam-context';
import { executeTransaction } from '@sentinel/db';

const EXAM_UUID = '123e4567-e89b-12d3-a456-426614174000';
const EXPORT_UUID = '123e4567-e89b-12d3-a456-426614174001';
const INST_UUID = '123e4567-e89b-12d3-a456-426614174002';
const USER_UUID = '123e4567-e89b-12d3-a456-426614174003';

vi.mock('../../queue/pdf-generation-queue.service', () => ({
    pdfGenerationQueueService: {
        submitPdfJob: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../../../../examination/reporting/services/get-reporting-exam-context', () => ({
    getReportingExamContext: vi.fn(),
}));

vi.mock('../../../../examination/assessment/assessment-access', () => ({
    resolveAssessmentActorRole: vi.fn().mockResolvedValue('superadmin'),
    assertAssessmentAccess: vi.fn(),
    resolveAssessmentInstitutionId: vi.fn((args) => args.contextInstitutionId),
}));

vi.mock('../../../logs/logs.service', () => ({
    LogsService: {
        createLog: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('@sentinel/db', () => ({
    executeTransaction: vi.fn((cb) =>
        cb({
            selectFrom: vi.fn().mockReturnThis(),
            selectAll: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            forUpdate: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockResolvedValue({
                export_id: EXPORT_UUID,
                exam_id: EXAM_UUID,
                institution_id: INST_UUID,
                status: 'FAILED',
                retry_count: 0,
            }),
            updateTable: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue(undefined),
        } as any),
    ),
}));

describe('postExamReportExportRetryHandler', () => {
    let mockDb: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDb = {};
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
        app.openapi(postExamReportExportRetryRoute, postExamReportExportRetryHandler);
        return app;
    }

    it('rejects with 403 when missing permission', async () => {
        const app = createApp([]);
        const res = await app.request(`/exam-reports/${EXPORT_UUID}/retry`, { method: 'POST' });
        expect(res.status).toBe(403);
    });

    it('rejects with 400 when export is not FAILED', async () => {
        vi.mocked(executeTransaction).mockImplementationOnce(async (cb) => {
            return cb({
                selectFrom: vi.fn().mockReturnThis(),
                selectAll: vi.fn().mockReturnThis(),
                where: vi.fn().mockReturnThis(),
                forUpdate: vi.fn().mockReturnThis(),
                executeTakeFirst: vi.fn().mockResolvedValue({
                    export_id: EXPORT_UUID,
                    exam_id: EXAM_UUID,
                    institution_id: INST_UUID,
                    status: 'READY',
                }),
            } as any);
        });

        vi.mocked(getReportingExamContext).mockResolvedValue({} as any);

        const app = createApp(['examinations:export_results_report']);
        const res = await app.request(`/exam-reports/${EXPORT_UUID}/retry`, { method: 'POST' });

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toContain('Only FAILED exports can be retried');
    });

    it('triggers retry and submits generation job successfully', async () => {
        vi.mocked(getReportingExamContext).mockResolvedValue({} as any);

        const app = createApp(['examinations:export_results_report']);
        const res = await app.request(`/exam-reports/${EXPORT_UUID}/retry`, { method: 'POST' });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);

        expect(pdfGenerationQueueService.submitPdfJob).toHaveBeenCalledWith(
            EXPORT_UUID,
            'EXAM_RESULTS_REPORT',
        );
    });
});
