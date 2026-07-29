import { type DbClient } from '@sentinel/db';
import { getExamConfigurationState } from '../../configuration/configuration.service';
import { resolveExaminationGlobalSettings } from '../../configuration/configuration.service';
import type { ExamDetail } from '../exam.dto';
import { getExamByIdData } from '../data/get-exam-by-id';
import { getExamQuestionsData } from '../data/get-exam-questions';
import { getExamSectionsData } from '../data/get-exam-sections';
import { mapExamDetailResponse } from './map-exam-response.service';
import { requireExamRecord } from './require-exam-record.service';
import { RuntimeAccessService } from '../../runtime-access/runtime-access.service';
import { AccessGatekeeperService } from '../../access/access.service';
import { buildStudentOverrideRuntimeAccess } from '../../student-overrides/student-overrides.service';
import type { ExamRuntimeAccess } from '../../runtime-access/runtime-access.dto';
import { TelemetrySettingsService } from '../../../telemetry/settings/telemetry-settings.service';
import {
    type AttemptAssessmentSnapshot,
    Schema,
    randomizeQuestionChoices,
    shuffleExamQuestions,
    type ExamQuestion,
} from '@sentinel/shared';
import type { ExamQuestionContent } from '@sentinel/shared/types';
import { sanitizeQuestionForStudentAttempt } from './student-question-sanitizer.service';
import { applyEffectiveExamBaselineToRawRecord } from './resolve-effective-exam-baseline.service';

function normalizeSnapshotQuestion(
    question: AttemptAssessmentSnapshot['questions'][number],
): ExamQuestion {
    return {
        id: question.id,
        examId: question.examId,
        sectionId: question.sectionId ?? undefined,
        sourceQuestionBankQuestionId: question.sourceQuestionBankQuestionId ?? undefined,
        sourceCollectionId: question.sourceCollectionId ?? undefined,
        sourceOrigin: question.sourceOrigin ?? undefined,
        sourceFileName: question.sourceFileName ?? null,
        sourcePageNumber: question.sourcePageNumber ?? null,
        sourceEvidence: question.sourceEvidence ?? null,
        passageContent: question.passageContent ?? null,
        passageType: question.passageType ?? null,
        type: question.type,
        points: question.points,
        orderIndex: question.orderIndex,
        tags: question.tags ?? [],
        content: question.content as ExamQuestionContent,
    };
}

export async function getExamDetail(
    dbClient: DbClient,
    id: string,
    institutionId?: string,
    studentUserId?: string,
): Promise<ExamDetail> {
    const [exam, sections, questions, configurationState, telemetrySettings, globalSettings] =
        await Promise.all([
            getExamByIdData({ dbClient, id, institutionId, studentUserId }),
            getExamSectionsData({ dbClient, examId: id }),
            getExamQuestionsData({ dbClient, examId: id }),
            getExamConfigurationState(dbClient, id),
            TelemetrySettingsService.getTelemetrySettings(dbClient),
            resolveExaminationGlobalSettings(dbClient),
        ]);

    const resolvedExam = requireExamRecord(exam);
    const examWithResolvedBaseline = applyEffectiveExamBaselineToRawRecord(
        resolvedExam,
        globalSettings,
    );
    const hasCompletedAttempt = resolvedExam.attempt_status?.toUpperCase() === 'COMPLETED';
    let runtimeAccess: ExamRuntimeAccess;

    if (studentUserId) {
        const accessCheck = await AccessGatekeeperService.verifyStudentExamEligibility(
            dbClient,
            studentUserId,
            id,
        );

        runtimeAccess = accessCheck.runtimeAccess;

        if (hasCompletedAttempt) {
            runtimeAccess = accessCheck.accessOverride
                ? buildStudentOverrideRuntimeAccess({
                      accessOverride: accessCheck.accessOverride,
                      runtimeAccess: accessCheck.runtimeAccess,
                  })
                : {
                      ...accessCheck.runtimeAccess,
                      state: 'closed',
                      reasonCode: 'CLOSED',
                      message: 'This exam has already been turned in.',
                      canStart: false,
                      canResume: false,
                      hasActiveAttempt: false,
                  };
        }
    } else {
        runtimeAccess = await RuntimeAccessService.resolveExamRuntimeAccess({
            dbClient,
            examId: id,
            scheduledDate: examWithResolvedBaseline.scheduled_date,
            endDateTime: examWithResolvedBaseline.end_date_time,
            durationMinutes: examWithResolvedBaseline.duration_minutes,
            hasActiveAttempt: resolvedExam.attempt_status?.toUpperCase() === 'IN_PROGRESS',
        });
    }

    return mapExamDetailResponse({
        exam: examWithResolvedBaseline,
        settings: configurationState.settings,
        configuration: configurationState.configuration,
        mediaPipeSandbox: telemetrySettings.value.mediaPipeSandbox,
        questionSections: sections.map((section) => ({
            id: section.exam_section_id,
            title: section.title,
            description: section.description,
            orderIndex: section.order_index,
        })),
        questions: (() => {
            const mappedQuestions: ExamQuestion[] = questions.map((question) => ({
                id: question.question_id,
                examId: question.exam_id,
                sectionId: question.exam_section_id ?? undefined,
                sourceQuestionBankQuestionId:
                    question.source_question_bank_question_id ?? undefined,
                sourceCollectionId: question.source_collection_id ?? undefined,
                sourceOrigin: (question.source_origin === 'AI_PDF' ||
                question.source_origin === 'MANUAL'
                    ? question.source_origin
                    : undefined) as 'MANUAL' | 'AI_PDF' | undefined,
                sourceFileName: question.source_file_name ?? null,
                sourcePageNumber: question.source_page_number ?? null,
                sourceEvidence: question.source_evidence ?? null,
                passageContent: question.passage_content ?? null,
                passageType: question.passage_type === 'html' ? 'html' : 'plain',
                type: question.question_type as ExamQuestion['type'],
                points: question.points,
                orderIndex: question.order_index,
                content: question.content as ExamQuestion['content'],
                tags: [],
            }));

            if (!studentUserId) {
                return mappedQuestions;
            }

            const persistedSnapshot = Schema.attemptAssessmentSnapshotSchema.safeParse(
                resolvedExam.attempt_assessment_snapshot,
            );

            if (persistedSnapshot.success) {
                return persistedSnapshot.data.questions.map((question) =>
                    sanitizeQuestionForStudentAttempt(normalizeSnapshotQuestion(question)),
                );
            }

            const seed = resolvedExam.attempt_id || `${studentUserId}-${id}`;
            let finalQuestions = mappedQuestions;

            if (configurationState.settings.shuffleQuestions) {
                finalQuestions = shuffleExamQuestions(finalQuestions, seed);
            }

            if (configurationState.settings.randomizeChoices) {
                finalQuestions = finalQuestions.map((q) =>
                    randomizeQuestionChoices(q, `${seed}-${q.id}`),
                );
            }
            finalQuestions = finalQuestions.map(sanitizeQuestionForStudentAttempt);

            return finalQuestions;
        })(),
        studentView: Boolean(studentUserId),

        runtimeAccess,
    });
}
