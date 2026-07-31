import { type DbClient, executeTransaction } from '@sentinel/db';
import { HTTPException } from 'hono/http-exception';
import crypto from 'crypto';

/**
 * Clones a source exam's structure (configurations, sections, and questions) to create
 * a new remediation exam restricted to a specific student and schedules it.
 *
 * @param args - Arguments for creating the remediation exam.
 * @returns The created remediation exam details.
 */
export async function createRemediationExam(args: {
    dbClient: DbClient;
    sourceExamId: string;
    studentId: string;
    sourceAttemptId?: string | null;
    remediationType: 'RETAKE' | 'MAKEUP';
    scheduledDate: string | Date;
    endDate: string | Date;
    createdBy: string;
    notes?: string | null;
}) {
    const {
        dbClient,
        sourceExamId,
        studentId,
        sourceAttemptId = null,
        remediationType,
        scheduledDate,
        endDate,
        createdBy,
        notes = null,
    } = args;

    // Fetch the source exam metadata
    const sourceExam = await dbClient
        .selectFrom('exams')
        .selectAll()
        .where('exam_id', '=', sourceExamId)
        .executeTakeFirst();

    if (!sourceExam) {
        throw new HTTPException(404, {
            message: 'Source exam not found.',
        });
    }

    const remediationStudent = await dbClient
        .selectFrom('students')
        .select(['user_id'])
        .where('student_id', '=', studentId)
        .executeTakeFirst();

    if (!remediationStudent?.user_id) {
        throw new HTTPException(404, {
            message: 'Student account not found.',
        });
    }

    return await executeTransaction(async (tx) => {
        const newExamId = crypto.randomUUID();

        // 1. Insert cloned exam
        const remediationExam = await tx
            .insertInto('exams')
            .values({
                exam_id: newExamId,
                title: `${sourceExam.title} (${remediationType === 'RETAKE' ? 'Retake' : 'Makeup'})`,
                subject_id: sourceExam.subject_id,
                description: sourceExam.description,
                duration_minutes: sourceExam.duration_minutes,
                question_count: sourceExam.question_count,
                passing_score: sourceExam.passing_score,
                difficulty: sourceExam.difficulty,
                scheduled_date: new Date(scheduledDate),
                end_date_time: new Date(endDate),
                status: 'PUBLISHED',
                published_at: new Date(),
                published_by: createdBy,
                created_by: createdBy,
                institution_id: sourceExam.institution_id,
                section_id: sourceExam.section_id,
                section_name: sourceExam.section_name,
                room_id: sourceExam.room_id,
                exam_category: sourceExam.exam_category,
                class_group_id: sourceExam.class_group_id,
                is_public: false,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        // 2. Clone exam configuration
        const sourceConfig = await tx
            .selectFrom('exam_configurations')
            .selectAll()
            .where('exam_id', '=', sourceExamId)
            .executeTakeFirst();

        if (sourceConfig) {
            await tx
                .insertInto('exam_configurations')
                .values({
                    config_id: crypto.randomUUID(),
                    exam_id: newExamId,
                    max_reconnect_attempts: sourceConfig.max_reconnect_attempts,
                    strict_mode: sourceConfig.strict_mode,
                    camera_required: sourceConfig.camera_required,
                    mic_required: sourceConfig.mic_required,
                    screen_lock: sourceConfig.screen_lock,
                    auto_submit_timeout_minutes: sourceConfig.auto_submit_timeout_minutes,
                    allowed_devices: sourceConfig.allowed_devices,
                    ai_rules: sourceConfig.ai_rules
                        ? (JSON.stringify(sourceConfig.ai_rules) as any)
                        : undefined,
                    web_security: sourceConfig.web_security
                        ? (JSON.stringify(sourceConfig.web_security) as any)
                        : undefined,
                    mobile_security: sourceConfig.mobile_security
                        ? (JSON.stringify(sourceConfig.mobile_security) as any)
                        : undefined,
                    lobby_admission_mode: sourceConfig.lobby_admission_mode,
                    release_score_mode: sourceConfig.release_score_mode,
                    shuffle_questions: sourceConfig.shuffle_questions,
                    show_correct_answers: sourceConfig.show_correct_answers,
                    allow_review: sourceConfig.allow_review,
                    randomize_choices: sourceConfig.randomize_choices,
                })
                .execute();
        }

        // 3. Clone exam sections
        const sourceSections = await tx
            .selectFrom('exam_sections')
            .selectAll()
            .where('exam_id', '=', sourceExamId)
            .execute();

        const sectionIdMap = new Map<string, string>();
        for (const section of sourceSections) {
            const newSectionId = crypto.randomUUID();
            sectionIdMap.set(section.exam_section_id, newSectionId);

            await tx
                .insertInto('exam_sections')
                .values({
                    exam_section_id: newSectionId,
                    exam_id: newExamId,
                    title: section.title,
                    order_index: section.order_index,
                    description: section.description,
                })
                .execute();
        }

        // 4. Clone exam questions
        const sourceQuestions = await tx
            .selectFrom('exam_questions')
            .selectAll()
            .where('exam_id', '=', sourceExamId)
            .execute();

        for (const q of sourceQuestions) {
            const newQuestionId = crypto.randomUUID();
            const newSectionId = q.exam_section_id ? sectionIdMap.get(q.exam_section_id) : null;

            await tx
                .insertInto('exam_questions')
                .values({
                    question_id: newQuestionId,
                    exam_id: newExamId,
                    question_type: q.question_type,
                    content:
                        typeof q.content === 'string'
                            ? q.content
                            : (JSON.stringify(q.content) as any),
                    passage_content: q.passage_content,
                    passage_type: q.passage_type,
                    points: q.points,
                    order_index: q.order_index,
                    exam_section_id: newSectionId,
                    source_question_bank_question_id: q.source_question_bank_question_id,
                    source_collection_id: q.source_collection_id,
                })
                .execute();
        }

        // 5. Clone exam_assigned_sections
        const sourceAssignedSections = await tx
            .selectFrom('exam_assigned_sections')
            .selectAll()
            .where('exam_id', '=', sourceExamId)
            .execute();

        for (const sas of sourceAssignedSections) {
            await tx
                .insertInto('exam_assigned_sections')
                .values({
                    exam_id: newExamId,
                    section_id: sas.section_id,
                })
                .execute();
        }

        // 6. Clone exam_section_assignments
        const sourceSectionAssignments = await tx
            .selectFrom('exam_section_assignments')
            .selectAll()
            .where('exam_id', '=', sourceExamId)
            .execute();

        for (const ssa of sourceSectionAssignments) {
            await tx
                .insertInto('exam_section_assignments')
                .values({
                    id: crypto.randomUUID(),
                    exam_id: newExamId,
                    section_id: ssa.section_id,
                    class_group_id: ssa.class_group_id,
                    room_id: ssa.room_id,
                    instructor_id: ssa.instructor_id,
                    scheduled_at: ssa.scheduled_at,
                })
                .execute();
        }

        // 7. Create exam_remediation_schedules row
        const remediationId = crypto.randomUUID();
        const remediationSchedule = await tx
            .insertInto('exam_remediation_schedules')
            .values({
                remediation_id: remediationId,
                source_exam_id: sourceExamId,
                remediation_exam_id: newExamId,
                // Remediation access is scoped by auth user ID in the persisted schema.
                student_id: remediationStudent.user_id!,
                source_attempt_id: sourceAttemptId,
                remediation_type: remediationType,
                scheduled_date: new Date(scheduledDate),
                end_date_time: new Date(endDate),
                created_by: createdBy,
                notes: notes,
            })
            .returningAll()
            .executeTakeFirstOrThrow();

        return {
            remediationExam,
            remediationSchedule,
        };
    });
}
