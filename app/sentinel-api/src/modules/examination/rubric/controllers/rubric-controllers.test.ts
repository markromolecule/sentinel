import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
    getEffectiveEssayRubricRoute,
    getEffectiveEssayRubricRouteHandler,
} from './get-effective-essay-rubric.controller';
import {
    updateExamEssayRubricRoute,
    updateExamEssayRubricRouteHandler,
} from './update-exam-essay-rubric.controller';
import {
    resetExamEssayRubricRoute,
    resetExamEssayRubricRouteHandler,
} from './reset-exam-essay-rubric.controller';
import { RubricService } from '../services/rubric.service';
import { getExamByIdData } from '../../exams/data/get-exam-by-id';
import { resolveAssessmentReadScope } from '../../assessment/assessment-access';
import { hasActivePermission, requireActivePermission } from '../../../../lib/permissions';

vi.mock('../services/rubric.service', () => ({
    RubricService: {
        resolveEffectiveEssayRubric: vi.fn(),
        createEssayRubricVersion: vi.fn(),
        executeWithTransactionFallback: vi.fn((db, cb) => cb(db)),
    },
}));

vi.mock('../../exams/data/get-exam-by-id', () => ({
    getExamByIdData: vi.fn(),
}));

vi.mock('../../assessment/assessment-access', async () => {
    const actual = await vi.importActual('../../assessment/assessment-access');
    return {
        ...(actual as object),
        resolveAssessmentReadScope: vi.fn(),
        assertAssessmentReadAccess: vi.fn(),
    };
});

vi.mock('../../../../lib/permissions', () => ({
    hasActivePermission: vi.fn(),
    requireActivePermission: vi.fn(),
}));

vi.mock('../data/find-active-exam-rubric', () => ({
    findActiveExamRubric: vi.fn(),
}));

vi.mock('../data/deactivate-active-rubric', () => ({
    deactivateActiveRubric: vi.fn(),
}));

vi.mock('../data/find-active-baseline-rubric', () => ({
    findActiveBaselineRubric: vi.fn(),
}));

vi.mock('../../../general/logs/logs.service', () => ({
    LogsService: {
        createLog: vi.fn(),
    },
}));

import { findActiveExamRubric } from '../data/find-active-exam-rubric';

function createApp() {
    const app = new OpenAPIHono();

    app.use('*', async (c, next) => {
        c.set('dbClient', {} as any);
        c.set('user', { id: 'user-1' } as any);
        c.set('supabaseUser', { user_metadata: { role: 'instructor' } } as any);
        c.set('institutionId', 'institution-1');
        await next();
    });

    app.openapi(getEffectiveEssayRubricRoute, getEffectiveEssayRubricRouteHandler);
    app.openapi(updateExamEssayRubricRoute, updateExamEssayRubricRouteHandler);
    app.openapi(resetExamEssayRubricRoute, resetExamEssayRubricRouteHandler);

    return app;
}

describe('Rubric Controllers', () => {
    const app = createApp();
    const examId = '22222222-2222-4222-8222-222222222222';

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(resolveAssessmentReadScope).mockResolvedValue({
            role: 'instructor',
            institutionId: 'institution-1',
            studentUserId: undefined,
            departmentId: undefined,
            instructorUserId: 'user-1',
        });
        vi.mocked(getExamByIdData).mockResolvedValue({ exam_id: examId, is_public: true } as any);
    });

    describe('getEffectiveEssayRubric', () => {
        it('resolves effective rubric successfully', async () => {
            const expectedDef = { criteria: [] };
            vi.mocked(RubricService.resolveEffectiveEssayRubric).mockResolvedValue({
                rubricVersionId: 'version-1',
                versionNumber: 1,
                source: 'BASELINE',
                definition: expectedDef as any,
            });
            vi.mocked(hasActivePermission).mockReturnValue(true);

            const res = await app.request(`/exams/${examId}`);
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.data.rubricVersionId).toBe('version-1');
            expect(json.data.canOverride).toBe(true);
        });
    });

    describe('updateExamEssayRubric', () => {
        it('requires examinations:override_essay_rubric and updates rubric override', async () => {
            const updatedDef = {
                criteria: [
                    {
                        key: 'content',
                        name: 'Content Quality',
                        description: 'Content quality evaluation',
                        weight: 1.0,
                        levels: {
                            '4': 'A',
                            '3': 'B',
                            '2': 'C',
                            '1': 'D',
                            '0': 'F',
                        },
                    },
                ],
            };

            vi.mocked(RubricService.createEssayRubricVersion).mockResolvedValue({
                rubric_version_id: 'new-version-id',
                version_number: 2,
                scope: 'EXAM_OVERRIDE',
                definition: updatedDef as any,
            } as any);

            const res = await app.request(`/exams/${examId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedDef),
            });

            if (res.status !== 200) {
                console.log('Update Error Body:', await res.text());
            }

            expect(requireActivePermission).toHaveBeenCalledWith(
                expect.any(Object),
                'examinations:override_essay_rubric',
            );
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.data.rubricVersionId).toBe('new-version-id');
        });
    });

    describe('resetExamEssayRubric', () => {
        it('requires examinations:override_essay_rubric and resets override', async () => {
            vi.mocked(findActiveExamRubric).mockResolvedValue({
                rubric_version_id: 'override-id',
            } as any);
            vi.mocked(RubricService.resolveEffectiveEssayRubric).mockResolvedValue({
                rubricVersionId: 'baseline-id',
                versionNumber: 1,
                source: 'BASELINE',
                definition: { criteria: [] } as any,
            });

            const res = await app.request(`/exams/${examId}`, {
                method: 'DELETE',
            });

            if (res.status !== 200) {
                console.log('Reset Error Body:', await res.text());
            }

            expect(requireActivePermission).toHaveBeenCalledWith(
                expect.any(Object),
                'examinations:override_essay_rubric',
            );
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.data.rubricVersionId).toBe('baseline-id');
            expect(json.data.source).toBe('BASELINE');
        });
    });
});
