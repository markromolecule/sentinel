import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '../../_constants';

export type UseExamReportFilterResult = {
    searchValue: string;
    setSearchValue: (value: string) => void;
    sectionFilter: string | undefined;
    setSectionFilter: (sectionId: string | undefined) => void;
    studentPage: number;
    setStudentPage: (page: number) => void;
    pageSize: number;
    reportQuery: {
        search: string | undefined;
        sectionId: string | undefined;
        page: number;
        pageSize: number;
    };
};

/**
 * Manages search input, section filter, and student attempts pagination state.
 */
export function useExamReportFilter(): UseExamReportFilterResult {
    const [searchValue, setSearchValue] = useState('');
    const [sectionFilter, setSectionFilter] = useState<string | undefined>(undefined);
    const [studentPage, setStudentPage] = useState(1);
    const deferredSearchValue = useDeferredValue(searchValue);

    const reportQuery = useMemo(
        () => ({
            search: deferredSearchValue.trim() || undefined,
            sectionId: sectionFilter,
            page: studentPage,
            pageSize: DEFAULT_PAGE_SIZE,
        }),
        [deferredSearchValue, sectionFilter, studentPage],
    );

    useEffect(() => {
        setStudentPage(1);
    }, [deferredSearchValue, sectionFilter]);

    return {
        searchValue,
        setSearchValue,
        sectionFilter,
        setSectionFilter,
        studentPage,
        setStudentPage,
        pageSize: DEFAULT_PAGE_SIZE,
        reportQuery,
    };
}
