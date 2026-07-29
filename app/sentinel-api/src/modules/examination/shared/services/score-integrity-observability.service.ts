type ScoreIntegrityBoundary =
    | 'prepare'
    | 'commit'
    | 'history'
    | 'report'
    | 'grading'
    | 'grading_dual_read';

type QuestionReportLike = {
    awardedScore?: number | null;
    maxScore?: number | null;
};

function sumAwardedScore(questionReports: QuestionReportLike[]) {
    return questionReports.reduce((sum, report) => sum + (report.awardedScore ?? 0), 0);
}

function sumMaxScore(questionReports: QuestionReportLike[]) {
    return questionReports.reduce((sum, report) => sum + (report.maxScore ?? 0), 0);
}

export function logScoreIntegrityCheck(args: {
    boundary: ScoreIntegrityBoundary;
    attemptId?: string | null;
    examId?: string | null;
    scoringVersion?: string | null;
    aggregateScore: number | null | undefined;
    aggregateTotalScore: number | null | undefined;
    questionReports: QuestionReportLike[];
}) {
    const awardedScoreSum = sumAwardedScore(args.questionReports);
    const maxScoreSum = sumMaxScore(args.questionReports);
    const aggregateScore = args.aggregateScore ?? null;
    const aggregateTotalScore = args.aggregateTotalScore ?? null;

    if (aggregateScore === awardedScoreSum && aggregateTotalScore === maxScoreSum) {
        return;
    }

    console.warn('[score-integrity]', {
        metric: 'aggregate_vs_item_award_mismatch',
        boundary: args.boundary,
        attemptId: args.attemptId ?? null,
        examId: args.examId ?? null,
        scoringVersion: args.scoringVersion ?? null,
        aggregateScore,
        aggregateTotalScore,
        awardedScoreSum,
        maxScoreSum,
    });
}

export function logScoreSnapshotColumnMismatch(args: {
    boundary: ScoreIntegrityBoundary;
    attemptId?: string | null;
    examId?: string | null;
    columnScore: number | null;
    columnTotalScore: number | null;
    columnPercentage: number | null;
    snapshotScore: number;
    snapshotTotalScore: number;
    snapshotPercentage: number | null;
    scoringVersion?: string | null;
}) {
    if (
        args.columnScore === args.snapshotScore &&
        args.columnTotalScore === args.snapshotTotalScore &&
        args.columnPercentage === args.snapshotPercentage
    ) {
        return;
    }

    console.warn('[score-integrity]', {
        metric: 'legacy_column_vs_snapshot_mismatch',
        boundary: args.boundary,
        attemptId: args.attemptId ?? null,
        examId: args.examId ?? null,
        scoringVersion: args.scoringVersion ?? null,
        columnScore: args.columnScore,
        columnTotalScore: args.columnTotalScore,
        columnPercentage: args.columnPercentage,
        snapshotScore: args.snapshotScore,
        snapshotTotalScore: args.snapshotTotalScore,
        snapshotPercentage: args.snapshotPercentage,
    });
}

export function logDualReadComparison(args: {
    boundary: Extract<ScoreIntegrityBoundary, 'grading_dual_read'>;
    attemptId?: string | null;
    examId?: string | null;
    scoringVersion?: string | null;
    persistedQuestionReports: QuestionReportLike[];
    legacyQuestionReports: QuestionReportLike[];
}) {
    const persistedScore = sumAwardedScore(args.persistedQuestionReports);
    const legacyScore = sumAwardedScore(args.legacyQuestionReports);
    const persistedTotal = sumMaxScore(args.persistedQuestionReports);
    const legacyTotal = sumMaxScore(args.legacyQuestionReports);

    if (persistedScore === legacyScore && persistedTotal === legacyTotal) {
        return;
    }

    console.warn('[score-integrity]', {
        metric: 'dual_read_mismatch',
        boundary: args.boundary,
        attemptId: args.attemptId ?? null,
        examId: args.examId ?? null,
        scoringVersion: args.scoringVersion ?? null,
        persistedScore,
        persistedTotal,
        legacyScore,
        legacyTotal,
    });
}
