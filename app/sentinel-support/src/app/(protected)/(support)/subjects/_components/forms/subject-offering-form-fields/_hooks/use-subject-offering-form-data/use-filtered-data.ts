import { useStableValue } from '@sentinel/hooks';
import { useEffect } from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { type SubjectOfferingFormValues } from '@sentinel/shared/schema';
import { type Course, type Section } from '@sentinel/shared/types';
import { getCourseDepartmentId } from './_helpers';

type UseFilteredDataArgs = {
    form: UseFormReturn<SubjectOfferingFormValues>;
    courses: Course[];
    sections: Section[];
    selectedDepartmentIds: string[] | undefined;
    selectedCourseIds: string[] | undefined;
    selectedYearLevels: number[] | undefined;
};

export function useFilteredData({
    form,
    courses,
    sections,
    selectedDepartmentIds,
    selectedCourseIds,
    selectedYearLevels,
}: UseFilteredDataArgs) {
    const filteredCourses = useStableValue(
        () =>
            !selectedDepartmentIds?.length
                ? courses
                : courses.filter((course) => {
                      const courseDepartmentId = getCourseDepartmentId(course);
                      return courseDepartmentId
                          ? selectedDepartmentIds.includes(courseDepartmentId)
                          : false;
                  }),
        [courses, selectedDepartmentIds],
    );

    const filteredSections = useStableValue(
        () =>
            sections.filter((section) => {
                const matchesDepartment =
                    !selectedDepartmentIds?.length ||
                    (section.departmentId
                        ? selectedDepartmentIds.includes(section.departmentId)
                        : false);
                const matchesCourse =
                    !selectedCourseIds?.length ||
                    (section.courseId ? selectedCourseIds.includes(section.courseId) : false);
                const matchesYear =
                    !selectedYearLevels?.length ||
                    (section.yearLevel ? selectedYearLevels.includes(section.yearLevel) : false);

                return matchesDepartment && matchesCourse && matchesYear;
            }),
        [sections, selectedCourseIds, selectedDepartmentIds, selectedYearLevels],
    );

    useEffect(() => {
        const allowedCourseIds = new Set(filteredCourses.map((course) => course.id));
        const currentCourseIds = form.getValues('course_ids') ?? [];
        const nextCourseIds = currentCourseIds.filter((courseId) => allowedCourseIds.has(courseId));

        if (nextCourseIds.length !== currentCourseIds.length) {
            form.setValue('course_ids', nextCourseIds, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    }, [filteredCourses, form]);

    useEffect(() => {
        const allowedSectionIds = new Set(filteredSections.map((section) => section.id));
        const currentSectionIds = form.getValues('section_ids') ?? [];
        const nextSectionIds = currentSectionIds.filter((sectionId) =>
            allowedSectionIds.has(sectionId),
        );

        if (nextSectionIds.length !== currentSectionIds.length) {
            form.setValue('section_ids', nextSectionIds, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    }, [filteredSections, form]);

    return {
        filteredCourses,
        filteredSections,
    };
}
