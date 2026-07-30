import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    auditAttemptScoreSnapshots,
    runAttemptScoreSnapshotAudit,
} from './audit-attempt-score-snapshots';
import { dbClient } from '@sentinel/db';
import { getExamConfigurationState } from '../modules/examination/configuration/configuration.service';
import { getExamConfigurationData } from '../modules/examination/exams/data/get-exam-configuration';
import { getExamQuestionsData } from '../modules/examination/exams/data/get-exam-questions';
import * as fs from 'node:fs/promises';

vi.mock('@sentinel/db', () => {
    const mockDb = {
        selectFrom: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        execute: vi.fn(),
        updateTable: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    };
    return { dbClient: mockDb };
});

vi.mock('../modules/examination/configuration/configuration.service', () => ({
    getExamConfigurationState: vi.fn(),
}));

vi.mock('../modules/examination/exams/data/get-exam-configuration', () => ({
    getExamConfigurationData: vi.fn(),
}));

vi.mock('../modules/examination/exams/data/get-exam-questions', () => ({
    getExamQuestionsData: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
    writeFile: vi.fn(),
}));

describe('auditAttemptScoreSnapshots', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getExamConfigurationData).mockResolvedValue({
            randomize_choices: true,
        } as any);
        vi.mocked(getExamConfigurationState).mockResolvedValue({
            settings: {
                shuffleQuestions: true,
                showCorrectAnswers: false,
                allowReview: true,
                randomizeChoices: true,
            },
            configuration: {
                lobbyAdmissionMode: 'INSTRUCTOR_GATED',
                releaseScoreMode: 'AUTO_RELEASE',
                maxReconnectAttempts: 3,
                strictMode: true,
                screenLock: true,
                cameraRequired: true,
                micRequired: true,
                autoSubmitTimeoutMinutes: 5,
                aiRules: {
                    gaze_tracking: true,
                    face_detection: true,
                    audio_anomaly_detection: true,
                    multiple_faces_detection: true,
                },
                webSecurity: {
                    tab_switching_monitor: true,
                    full_screen_required: true,
                    clipboard_control: true,
                    right_click_disable: true,
                    print_screen_disable: true,
                },
                mobileSecurity: {
                    app_pinning_required: true,
                    prevent_backgrounding: true,
                    notification_block: true,
                    screenshot_block: true,
                    root_jailbreak_detection: true,
                },
                automaticClosePolicy: {
                    enabled: true,
                    highIncidentThreshold: 3,
                    windowMinutes: 15,
                    useOccurrenceCount: false,
                    immediateCloseEventTypes: [],
                },
            },
        } as any);
    });

    it('classifies exact unfinalized matches as safe backfills during dry runs', async () => {
        vi.mocked(dbClient.execute).mockResolvedValueOnce([
            {
                attempt_id: 'attempt-1',
                exam_id: 'exam-1',
                score: 1,
                total_score: 1,
                initial_score: null,
                answer_snapshot: { 'q-1': true },
                assessment_snapshot: null,
                score_snapshot: null,
                finalized_at: null,
                score_state: 'DRAFT',
                created_at: '2026-07-01T00:00:00.000Z',
            },
        ] as any);
        vi.mocked(getExamQuestionsData).mockResolvedValue([
            {
                question_id: 'q-1',
                exam_id: 'exam-1',
                exam_section_id: null,
                source_question_bank_question_id: null,
                source_collection_id: null,
                question_type: 'TRUE_FALSE',
                content: {
                    prompt: 'True?',
                    correctAnswer: true,
                },
                passage_content: null,
                passage_type: null,
                points: 1,
                order_index: 0,
                created_at: null,
                updated_at: null,
                source_origin: 'MANUAL',
                source_file_name: null,
                source_page_number: null,
                source_evidence: null,
                tags: [],
            },
        ] as any);

        const result = await auditAttemptScoreSnapshots({ dryRun: true });

        expect(result.safeBackfillCount).toBe(1);
        expect(result.rows[0]).toMatchObject({
            outcome: 'safe_backfill',
            appliedAction: 'none',
            reconstructionStrategy: 'current_exam_questions',
        });
    });

    it('marks unresolved unfinalized mismatches as revision required when apply mode is used', async () => {
        vi.mocked(dbClient.execute).mockResolvedValueOnce([
            {
                attempt_id: 'attempt-2',
                exam_id: 'exam-2',
                score: 0,
                total_score: 1,
                initial_score: null,
                answer_snapshot: { 'q-1': true },
                assessment_snapshot: null,
                score_snapshot: null,
                finalized_at: null,
                score_state: 'DRAFT',
                created_at: '2026-07-01T00:00:00.000Z',
            },
        ] as any);
        vi.mocked(getExamQuestionsData).mockResolvedValue([
            {
                question_id: 'q-1',
                exam_id: 'exam-2',
                exam_section_id: null,
                source_question_bank_question_id: null,
                source_collection_id: null,
                question_type: 'TRUE_FALSE',
                content: {
                    prompt: 'True?',
                    correctAnswer: true,
                },
                passage_content: null,
                passage_type: null,
                points: 1,
                order_index: 0,
                created_at: null,
                updated_at: null,
                source_origin: 'MANUAL',
                source_file_name: null,
                source_page_number: null,
                source_evidence: null,
                tags: [],
            },
        ] as any);

        const setSpy = vi.fn().mockReturnThis();
        (dbClient as any).set = setSpy;

        const result = await auditAttemptScoreSnapshots({ dryRun: false });

        expect(result.unresolvedCount).toBe(1);
        expect(result.rows[0]).toMatchObject({
            outcome: 'unresolved_unfinalized',
            appliedAction: 'marked_revision_required',
            mismatchReason: 'score_mismatch',
        });
        expect(setSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                score_state: 'REVISION_REQUIRED',
            }),
        );
    });

    it('does not mutate finalized attempts even when reconstruction matches', async () => {
        vi.mocked(dbClient.execute).mockResolvedValueOnce([
            {
                attempt_id: 'attempt-3',
                exam_id: 'exam-3',
                score: 1,
                total_score: 1,
                initial_score: 1,
                answer_snapshot: { 'q-1': true },
                assessment_snapshot: null,
                score_snapshot: null,
                finalized_at: '2026-07-10T00:00:00.000Z',
                score_state: 'FINALIZED',
                created_at: '2026-07-01T00:00:00.000Z',
            },
        ] as any);
        vi.mocked(getExamQuestionsData).mockResolvedValue([
            {
                question_id: 'q-1',
                exam_id: 'exam-3',
                exam_section_id: null,
                source_question_bank_question_id: null,
                source_collection_id: null,
                question_type: 'TRUE_FALSE',
                content: {
                    prompt: 'True?',
                    correctAnswer: true,
                },
                passage_content: null,
                passage_type: null,
                points: 1,
                order_index: 0,
                created_at: null,
                updated_at: null,
                source_origin: 'MANUAL',
                source_file_name: null,
                source_page_number: null,
                source_evidence: null,
                tags: [],
            },
        ] as any);

        const result = await auditAttemptScoreSnapshots({ dryRun: false });

        expect(result.finalizedSafeMatchCount).toBe(1);
        expect(result.rows[0]).toMatchObject({
            outcome: 'finalized_safe_match',
            appliedAction: 'none',
        });
    });

    it('exposes a resumable next cursor when more legacy attempts remain than the current batch size', async () => {
        vi.mocked(dbClient.execute).mockResolvedValueOnce([
            {
                attempt_id: 'attempt-1',
                exam_id: 'exam-1',
                score: 1,
                total_score: 1,
                initial_score: null,
                answer_snapshot: { 'q-1': true },
                assessment_snapshot: null,
                score_snapshot: null,
                finalized_at: null,
                score_state: 'DRAFT',
                created_at: '2026-07-01T00:00:00.000Z',
            },
            {
                attempt_id: 'attempt-2',
                exam_id: 'exam-2',
                score: 1,
                total_score: 1,
                initial_score: null,
                answer_snapshot: { 'q-1': true },
                assessment_snapshot: null,
                score_snapshot: null,
                finalized_at: null,
                score_state: 'DRAFT',
                created_at: '2026-07-02T00:00:00.000Z',
            },
        ] as any);
        vi.mocked(getExamQuestionsData).mockResolvedValue([
            {
                question_id: 'q-1',
                exam_id: 'exam-1',
                exam_section_id: null,
                source_question_bank_question_id: null,
                source_collection_id: null,
                question_type: 'TRUE_FALSE',
                content: {
                    prompt: 'True?',
                    correctAnswer: true,
                },
                passage_content: null,
                passage_type: null,
                points: 1,
                order_index: 0,
                created_at: null,
                updated_at: null,
                source_origin: 'MANUAL',
                source_file_name: null,
                source_page_number: null,
                source_evidence: null,
                tags: [],
            },
        ] as any);

        const result = await auditAttemptScoreSnapshots({
            dryRun: true,
            batchSize: 1,
        });

        expect(result.processedCount).toBe(1);
        expect(result.hasMore).toBe(true);
        expect(result.nextCursorAttemptId).toBe('attempt-1');
    });

    it('aggregates counts across multiple batches and writes an optional report file', async () => {
        vi.mocked(dbClient.execute)
            .mockResolvedValueOnce([
                {
                    attempt_id: 'attempt-1',
                    exam_id: 'exam-1',
                    score: 1,
                    total_score: 1,
                    initial_score: null,
                    answer_snapshot: { 'q-1': true },
                    assessment_snapshot: null,
                    score_snapshot: null,
                    finalized_at: null,
                    score_state: 'DRAFT',
                    created_at: '2026-07-01T00:00:00.000Z',
                },
                {
                    attempt_id: 'attempt-2',
                    exam_id: 'exam-2',
                    score: 0,
                    total_score: 1,
                    initial_score: null,
                    answer_snapshot: { 'q-1': true },
                    assessment_snapshot: null,
                    score_snapshot: null,
                    finalized_at: null,
                    score_state: 'DRAFT',
                    created_at: '2026-07-02T00:00:00.000Z',
                },
            ] as any)
            .mockResolvedValueOnce([
                {
                    attempt_id: 'attempt-2',
                    exam_id: 'exam-2',
                    score: 0,
                    total_score: 1,
                    initial_score: null,
                    answer_snapshot: { 'q-1': true },
                    assessment_snapshot: null,
                    score_snapshot: null,
                    finalized_at: null,
                    score_state: 'DRAFT',
                    created_at: '2026-07-02T00:00:00.000Z',
                },
            ] as any);
        vi.mocked(getExamQuestionsData)
            .mockResolvedValueOnce([
                {
                    question_id: 'q-1',
                    exam_id: 'exam-1',
                    exam_section_id: null,
                    source_question_bank_question_id: null,
                    source_collection_id: null,
                    question_type: 'TRUE_FALSE',
                    content: {
                        prompt: 'True?',
                        correctAnswer: true,
                    },
                    passage_content: null,
                    passage_type: null,
                    points: 1,
                    order_index: 0,
                    created_at: null,
                    updated_at: null,
                    source_origin: 'MANUAL',
                    source_file_name: null,
                    source_page_number: null,
                    source_evidence: null,
                    tags: [],
                },
            ] as any)
            .mockResolvedValueOnce([
                {
                    question_id: 'q-1',
                    exam_id: 'exam-2',
                    exam_section_id: null,
                    source_question_bank_question_id: null,
                    source_collection_id: null,
                    question_type: 'TRUE_FALSE',
                    content: {
                        prompt: 'True?',
                        correctAnswer: true,
                    },
                    passage_content: null,
                    passage_type: null,
                    points: 1,
                    order_index: 0,
                    created_at: null,
                    updated_at: null,
                    source_origin: 'MANUAL',
                    source_file_name: null,
                    source_page_number: null,
                    source_evidence: null,
                    tags: [],
                },
            ] as any);

        const summary = await runAttemptScoreSnapshotAudit({
            dryRun: true,
            batchSize: 1,
            reportFile: '/tmp/attempt-audit.json',
        });

        expect(summary.batchesProcessed).toBe(2);
        expect(summary.processedCount).toBe(2);
        expect(summary.safeBackfillCount).toBe(1);
        expect(summary.unresolvedCount).toBe(1);
        expect(summary.hasMore).toBe(false);
        expect(vi.mocked(fs.writeFile)).toHaveBeenCalledWith(
            '/tmp/attempt-audit.json',
            expect.any(String),
            'utf8',
        );
    });

    it('records inherited randomization when the explicit exam override is null', async () => {
        vi.mocked(dbClient.execute).mockResolvedValueOnce([
            {
                attempt_id: 'attempt-4',
                exam_id: 'exam-4',
                score: 1,
                total_score: 1,
                initial_score: null,
                answer_snapshot: { 'q-1': true },
                assessment_snapshot: null,
                score_snapshot: null,
                finalized_at: null,
                score_state: 'DRAFT',
                created_at: '2026-07-03T00:00:00.000Z',
            },
        ] as any);
        vi.mocked(getExamConfigurationData).mockResolvedValueOnce({
            randomize_choices: null,
        } as any);
        vi.mocked(getExamQuestionsData).mockResolvedValueOnce([
            {
                question_id: 'q-1',
                exam_id: 'exam-4',
                exam_section_id: null,
                source_question_bank_question_id: null,
                source_collection_id: null,
                question_type: 'TRUE_FALSE',
                content: {
                    prompt: 'True?',
                    correctAnswer: true,
                },
                passage_content: null,
                passage_type: null,
                points: 1,
                order_index: 0,
                created_at: null,
                updated_at: null,
                source_origin: 'MANUAL',
                source_file_name: null,
                source_page_number: null,
                source_evidence: null,
                tags: [],
            },
        ] as any);

        const result = await auditAttemptScoreSnapshots({ dryRun: true });

        expect(result.rows[0]).toMatchObject({
            explicitRandomizeChoices: null,
            effectiveRandomizeChoices: true,
        });
    });

    it('flags attempts with missing questions as unresolved without mutating scores', async () => {
        vi.mocked(dbClient.execute).mockResolvedValueOnce([
            {
                attempt_id: 'attempt-5',
                exam_id: 'exam-5',
                score: 1,
                total_score: 1,
                initial_score: null,
                answer_snapshot: { 'q-1': true },
                assessment_snapshot: null,
                score_snapshot: null,
                finalized_at: null,
                score_state: 'DRAFT',
                created_at: '2026-07-04T00:00:00.000Z',
            },
        ] as any);
        vi.mocked(getExamQuestionsData).mockResolvedValueOnce([]);

        const result = await auditAttemptScoreSnapshots({ dryRun: true });

        expect(result.rows[0]).toMatchObject({
            outcome: 'unresolved_unfinalized',
            mismatchReason: 'missing_questions',
            appliedAction: 'none',
        });
    });

    it('remains idempotent across repeated apply-mode executions once no rows remain', async () => {
        vi.mocked(dbClient.execute)
            .mockResolvedValueOnce([
                {
                    attempt_id: 'attempt-6',
                    exam_id: 'exam-6',
                    score: 1,
                    total_score: 1,
                    initial_score: null,
                    answer_snapshot: { 'q-1': true },
                    assessment_snapshot: null,
                    score_snapshot: null,
                    finalized_at: null,
                    score_state: 'DRAFT',
                    created_at: '2026-07-05T00:00:00.000Z',
                },
            ] as any)
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);
        vi.mocked(getExamQuestionsData).mockResolvedValueOnce([
            {
                question_id: 'q-1',
                exam_id: 'exam-6',
                exam_section_id: null,
                source_question_bank_question_id: null,
                source_collection_id: null,
                question_type: 'TRUE_FALSE',
                content: {
                    prompt: 'True?',
                    correctAnswer: true,
                },
                passage_content: null,
                passage_type: null,
                points: 1,
                order_index: 0,
                created_at: null,
                updated_at: null,
                source_origin: 'MANUAL',
                source_file_name: null,
                source_page_number: null,
                source_evidence: null,
                tags: [],
            },
        ] as any);

        const first = await runAttemptScoreSnapshotAudit({
            dryRun: false,
            batchSize: 1,
        });
        const second = await runAttemptScoreSnapshotAudit({
            dryRun: false,
            batchSize: 1,
        });

        expect(first.safeBackfillCount).toBe(1);
        expect(second.processedCount).toBe(0);
    });
});
