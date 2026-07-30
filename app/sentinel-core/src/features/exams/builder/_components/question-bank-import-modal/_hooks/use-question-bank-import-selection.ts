'use client';

import { useEffect, useMemo, useState } from 'react';
import type { QuestionRecord } from '@sentinel/services';
import type { QuestionType } from '@sentinel/shared/types';
import { ALL_COLLECTIONS_ID } from '../constants';
import type { SelectedImportQuestionRecord } from '../utils';
import { toggleAllSelectionIds, toggleSelectionId } from '../utils';

export function useQuestionBankImportSelection(allowedQuestionType?: QuestionType) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedQuestionsById, setSelectedQuestionsById] = useState<
        Record<string, SelectedImportQuestionRecord>
    >({});
    const [alreadyAddedIds, setAlreadyAddedIds] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedQuestionType, setSelectedQuestionType] = useState<QuestionType | 'all'>(
        allowedQuestionType ?? 'all',
    );
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>(ALL_COLLECTIONS_ID);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (allowedQuestionType) {
            setSelectedQuestionType(allowedQuestionType);
            setSelectedQuestionsById((currentQuestions) => {
                const nextQuestions = { ...currentQuestions };
                const nextIds: string[] = [];
                Object.keys(nextQuestions).forEach((id) => {
                    if (nextQuestions[id]?.question.type === allowedQuestionType) {
                        nextIds.push(id);
                    } else {
                        delete nextQuestions[id];
                    }
                });
                setSelectedIds(nextIds);
                return nextQuestions;
            });
        }
    }, [allowedQuestionType]);

    const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const selectedQuestions = useMemo(
        () =>
            selectedIds.flatMap((id) => {
                const selectedQuestion = selectedQuestionsById[id];
                return selectedQuestion ? [selectedQuestion] : [];
            }),
        [selectedIds, selectedQuestionsById],
    );
    const alreadyAddedIdSet = useMemo(() => new Set(alreadyAddedIds), [alreadyAddedIds]);

    const resetState = (options?: { preserveAlreadyAddedIds?: string[] }) => {
        setSelectedIds([]);
        setSelectedQuestionsById({});
        setAlreadyAddedIds(options?.preserveAlreadyAddedIds ?? []);
        setSearchQuery('');
        setSelectedQuestionType(allowedQuestionType ?? 'all');
        setSelectedCollectionId(ALL_COLLECTIONS_ID);
        setCurrentPage(1);
    };

    const handleSetSearchQuery = (query: string) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const handleSetSelectedCollectionId = (id: string) => {
        setSelectedCollectionId(id);
        setCurrentPage(1);
    };

    const handleSetSelectedQuestionType = (type: QuestionType | 'all') => {
        setSelectedQuestionType(type);
        setCurrentPage(1);
    };

    const toggleQuestion = (question: QuestionRecord, sourceCollectionId?: string) => {
        const { id } = question;

        if (alreadyAddedIdSet.has(id)) {
            return;
        }

        setSelectedIds((currentSelectedIds) => {
            const isSelected = currentSelectedIds.includes(id);

            setSelectedQuestionsById((currentSelectedQuestions) => {
                if (isSelected) {
                    const { [id]: _removedQuestion, ...remainingQuestions } =
                        currentSelectedQuestions;
                    return remainingQuestions;
                }

                return {
                    ...currentSelectedQuestions,
                    [id]: {
                        question,
                        sourceCollectionId,
                    },
                };
            });

            return toggleSelectionId(currentSelectedIds, id);
        });
    };

    const toggleSelectAllFilteredQuestions = (
        filteredQuestions: QuestionRecord[],
        sourceCollectionId?: string,
    ) => {
        const importableQuestions = filteredQuestions.filter(
            (question) => !alreadyAddedIdSet.has(question.id),
        );
        const importableQuestionIds = importableQuestions.map((question) => question.id);

        setSelectedIds((currentSelectedIds) => {
            const allVisibleSelected =
                importableQuestionIds.length > 0 &&
                importableQuestionIds.every((questionId) =>
                    currentSelectedIds.includes(questionId),
                );

            setSelectedQuestionsById((currentSelectedQuestions) => {
                if (allVisibleSelected) {
                    const remainingQuestions = { ...currentSelectedQuestions };

                    importableQuestionIds.forEach((questionId) => {
                        delete remainingQuestions[questionId];
                    });

                    return remainingQuestions;
                }

                const nextSelectedQuestions = { ...currentSelectedQuestions };

                importableQuestions.forEach((question) => {
                    nextSelectedQuestions[question.id] = {
                        question,
                        sourceCollectionId,
                    };
                });

                return nextSelectedQuestions;
            });

            return toggleAllSelectionIds(
                currentSelectedIds,
                importableQuestionIds,
                allVisibleSelected,
            );
        });
    };

    return {
        selectedIds,
        selectedIdSet,
        selectedQuestions,
        alreadyAddedIds,
        alreadyAddedIdSet,
        searchQuery,
        selectedQuestionType,
        selectedCollectionId,
        currentPage,
        setAlreadyAddedIds,
        setSearchQuery: handleSetSearchQuery,
        setSelectedQuestionType: handleSetSelectedQuestionType,
        setSelectedCollectionId: handleSetSelectedCollectionId,
        setCurrentPage,
        toggleQuestion,
        toggleSelectAllFilteredQuestions,
        resetState,
    };
}
