'use client';

import { Input, Label } from '@sentinel/ui';
import type { ExamQuestionContent } from '@sentinel/shared/types';
import { Info } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface EssayFormProps {
    content: ExamQuestionContent;
    onChange: (content: ExamQuestionContent) => void;
}

export function EssayForm({ content, onChange }: EssayFormProps) {
    const params = useParams();
    const examId = params.id as string;

    return (
        <div className="border-border/60 space-y-4 border-t pt-6">
            <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/25">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="text-sm">
                    <p className="font-semibold text-blue-950 dark:text-blue-200">
                        Standardized Rubric Applied
                    </p>
                    <p className="mt-1 text-blue-800/80 dark:text-blue-300/80">
                        This essay question is evaluated using the exam's custom essay grading
                        rubric.{' '}
                        <Link
                            href={examId ? `/guides/rubric?examId=${examId}` : '/guides/rubric'}
                            className="font-semibold text-blue-600 underline hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                            View or customize grading criteria weights & descriptions
                        </Link>
                        .
                    </p>
                </div>
            </div>

            <div className="grid max-w-[200px] gap-3">
                <Label className="text-sm font-medium">Max Length</Label>
                <Input
                    type="number"
                    value={content.maxLength ?? 1000}
                    onChange={(e) =>
                        onChange({
                            ...content,
                            maxLength: Number(e.target.value) || 0,
                        })
                    }
                    className="h-9"
                />
            </div>
        </div>
    );
}
