'use client';

import { useEffect, useMemo } from 'react';
import type { ExamQuestion, QuestionType } from '@sentinel/shared/types';
import type { QuestionBankImportModalState } from '../types';
import { buildImportedExamQuestions } from '../utils';
import { useQuestionBankImportData } from './use-question-bank-import-data';
import { useQuestionBankImportSelection } from './use-question-bank-import-selection';

export function useQuestionBankImportModal(
    existingQuestions: ExamQuestion[] = [],
    allowedQuestionType?: QuestionType,
): QuestionBankImportModalState {
    const selection = useQuestionBankImportSelection(allowedQuestionType);
    const alreadyAddedIds = useMemo(
        () =>
            existingQuestions.flatMap((question) =>
                question.sourceQuestionBankQuestionId
                    ? [question.sourceQuestionBankQuestionId]
                    : [],
            ),
        [existingQuestions],
    );

    useEffect(() => {
        selection.setAlreadyAddedIds(alreadyAddedIds);
    }, [alreadyAddedIds, selection]);

    const data = useQuestionBankImportData(
        selection.selectedCollectionId,
        selection.searchQuery,
        selection.selectedQuestionType,
        selection.currentPage,
    );

    const buildImportedQuestions = () => buildImportedExamQuestions(selection.selectedQuestions);

    return {
        questionRecords: data.questionRecords,
        collections: data.collections,
        questionTypes: data.questionTypes,
        typeCounts: data.typeCounts,
        selectedCollection: data.selectedCollection,
        selectedCollectionId: selection.selectedCollectionId,
        selectedIds: selection.selectedIds,
        selectedIdSet: selection.selectedIdSet,
        alreadyAddedIds: selection.alreadyAddedIds,
        alreadyAddedIdSet: selection.alreadyAddedIdSet,
        searchQuery: selection.searchQuery,
        selectedQuestionType: selection.selectedQuestionType,
        selectedImportableCount: selection.selectedIds.length,
        totalQuestionCount: data.totalQuestionCount,
        currentPage: selection.currentPage,
        totalPages: data.totalPages,
        isQuestionsLoading: data.isQuestionsLoading,
        isFetchingMoreQuestions: data.isFetchingMoreQuestions,
        isCollectionsLoading: data.isCollectionsLoading,
        isQuestionTypesLoading: data.isQuestionTypesLoading,
        isTypeCountsLoading: data.isTypeCountsLoading,
        isSelectedCollectionLoading: false,
        setSearchQuery: selection.setSearchQuery,
        setSelectedCollectionId: selection.setSelectedCollectionId,
        setSelectedQuestionType: selection.setSelectedQuestionType,
        setCurrentPage: selection.setCurrentPage,
        toggleQuestion: (id) => {
            const question = data.questionRecords.find((record) => record.id === id);

            if (!question) {
                return;
            }

            selection.toggleQuestion(question, data.selectedCollection?.id);
        },
        toggleSelectAllFilteredQuestions: () =>
            selection.toggleSelectAllFilteredQuestions(
                data.questionRecords,
                data.selectedCollection?.id,
            ),
        buildImportedQuestions,
        resetState: selection.resetState,
    };
}
