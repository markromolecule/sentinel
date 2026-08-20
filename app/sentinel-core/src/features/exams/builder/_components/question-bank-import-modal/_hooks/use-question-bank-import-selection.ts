'use client';

import { useEffect, useMemo, useState } from 'react';
import type { QuestionRecord } from '@sentinel/services';
import type { QuestionType } from '@sentinel/shared/types';
import { ALL_COLLECTIONS_ID } from '../constants';
import type { SelectedImportQuestionRecord } from '../utils';

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
                const nextQuestions: Record<string, SelectedImportQuestionRecord> = {};
                Object.keys(currentQuestions).forEach((id) => {
                    const item = currentQuestions[id];
                    if (item && item.question.type === allowedQuestionType) {
                        nextQuestions[id] = item;
                    }
                });
                return nextQuestions;
            });
            setSelectedIds((currentIds) =>
                currentIds.filter(
                    (id) => selectedQuestionsById[id]?.question.type === allowedQuestionType,
                ),
            );
        }
    }, [allowedQuestionType, selectedQuestionsById]);

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

        const isSelected = selectedIds.includes(id);

        if (isSelected) {
            setSelectedIds((current) => current.filter((item) => item !== id));
            setSelectedQuestionsById((current) => {
                const { [id]: _removedQuestion, ...remainingQuestions } = current;
                return remainingQuestions;
            });
        } else {
            setSelectedIds((current) => [...current, id]);
            setSelectedQuestionsById((current) => ({
                ...current,
                [id]: {
                    question,
                    sourceCollectionId,
                },
            }));
        }
    };

    const toggleSelectAllFilteredQuestions = (
        filteredQuestions: QuestionRecord[],
        sourceCollectionId?: string,
    ) => {
        const importableQuestions = filteredQuestions.filter(
            (question) => !alreadyAddedIdSet.has(question.id),
        );
        const importableQuestionIds = importableQuestions.map((question) => question.id);
        if (importableQuestionIds.length === 0) {
            return;
        }

        const allVisibleSelected = importableQuestionIds.every((questionId) =>
            selectedIds.includes(questionId),
        );

        if (allVisibleSelected) {
            const removeIdSet = new Set(importableQuestionIds);
            setSelectedIds((current) => current.filter((id) => !removeIdSet.has(id)));
            setSelectedQuestionsById((current) => {
                const remainingQuestions = { ...current };
                importableQuestionIds.forEach((questionId) => {
                    delete remainingQuestions[questionId];
                });
                return remainingQuestions;
            });
        } else {
            const newIdsToAdd = importableQuestionIds.filter((id) => !selectedIds.includes(id));
            setSelectedIds((current) => [...current, ...newIdsToAdd]);
            setSelectedQuestionsById((current) => {
                const nextSelectedQuestions = { ...current };
                importableQuestions.forEach((question) => {
                    nextSelectedQuestions[question.id] = {
                        question,
                        sourceCollectionId,
                    };
                });
                return nextSelectedQuestions;
            });
        }
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
