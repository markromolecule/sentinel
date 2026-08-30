import {
    type QuestionType,
    type ExamQuestion,
    type ExamQuestionSection,
    type ExamConfiguration,
    type ExamSettings,
} from '@sentinel/shared/types';
import type { QuestionTypeDefinition } from '@sentinel/services';
import { type QuestionBuilderPayload } from '@/features/exams/builder/_components/_types';

export type UseExamBuilderResult = {
    title: string;
    description: string | null;
    subject: string;
    section: string;
    startDateTime: string | null;
    endDateTime: string | null;
    durationMinutes: number;
    passingScore: number;
    settings: ExamSettings;
    configuration: ExamConfiguration;
    status: 'draft' | 'published' | string;
    questionSections: ExamQuestionSection[];
    questions: ExamQuestion[];
    questionTypes: QuestionTypeDefinition[];
    isWorkspaceLoading: boolean;
    isSaving: boolean;
    isQuestionTypesLoading: boolean;
    isUpdatingTitle: boolean;
    isAddingQuestionToBank: boolean;
    titleParam: string;
    isTypeSelectorOpen: boolean;
    activeQuestionType: QuestionType | null;
    activeQuestionTypeDefinition?: QuestionTypeDefinition;
    editingQuestion: ExamQuestion | null;
    setIsTypeSelectorOpen: (open: boolean) => void;
    handleSelectQuestionType: (type: QuestionType) => void | Promise<void>;
    handleCreateQuestion: (payload: QuestionBuilderPayload, sectionId?: string) => Promise<void>;
    handleDuplicateQuestion: (payload: QuestionBuilderPayload, sectionId?: string) => Promise<void>;
    handleEditQuestion: (id: string) => void;
    handleUpdateQuestion: (id: string, payload: QuestionBuilderPayload) => Promise<void>;
    handleDeleteQuestion: (id: string) => void;
    handleAddQuestionToBank: (id: string) => Promise<void>;
    handleAddQuestionSection: () => void;
    handleUpdateQuestionSection: (sectionId: string, updates: Partial<ExamQuestionSection>) => void;
    handleDeleteQuestionSection: (sectionId: string) => void;
    handleToggleQuestionSectionCollapse: (sectionId: string) => void;
    handleReorderQuestionSections: (startIndex: number, endIndex: number) => void;
    handleReorderQuestionsInSection: (
        sectionId: string,
        startIndex: number,
        endIndex: number,
    ) => void;
    handleImportQuestions: (questions: ExamQuestion[], sectionId?: string) => void;
    handleToggleExamSetting: (key: keyof ExamSettings, value: boolean) => void;
    handleToggleLobbyAdmissionMode: (enabled: boolean) => void;
    handleToggleReleaseScoreMode: (enabled: boolean) => void;
    handleToggleStrictMode: (enabled: boolean) => void;
    handleUpdateTitle: (title: string) => Promise<boolean>;
    handleBackFromBuilder: () => void;
    handleSave: () => Promise<void>;
};
