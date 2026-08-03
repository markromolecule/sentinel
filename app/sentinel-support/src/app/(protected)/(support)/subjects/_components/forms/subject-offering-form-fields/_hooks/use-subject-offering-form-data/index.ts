'use client';

import {
    useCoursesQuery,
    useDebounce,
    useDepartmentsQuery,
    useSectionsQuery,
    useSemestersQuery,
    useStableOptions,
    useStableValue,
    useSubjectsQuery,
} from '@sentinel/hooks';
import { useState, useMemo } from 'react';
import { useWatch } from 'react-hook-form';
import { useAcademicScope } from '@/hooks/use-academic-scope';
import { type FilterableCheckboxOption } from '@/app/(protected)/(support)/subjects/_components/forms/filterable-checkbox-group';
import {
    formatDateRange,
    formatTermLabel,
    summarizeSelection,
    YEAR_LEVEL_OPTIONS,
} from '../../_helpers';
import { mapSelectedLabels, mergeOptionsWithSelected, toggleStringListValue } from './_helpers';
import {
    type UseSubjectOfferingFormDataArgs,
    type UseSubjectOfferingFormDataReturn,
} from './_types';
import { useSelectionLabels } from './use-selection-labels';
import { useAcademicScopeSync } from './use-academic-scope-sync';
import { useFilteredData } from './use-filtered-data';

