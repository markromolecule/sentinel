import { dbClient, type DbClient } from '@sentinel/db';
import { writeFile } from 'node:fs/promises';
import { type ExamAttemptAnswers } from '@sentinel/shared';
import {
    ATTEMPT_SCORING_VERSION,
    buildAnswerPayloadChecksum,
    buildAssessmentSnapshot,
    buildScoreSnapshot,
    parseAssessmentSnapshot,
} from '../modules/examination/flow/services/attempt-snapshot.service';
import { getExamConfigurationState } from '../modules/examination/configuration/configuration.service';
import { getExamConfigurationData } from '../modules/examination/exams/data/get-exam-configuration';
import { getExamQuestionsData } from '../modules/examination/exams/data/get-exam-questions';

type LegacyAttemptRow = {
    attempt_id: string;
    exam_id: string | null;
    score: number | null;
    total_score: number | null;
    initial_score: number | null;
    answer_snapshot: unknown;
    assessment_snapshot: unknown;
    score_snapshot: unknown;
    finalized_at: Date | string | null;
    score_state: string | null;
    created_at: Date | string | null;
};

type AuditOutcome =
    'safe_backfill' | 'unresolved_unfinalized' | 'finalized_safe_match' | 'finalized_mismatch';

type ReconstructionStrategy = 'assessment_snapshot' | 'current_exam_questions';

export type AttemptScoreSnapshotAuditRow = {
    attemptId: string;
    examId: string | null;
    outcome: AuditOutcome;
    reconstructionStrategy: ReconstructionStrategy | null;
    storedScore: number | null;
    storedTotalScore: number | null;
    candidateScore: number | null;
    candidateTotalScore: number | null;
    explicitRandomizeChoices: boolean | null;
    effectiveRandomizeChoices: boolean | null;
    mismatchReason: string | null;
    finalized: boolean;
    appliedAction: 'none' | 'backfilled' | 'marked_revision_required';
};

export type AttemptScoreSnapshotAuditSummary = {
    dryRun: boolean;
    batchSize: number;
    cursorAttemptId: string | null;
    nextCursorAttemptId: string | null;
    hasMore: boolean;
    processedCount: number;
    safeBackfillCount: number;
    unresolvedCount: number;
    finalizedMismatchCount: number;
    finalizedSafeMatchCount: number;
    rows: AttemptScoreSnapshotAuditRow[];
};

export type AttemptScoreSnapshotAuditRunSummary = {
    dryRun: boolean;
    batchSize: number;
    maxBatches: number | null;
    batchesProcessed: number;
    processedCount: number;
    safeBackfillCount: number;
    unresolvedCount: number;
    finalizedMismatchCount: number;
    finalizedSafeMatchCount: number;
    hasMore: boolean;
    nextCursorAttemptId: string | null;
    batchSummaries: AttemptScoreSnapshotAuditSummary[];
};

type AuditOptions = {
    batchSize?: number;
    cursorAttemptId?: string;
    dryRun?: boolean;
};

type AuditRunOptions = AuditOptions & {
    maxBatches?: number;
    reportFile?: string;
};

function extractAttemptAnswers(answerSnapshot: unknown): ExamAttemptAnswers | null {
    if (!answerSnapshot || typeof answerSnapshot !== 'object' || Array.isArray(answerSnapshot)) {
        return null;
    }

    const answers: ExamAttemptAnswers = {};

    for (const [key, value] of Object.entries(answerSnapshot as Record<string, unknown>)) {
        if (!key.startsWith('_')) {
            answers[key] = value as never;
        }
    }

    return answers;
}

function parseBooleanOrNull(value: unknown): boolean | null {
    return typeof value === 'boolean' ? value : null;
}

async function loadLegacyAttempts(
    db: DbClient,
    args: { batchSize: number; cursorAttemptId?: string },
) {
    let query = db
        .selectFrom('exam_attempts')
        .select([
            'attempt_id',
            'exam_id',
            'score',
            'total_score',
            'initial_score',
            'answer_snapshot',
            'assessment_snapshot',
            'score_snapshot',
            'finalized_at',
            'score_state',
            'created_at',
        ])
        .where('status', '=', 'COMPLETED')
        .where('score_snapshot', 'is', null)
        .orderBy('attempt_id', 'asc');

    if (args.cursorAttemptId) {
        query = query.where('attempt_id', '>', args.cursorAttemptId);
    }

    return (await query.limit(args.batchSize + 1).execute()) as LegacyAttemptRow[];
}

