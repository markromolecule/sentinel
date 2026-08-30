'use client';

import type { ExamQuestionSection } from '@sentinel/shared/types';
import type { QuestionBucketTableProps } from '../_types';
import { QuestionSectionCard } from './question-section-card';
import { QuestionRowsTable } from './question-rows-table';
import { SectionedQuestionBucketToolbar } from './question-bucket-toolbar';
import { EmptySectionState, QuestionBucketEmptyState } from './shared';
import { useQuestionDragAndDrop } from './_hooks/use-question-dnd';
import { useSectionDragAndDrop } from './_hooks/use-section-dnd';
import { useSectionedQuestionBucketMetrics } from './_hooks/use-sectioned-question-bucket-metrics';

export function SectionedQuestionBucketTable({
    sections,
    questions,
    onEdit,
    onDelete,
    onAddToBank,
    onReorderInSection,
    onReorderSections,
    onAdd,
    onAddSection,
    onImport,
    onUpdateSection,
    onDeleteSection,
    onToggleSectionCollapse,
    questionTypes = [],
}: QuestionBucketTableProps & { sections: ExamQuestionSection[] }) {
    const { totalPoints, sectionViewModels } = useSectionedQuestionBucketMetrics(
        sections,
        questions,
    );
    const {
        resetSectionDragState,
        handleSectionDragStart,
        handleSectionDragEnter,
        handleSectionDragOver,
        handleSectionDrop,
        getSectionDragState,
    } = useSectionDragAndDrop(onReorderSections);
    const {
        resetQuestionDragState,
        handleQuestionDragStart,
        handleQuestionDragOver,
        handleQuestionDrop,
        getQuestionDragState,
    } = useQuestionDragAndDrop(onReorderInSection);

    if (questions.length === 0) {
        return (
            <div className="w-full space-y-4">
                <SectionedQuestionBucketToolbar
                    questionCount={0}
                    totalPoints={0}
                    onAddSection={onAddSection}
                />

                {sections.length === 0 ? (
                    <QuestionBucketEmptyState
                        onImport={() => onImport()}
                        onAddQuestion={() => onAdd()}
                    />
                ) : (
                    <div className="grid gap-4">
                        {sectionViewModels.map(({ section, sectionIndex }) => {
                            const sectionDragState = getSectionDragState(sectionIndex);

                            return (
                                <QuestionSectionCard
                                    key={section.id}
                                    section={section}
                                    questionCount={0}
                                    totalPoints={0}
                                    isSectionDragging={sectionDragState.isSectionDragging}
                                    isSectionDropTarget={sectionDragState.isSectionDropTarget}
                                    onSectionDragStart={handleSectionDragStart(sectionIndex)}
                                    onSectionDragEnter={handleSectionDragEnter(sectionIndex)}
                                    onSectionDragOver={handleSectionDragOver(sectionIndex)}
                                    onSectionDrop={handleSectionDrop(sectionIndex)}
                                    onSectionDragEnd={resetSectionDragState}
                                    onSectionTitleChange={(title) =>
                                        onUpdateSection?.(section.id, { title })
                                    }
                                    onSectionDescriptionChange={(description) =>
                                        onUpdateSection?.(section.id, { description })
                                    }
                                    onDeleteSection={
                                        sections.length > 1
                                            ? () => onDeleteSection?.(section.id)
                                            : undefined
                                    }
                                    onToggleCollapse={() => onToggleSectionCollapse?.(section.id)}
                                    onImportQuestions={() => onImport(section.id)}
                                    onAddQuestion={() => onAdd(section.id)}
                                    questionTypes={questionTypes}
                                    canChangeQuestionType={true}
                                    onSectionQuestionTypeChange={(type) =>
                                        onUpdateSection?.(section.id, { questionType: type })
                                    }
                                >
                                    <EmptySectionState
                                        isTyped={Boolean(section.questionType)}
                                        onImportQuestions={() => onImport(section.id)}
                                        onAddQuestion={() => onAdd(section.id)}
                                    />
                                </QuestionSectionCard>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full space-y-4">
            <SectionedQuestionBucketToolbar
                questionCount={questions.length}
                totalPoints={totalPoints}
                onAddSection={onAddSection}
            />

            <div className="grid gap-4">
                {sectionViewModels.map((sectionViewModel) => {
                    const {
                        section,
                        sectionIndex,
                        questions: sectionQuestions,
                        totalPoints: sectionPoints,
                        questionNumberOffset,
                    } = sectionViewModel;
                    const sectionDragState = getSectionDragState(sectionIndex);
                    const questionDragState = getQuestionDragState(section.id);

                    return (
                        <QuestionSectionCard
                            key={section.id}
                            section={section}
                            questionCount={sectionQuestions.length}
                            totalPoints={sectionPoints}
                            isSectionDragging={sectionDragState.isSectionDragging}
                            isSectionDropTarget={sectionDragState.isSectionDropTarget}
                            onSectionDragStart={handleSectionDragStart(sectionIndex)}
                            onSectionDragEnter={handleSectionDragEnter(sectionIndex)}
                            onSectionDragOver={handleSectionDragOver(sectionIndex)}
                            onSectionDrop={handleSectionDrop(sectionIndex)}
                            onSectionDragEnd={resetSectionDragState}
                            onSectionTitleChange={(title) =>
                                onUpdateSection?.(section.id, { title })
                            }
                            onSectionDescriptionChange={(description) =>
                                onUpdateSection?.(section.id, { description })
                            }
                            onDeleteSection={
                                sections.length > 1
                                    ? () => onDeleteSection?.(section.id)
                                    : undefined
                            }
                            onToggleCollapse={() => onToggleSectionCollapse?.(section.id)}
                            onImportQuestions={() => onImport(section.id)}
                            onAddQuestion={() => onAdd(section.id)}
                            questionTypes={questionTypes}
                            canChangeQuestionType={sectionQuestions.length === 0}
                            onSectionQuestionTypeChange={(type) =>
                                onUpdateSection?.(section.id, { questionType: type })
                            }
                        >
                            {sectionQuestions.length === 0 ? (
                                <EmptySectionState
                                    isTyped={Boolean(section.questionType)}
                                    onImportQuestions={() => onImport(section.id)}
                                    onAddQuestion={() => onAdd(section.id)}
                                />
                            ) : (
                                <QuestionRowsTable
                                    questions={sectionQuestions}
                                    questionNumberOffset={questionNumberOffset}
                                    footerLabel="Totals"
                                    footerPoints={sectionPoints}
                                    draggedIndex={questionDragState.draggedIndex}
                                    dropTargetIndex={questionDragState.dropTargetIndex}
                                    onDragStart={(index) =>
                                        handleQuestionDragStart(section.id, index)
                                    }
                                    onDragEnd={resetQuestionDragState}
                                    onDragOver={(index) =>
                                        handleQuestionDragOver(section.id, index)
                                    }
                                    onDrop={(index) => handleQuestionDrop(section.id, index)}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onAddToBank={onAddToBank}
                                />
                            )}
                        </QuestionSectionCard>
                    );
                })}
            </div>
        </div>
    );
}
