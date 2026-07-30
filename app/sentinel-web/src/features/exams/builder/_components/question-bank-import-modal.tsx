'use client';

import { useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, VisuallyHidden } from '@sentinel/ui';
import { CollectionSidebar } from './question-bank-import-modal/_components/collection-sidebar';
import { ImportModalFooter } from './question-bank-import-modal/_components/import-modal-footer';
import { ImportModalHeader } from './question-bank-import-modal/_components/import-modal-header';
import { QuestionsPanel } from './question-bank-import-modal/_components/questions-panel';
import { useQuestionBankImportModal } from './question-bank-import-modal/_hooks/use-question-bank-import-modal';
import type { QuestionBankImportModalProps } from './question-bank-import-modal/types';

export function QuestionBankImportModal({
    open,
    onOpenChange,
    onImport,
    existingQuestions = [],
    allowedQuestionType,
}: QuestionBankImportModalProps) {
    const questionsScrollContainerRef = useRef<HTMLDivElement | null>(null);
    const modal = useQuestionBankImportModal(existingQuestions, allowedQuestionType);

    const handleImport = () => {
        onImport(modal.buildImportedQuestions());
        onOpenChange(false);
        modal.resetState({
            preserveAlreadyAddedIds: existingQuestions.flatMap((question) =>
                question.sourceQuestionBankQuestionId
                    ? [question.sourceQuestionBankQuestionId]
                    : [],
            ),
        });
    };

    const handleCancel = () => {
        modal.resetState({
            preserveAlreadyAddedIds: existingQuestions.flatMap((question) =>
                question.sourceQuestionBankQuestionId
                    ? [question.sourceQuestionBankQuestionId]
                    : [],
            ),
        });
        onOpenChange(false);
    };

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            handleCancel();
            return;
        }

        onOpenChange(true);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="flex h-[82vh] min-h-0 w-[95vw] flex-col gap-0 overflow-hidden rounded-xl border p-0 sm:max-w-6xl">
                <VisuallyHidden>
                    <DialogTitle>Import Questions from Question Bank</DialogTitle>
                </VisuallyHidden>
                <ImportModalHeader selectedCount={modal.selectedImportableCount} />

                <div className="flex min-h-0 flex-1 overflow-hidden">
                    <CollectionSidebar
                        collections={modal.collections}
                        questionCount={modal.totalQuestionCount}
                        selectedCollectionId={modal.selectedCollectionId}
                        isCollectionsLoading={modal.isCollectionsLoading}
                        onSelectCollection={modal.setSelectedCollectionId}
                    />

                    <QuestionsPanel
                        selectedCollection={modal.selectedCollection}
                        questionTypes={modal.questionTypes}
                        typeCounts={modal.typeCounts}
                        searchQuery={modal.searchQuery}
                        selectedQuestionType={modal.selectedQuestionType}
                        questionRecords={modal.questionRecords}
                        selectedIds={modal.selectedIds}
                        selectedIdSet={modal.selectedIdSet}
                        alreadyAddedIds={modal.alreadyAddedIds}
                        alreadyAddedIdSet={modal.alreadyAddedIdSet}
                        totalQuestionCount={modal.totalQuestionCount}
                        currentPage={modal.currentPage}
                        totalPages={modal.totalPages}
                        isQuestionsLoading={modal.isQuestionsLoading}
                        isFetchingMoreQuestions={modal.isFetchingMoreQuestions}
                        isQuestionTypesLoading={modal.isQuestionTypesLoading}
                        isTypeCountsLoading={modal.isTypeCountsLoading}
                        isSelectedCollectionLoading={modal.isSelectedCollectionLoading}
                        questionsScrollContainerRef={questionsScrollContainerRef}
                        onSearchChange={modal.setSearchQuery}
                        onQuestionTypeChange={modal.setSelectedQuestionType}
                        onPageChange={modal.setCurrentPage}
                        onToggleSelectAll={modal.toggleSelectAllFilteredQuestions}
                        onToggleQuestion={modal.toggleQuestion}
                    />
                </div>

                <ImportModalFooter
                    selectedCount={modal.selectedImportableCount}
                    onCancel={handleCancel}
                    onImport={handleImport}
                />
            </DialogContent>
        </Dialog>
    );
}
