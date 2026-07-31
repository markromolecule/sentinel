'use client';

import * as React from 'react';
import { Button, Collapsible, CollapsibleContent, Textarea, cn } from '@sentinel/ui';
import { ChevronDown, Database, GripVertical, Plus, PencilLine, Trash2 } from 'lucide-react';
import type { ExamQuestionSection, QuestionType } from '@sentinel/shared/types';

type QuestionSectionCardProps = {
    section: ExamQuestionSection;
    questionCount: number;
    totalPoints: number;
    isSectionDragging: boolean;
    isSectionDropTarget: boolean;
    onSectionDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
    onSectionDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
    onSectionDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
    onSectionDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    onSectionDragEnd: () => void;
    onSectionTitleChange?: (title: string) => void;
    onSectionDescriptionChange?: (description: string) => void;
    onDeleteSection?: () => void;
    onToggleCollapse: () => void;
    onImportQuestions: () => void;
    onAddQuestion: () => void;
    children?: React.ReactNode;
    // New props for typed sections
    questionTypes?: Array<{ value: QuestionType; label: string; instruction: string }>;
    canChangeQuestionType?: boolean;
    onSectionQuestionTypeChange?: (type: QuestionType | null) => void;
};

export function QuestionSectionCard({
    section,
    questionCount,
    totalPoints,
    isSectionDragging,
    isSectionDropTarget,
    onSectionDragStart,
    onSectionDragEnter,
    onSectionDragOver,
    onSectionDrop,
    onSectionDragEnd,
    onSectionTitleChange,
    onSectionDescriptionChange,
    onDeleteSection,
    onToggleCollapse,
    onImportQuestions,
    onAddQuestion,
    children,
    questionTypes = [],
    canChangeQuestionType = true,
    onSectionQuestionTypeChange,
}: QuestionSectionCardProps) {
    const isOpen = !section.isCollapsed;
    const isTyped = Boolean(section.questionType);
    const hasInstruction = Boolean(section.description?.trim());
    const [isInstructionEditorOpen, setIsInstructionEditorOpen] = React.useState(false);

    return (
        <Collapsible open={isOpen}>
            <div
                className={cn(
                    'border-border/60 bg-background overflow-hidden rounded-xl border shadow-sm transition-colors',
                    isSectionDragging && 'opacity-70',
                    isSectionDropTarget && 'border-foreground/20 bg-muted/30',
                )}
                onDragEnterCapture={onSectionDragEnter}
                onDragOverCapture={onSectionDragOver}
                onDropCapture={onSectionDrop}
            >
                {/* Header Row */}
                <div className="bg-muted/10 flex flex-col gap-1 border-b px-3 py-2">
                    <div className="flex items-center justify-between">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            {/* Drag Grip */}
                            <button
                                type="button"
                                draggable
                                onDragStart={onSectionDragStart}
                                onDragEnd={onSectionDragEnd}
                                className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 active:cursor-grabbing"
                                aria-label={`Reorder ${section.title}`}
                                title="Drag to reorder section"
                            >
                                <GripVertical className="h-4 w-4" />
                            </button>

                            {/* Collapse Arrow */}
                            <button
                                type="button"
                                onClick={onToggleCollapse}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                                aria-label={
                                    isOpen ? `Collapse ${section.title}` : `Expand ${section.title}`
                                }
                            >
                                <ChevronDown
                                    className={cn(
                                        'h-4 w-4 transition-transform',
                                        !isOpen && '-rotate-90',
                                    )}
                                />
                            </button>

                            {/* Title area & type selection & Stats */}
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                                {isTyped ? (
                                    <span className="text-sm font-semibold text-zinc-900 select-none">
                                        {section.title}
                                    </span>
                                ) : (
                                    <input
                                        aria-label={`${section.title} title`}
                                        value={section.title}
                                        onChange={(event) =>
                                            onSectionTitleChange?.(event.target.value)
                                        }
                                        className="focus:bg-background max-w-[240px] min-w-[120px] truncate rounded-md border-transparent bg-transparent px-1.5 py-0.5 text-sm font-semibold shadow-none transition hover:bg-zinc-100/50 focus:border-zinc-200 focus:ring-0 focus:outline-none"
                                    />
                                )}

                                {/* Question Type Selection Dropdown */}
                                <div className="flex items-center gap-1.5">
                                    <select
                                        aria-label="Section question type"
                                        role="combobox"
                                        value={section.questionType || ''}
                                        disabled={!canChangeQuestionType}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            onSectionQuestionTypeChange?.(
                                                val === '' ? null : (val as QuestionType),
                                            );
                                        }}
                                        className="focus:bg-background rounded-md border border-zinc-200 bg-transparent px-2 py-0.5 text-xs shadow-none focus:outline-none disabled:bg-zinc-50 disabled:text-zinc-400"
                                    >
                                        <option value="">Select question type</option>
                                        {questionTypes.map((t) => (
                                            <option key={t.value} value={t.value}>
                                                {t.label}
                                            </option>
                                        ))}
                                    </select>
                                    {!canChangeQuestionType && (
                                        <span className="text-[10px] text-zinc-400 select-none">
                                            Remove all questions to change type
                                        </span>
                                    )}
                                </div>

                                <span className="shrink-0 text-xs font-normal text-zinc-400 select-none">
                                    {questionCount} question{questionCount === 1 ? '' : 's'} ·{' '}
                                    {totalPoints} pt{totalPoints === 1 ? '' : 's'}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 pl-4">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onImportQuestions}
                                className="bg-background h-8 gap-1.5 rounded-md border-zinc-200 px-3 text-xs text-zinc-700 shadow-none hover:bg-zinc-50"
                            >
                                <Database className="h-3.5 w-3.5" />
                                Import from Bank
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                onClick={onAddQuestion}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 gap-1.5 rounded-md px-3 text-xs shadow-none"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Question
                            </Button>

                            {/* Pencil to Edit Instructions (only for legacy mixed sections) */}
                            {!isTyped && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsInstructionEditorOpen((curr) => !curr)}
                                    className={cn(
                                        'h-8 w-8 rounded-md text-zinc-400 hover:text-zinc-600',
                                        isInstructionEditorOpen &&
                                            'text-primary bg-primary/5 hover:text-primary hover:bg-primary/10',
                                    )}
                                    title={hasInstruction ? 'Edit Instruction' : 'Add Instruction'}
                                >
                                    <PencilLine className="h-4 w-4" />
                                </Button>
                            )}

                            {/* Delete Section */}
                            {onDeleteSection ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={onDeleteSection}
                                    className="hover:text-destructive hover:bg-destructive/5 h-8 w-8 rounded-md text-zinc-400 transition"
                                    title="Delete Section"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            ) : null}
                        </div>
                    </div>

                    {/* Inline Static Instructions (read-only for typed, fallback editable/toggleable for untyped) */}
                    {isTyped ? (
                        hasInstruction && (
                            <div className="pr-4 pb-1.5 pl-[76px]">
                                <p className="text-xs text-zinc-500 italic select-none">
                                    {section.description}
                                </p>
                            </div>
                        )
                    ) : (
                        <>
                            {hasInstruction && !isInstructionEditorOpen && (
                                <div className="pr-4 pb-1.5 pl-[76px]">
                                    <p className="line-clamp-2 text-xs text-zinc-500 italic">
                                        {section.description}
                                    </p>
                                </div>
                            )}

                            {isInstructionEditorOpen && (
                                <div className="pt-1 pr-4 pb-2.5 pl-[76px]">
                                    <Textarea
                                        aria-label={`${section.title} instructions`}
                                        value={section.description ?? ''}
                                        onChange={(event) =>
                                            onSectionDescriptionChange?.(event.target.value)
                                        }
                                        placeholder="Section instruction (optional)"
                                        className="bg-background focus-visible:ring-primary min-h-16 resize-y rounded-md border-zinc-200 text-xs shadow-none focus-visible:ring-1"
                                    />
                                    <p className="mt-1 text-[10px] text-zinc-400">
                                        Plain text only. Keep instructions clear and concise.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <div className="px-0 py-0">{children}</div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}
