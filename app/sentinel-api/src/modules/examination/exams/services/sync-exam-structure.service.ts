import { type DbClient } from '@sentinel/db';
import type { UpdateExamBody } from '../exam.dto';
import { getExamQuestionsData } from '../data/get-exam-questions';
import { getExamSectionsData } from '../data/get-exam-sections';
import { replaceExamQuestionsData } from '../data/replace-exam-questions';
import { replaceExamSectionsData } from '../data/replace-exam-sections';
import { updateExamData } from '../data/update-exam';
import {
    mapExamStructureQuestionInput,
    normalizeExamStructureInput,
} from './normalize-exam-structure-input.service';

interface SyncExamStructureArgs {
    dbClient: DbClient;
    examId: string;
    body: UpdateExamBody;
    institutionId?: string;
    userId: string;
    hasSourceCollectionId: boolean;
}

/**
 * Synchronizes the sections and questions of an exam structure.
 * Replaces old data with new normalized structure inputs and updates the question count.
 */
export async function syncExamStructure({
    dbClient,
    examId,
    body,
    institutionId,
    userId,
    hasSourceCollectionId,
}: SyncExamStructureArgs): Promise<void> {
    const currentSections = body.questionSections
        ? []
        : await getExamSectionsData({
              dbClient,
              examId,
          });

    const currentQuestions = body.questions
        ? []
        : await getExamQuestionsData({
              dbClient,
              examId,
          });

    const structure = normalizeExamStructureInput({
        examId,
        questionSections:
            body.questionSections ??
            currentSections.map((section) => ({
                id: section.exam_section_id,
                questionType: section.question_type,
                title: section.title,
                description: section.description,
                orderIndex: section.order_index,
            })),
        questions: body.questions ?? currentQuestions.map(mapExamStructureQuestionInput),
    });

    const normalizedQuestions = hasSourceCollectionId
        ? structure.normalizedQuestions
        : structure.normalizedQuestions.map(
              ({ source_collection_id: _sourceCollectionId, ...question }) => question,
          );

    await replaceExamSectionsData({
        dbClient,
        examId,
        sections: structure.normalizedSections,
    });

    await replaceExamQuestionsData({
        dbClient,
        examId,
        questions: normalizedQuestions,
    });

    await updateExamData({
        dbClient,
        id: examId,
        institutionId,
        values: {
            question_count: normalizedQuestions.length,
            updated_at: new Date(),
            updated_by: userId,
        },
    });
}
