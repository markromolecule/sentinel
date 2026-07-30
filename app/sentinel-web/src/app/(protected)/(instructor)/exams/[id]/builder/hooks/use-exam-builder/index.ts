import { useSearchParams, useParams } from 'next/navigation';
import { useBuilderWorkspaceQuery } from '@sentinel/hooks';
import { useExamStore } from '@/features/exams/builder/_stores/use-exam-store';
import { type UseExamBuilderResult } from './_types';

import { useBuilderUIState } from './use-builder-ui-state';
import { useBuilderWorkspaceActions } from './use-builder-workspace-actions';
import { useQuestionManagement } from './use-question-management';
import { useSectionManagement } from './use-section-management';

export function useExamBuilder(): UseExamBuilderResult {
    const searchParams = useSearchParams();
    const params = useParams();
    const id = params?.id as string;
    const titleParam = searchParams.get('title') || 'Untitled Exam';

    const { data: builderWorkspace, isLoading: isWorkspaceLoading } = useBuilderWorkspaceQuery(id);
    const questionTypes = builderWorkspace?.questionTypes ?? [];

    const store = useExamStore();
    const {
        title,
        description,
        subject,
        section,
        startDateTime,
        endDateTime,
        durationMinutes,
        passingScore,
        settings,
        configuration,
        questionSections,
        questions,
        status,
    } = store;

    // 1. UI State Logic
    const uiState = useBuilderUIState({ questionTypes });

    // 2. Workspace Actions Logic
    const workspaceActions = useBuilderWorkspaceActions({
        id,
        builderWorkspace,
    });

    // 3. Question Management Logic
    const questionManagement = useQuestionManagement({
        id,
        questionSections,
        questions,
        setActiveQuestionType: uiState.setActiveQuestionType,
        setEditingQuestion: uiState.setEditingQuestion,
    });

    // 4. Section Management Logic
    const sectionManagement = useSectionManagement({
        questionSections,
        questions,
        questionTypes,
    });

    return {
        // State
        title,
        description,
        subject,
        section,
        startDateTime,
        endDateTime,
        durationMinutes,
        passingScore,
        settings,
        configuration,
        status,
        questionSections,
        questions,
        questionTypes,
        isWorkspaceLoading,
        titleParam,

        // UI State
        isTypeSelectorOpen: uiState.isTypeSelectorOpen,
        activeQuestionType: uiState.activeQuestionType,
        activeQuestionTypeDefinition: uiState.activeQuestionTypeDefinition,
        editingQuestion: uiState.editingQuestion,
        setIsTypeSelectorOpen: uiState.setIsTypeSelectorOpen,
        handleSelectQuestionType: uiState.handleSelectQuestionType,
        handleBackFromBuilder: uiState.handleBackFromBuilder,

        // Workspace Actions
        isSaving: workspaceActions.isSaving,
        isPublishing: workspaceActions.isPublishing,
        isUpdatingTitle: workspaceActions.isUpdatingTitle,
        handleToggleExamSetting: workspaceActions.handleToggleExamSetting,
        handleToggleLobbyAdmissionMode: workspaceActions.handleToggleLobbyAdmissionMode,
        handleToggleReleaseScoreMode: workspaceActions.handleToggleReleaseScoreMode,
        handleToggleStrictMode: workspaceActions.handleToggleStrictMode,
        handleUpdateTitle: workspaceActions.handleUpdateTitle,
        handleSave: workspaceActions.handleSave,
        handlePublish: workspaceActions.handlePublish,

        // Question Management
        isAddingQuestionToBank: questionManagement.isAddingQuestionToBank,
        isQuestionTypesLoading: isWorkspaceLoading,
        handleCreateQuestion: questionManagement.handleCreateQuestion,
        handleDuplicateQuestion: questionManagement.handleDuplicateQuestion,
        handleEditQuestion: questionManagement.handleEditQuestion,
        handleUpdateQuestion: questionManagement.handleUpdateQuestion,
        handleDeleteQuestion: questionManagement.handleDeleteQuestion,
        handleAddQuestionToBank: questionManagement.handleAddQuestionToBank,
        handleImportQuestions: questionManagement.handleImportQuestions,

        // Section Management
        handleAddQuestionSection: sectionManagement.handleAddQuestionSection,
        handleUpdateQuestionSection: sectionManagement.handleUpdateQuestionSection,
        handleDeleteQuestionSection: sectionManagement.handleDeleteQuestionSection,
        handleToggleQuestionSectionCollapse: sectionManagement.handleToggleQuestionSectionCollapse,
        handleReorderQuestionSections: sectionManagement.handleReorderQuestionSections,
        handleReorderQuestionsInSection: sectionManagement.handleReorderQuestionsInSection,
    };
}
