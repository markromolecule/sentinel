'use client';

import { useMemo } from 'react';
import {
    Checkbox,
    Input,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@sentinel/ui';
import { Search, Library, ChevronDown, Loader2 } from 'lucide-react';
import type {
    QuestionBankCollectionRecord,
    QuestionRecord,
    QuestionTypeDefinition,
    QuestionTypeCountRecord,
} from '@sentinel/services';
import type { QuestionType } from '@sentinel/shared/types';
import { QuestionPanelEmptyState } from './question-panel-empty-state';
import { QuestionRow } from './question-row';
import { cn } from '@sentinel/ui';

interface QuestionsPanelProps {
    selectedCollection: QuestionBankCollectionRecord | null;
    questionTypes: QuestionTypeDefinition[];
    typeCounts: QuestionTypeCountRecord[];
    searchQuery: string;
    selectedQuestionType: QuestionType | 'all';
    questionRecords: QuestionRecord[];
    selectedIds: string[];
    selectedIdSet: Set<string>;
    alreadyAddedIds: string[];
    alreadyAddedIdSet: Set<string>;
    totalQuestionCount: number;
    currentPage: number;
    totalPages: number;
    isQuestionsLoading: boolean;
    isFetchingMoreQuestions: boolean;
    isQuestionTypesLoading: boolean;
    isTypeCountsLoading: boolean;
    isSelectedCollectionLoading: boolean;
    questionsScrollContainerRef: React.RefObject<HTMLDivElement | null>;
    onSearchChange: (value: string) => void;
    onQuestionTypeChange: (value: QuestionType | 'all') => void;
    onPageChange: (page: number) => void;
    onToggleSelectAll: () => void;
    onToggleQuestion: (id: string) => void;
    allowedQuestionType?: QuestionType;
}

export function QuestionsPanel({
    selectedCollection,
    questionTypes,
    typeCounts,
    searchQuery,
    selectedQuestionType,
    questionRecords,
    selectedIdSet,
    alreadyAddedIdSet,
    totalQuestionCount,
    currentPage,
    totalPages,
    isQuestionsLoading,
    isFetchingMoreQuestions,
    isQuestionTypesLoading,
    isTypeCountsLoading,
    isSelectedCollectionLoading,
    questionsScrollContainerRef,
    onSearchChange,
    onQuestionTypeChange,
    onPageChange,
    onToggleSelectAll,
    onToggleQuestion,
    allowedQuestionType,
}: QuestionsPanelProps) {
    const importableQuestionRecords = useMemo(
        () => questionRecords.filter((question) => !alreadyAddedIdSet.has(question.id)),
        [questionRecords, alreadyAddedIdSet],
    );

    const allFilteredSelected = useMemo(
        () =>
            importableQuestionRecords.length > 0 &&
            importableQuestionRecords.every((question) => {
                const isCompatible = !allowedQuestionType || question.type === allowedQuestionType;
                return !isCompatible || selectedIdSet.has(question.id);
            }),
        [importableQuestionRecords, selectedIdSet, allowedQuestionType],
    );

    const facets = useMemo(() => {
        const countsMap = new Map(typeCounts.map((tc) => [tc.type, tc.count]));
        const mapped = questionTypes.map((qt) => ({
            value: qt.value,
            label: qt.label,
            count: countsMap.get(qt.value) ?? 0,
        }));

        // Filter out types with count of 0, but always keep the currently selected question type in the list (even if its count is 0) so the filter doesn't disappear.
        return mapped.filter((facet) => facet.count > 0 || selectedQuestionType === facet.value);
    }, [questionTypes, typeCounts, selectedQuestionType]);

    const totalFacetCount = useMemo(() => {
        return typeCounts.reduce((acc, tc) => acc + tc.count, 0);
    }, [typeCounts]);

    const activeFacetLabel = useMemo(() => {
        if (selectedQuestionType === 'all') return 'All';
        return (
            questionTypes.find((qt) => qt.value === selectedQuestionType)?.label ??
            selectedQuestionType
        );
    }, [selectedQuestionType, questionTypes]);

    const activeFacetCount = useMemo(() => {
        if (selectedQuestionType === 'all') return totalFacetCount;
        return typeCounts.find((tc) => tc.type === selectedQuestionType)?.count ?? 0;
    }, [selectedQuestionType, totalFacetCount, typeCounts]);

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        const container = event.currentTarget;
        const isNearBottom =
            container.scrollHeight - container.scrollTop - container.clientHeight <= 30;

        if (
            isNearBottom &&
            !isQuestionsLoading &&
            !isFetchingMoreQuestions &&
            currentPage < totalPages
        ) {
            onPageChange(currentPage + 1);
        }
    };

    return (
        <div className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="bg-background flex flex-col gap-3 border-b px-4 py-4">
                <div className="text-muted-foreground flex items-center gap-2 text-xs lg:hidden">
                    <Library className="h-3.5 w-3.5" />
                    <span className="truncate">
                        {selectedCollection ? selectedCollection.name : 'All Questions'}
                    </span>
                </div>

                <div className="flex flex-row items-center gap-3">
                    <div className="group relative flex-1">
                        <Search className="group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors" />
                        <Input
                            placeholder="Search by topic, tags, or question content..."
                            className="bg-background h-9 rounded-lg border-zinc-200 pl-10 text-sm shadow-none"
                            value={searchQuery}
                            onChange={(event) => onSearchChange(event.target.value)}
                        />
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                        {allowedQuestionType && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 select-none">
                                Section locked to:
                            </span>
                        )}
                        {isQuestionTypesLoading || isTypeCountsLoading ? (
                            <p className="text-muted-foreground py-2 text-xs">Loading...</p>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        disabled={Boolean(allowedQuestionType)}
                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/80 disabled:opacity-80 disabled:cursor-not-allowed disabled:bg-zinc-50"
                                    >
                                        <span>Type: {activeFacetLabel}</span>{' '}
                                        <span className="rounded-full bg-zinc-100 px-1.5 py-0.25 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                            {activeFacetCount}
                                        </span>
                                        {!allowedQuestionType && (
                                            <ChevronDown className="ml-0.5 h-3.5 w-3.5 opacity-60" />
                                        )}
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="max-h-[280px] w-52 overflow-y-auto"
                                >
                                    {selectedQuestionType !== 'all' && (
                                        <DropdownMenuItem
                                            className="flex cursor-pointer items-center justify-between text-xs"
                                            onClick={() => onQuestionTypeChange('all')}
                                        >
                                            <span>All Types</span>
                                            <span className="text-muted-foreground rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold dark:bg-zinc-800">
                                                {totalFacetCount}
                                            </span>
                                        </DropdownMenuItem>
                                    )}
                                    {facets.map((facet) => {
                                        if (facet.value === selectedQuestionType) return null;
                                        return (
                                            <DropdownMenuItem
                                                key={facet.value}
                                                className="flex cursor-pointer items-center justify-between text-xs"
                                                onClick={() => onQuestionTypeChange(facet.value)}
                                            >
                                                <span>{facet.label}</span>
                                                <span className="text-muted-foreground rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold dark:bg-zinc-800">
                                                    {facet.count}
                                                </span>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between px-1">
                    <span className="text-muted-foreground text-xs font-medium">
                        Available questions
                    </span>
                    {importableQuestionRecords.length > 0 ? (
                        <div
                            role="button"
                            tabIndex={0}
                            className="text-muted-foreground hover:text-foreground flex h-auto cursor-pointer items-center gap-2 px-0 py-0 text-xs transition-colors"
                            onClick={onToggleSelectAll}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onToggleSelectAll();
                                }
                            }}
                        >
                            <Checkbox
                                checked={allFilteredSelected}
                                className="pointer-events-none h-4 w-4 rounded-md"
                            />
                            <span>Select Page</span>
                        </div>
                    ) : null}
                </div>
            </div>

            <div
                ref={questionsScrollContainerRef}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                onScroll={handleScroll}
            >
                <div className="space-y-2 px-4 py-1.5">
                    {isQuestionsLoading || isSelectedCollectionLoading ? (
                        <QuestionPanelEmptyState
                            title="Loading questions"
                            description={
                                selectedCollection
                                    ? `Loading questions from ${selectedCollection.name}...`
                                    : 'Fetching your question bank...'
                            }
                            isLoading={true}
                        />
                    ) : questionRecords.length === 0 ? (
                        <QuestionPanelEmptyState
                            title="No questions found"
                            description="Adjust your criteria or try a different collection."
                            icon={<Search className="text-muted-foreground h-8 w-8" />}
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {questionRecords.map((question) => (
                                <QuestionRow
                                    key={question.id}
                                    question={question}
                                    selected={
                                        selectedIdSet.has(question.id) ||
                                        alreadyAddedIdSet.has(question.id)
                                    }
                                    isAlreadyAdded={alreadyAddedIdSet.has(question.id)}
                                    disabled={
                                        Boolean(allowedQuestionType) &&
                                        question.type !== allowedQuestionType
                                    }
                                    onToggle={() => onToggleQuestion(question.id)}
                                />
                            ))}

                            {isFetchingMoreQuestions && (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="shrink-0 border-t bg-zinc-50/50 px-4 py-3 text-right dark:bg-zinc-950/20">
                <p className="text-muted-foreground text-xs">
                    Showing{' '}
                    <span className="text-foreground font-semibold">{questionRecords.length}</span>{' '}
                    of <span className="text-foreground font-semibold">{totalQuestionCount}</span>{' '}
                    question{totalQuestionCount !== 1 ? 's' : ''}
                </p>
            </div>
        </div>
    );
}
