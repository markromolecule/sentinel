'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStableValue } from '@sentinel/hooks';
import { useProctorExams, type ExamsViewMode } from '@/features/exams';
import { type Exam } from '@sentinel/shared/types';
import { type ExamTabKey, EXAMS_PER_PAGE } from '../_constants';

export function useExamsDashboard() {
    const { exams, isLoading } = useProctorExams();
    const [activeTab, setActiveTab] = useState<ExamTabKey>('all');
    const [viewMode, setViewMode] = useState<ExamsViewMode>('grid');
    const [currentPageByTab, setCurrentPageByTab] = useState<Record<ExamTabKey, number>>({
        all: 1,
        published: 1,
        drafts: 1,
        archived: 1,
    });
    const searchParams = useSearchParams();
    const view = searchParams.get('view');

    const allExams = exams || [];

    const visibleExams = useStableValue(
        () => allExams.filter((exam: Exam) => exam.status !== 'archived'),
        [allExams],
    );

    const published = useStableValue(
        () =>
            visibleExams.filter(
                (exam: Exam) => exam.status === 'published' || exam.status === 'active',
            ),
        [visibleExams],
    );

    const drafts = useStableValue(
        () => visibleExams.filter((exam: Exam) => exam.status === 'draft'),
        [visibleExams],
    );

    const archived = useStableValue(
        () => allExams.filter((exam: Exam) => exam.status === 'archived'),
        [allExams],
    );

    const examsByTab: Record<ExamTabKey, Exam[]> = {
        all: allExams,
        published,
        drafts,
        archived,
    };

    const getPageCount = (totalItems: number) => {
        return Math.max(1, Math.ceil(totalItems / EXAMS_PER_PAGE));
    };

    const paginateExams = (exams: Exam[], page: number) => {
        const startIndex = (page - 1) * EXAMS_PER_PAGE;
        return exams.slice(startIndex, startIndex + EXAMS_PER_PAGE);
    };

    const setPageForTab = (tab: ExamTabKey, page: number) => {
        setCurrentPageByTab((currentPages) => ({
            ...currentPages,
            [tab]: page,
        }));
    };

    return {
        exams,
        isLoading,
        activeTab,
        setActiveTab,
        viewMode,
        setViewMode,
        currentPageByTab,
        view,
        examsByTab,
        getPageCount,
        paginateExams,
        setPageForTab,
    };
}
