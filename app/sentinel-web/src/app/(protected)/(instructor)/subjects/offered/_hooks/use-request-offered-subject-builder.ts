'use client';

import { useCallback, useEffect } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { useStableIdMap, useStableValue } from '@sentinel/hooks';
import type { SubjectOffering } from '@sentinel/shared/types';
import type { RequestOfferedSubjectBuilderFormValues } from '../_lib/request-offered-subject-builder-schema';
import {
    buildGroupedRequestPreviewText,
    buildRequestTargetCountBadges,
    canSubmitGroupedRequest,
    createStableCheckboxOptions,
    resolveSuggestedCourseIds,
    resolveSuggestedDepartmentIds,
    summarizeSelectedLabels,
    REQUEST_OFFERED_SUBJECT_BUILDER_YEAR_LEVEL_OPTIONS,
} from '../_lib/request-offered-subject-builder-helpers';
import {
    deriveRequestBuilderYearLevels,
    filterRequestBuilderCoursesByDepartments,
    filterRequestBuilderSections,
    mergeRequestBuilderScopeIds,
} from '../_lib/request-offered-subject-builder-filtering';

function mapSelectedLabels(selectedIds: string[], labelMap: Map<string, string>) {
    return selectedIds
        .map((selectedId) => labelMap.get(selectedId))
        .filter((label): label is string => Boolean(label));
}

function getRequestSectionId(section: SubjectOffering['sections'][number]) {
    return section.sectionId ?? section.id;
}

function toggleStringListValue(
    currentValues: string[],
    nextValue: string,
    onChange: (values: string[]) => void,
) {
    const nextValues = currentValues.includes(nextValue)
        ? currentValues.filter((value) => value !== nextValue)
        : [...currentValues, nextValue];

    onChange(nextValues);
}