async function backfillAttemptSnapshots(args: {
    dbClient: DbClient;
    attemptId: string;
    assessmentSnapshot: unknown;
    scoreSnapshot: unknown;
    initialScore: number | null;
}) {
    await args.dbClient
        .updateTable('exam_attempts')
        .set({
            assessment_snapshot: args.assessmentSnapshot as never,
            score_snapshot: args.scoreSnapshot as never,
            scoring_version: ATTEMPT_SCORING_VERSION,
            initial_score: args.initialScore,
            last_synced_at: new Date(),
        })
        .where('attempt_id', '=', args.attemptId)
        .where('score_snapshot', 'is', null)
        .execute();
}

async function markAttemptRevisionRequired(db: DbClient, attemptId: string) {
    await db
        .updateTable('exam_attempts')
        .set({
            score_state: 'REVISION_REQUIRED',
            last_synced_at: new Date(),
        })
        .where('attempt_id', '=', attemptId)
        .where('score_snapshot', 'is', null)
        .execute();
}

export async function auditAttemptScoreSnapshots(
    options: AuditOptions = {},
    deps: { db?: DbClient } = {},
): Promise<AttemptScoreSnapshotAuditSummary> {
    const dryRun = options.dryRun ?? true;
    const batchSize = options.batchSize ?? 100;
    const activeDb = deps.db ?? dbClient;
    const fetchedAttempts = await loadLegacyAttempts(activeDb, {
        batchSize,
        cursorAttemptId: options.cursorAttemptId,
    });
    const hasMore = fetchedAttempts.length > batchSize;
    const attempts = hasMore ? fetchedAttempts.slice(0, batchSize) : fetchedAttempts;
    const rows: AttemptScoreSnapshotAuditRow[] = [];

    for (const attempt of attempts) {
        const finalized =
            attempt.finalized_at != null || String(attempt.score_state ?? '') === 'FINALIZED';
        const answers = extractAttemptAnswers(attempt.answer_snapshot);

        if (!attempt.exam_id) {
            rows.push({
                attemptId: attempt.attempt_id,
                examId: null,
                outcome: finalized ? 'finalized_mismatch' : 'unresolved_unfinalized',
                reconstructionStrategy: null,
                storedScore: attempt.score,
                storedTotalScore: attempt.total_score,
                candidateScore: null,
                candidateTotalScore: null,
                explicitRandomizeChoices: null,
                effectiveRandomizeChoices: null,
                mismatchReason: 'missing_exam_id',
                finalized,
                appliedAction: 'none',
            });
            continue;
        }

        if (!answers) {
            rows.push({
                attemptId: attempt.attempt_id,
                examId: attempt.exam_id,
                outcome: finalized ? 'finalized_mismatch' : 'unresolved_unfinalized',
                reconstructionStrategy: null,
                storedScore: attempt.score,
                storedTotalScore: attempt.total_score,
                candidateScore: null,
                candidateTotalScore: null,
                explicitRandomizeChoices: null,
                effectiveRandomizeChoices: null,
                mismatchReason: 'invalid_answer_snapshot',
                finalized,
                appliedAction: 'none',
            });
            continue;
        }

        const persistedAssessmentSnapshot = parseAssessmentSnapshot(attempt.assessment_snapshot);
        const rawConfiguration = await getExamConfigurationData({
            dbClient: activeDb,
            examId: attempt.exam_id,
        });
        const configurationState = await getExamConfigurationState(activeDb, attempt.exam_id);

        let candidateAssessmentSnapshot = persistedAssessmentSnapshot;
        let reconstructionStrategy: ReconstructionStrategy = 'assessment_snapshot';

        if (!candidateAssessmentSnapshot) {
            const questions = await getExamQuestionsData({
                dbClient: activeDb,
                examId: attempt.exam_id,
            });

            if (questions.length === 0) {
                rows.push({
                    attemptId: attempt.attempt_id,
                    examId: attempt.exam_id,
                    outcome: finalized ? 'finalized_mismatch' : 'unresolved_unfinalized',
                    reconstructionStrategy: 'current_exam_questions',
                    storedScore: attempt.score,
                    storedTotalScore: attempt.total_score,
                    candidateScore: null,
                    candidateTotalScore: null,
                    explicitRandomizeChoices: parseBooleanOrNull(
                        rawConfiguration?.randomize_choices,
                    ),
                    effectiveRandomizeChoices: configurationState.settings.randomizeChoices,
                    mismatchReason: 'missing_questions',
                    finalized,
                    appliedAction: 'none',
                });
                continue;
            }

            candidateAssessmentSnapshot = buildAssessmentSnapshot({
                attemptId: attempt.attempt_id,
                examId: attempt.exam_id,
                configurationState,
                questions,
            });
            reconstructionStrategy = 'current_exam_questions';
        }

        const candidateScoreSnapshot = buildScoreSnapshot({
            questions: candidateAssessmentSnapshot.questions,
            answers,
            answerChecksum: buildAnswerPayloadChecksum({
                attemptId: attempt.attempt_id,
                answers,
                elapsedSeconds: 0,
            }),
        });

        const explicitRandomizeChoices = parseBooleanOrNull(rawConfiguration?.randomize_choices);
        const effectiveRandomizeChoices = configurationState.settings.randomizeChoices;

        let outcome: AuditOutcome;
        let mismatchReason: string | null = null;

        if (candidateScoreSnapshot.requiresManualReview) {
            outcome = finalized ? 'finalized_mismatch' : 'unresolved_unfinalized';
            mismatchReason = 'manual_review_questions_present';
        } else if (attempt.score == null || attempt.total_score == null) {
            outcome = finalized ? 'finalized_mismatch' : 'unresolved_unfinalized';
            mismatchReason = 'missing_stored_aggregate';
        } else if (candidateScoreSnapshot.totalScore !== attempt.total_score) {
            outcome = finalized ? 'finalized_mismatch' : 'unresolved_unfinalized';
            mismatchReason = 'total_score_mismatch';
        } else if (candidateScoreSnapshot.score !== attempt.score) {
            outcome = finalized ? 'finalized_mismatch' : 'unresolved_unfinalized';
            mismatchReason = 'score_mismatch';
        } else {
            outcome = finalized ? 'finalized_safe_match' : 'safe_backfill';
        }

        let appliedAction: AttemptScoreSnapshotAuditRow['appliedAction'] = 'none';

        if (!dryRun && outcome === 'safe_backfill') {
            await backfillAttemptSnapshots({
                dbClient: activeDb,
                attemptId: attempt.attempt_id,
                assessmentSnapshot: candidateAssessmentSnapshot,
                scoreSnapshot: candidateScoreSnapshot,
                initialScore: attempt.initial_score ?? attempt.score ?? null,
            });
            appliedAction = 'backfilled';
        } else if (!dryRun && outcome === 'unresolved_unfinalized') {
            await markAttemptRevisionRequired(activeDb, attempt.attempt_id);
            appliedAction = 'marked_revision_required';
        }

        rows.push({
            attemptId: attempt.attempt_id,
            examId: attempt.exam_id,
            outcome,
            reconstructionStrategy,
            storedScore: attempt.score,
            storedTotalScore: attempt.total_score,
            candidateScore: candidateScoreSnapshot.score,
            candidateTotalScore: candidateScoreSnapshot.totalScore,
            explicitRandomizeChoices,
            effectiveRandomizeChoices,
            mismatchReason,
            finalized,
            appliedAction,
        });
    }

    return {
        dryRun,
        batchSize,
        cursorAttemptId: options.cursorAttemptId ?? null,
        nextCursorAttemptId: hasMore ? (attempts.at(-1)?.attempt_id ?? null) : null,
        hasMore,
        processedCount: rows.length,
        safeBackfillCount: rows.filter((row) => row.outcome === 'safe_backfill').length,
        unresolvedCount: rows.filter((row) => row.outcome === 'unresolved_unfinalized').length,
        finalizedMismatchCount: rows.filter((row) => row.outcome === 'finalized_mismatch').length,
        finalizedSafeMatchCount: rows.filter((row) => row.outcome === 'finalized_safe_match')
            .length,
        rows,
    };
}

