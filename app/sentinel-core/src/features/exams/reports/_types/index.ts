import type {
    AttemptGradingDetailType,
    GradingQuestionType,
} from '@sentinel/shared';

export type ReportCardType = AttemptGradingDetailType['questionReports'][number] & {
    question?: GradingQuestionType;
};
