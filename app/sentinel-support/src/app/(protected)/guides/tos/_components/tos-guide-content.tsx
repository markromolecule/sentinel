'use client';

import * as React from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
    PageHeader,
    Separator,
    cn,
} from '@sentinel/ui';
import { BookOpen, Layers, Brain, BarChart3, AlertCircle, HelpCircle } from 'lucide-react';
import { BLOOM_LEVELS, BLOOM_LEVEL_LABELS } from '../_constants';
import type { BloomLevel } from '@sentinel/services';

/**
 * TosGuideContent renders a comprehensive guide explaining the Table of Specifications (TOS)
 * including Bloom's cognitive taxonomy, weight calculations, and difficulty levels.
 *
 * @returns React JSX element rendering the TOS guide content.
 */
export function TosGuideContent() {
    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Table of Specifications (TOS) Guide"
                description="Learn how the system maps questions to topics, determines cognitive levels, and calculates topic weightage."
            />

            <Separator />

            {/* Introductory Section */}
            <div className="bg-muted/30 rounded-xl border p-6">
                <div className="flex items-start gap-4">
                    <div className="mt-0.5 shrink-0 rounded-lg bg-[#323d8f]/10 p-2.5 text-[#323d8f] dark:bg-blue-900/30 dark:text-blue-400">
                        <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold tracking-tight">
                            Understanding the TOS Matrix
                        </h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            A Table of Specifications (TOS) is a blueprint aligning exams with
                            learning objectives by mapping questions across topics and cognitive
                            depths. This guide explains how the system automates topic weightage,
                            Bloom&apos;s cognitive classification, and overall difficulty settings.
                        </p>
                    </div>
                </div>
            </div>

            {/* Detailed Accordion Sections */}
            <Accordion type="single" collapsible className="w-full space-y-4">
                {/* 1. What is a Table of Specifications? */}
                <AccordionItem value="what-is-tos" className="rounded-lg border px-4">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                <Layers className="h-5 w-5" />
                            </div>
                            <span className="text-lg font-semibold">
                                1. Core Concepts & Purpose
                            </span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-3 pt-4 pb-6">
                        <p>
                            The Table of Specifications (TOS) serves as a validation tool to ensure
                            content validity. It helps instructors achieve several key goals:
                        </p>
                        <ul className="ml-5 list-disc space-y-2">
                            <li>
                                <strong>Alignment:</strong> Verifies that the exam mirrors the
                                distribution of class time and educational emphasis.
                            </li>
                            <li>
                                <strong>Balance:</strong> Ensures a mix of lower-order and
                                higher-order thinking skills, avoiding over-reliance on rote memory.
                            </li>
                            <li>
                                <strong>Clarity:</strong> Provides students and administrators with
                                clear documentation of the exam structure and scope.
                            </li>
                        </ul>
                    </AccordionContent>
                </AccordionItem>

                {/* 2. Bloom's Taxonomy & Cognitive Levels */}
                <AccordionItem value="blooms-taxonomy" className="rounded-lg border px-4">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                                <Brain className="h-5 w-5" />
                            </div>
                            <span className="text-lg font-semibold">
                                2. Bloom&apos;s Cognitive Levels
                            </span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4 pt-4 pb-6">
                        <p className="text-sm">
                            Each question is mapped to one of the six levels of Bloom&apos;s Revised
                            Taxonomy, divided into lower-order thinking skills (LOTS) and
                            higher-order thinking skills (HOTS):
                        </p>

                        <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2 md:grid-cols-3">
                            {BLOOM_LEVELS.map((level) => {
                                const isHots = ['ANALYZING', 'EVALUATING', 'CREATING'].includes(
                                    level,
                                );

                                // Map level to subtle left border colors
                                const borderColors: Record<string, string> = {
                                    REMEMBERING: 'border-l-blue-500',
                                    UNDERSTANDING: 'border-l-indigo-500',
                                    APPLYING: 'border-l-emerald-500',
                                    ANALYZING: 'border-l-amber-500',
                                    EVALUATING: 'border-l-orange-500',
                                    CREATING: 'border-l-rose-500',
                                };

                                return (
                                    <div
                                        key={level}
                                        className={cn(
                                            'space-y-1.5 border-l-2 py-1 pl-3',
                                            borderColors[level] || 'border-l-muted',
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-foreground text-sm font-semibold">
                                                {BLOOM_LEVEL_LABELS[level as BloomLevel]}
                                            </span>
                                            <span className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.25 text-[9px] font-medium select-none">
                                                {isHots ? 'HOTS' : 'LOTS'}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground text-xs leading-relaxed">
                                            {getDescriptionForLevel(level)}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* 3. Topic Weightage */}
                <AccordionItem value="topic-weightage" className="rounded-lg border px-4">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                <BarChart3 className="h-5 w-5" />
                            </div>
                            <span className="text-lg font-semibold">
                                3. Calculating Topic Weightage
                            </span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4 pt-4 pb-6">
                        <p className="text-sm">
                            The system computes the relative weight of each topic automatically
                            based on question distribution:
                        </p>
                        <div className="bg-muted/40 max-w-lg space-y-1.5 rounded-xl border p-4">
                            <div className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                                Formula
                            </div>
                            <div className="font-mono text-xs font-semibold text-[#323d8f] dark:text-blue-400">
                                Topic Weight = (Questions in Topic / Total Questions) &times; 100%
                            </div>
                        </div>
                        <p className="text-xs">
                            <em>Example:</em> If there are 50 active questions in your bank and 10
                            are tagged with &quot;Database Design&quot;, its weight is calculated as
                            (10 / 50) &times; 100 = 20%.
                        </p>
                    </AccordionContent>
                </AccordionItem>

                {/* 4. Difficulty Levels */}
                <AccordionItem value="difficulty-levels" className="rounded-lg border px-4">
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <span className="text-lg font-semibold">
                                4. Question Difficulty Levels
                            </span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4 pt-4 pb-6">
                        <p className="text-sm">
                            Questions are automatically categorized into three difficulty tiers
                            based on their cognitive demand:
                        </p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="bg-card space-y-1 rounded-lg border p-4">
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Easy
                                </div>
                                <p className="text-muted-foreground text-xs leading-normal">
                                    Simple recall and basic understanding. Focuses on remembering
                                    facts and concepts.
                                </p>
                            </div>
                            <div className="bg-card space-y-1 rounded-lg border p-4">
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    Medium
                                </div>
                                <p className="text-muted-foreground text-xs leading-normal">
                                    Application of rules, concepts, and analytical tasks. Focuses on
                                    applying and analyzing.
                                </p>
                            </div>
                            <div className="bg-card space-y-1 rounded-lg border p-4">
                                <div className="flex items-center gap-1.5 text-sm font-semibold text-rose-600 dark:text-rose-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                    Hard
                                </div>
                                <p className="text-muted-foreground text-xs leading-normal">
                                    Complex evaluations, system synthesis, and original creations.
                                    Focuses on evaluating and authoring.
                                </p>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* 5. FAQs */}
                <AccordionItem
                    value="faqs"
                    className="rounded-lg border px-4"
                    style={{ borderBottomWidth: '1px' }}
                >
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-rose-100 p-2 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                                <HelpCircle className="h-5 w-5" />
                            </div>
                            <span className="text-lg font-semibold">
                                5. Frequently Asked Questions
                            </span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4 pt-4 pb-6">
                        <div>
                            <h4 className="text-foreground mb-1 text-sm font-semibold">
                                How does the system determine a question&apos;s Bloom Level?
                            </h4>
                            <p className="text-sm">
                                The system analyzes the question&apos;s text, tags, and cognitive
                                demand. In AI-generated questions, the Bloom Taxonomy level is
                                specified upon generation and can be manually adjusted later in the
                                Question details view.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-foreground mb-1 text-sm font-semibold">
                                Why is a newly added question not appearing in the matrix?
                            </h4>
                            <p className="text-sm">
                                Ensure the question is marked as **Active**. Retired or drafted
                                questions are excluded from the primary Table of Specifications
                                calculations. They can be viewed separately in the Retired Questions
                                tab.
                            </p>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}

/**
 * Returns a user-friendly description of what each Bloom Level covers.
 */
function getDescriptionForLevel(level: string): string {
    switch (level) {
        case 'REMEMBERING':
            return 'Recall facts and basic concepts (e.g., define, duplicate, list, memorize, repeat, state).';
        case 'UNDERSTANDING':
            return 'Explain ideas or concepts (e.g., classify, describe, discuss, explain, identify, translate).';
        case 'APPLYING':
            return 'Use information in new situations (e.g., execute, implement, solve, use, demonstrate, interpret).';
        case 'ANALYZING':
            return 'Draw connections among ideas (e.g., differentiate, organize, relate, compare, contrast, distinguish).';
        case 'EVALUATING':
            return 'Justify a stand or decision (e.g., appraise, argue, defend, judge, select, support, value, critique).';
        case 'CREATING':
            return 'Produce new or original work (e.g., design, assemble, construct, conjecture, develop, formulate, author).';
        default:
            return '';
    }
}
