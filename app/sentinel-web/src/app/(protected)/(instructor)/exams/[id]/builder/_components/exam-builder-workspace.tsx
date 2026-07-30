'use client';

import * as React from 'react';
import {
    QuestionBankImportModal,
    QuestionBucketTable,
    QuestionBuilderForm,
    QuestionTypeSelectorDialog,
} from '@/features/exams';
import type { UseExamBuilderResult } from '../hooks/use-exam-builder/_types';
import type { ExamBuilderWorkspaceProps } from './_types';
import { toast } from 'sonner';

export function ExamBuilderWorkspace({
    activeQuestionType,
    activeQuestionTypeDefinition,
    editingQuestion,
    questionSections,
    questions,
    questionTypes,
    isQuestionTypesLoading,
    isTypeSelectorOpen,
    setIsTypeSelectorOpen,
    handleSelectQuestionType,
    handleCreateQuestion,
    handleDuplicateQuestion,
    handleEditQuestion,
    handleUpdateQuestion,
    handleDeleteQuestion,
    handleAddQuestionToBank,
    handleAddQuestionSection,
    handleUpdateQuestionSection,
    handleDeleteQuestionSection,
    handleToggleQuestionSectionCollapse,
    handleReorderQuestionSections,
    handleReorderQuestionsInSection,
    handleImportQuestions,
    handleBackFromBuilder,
    isImportModalOpen,
    setIsImportModalOpen,
}: ExamBuilderWorkspaceProps) {
    const [targetSectionId, setTargetSectionId] = React.useState<string | undefined>();

    const targetSection = questionSections.find((s) => s.id === targetSectionId);
    const allowedQuestionType = targetSection?.questionType ?? undefined;

    return (
        <>
            <div className="min-w-0">
                {activeQuestionType ? (
                    <QuestionBuilderForm
                        key={`${activeQuestionType}-${editingQuestion?.id || 'new'}`}
                        type={activeQuestionType}
                        initialData={editingQuestion || undefined}
                        questionTypeDefinition={activeQuestionTypeDefinition}
                        builderMode
                        onBack={() => {
                            setTargetSectionId(undefined);
                            handleBackFromBuilder();
                        }}
                        onCreate={(payload) => handleCreateQuestion(payload, targetSectionId)}
                        onUpdate={handleUpdateQuestion}
                        onDuplicate={(payload) =>
                            handleDuplicateQuestion(
                                payload,
                                targetSectionId || editingQuestion?.sectionId,
                            )
                        }
                    />
                ) : (
                    <ExamStructureSection
                        questionSections={questionSections}
                        questions={questions}
                        questionTypes={questionTypes}
                        onAddQuestion={(sectionId) => {
                            if (sectionId) {
                                const section = questionSections.find((s) => s.id === sectionId);
                                if (section) {
                                    if (section.questionType) {
                                        setTargetSectionId(sectionId);
                                        handleSelectQuestionType(section.questionType);
                                    } else {
                                        const sectionQuestions = questions.filter(
                                            (q) => q.sectionId === sectionId,
                                        );
                                        if (sectionQuestions.length === 0) {
                                            toast.error(
                                                'Please select a question type for this section before adding questions.',
                                            );
                                        } else {
                                            setTargetSectionId(sectionId);
                                            setIsTypeSelectorOpen(true);
                                        }
                                    }
                                } else {
                                    setTargetSectionId(undefined);
                                    setIsTypeSelectorOpen(true);
                                }
                            } else {
                                setTargetSectionId(undefined);
                                setIsTypeSelectorOpen(true);
                            }
                        }}
                        onAddSection={handleAddQuestionSection}
                        onImportQuestions={(sectionId) => {
                            setTargetSectionId(sectionId);
                            setIsImportModalOpen(true);
                        }}
                        onEditQuestion={handleEditQuestion}
                        onDeleteQuestion={handleDeleteQuestion}
                        onAddQuestionToBank={handleAddQuestionToBank}
                        onUpdateSection={handleUpdateQuestionSection}
                        onDeleteSection={handleDeleteQuestionSection}
                        onToggleSectionCollapse={handleToggleQuestionSectionCollapse}
                        onReorderSections={handleReorderQuestionSections}
                        onReorderQuestions={handleReorderQuestionsInSection}
                    />
                )}
            </div>

            <QuestionTypeSelectorDialog
                open={isTypeSelectorOpen}
                onOpenChange={(open) => {
                    setIsTypeSelectorOpen(open);
                    if (!open) {
                        setTargetSectionId(undefined);
                    }
                }}
                questionTypes={questionTypes}
                isLoading={isQuestionTypesLoading}
                onSelect={handleSelectQuestionType}
            />

            <QuestionBankImportModal
                open={isImportModalOpen}
                onOpenChange={(open) => {
                    setIsImportModalOpen(open);
                    if (!open) {
                        setTargetSectionId(undefined);
                    }
                }}
                existingQuestions={questions}
                allowedQuestionType={allowedQuestionType}
                onImport={(importedQuestions) =>
                    handleImportQuestions(importedQuestions, targetSectionId)
                }
            />
        </>
    );
}

function ExamStructureSection({
    questionSections,
    questions,
    questionTypes,
    onAddQuestion,
    onAddSection,
    onImportQuestions,
    onEditQuestion,
    onDeleteQuestion,
    onAddQuestionToBank,
    onUpdateSection,
    onDeleteSection,
    onToggleSectionCollapse,
    onReorderSections,
    onReorderQuestions,
}: {
    questionSections: UseExamBuilderResult['questionSections'];
    questions: UseExamBuilderResult['questions'];
    questionTypes: UseExamBuilderResult['questionTypes'];
    onAddQuestion: (sectionId?: string) => void;
    onAddSection: UseExamBuilderResult['handleAddQuestionSection'];
    onImportQuestions: (sectionId?: string) => void;
    onEditQuestion: UseExamBuilderResult['handleEditQuestion'];
    onDeleteQuestion: UseExamBuilderResult['handleDeleteQuestion'];
    onAddQuestionToBank: UseExamBuilderResult['handleAddQuestionToBank'];
    onUpdateSection: UseExamBuilderResult['handleUpdateQuestionSection'];
    onDeleteSection: UseExamBuilderResult['handleDeleteQuestionSection'];
    onToggleSectionCollapse: UseExamBuilderResult['handleToggleQuestionSectionCollapse'];
    onReorderSections: UseExamBuilderResult['handleReorderQuestionSections'];
    onReorderQuestions: UseExamBuilderResult['handleReorderQuestionsInSection'];
}) {
    return (
        <div className="space-y-4">
            <QuestionBucketTable
                sections={questionSections}
                questions={questions}
                questionTypes={questionTypes}
                onAdd={onAddQuestion}
                onAddSection={onAddSection}
                onImport={onImportQuestions}
                onEdit={onEditQuestion}
                onDelete={onDeleteQuestion}
                onAddToBank={onAddQuestionToBank}
                onUpdateSection={onUpdateSection}
                onDeleteSection={onDeleteSection}
                onToggleSectionCollapse={onToggleSectionCollapse}
                onReorderSections={onReorderSections}
                onReorderInSection={onReorderQuestions}
            />
        </div>
    );
}
