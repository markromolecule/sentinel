import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import { postCreateExamReportExportRoute, postCreateExamReportExportHandler } from './post-create-exam-report-export.controller';
import { pdfGenerationQueueService } from '../../queue/pdf-generation-queue.service';
import { resolvePdfTemplate } from '../../services/resolve-pdf-template.service';
import { LogsService } from '../../../logs/logs.service';
import { getReportingExamContext } from '../../../../examination/reporting/services/get-reporting-exam-context';

const EXAM_UUID = '123e4567-e89b-12d3-a456-426614174000';
const EXPORT_UUID = '123e4567-e89b-12d3-a456-426614174001';
const INST_UUID = '123e4567-e89b-12d3-a456-426614174002';
const USER_UUID = '123e4567-e89b-12d3-a456-426614174003';
const TEMPLATE_UUID = '123e4567-e89b-12d3-a456-426614174004';

vi.mock('../../queue/pdf-generation-queue.service', () => ({
    pdfGenerationQueueService: {
        submitPdfJob: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../../services/resolve-pdf-template.service', () => ({
    resolvePdfTemplate: vi.fn().mockResolvedValue({ templateId: '123e4567-e89b-12d3-a456-426614174004' }),
}));

vi.mock('../../../logs/logs.service', () => ({
    LogsService: {
        createLog: vi.fn().mockResolvedValue(undefined),
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

describe('postCreateExamReportExportHandler', () => {
    let mockDb: any;
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockDb = {
            insertInto: vi.fn().mockReturnThis(),
            values: vi.fn().mockReturnThis(),
            returningAll: vi.fn().mockReturnThis(),
            executeTakeFirstOrThrow: vi.fn().mockResolvedValue({
                export_id: EXPORT_UUID,
                exam_id: EXAM_UUID,
                institution_id: INST_UUID,
                template_id: TEMPLATE_UUID,
                status: 'PENDING',
                retry_count: 0,
                created_by: USER_UUID,
                created_at: new Date(),
                updated_at: new Date(),
                completed_at: null,
                expires_at: null,
            }),
        };
    });

    function createApp(permissions: string[], institutionId = INST_UUID) {
        const app = new OpenAPIHono();
        app.use('*', async (c, next) => {
            c.set('dbClient', mockDb);
            c.set('user', { id: USER_UUID, role: 'superadmin' });
            c.set('role', 'superadmin');
            c.set('activePermissionKeys', permissions);
            c.set('institutionId', institutionId);
            await next();
        });
        app.openapi(postCreateExamReportExportRoute, postCreateExamReportExportHandler);
        return app;
    }

    it('rejects with 403 when missing permission', async () => {
        const app = createApp([]);
        const res = await app.request('/exam-reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exam_id: EXAM_UUID }),
        });

        expect(res.status).toBe(403);
    });

    it('creates PENDING export and enqueues job successfully', async () => {
        const app = createApp(['examinations:export_results_report']);
        
        vi.mocked(getReportingExamContext).mockResolvedValue({
            examId: EXAM_UUID,
            institutionId: INST_UUID,
            title: 'Mock Exam',
        } as any);

        const res = await app.request('/exam-reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exam_id: EXAM_UUID, title: 'Custom Title' }),
        });

        expect(res.status).toBe(202);
        
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.exportId).toBe(EXPORT_UUID);

        expect(pdfGenerationQueueService.submitPdfJob).toHaveBeenCalledWith(
            EXPORT_UUID,
            'EXAM_RESULTS_REPORT',
        );
        expect(LogsService.createLog).toHaveBeenCalled();
    });
});
