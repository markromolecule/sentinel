'use client';

import { useState } from 'react';
import type { ProctorExam, ExamQuestion } from '@sentinel/shared/types';
import {
    Button,
    Separator,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Label,
} from '@sentinel/ui';
import { ArrowLeft, Printer } from 'lucide-react';
import Link from 'next/link';
import {
    buildExamExportSections,
    buildMatchingChoices,
    getExamTotalPoints,
    getExpectedAnswerCount,
} from './exam-export-utils';
import { renderPassage } from '@sentinel/shared';

type PaperSize = 'A4' | 'LETTER' | 'LEGAL';

const PAPER_SIZES: Record<PaperSize, { label: string; width: string; height: string }> = {
    A4: { label: 'A4 (8.27" x 11.69")', width: '210mm', height: '297mm' },
    LETTER: { label: 'Letter (8.5" x 11")', width: '8.5in', height: '11in' },
    LEGAL: { label: 'Legal (8.5" x 14")', width: '8.5in', height: '14in' },
};

type ExamPrintExportProps = {
    exam: ProctorExam;
};

function formatDate(value?: string | Date | null) {
    if (!value) {
        return 'Not set';
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        return 'Not set';
    }

    return parsed.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function renderAnswerLines(count = 1, showNumbers = true) {
    return (
        <div className="mt-4 space-y-3">
            {Array.from({ length: count }, (_, index) => (
                <div key={index} className="flex items-end gap-2 text-sm">
                    {showNumbers && (
                        <span className="text-muted-foreground w-6 shrink-0">{index + 1}.</span>
                    )}
                    <div className="h-7 flex-1 border-b border-zinc-400" />
                </div>
            ))}
        </div>
    );
}

function QuestionOptions({ question }: { question: ExamQuestion }) {
    const options = question.content.options ?? [];

    if (question.type === 'TRUE_FALSE') {
        return (
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-md border border-zinc-300 px-3 py-2">A. True</div>
                <div className="rounded-md border border-zinc-300 px-3 py-2">B. False</div>
            </div>
        );
    }

    if (!options.length) {
        return renderAnswerLines();
    }

    return (
        <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {options.map((option, index) => (
                <li
                    key={`${option}-${index}`}
                    className="rounded-md border border-zinc-300 px-3 py-2"
                >
                    {String.fromCharCode(65 + index)}. {option}
                </li>
            ))}
        </ol>
    );
}

function MatchingQuestion({ question }: { question: ExamQuestion }) {
    const pairs = question.content.pairs ?? [];
    const choices = buildMatchingChoices(question);

    return (
        <div className="mt-4 grid gap-5 text-sm sm:grid-cols-2">
            <div>
                <p className="mb-2 font-semibold">Column A</p>
                <ol className="space-y-2">
                    {pairs.map((pair, index) => (
                        <li key={`${pair.left}-${index}`} className="flex gap-2">
                            <span className="w-8 shrink-0 border-b border-zinc-400 text-center" />
                            <span>
                                {index + 1}. {pair.left}
                            </span>
                        </li>
                    ))}
                </ol>
            </div>
            <div>
                <p className="mb-2 font-semibold">Column B</p>
                <ol className="space-y-2">
                    {choices.map((choice, index) => (
                        <li key={`${choice}-${index}`}>
                            {String.fromCharCode(65 + index)}. {choice}
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}

function QuestionResponseArea({ question }: { question: ExamQuestion }) {
    switch (question.type) {
        case 'MULTIPLE_CHOICE':
        case 'MULTIPLE_RESPONSE':
        case 'TRUE_FALSE':
            return <QuestionOptions question={question} />;
        case 'MATCHING':
            return <MatchingQuestion question={question} />;
        case 'ESSAY':
            return renderAnswerLines(8, false);
        case 'ENUMERATION':
        case 'FILL_BLANK':
            return renderAnswerLines(getExpectedAnswerCount(question));
        case 'IDENTIFICATION':
        default:
            return renderAnswerLines();
    }
}

function QuestionPassage({ question }: { question: ExamQuestion }) {
    const renderedPassage = renderPassage({
        sourceEvidence: question.sourceEvidence,
        passageContent: question.passageContent,
        passageType: question.passageType,
        fallbackToSourceEvidence: false,
    });

    if (!renderedPassage) {
        return null;
    }

    return (
        <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-relaxed text-zinc-700">
            <div dangerouslySetInnerHTML={{ __html: renderedPassage.html }} />
        </div>
    );
}

export function ExamPrintExport({ exam }: ExamPrintExportProps) {
    const [paperSize, setPaperSize] = useState<PaperSize>('A4');
    const sections = buildExamExportSections(exam);
    const totalPoints = getExamTotalPoints(exam);
    const questionCount = exam.questions?.length ?? exam.questionCount ?? 0;

    let globalQuestionIndex = 0;

    return (
        <div className="min-h-screen bg-zinc-100 text-zinc-950 print:bg-white">
            <style>{`
                @page { 
                    margin: 0.6in;
                    size: ${PAPER_SIZES[paperSize].width} ${PAPER_SIZES[paperSize].height};
                }
                @media print {
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    .print-sheet { box-shadow: none !important; max-width: none !important; padding: 0 !important; }
                    .print-break-inside-avoid { 
                        break-inside: avoid; 
                        page-break-inside: avoid; 
                    }
                }
            `}</style>

            <div className="no-print sticky top-0 z-10 border-b bg-white/95 px-4 py-3 backdrop-blur">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" asChild>
                            <Link href="/exams/dashboard">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Link>
                        </Button>
                        <div className="h-8 w-px bg-zinc-200" />
                        <div className="flex items-center gap-2">
                            <Label htmlFor="paper-size" className="text-xs font-semibold uppercase">
                                Paper Size
                            </Label>
                            <Select
                                value={paperSize}
                                onValueChange={(val) => setPaperSize(val as PaperSize)}
                            >
                                <SelectTrigger id="paper-size" className="h-9 w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(PAPER_SIZES).map(([key, { label }]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print / Save PDF
                    </Button>
                </div>
            </div>

            <main className="print-sheet mx-auto my-6 max-w-5xl bg-white px-10 py-10 shadow-sm print:my-0">
                <header className="space-y-6">
                    <div className="text-center">
                        <p className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
                            Sentinel Examination Copy
                        </p>
                        <h1 className="mt-2 text-2xl font-bold">{exam.title}</h1>
                        <p className="mt-1 text-sm text-zinc-600">
                            {exam.subject || 'No subject assigned'}
                            {exam.section ? ` • ${exam.section}` : ''}
                        </p>
                    </div>

                    <div className="grid gap-3 border-y border-zinc-300 py-4 text-sm sm:grid-cols-4">
                        <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase">
                                Duration
                            </p>
                            <p>{exam.duration} minutes</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase">Date</p>
                            <p>{formatDate(exam.scheduledDate)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase">Items</p>
                            <p>{questionCount}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-zinc-500 uppercase">Points</p>
                            <p>{totalPoints || 'Not set'}</p>
                        </div>
                    </div>

                    <div className="grid gap-4 text-sm sm:grid-cols-3">
                        <label>
                            Student Name
                            <span className="mt-3 block border-b border-zinc-400" />
                        </label>
                        <label>
                            Student ID
                            <span className="mt-3 block border-b border-zinc-400" />
                        </label>
                        <label>
                            Date
                            <span className="mt-3 block border-b border-zinc-400" />
                        </label>
                    </div>
                </header>

                <Separator className="my-8" />

                {sections.length ? (
                    <div className="space-y-12">
                        {sections.map((section) => (
                            <section key={section.id} className="space-y-6">
                                <div className="space-y-2">
                                    <h2 className="border-b border-zinc-300 pb-2 text-lg font-bold">
                                        {section.title}
                                    </h2>
                                    {section.description && (
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-600 italic">
                                            {section.description}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-8">
                                    {section.questions.map((question) => {
                                        globalQuestionIndex++;
                                        return (
                                            <article
                                                key={question.id}
                                                className="print-break-inside-avoid"
                                            >
                                                <div className="flex gap-4">
                                                    <span className="w-6 shrink-0 text-right font-semibold">
                                                        {globalQuestionIndex}.
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                                            <p className="text-[15px] leading-relaxed font-medium whitespace-pre-wrap">
                                                                {question.content.prompt}
                                                            </p>
                                                            <span className="text-xs font-semibold text-zinc-500 print:text-zinc-400">
                                                                [{question.points} pt
                                                                {question.points === 1 ? '' : 's'}]
                                                            </span>
                                                        </div>
                                                        <QuestionPassage question={question} />
                                                        <QuestionResponseArea question={question} />
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-md border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500">
                        This exam has no questions to export yet.
                    </div>
                )}
            </main>
        </div>
    );
}
