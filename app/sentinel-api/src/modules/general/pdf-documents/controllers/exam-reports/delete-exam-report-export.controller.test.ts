import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
    deleteExamReportExportRoute,
    deleteExamReportExportHandler,
} from './delete-exam-report-export.controller';
import { getReportingExamContext } from '../../../../examination/reporting/services/get-reporting-exam-context';
import { PdfStorageService } from '../../storage/pdf-storage.service';
import { LogsService } from '../../../logs/logs.service';

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
        deletePdf: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../../../logs/logs.service', () => ({
    LogsService: {
        createLog: vi.fn().mockResolvedValue(undefined),
    },
}));

describe('deleteExamReportExportHandler', () => {
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
                storage_bucket: 'test-bucket',
                storage_path: 'test-path',
            }),
            deleteFrom: vi.fn().mockReturnThis(),
            execute: vi.fn().mockResolvedValue(undefined),
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
        app.openapi(deleteExamReportExportRoute, deleteExamReportExportHandler);
        return app;
    }

    it('rejects with 403 when missing permission', async () => {
        const app = createApp([]);
        const res = await app.request(`/exam-reports/${EXPORT_UUID}`, { method: 'DELETE' });
        expect(res.status).toBe(403);
    });

    it('deletes storage object and DB record successfully', async () => {
        vi.mocked(getReportingExamContext).mockResolvedValue({} as any);

        const app = createApp(['examinations:export_results_report']);
        const res = await app.request(`/exam-reports/${EXPORT_UUID}`, { method: 'DELETE' });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);

        expect(PdfStorageService.deletePdf).toHaveBeenCalledWith('test-bucket', 'test-path');
        expect(mockDb.deleteFrom).toHaveBeenCalledWith('exam_report_exports');
        expect(LogsService.createLog).toHaveBeenCalled();
    });
});
