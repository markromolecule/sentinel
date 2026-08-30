'use client';

import { Button } from '@sentinel/ui';
import { Database, FileText, Plus } from 'lucide-react';
import type { ExamQuestion, ExamQuestionSection } from '@sentinel/shared/types';

export const SECTION_DND_MIME_TYPE = 'application/x-sentinel-question-section';
export const QUESTION_DND_MIME_TYPE = 'application/x-sentinel-question-row';

export function hasDragType(dataTransfer: DataTransfer, mimeType: string) {
    return Array.from(dataTransfer.types ?? []).includes(mimeType);
}

export function getTotalPoints(questions: ExamQuestion[]) {
    return questions.reduce((sum, question) => sum + (question.points || 0), 0);
}

export function groupQuestionsBySection(
    sections: ExamQuestionSection[],
    questions: ExamQuestion[],
) {
    const groupedQuestions = new Map<string, ExamQuestion[]>(
        sections.map((section) => [section.id, []]),
    );

    questions.forEach((question) => {
        const sectionId = question.sectionId || sections[0]?.id;
        if (!sectionId) {
            return;
        }

        if (!groupedQuestions.has(sectionId)) {
            groupedQuestions.set(sectionId, []);
        }

        groupedQuestions.get(sectionId)?.push(question);
    });

    return groupedQuestions;
}

export function QuestionBucketEmptyState({
    onImport,
    onAddQuestion,
}: {
    onImport: () => void;
    onAddQuestion: () => void;
}) {
    return (
        <div className="border-border/60 w-full rounded-xl border border-dashed px-6 py-14">
            <div className="flex flex-col items-center justify-center gap-4">
                <div className="bg-muted/50 flex h-11 w-11 items-center justify-center rounded-full">
                    <FileText className="text-muted-foreground h-5 w-5" />
                </div>
                <div className="space-y-1 text-center">
                    <h3 className="text-base font-medium">No questions yet</h3>
                    <p className="text-muted-foreground max-w-sm text-sm">
                        Add your first question to build the exam.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={onImport} className="gap-2">
                        <Database className="h-4 w-4" />
                        Import from Bank
                    </Button>
                    <Button onClick={onAddQuestion} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Question
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function EmptySectionState({
    onAddQuestion,
    onImportQuestions,
    isTyped = true,
}: {
    onAddQuestion?: () => void;
    onImportQuestions?: () => void;
    isTyped?: boolean;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <div className="bg-muted/50 flex h-11 w-11 items-center justify-center rounded-full">
                <FileText className="text-muted-foreground h-5 w-5" />
            </div>
            <div className="space-y-1">
                <h4 className="text-sm font-semibold">
                    {isTyped
                        ? 'No questions in this section yet'
                        : 'Select a question type to begin'}
                </h4>
                <p className="text-muted-foreground text-sm">
                    {isTyped
                        ? 'Add or import questions here to keep the exam organized and easier to manage.'
                        : 'Choose a question type from the dropdown on the right to start adding questions to this section.'}
                </p>
            </div>
            {isTyped && (
                <div className="flex flex-wrap justify-center gap-2">
                    {onImportQuestions && (
                        <Button variant="outline" onClick={onImportQuestions} className="gap-2">
                            <Database className="h-4 w-4" />
                            Import from Bank
                        </Button>
                    )}
                    {onAddQuestion && (
                        <Button onClick={onAddQuestion} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add First Question
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