export function useSubjectOfferingFormData({
    form,
    subjectToOffer,
    open,
    institutionId,
}: UseSubjectOfferingFormDataArgs): UseSubjectOfferingFormDataReturn {
    const { assignedDepartmentId, assignedCourseId, shouldLockDepartment, shouldLockCourse } =
        useAcademicScope();

    // Search States
    const [departmentSearch, setDepartmentSearch] = useState('');
    const [courseSearch, setCourseSearch] = useState('');
    const [sectionSearch, setSectionSearch] = useState('');
    const debouncedDepartmentSearch = useDebounce(departmentSearch, 400);
    const debouncedCourseSearch = useDebounce(courseSearch, 400);
    const debouncedSectionSearch = useDebounce(sectionSearch, 400);

    // Queries
    const { data: subjects = [] } = useSubjectsQuery({
        institutionId,
        enabled: open,
    });
    const { data: semesters = [] } = useSemestersQuery({
        institutionId,
        enabled: open,
    });
    const { data: departments = [] } = useDepartmentsQuery({
        search: debouncedDepartmentSearch || undefined,
        institutionId,
        enabled: open,
    });

    // Form Watchers
    const selectedSubjectId = useWatch({ control: form.control, name: 'subject_id' });
    const selectedTermId = useWatch({ control: form.control, name: 'term_id' });
    const selectedDepartmentIds = useWatch({ control: form.control, name: 'department_ids' });
    const selectedCourseIds = useWatch({ control: form.control, name: 'course_ids' });
    const selectedYearLevels = useWatch({ control: form.control, name: 'year_levels' });
    const selectedSectionIds = useWatch({ control: form.control, name: 'section_ids' });

    const shouldQueryCourses = open && (selectedDepartmentIds?.length ?? 0) > 0;
    const { data: courses = [] } = useCoursesQuery({
        search: debouncedCourseSearch || undefined,
        institutionId,
        enabled: shouldQueryCourses,
    });
    const { data: sections = [] } = useSectionsQuery({
        search: debouncedSectionSearch || undefined,
        institutionId,
        enabled: open,
    });

    // Options mapping
    const departmentOptions = useStableOptions(
        departments,
        (department) => department.code?.trim() || department.name,
    );

    // Sync and Filtering Hooks
    useAcademicScopeSync({
        form,
        assignedDepartmentId,
        assignedCourseId,
        shouldLockDepartment,
        shouldLockCourse,
    });

    const { filteredCourses, filteredSections } = useFilteredData({
        form,
        courses,
        sections,
        selectedDepartmentIds,
        selectedCourseIds,
        selectedYearLevels,
    });

    const courseOptions = useStableOptions(
        filteredCourses,
        (course) => course.code?.trim() || course.title,
    );
    const sectionOptions = useStableOptions(filteredSections, (section) => section.name);

    // Label Persistence Hooks
    const { selectedLabels: selectedDepartmentLabels, rememberLabels: rememberDepartmentLabels } =
        useSelectionLabels(departmentOptions);
    const { selectedLabels: selectedCourseLabels, rememberLabels: rememberCourseLabels } =
        useSelectionLabels(courseOptions);
    const { selectedLabels: selectedSectionLabels, rememberLabels: rememberSectionLabels } =
        useSelectionLabels(sectionOptions);

    // Merged Options
    const mergedDepartmentOptions = useStableValue(
        () =>
            mergeOptionsWithSelected(
                departmentOptions,
                selectedDepartmentIds,
                selectedDepartmentLabels,
            ),
        [departmentOptions, selectedDepartmentIds, selectedDepartmentLabels],
    );

    const mergedCourseOptions = useStableValue(
        () => mergeOptionsWithSelected(courseOptions, selectedCourseIds, selectedCourseLabels),
        [courseOptions, selectedCourseIds, selectedCourseLabels],
    );

    const mergedSectionOptions = useStableValue(
        () => mergeOptionsWithSelected(sectionOptions, selectedSectionIds, selectedSectionLabels),
        [sectionOptions, selectedSectionIds, selectedSectionLabels],
    );

    // Derived Selection Data
    const departmentLabelMap = useMemo(
        () => new Map(mergedDepartmentOptions.map((option) => [option.value, option.label])),
        [mergedDepartmentOptions],
    );
    const courseLabelMap = useMemo(
        () => new Map(mergedCourseOptions.map((option) => [option.value, option.label])),
        [mergedCourseOptions],
    );
    const sectionLabelMap = useMemo(
        () => new Map(mergedSectionOptions.map((option) => [option.value, option.label])),
        [mergedSectionOptions],
    );

    const yearLevelOptions = useMemo<FilterableCheckboxOption[]>(
        () =>
            YEAR_LEVEL_OPTIONS.map((yearLevel: number) => ({
                value: String(yearLevel),
                label: `Year ${yearLevel}`,
            })),
        [],
    );

    const selectedSubject = useStableValue(
        () =>
            subjectToOffer ?? subjects.find((subject) => subject.id === selectedSubjectId) ?? null,
        [selectedSubjectId, subjectToOffer, subjects],
    );
    const selectedTerm = useStableValue(
        () => semesters.find((semester) => semester.id === selectedTermId) ?? null,
        [selectedTermId, semesters],
    );

    // Final Derived Outputs
    const selectedDepartments = useStableValue(
        () => mapSelectedLabels(selectedDepartmentIds, departmentLabelMap),
        [departmentLabelMap, selectedDepartmentIds],
    );
    const selectedCourses = useStableValue(
        () => mapSelectedLabels(selectedCourseIds, courseLabelMap),
        [courseLabelMap, selectedCourseIds],
    );
    const selectedSections = useStableValue(
        () => mapSelectedLabels(selectedSectionIds, sectionLabelMap),
        [sectionLabelMap, selectedSectionIds],
    );
    const selectedYearLevelLabels = useStableValue(
        () => (selectedYearLevels ?? []).map((yearLevel: number) => `Year ${yearLevel}`),
        [selectedYearLevels],
    );

    const selectedSubjectLabel = useMemo(
        () =>
            selectedSubject
                ? `${selectedSubject.code} - ${selectedSubject.title}`
                : 'Choose a subject',
        [selectedSubject],
    );
    const selectedTermLabel = useMemo(
        () =>
            selectedTerm
                ? formatTermLabel(selectedTerm.academicYear, selectedTerm.semester)
                : 'Choose a term',
        [selectedTerm],
    );
    const selectedTermDates = useMemo(
        () => (selectedTerm ? formatDateRange(selectedTerm.startDate, selectedTerm.endDate) : null),
        [selectedTerm],
    );

    const departmentSummary = useMemo(
        () => summarizeSelection(selectedDepartments, 'No departments selected yet.'),
        [selectedDepartments],
    );
    const courseSummary = useMemo(
        () => summarizeSelection(selectedCourses, 'No courses selected yet.'),
        [selectedCourses],
    );
    const yearLevelSummary = useMemo(
        () => summarizeSelection(selectedYearLevelLabels, 'No year levels selected yet.'),
        [selectedYearLevelLabels],
    );
    const sectionSummary = useMemo(
        () => summarizeSelection(selectedSections, 'No sections selected yet.'),
        [selectedSections],
    );

    // Handlers
    function setDepartmentIds(values: string[]) {
        rememberDepartmentLabels(values);
        form.setValue('department_ids', values, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }

    function setCourseIds(values: string[]) {
        rememberCourseLabels(values);
        form.setValue('course_ids', values, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }

    function setYearLevels(values: number[]) {
        form.setValue('year_levels', values, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }

    function setSectionIds(values: string[]) {
        rememberSectionLabels(values);
        form.setValue('section_ids', values, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }

    function toggleYearLevel(yearLevel: number) {
        const safeValues = selectedYearLevels ?? [];
        const nextValues = safeValues.includes(yearLevel)
            ? safeValues.filter((value: number) => value !== yearLevel)
            : [...safeValues, yearLevel].sort((left, right) => left - right);

        setYearLevels(nextValues);
    }

    return {
        subjects,
        semesters,
        filteredCourses,
        departmentOptions: mergedDepartmentOptions,
        courseOptions: mergedCourseOptions,
        sectionOptions: mergedSectionOptions,
        yearLevelOptions,
        selectedDepartmentIds: selectedDepartmentIds ?? [],
        selectedCourseIds: selectedCourseIds ?? [],
        selectedYearLevels: selectedYearLevels ?? [],
        selectedSectionIds: selectedSectionIds ?? [],
        selectedDepartments,
        selectedCourses,
        selectedSections,
        selectedYearLevelLabels,
        selectedSubjectLabel,
        selectedTermLabel,
        selectedTermDates,
        departmentSummary,
        courseSummary,
        yearLevelSummary,
        sectionSummary,
        isDepartmentLocked: shouldLockDepartment && Boolean(assignedDepartmentId),
        isCourseLocked: shouldLockCourse && Boolean(assignedCourseId),
        departmentSearch,
        courseSearch,
        sectionSearch,
        setDepartmentIds,
        setCourseIds,
        setSectionIds,
        setYearLevels,
        setDepartmentSearch: (value: string) => {
            rememberDepartmentLabels(selectedDepartmentIds ?? []);
            setDepartmentSearch(value);
        },
        setCourseSearch: (value: string) => {
            rememberCourseLabels(selectedCourseIds ?? []);
            setCourseSearch(value);
        },
        setSectionSearch: (value: string) => {
            rememberSectionLabels(selectedSectionIds ?? []);
            setSectionSearch(value);
        },
        toggleDepartment: (id) =>
            toggleStringListValue(selectedDepartmentIds, id, setDepartmentIds),
        toggleCourse: (id) => toggleStringListValue(selectedCourseIds, id, setCourseIds),
        toggleSection: (id) => toggleStringListValue(selectedSectionIds, id, setSectionIds),
        toggleYearLevel,
    };
}
