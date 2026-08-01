import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
    getExamReportExportsRoute,
    getExamReportExportsHandler,
} from './get-exam-report-exports.controller';
import { resolveAssessmentActorRole } from '../../../../examination/assessment/assessment-access';

const EXAM_UUID = '123e4567-e89b-12d3-a456-426614174000';
const EXPORT_UUID = '123e4567-e89b-12d3-a456-426614174001';
const INST_UUID = '123e4567-e89b-12d3-a456-426614174002';
const OTHER_INST_UUID = '123e4567-e89b-12d3-a456-426614174005';
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

describe('getExamReportExportsHandler', () => {
    let mockDb: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDb = {
            selectFrom: vi.fn().mockReturnThis(),
            leftJoin: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            offset: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            executeTakeFirst: vi.fn().mockResolvedValue({ count: '1' }),
            execute: vi.fn().mockResolvedValue([
                {
                    export_id: EXPORT_UUID,
                    exam_id: EXAM_UUID,
                    institution_id: INST_UUID,
                    template_id: TEMPLATE_UUID,
                    status: 'READY',
                    failure_code: null,
                    failure_message: null,
                    retry_count: 0,
                    created_by: USER_UUID,
                    created_at: new Date(),
                    updated_at: new Date(),
                    completed_at: new Date(),
                    expires_at: new Date(),
                },
            ]),
        };
    });

    function createApp(permissions: string[], institutionId = INST_UUID, role = 'superadmin') {
        const app = new OpenAPIHono();
        app.use('*', async (c, next) => {
            c.set('dbClient', mockDb);
            c.set('user', { id: USER_UUID, role });
            c.set('role', role);
            c.set('activePermissionKeys', permissions);
            c.set('institutionId', institutionId);
            await next();
        });
        app.openapi(getExamReportExportsRoute, getExamReportExportsHandler);
        return app;
    }

    it('rejects with 403 when missing permission', async () => {
        const app = createApp([]);
        const res = await app.request(`/exam-reports?institutionId=${INST_UUID}`);
        expect(res.status).toBe(403);
    });

    it('rejects with 403 if stand-alone institution queries other institution', async () => {
        vi.mocked(resolveAssessmentActorRole).mockResolvedValueOnce('instructor');

        // Mock role mapping
        const app = createApp(['examinations:export_results_report'], INST_UUID, 'instructor');
        const res = await app.request(`/exam-reports?institutionId=${OTHER_INST_UUID}`);
        expect(res.status).toBe(403);
    });

    it('lists exports successfully', async () => {
        const app = createApp(['examinations:export_results_report']);
        const res = await app.request(`/exam-reports?institutionId=${INST_UUID}`);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data.records.length).toBe(1);
        expect(body.data.records[0].exportId).toBe(EXPORT_UUID);
    });
});
