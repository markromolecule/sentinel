import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ExamReportSection } from '../../_types';
import { SECTION_PARAM_KEY, resolveExamReportSection } from '../../_constants';

export type UseExamReportSectionResult = {
    activeSection: ExamReportSection;
    setActiveSection: (section: ExamReportSection) => void;
};

/**
 * Manages active report section tab synchronized with URL search parameters.
 */
export function useExamReportSection(examId: string): UseExamReportSectionResult {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sectionParam = searchParams.get(SECTION_PARAM_KEY);

    const activeSection = resolveExamReportSection(sectionParam);

    const setActiveSection = useCallback(
        (section: ExamReportSection) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set(SECTION_PARAM_KEY, section);
            router.push(`/exams/reports/${examId}?${params.toString()}`);
        },
        [examId, router, searchParams],
    );

    return {
        activeSection,
        setActiveSection,
    };
}
