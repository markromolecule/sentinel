'use client';

import { useState } from 'react';
import { useDebounce, useStableValue } from '@sentinel/hooks';
import type { StudentSession } from '@sentinel/shared/types';

/**
 * useFilters manages the search and filter state for student sessions
 * and derives the filtered list of students.
 *
 * @param students - The array of student sessions to filter.
 */
export function useFilters(students?: StudentSession[]) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [page, setPage] = useState(1);

    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    const filteredStudents = useStableValue(() => {
        const studentsList = students ?? [];

        return studentsList.filter((student) => {
            const matchesSearch =
                student.firstName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                student.lastName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                student.studentNo.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
            let matchesFilter = true;
            if (filterStatus === 'submitted') {
                matchesFilter =
                    student.status === 'submitted' ||
                    student.lifecycleState === 'SUBMITTED' ||
                    Boolean(student.completedAt);
            } else if (filterStatus === 'flagged') {
                matchesFilter =
                    student.status === 'flagged' ||
                    (student.incidentCount ?? 0) > 0 ||
                    (student.openIncidentCount ?? 0) > 0;
            } else if (filterStatus === 'active') {
                matchesFilter =
                    student.status === 'active' &&
                    student.lifecycleState !== 'SUBMITTED' &&
                    !student.completedAt;
            } else if (filterStatus === 'disconnected') {
                matchesFilter = student.status === 'disconnected';
            } else if (filterStatus !== 'all') {
                matchesFilter = student.status === filterStatus;
            }

            return matchesSearch && matchesFilter;
        });
    }, [students, debouncedSearchQuery, filterStatus]);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setPage(1);
    };

    const handleFilterChange = (value: string) => {
        setFilterStatus(value);
        setPage(1);
    };

    return {
        searchQuery,
        filterStatus,
        page,
        filteredStudents,
        handleSearchChange,
        handleFilterChange,
        setPage,
    };
}
export type UseFiltersReturn = ReturnType<typeof useFilters>;