export async function runAttemptScoreSnapshotAudit(
    options: AuditRunOptions = {},
    deps: { db?: DbClient } = {},
): Promise<AttemptScoreSnapshotAuditRunSummary> {
    const batchSize = options.batchSize ?? 100;
    const dryRun = options.dryRun ?? true;
    const maxBatches =
        typeof options.maxBatches === 'number' && options.maxBatches > 0
            ? Math.floor(options.maxBatches)
            : null;
    const batchSummaries: AttemptScoreSnapshotAuditSummary[] = [];
    let cursorAttemptId = options.cursorAttemptId;
    let hasMore = true;
    let batchesProcessed = 0;

    while (hasMore && (maxBatches === null || batchesProcessed < maxBatches)) {
        const batchSummary = await auditAttemptScoreSnapshots(
            {
                dryRun,
                batchSize,
                cursorAttemptId,
            },
            deps,
        );

        batchSummaries.push(batchSummary);
        batchesProcessed += 1;
        hasMore = batchSummary.hasMore;
        cursorAttemptId = batchSummary.nextCursorAttemptId ?? undefined;

        if (batchSummary.processedCount === 0) {
            break;
        }
    }

    const aggregateSummary: AttemptScoreSnapshotAuditRunSummary = {
        dryRun,
        batchSize,
        maxBatches,
        batchesProcessed,
        processedCount: batchSummaries.reduce((sum, batch) => sum + batch.processedCount, 0),
        safeBackfillCount: batchSummaries.reduce((sum, batch) => sum + batch.safeBackfillCount, 0),
        unresolvedCount: batchSummaries.reduce((sum, batch) => sum + batch.unresolvedCount, 0),
        finalizedMismatchCount: batchSummaries.reduce(
            (sum, batch) => sum + batch.finalizedMismatchCount,
            0,
        ),
        finalizedSafeMatchCount: batchSummaries.reduce(
            (sum, batch) => sum + batch.finalizedSafeMatchCount,
            0,
        ),
        hasMore,
        nextCursorAttemptId: cursorAttemptId ?? null,
        batchSummaries,
    };

    if (options.reportFile) {
        await writeFile(options.reportFile, JSON.stringify(aggregateSummary, null, 2), 'utf8');
    }

    return aggregateSummary;
}