export function useRequestOfferedSubjectBuilder(
    form: UseFormReturn<RequestOfferedSubjectBuilderFormValues>,
    offering: SubjectOffering,
) {
    const watchedDepartmentIds = useWatch({
        control: form.control,
        name: 'department_ids',
    });
    const watchedCourseIds = useWatch({
        control: form.control,
        name: 'course_ids',
    });
    const watchedYearLevels = useWatch({
        control: form.control,
        name: 'year_levels',
    });
    const watchedSectionIds = useWatch({
        control: form.control,
        name: 'section_ids',
    });

    const selectedDepartmentIds = useStableValue(
        () => watchedDepartmentIds ?? [],
        [watchedDepartmentIds],
    );
    const selectedCourseIds = useStableValue(() => watchedCourseIds ?? [], [watchedCourseIds]);
    const selectedYearLevels = useStableValue(() => watchedYearLevels ?? [], [watchedYearLevels]);
    const selectedSectionIds = useStableValue(() => watchedSectionIds ?? [], [watchedSectionIds]);

    const isGeneralOffering = useStableValue(
        () =>
            (offering.classifications ?? []).some(
                (classification) => classification.type === 'GENERAL',
            ),
        [offering.classifications],
    );

    const classificationBadges = useStableValue(
        () => offering.classifications ?? [],
        [offering.classifications],
    );

    const allowedSections = useStableValue(() => offering.sections ?? [], [offering.sections]);

    const availableDepartments = useStableValue(() => {
        if ((offering.departments ?? []).length > 0) {
            return offering.departments;
        }

        const derivedDepartmentIds = allowedSections
            .map((section) => section.departmentId)
            .filter((departmentId): departmentId is string => Boolean(departmentId));
        const allowedDepartmentIds = mergeRequestBuilderScopeIds(
            offering.departmentIds,
            derivedDepartmentIds,
        );

        return allowedDepartmentIds.map((departmentId) => ({
            id: departmentId,
            code: null,
            name: departmentId,
        }));
    }, [allowedSections, offering.departmentIds, offering.departments]);

    const availableCourses = useStableValue(() => {
        if ((offering.courses ?? []).length > 0) {
            return offering.courses;
        }

        const derivedCourseIds = allowedSections
            .map((section) => section.courseId)
            .filter((courseId): courseId is string => Boolean(courseId));
        const allowedCourseIds = mergeRequestBuilderScopeIds(offering.courseIds, derivedCourseIds);

        return allowedCourseIds.map((courseId) => ({
            id: courseId,
            code: null,
            title: courseId,
        }));
    }, [allowedSections, offering.courseIds, offering.courses]);

    const visibleCourses = useStableValue(
        () =>
            filterRequestBuilderCoursesByDepartments(
                availableCourses,
                allowedSections,
                selectedDepartmentIds,
            ),
        [allowedSections, availableCourses, selectedDepartmentIds],
    );

    const visibleYearLevels = useStableValue(() => {
        const derivedYearLevels = deriveRequestBuilderYearLevels({
            sections: allowedSections,
            offeredYearLevels: offering.yearLevels,
            selectedDepartmentIds,
            selectedCourseIds,
        });

        if (derivedYearLevels.length > 0) {
            return derivedYearLevels;
        }

        if (offering.yearLevels.length > 0) {
            return selectedDepartmentIds.length > 0 || selectedCourseIds.length > 0
                ? []
                : [...offering.yearLevels].sort((left, right) => left - right);
        }

        return selectedDepartmentIds.length > 0 || selectedCourseIds.length > 0
            ? []
            : REQUEST_OFFERED_SUBJECT_BUILDER_YEAR_LEVEL_OPTIONS.map((option) =>
                  Number(option.value),
              );
    }, [allowedSections, offering.yearLevels, selectedCourseIds, selectedDepartmentIds]);

    const visibleSections = useStableValue(
        () =>
            filterRequestBuilderSections({
                sections: allowedSections,
                selectedDepartmentIds,
                selectedCourseIds,
                selectedYearLevels,
            }),
        [allowedSections, selectedCourseIds, selectedDepartmentIds, selectedYearLevels],
    );

    const departmentLabelMap = useStableIdMap(
        availableDepartments,
        (department) => department.code?.trim() || department.name,
    );
    const courseLabelMap = useStableIdMap(
        availableCourses,
        (course) => course.code?.trim() || course.title,
    );
    const sectionLabelMap = useStableValue(
        () =>
            new Map(allowedSections.map((section) => [getRequestSectionId(section), section.name])),
        [allowedSections],
    );

    const departmentOptions = useStableValue(
        () =>
            createStableCheckboxOptions(
                availableDepartments,
                (department) => department.id,
                (department) => department.code?.trim() || department.name,
            ),
        [availableDepartments],
    );
    const courseOptions = useStableValue(
        () =>
            createStableCheckboxOptions(
                visibleCourses,
                (course) => course.id,
                (course) => course.code?.trim() || course.title,
            ),
        [visibleCourses],
    );
    const yearLevelOptions = useStableValue(
        () =>
            visibleYearLevels.map((yearLevel) => ({
                value: String(yearLevel),
                label: `Year ${yearLevel}`,
            })),
        [visibleYearLevels],
    );
    const sectionOptions = useStableValue(
        () =>
            createStableCheckboxOptions(
                visibleSections,
                getRequestSectionId,
                (section) => section.name,
            ),
        [visibleSections],
    );

    const selectedDepartmentLabels = useStableValue(
        () => mapSelectedLabels(selectedDepartmentIds, departmentLabelMap),
        [departmentLabelMap, selectedDepartmentIds],
    );
    const selectedCourseLabels = useStableValue(
        () => mapSelectedLabels(selectedCourseIds, courseLabelMap),
        [courseLabelMap, selectedCourseIds],
    );
    const selectedYearLevelLabels = useStableValue(
        () => selectedYearLevels.map((yearLevel) => `Year ${yearLevel}`),
        [selectedYearLevels],
    );
    const selectedSectionLabels = useStableValue(
        () => mapSelectedLabels(selectedSectionIds, sectionLabelMap),
        [sectionLabelMap, selectedSectionIds],
    );

    const departmentSummary = useStableValue(
        () => summarizeSelectedLabels(selectedDepartmentLabels, 'No departments selected yet.'),
        [selectedDepartmentLabels],
    );
    const courseSummary = useStableValue(
        () => summarizeSelectedLabels(selectedCourseLabels, 'No courses selected yet.'),
        [selectedCourseLabels],
    );
    const yearLevelSummary = useStableValue(
        () => summarizeSelectedLabels(selectedYearLevelLabels, 'No year levels selected yet.'),
        [selectedYearLevelLabels],
    );
    const sectionSummary = useStableValue(
        () => summarizeSelectedLabels(selectedSectionLabels, 'No sections selected yet.'),
        [selectedSectionLabels],
    );

    const targetCountBadges = useStableValue(
        () =>
            buildRequestTargetCountBadges({
                departmentCount: selectedDepartmentIds.length,
                courseCount: selectedCourseIds.length,
                yearLevelCount: selectedYearLevels.length,
                sectionCount: selectedSectionIds.length,
            }),
        [
            selectedCourseIds.length,
            selectedDepartmentIds.length,
            selectedSectionIds.length,
            selectedYearLevels.length,
        ],
    );

    const groupedRequestPreviewText = useStableValue(
        () =>
            buildGroupedRequestPreviewText({
                departments: selectedDepartmentLabels,
                courses: selectedCourseLabels,
                yearLevels: selectedYearLevelLabels,
                sections: selectedSectionLabels,
            }),
        [
            selectedCourseLabels,
            selectedDepartmentLabels,
            selectedSectionLabels,
            selectedYearLevelLabels,
        ],
    );
    const canSubmit = useStableValue(
        () =>
            canSubmitGroupedRequest({
                departmentIds: selectedDepartmentIds,
                courseIds: selectedCourseIds,
                yearLevels: selectedYearLevels,
                sectionIds: selectedSectionIds,
            }),
        [selectedCourseIds, selectedDepartmentIds, selectedSectionIds, selectedYearLevels],
    );

    useEffect(() => {
        const nextDepartmentIds = resolveSuggestedDepartmentIds({
            selectedDepartmentIds,
            availableDepartmentIds: availableDepartments.map((department) => department.id),
        });

        if (!nextDepartmentIds) {
            return;
        }

        form.setValue('department_ids', nextDepartmentIds, {
            shouldDirty: false,
            shouldValidate: true,
        });
    }, [availableDepartments, form, selectedDepartmentIds]);

    useEffect(() => {
        const nextCourseIds = resolveSuggestedCourseIds({
            selectedCourseIds,
            visibleCourseIds: visibleCourses.map((course) => course.id),
        });

        if (!nextCourseIds) {
            return;
        }

        form.setValue('course_ids', nextCourseIds, {
            shouldDirty: false,
            shouldValidate: true,
        });
    }, [form, selectedCourseIds, visibleCourses]);

    useEffect(() => {
        const validCourseIds = new Set(visibleCourses.map((course) => course.id));
        const nextCourseIds = selectedCourseIds.filter((courseId) => validCourseIds.has(courseId));

        if (nextCourseIds.length === selectedCourseIds.length) {
            return;
        }

        form.setValue('course_ids', nextCourseIds, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }, [form, selectedCourseIds, visibleCourses]);

    useEffect(() => {
        const validYearLevels = new Set(visibleYearLevels);
        const nextYearLevels = selectedYearLevels.filter((yearLevel) =>
            validYearLevels.has(yearLevel),
        );

        if (nextYearLevels.length === selectedYearLevels.length) {
            return;
        }

        form.setValue('year_levels', nextYearLevels, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }, [form, selectedYearLevels, visibleYearLevels]);

    useEffect(() => {
        const validSectionIds = new Set(visibleSections.map(getRequestSectionId));
        const nextSectionIds = selectedSectionIds.filter((sectionId) =>
            validSectionIds.has(sectionId),
        );

        if (nextSectionIds.length === selectedSectionIds.length) {
            return;
        }

        form.setValue('section_ids', nextSectionIds, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }, [form, selectedSectionIds, visibleSections]);

    const setDepartmentIds = useCallback(
        (values: string[]) => {
            form.setValue('department_ids', values, {
                shouldDirty: true,
                shouldValidate: true,
            });
        },
        [form],
    );

    const setCourseIds = useCallback(
        (values: string[]) => {
            form.setValue('course_ids', values, {
                shouldDirty: true,
                shouldValidate: true,
            });
        },
        [form],
    );

    const setYearLevels = useCallback(
        (values: number[]) => {
            form.setValue(
                'year_levels',
                [...values].sort((left, right) => left - right),
                {
                    shouldDirty: true,
                    shouldValidate: true,
                },
            );
        },
        [form],
    );

    const setSectionIds = useCallback(
        (values: string[]) => {
            form.setValue('section_ids', values, {
                shouldDirty: true,
                shouldValidate: true,
            });
        },
        [form],
    );

    const toggleDepartment = useCallback(
        (departmentId: string) => {
            toggleStringListValue(selectedDepartmentIds, departmentId, setDepartmentIds);
        },
        [selectedDepartmentIds, setDepartmentIds],
    );

    const toggleCourse = useCallback(
        (courseId: string) => {
            toggleStringListValue(selectedCourseIds, courseId, setCourseIds);
        },
        [selectedCourseIds, setCourseIds],
    );

    const toggleYearLevel = useCallback(
        (yearLevel: number) => {
            const nextValues = selectedYearLevels.includes(yearLevel)
                ? selectedYearLevels.filter((value) => value !== yearLevel)
                : [...selectedYearLevels, yearLevel];

            setYearLevels(nextValues);
        },
        [selectedYearLevels, setYearLevels],
    );

    const toggleSection = useCallback(
        (sectionId: string) => {
            toggleStringListValue(selectedSectionIds, sectionId, setSectionIds);
        },
        [selectedSectionIds, setSectionIds],
    );

    const toggleAllSections = useCallback(
        (sectionIdsToToggle: string[], checked: boolean) => {
            if (checked) {
                setSectionIds(Array.from(new Set([...selectedSectionIds, ...sectionIdsToToggle])));
                return;
            }

            const sectionIdsToRemove = new Set(sectionIdsToToggle);

            setSectionIds(
                selectedSectionIds.filter((sectionId) => !sectionIdsToRemove.has(sectionId)),
            );
        },
        [selectedSectionIds, setSectionIds],
    );

    return {
        classificationBadges,
        isGeneralOffering,
        departmentOptions,
        courseOptions,
        yearLevelOptions,
        sectionOptions,
        selectedDepartmentIds,
        selectedCourseIds,
        selectedYearLevels,
        selectedSectionIds,
        selectedDepartmentLabels,
        selectedCourseLabels,
        selectedYearLevelLabels,
        selectedSectionLabels,
        departmentSummary,
        courseSummary,
        yearLevelSummary,
        sectionSummary,
        targetCountBadges,
        groupedRequestPreviewText,
        canSubmit,
        allowedSectionCount: allowedSections.length,
        visibleSectionCount: visibleSections.length,
        setDepartmentIds,
        setCourseIds,
        setYearLevels,
        setSectionIds,
        toggleDepartment,
        toggleCourse,
        toggleYearLevel,
        toggleSection,
        toggleAllSections,
    };
}
