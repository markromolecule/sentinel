import { type DbClient } from '@sentinel/db';
import { sql } from 'kysely';
import type { PassageType } from '@sentinel/shared/types';
import type {
    GradingAttemptDetailRow,
    GradingQuestionRow,
} from './get-grading-attempt-detail.types';

export async function findGradingAttemptDetailRow(args: {
    dbClient: DbClient;
    attemptId: string;
    institutionId?: string;
}) {
    return (await args.dbClient
        .selectFrom('exam_attempts as ea')
        .innerJoin('exams as e', 'e.exam_id', 'ea.exam_id')
        .innerJoin('students as st', 'st.student_id', 'ea.student_id')
        .leftJoin('user_profiles as up', 'up.user_id', 'st.user_id')
        .leftJoin('subjects as s', 's.subject_id', 'e.subject_id')
        .select([
            'ea.attempt_id as attemptId',
            'ea.exam_id as examId',
            'ea.student_id as studentId',
            'st.student_number as studentNumber',
            'ea.completed_at as completedAt',
            'ea.score as score',
            'ea.total_score as totalScore',
            'ea.initial_score as initialScore',
            'ea.status as status',
            'ea.answer_snapshot as answerSnapshot',
            'ea.assessment_snapshot as assessmentSnapshot',
            'ea.score_snapshot as scoreSnapshot',
            'e.title as examTitle',
            's.subject_title as subjectTitle',
            sql<string>`trim(concat(up.first_name, ' ', up.last_name))`.as('studentName'),
            sql<string | null>`ea.lifecycle_state::text`.as('lifecycleState'),
            sql<string | null>`ea.score_state::text`.as('scoreState'),
            'ea.finalized_at as finalizedAt',
            'ea.finalized_by as finalizedBy',
        ])
        .where('ea.attempt_id', '=', args.attemptId)
        .$if(Boolean(args.institutionId), (qb) =>
            qb.where('e.institution_id', '=', args.institutionId!),
        )
        .executeTakeFirst()) as GradingAttemptDetailRow | undefined;
}

export async function findExamQuestionsForGrading(args: {
    dbClient: DbClient;
    examId: string;
}) {
    return (await args.dbClient
        .selectFrom('exam_questions as eq')
        .leftJoin(
            'question_bank_questions as qbq',
            'qbq.question_bank_question_id',
            'eq.source_question_bank_question_id',
        )
        .select([
            'eq.question_id as id',
            'eq.exam_id as examId',
            'eq.question_type as type',
            'qbq.source_file_name as sourceFileName',
            'qbq.source_page_number as sourcePageNumber',
            'qbq.source_evidence as sourceEvidence',
            'eq.passage_content as passageContent',
            sql<PassageType | null>`
                CASE
                    WHEN eq.passage_type IS NULL THEN NULL
                    WHEN eq.passage_type = 'html' THEN 'html'
                    ELSE 'plain'
                END
            `.as('passageType'),
            'eq.content as content',
            'eq.points as points',
            'eq.order_index as orderIndex',
        ])
        .where('eq.exam_id', '=', args.examId)
        .orderBy('eq.order_index', 'asc')
        .execute()) as GradingQuestionRow[];
}
