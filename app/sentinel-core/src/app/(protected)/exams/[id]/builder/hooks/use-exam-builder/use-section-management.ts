import { toast } from 'sonner';
import { type ExamQuestion, type ExamQuestionSection } from '@sentinel/shared/types';
import {
    useExamStore,
    buildQuestionSectionCopy,
} from '@/features/exams/builder/_stores/use-exam-store';

interface UseSectionManagementProps {
    questionSections: ExamQuestionSection[];
    questions: ExamQuestion[];
    questionTypes: Array<{ value: string; label: string; instruction: string }>;
}

/**
 * Guard to verify if a target question type is compatible with a section's existing questions.
 *
 * @param sectionId - The section ID to verify.
 * @param targetType - The target question type (or null).
 * @param questions - The list of all questions in the store.
 * @returns True if compatible, false otherwise.
 */
export function isSectionTypeCompatible(
    sectionId: string,
    targetType: string | null,
    questions: Array<{ sectionId?: string | null; type: string }>,
): boolean {
    if (!targetType) return true;
    const sectionQuestions = questions.filter((q) => q.sectionId === sectionId);
    return sectionQuestions.every((q) => q.type === targetType);
}

export function useSectionManagement({
    questionSections,
    questions,
    questionTypes,
}: UseSectionManagementProps) {
    const {
        addQuestionSection,
        updateQuestionSection,
        deleteQuestionSection,
        toggleQuestionSectionCollapse,
        reorderQuestionSections,
        reorderQuestionsInSection,
    } = useExamStore();

    const handleAddQuestionSection = () => {
        addQuestionSection();
    };

    const handleUpdateQuestionSection = (
        sectionId: string,
        updates: Partial<ExamQuestionSection>,
    ) => {
        if ('questionType' in updates) {
            const newType = updates.questionType;
            if (newType !== undefined) {
                if (!isSectionTypeCompatible(sectionId, newType, questions)) {
                    toast.error(
                        'Cannot change section type. Existing questions in this section do not match the selected type.',
                    );
                    return;
                }

                if (newType === null) {
                    updateQuestionSection(sectionId, { questionType: null });
                } else {
                    const definition = questionTypes.find((t) => t.value === newType);
                    if (definition) {
                        const copy = buildQuestionSectionCopy(definition);
                        updateQuestionSection(sectionId, copy);
                    } else {
                        updateQuestionSection(sectionId, { questionType: newType });
                    }
                }
                return;
            }
        }

        updateQuestionSection(sectionId, updates);
    };

    const handleDeleteQuestionSection = (sectionId: string) => {
        const section = questionSections.find((item) => item.id === sectionId);
        const sectionQuestionCount = questions.filter(
            (question) => question.sectionId === sectionId,
        ).length;

        if (questionSections.length <= 1) {
            toast.error('At least one section is required.');
            return;
        }

        deleteQuestionSection(sectionId);
        toast.success(
            sectionQuestionCount > 0
                ? `${section?.title || 'Section'} and its questions were deleted.`
                : `${section?.title || 'Section'} deleted.`,
        );
    };

    const handleToggleQuestionSectionCollapse = (sectionId: string) => {
        toggleQuestionSectionCollapse(sectionId);
    };

    const handleReorderQuestionSections = (startIndex: number, endIndex: number) => {
        reorderQuestionSections(startIndex, endIndex);
    };

    const handleReorderQuestionsInSection = (
        sectionId: string,
        startIndex: number,
        endIndex: number,
    ) => {
        reorderQuestionsInSection(sectionId, startIndex, endIndex);
    };

    return {
        handleAddQuestionSection,
        handleUpdateQuestionSection,
        handleDeleteQuestionSection,
        handleToggleQuestionSectionCollapse,
        handleReorderQuestionSections,
        handleReorderQuestionsInSection,
    };
}
