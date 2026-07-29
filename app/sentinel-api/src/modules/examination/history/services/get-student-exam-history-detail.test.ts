import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HTTPException } from 'hono/http-exception';
import { getStudentExamHistoryDetail } from './get-student-exam-history-detail';
import { resolveExaminationGlobalSettings } from '../../configuration/configuration.service';
import { getExamColumnSupport } from '../../exams/helper/exam-schema-compat';
import { mapExamHistoryDetailResponse } from '../../exams/services/map-exam-response.service';

vi.mock('../../configuration/configuration.service', () => ({
    resolveExaminationGlobalSettings: vi.fn(),
}));

vi.mock('../../exams/helper/exam-schema-compat', () => ({
    getExamColumnSupport: vi.fn(),
}));

vi.mock('../../exams/services/map-exam-response.service', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('../../exams/services/map-exam-response.service')>();

    return {
        ...actual,
        mapExamHistoryDetailResponse: vi.fn(),
    };
});

function createQueryBuilder(record: Record<string, unknown> | undefined) {
    const builder: Record<string, any> = {};

    builder.innerJoin = vi.fn(() => builder);
    builder.leftJoin = vi.fn(() => builder);
    builder.select = vi.fn(() => builder);
    builder.where = vi.fn(() => builder);
    builder.executeTakeFirst = vi.fn().mockResolvedValue(record);
    builder.$if = vi.fn((condition: boolean, callback: (qb: typeof builder) => typeof builder) =>
        condition ? callback(builder) : builder,
    );

    return builder;
}

describe('getStudentExamHistoryDetail', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getExamColumnSupport).mockResolvedValue({
            hasRoomId: false,
            hasSectionId: false,
            hasSectionName: false,
        });
        vi.mocked(resolveExaminationGlobalSettings).mockResolvedValue({
            defaultDurationMinutes: 60,
            defaultPassingScore: 68,
        } as any);
        vi.mocked(mapExamHistoryDetailResponse).mockReturnValue({
            id: 'attempt-1',
            attemptId: 'attempt-1',
            examId: 'exam-1',
            examTitle: 'Manual Essay',
            subject: 'English',
            sectionIds: [],
            sectionNames: [],
            sectionName: null,
            status: 'turned_in',
            result: null,
            availableAt: null,
            dueAt: null,
            completedAt: '2026-06-26T10:00:00.000Z',
            score: null,
            totalScore: null,
            percentage: null,
            timeSpent: 45,
            cheated: false,
            cheatingType: null,
            incidentCount: 0,
            durationMinutes: 60,
            passingScore: 75,
            roomName: null,
        });
    });

    it('passes release, essay, and finalized fields into the history detail mapper', async () => {
        const rawRecord = {
            exam_id: 'exam-1',
            attempt_id: 'attempt-1',
            release_score_mode: 'MANUAL_RELEASE',
            essay_question_count: 1,
            attempt_finalized_at: '2026-06-26T11:00:00.000Z',
        };
        const builder = createQueryBuilder(rawRecord);
        const dbClient = {
            selectFrom: vi.fn(() => builder),
        } as any;

        const result = await getStudentExamHistoryDetail(
            dbClient,
            'attempt-1',
            'student-user-1',
            'institution-1',
        );

        expect(dbClient.selectFrom).toHaveBeenCalledWith('exam_attempts as ea');
        expect(builder.leftJoin).toHaveBeenCalledWith(
            'exam_configurations as ec',
            'ec.exam_id',
            'e.exam_id',
        );
        expect(builder.select).toHaveBeenCalledWith(
            expect.arrayContaining(['ec.release_score_mode']),
        );
        expect(mapExamHistoryDetailResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                release_score_mode: 'MANUAL_RELEASE',
                essay_question_count: 1,
                attempt_finalized_at: '2026-06-26T11:00:00.000Z',
            }),
        );
        expect(result.examTitle).toBe('Manual Essay');
    });

    it('passes provisional essay scoring fields through so history mapping can hide unfinished results', async () => {
        const rawRecord = {
            exam_id: 'exam-1',
            attempt_id: 'attempt-1',
            attempt_status: 'COMPLETED',
            attempt_score: 0,
            attempt_total_score: 10,
            release_score_mode: 'AUTO_RELEASE',
            essay_question_count: 1,
            attempt_finalized_at: null,
        };
        const builder = createQueryBuilder(rawRecord);
        const dbClient = {
            selectFrom: vi.fn(() => builder),
        } as any;

        await getStudentExamHistoryDetail(dbClient, 'attempt-1', 'student-user-1');

        expect(mapExamHistoryDetailResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                attempt_status: 'COMPLETED',
                attempt_score: 0,
                attempt_total_score: 10,
                release_score_mode: 'AUTO_RELEASE',
                essay_question_count: 1,
                attempt_finalized_at: null,
            }),
        );
    });

    it('passes persisted score snapshots through to the history mapper', async () => {
        const rawRecord = {
            exam_id: 'exam-1',
            attempt_id: 'attempt-1',
            attempt_score: 0,
            attempt_total_score: 10,
            attempt_score_snapshot: {
                version: 'attempt-score.v1',
                scoringVersion: 'objective-baseline.v1',
                generatedAt: '2026-07-29T05:00:00.000Z',
                score: 3,
                totalScore: 5,
                percentage: 60,
                answeredCount: 5,
                autoGradableQuestionCount: 5,
                manualReviewQuestionCount: 0,
                requiresManualReview: false,
                questionReports: [],
            },
        };
        const builder = createQueryBuilder(rawRecord);
        const dbClient = {
            selectFrom: vi.fn(() => builder),
        } as any;

        await getStudentExamHistoryDetail(dbClient, 'attempt-1', 'student-user-1');

        expect(mapExamHistoryDetailResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                attempt_score_snapshot: rawRecord.attempt_score_snapshot,
            }),
        );
    });

    it('resolves inherited passing_score through global defaults before mapping history detail', async () => {
        const rawRecord = {
            exam_id: 'exam-1',
            attempt_id: 'attempt-1',
            duration_minutes: 60,
            passing_score: null,
        };
        const builder = createQueryBuilder(rawRecord);
        const dbClient = {
            selectFrom: vi.fn(() => builder),
        } as any;

        await getStudentExamHistoryDetail(dbClient, 'attempt-1', 'student-user-1');

        expect(mapExamHistoryDetailResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                passing_score: 68,
            }),
        );
    });

    it('throws a 404 when the attempt does not belong to the student', async () => {
        const builder = createQueryBuilder(undefined);
        const dbClient = {
            selectFrom: vi.fn(() => builder),
        } as any;

        await expect(
            getStudentExamHistoryDetail(dbClient, 'attempt-1', 'student-user-1'),
        ).rejects.toBeInstanceOf(HTTPException);

        expect(mapExamHistoryDetailResponse).not.toHaveBeenCalled();
    });

    it('throws a 404 when the attempt is for an unpublished exam', async () => {
        const builder = createQueryBuilder(undefined);
        const dbClient = {
            selectFrom: vi.fn(() => builder),
        } as any;

        await expect(
            getStudentExamHistoryDetail(dbClient, 'attempt-1', 'student-user-1'),
        ).rejects.toThrowError('Exam history record not found.');

        expect(builder.where).toHaveBeenCalledWith('e.published_at', 'is not', null);
    });
});
