import { useCreateQuestionMutation, useValidateQuestionTypeContentMutation } from '@sentinel/hooks';
import { toast } from 'sonner';
import {
    type ExamQuestion,
    type QuestionType,
    type ExamQuestionSection,
} from '@sentinel/shared/types';
import { type QuestionBuilderPayload } from '@/features/exams/builder/_components/_types';
import { useExamStore } from '@/features/exams/builder/_stores/use-exam-store';

interface UseQuestionManagementProps {
    id: string;
    questionSections: ExamQuestionSection[];
    questions: ExamQuestion[];
    setActiveQuestionType: (type: QuestionType | null) => void;
    setEditingQuestion: (question: ExamQuestion | null) => void;
}

/**
 * Guard to verify if a question of a given type can be added to a section.
 * Returns true if valid, or a string error message if blocked.
 */
export function verifyQuestionAddition(
    sectionId: string,
    questionType: string,
    questionSections: ExamQuestionSection[],
    questions: ExamQuestion[],
): { valid: true } | { valid: false; message: string } {
    const targetSection = questionSections.find((s) => s.id === sectionId);
    if (!targetSection) {
        return { valid: false, message: 'Target section does not exist.' };
    }

    const sectionQuestions = questions.filter((q) => q.sectionId === sectionId);
    const hasExistingQuestions = sectionQuestions.length > 0;
    const resolvedType = targetSection.questionType;

    if (!resolvedType) {
        if (!hasExistingQuestions) {
            return {
                valid: false,
                message: 'Please select a question type for this section before adding questions.',
            };
        }
        // Legacy mixed section - allow
        return { valid: true };
    }

    if (resolvedType !== questionType) {
        return {
            valid: false,
            message: `Cannot add question. This section only accepts ${resolvedType.replace('_', ' ')} questions.`,
        };
    }

    return { valid: true };
}

export function useQuestionManagement({
    id,
    questionSections,
    questions,
    setActiveQuestionType,
    setEditingQuestion,
}: UseQuestionManagementProps) {
    const validateQuestionTypeContentMutation = useValidateQuestionTypeContentMutation();
    const createQuestionMutation = useCreateQuestionMutation();

    const { addQuestion, updateQuestion, deleteQuestion, subjectId } = useExamStore();

    const resolveTargetSectionId = (sectionId?: string) =>
        sectionId || questionSections.at(-1)?.id || questionSections[0]?.id;

    const handleCreateQuestion = async (payload: QuestionBuilderPayload, sectionId?: string) => {
        const targetSectionId = resolveTargetSectionId(sectionId);
        const check = verifyQuestionAddition(targetSectionId, payload.type, questionSections, questions);
        if (!check.valid) {
            toast.error(check.message);
            return;
        }

        const validationResult = await validateQuestionTypeContentMutation.mutateAsync({
            type: payload.type,
            content: payload.content,
        });

        const newQuestion: ExamQuestion = {
            id: crypto.randomUUID(),
            examId: id,
            type: payload.type,
            difficulty: payload.difficulty,
            content: validationResult.content,
            points: payload.points,
            orderIndex: questions.length,
            sectionId: targetSectionId,
            tags: [],
            passageContent: payload.passageContent ?? null,
            passageType: payload.passageType ?? 'plain',
        };
        addQuestion(newQuestion);
        setActiveQuestionType(null);
        toast.success('Question created!');
    };

    const handleDuplicateQuestion = async (payload: QuestionBuilderPayload, sectionId?: string) => {
        const targetSectionId = resolveTargetSectionId(sectionId);
        const check = verifyQuestionAddition(targetSectionId, payload.type, questionSections, questions);
        if (!check.valid) {
            toast.error(check.message);
            return;
        }

        const validationResult = await validateQuestionTypeContentMutation.mutateAsync({
            type: payload.type,
            content: payload.content,
        });

        const newQuestion: ExamQuestion = {
            id: crypto.randomUUID(),
            examId: id,
            type: payload.type,
            difficulty: payload.difficulty,
            content: validationResult.content,
            points: payload.points,
            orderIndex: questions.length,
            sectionId: targetSectionId,
            tags: [],
            passageContent: payload.passageContent ?? null,
            passageType: payload.passageType ?? 'plain',
        };
        addQuestion(newQuestion);
        toast.success('Question duplicated!');
    };

    const handleEditQuestion = (questionId: string) => {
        const question = questions.find((q) => q.id === questionId);
        if (question) {
            setEditingQuestion(question);
            setActiveQuestionType(question.type);
        }
    };

    const handleUpdateQuestion = async (questionId: string, payload: QuestionBuilderPayload) => {
        const question = questions.find((q) => q.id === questionId);
        if (!question) return;

        const validationResult = await validateQuestionTypeContentMutation.mutateAsync({
            type: payload.type,
            content: payload.content,
        });

        updateQuestion(questionId, {
            type: payload.type,
            difficulty: payload.difficulty,
            content: validationResult.content,
            points: payload.points,
            passageContent: payload.passageContent ?? null,
            passageType: payload.passageType ?? 'plain',
        });
        setActiveQuestionType(null);
        setEditingQuestion(null);
        toast.success('Question updated!');
    };

    const handleDeleteQuestion = (questionId: string) => {
        deleteQuestion(questionId);
        toast.success('Question deleted!');
    };

    const handleAddQuestionToBank = async (questionId: string) => {
        const question = useExamStore.getState().questions.find((item) => item.id === questionId);

        if (!question) {
            toast.error('Question not found.');
            return;
        }

        if (question.sourceQuestionBankQuestionId) {
            toast.info('This question is already linked to the question bank.');
            return;
        }

        const createdQuestion = await createQuestionMutation.mutateAsync({
            type: question.type,
            difficulty: question.difficulty,
            points: question.points,
            content: question.content,
            passageContent: question.passageContent ?? null,
            passageType: question.passageType ?? 'plain',
            subjectId: subjectId ?? undefined,
        });

        updateQuestion(questionId, {
            sourceQuestionBankQuestionId: createdQuestion.id,
            sourceCollectionId: undefined,
        });
    };

    const handleImportQuestions = (newQuestions: ExamQuestion[], sectionId?: string) => {
        const targetSectionId = resolveTargetSectionId(sectionId);

        // Pre-validate all imported questions before performing any mutations
        for (const q of newQuestions) {
            const check = verifyQuestionAddition(targetSectionId, q.type, questionSections, questions);
            if (!check.valid) {
                toast.error(check.message);
                return;
            }
        }

        newQuestions.forEach((q, index) => {
            addQuestion({
                ...q,
                id: crypto.randomUUID(),
                examId: id,
                orderIndex: questions.length + index,
                sectionId: targetSectionId,
            });
        });
        toast.success(`${newQuestions.length} questions imported from bank!`);
    };

    return {
        isAddingQuestionToBank: createQuestionMutation.isPending,
        handleCreateQuestion,
        handleDuplicateQuestion,
        handleEditQuestion,
        handleUpdateQuestion,
        handleDeleteQuestion,
        handleAddQuestionToBank,
        handleImportQuestions,
    };
}