if (require.main === module) {
    const dryRun = !process.argv.includes('--apply');
    const batchSizeArg = process.argv.find((arg) => arg.startsWith('--batch-size='));
    const cursorArg = process.argv.find((arg) => arg.startsWith('--cursor-attempt-id='));
    const maxBatchesArg = process.argv.find((arg) => arg.startsWith('--max-batches='));
    const reportFileArg = process.argv.find((arg) => arg.startsWith('--report-file='));
    const batchSize = batchSizeArg ? Number(batchSizeArg.split('=')[1] ?? 100) : 100;
    const cursorAttemptId = cursorArg?.split('=')[1] ?? undefined;
    const maxBatches = maxBatchesArg ? Number(maxBatchesArg.split('=')[1] ?? 0) : undefined;
    const reportFile = reportFileArg?.split('=')[1] ?? undefined;

    runAttemptScoreSnapshotAudit({
        dryRun,
        batchSize: Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 100,
        cursorAttemptId: cursorAttemptId?.trim() ? cursorAttemptId : undefined,
        maxBatches:
            maxBatches !== undefined && Number.isFinite(maxBatches) && maxBatches > 0
                ? maxBatches
                : undefined,
        reportFile: reportFile?.trim() ? reportFile : undefined,
    })
        .then((summary) => {
            console.log(JSON.stringify(summary, null, 2));
            process.exit(0);
        })
        .catch((error) => {
            console.error('Attempt score snapshot audit failed:', error);
            process.exit(1);
        });
}
